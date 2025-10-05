#!/usr/bin/env tsx

/**
 * Быстрое исправление branch_id у клиентов через временную таблицу
 * 
 * Использование:
 *   tsx scripts/fix-client-branches-fast.ts [tenantId]
 */

import { Client } from 'pg';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   БЫСТРОЕ ИСПРАВЛЕНИЕ ПРИНАДЛЕЖНОСТИ К ФИЛИАЛАМ              ║');
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
      'SELECT id, name FROM tenants WHERE status = $1 ORDER BY name',
      ['active']
    );

    const tenantId = process.argv[2] || tenantsResult.rows[0].id;
    const selectedTenant = tenantsResult.rows.find(t => t.id === tenantId);
    
    if (!selectedTenant) {
      console.error(`❌ Клиника с ID ${tenantId} не найдена`);
      process.exit(1);
    }

    console.log(`✅ Клиника: ${selectedTenant.name}\n`);

    // Создать временную таблицу для маппинга
    console.log('📋 Создание временной таблицы...');
    await vetsystemDb.query(`
      CREATE TEMP TABLE IF NOT EXISTS vetais_clinic_mapping (
        vetais_id VARCHAR,
        clinic_id INTEGER,
        branch_id VARCHAR
      )
    `);

    // Загрузить данные из Vetais
    console.log('📊 Загрузка данных из Vetais...');
    const vetaisData = await vetaisDb.query(`
      SELECT kod_kado, id_kliniky
      FROM file_clients
      ORDER BY kod_kado
    `);
    console.log(`✅ Загружено ${vetaisData.rows.length} клиентов\n`);

    // Статистика по клиникам
    const clinicStats = new Map<number, number>();
    vetaisData.rows.forEach(row => {
      const clinicId = row.id_kliniky || 0;
      clinicStats.set(clinicId, (clinicStats.get(clinicId) || 0) + 1);
    });

    console.log('Распределение по клиникам в Vetais:');
    clinicStats.forEach((count, clinicId) => {
      console.log(`  Clinic ID ${clinicId}: ${count} клиентов`);
    });
    console.log();

    // Загрузить маппинг филиалов
    const branchesResult = await vetsystemDb.query(`
      SELECT id, name, vetais_clinic_id 
      FROM branches 
      WHERE tenant_id = $1
    `, [tenantId]);

    const clinicToBranch = new Map<number, string>();
    branchesResult.rows.forEach(row => {
      if (row.vetais_clinic_id) {
        clinicToBranch.set(row.vetais_clinic_id, row.id);
      }
    });

    console.log('Маппинг филиалов:');
    clinicToBranch.forEach((branchId, clinicId) => {
      const branch = branchesResult.rows.find(b => b.id === branchId);
      console.log(`  Vetais ${clinicId} → ${branch?.name} (${branchId})`);
    });
    console.log();

    // Вставить данные во временную таблицу
    console.log('📥 Загрузка маппинга во временную таблицу...');
    const values = vetaisData.rows.map(row => {
      const clinicId = row.id_kliniky || 0;
      const branchId = clinicToBranch.get(clinicId) || null;
      return `('${row.kod_kado}', ${clinicId}, ${branchId ? `'${branchId}'` : 'NULL'})`;
    }).join(',');

    await vetsystemDb.query(`
      INSERT INTO vetais_clinic_mapping (vetais_id, clinic_id, branch_id)
      VALUES ${values}
    `);
    console.log('✅ Данные загружены\n');

    // Обновить owners одним запросом
    console.log('🔄 Обновление branch_id...');
    const updateResult = await vetsystemDb.query(`
      UPDATE owners o
      SET branch_id = m.branch_id
      FROM vetais_clinic_mapping m
      WHERE o.tenant_id = $1 
        AND o.vetais_id = m.vetais_id
        AND (o.branch_id IS DISTINCT FROM m.branch_id)
    `, [tenantId]);

    console.log(`✅ Обновлено ${updateResult.rowCount} клиентов\n`);

    // Статистика
    console.log('📊 Итоговая статистика по филиалам:');
    const statsResult = await vetsystemDb.query(`
      SELECT 
        COALESCE(b.name, 'Без филиала') as branch_name,
        COUNT(o.id) as client_count
      FROM owners o
      LEFT JOIN branches b ON o.branch_id = b.id
      WHERE o.tenant_id = $1
      GROUP BY b.id, b.name
      ORDER BY client_count DESC
    `, [tenantId]);

    statsResult.rows.forEach(row => {
      console.log(`  ${row.branch_name}: ${row.client_count} клиентов`);
    });

    console.log('\n✅ Готово!');

  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await vetsystemDb.end();
    await vetaisDb.end();
  }
}

main();
