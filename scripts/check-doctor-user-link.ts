#!/usr/bin/env tsx

import postgres from 'postgres';

async function checkDoctorLink() {
  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  try {
    // Проверить, есть ли соответствие id_doctor = kod_uzivatele
    const missingIds = [10022, 13, 12, 11, 10001, 10062, 10058];
    
    const users = await vetaisClient`
      SELECT kod_uzivatele, jmeno, prijmeni, otcestvo, funkce, is_doctor, is_active
      FROM system_users
      WHERE kod_uzivatele = ANY(${missingIds})
      ORDER BY kod_uzivatele
    `;
    
    console.log('📋 Пользователи с kod_uzivatele = id_doctor:\n');
    console.log('Kod  | ФИО                              | Funkce | Doctor | Active');
    console.log('-----|----------------------------------|--------|--------|-------');
    
    for (const user of users) {
      const fio = `${user.prijmeni || ''} ${user.jmeno || ''} ${user.otcestvo || ''}`.trim();
      console.log(`${user.kod_uzivatele.toString().padEnd(4)} | ${fio.padEnd(32)} | ${user.funkce}      | ${user.is_doctor}      | ${user.is_active}`);
    }
    
    console.log(`\n✅ Найдено ${users.length} из ${missingIds.length}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await vetaisClient.end();
  }
}

checkDoctorLink();
