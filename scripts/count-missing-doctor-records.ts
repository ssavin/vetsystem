#!/usr/bin/env tsx

import postgres from 'postgres';

async function countMissingDoctorRecords() {
  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  try {
    // Подсчитать записи у отсутствующих докторов
    const result = await vetaisClient`
      SELECT 
        id_doctor,
        COUNT(*) as record_count
      FROM medical_exams
      WHERE id_doctor NOT IN (0, 10018, 10034, 10035, 10043, 10053, 10055, 10069, 10072, 10099, 10110, 10117, 10119, 99999, 100005, 100018, 100019, 10021, 10046, 10105)
        AND id_doctor IS NOT NULL
      GROUP BY id_doctor
      ORDER BY record_count DESC
      LIMIT 20
    `;
    
    console.log('📊 ТОП-20 отсутствующих докторов по количеству записей:\n');
    console.log('ID Доктора | Записей');
    console.log('-----------|--------');
    
    let total = 0;
    for (const row of result) {
      console.log(`${row.id_doctor.toString().padEnd(10)} | ${row.record_count}`);
      total += parseInt(row.record_count);
    }
    
    console.log(`\n📈 Итого записей у ТОП-20: ${total}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await vetaisClient.end();
  }
}

countMissingDoctorRecords();
