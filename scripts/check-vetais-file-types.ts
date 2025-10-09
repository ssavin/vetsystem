#!/usr/bin/env tsx

import postgres from 'postgres';

async function checkFileTypes() {
  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  try {
    // Проверить категории
    const categories = await vetaisClient`
      SELECT id, category_name
      FROM medical_media_categories
      ORDER BY id
    `;
    
    console.log('📂 Категории файлов Vetais:\n');
    for (const cat of categories) {
      console.log(`  ID ${cat.id}: ${cat.category_name}`);
    }

    // Связь файлов с категориями
    const filesByCategory = await vetaisClient`
      SELECT 
        mmd.file_type,
        mmd.id_category,
        mmc.category_name,
        COUNT(*) as count
      FROM medical_media_data mmd
      LEFT JOIN medical_media_categories mmc ON mmd.id_category = mmc.id
      WHERE mmd.deleted = 0
      GROUP BY mmd.file_type, mmd.id_category, mmc.category_name
      ORDER BY mmd.file_type, mmd.id_category
    `;
    
    console.log('\n📊 Файлы по типам и категориям:\n');
    for (const row of filesByCategory) {
      console.log(`  Type ${row.file_type}, Category ${row.id_category} (${row.category_name || 'NULL'}): ${row.count} файлов`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await vetaisClient.end();
  }
}

checkFileTypes();
