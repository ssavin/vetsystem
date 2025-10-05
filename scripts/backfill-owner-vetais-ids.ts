#!/usr/bin/env tsx

/**
 * Обратное заполнение vetais_id для существующих owners
 * 
 * Этот скрипт сопоставляет уже мигрированных владельцев с Vetais через телефон
 * и добавляет vetais_id для последующей миграции пациентов
 * 
 * Использование:
 *   tsx scripts/backfill-owner-vetais-ids.ts [tenantId]
 */

import { Client } from 'pg';

function cleanPhone(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.trim().replace(/[^\d+]/g, '');
  return cleaned.length >= 10 ? cleaned : null;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   ОБНОВЛЕНИЕ VETAIS_ID ДЛЯ СУЩЕСТВУЮЩИХ OWNERS               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const vetsystemDb = new Client({
    connectionString: process.env.DATABASE_URL
  });

  const vetaisDb = new Client({
    host: process.env.VETAIS_DB_HOST,
    port: parseInt(process.env.VETAIS_DB_PORT || '5432'),
    database: process.env.VETAIS_DB_NAME,
    user: process.env.VETAIS_DB_USER,
    password: process.env.VETAIS_DB_PASSWORD,
  });

  try {
    console.log('🔌 Подключение к базам данных...');
    await vetsystemDb.connect();
    await vetaisDb.connect();
    console.log('✅ Подключение успешно!\n');

    // Выбор tenant
    const tenantsResult = await vetsystemDb.query(
      'SELECT id, name, slug FROM tenants WHERE status = $1 ORDER BY name',
      ['active']
    );

    const tenantId = process.argv[2] || tenantsResult.rows[0].id;
    const selectedTenant = tenantsResult.rows.find(t => t.id === tenantId);
    
    if (!selectedTenant) {
      console.error(`❌ Клиника с ID ${tenantId} не найдена`);
      process.exit(1);
    }

    console.log(`✅ Клиника: ${selectedTenant.name}\n`);

    // Получить Vetais клиентов с телефонами
    console.log('📊 Загрузка Vetais клиентов...');
    const vetaisClientsResult = await vetaisDb.query(`
      SELECT 
        kod_kado,
        telefon,
        mobil
      FROM file_clients
      WHERE vymaz = 0
    `);

    // Создать маппинг phone → Vetais kod_kado (с обработкой коллизий)
    const phoneToVetaisMap = new Map<string, number[]>();
    
    vetaisClientsResult.rows.forEach(row => {
      const phone = cleanPhone(row.mobil) || cleanPhone(row.telefon);
      if (phone) {
        const existingIds = phoneToVetaisMap.get(phone) || [];
        existingIds.push(row.kod_kado);
        phoneToVetaisMap.set(phone, existingIds);
      }
    });

    console.log(`✅ Загружено ${vetaisClientsResult.rows.length} Vetais клиентов`);
    console.log(`   Уникальных телефонов: ${phoneToVetaisMap.size}\n`);

    // Получить VetSystem owners без vetais_id
    console.log('📊 Загрузка VetSystem owners...');
    const vetsystemOwnersResult = await vetsystemDb.query(`
      SELECT id, phone, name
      FROM owners
      WHERE tenant_id = $1 
        AND vetais_id IS NULL
        AND phone IS NOT NULL
      ORDER BY created_at
    `, [tenantId]);

    console.log(`✅ Найдено ${vetsystemOwnersResult.rows.length} owners для обновления\n`);

    // Подготовка данных для batch update
    let updatedCount = 0;
    let skippedMultiple = 0;
    let skippedNoMatch = 0;
    let collisionWarnings: string[] = [];
    const updateBatch: Array<{ ownerId: string, vetaisId: string }> = [];

    console.log('🔄 Подготовка обновлений...\n');

    for (const owner of vetsystemOwnersResult.rows) {
      const phone = cleanPhone(owner.phone);
      if (!phone) {
        skippedNoMatch++;
        continue;
      }

      const vetaisIds = phoneToVetaisMap.get(phone);
      
      if (!vetaisIds || vetaisIds.length === 0) {
        skippedNoMatch++;
        continue;
      }

      if (vetaisIds.length > 1) {
        // Коллизия - несколько Vetais клиентов с одним телефоном
        collisionWarnings.push(
          `⚠️  Телефон ${phone} (${owner.name}): найдено ${vetaisIds.length} Vetais клиентов [${vetaisIds.join(', ')}] - используется ${vetaisIds[0]}`
        );
        skippedMultiple++;
      }

      updateBatch.push({
        ownerId: owner.id,
        vetaisId: vetaisIds[0].toString()
      });
    }

    console.log(`📊 Подготовлено обновлений: ${updateBatch.length}\n`);
    console.log('🚀 Выполнение batch update...\n');

    // Batch update используя temporary table
    if (updateBatch.length > 0) {
      // Создать временную таблицу
      await vetsystemDb.query(`
        CREATE TEMP TABLE owner_vetais_mapping (
          owner_id VARCHAR,
          vetais_id VARCHAR
        )
      `);

      // Вставить данные batch-ами по 5000
      const BATCH_SIZE = 5000;
      for (let i = 0; i < updateBatch.length; i += BATCH_SIZE) {
        const batch = updateBatch.slice(i, i + BATCH_SIZE);
        const values = batch.map((_, idx) => {
          return `($${idx * 2 + 1}, $${idx * 2 + 2})`;
        }).join(', ');

        const params = batch.flatMap(item => [item.ownerId, item.vetaisId]);

        await vetsystemDb.query(`
          INSERT INTO owner_vetais_mapping (owner_id, vetais_id)
          VALUES ${values}
        `, params);

        updatedCount += batch.length;
        console.log(`   ✅ Подготовлено: ${updatedCount} / ${updateBatch.length}`);
      }

      // Выполнить массовое обновление
      const updateResult = await vetsystemDb.query(`
        UPDATE owners o
        SET vetais_id = m.vetais_id
        FROM owner_vetais_mapping m
        WHERE o.id = m.owner_id
      `);

      console.log(`\n✅ Обновлено записей: ${updateResult.rowCount}\n`);

      // Удалить временную таблицу
      await vetsystemDb.query(`DROP TABLE owner_vetais_mapping`);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ ОБНОВЛЕНИЕ ЗАВЕРШЕНО!');
    console.log(`📊 Обновлено owners: ${updatedCount}`);
    console.log(`⚠️  Пропущено (нет совпадений): ${skippedNoMatch}`);
    console.log(`⚠️  Коллизий телефонов: ${skippedMultiple}`);
    console.log('═'.repeat(80) + '\n');

    // Показать предупреждения о коллизиях
    if (collisionWarnings.length > 0) {
      console.log('⚠️  ПРЕДУПРЕЖДЕНИЯ О КОЛЛИЗИЯХ ТЕЛЕФОНОВ:\n');
      collisionWarnings.slice(0, 20).forEach(warning => console.log(warning));
      if (collisionWarnings.length > 20) {
        console.log(`\n   ... и еще ${collisionWarnings.length - 20} коллизий\n`);
      }
    }

    // Статистика
    const statsResult = await vetsystemDb.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(vetais_id) as with_vetais_id
      FROM owners
      WHERE tenant_id = $1
    `, [tenantId]);

    const stats = statsResult.rows[0];
    console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log(`   Всего owners: ${stats.total}`);
    console.log(`   С vetais_id: ${stats.with_vetais_id} (${Math.round(stats.with_vetais_id / stats.total * 100)}%)`);
    console.log(`   Без vetais_id: ${stats.total - stats.with_vetais_id}\n`);

  } catch (error: any) {
    console.error('\n❌ Критическая ошибка:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await vetsystemDb.end();
    await vetaisDb.end();
  }
}

main().catch(console.error);
