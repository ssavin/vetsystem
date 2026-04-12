#!/usr/bin/env tsx
/**
 * Прямое исправление данных Probiko без подключения к Vetais:
 *   1. Показывает существующие филиалы тенанта
 *   2. Создаёт записи patient_owners (критический баг: "Выберите владельца")
 *   3. Если указан --branch <id> — привязывает пациентов/владельцев без ветки к нему
 *
 * Использование:
 *   npx tsx scripts/fix-probiko-direct.ts
 *   npx tsx scripts/fix-probiko-direct.ts --branch <branchId>
 */
import { Client } from 'pg';

const TENANT_ID = 'cc7d6b45-4a05-425d-890e-a5cb1bd89266';
const idx = process.argv.indexOf('--branch');
const BRANCH_ID = idx !== -1 ? process.argv[idx + 1] : null;

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  console.log('🔧 Исправление данных Probiko\n');

  // 1. Показать существующие филиалы
  const branches = await db.query(
    `SELECT id, name, status FROM branches WHERE tenant_id = $1 ORDER BY created_at`,
    [TENANT_ID]
  );
  console.log(`📍 Филиалы Probiko (${branches.rows.length}):`);
  branches.rows.forEach(b => console.log(`   [${b.id}] ${b.name} — ${b.status}`));
  console.log();

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
  console.log(`📊 Нужно исправить:`);
  console.log(`   Пациентов без ветки:          ${c.patients_no_branch}`);
  console.log(`   Владельцев без ветки:          ${c.owners_no_branch}`);
  console.log(`   Пациентов без patient_owners:  ${c.patients_no_link}\n`);

  // 3. Привязать к ветке (только если --branch указан)
  if (BRANCH_ID) {
    const branchCheck = await db.query(
      `SELECT id, name FROM branches WHERE id = $1 AND tenant_id = $2`,
      [BRANCH_ID, TENANT_ID]
    );
    if (branchCheck.rows.length === 0) {
      console.error(`❌ Филиал ${BRANCH_ID} не найден для этого тенанта`);
      await db.end(); process.exit(1);
    }
    console.log(`🏥 Привязываю к филиалу: "${branchCheck.rows[0].name}"`);

    if (parseInt(c.patients_no_branch) > 0) {
      const r = await db.query(`
        UPDATE patients SET branch_id = $1, updated_at = NOW()
        WHERE tenant_id = $2 AND (branch_id IS NULL OR branch_id = '')
      `, [BRANCH_ID, TENANT_ID]);
      console.log(`   ✅ Пациентов привязано: ${r.rowCount}`);
    }
    if (parseInt(c.owners_no_branch) > 0) {
      const r = await db.query(`
        UPDATE owners SET branch_id = $1, updated_at = NOW()
        WHERE tenant_id = $2 AND (branch_id IS NULL OR branch_id = '')
      `, [BRANCH_ID, TENANT_ID]);
      console.log(`   ✅ Владельцев привязано: ${r.rowCount}`);
    }
    console.log();
  } else if (parseInt(c.patients_no_branch) > 0) {
    console.log(`ℹ️  Пациенты без ветки не привязаны.`);
    console.log(`   Запустите с --branch <id> чтобы привязать к конкретному филиалу.`);
    console.log(`   Например:`);
    branches.rows.forEach(b =>
      console.log(`     npx tsx scripts/fix-probiko-direct.ts --branch ${b.id}`)
    );
    console.log();
  }

  // 4. Создать patient_owners (критический баг — карточка пациента)
  if (parseInt(c.patients_no_link) > 0) {
    process.stdout.write(`   Создаю patient_owners...`);
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
      process.stdout.write(`\r   Создаю patient_owners... ${total}`);
    }
    console.log(`\r   ✅ patient_owners создано: ${total}              `);
  } else {
    console.log(`   ✅ patient_owners уже заполнены`);
  }

  // Итоговая проверка
  const check = await db.query(`
    SELECT
      (SELECT count(*) FROM patients WHERE tenant_id = $1)::int AS total_patients,
      (SELECT count(*) FROM owners   WHERE tenant_id = $1)::int AS total_owners,
      (SELECT count(*) FROM patient_owners po
        JOIN patients p ON p.id = po.patient_id
        WHERE p.tenant_id = $1)::int AS linked,
      (SELECT count(*) FROM patients WHERE tenant_id = $1 AND branch_id IS NOT NULL)::int AS with_branch
  `, [TENANT_ID]);

  const ch = check.rows[0];
  console.log(`\n✅ Итог:`);
  console.log(`   Пациентов всего:              ${ch.total_patients}`);
  console.log(`   Владельцев всего:              ${ch.total_owners}`);
  console.log(`   Пациентов со связью владельца: ${ch.linked}`);
  console.log(`   Пациентов с веткой:            ${ch.with_branch}`);

  if (parseInt(ch.with_branch) < parseInt(ch.total_patients)) {
    const noBranch = parseInt(ch.total_patients) - parseInt(ch.with_branch);
    console.log(`\n⚠️  ${noBranch} пациентов без ветки.`);
    console.log(`   Запустите: npx tsx scripts/fix-probiko-direct.ts --branch <id>`);
    console.log(`   ID филиалов выше в списке.`);
  }

  if (parseInt(ch.linked) === parseInt(ch.total_patients)) {
    console.log(`\n🎉 Карточки пациентов теперь показывают владельца!`);
  }

  await db.end();
}

main().catch(e => {
  console.error('❌', e.message);
  process.exit(1);
});
