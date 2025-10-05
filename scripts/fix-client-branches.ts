#!/usr/bin/env tsx

/**
 * Корректирующий скрипт для исправления branch_id у клиентов
 * на основе данных из Vetais (id_kliniky)
 * 
 * Использование:
 *   tsx scripts/fix-client-branches.ts [tenantId]
 */

import { Client } from 'pg';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   ИСПРАВЛЕНИЕ ПРИНАДЛЕЖНОСТИ КЛИЕНТОВ К ФИЛИАЛАМ             ║');
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

    // Загрузить маппинг vetais_clinic_id -> branch_id
    console.log('📋 Загрузка маппинга филиалов...');
    const branchesResult = await vetsystemDb.query(`
      SELECT id, name, vetais_clinic_id 
      FROM branches 
      WHERE tenant_id = $1 AND vetais_clinic_id IS NOT NULL
      ORDER BY vetais_clinic_id
    `, [tenantId]);

    const clinicToBranch = new Map<number, { id: string, name: string }>();
    branchesResult.rows.forEach(row => {
      clinicToBranch.set(row.vetais_clinic_id, { id: row.id, name: row.name });
    });

    console.log('Маппинг филиалов:');
    clinicToBranch.forEach((branch, clinicId) => {
      console.log(`  Vetais clinic ${clinicId} → ${branch.name} (${branch.id})`);
    });
    console.log();

    // Загрузить данные из Vetais о принадлежности клиентов к клиникам
    console.log('📊 Загрузка данных из Vetais...');
    const vetaisClientsResult = await vetaisDb.query(`
      SELECT kod_kado, id_kliniky
      FROM file_clients
      ORDER BY kod_kado
    `);

    console.log(`✅ Загружено ${vetaisClientsResult.rows.length} клиентов из Vetais\n`);

    // Группировка по id_kliniky для статистики
    const clinicStats = new Map<number, number>();
    vetaisClientsResult.rows.forEach(row => {
      const clinicId = row.id_kliniky || 0;
      clinicStats.set(clinicId, (clinicStats.get(clinicId) || 0) + 1);
    });

    console.log('Распределение клиентов по клиникам в Vetais:');
    clinicStats.forEach((count, clinicId) => {
      const branch = clinicToBranch.get(clinicId);
      if (branch) {
        console.log(`  Clinic ${clinicId} (${branch.name}): ${count} клиентов`);
      } else {
        console.log(`  Clinic ${clinicId} (не найден в маппинге): ${count} клиентов`);
      }
    });
    console.log();

    // Обновить branch_id для каждого клиента
    console.log('🔄 Обновление принадлежности клиентов к филиалам...');
    
    let updatedCount = 0;
    let notFoundCount = 0;
    let noMappingCount = 0;

    for (const vetaisClient of vetaisClientsResult.rows) {
      const vetaisClientId = vetaisClient.kod_kado;
      const clinicId = vetaisClient.id_kliniky || 0;
      
      // Найти branch по clinic_id
      const branch = clinicToBranch.get(clinicId);
      
      if (!branch) {
        noMappingCount++;
        // Установить NULL для клиентов без маппинга (id_kliniky=0 или неизвестные)
        const updateResult = await vetsystemDb.query(`
          UPDATE owners 
          SET branch_id = NULL
          WHERE tenant_id = $1 AND vetais_id = $2
        `, [tenantId, vetaisClientId.toString()]);
        
        if (updateResult.rowCount && updateResult.rowCount > 0) {
          updatedCount += updateResult.rowCount;
        }
        continue;
      }

      // Обновить branch_id
      const updateResult = await vetsystemDb.query(`
        UPDATE owners 
        SET branch_id = $1
        WHERE tenant_id = $2 AND vetais_id = $3
      `, [branch.id, tenantId, vetaisClientId.toString()]);

      if (updateResult.rowCount && updateResult.rowCount > 0) {
        updatedCount += updateResult.rowCount;
      } else {
        notFoundCount++;
      }
    }

    console.log('\n✅ Обновление завершено!');
    console.log(`   Обновлено клиентов: ${updatedCount}`);
    console.log(`   Не найдено в VetSystem: ${notFoundCount}`);
    console.log(`   Без маппинга (установлен NULL): ${noMappingCount}`);

    // Проверка результата
    console.log('\n📊 Статистика по филиалам после исправления:');
    const statsResult = await vetsystemDb.query(`
      SELECT 
        b.name as branch_name,
        COUNT(o.id) as client_count
      FROM owners o
      LEFT JOIN branches b ON o.branch_id = b.id
      WHERE o.tenant_id = $1
      GROUP BY b.id, b.name
      ORDER BY b.name NULLS LAST
    `, [tenantId]);

    statsResult.rows.forEach(row => {
      const branchName = row.branch_name || 'Без филиала';
      console.log(`  ${branchName}: ${row.client_count} клиентов`);
    });

  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await vetsystemDb.end();
    await vetaisDb.end();
  }
}

main();
