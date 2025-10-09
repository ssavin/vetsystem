#!/usr/bin/env tsx

import postgres from 'postgres';

async function checkDocData() {
  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  try {
    // Найти записи с doc_data
    const withData = await vetaisClient`
      SELECT id, exam_id, doc_data
      FROM medical_plan_header
      WHERE doc_data IS NOT NULL AND doc_data != ''
      LIMIT 5
    `;
    
    console.log('📋 Примеры medical_plan_header с doc_data:\n');
    for (const row of withData) {
      console.log(`ID: ${row.id}, exam_id: ${row.exam_id}`);
      console.log(`doc_data: ${row.doc_data.substring(0, 200)}...\n`);
    }

    // Подсчитать записи с doc_data
    const count = await vetaisClient`
      SELECT COUNT(*) as count
      FROM medical_plan_header
      WHERE doc_data IS NOT NULL AND doc_data != ''
    `;
    
    console.log(`📊 Записей с doc_data: ${count[0].count} из 206,882`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await vetaisClient.end();
  }
}

checkDocData();
