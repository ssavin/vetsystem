#!/usr/bin/env tsx

/**
 * Упрощённая миграция медицинских записей из Vetais в VetSystem
 * 
 * Переносит только основные данные:
 * - medical_exams → medical_records
 */

import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import postgres from 'postgres';
import * as schema from '../shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

const BATCH_SIZE = 500;
const TENANT_ID = 'default-tenant-001';

// Маппинг клиник Vetais → филиалы VetSystem
const CLINIC_TO_BRANCH: Record<number, string> = {
  10000: '280fcff4-2e1c-43d7-8ae5-6a48d288e518', // Бутово
  10001: '48ef0926-7fc3-4c82-b1b9-d8cb6d787ee8', // Лобачевского
  10002: 'c59ff876-d0c9-4220-b782-de28bdd0329c', // Новопеределкино
};

async function main() {
  console.log('🏥 Начало миграции медицинских записей из Vetais...\n');

  // Подключение к VetSystem (Neon)
  const vetsystemDb = drizzleNeon(neon(process.env.DATABASE_URL!), { schema });
  
  // Подключение к Vetais (PostgreSQL)
  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  try {
    // 1. Получить маппинг пациентов
    console.log('📋 Загрузка маппинга пациентов...');
    const patients = await vetsystemDb
      .select({ id: schema.patients.id, vetaisId: schema.patients.vetaisId })
      .from(schema.patients)
      .where(eq(schema.patients.tenantId, TENANT_ID));
    
    const patientMap = new Map<string, string>(
      patients
        .filter((p): p is typeof p & { vetaisId: string } => p.vetaisId !== null)
        .map(p => [p.vetaisId, p.id])
    );
    console.log(`✅ Загружено ${patientMap.size} пациентов\n`);

    // 2. Получить маппинг докторов
    console.log('👨‍⚕️ Загрузка маппинга докторов...');
    const users = await vetsystemDb
      .select({ id: schema.users.id, vetaisId: schema.users.vetaisId })
      .from(schema.users)
      .where(eq(schema.users.tenantId, TENANT_ID));
    
    const doctorMap = new Map<string, string>(
      users
        .filter((u): u is typeof u & { vetaisId: string } => u.vetaisId !== null)
        .map(u => [u.vetaisId, u.id])
    );
    console.log(`✅ Загружено ${doctorMap.size} докторов\n`);

    // 3. Подсчитать общее количество записей
    const totalCountResult = await vetaisClient`
      SELECT COUNT(*) as count 
      FROM medical_exams 
      WHERE id_patient IS NOT NULL 
        AND id_doctor IS NOT NULL
        AND date_created IS NOT NULL
        AND deleted IS NULL OR deleted = 0
    `;
    const totalCount = parseInt(totalCountResult[0].count);
    console.log(`📊 Всего медицинских записей в Vetais: ${totalCount}\n`);

    // 4. Обработка батчами
    let processed = 0;
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (let offset = 0; offset < totalCount; offset += BATCH_SIZE) {
      console.log(`\n🔄 Батч ${Math.floor(offset / BATCH_SIZE) + 1}/${Math.ceil(totalCount / BATCH_SIZE)} (записи ${offset + 1}-${Math.min(offset + BATCH_SIZE, totalCount)})...`);
      
      // Получить батч из Vetais
      const examsData = await vetaisClient`
        SELECT 
          id,
          id_patient,
          id_doctor,
          id_clinic,
          date_created,
          note
        FROM medical_exams
        WHERE id_patient IS NOT NULL 
          AND id_doctor IS NOT NULL
          AND date_created IS NOT NULL
          AND (deleted IS NULL OR deleted = 0)
        ORDER BY id
        LIMIT ${BATCH_SIZE} OFFSET ${offset}
      `;

      if (examsData.length === 0) {
        console.log('   Батч пуст, завершаем.');
        break;
      }

      // Проверить, какие записи уже мигрированы
      const vetaisIds = examsData.map((e: any) => e.id);
      const existingRecords = vetaisIds.length > 0
        ? await vetsystemDb
            .select({ vetaisId: schema.medicalRecords.vetaisId })
            .from(schema.medicalRecords)
            .where(
              and(
                eq(schema.medicalRecords.tenantId, TENANT_ID),
                inArray(schema.medicalRecords.vetaisId, vetaisIds as any)
              )
            )
        : [];
      
      const existingVetaisIds = new Set<number>(
        existingRecords
          .map(r => r.vetaisId)
          .filter((id): id is number => id !== null)
      );

      // Преобразовать и вставить записи
      const recordsToInsert: typeof schema.medicalRecords.$inferInsert[] = [];
      
      for (const exam of examsData) {
        processed++;
        
        if (existingVetaisIds.has(exam.id)) {
          skipped++;
          continue;
        }

        const patientId = patientMap.get(exam.id_patient?.toString());
        const doctorId = doctorMap.get(exam.id_doctor?.toString());
        const branchId = CLINIC_TO_BRANCH[exam.id_clinic];

        if (!patientId) {
          errors++;
          console.log(`   ⚠️  Пациент ${exam.id_patient} не найден для записи ${exam.id}`);
          continue;
        }

        if (!branchId) {
          errors++;
          console.log(`   ⚠️  Филиал ${exam.id_clinic} не найден для записи ${exam.id}`);
          continue;
        }

        recordsToInsert.push({
          tenantId: TENANT_ID,
          branchId,
          patientId,
          doctorId: doctorId || null, // может быть null для старых записей
          visitDate: new Date(exam.date_created),
          visitType: 'Приём',
          complaints: exam.note || '',
          diagnosis: '',
          treatment: [],
          status: 'completed',
          vetaisId: exam.id,
        });
      }

      // Вставка в VetSystem
      if (recordsToInsert.length > 0) {
        try {
          await vetsystemDb.insert(schema.medicalRecords).values(recordsToInsert);
          migrated += recordsToInsert.length;
          console.log(`   ✅ Мигрировано: ${recordsToInsert.length}`);
        } catch (error) {
          console.error(`   ❌ Ошибка вставки батча:`, error);
          errors += recordsToInsert.length;
        }
      } else {
        console.log(`   ⏭️  Все записи уже мигрированы`);
      }

      console.log(`   📊 Прогресс: ${processed}/${totalCount} (${Math.round(processed/totalCount*100)}%)`);
    }

    console.log('\n\n✅ МИГРАЦИЯ ЗАВЕРШЕНА!');
    console.log(`📊 Всего обработано: ${processed}`);
    console.log(`✅ Мигрировано: ${migrated}`);
    console.log(`⏭️  Пропущено (уже есть): ${skipped}`);
    console.log(`❌ Ошибок: ${errors}`);

  } catch (error) {
    console.error('\n❌ Ошибка миграции:', error);
    process.exit(1);
  } finally {
    await vetaisClient.end();
  }
}

main();
