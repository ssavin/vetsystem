#!/usr/bin/env tsx

import postgres from 'postgres';

async function checkStructure() {
  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  try {
    // Получить структуру таблицы
    const columns = await vetaisClient`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'system_users'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Структура таблицы system_users:\n');
    console.log('Поле             | Тип');
    console.log('-----------------|----------');
    
    for (const col of columns) {
      console.log(`${col.column_name.padEnd(16)} | ${col.data_type}`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await vetaisClient.end();
  }
}

checkStructure();
