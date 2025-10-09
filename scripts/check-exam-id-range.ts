#!/usr/bin/env tsx

import postgres from 'postgres';

async function check() {
  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  const result = await vetaisClient`
    SELECT MIN(id) as min_id, MAX(id) as max_id, COUNT(*) as total
    FROM medical_exams
  `;

  console.log('📊 Vetais medical_exams ID range:', result[0]);

  const samples = await vetaisClient`
    SELECT id, id_doctor
    FROM medical_exams
    WHERE id IN (2, 3, 5, 8, 15)
  `;

  console.log('\n🔍 Samples for IDs 2,3,5,8,15:');
  for (const s of samples) {
    console.log(`  ID ${s.id}: doctor_id = ${s.id_doctor}`);
  }

  await vetaisClient.end();
}

check();
