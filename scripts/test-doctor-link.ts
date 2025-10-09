#!/usr/bin/env tsx

import postgres from 'postgres';

async function test() {
  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  // Найти exam с ненулевым doctor_id
  const withDoctor = await vetaisClient`
    SELECT id, id_doctor
    FROM medical_exams
    WHERE id_doctor IS NOT NULL AND id_doctor != 0
    LIMIT 10
  `;

  console.log('📋 Примеры exam с id_doctor:');
  for (const e of withDoctor) {
    console.log(`  Exam ID: ${e.id}, Doctor ID: ${e.id_doctor}`);
  }

  await vetaisClient.end();
}

test();
