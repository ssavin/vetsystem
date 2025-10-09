#!/usr/bin/env tsx

import postgres from 'postgres';

async function checkMissingDoctors() {
  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  try {
    // Проверить, есть ли эти доктора в system_users
    const missingIds = [10022, 13, 12, 11, 10001, 10062, 10058, 15, 10019, 10031];
    
    const users = await vetaisClient`
      SELECT id_pracovnika, jmeno, aktivni, funkce
      FROM system_users
      WHERE id_pracovnika = ANY(${missingIds})
      ORDER BY id_pracovnika
    `;
    
    console.log('📋 Отсутствующие доктора в Vetais system_users:\n');
    console.log('ID       | Имя                        | Активен | Funkce');
    console.log('---------|----------------------------|---------|-------');
    
    for (const user of users) {
      console.log(`${user.id_pracovnika.toString().padEnd(8)} | ${user.jmeno.padEnd(26)} | ${user.aktivni ? 'Да' : 'Нет'.padEnd(7)} | ${user.funkce}`);
    }
    
    console.log(`\n✅ Найдено ${users.length} из ${missingIds.length}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await vetaisClient.end();
  }
}

checkMissingDoctors();
