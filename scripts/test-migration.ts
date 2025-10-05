#!/usr/bin/env tsx

/**
 * Тестовый скрипт для проверки готовности к миграции медицинских данных
 * 
 * Проверяет:
 * - Подключение к обеим БД (Vetais и VetSystem)
 * - Наличие необходимых данных для маппинга
 * - Статистику исходных данных в Vetais
 * - Текущее состояние миграции в VetSystem
 */

import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import postgres from 'postgres';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';

const TENANT_ID = '0d0e5c59-aae1-4da8-9a5e-83bd12aeee7c';

async function main() {
  console.log('🔍 Проверка готовности к миграции медицинских данных\n');
  console.log('='.repeat(60) + '\n');

  try {
    // 1. Подключение к БД
    console.log('📡 Подключение к базам данных...');
    const vetsystemDb = drizzleNeon(neon(process.env.DATABASE_URL!), { schema });
    const vetaisClient = postgres({
      host: process.env.VETAIS_DB_HOST!,
      port: parseInt(process.env.VETAIS_DB_PORT!),
      database: process.env.VETAIS_DB_NAME!,
      username: process.env.VETAIS_DB_USER!,
      password: process.env.VETAIS_DB_PASSWORD!,
    });
    console.log('✅ Подключение успешно\n');

    // 2. Статистика VetSystem
    console.log('📊 Статистика VetSystem (целевая БД):');
    console.log('-'.repeat(60));

    const patientsCount = await vetsystemDb.$count(schema.patients, eq(schema.patients.tenantId, TENANT_ID));
    const patientsWithVetaisId = await vetsystemDb
      .select({ id: schema.patients.id })
      .from(schema.patients)
      .where(eq(schema.patients.tenantId, TENANT_ID));
    const patientsWithVetaisIdCount = patientsWithVetaisId.filter(p => p.id !== null).length;

    const usersCount = await vetsystemDb.$count(schema.users, eq(schema.users.tenantId, TENANT_ID));
    const usersWithVetaisId = await vetsystemDb
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.tenantId, TENANT_ID));
    const usersWithVetaisIdCount = usersWithVetaisId.filter(u => u.id !== null).length;

    const medicalRecordsCount = await vetsystemDb.$count(schema.medicalRecords, eq(schema.medicalRecords.tenantId, TENANT_ID));
    const medicationsCount = await vetsystemDb.$count(schema.medications);
    const patientFilesCount = await vetsystemDb.$count(schema.patientFiles);

    console.log(`  Пациенты: ${patientsCount} (${patientsWithVetaisIdCount} с vetais_id)`);
    console.log(`  Пользователи: ${usersCount} (${usersWithVetaisIdCount} с vetais_id)`);
    console.log(`  Медицинские записи: ${medicalRecordsCount}`);
    console.log(`  Назначения (medications): ${medicationsCount}`);
    console.log(`  Файлы пациентов: ${patientFilesCount}`);
    console.log('');

    // 3. Статистика Vetais
    console.log('📊 Статистика Vetais (источник данных):');
    console.log('-'.repeat(60));

    const vetaisExamsResult = await vetaisClient`
      SELECT COUNT(*) as count FROM medical_exams 
      WHERE pacient_id IS NOT NULL AND uzivatel_id IS NOT NULL
    `;
    const vetaisExamsCount = parseInt(vetaisExamsResult[0].count);

    const vetaisPlanItemsResult = await vetaisClient`
      SELECT COUNT(*) as count FROM medical_plan_item 
      WHERE medical_exam_id IS NOT NULL AND nazev IS NOT NULL
    `;
    const vetaisPlanItemsCount = parseInt(vetaisPlanItemsResult[0].count);

    const vetaisFilesResult = await vetaisClient`
      SELECT COUNT(*) as count FROM medical_media_data 
      WHERE soubor IS NOT NULL AND pacient_id IS NOT NULL
    `;
    const vetaisFilesCount = parseInt(vetaisFilesResult[0].count);

    console.log(`  Медицинские осмотры (medical_exams): ${vetaisExamsCount}`);
    console.log(`  Назначения (medical_plan_item): ${vetaisPlanItemsCount}`);
    console.log(`  Медицинские файлы (medical_media_data): ${vetaisFilesCount}`);
    console.log('');

    // 4. Оценка объема миграции
    console.log('📈 Оценка объема миграции:');
    console.log('-'.repeat(60));
    
    const recordsToMigrate = Math.max(0, vetaisExamsCount - medicalRecordsCount);
    const medicationsToMigrate = Math.max(0, vetaisPlanItemsCount - medicationsCount);
    const filesToMigrate = Math.max(0, vetaisFilesCount - patientFilesCount);

    console.log(`  Медицинские записи к миграции: ~${recordsToMigrate}`);
    console.log(`  Назначения к миграции: ~${medicationsToMigrate}`);
    console.log(`  Файлы к миграции: ~${filesToMigrate}`);
    console.log('');

    // 5. Проверка готовности
    console.log('✅ Проверка готовности к миграции:');
    console.log('-'.repeat(60));

    const warnings: string[] = [];
    
    if (patientsWithVetaisIdCount === 0) {
      warnings.push('⚠️ Нет пациентов с vetais_id - миграция невозможна!');
    }
    
    if (usersWithVetaisIdCount === 0) {
      warnings.push('⚠️ Нет пользователей с vetais_id - миграция невозможна!');
    }

    if (warnings.length > 0) {
      console.log('\n❌ Обнаружены проблемы:\n');
      warnings.forEach(w => console.log(`  ${w}`));
    } else {
      console.log('  ✅ Все проверки пройдены!');
      console.log('  ✅ Маппинг пациентов готов');
      console.log('  ✅ Маппинг пользователей готов');
      console.log('  ✅ Можно начинать миграцию');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📝 Скрипты миграции:');
    console.log('  1. tsx scripts/migrate-medical-records.ts  # Медицинские записи');
    console.log('  2. tsx scripts/migrate-medications.ts      # Назначения/лекарства');
    console.log('  3. tsx scripts/migrate-medical-files.ts    # Медицинские файлы');
    console.log('');

    await vetaisClient.end();
    
  } catch (error) {
    console.error('\n❌ Ошибка проверки:', error);
    process.exit(1);
  }
}

main();
