#!/usr/bin/env tsx
/**
 * Создание филиалов Probiko из vetais_probiko_local → VetSystem branches.
 *
 * Почему нужен: скрипт миграции читает branchMap из branches (tenant=probiko),
 * но для Probiko там ноль записей → clinic_id → branch_id маппинг пустой
 * → все пациенты/владельцы без branch_id.
 *
 * Этот скрипт:
 *   1. Читает file_clinics из vetais_probiko_local
 *   2. Создаёт записи в branches для тенанта Probiko
 *      (поле vetais_clinic_id заполняется → fix-patient-branches.ts потом
 *       сможет проставить branch_id пациентам и владельцам)
 *
 * Использование (запускать на проде):
 *   npx tsx scripts/fix-probiko-branches.ts \
 *     [--host localhost] [--port 5432] [--password ASPI6rin]
 *
 * После этого запустить:
 *   npx tsx scripts/fix-patient-branches.ts \
 *     --tenant cc7d6b45-4a05-425d-890e-a5cb1bd89266 \
 *     --db vetais_probiko_local --host localhost --port 5432 --password ASPI6rin
 *
 *   npx tsx scripts/fix-client-branches-fast.ts \
 *     --tenant cc7d6b45-4a05-425d-890e-a5cb1bd89266 \
 *     --db vetais_probiko_local --host localhost --port 5432 --password ASPI6rin
 */
import { Client } from 'pg';

function getArg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

const TENANT_ID   = 'cc7d6b45-4a05-425d-890e-a5cb1bd89266';
const VETAIS_HOST = getArg('host',     'localhost');
const VETAIS_PORT = parseInt(getArg('port', '5432'));
const VETAIS_USER = getArg('user',     'postgres');
const VETAIS_PASS = getArg('password', 'ASPI6rin');
const VETAIS_DB   = getArg('db',       'vetais_probiko_local');

async function main() {
  console.log('🏥 Создание филиалов Probiko из Vetais → VetSystem');
  console.log(`   Vetais: ${VETAIS_HOST}:${VETAIS_PORT}/${VETAIS_DB}`);
  console.log(`   Тенант: ${TENANT_ID}\n`);

  const vtDb = new Client({
    host: VETAIS_HOST, port: VETAIS_PORT,
    user: VETAIS_USER, password: VETAIS_PASS,
    database: VETAIS_DB,
  });

  const vsDb = new Client({ connectionString: process.env.DATABASE_URL });

  await vtDb.connect();
  await vsDb.connect();

  // 1. Получить филиалы из Vetais
  const clinicsRes = await vtDb.query(`
    SELECT id, name, clinic_address, clinic_street, clinic_city, clinic_phone
    FROM file_clinics
    WHERE del = 0
    ORDER BY id
  `);

  if (clinicsRes.rows.length === 0) {
    console.log('⚠️  Нет активных филиалов в file_clinics');
    await vtDb.end(); await vsDb.end();
    return;
  }

  console.log(`📍 Филиалов в Vetais: ${clinicsRes.rows.length}`);
  clinicsRes.rows.forEach(r => console.log(`   [${r.id}] ${r.name}`));
  console.log();

  // 2. Проверить тенант в VetSystem
  const tenantRes = await vsDb.query(
    `SELECT id, name FROM tenants WHERE id = $1`, [TENANT_ID]
  );
  if (tenantRes.rows.length === 0) {
    console.error(`❌ Тенант ${TENANT_ID} не найден в VetSystem`);
    process.exit(1);
  }
  console.log(`✅ Тенант: ${tenantRes.rows[0].name}\n`);

  // 3. Создать/обновить филиалы
  let created = 0;
  let skipped = 0;

  for (const c of clinicsRes.rows) {
    const vetaisClinicId = c.id.toString();
    const name = c.name?.trim() || `Филиал ${c.id}`;
    const address = [c.clinic_street, c.clinic_city].filter(Boolean).join(', ') || null;
    const phone = c.clinic_phone?.trim() || null;

    const existing = await vsDb.query(
      `SELECT id FROM branches WHERE tenant_id = $1 AND vetais_clinic_id = $2`,
      [TENANT_ID, vetaisClinicId]
    );

    if (existing.rows.length > 0) {
      console.log(`   ⏭  Уже существует: [${vetaisClinicId}] ${name}`);
      skipped++;
      continue;
    }

    await vsDb.query(`
      INSERT INTO branches (id, tenant_id, name, address, phone, status, vetais_clinic_id, created_at, updated_at)
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4, 'active', $5, NOW(), NOW())
    `, [TENANT_ID, name, address, phone, vetaisClinicId]);

    console.log(`   ✅ Создан: [${vetaisClinicId}] ${name}`);
    created++;
  }

  console.log(`\n📊 Итог:`);
  console.log(`   Создано:    ${created}`);
  console.log(`   Уже было:   ${skipped}`);
  console.log(`\n✅ Филиалы созданы!`);
  console.log(`\n📋 Следующие шаги:`);
  console.log(`   1) npx tsx scripts/fix-patient-branches.ts \\`);
  console.log(`        --tenant ${TENANT_ID} \\`);
  console.log(`        --db ${VETAIS_DB} --host ${VETAIS_HOST} --port ${VETAIS_PORT} --password ${VETAIS_PASS}`);
  console.log(`   2) npx tsx scripts/fix-client-branches-fast.ts \\`);
  console.log(`        --tenant ${TENANT_ID} \\`);
  console.log(`        --db ${VETAIS_DB} --host ${VETAIS_HOST} --port ${VETAIS_PORT} --password ${VETAIS_PASS}`);
  console.log(`   3) npx tsx scripts/fix-patient-owners.ts --tenant ${TENANT_ID}`);

  await vtDb.end();
  await vsDb.end();
}

main().catch(e => {
  console.error('❌ Критическая ошибка:', e.message);
  process.exit(1);
});
