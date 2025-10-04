#!/usr/bin/env tsx

/**
 * Анализ филиалов/клиник в базе Vetais
 */

import { Client } from 'pg';

async function main() {
  const vetaisDb = new Client({
    host: process.env.VETAIS_DB_HOST,
    port: parseInt(process.env.VETAIS_DB_PORT || '5432'),
    database: process.env.VETAIS_DB_NAME,
    user: process.env.VETAIS_DB_USER,
    password: process.env.VETAIS_DB_PASSWORD,
  });

  try {
    await vetaisDb.connect();
    console.log('✅ Подключение к Vetais успешно\n');

    // Анализ уникальных комбинаций clinic_id/department_id
    console.log('📊 АНАЛИЗ ФИЛИАЛОВ В VETAIS\n');
    console.log('═'.repeat(100));

    const branchAnalysis = await vetaisDb.query(`
      SELECT 
        clinic_id,
        department_id,
        created_clinic_id,
        created_department_id,
        created_clinic_name,
        created_department_name,
        COUNT(*) as client_count
      FROM file_clients
      WHERE vymaz = 0
      GROUP BY 
        clinic_id, 
        department_id, 
        created_clinic_id, 
        created_department_id,
        created_clinic_name,
        created_department_name
      ORDER BY client_count DESC
    `);

    console.log(`\n📋 Найдено уникальных комбинаций филиалов: ${branchAnalysis.rows.length}\n`);

    console.log('ТОП-20 филиалов по количеству клиентов:');
    console.log('-'.repeat(100));
    
    branchAnalysis.rows.slice(0, 20).forEach((row, index) => {
      console.log(`\n${index + 1}. Клиника: "${row.created_clinic_name || 'N/A'}" (ID: ${row.created_clinic_id || 'N/A'})`);
      console.log(`   Филиал: "${row.created_department_name || 'N/A'}" (ID: ${row.created_department_id || 'N/A'})`);
      console.log(`   clinic_id: ${row.clinic_id || 'N/A'}, department_id: ${row.department_id || 'N/A'}`);
      console.log(`   👥 Клиентов: ${row.client_count}`);
    });

    // Статистика по заполненности
    console.log('\n\n📊 СТАТИСТИКА ЗАПОЛНЕННОСТИ ПОЛЕЙ:');
    console.log('-'.repeat(100));

    const fillStats = await vetaisDb.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(clinic_id) as has_clinic_id,
        COUNT(department_id) as has_department_id,
        COUNT(created_clinic_id) as has_created_clinic_id,
        COUNT(created_department_id) as has_created_department_id,
        COUNT(created_clinic_name) as has_created_clinic_name,
        COUNT(created_department_name) as has_created_department_name
      FROM file_clients
      WHERE vymaz = 0
    `);

    const stats = fillStats.rows[0];
    console.log(`Всего клиентов: ${stats.total}`);
    console.log(`clinic_id:              ${stats.has_clinic_id} (${(stats.has_clinic_id / stats.total * 100).toFixed(1)}%)`);
    console.log(`department_id:          ${stats.has_department_id} (${(stats.has_department_id / stats.total * 100).toFixed(1)}%)`);
    console.log(`created_clinic_id:      ${stats.has_created_clinic_id} (${(stats.has_created_clinic_id / stats.total * 100).toFixed(1)}%)`);
    console.log(`created_department_id:  ${stats.has_created_department_id} (${(stats.has_created_department_id / stats.total * 100).toFixed(1)}%)`);
    console.log(`created_clinic_name:    ${stats.has_created_clinic_name} (${(stats.has_created_clinic_name / stats.total * 100).toFixed(1)}%)`);
    console.log(`created_department_name: ${stats.has_created_department_name} (${(stats.has_created_department_name / stats.total * 100).toFixed(1)}%)`);

    // Проверка наличия справочных таблиц для клиник/филиалов
    console.log('\n\n🔍 ПОИСК СПРАВОЧНЫХ ТАБЛИЦ:');
    console.log('-'.repeat(100));

    const refTables = await vetaisDb.query(`
      SELECT tablename 
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public' 
        AND (tablename LIKE '%clinic%' OR tablename LIKE '%department%' OR tablename LIKE '%branch%')
      ORDER BY tablename
    `);

    if (refTables.rows.length > 0) {
      console.log('\nНайденные таблицы:');
      refTables.rows.forEach(table => {
        console.log(`  - ${table.tablename}`);
      });

      // Попробуем получить данные из справочников
      for (const table of refTables.rows) {
        try {
          const tableData = await vetaisDb.query(`SELECT * FROM ${table.tablename} LIMIT 5`);
          if (tableData.rows.length > 0) {
            console.log(`\n📋 Примеры из ${table.tablename}:`);
            tableData.rows.forEach((row, idx) => {
              console.log(`  ${idx + 1}.`, JSON.stringify(row, null, 2));
            });
          }
        } catch (err) {
          console.log(`  ⚠️  Не удалось прочитать ${table.tablename}`);
        }
      }
    } else {
      console.log('Справочные таблицы не найдены');
    }

    console.log('\n' + '═'.repeat(100));
    console.log('✅ Анализ завершен!\n');

  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  } finally {
    await vetaisDb.end();
  }
}

main().catch(console.error);
