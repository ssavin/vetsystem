#!/usr/bin/env tsx

import { Client } from 'pg';

const tableName = process.argv[2] || 'file_clients';

async function inspectTable() {
  const client = new Client({
    host: process.env.VETAIS_DB_HOST,
    port: parseInt(process.env.VETAIS_DB_PORT || '5432'),
    database: process.env.VETAIS_DB_NAME,
    user: process.env.VETAIS_DB_USER,
    password: process.env.VETAIS_DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log(`\n📊 ДЕТАЛЬНАЯ ИНФОРМАЦИЯ О ТАБЛИЦЕ: ${tableName}`);
    console.log('='.repeat(100));

    // Структура таблицы
    console.log('\n🔧 СТРУКТУРА:');
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
    `, [tableName]);

    columnsResult.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '✓ NULL' : '✗ NOT NULL';
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      const defaultVal = col.column_default ? `DEFAULT ${col.column_default}` : '';
      console.log(`  ${col.column_name.padEnd(35)} ${(col.data_type + length).padEnd(25)} ${nullable.padEnd(12)} ${defaultVal}`);
    });

    // Примеры данных
    console.log('\n📝 ПРИМЕРЫ ДАННЫХ (первые 5 записей):');
    console.log('-'.repeat(100));
    const sampleResult = await client.query(`SELECT * FROM ${tableName} LIMIT 5`);
    
    if (sampleResult.rows.length > 0) {
      sampleResult.rows.forEach((row, index) => {
        console.log(`\n📌 Запись ${index + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
          let displayValue = value === null ? '⚠️ NULL' : value;
          if (typeof displayValue === 'string' && displayValue.length > 80) {
            displayValue = displayValue.substring(0, 77) + '...';
          }
          console.log(`  ${key.padEnd(35)} ${displayValue}`);
        });
      });

      // Анализ заполненности полей
      console.log('\n\n📊 АНАЛИЗ ЗАПОЛНЕННОСТИ ПОЛЕЙ:');
      console.log('-'.repeat(100));
      
      for (const col of columnsResult.rows) {
        const countResult = await client.query(
          `SELECT 
            COUNT(*) as total,
            COUNT(${col.column_name}) as filled,
            COUNT(*) - COUNT(${col.column_name}) as nulls
           FROM ${tableName}`
        );
        
        const { total, filled, nulls } = countResult.rows[0];
        const fillPercent = ((filled / total) * 100).toFixed(1);
        const bar = '█'.repeat(Math.floor(fillPercent / 5)) + '░'.repeat(20 - Math.floor(fillPercent / 5));
        
        console.log(`  ${col.column_name.padEnd(35)} ${bar} ${fillPercent}% (${filled}/${total})`);
      }

    } else {
      console.log('  Таблица пустая');
    }

    // Общая статистика
    console.log('\n\n📈 ОБЩАЯ СТАТИСТИКА:');
    console.log('-'.repeat(100));
    const countResult = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
    console.log(`  Всего записей: ${countResult.rows[0].count}`);

  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await client.end();
  }
}

inspectTable();
