#!/usr/bin/env tsx

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║         МАППИНГ ФИЛИАЛОВ: VETAIS clinic_id → VetSystem branch_id   ║
 * ║                                                                      ║
 * ║  Запрашивает клиники из Vetais и привязывает к VetSystem-филиалам.  ║
 * ║  Автоматически пытается сопоставить по имени.                       ║
 * ║  После запуска re-run migration с --phase patients --phase doctors   ║
 * ║  чтобы обновить branch_id у уже мигрированных записей.             ║
 * ║                                                                      ║
 * ║  Использование:                                                      ║
 * ║    tsx scripts/setup-branch-mapping.ts \                           ║
 * ║      --tenant <tenantId> \                                          ║
 * ║      --db <dbname> \                                                ║
 * ║      [--host <host>] [--port <port>]                                ║
 * ║      [--user <user>] [--password <pass>]                            ║
 * ║      [--dry-run]   (только показать, не сохранять)                  ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { Client } from 'pg';

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return undefined;
}

const TENANT_ID   = getArg('tenant') || '';
const VETAIS_DB   = getArg('db')     || process.env.VETAIS_DB_NAME || 'vetais_alisavet';
const VETAIS_HOST = getArg('host')   || process.env.VETAIS_DB_HOST || '45.128.206.134';
const VETAIS_PORT = parseInt(getArg('port') || process.env.VETAIS_DB_PORT || '5454');
const VETAIS_USER = getArg('user')   || process.env.VETAIS_DB_USER || 'postgres';
const VETAIS_PASS = String(getArg('password') ?? process.env.VETAIS_DB_PASSWORD ?? '');
const DRY_RUN     = process.argv.includes('--dry-run');

if (!TENANT_ID) {
  console.error('❌ Укажите --tenant <tenantId>');
  process.exit(1);
}

// ─── Нормализация строк для fuzzy-сопоставления ──────────────────────────────
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^а-яёa-z0-9]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;
  const wordsA = new Set(na.split(' ').filter(w => w.length > 2));
  const wordsB = new Set(nb.split(' ').filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let common = 0;
  wordsA.forEach(w => { if (wordsB.has(w)) common++; });
  return (2 * common) / (wordsA.size + wordsB.size);
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║         МАППИНГ ФИЛИАЛОВ VETAIS → VETSYSTEM                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
  console.log(`  Vetais DB : ${VETAIS_DB} @ ${VETAIS_HOST}:${VETAIS_PORT}`);
  console.log(`  Tenant ID : ${TENANT_ID}`);
  console.log(`  Режим     : ${DRY_RUN ? '🔍 DRY-RUN (только просмотр)' : '✏️  ЗАПИСЬ'}\n`);

  const vsDb = new Client({ connectionString: process.env.DATABASE_URL });
  const vtDb = new Client({
    host: VETAIS_HOST, port: VETAIS_PORT,
    database: VETAIS_DB, user: VETAIS_USER, password: VETAIS_PASS,
    connectionTimeoutMillis: 15000,
  });

  try {
    await vsDb.connect();
    await vtDb.connect();
    console.log('✅ Подключено!\n');

    // Получить тенант
    const tenantRow = await vsDb.query('SELECT id, name FROM tenants WHERE id = $1', [TENANT_ID]);
    if (tenantRow.rows.length === 0) {
      console.error(`❌ Тенант ${TENANT_ID} не найден`);
      process.exit(1);
    }
    console.log(`🏥 Клиника: ${tenantRow.rows[0].name}\n`);

    // Получить текущие филиалы VetSystem
    const vssBranches = await vsDb.query(
      `SELECT id, name, vetais_clinic_id FROM branches WHERE tenant_id = $1 ORDER BY name`,
      [TENANT_ID]
    );
    console.log(`📋 Филиалы VetSystem (${vssBranches.rows.length}):`);
    vssBranches.rows.forEach(b => {
      const mapped = b.vetais_clinic_id ? ` ← vetais_id=${b.vetais_clinic_id}` : ' (не привязан)';
      console.log(`   [${b.id}] ${b.name}${mapped}`);
    });
    console.log();

    // ─── Получить клиники из Vetais ──────────────────────────────────────────
    let vetaisClinics: Array<{ id: number; name: string }> = [];

    // Попытка 1: таблица klinika
    const hasKlinika = await vtDb.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'klinika') AS exists`
    );
    if (hasKlinika.rows[0].exists) {
      const klRes = await vtDb.query(`SELECT id_kliniky AS id, nazev AS name FROM klinika ORDER BY id_kliniky`);
      vetaisClinics = klRes.rows.map(r => ({ id: parseInt(r.id), name: r.name || `Клиника ${r.id}` }));
      console.log(`📍 Клиники из таблицы klinika: ${vetaisClinics.length}`);
    }

    // Попытка 2: distinct id_kliniky из system_users
    if (vetaisClinics.length === 0) {
      const hasSU = await vtDb.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_users') AS exists`
      );
      if (hasSU.rows[0].exists) {
        const suRes = await vtDb.query(
          `SELECT DISTINCT id_kliniky AS id, '' AS name FROM system_users WHERE id_kliniky IS NOT NULL ORDER BY id_kliniky`
        );
        vetaisClinics = suRes.rows.map(r => ({ id: parseInt(r.id), name: `Клиника ${r.id}` }));
        console.log(`📍 Клиники из system_users (distinct id_kliniky): ${vetaisClinics.length}`);
      }
    }

    // Попытка 3: distinct clinic_id из patients/owners
    if (vetaisClinics.length === 0) {
      const pRes = await vtDb.query(
        `SELECT DISTINCT clinic_id AS id FROM patients WHERE clinic_id IS NOT NULL ORDER BY clinic_id LIMIT 100`
      ).catch(() => ({ rows: [] }));
      vetaisClinics = pRes.rows.map(r => ({ id: parseInt(r.id), name: `Клиника ${r.id}` }));
      if (vetaisClinics.length > 0) {
        console.log(`📍 Клиники из patients (distinct clinic_id): ${vetaisClinics.length}`);
      }
    }

    if (vetaisClinics.length === 0) {
      console.log('⚠️  Клиники в Vetais не найдены. Возможно, одна клиника без id_kliniky.');
      console.log('   Все записи уже используют дефолтный филиал VetSystem.');
      return;
    }

    // ─── Автосопоставление по имени ─────────────────────────────────────────
    console.log('\n🔗 Сопоставление клиник:\n');
    const mappings: Array<{ vetaisId: number; vssBranchId: string; vetaisName: string; vssName: string; score: number; isNew: boolean }> = [];

    for (const vc of vetaisClinics) {
      // 1. Сначала проверяем: уже ли этот vetais_clinic_id привязан к какому-то филиалу (точное совпадение)
      const alreadyMapped = vssBranches.rows.find(b => b.vetais_clinic_id === String(vc.id));
      if (alreadyMapped) {
        console.log(`  ✅ Vetais #${vc.id} уже привязан к "${alreadyMapped.name}" (точное совпадение)`);
        mappings.push({
          vetaisId: vc.id,
          vssBranchId: alreadyMapped.id,
          vetaisName: vc.name,
          vssName: alreadyMapped.name,
          score: 1.0,
          isNew: false,
        });
        continue;
      }

      // 2. Ищем непривязанные филиалы (vetais_clinic_id IS NULL) для fuzzy-совпадения
      const unmappedBranches = vssBranches.rows.filter(b => !b.vetais_clinic_id);
      if (unmappedBranches.length === 0) {
        console.log(`  ⏭️  Vetais #${vc.id} "${vc.name}" — все филиалы уже привязаны, пропуск`);
        continue;
      }

      let bestBranch = unmappedBranches[0];
      let bestScore = 0;

      for (const vb of unmappedBranches) {
        const score = similarity(vc.name, vb.name);
        if (score > bestScore) {
          bestScore = score;
          bestBranch = vb;
        }
      }

      const isNew = true;
      console.log(`  🆕 Vetais #${vc.id} "${vc.name}" → "${bestBranch.name}" (схожесть: ${(bestScore * 100).toFixed(0)}%)`);

      mappings.push({
        vetaisId: vc.id,
        vssBranchId: bestBranch.id,
        vetaisName: vc.name,
        vssName: bestBranch.name,
        score: bestScore,
        isNew,
      });
    }

    if (DRY_RUN) {
      console.log('\n🔍 Dry-run: изменения не сохранены. Запустите без --dry-run для применения.');
      return;
    }

    // ─── Применить маппинг ───────────────────────────────────────────────────
    console.log('\n💾 Сохранение маппинга...');
    let updated = 0;
    for (const m of mappings) {
      if (!m.isNew) {
        console.log(`   ⏭️  Уже привязан: "${m.vssName}" ← ${m.vetaisId}`);
        continue;
      }
      await vsDb.query(
        `UPDATE branches SET vetais_clinic_id = $1 WHERE id = $2`,
        [String(m.vetaisId), m.vssBranchId]
      );
      console.log(`   ✅ "${m.vssName}" ← vetais_clinic_id=${m.vetaisId}`);
      updated++;
    }

    console.log(`\n✨ Готово! Обновлено филиалов: ${updated}`);
    console.log('\n⚠️  Важно: пациенты и владельцы, мигрированные ранее (без branch_id),');
    console.log('   получат правильный branch_id при следующем запуске fix-patient-branches.ts');

  } finally {
    await vsDb.end().catch(() => {});
    await vtDb.end().catch(() => {});
  }
}

main().catch(e => {
  console.error('❌ Критическая ошибка:', e.message);
  process.exit(1);
});
