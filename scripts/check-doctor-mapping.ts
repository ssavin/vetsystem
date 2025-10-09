#!/usr/bin/env tsx

import postgres from 'postgres';

async function checkDoctorMapping() {
  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  try {
    // 1. Проверить примеры exam с id_doctor
    console.log('🔍 Примеры exam с id_doctor из Vetais:\n');
    const exams = await vetaisClient`
      SELECT id, id_doctor, date_created
      FROM medical_exams
      WHERE id_doctor IS NOT NULL
      LIMIT 10
    `;
    
    console.log('Exam ID | Doctor ID | Date');
    console.log('--------|-----------|-----');
    for (const exam of exams) {
      console.log(`${exam.id} | ${exam.id_doctor} | ${exam.date_created}`);
    }

    // 2. Проверить уникальные id_doctor
    console.log('\n📊 Уникальные id_doctor в medical_exams:\n');
    const uniqueDoctors = await vetaisClient`
      SELECT DISTINCT id_doctor
      FROM medical_exams
      WHERE id_doctor IS NOT NULL
      ORDER BY id_doctor
      LIMIT 20
    `;
    
    console.log('Уникальные id_doctor:', uniqueDoctors.map(d => d.id_doctor).join(', '));

    // 3. Проверить system_users
    console.log('\n👨‍⚕️ Примеры из system_users:\n');
    const users = await vetaisClient`
      SELECT id_uzivatel, id_pracovnika, jmeno
      FROM system_users
      WHERE funkce = 2
      LIMIT 10
    `;
    
    console.log('ID User | ID Pracovnika | Jmeno');
    console.log('--------|---------------|------');
    for (const user of users) {
      console.log(`${user.id_uzivatel} | ${user.id_pracovnika} | ${user.jmeno}`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await vetaisClient.end();
  }
}

checkDoctorMapping();
