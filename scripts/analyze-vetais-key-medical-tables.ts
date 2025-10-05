#!/usr/bin/env tsx

/**
 * Целенаправленный анализ ключевых медицинских таблиц Vetais
 */

import { Client } from 'pg';

// Ключевые таблицы для миграции
const KEY_TABLES = [
  'medical_exams',           // Основные медицинские осмотры
  'medical_diagnoses',       // Диагнозы
  'medical_diagnosis',       // Справочник диагнозов
  'medical_plan_item',       // Планы лечения/назначения
  'medical_patient_symptoms', // Симптомы
  'medical_patient_conclusion', // Заключения
  'medical_medication',      // Лекарства
  'medical_media_data',      // Медиа файлы (рентген, УЗИ)
  'medical_lab_evaluations', // Лабораторные исследования
  'medical_hospitalization', // Госпитализация
  'file_patients'            // Пациенты (для связи)
];

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   АНАЛИЗ КЛЮЧЕВЫХ МЕДИЦИНСКИХ ТАБЛИЦ VETAIS                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const vetaisDb = new Client({
    host: process.env.VETAIS_DB_HOST,
    port: parseInt(process.env.VETAIS_DB_PORT || '5432'),
    database: process.env.VETAIS_DB_NAME,
    user: process.env.VETAIS_DB_USER,
    password: process.env.VETAIS_DB_PASSWORD,
  });

  try {
    await vetaisDb.connect();
    console.log('✅ Подключение успешно!\n');

    for (const tableName of KEY_TABLES) {
      console.log(`\n${'═'.repeat(100)}`);
      console.log(`📋 Таблица: ${tableName}`);
      console.log('═'.repeat(100));

      // Проверить существование таблицы
      const tableExistsResult = await vetaisDb.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName]);

      if (!tableExistsResult.rows[0].exists) {
        console.log(`⚠️  Таблица ${tableName} не найдена\n`);
        continue;
      }

      // Структура таблицы
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
      `, [tableName]);

      console.log(`\n📝 Структура (${columnsResult.rows.length} колонок):\n`);
      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '' : 'NOT NULL';
        const type = col.character_maximum_length 
          ? `${col.data_type}(${col.character_maximum_length})`
          : col.data_type;
        const defaultVal = col.column_default ? ` = ${col.column_default}` : '';
        console.log(`  ${col.column_name}: ${type} ${nullable}${defaultVal}`);
      });

      // Количество записей
      const countResult = await vetaisDb.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const totalCount = parseInt(countResult.rows[0].count);
      console.log(`\n📊 Всего записей: ${totalCount.toLocaleString()}`);

      // Примеры данных (только если есть записи)
      if (totalCount > 0) {
        const sampleResult = await vetaisDb.query(`
          SELECT * FROM ${tableName} LIMIT 2
        `);
        
        console.log(`\n🔍 Примеры данных (первые 2 записи):\n`);
        sampleResult.rows.forEach((row, i) => {
          console.log(`Запись ${i + 1}:`);
          Object.entries(row).forEach(([key, value]) => {
            let displayValue;
            if (value === null) {
              displayValue = 'NULL';
            } else if (typeof value === 'string' && value.length > 80) {
              displayValue = value.substring(0, 80) + '...';
            } else if (value instanceof Date) {
              displayValue = value.toISOString();
            } else {
              displayValue = value;
            }
            console.log(`  ${key}: ${displayValue}`);
          });
          console.log('');
        });
      }

      // Связи с пациентами (если есть поле patient_id или kod_zvirete)
      const patientLinkResult = await vetaisDb.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1
          AND (column_name LIKE '%patient%' OR column_name = 'kod_zvirete')
      `, [tableName]);

      if (patientLinkResult.rows.length > 0) {
        console.log(`\n🔗 Связь с пациентами через: ${patientLinkResult.rows.map(r => r.column_name).join(', ')}`);
      }
    }

    console.log(`\n\n${'═'.repeat(100)}`);
    console.log('✅ Анализ завершён!');
    console.log('═'.repeat(100));

  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await vetaisDb.end();
  }
}

main();
