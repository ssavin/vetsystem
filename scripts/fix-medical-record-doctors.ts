#!/usr/bin/env tsx
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ИСПРАВЛЕНИЕ doctor_id В МЕДИЦИНСКИХ ЗАПИСЯХ                           ║
 * ║                                                                          ║
 * ║  Проставляет doctor_id (→ users.id) в medical_records, которые были    ║
 * ║  мигрированы с NULL doctor_id из Vetais.                                ║
 * ║                                                                          ║
 * ║  Использование:                                                          ║
 * ║    tsx scripts/fix-medical-record-doctors.ts \                          ║
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
const BATCH       = parseInt(arg('batch') || '1000');

if (!TENANT_ID) { console.error('❌ Укажите --tenant <id>'); process.exit(1); }

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   ИСПРАВЛЕНИЕ doctor_id В МЕДИЦИНСКИХ ЗАПИСЯХ              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`  Tenant  : ${TENANT_ID}`);
  console.log(`  Vetais  : ${VETAIS_DB} @ ${VETAIS_HOST}:${VETAIS_PORT}`);
  console.log('');

  const vs = new Client({ connectionString: process.env.DATABASE_URL });
  const vt = new Client({
    host: VETAIS_HOST, port: VETAIS_PORT,
    user: VETAIS_USER, password: VETAIS_PASS,
    database: VETAIS_DB,
  });

  await vs.connect();
  await vt.connect();
  console.log('✅ Подключено к обеим БД\n');

  // 1. Строим маппинг: Vetais user ID → VetSystem users.id
  console.log('📋 Строим маппинг врачей (Vetais → users.id)...');
  let vtUsers: { rows: any[] };
  try {
    vtUsers = await vt.query(
      'SELECT kod_uzivatele AS vid, jmeno, prijmeni, otcestvo FROM system_users WHERE vymaz=0'
    );
  } catch (e: any) {
    if (e.code === '42P01') {
      console.log('  ⚠️  Таблица system_users не найдена, выход.');
      await vs.end(); await vt.end(); return;
    }
    throw e;
  }

  const vsUsers = await vs.query(
    'SELECT id, full_name FROM users WHERE tenant_id=$1 AND full_name IS NOT NULL',
    [TENANT_ID]
  );
  const nameToUserId = new Map<string, string>(
    vsUsers.rows.map(r => [r.full_name.toLowerCase().trim(), r.id])
  );

  const doctorMap = new Map<number, string>();
  for (const r of vtUsers.rows) {
    const fullName = [r.prijmeni, r.jmeno, r.otcestvo].filter(Boolean).join(' ').trim().toLowerCase();
    if (fullName && nameToUserId.has(fullName)) {
      doctorMap.set(parseInt(r.vid), nameToUserId.get(fullName)!);
    }
  }
  console.log(`  Сопоставлено врачей: ${doctorMap.size} из ${vtUsers.rows.length}`);

  if (doctorMap.size === 0) {
    console.log('  ⚠️  Нет сопоставлений, выход.');
    await vs.end(); await vt.end(); return;
  }

  // 2. Находим медзаписи с NULL doctor_id и vetais_id IS NOT NULL
  const countRes = await vs.query(
    `SELECT COUNT(*)::int AS cnt FROM medical_records
     WHERE tenant_id=$1 AND doctor_id IS NULL AND vetais_id IS NOT NULL`,
    [TENANT_ID]
  );
  const total = countRes.rows[0].cnt;
  console.log(`\n📊 Медзаписей с NULL doctor_id: ${total}`);

  if (total === 0) {
    console.log('✅ Все записи уже имеют doctor_id, выход.');
    await vs.end(); await vt.end(); return;
  }

  // 3. Батчами обновляем doctor_id
  let updated = 0;
  let skipped = 0;
  let offset = 0;

  while (true) {
    // Берём батч medical_records с NULL doctor_id
    const records = await vs.query(
      `SELECT id, vetais_id::int AS vetais_id FROM medical_records
       WHERE tenant_id=$1 AND doctor_id IS NULL AND vetais_id IS NOT NULL
       ORDER BY vetais_id
       LIMIT $2 OFFSET $3`,
      [TENANT_ID, BATCH, offset]
    );
    if (!records.rows.length) break;

    // Получаем id_doctor из Vetais для этих exam IDs
    const vetaisIds = records.rows.map(r => r.vetais_id);
    const exams = await vt.query(
      'SELECT id, id_doctor FROM medical_exams WHERE id = ANY($1::int[])',
      [vetaisIds]
    );
    const examDoctorMap = new Map<number, number>(
      exams.rows.map(r => [parseInt(r.id), parseInt(r.id_doctor)])
    );

    // Обновляем записи
    for (const rec of records.rows) {
      const vetaisExamId = rec.vetais_id;
      const vetaisDoctorId = examDoctorMap.get(vetaisExamId);
      if (!vetaisDoctorId) { skipped++; continue; }

      const userId = doctorMap.get(vetaisDoctorId);
      if (!userId) { skipped++; continue; }

      await vs.query(
        'UPDATE medical_records SET doctor_id=$1 WHERE id=$2',
        [userId, rec.id]
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
  console.log(`  ⏭️  Пропущено: ${skipped}`);
  console.log(`✨ Готово!`);

  await vs.end();
  await vt.end();
}

main().catch(e => {
  console.error('❌ Ошибка:', e.message);
  process.exit(1);
});
