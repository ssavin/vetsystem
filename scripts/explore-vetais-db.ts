#!/usr/bin/env tsx

/**
 * Скрипт для исследования структуры базы данных Vetais
 * Помогает понять какие таблицы и поля есть перед миграцией
 */

import { Client } from 'pg';

async function exploreTables() {
  const client = new Client({
    host: process.env.VETAIS_DB_HOST,
    port: parseInt(process.env.VETAIS_DB_PORT || '5432'),
    database: process.env.VETAIS_DB_NAME,
    user: process.env.VETAIS_DB_USER,
    password: process.env.VETAIS_DB_PASSWORD,
  });

  try {
    console.log('🔌 Подключение к базе Vetais...');
    console.log(`   Хост: ${process.env.VETAIS_DB_HOST}:${process.env.VETAIS_DB_PORT}`);
    console.log(`   База: ${process.env.VETAIS_DB_NAME}\n`);
    
    await client.connect();
    console.log('✅ Подключение успешно!\n');

    // Получить список всех таблиц
    console.log('📋 СПИСОК ТАБЛИЦ В БАЗЕ VETAIS:');
    console.log('=' .repeat(80));
    
    const tablesResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        tableowner
      FROM pg_catalog.pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY tablename;
    `);

    if (tablesResult.rows.length === 0) {
      console.log('Таблицы не найдены');
      return;
    }

    tablesResult.rows.forEach((table, index) => {
      console.log(`${index + 1}. ${table.tablename} (схема: ${table.schemaname})`);
    });

    // Найти таблицы, которые могут содержать клиентов
    console.log('\n🔍 ВОЗМОЖНЫЕ ТАБЛИЦЫ КЛИЕНТОВ:');
    console.log('=' .repeat(80));
    
    const clientTableKeywords = ['client', 'customer', 'owner', 'patient_owner', 'владелец', 'клиент'];
    const possibleClientTables = tablesResult.rows.filter(table => 
      clientTableKeywords.some(keyword => 
        table.tablename.toLowerCase().includes(keyword)
      )
    );

    if (possibleClientTables.length > 0) {
      possibleClientTables.forEach((table, index) => {
        console.log(`${index + 1}. ${table.tablename}`);
      });
    } else {
      console.log('Не найдено таблиц с типичными названиями для клиентов');
      console.log('Проверьте полный список таблиц выше');
    }

    // Показать структуру каждой возможной таблицы клиентов
    if (possibleClientTables.length > 0) {
      console.log('\n📊 СТРУКТУРА ТАБЛИЦ КЛИЕНТОВ:');
      console.log('=' .repeat(80));

      for (const table of possibleClientTables) {
        console.log(`\n▶ Таблица: ${table.tablename}`);
        console.log('-'.repeat(80));

        const columnsResult = await client.query(`
          SELECT 
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position;
        `, [table.tablename]);

        if (columnsResult.rows.length > 0) {
          console.log('\nПоля:');
          columnsResult.rows.forEach(col => {
            const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
            const defaultVal = col.column_default ? `DEFAULT ${col.column_default}` : '';
            console.log(`  • ${col.column_name.padEnd(30)} ${col.data_type}${length.padEnd(10)} ${nullable.padEnd(10)} ${defaultVal}`);
          });

          // Показать примеры данных
          console.log('\nПримеры данных (первые 3 записи):');
          try {
            const sampleResult = await client.query(`SELECT * FROM ${table.tablename} LIMIT 3`);
            if (sampleResult.rows.length > 0) {
              sampleResult.rows.forEach((row, index) => {
                console.log(`\n  Запись ${index + 1}:`);
                Object.entries(row).forEach(([key, value]) => {
                  const displayValue = value === null ? 'NULL' : 
                                     typeof value === 'string' && value.length > 50 ? 
                                     value.substring(0, 47) + '...' : value;
                  console.log(`    ${key.padEnd(30)} = ${displayValue}`);
                });
              });
            } else {
              console.log('  Таблица пустая');
            }
          } catch (err: any) {
            console.log(`  ⚠️  Не удалось получить примеры данных: ${err.message}`);
          }
        }
      }

      // Подсчет записей
      console.log('\n📈 КОЛИЧЕСТВО ЗАПИСЕЙ:');
      console.log('=' .repeat(80));
      for (const table of possibleClientTables) {
        try {
          const countResult = await client.query(`SELECT COUNT(*) FROM ${table.tablename}`);
          console.log(`${table.tablename.padEnd(40)} ${countResult.rows[0].count} записей`);
        } catch (err: any) {
          console.log(`${table.tablename.padEnd(40)} ⚠️ Ошибка подсчета`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Исследование завершено!');
    console.log('\nРекомендации для миграции:');
    console.log('1. Найдите таблицу с клиентами в списке выше');
    console.log('2. Обратите внимание на названия полей для: имя, телефон, email, адрес');
    console.log('3. Запомните название таблицы - оно понадобится для миграции');
    console.log('4. Запустите: tsx scripts/migrate-vetais-clients.ts');

  } catch (error: any) {
    console.error('\n❌ Ошибка:', error.message);
    console.error('\nПроверьте:');
    console.error('1. Доступен ли сервер базы данных');
    console.error('2. Правильно ли указаны хост и порт');
    console.error('3. Корректны ли учетные данные');
    console.error('4. Разрешен ли удаленный доступ к базе данных');
  } finally {
    await client.end();
  }
}

exploreTables();
