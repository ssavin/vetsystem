#!/usr/bin/env tsx

import postgres from 'postgres';
import { neon } from '@neondatabase/serverless';

async function checkMedications() {
  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  const vetsystemSql = neon(process.env.DATABASE_URL!);

  try {
    // Проверить VetSystem
    const vetsystemCount = await vetsystemSql`
      SELECT COUNT(*) as count FROM medications
    `;
    console.log(`📊 VetSystem medications: ${vetsystemCount[0].count}\n`);

    // Проверить структуру Vetais
    const columns = await vetaisClient`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'medical_plan_item'
      ORDER BY ordinal_position
      LIMIT 20
    `;
    
    console.log('📋 Vetais medical_plan_item структура:\n');
    console.log('Поле                 | Тип');
    console.log('---------------------|----------');
    for (const col of columns) {
      console.log(`${col.column_name.padEnd(20)} | ${col.data_type}`);
    }

    // Примеры данных
    const samples = await vetaisClient`
      SELECT *
      FROM medical_plan_item
      LIMIT 3
    `;
    
    console.log('\n📝 Примеры данных:');
    for (const s of samples) {
      console.log(JSON.stringify(s, null, 2));
    }

    // Всего записей
    const total = await vetaisClient`
      SELECT COUNT(*) as count FROM medical_plan_item
    `;
    console.log(`\n📊 Всего записей в Vetais: ${total[0].count}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await vetaisClient.end();
  }
}

checkMedications();
