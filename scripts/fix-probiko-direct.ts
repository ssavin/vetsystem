#!/usr/bin/env tsx
/**
 * Прямое исправление данных Probiko без подключения к Vetais:
 *   1. Находит существующую ветку тенанта (или создаёт "Probiko-1")
 *   2. Присваивает branch_id всем пациентам без ветки
 *   3. Присваивает branch_id всем владельцам без ветки
 *   4. Создаёт записи в patient_owners для пациентов без связи
 */
import { Client } from 'pg';

const TENANT_ID = 'cc7d6b45-4a05-425d-890e-a5cb1bd89266';

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  console.log('🔧 Прямое исправление данных Probiko\n');

  // 1. Найти или создать ветку
  const branchRes = await db.query(
    `SELECT id, name FROM branches WHERE tenant_id = $1 ORDER BY created_at LIMIT 1`,
    [TENANT_ID]
  );

  let branchId: string;
  let branchName: string;

  if (branchRes.rows.length > 0) {
    branchId   = branchRes.rows[0].id;
    branchName = branchRes.rows[0].name;
    console.log(`✅ Используем ветку: "${branchName}" (${branchId})`);
  } else {
    const ins = await db.query(`
      INSERT INTO branches (id, tenant_id, name, status, created_at, updated_at)
      VALUES (gen_random_uuid()::text, $1, 'Probiko-1', 'active', NOW(), NOW())
      RETURNING id, name
    `, [TENANT_ID]);
    branchId   = ins.rows[0].id;
    branchName = ins.rows[0].name;
    console.log(`✅ Создана ветка: "${branchName}" (${branchId})`);
  }

  // 2. Посчитать что нужно исправить
  const counts = await db.query(`
    SELECT
      (SELECT count(*) FROM patients
        WHERE tenant_id = $1 AND (branch_id IS NULL OR branch_id = ''))::int AS patients_no_branch,
      (SELECT count(*) FROM owners
        WHERE tenant_id = $1 AND (branch_id IS NULL OR branch_id = ''))::int AS owners_no_branch,
      (SELECT count(*) FROM patients p
        WHERE p.tenant_id = $1 AND p.owner_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM patient_owners po WHERE po.patient_id = p.id
          ))::int AS patients_no_link
  `, [TENANT_ID]);

  const c = counts.rows[0];
  console.log(`\n📊 Нужно исправить:`);
  console.log(`   Пациентов без ветки:          ${c.patients_no_branch}`);
  console.log(`   Владельцев без ветки:          ${c.owners_no_branch}`);
  console.log(`   Пациентов без patient_owners:  ${c.patients_no_link}\n`);

  // 3. Привязать пациентов к ветке
  if (parseInt(c.patients_no_branch) > 0) {
    process.stdout.write('   Привязываю пациентов к ветке...');
    const r = await db.query(`
      UPDATE patients SET branch_id = $1, updated_at = NOW()
      WHERE tenant_id = $2 AND (branch_id IS NULL OR branch_id = '')
    `, [branchId, TENANT_ID]);
    console.log(` ✅ ${r.rowCount} обновлено`);
  }

  // 4. Привязать владельцев к ветке
  if (parseInt(c.owners_no_branch) > 0) {
    process.stdout.write('   Привязываю владельцев к ветке...');
    const r = await db.query(`
      UPDATE owners SET branch_id = $1, updated_at = NOW()
      WHERE tenant_id = $2 AND (branch_id IS NULL OR branch_id = '')
    `, [branchId, TENANT_ID]);
    console.log(` ✅ ${r.rowCount} обновлено`);
  }

  // 5. Создать patient_owners (пачками по 2000)
  if (parseInt(c.patients_no_link) > 0) {
    process.stdout.write('   Заполняю patient_owners...');
    let total = 0;
    while (true) {
      const r = await db.query(`
        INSERT INTO patient_owners (id, patient_id, owner_id, is_primary, created_at)
        SELECT gen_random_uuid()::text, p.id, p.owner_id, true, NOW()
        FROM patients p
        WHERE p.tenant_id = $1
          AND p.owner_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM patient_owners po WHERE po.patient_id = p.id
          )
        LIMIT 2000
      `, [TENANT_ID]);
      total += r.rowCount ?? 0;
      if ((r.rowCount ?? 0) === 0) break;
      process.stdout.write(`\r   Заполняю patient_owners... ${total}`);
    }
    console.log(` ✅ ${total} записей создано`);
  }

  // Итоговая проверка
  const check = await db.query(`
    SELECT
      (SELECT count(*) FROM patients WHERE tenant_id = $1)::int AS total_patients,
      (SELECT count(*) FROM owners   WHERE tenant_id = $1)::int AS total_owners,
      (SELECT count(*) FROM patient_owners po
        JOIN patients p ON p.id = po.patient_id
        WHERE p.tenant_id = $1)::int AS linked
  `, [TENANT_ID]);

  const ch = check.rows[0];
  console.log(`\n✅ Итог Probiko:`);
  console.log(`   Пациентов:         ${ch.total_patients}`);
  console.log(`   Владельцев:        ${ch.total_owners}`);
  console.log(`   Связей patient_owners: ${ch.linked}`);
  console.log('\n🎉 Готово! Перезагрузите страницу регистратуры.');

  await db.end();
}

main().catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
