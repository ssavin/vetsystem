#!/usr/bin/env tsx

import postgres from 'postgres';

async function checkFileStorage() {
  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  try {
    // Проверить все поля типа bytea
    const bytesColumns = await vetaisClient`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'medical_media_data' AND data_type = 'bytea'
    `;
    
    console.log('📋 Поля типа bytea в medical_media_data:');
    for (const col of bytesColumns) {
      console.log(`  - ${col.column_name}`);
    }

    // Проверить thumbnail
    const withThumbnail = await vetaisClient`
      SELECT COUNT(*) as count
      FROM medical_media_data
      WHERE thumbnail IS NOT NULL AND deleted = 0
    `;
    
    console.log(`\n📊 Файлов с thumbnail: ${withThumbnail[0].count} из 28,445`);

    // Проверить другие таблицы с файлами
    const allTables = await vetaisClient`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND (data_type = 'bytea' OR column_name LIKE '%file%' OR column_name LIKE '%data%')
        AND table_name LIKE 'medical%'
      ORDER BY table_name, column_name
      LIMIT 30
    `;
    
    console.log('\n📂 Таблицы с потенциальными файлами:');
    let currentTable = '';
    for (const row of allTables) {
      if (row.table_name !== currentTable) {
        currentTable = row.table_name;
        console.log(`\n${row.table_name}:`);
      }
      console.log(`  - ${row.column_name} (${row.data_type})`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await vetaisClient.end();
  }
}

checkFileStorage();
