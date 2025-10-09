#!/usr/bin/env tsx

import postgres from 'postgres';

async function checkMediaData() {
  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  try {
    // Примеры файлов
    const samples = await vetaisClient`
      SELECT id, id_exam, id_patient, file_path, file_orig, file_type, deleted
      FROM medical_media_data
      WHERE deleted = 0
      LIMIT 5
    `;
    
    console.log('📝 Примеры файлов:\n');
    for (const s of samples) {
      console.log(`ID: ${s.id}, exam: ${s.id_exam}, patient: ${s.id_patient}, deleted: ${s.deleted}`);
      console.log(`   path: ${s.file_path}`);
      console.log(`   orig: ${s.file_orig}, type: ${s.file_type}\n`);
    }

    // Статистика
    const stats = await vetaisClient`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN deleted = 0 THEN 1 END) as active,
        COUNT(CASE WHEN deleted = 1 THEN 1 END) as deleted
      FROM medical_media_data
    `;
    
    console.log('📊 Статистика:');
    console.log(`  Всего: ${stats[0].total}`);
    console.log(`  Активных: ${stats[0].active}`);
    console.log(`  Удалённых: ${stats[0].deleted}`);

    // Типы файлов
    const types = await vetaisClient`
      SELECT file_type, COUNT(*) as count
      FROM medical_media_data
      WHERE deleted = 0
      GROUP BY file_type
      ORDER BY count DESC
    `;
    
    console.log('\n📂 Типы файлов:');
    for (const t of types) {
      console.log(`  Type ${t.file_type}: ${t.count} файлов`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await vetaisClient.end();
  }
}

checkMediaData();
