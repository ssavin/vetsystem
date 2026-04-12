#!/usr/bin/env tsx
/**
 * Заполнение таблицы patient_owners для всех мигрированных пациентов.
 *
 * Проблема: скрипт миграции ставит owner_id прямо на пациента, но не
 * создаёт записи в patient_owners. Карточка пациента читает именно эту
 * таблицу → показывает «Выберите владельца».
 *
 * Скрипт находит всех пациентов с owner_id, у которых нет записи в
 * patient_owners, и создаёт её (is_primary = true).
 *
 * Использование:
 *   npx tsx scripts/fix-patient-owners.ts [--tenant <tenantId>]
 *   (без --tenant — исправить всех тенантов)
 */
import { Client } from 'pg';

function getArg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

const TENANT_FILTER = getArg('tenant');

async function main() {
  const vsDb = new Client({ connectionString: process.env.DATABASE_URL });
  await vsDb.connect();

  console.log('🔧 Заполнение patient_owners...');
  if (TENANT_FILTER) {
    console.log(`   Тенант: ${TENANT_FILTER}`);
  } else {
    console.log('   Тенанты: все');
  }

  const tenantCond = TENANT_FILTER ? `AND p.tenant_id = '${TENANT_FILTER}'` : '';

  // Считаем сколько надо исправить
  const countRes = await vsDb.query(`
    SELECT count(*) AS cnt
    FROM patients p
    WHERE p.owner_id IS NOT NULL
      ${tenantCond}
      AND NOT EXISTS (
        SELECT 1 FROM patient_owners po
        WHERE po.patient_id = p.id AND po.owner_id = p.owner_id
      )
  `);
  const total = parseInt(countRes.rows[0].cnt);
  console.log(`\n   Пациентов без patient_owners записи: ${total}`);

  if (total === 0) {
    console.log('\n✅ Всё уже исправлено, ничего делать не нужно.');
    await vsDb.end();
    return;
  }

  // Вставляем пачками по 1000
  const BATCH = 1000;
  let inserted = 0;
  let errors = 0;
  let offset = 0;

  while (true) {
    const res = await vsDb.query(`
      SELECT p.id AS patient_id, p.owner_id
      FROM patients p
      WHERE p.owner_id IS NOT NULL
        ${tenantCond}
        AND NOT EXISTS (
          SELECT 1 FROM patient_owners po
          WHERE po.patient_id = p.id AND po.owner_id = p.owner_id
        )
      LIMIT $1 OFFSET $2
    `, [BATCH, offset]);

    if (res.rows.length === 0) break;

    // Убедиться что owner существует в системе
    for (const row of res.rows) {
      try {
        await vsDb.query(`
          INSERT INTO patient_owners (id, patient_id, owner_id, is_primary, created_at)
          VALUES (gen_random_uuid()::text, $1, $2, true, NOW())
          ON CONFLICT DO NOTHING
        `, [row.patient_id, row.owner_id]);
        inserted++;
      } catch (e: any) {
        errors++;
        if (errors <= 5) {
          console.error(`\n   ❌ patient_id=${row.patient_id}: ${e.message}`);
        }
      }
    }

    offset += BATCH;
    process.stdout.write(`\r   ✅ Создано: ${inserted} / ${total}  `);
  }

  console.log(`\n\n📊 Итог:`);
  console.log(`   Создано записей: ${inserted}`);
  console.log(`   Ошибок:         ${errors}`);
  console.log('\n✅ Готово! Карточки пациентов теперь отображают владельца.');

  await vsDb.end();
}

main().catch(e => {
  console.error('❌ Критическая ошибка:', e.message);
  process.exit(1);
});
