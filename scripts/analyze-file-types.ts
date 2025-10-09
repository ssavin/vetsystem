#!/usr/bin/env tsx

import postgres from 'postgres';

async function analyzeFileTypes() {
  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  try {
    // Распределение по file_type и категории
    const distribution = await vetaisClient`
      SELECT 
        mmd.file_type,
        mmd.id_category,
        mmc.name as category_name,
        COUNT(*) as count
      FROM medical_media_data mmd
      LEFT JOIN medical_media_categories mmc ON mmd.id_category = mmc.id
      WHERE mmd.deleted = 0
      GROUP BY mmd.file_type, mmd.id_category, mmc.name
      ORDER BY mmd.file_type, mmd.id_category
    `;
    
    console.log('📊 Распределение файлов:\n');
    console.log('Type | Category | Name                    | Count');
    console.log('-----|----------|-------------------------|-------');
    for (const row of distribution) {
      const catName = (row.category_name || 'NULL').padEnd(24);
      const cat = String(row.id_category || 'NULL').padEnd(8);
      console.log(`${row.file_type}    | ${cat} | ${catName}| ${row.count}`);
    }

    // Примеры файлов по типам
    console.log('\n📝 Примеры файлов:\n');
    for (const type of [0, 1, 2]) {
      const samples = await vetaisClient`
        SELECT mmd.id, mmd.file_type, mmd.id_category, mmd.file_path, mmd.file_orig, mmc.name as cat_name
        FROM medical_media_data mmd
        LEFT JOIN medical_media_categories mmc ON mmd.id_category = mmc.id
        WHERE mmd.file_type = ${type} AND mmd.deleted = 0
        LIMIT 2
      `;
      
      console.log(`Type ${type}:`);
      for (const s of samples) {
        console.log(`  ${s.file_orig} (cat: ${s.cat_name || 'NULL'})`);
      }
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await vetaisClient.end();
  }
}

analyzeFileTypes();
