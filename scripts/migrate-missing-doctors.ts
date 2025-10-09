#!/usr/bin/env tsx

import postgres from 'postgres';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../shared/schema';
import { eq, and, inArray } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const TENANT_ID = 'default-tenant-001';

// Маппинг клиник → филиалов
const CLINIC_TO_BRANCH: Record<number, string> = {
  10000: 'b5b8f3e9-6c8d-4f2a-9e5b-3a1d7c4e8f2b', // Бутово
  10001: 'c6c9f4fa-7d9e-5g3b-af6c-4b2e8d5f9g3c', // Лобачевского
  10002: 'd7daf5gb-8eaf-6h4c-bg7d-5c3f9e6gah4d', // Новопеределкино
};

// Маппинг funkce → роли
const FUNKCE_TO_ROLE: Record<number, string> = {
  1: 'администратор',
  2: 'врач',
  3: 'врач', // Тоже врач (разные уровни)
  4: 'администратор',
  5: 'менеджер',
  10002: 'врач',
};

async function migrateMissingDoctors() {
  console.log('🔗 Миграция недостающих докторов из Vetais...\n');

  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  const vetsystemDb = drizzle(neon(process.env.DATABASE_URL!), { schema });

  try {
    // 1. Получить существующих пользователей
    console.log('👥 Загрузка существующих пользователей...');
    const existingUsers = await vetsystemDb
      .select({ vetaisId: schema.users.vetaisId })
      .from(schema.users)
      .where(eq(schema.users.tenantId, TENANT_ID));
    
    const existingVetaisIds = new Set(
      existingUsers
        .filter(u => u.vetaisId !== null)
        .map(u => u.vetaisId!)
    );
    
    console.log(`✅ Найдено ${existingVetaisIds.size} пользователей с vetais_id\n`);

    // 2. Получить уникальные id_doctor из medical_exams
    console.log('📊 Загрузка уникальных докторов из medical_exams...');
    const uniqueDoctors = await vetaisClient`
      SELECT DISTINCT id_doctor
      FROM medical_exams
      WHERE id_doctor IS NOT NULL AND id_doctor != 0
      ORDER BY id_doctor
    `;
    
    console.log(`✅ Найдено ${uniqueDoctors.length} уникальных докторов\n`);

    // 3. Определить отсутствующих
    const missingDoctorIds = uniqueDoctors
      .map(d => d.id_doctor)
      .filter(id => !existingVetaisIds.has(id));
    
    console.log(`❌ Отсутствует ${missingDoctorIds.length} докторов\n`);

    if (missingDoctorIds.length === 0) {
      console.log('✅ Все доктора уже мигрированы!');
      return;
    }

    // 4. Загрузить данные отсутствующих из system_users
    console.log('📋 Загрузка данных отсутствующих докторов...');
    const missingUsers = await vetaisClient`
      SELECT 
        kod_uzivatele,
        jmeno,
        prijmeni,
        otcestvo,
        funkce,
        email,
        telefon,
        mobile,
        is_doctor,
        is_active,
        id_kliniky
      FROM system_users
      WHERE kod_uzivatele = ANY(${missingDoctorIds})
    `;
    
    console.log(`✅ Загружено ${missingUsers.length} пользователей из Vetais\n`);

    // 5. Подготовить данные для вставки
    console.log('🔄 Подготовка пользователей для миграции...');
    const usersToInsert: any[] = [];
    const defaultPassword = await bcrypt.hash('Alisa2024!', 10);

    for (const user of missingUsers) {
      const fullName = `${user.prijmeni || ''} ${user.jmeno || ''} ${user.otcestvo || ''}`.trim();
      const username = `doctor_${user.kod_uzivatele}`;
      
      // Определить роль
      let role = FUNKCE_TO_ROLE[user.funkce] || 'врач';
      if (user.is_doctor === 1) {
        role = 'врач';
      }

      // Определить филиал
      const branchId = CLINIC_TO_BRANCH[user.id_kliniky] || CLINIC_TO_BRANCH[10000];

      usersToInsert.push({
        tenantId: TENANT_ID,
        username,
        password: defaultPassword,
        fullName,
        email: user.email || `${username}@vetsystem.ru`,
        phone: user.telefon || user.mobile || null,
        role,
        branchId,
        vetaisId: user.kod_uzivatele,
        department: null,
      });
    }

    console.log(`✅ Подготовлено ${usersToInsert.length} пользователей\n`);

    // 6. Вставить в базу
    console.log('💾 Вставка пользователей в базу данных...');
    
    for (const user of usersToInsert) {
      try {
        await vetsystemDb.insert(schema.users).values(user);
        console.log(`   ✅ ${user.fullName} (vetais_id: ${user.vetaisId})`);
      } catch (error: any) {
        if (error.message?.includes('unique')) {
          console.log(`   ⚠️ Пропущен (дубликат): ${user.fullName}`);
        } else {
          console.error(`   ❌ Ошибка: ${user.fullName}:`, error.message);
        }
      }
    }

    console.log('\n✅ Миграция завершена!');
    console.log(`📊 Мигрировано: ${usersToInsert.length} пользователей`);

  } catch (error) {
    console.error('\n❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await vetaisClient.end();
  }

  process.exit(0);
}

migrateMissingDoctors();
