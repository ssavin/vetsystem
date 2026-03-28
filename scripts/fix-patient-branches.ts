#!/usr/bin/env tsx
/**
 * Исправление привязки пациентов к филиалам по clinic_id из Vetais
 * 
 * Использование:
 *   tsx scripts/fix-patient-branches.ts \
 *     --tenant <tenantId> \
 *     --db <dbname> \
 *     [--host <host>] [--port <port>] [--password <pass>]
 */
import { Client } from 'pg';

function getArg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

const TENANT_ID   = getArg('tenant') || '';
const VETAIS_DB   = getArg('db')     || process.env.VETAIS_DB_NAME || 'vetais_alisavet';
const VETAIS_HOST = getArg('host')   || process.env.VETAIS_DB_HOST || '45.128.206.134';
const VETAIS_PORT = parseInt(getArg('port') || process.env.VETAIS_DB_PORT || '5454');
const VETAIS_USER = getArg('user')   || process.env.VETAIS_DB_USER || 'postgres';
const VETAIS_PASS = getArg('password') || process.env.VETAIS_DB_PASSWORD || '';

if (!TENANT_ID) { console.error('❌ Укажите --tenant <tenantId>'); process.exit(1); }

async function main() {
  console.log('🔧 Исправление привязки пациентов к филиалам...\n');

  const vsDb = new Client({ connectionString: process.env.DATABASE_URL });
  const vtDb = new Client({
    host: VETAIS_HOST, port: VETAIS_PORT,
    database: VETAIS_DB, user: VETAIS_USER, password: VETAIS_PASS,
  });

  await vsDb.connect();
  await vtDb.connect();

  // Маппинг clinic_id → branch_id
  const brRes = await vsDb.query(
    `SELECT id, name, vetais_clinic_id FROM branches WHERE tenant_id=$1 AND vetais_clinic_id IS NOT NULL`,
    [TENANT_ID]
  );
  const branchMap = new Map<number, string>();
  brRes.rows.forEach(r => {
    branchMap.set(parseInt(r.vetais_clinic_id), r.id);
    console.log(`  clinic_id ${r.vetais_clinic_id} → ${r.name}`);
  });
  console.log();

  // Загрузить clinic_id для всех пациентов из Vetais
  console.log('📊 Загрузка clinic_id из Vetais...');
  const ptRes = await vtDb.query(
    `SELECT id_pacienta::text AS vetais_id, clinic_id FROM file_patients WHERE vymaz = 0 AND clinic_id > 0`
  );
  console.log(`   Пациентов с clinic_id: ${ptRes.rows.length}`);

  let updated = 0;
  let skipped = 0;
  let noMap   = 0;
  const BATCH = 200;

  console.log('🔄 Обновление...\n');

  // Группируем по clinic_id для эффективных UPDATE
  const byClinics = new Map<string, string[]>(); // branchId → [vetaisId]
  for (const r of ptRes.rows) {
    const cid = parseInt(r.clinic_id);
    const bid = branchMap.get(cid);
    if (!bid) { noMap++; continue; }
    if (!byClinics.has(bid)) byClinics.set(bid, []);
    byClinics.get(bid)!.push(r.vetais_id);
  }

  for (const [branchId, vetaisIds] of byClinics) {
    const branchName = brRes.rows.find(b => b.id === branchId)?.name || branchId;
    // Батчами по BATCH
    for (let i = 0; i < vetaisIds.length; i += BATCH) {
      const chunk = vetaisIds.slice(i, i + BATCH);
      const res = await vsDb.query(
        `UPDATE patients SET branch_id = $1, updated_at = NOW()
         WHERE tenant_id = $2 
           AND vetais_id = ANY($3)
           AND (branch_id IS NULL OR branch_id != $1)`,
        [branchId, TENANT_ID, chunk]
      );
      updated += res.rowCount || 0;
    }
    console.log(`  ✅ ${branchName}: ${vetaisIds.length} пациентов обновлено`);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Обновлено записей:    ${updated}`);
  console.log(`⚠️  Без маппинга:        ${noMap}`);
  console.log(`✨ Готово!\n`);

  await vtDb.end();
  await vsDb.end();
}

main().catch(e => { console.error(e); process.exit(1); });
