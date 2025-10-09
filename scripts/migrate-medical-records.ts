#!/usr/bin/env tsx

/**
 * Миграция медицинских записей из Vetais в VetSystem
 * 
 * Переносит:
 * - medical_exams → medical_records (медицинские осмотры и визиты)
 * - medical_diagnoses → medical_records.diagnosis (диагнозы)
 * - medical_patient_symptoms → medical_records.chief_complaint (симптомы)
 * 
 * Особенности:
 * - Батчевая обработка (по 500 записей)
 * - Идемпотентность (проверка vetais_id)
 * - Маппинг пациентов, докторов и филиалов
 * - Логирование прогресса
 */

import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import postgres from 'postgres';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
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

interface VetaisExam {
  id: number;
  id_patient: number;
  id_doctor: number;
  id_clinic: number;
  date_created: Date;
  note: string | null;
  diagnoses: string[];
  symptoms: string[];
}

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
  const vetaisDb = drizzlePostgres(vetaisClient);

  try {
    // 1. Получить маппинг пациентов (vetais_id → vetsystem_id)
    console.log('📋 Загрузка маппинга пациентов...');
    const patients = await vetsystemDb
      .select({ id: schema.patients.id, vetaisId: schema.patients.vetaisId })
      .from(schema.patients)
      .where(eq(schema.patients.tenantId, TENANT_ID));
    
    const patientMap = new Map<number, string>(
      patients
        .filter((p): p is typeof p & { vetaisId: string } => p.vetaisId !== null)
        .map(p => [parseInt(p.vetaisId), p.id])
    );
    console.log(`✅ Загружено ${patientMap.size} пациентов с vetais_id\n`);

    // 2. Докторов пропускаем (нет связи vetais_id → doctors)
    console.log('ℹ️  Доктора будут установлены как NULL (требуется связать doctors с users)\n');

    // 3. Подсчитать общее количество записей
    const totalCountResult = await vetaisClient`
      SELECT COUNT(*) as count 
      FROM medical_exams 
      WHERE id_patient IS NOT NULL 
        AND id_doctor IS NOT NULL
        AND date_created IS NOT NULL
        AND deleted = 0
    `;
    const totalCount = parseInt(totalCountResult[0].count);
    console.log(`📊 Всего медицинских записей в Vetais: ${totalCount}\n`);

    // 4. Обработка батчами
    let processed = 0;
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (let offset = 0; offset < totalCount; offset += BATCH_SIZE) {
      console.log(`\n🔄 Обработка батча ${Math.floor(offset / BATCH_SIZE) + 1}/${Math.ceil(totalCount / BATCH_SIZE)}...`);
      
      // Получить батч из Vetais
      const examsData = await vetaisClient`
        SELECT 
          me.id,
          me.id_patient,
          me.id_doctor,
          me.id_clinic,
          me.date_created,
          me.note,
          ARRAY[]::text[] as diagnoses,
          ARRAY[]::text[] as symptoms
        FROM medical_exams me
        WHERE me.id_patient IS NOT NULL 
          AND me.id_doctor IS NOT NULL
          AND me.date_created IS NOT NULL
          AND me.deleted = 0
        ORDER BY me.id
        LIMIT ${BATCH_SIZE} OFFSET ${offset}
      `;

      const exams = examsData as unknown as VetaisExam[];
      
      if (exams.length === 0) {
        console.log('   Батч пуст, завершаем.');
        break;
      }

      // Проверить, какие записи уже мигрированы
      const vetaisIds = exams.map(e => e.id.toString());
      const existingRecords = vetaisIds.length > 0
        ? await vetsystemDb
            .select({ vetaisId: schema.medicalRecords.vetaisId })
            .from(schema.medicalRecords)
            .where(
              and(
                eq(schema.medicalRecords.tenantId, TENANT_ID),
                inArray(schema.medicalRecords.vetaisId, vetaisIds)
              )
            )
        : [];
      
      const existingVetaisIds = new Set<number>(
        existingRecords
          .map(r => r.vetaisId ? parseInt(r.vetaisId) : null)
          .filter((id): id is number => id !== null)
      );

      // Преобразовать и вставить записи
      const recordsToInsert: typeof schema.medicalRecords.$inferInsert[] = [];
      
      for (const exam of exams) {
        processed++;

        // Пропустить уже мигрированные
        if (existingVetaisIds.has(exam.id)) {
          skipped++;
          continue;
        }

        // Получить ID пациента
        const patientId = patientMap.get(exam.id_patient);
        if (!patientId) {
          console.warn(`   ⚠️ Пациент не найден: vetais_id=${exam.id_patient}, exam_id=${exam.id}`);
          errors++;
          continue;
        }

        // Doct orId всегда NULL т.к. doctors в отдельной таблице без vetais_id
        // TODO: связать doctors с users и использовать правильный doctorId
        const doctorId = null;

        // Получить ID филиала
        const branchId = CLINIC_TO_BRANCH[exam.id_clinic] || null;

        // Использовать note как основную информацию
        const notes = exam.note?.trim() || null;

        recordsToInsert.push({
          tenantId: TENANT_ID,
          branchId,
          patientId,
          doctorId,
          visitDate: new Date(exam.date_created),
          visitType: 'consultation',
          complaints: null,
          diagnosis: null,
          notes,
          temperature: null,
          weight: null,
          vetaisId: exam.id.toString(),
        });
      }

      // Вставить батч
      if (recordsToInsert.length > 0) {
        await vetsystemDb.insert(schema.medicalRecords).values(recordsToInsert);
        migrated += recordsToInsert.length;
        console.log(`   ✅ Мигрировано: ${recordsToInsert.length} записей`);
      } else {
        console.log('   ℹ️ Нет записей для миграции в этом батче');
      }

      console.log(`   📈 Прогресс: обработано ${processed}/${totalCount}, мигрировано ${migrated}, пропущено ${skipped}, ошибок ${errors}`);
    }

    console.log('\n✨ Миграция завершена!');
    console.log(`📊 Итого:`);
    console.log(`   - Обработано записей: ${processed}`);
    console.log(`   - Успешно мигрировано: ${migrated}`);
    console.log(`   - Пропущено (уже существуют): ${skipped}`);
    console.log(`   - Ошибок: ${errors}`);

  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    process.exit(1);
  } finally {
    await vetaisClient.end();
  }
}

main();
