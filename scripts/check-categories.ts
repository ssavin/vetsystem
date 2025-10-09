#!/usr/bin/env tsx

import postgres from 'postgres';

async function checkCategories() {
  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  try {
    // Структура
    const columns = await vetaisClient`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'medical_media_categories'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Структура medical_media_categories:\n');
    for (const col of columns) {
      console.log(`  ${col.column_name.padEnd(25)} | ${col.data_type}`);
    }

    // Все записи
    const all = await vetaisClient`
      SELECT * FROM medical_media_categories
    `;
    
    console.log('\n📂 Все категории:');
    for (const cat of all) {
      console.log(JSON.stringify(cat));
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await vetaisClient.end();
  }
}

checkCategories();
