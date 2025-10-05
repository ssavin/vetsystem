#!/usr/bin/env tsx

/**
 * Миграция существующих связей patient-owner в таблицу patient_owners
 * 
 * Этот скрипт переносит все существующие связи из поля patients.owner_id
 * в новую таблицу patient_owners с is_primary=true
 * 
 * Использование:
 *   tsx scripts/migrate-patient-owners.ts [tenantId] [batchSize]
 */

import { Client } from 'pg';

const BATCH_SIZE = parseInt(process.argv[3] || '500');

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   МИГРАЦИЯ PATIENT-OWNER RELATIONSHIPS                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const db = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔌 Подключение к базе данных...');
    await db.connect();
    console.log('✅ Подключение успешно!\n');

    // Получить список клиник
    const tenantsResult = await db.query(
      'SELECT id, name, slug FROM tenants WHERE status = $1 ORDER BY name',
      ['active']
    );

    const tenantId = process.argv[2] || tenantsResult.rows[0].id;
    const selectedTenant = tenantsResult.rows.find(t => t.id === tenantId);
    
    if (!selectedTenant) {
      console.error(`❌ Клиника с ID ${tenantId} не найдена`);
      process.exit(1);
    }

    console.log(`✅ Клиника: ${selectedTenant.name}`);
    console.log(`✅ Размер батча: ${BATCH_SIZE}\n`);

    // Найти все записи пациентов с owner_id
    console.log('📊 Поиск пациентов с назначенными владельцами...');
    const patientsResult = await db.query(`
      SELECT 
        id as patient_id,
        owner_id,
        name as patient_name
      FROM patients
      WHERE tenant_id = $1 
        AND owner_id IS NOT NULL
      ORDER BY created_at
    `, [tenantId]);

    console.log(`✅ Найдено пациентов с владельцами: ${patientsResult.rows.length}\n`);

    if (patientsResult.rows.length === 0) {
      console.log('ℹ️  Нет пациентов для миграции');
      return;
    }

    // Проверить сколько уже мигрировано
    const existingResult = await db.query(`
      SELECT COUNT(*) as count
      FROM patient_owners po
      JOIN patients p ON p.id = po.patient_id
      WHERE p.tenant_id = $1
    `, [tenantId]);

    const existingCount = parseInt(existingResult.rows[0].count);
    console.log(`ℹ️  Уже мигрировано связей: ${existingCount}\n`);

    // Обработка батчами с транзакциями
    let processedCount = 0;
    let createdCount = 0;

    for (let i = 0; i < patientsResult.rows.length; i += BATCH_SIZE) {
      const batch = patientsResult.rows.slice(i, i + BATCH_SIZE);
      
      console.log(`\n📦 Обработка батча ${Math.floor(i / BATCH_SIZE) + 1} (${i + 1}-${Math.min(i + BATCH_SIZE, patientsResult.rows.length)} из ${patientsResult.rows.length})`);

      // Начать транзакцию для батча
      await db.query('BEGIN');

      try {
        // Подготовить данные для вставки
        const valuesToInsert: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        for (const patient of batch) {
          valuesToInsert.push(
            `(gen_random_uuid(), $${paramIndex}, $${paramIndex + 1}, true, NOW())`
          );
          params.push(patient.patient_id, patient.owner_id);
          paramIndex += 2;
        }

        // Вставка батчем с ON CONFLICT DO NOTHING для пропуска дубликатов
        const insertQuery = `
          INSERT INTO patient_owners (id, patient_id, owner_id, is_primary, created_at)
          VALUES ${valuesToInsert.join(', ')}
          ON CONFLICT (patient_id, owner_id) DO NOTHING
          RETURNING id
        `;

        const result = await db.query(insertQuery, params);
        createdCount += result.rowCount || 0;
        
        await db.query('COMMIT');
        console.log(`  ✅ Создано связей: ${result.rowCount || 0} из ${batch.length}`);
      } catch (error) {
        await db.query('ROLLBACK');
        console.error(`  ❌ Ошибка в батче, откат изменений:`, error);
        throw error;
      }

      processedCount += batch.length;
      console.log(`  📊 Обработано: ${processedCount}/${patientsResult.rows.length}`);
    }

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    РЕЗУЛЬТАТ МИГРАЦИИ                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log(`✅ Всего пациентов с владельцами: ${patientsResult.rows.length}`);
    console.log(`✅ Создано новых связей: ${createdCount}`);
    console.log(`⏭️  Пропущено (уже существуют): ${processedCount - createdCount}`);
    console.log(`📊 Всего обработано: ${processedCount}\n`);

    // Верификация
    console.log('🔍 Верификация результатов...');
    const verificationResult = await db.query(`
      SELECT COUNT(*) as count
      FROM patient_owners po
      JOIN patients p ON p.id = po.patient_id
      WHERE p.tenant_id = $1 AND po.is_primary = true
    `, [tenantId]);

    const totalPrimaryLinks = parseInt(verificationResult.rows[0].count);
    console.log(`✅ Найдено primary связей в patient_owners: ${totalPrimaryLinks}`);

    // Проверка соответствия количества
    if (totalPrimaryLinks !== patientsResult.rows.length) {
      console.log(`\n❌ ОШИБКА: Несоответствие количества!`);
      console.log(`   Ожидалось: ${patientsResult.rows.length}`);
      console.log(`   Получено: ${totalPrimaryLinks}`);
      console.log(`   Разница: ${patientsResult.rows.length - totalPrimaryLinks}\n`);
      process.exit(1);
    } else {
      console.log(`✅ Количество совпадает: ${totalPrimaryLinks} = ${patientsResult.rows.length}\n`);
    }

    // Проверка пациентов без primary owner
    const noPrimaryResult = await db.query(`
      SELECT COUNT(*) as count
      FROM patients p
      LEFT JOIN patient_owners po ON p.id = po.patient_id AND po.is_primary = true
      WHERE p.tenant_id = $1 
        AND p.owner_id IS NOT NULL
        AND po.id IS NULL
    `, [tenantId]);

    const missingCount = parseInt(noPrimaryResult.rows[0].count);
    if (missingCount > 0) {
      console.log(`⚠️  Внимание: ${missingCount} пациентов без primary owner\n`);
      process.exit(1);
    } else {
      console.log('✅ Все пациенты с owner_id имеют primary owner\n');
    }

  } catch (error) {
    console.error('\n❌ Ошибка:', error);
    throw error;
  } finally {
    await db.end();
    console.log('🔌 Соединение закрыто');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
