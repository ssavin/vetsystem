#!/usr/bin/env tsx

import postgres from 'postgres';

async function checkDocuments() {
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
      WHERE table_name = 'medical_documents'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Структура medical_documents:\n');
    for (const col of columns) {
      console.log(`  ${col.column_name.padEnd(25)} | ${col.data_type}`);
    }

    // Типы документов
    const types = await vetaisClient`
      SELECT DISTINCT doc_type_id, COUNT(*) as count
      FROM medical_documents
      GROUP BY doc_type_id
      ORDER BY count DESC
      LIMIT 10
    `;
    
    console.log('\n📊 Типы документов:');
    for (const t of types) {
      console.log(`  Type ${t.doc_type_id}: ${t.count} документов`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await vetaisClient.end();
  }
}

checkDocuments();
