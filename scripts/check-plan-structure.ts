#!/usr/bin/env tsx

import postgres from 'postgres';

async function checkPlanHeader() {
  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  try {
    // Структура medical_plan_header
    const columns = await vetaisClient`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'medical_plan_header'
      ORDER BY ordinal_position
      LIMIT 20
    `;
    
    console.log('📋 Структура medical_plan_header:\n');
    for (const col of columns) {
      console.log(`  ${col.column_name.padEnd(25)} | ${col.data_type}`);
    }

    // Примеры данных
    const samples = await vetaisClient`
      SELECT *
      FROM medical_plan_header
      WHERE id IN (SELECT id FROM medical_plan_header LIMIT 3)
    `;
    
    console.log('\n📝 Примеры:');
    for (const s of samples) {
      console.log(`ID: ${s.id}, exam_id: ${s.id_exam || 'N/A'}, type: ${s.plan_type_id}, name: ${s.plan_name || 'N/A'}`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await vetaisClient.end();
  }
}

checkPlanHeader();
