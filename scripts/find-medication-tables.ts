#!/usr/bin/env tsx

import postgres from 'postgres';

async function findTables() {
  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  try {
    const tables = await vetaisClient`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (table_name LIKE '%plan%' OR table_name LIKE '%medic%' OR table_name LIKE '%drug%' OR table_name LIKE '%prescr%')
      ORDER BY table_name
    `;
    
    console.log('📋 Таблицы с plan/medic/drug/prescr:\n');
    for (const t of tables) {
      const count = await vetaisClient`
        SELECT COUNT(*) as count FROM ${vetaisClient(t.table_name)}
      `;
      console.log(`  ${t.table_name.padEnd(30)} - ${count[0].count} записей`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await vetaisClient.end();
  }
}

findTables();
