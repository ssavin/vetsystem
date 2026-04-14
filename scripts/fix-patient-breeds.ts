#!/usr/bin/env tsx
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ИСПРАВЛЕНИЕ ПОРОД ПАЦИЕНТОВ                                           ║
 * ║                                                                          ║
 * ║  Заполняет breed у пациентов, у которых он NULL после миграции.        ║
 * ║  Ищет породу в разных таблицах Vetais (patient_breeds, f_rasa, breeds) ║
 * ║                                                                          ║
 * ║  Использование:                                                          ║
 * ║    tsx scripts/fix-patient-breeds.ts \                                  ║
 * ║      --tenant e556ed34-71a7-4003-a2cd-b5cf274bae12 \                   ║
 * ║      --db vetais \                                                       ║
 * ║      --host 109.173.124.18 --password vetais                            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { Client } from 'pg';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return undefined;
}

const TENANT_ID   = arg('tenant') || '';
const VETAIS_DB   = arg('db')     || 'vetais';
const VETAIS_HOST = arg('host')   || '109.173.124.18';
const VETAIS_PORT = parseInt(arg('port') || '5454');
const VETAIS_USER = arg('user')   || 'postgres';
const VETAIS_PASS = arg('password') || 'vetais';
const BATCH       = parseInt(arg('batch') || '500');

if (!TENANT_ID) { console.error('❌ Укажите --tenant <id>'); process.exit(1); }

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   ИСПРАВЛЕНИЕ ПОРОД ПАЦИЕНТОВ                       ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  Tenant  : ${TENANT_ID}`);
  console.log(`  Vetais  : ${VETAIS_DB} @ ${VETAIS_HOST}:${VETAIS_PORT}`);

  const vs = new Client({ connectionString: process.env.DATABASE_URL });
  const vt = new Client({
    host: VETAIS_HOST, port: VETAIS_PORT,
    user: VETAIS_USER, password: VETAIS_PASS,
    database: VETAIS_DB,
  });

  await vs.connect();
  await vt.connect();
  console.log('✅ Подключено к обеим БД\n');

  // 1. Найти таблицу пород в Vetais
  const tables = await vt.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('patient_breeds', 'f_rasa', 'breeds', 'file_breeds', 'rasa')
    ORDER BY table_name
  `);
  console.log(`📋 Таблицы пород в Vetais: ${tables.rows.map(r => r.table_name).join(', ') || 'не найдены'}`);

  // 2. Проверить file_patients.id_rasa
  const rasaCol = await vt.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'file_patients' AND column_name IN ('id_rasa','rasa','breed_id')
    LIMIT 1
  `);
  const rasaField = rasaCol.rows[0]?.column_name;
  if (!rasaField) {
    console.log('  ⚠️  Поле id_rasa не найдено в file_patients, выход.');
    await vs.end(); await vt.end(); return;
  }
  console.log(`  Поле породы в file_patients: ${rasaField}`);

  // 3. Найти рабочую таблицу пород и столбцы
  let breedTableName = '';
  let breedIdCol = '';
  let breedNameCol = '';

  for (const { table_name } of tables.rows) {
    // Проверим столбцы таблицы
    const cols = await vt.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = $1
    `, [table_name]);
    const colNames = cols.rows.map(r => r.column_name);

    // Ищем столбец с id (id_rasa, id, kod_rasa и т.п.)
    const idCandidates = ['id_rasa', 'id', 'kod_rasa', 'breed_id'];
    const nameCandidates = ['nazev', 'name', 'nazvanie', 'title', 'breed_name'];

    const foundId = idCandidates.find(c => colNames.includes(c));
    const foundName = nameCandidates.find(c => colNames.includes(c));

    if (foundId && foundName) {
      breedTableName = table_name;
      breedIdCol = foundId;
      breedNameCol = foundName;
      console.log(`  ✅ Таблица пород: ${table_name} (id=${breedIdCol}, name=${breedNameCol})`);
      break;
    } else {
      console.log(`  ⏭️  ${table_name}: колонки ${colNames.slice(0, 5).join(', ')}`);
    }
  }

  if (!breedTableName) {
    // Попробуем прямо из file_patients — может там текстовое поле
    const directBreedCol = await vt.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'file_patients'
        AND column_name IN ('breed', 'poroda', 'nazev_rasa', 'breed_name')
      LIMIT 1
    `);
    if (directBreedCol.rows.length > 0) {
      const col = directBreedCol.rows[0].column_name;
      console.log(`  ✅ Порода хранится прямо в file_patients.${col}`);
      await fixFromDirectColumn(vs, vt, col);
      await vs.end(); await vt.end(); return;
    }

    console.log('  ⚠️  Не найдена таблица пород с подходящими столбцами.');
    console.log('  Запустите с --db <база> чтобы проверить другую базу.');
    await vs.end(); await vt.end(); return;
  }

  // 4. Считаем пациентов с NULL breed
  const countRes = await vs.query(
    `SELECT COUNT(*)::int AS cnt FROM patients
     WHERE tenant_id=$1 AND (breed IS NULL OR breed = '') AND vetais_id IS NOT NULL`,
    [TENANT_ID]
  );
  const total = countRes.rows[0].cnt;
  console.log(`\n📊 Пациентов без породы: ${total}`);

  if (total === 0) {
    console.log('✅ Все пациенты уже имеют породу, выход.');
    await vs.end(); await vt.end(); return;
  }

  // 5. Загружаем все породы из Vetais в Map
  console.log('  Загружаем породы из Vetais...');
  const vymazFilter = await vt.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = $1 AND column_name = 'vymaz' LIMIT 1
  `, [breedTableName]);
  const vymazClause = vymazFilter.rows.length > 0 ? 'WHERE vymaz = 0' : '';

  const breeds = await vt.query(
    `SELECT ${breedIdCol}::text AS id, ${breedNameCol} AS name FROM ${breedTableName} ${vymazClause}`
  );
  const breedMap = new Map<string, string>(
    breeds.rows
      .filter(r => r.name?.trim())
      .map(r => [r.id, r.name.trim()])
  );
  console.log(`  Пород загружено: ${breedMap.size}`);

  if (breedMap.size === 0) {
    console.log('  ⚠️  Таблица пород пуста.');
    await vs.end(); await vt.end(); return;
  }

  // 6. Батчами: читаем пациентов из VetSystem → получаем id_rasa из Vetais → обновляем
  let updated = 0;
  let skipped = 0;
  let offset = 0;

  while (true) {
    const patients = await vs.query(
      `SELECT id, vetais_id::int AS vetais_id FROM patients
       WHERE tenant_id=$1 AND (breed IS NULL OR breed='') AND vetais_id IS NOT NULL
       ORDER BY vetais_id
       LIMIT $2 OFFSET $3`,
      [TENANT_ID, BATCH, offset]
    );
    if (!patients.rows.length) break;

    const vetaisIds = patients.rows.map(r => r.vetais_id);
    const vtPatients = await vt.query(
      `SELECT id_pacienta::text AS id, ${rasaField}::text AS rasa_id
       FROM file_patients WHERE id_pacienta = ANY($1::int[]) AND ${rasaField} IS NOT NULL`,
      [vetaisIds]
    );
    const rasaMap = new Map<number, string>(
      vtPatients.rows.map(r => [parseInt(r.id), r.rasa_id])
    );

    for (const pat of patients.rows) {
      const rasaId = rasaMap.get(pat.vetais_id);
      if (!rasaId) { skipped++; continue; }
      const breedName = breedMap.get(rasaId);
      if (!breedName) { skipped++; continue; }

      await vs.query(
        'UPDATE patients SET breed=$1, updated_at=NOW() WHERE id=$2',
        [breedName, pat.id]
      );
      updated++;
    }

    offset += BATCH;
    process.stdout.write(`\r  Обработано: ${offset} | ✅ ${updated} | ⏭️  ${skipped}`);
  }

  console.log(`\n\n════════════════════════════════════════`);
  console.log(`📊 ИТОГИ`);
  console.log(`════════════════════════════════════════`);
  console.log(`  ✅ Обновлено:  ${updated}`);
  console.log(`  ⏭️  Пропущено: ${skipped} (нет породы в Vetais)`);
  console.log(`✨ Готово!`);

  await vs.end();
  await vt.end();
}

async function fixFromDirectColumn(vs: Client, vt: Client, col: string) {
  const countRes = await vs.query(
    `SELECT COUNT(*)::int AS cnt FROM patients
     WHERE tenant_id=$1 AND (breed IS NULL OR breed='') AND vetais_id IS NOT NULL`,
    [TENANT_ID]
  );
  const total = countRes.rows[0].cnt;
  console.log(`\n📊 Пациентов без породы: ${total}`);
  if (total === 0) { console.log('✅ Все уже заполнены.'); return; }

  let updated = 0, skipped = 0, offset = 0;
  while (true) {
    const patients = await vs.query(
      `SELECT id, vetais_id::int AS vetais_id FROM patients
       WHERE tenant_id=$1 AND (breed IS NULL OR breed='') AND vetais_id IS NOT NULL
       ORDER BY vetais_id LIMIT $2 OFFSET $3`,
      [TENANT_ID, BATCH, offset]
    );
    if (!patients.rows.length) break;
    const vtPatients = await vt.query(
      `SELECT id_pacienta::text AS id, ${col} AS breed_name
       FROM file_patients WHERE id_pacienta = ANY($1::int[]) AND ${col} IS NOT NULL AND ${col} != ''`,
      [patients.rows.map(r => r.vetais_id)]
    );
    const breedMap = new Map<number, string>(vtPatients.rows.map(r => [parseInt(r.id), r.breed_name]));
    for (const pat of patients.rows) {
      const breed = breedMap.get(pat.vetais_id);
      if (!breed) { skipped++; continue; }
      await vs.query('UPDATE patients SET breed=$1, updated_at=NOW() WHERE id=$2', [breed, pat.id]);
      updated++;
    }
    offset += BATCH;
    process.stdout.write(`\r  Обработано: ${offset} | ✅ ${updated} | ⏭️  ${skipped}`);
  }
  console.log(`\n✅ Обновлено: ${updated}, пропущено: ${skipped}`);
}

main().catch(e => { console.error('❌ Ошибка:', e.message); process.exit(1); });
