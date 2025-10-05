#!/usr/bin/env tsx

/**
 * Анализ структуры медицинских данных в базе Vetais
 * 
 * Этот скрипт изучает таблицы Vetais, связанные с медицинскими записями,
 * диагнозами, назначениями, лабораторными анализами и файлами.
 */

import { Client } from 'pg';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   АНАЛИЗ МЕДИЦИНСКИХ ДАННЫХ В VETAIS                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const vetaisDb = new Client({
    host: process.env.VETAIS_DB_HOST,
    port: parseInt(process.env.VETAIS_DB_PORT || '5432'),
    database: process.env.VETAIS_DB_NAME,
    user: process.env.VETAIS_DB_USER,
    password: process.env.VETAIS_DB_PASSWORD,
  });

  try {
    console.log('🔌 Подключение к Vetais...');
    await vetaisDb.connect();
    console.log('✅ Подключение успешно!\n');

    // 1. Найти медицинские таблицы
    console.log('📋 ШАГ 1: Поиск медицинских таблиц\n');
    console.log('═'.repeat(100));

    const medicalTablesResult = await vetaisDb.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND (
          table_name LIKE '%visit%' 
          OR table_name LIKE '%medic%' 
          OR table_name LIKE '%diagn%'
          OR table_name LIKE '%treat%'
          OR table_name LIKE '%prescr%'
          OR table_name LIKE '%lab%'
          OR table_name LIKE '%test%'
          OR table_name LIKE '%anal%'
          OR table_name LIKE '%exam%'
          OR table_name LIKE '%record%'
          OR table_name LIKE '%file%'
          OR table_name LIKE '%attach%'
          OR table_name LIKE '%image%'
        )
      ORDER BY table_name
    `);

    console.log(`\n📊 Найдено медицинских таблиц: ${medicalTablesResult.rows.length}\n`);
    
    if (medicalTablesResult.rows.length === 0) {
      console.log('⚠️  Медицинские таблицы не найдены. Проверим общий список таблиц...\n');
      
      const allTablesResult = await vetaisDb.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
        LIMIT 50
      `);
      
      console.log('Первые 50 таблиц в базе Vetais:');
      allTablesResult.rows.forEach((row, i) => {
        console.log(`${i + 1}. ${row.table_name}`);
      });
    } else {
      medicalTablesResult.rows.forEach((row, i) => {
        console.log(`${i + 1}. ${row.table_name} (${row.column_count} колонок)`);
      });

      // 2. Детальный анализ каждой таблицы
      console.log('\n\n📋 ШАГ 2: Детальный анализ структуры таблиц\n');
      console.log('═'.repeat(100));

      for (const table of medicalTablesResult.rows) {
        console.log(`\n🔍 Таблица: ${table.table_name}`);
        console.log('-'.repeat(100));

        // Получить структуру колонок
        const columnsResult = await vetaisDb.query(`
          SELECT 
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [table.table_name]);

        console.log('\nКолонки:');
        columnsResult.rows.forEach(col => {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const type = col.character_maximum_length 
            ? `${col.data_type}(${col.character_maximum_length})`
            : col.data_type;
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
          console.log(`  - ${col.column_name}: ${type} ${nullable}${defaultVal}`);
        });

        // Получить количество записей
        const countResult = await vetaisDb.query(`
          SELECT COUNT(*) as count FROM ${table.table_name}
        `);
        console.log(`\n📊 Всего записей: ${countResult.rows[0].count}`);

        // Получить примеры данных (первые 3 записи)
        if (parseInt(countResult.rows[0].count) > 0) {
          const sampleResult = await vetaisDb.query(`
            SELECT * FROM ${table.table_name} LIMIT 3
          `);
          
          console.log(`\nПримеры данных (первые 3 записи):`);
          sampleResult.rows.forEach((row, i) => {
            console.log(`\nЗапись ${i + 1}:`);
            Object.entries(row).forEach(([key, value]) => {
              const displayValue = value === null ? 'NULL' : 
                                 typeof value === 'string' && value.length > 100 ? value.substring(0, 100) + '...' :
                                 value;
              console.log(`  ${key}: ${displayValue}`);
            });
          });
        }
      }
    }

    // 3. Поиск связей между таблицами (foreign keys)
    console.log('\n\n📋 ШАГ 3: Анализ связей между таблицами\n');
    console.log('═'.repeat(100));

    const fkResult = await vetaisDb.query(`
      SELECT
        tc.table_name as from_table,
        kcu.column_name as from_column,
        ccu.table_name as to_table,
        ccu.column_name as to_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `);

    if (fkResult.rows.length > 0) {
      console.log('\nНайденные связи (Foreign Keys):');
      fkResult.rows.forEach(fk => {
        console.log(`  ${fk.from_table}.${fk.from_column} → ${fk.to_table}.${fk.to_column}`);
      });
    } else {
      console.log('⚠️  Foreign keys не найдены');
    }

    console.log('\n\n✅ Анализ завершён!');
    console.log('\n💡 Следующие шаги:');
    console.log('   1. Изучите найденные таблицы и их структуру');
    console.log('   2. Определите соответствие полей Vetais → VetSystem');
    console.log('   3. Создайте скрипт миграции медицинских данных');

  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await vetaisDb.end();
  }
}

main();
