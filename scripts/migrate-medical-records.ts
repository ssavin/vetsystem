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
  pacient_id: number;
  uzivatel_id: number;
  klinika_id: number;
  datum_a_cas: Date;
  anamneza: string | null;
  popis_vysetreni: string | null;
  teplota: number | null;
  vaha: number | null;
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
        .filter((p): p is typeof p & { vetaisId: number } => p.vetaisId !== null)
        .map(p => [p.vetaisId, p.id])
    );
    console.log(`✅ Загружено ${patientMap.size} пациентов с vetais_id\n`);

    // 2. Получить маппинг докторов (vetais_id → vetsystem_id)
    console.log('👨‍⚕️ Загрузка маппинга докторов...');
    const users = await vetsystemDb
      .select({ id: schema.users.id, vetaisId: schema.users.vetaisId })
      .from(schema.users)
      .where(eq(schema.users.tenantId, TENANT_ID));
    
    const doctorMap = new Map<number, string>(
      users
        .filter((u): u is typeof u & { vetaisId: number } => u.vetaisId !== null)
        .map(u => [u.vetaisId, u.id])
    );
    console.log(`✅ Загружено ${doctorMap.size} докторов с vetais_id\n`);

    // 3. Подсчитать общее количество записей
    const totalCountResult = await vetaisClient`
      SELECT COUNT(*) as count 
      FROM medical_exams 
      WHERE pacient_id IS NOT NULL 
        AND uzivatel_id IS NOT NULL
        AND datum_a_cas IS NOT NULL
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
      
      // Получить батч из Vetais с диагнозами и симптомами
      const examsData = await vetaisClient`
        SELECT 
          me.id,
          me.pacient_id,
          me.uzivatel_id,
          me.klinika_id,
          me.datum_a_cas,
          me.anamneza,
          me.popis_vysetreni,
          me.teplota,
          me.vaha,
          COALESCE(
            array_agg(DISTINCT md.diagnoza) FILTER (WHERE md.diagnoza IS NOT NULL),
            ARRAY[]::text[]
          ) as diagnoses,
          COALESCE(
            array_agg(DISTINCT mps.symptom) FILTER (WHERE mps.symptom IS NOT NULL),
            ARRAY[]::text[]
          ) as symptoms
        FROM medical_exams me
        LEFT JOIN medical_diagnoses md ON me.id = md.medical_exam_id
        LEFT JOIN medical_patient_symptoms mps ON me.id = mps.medical_exam_id
        WHERE me.pacient_id IS NOT NULL 
          AND me.uzivatel_id IS NOT NULL
          AND me.datum_a_cas IS NOT NULL
        GROUP BY me.id, me.pacient_id, me.uzivatel_id, me.klinika_id, 
                 me.datum_a_cas, me.anamneza, me.popis_vysetreni, me.teplota, me.vaha
        ORDER BY me.id
        LIMIT ${BATCH_SIZE} OFFSET ${offset}
      `;

      const exams = examsData as unknown as VetaisExam[];
      
      if (exams.length === 0) {
        console.log('   Батч пуст, завершаем.');
        break;
      }

      // Проверить, какие записи уже мигрированы
      const vetaisIds = exams.map(e => e.id);
      const existingRecords = vetaisIds.length > 0
        ? await vetsystemDb
            .select({ vetaisId: schema.medicalRecords.vetaisId })
            .from(schema.medicalRecords)
            .where(
              and(
                eq(schema.medicalRecords.tenantId, TENANT_ID),
                inArray(schema.medicalRecords.vetaisId, vetaisIds as any) // Cast для integer array
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
      
      for (const exam of exams) {
        processed++;

        // Пропустить уже мигрированные
        if (existingVetaisIds.has(exam.id)) {
          skipped++;
          continue;
        }

        // Получить ID пациента
        const patientId = patientMap.get(exam.pacient_id);
        if (!patientId) {
          console.warn(`   ⚠️ Пациент не найден: vetais_id=${exam.pacient_id}, exam_id=${exam.id}`);
          errors++;
          continue;
        }

        // Получить ID доктора
        const doctorId = doctorMap.get(exam.uzivatel_id);
        if (!doctorId) {
          console.warn(`   ⚠️ Доктор не найден: vetais_id=${exam.uzivatel_id}, exam_id=${exam.id}`);
          errors++;
          continue;
        }

        // Получить ID филиала
        const branchId = CLINIC_TO_BRANCH[exam.klinika_id];
        if (!branchId) {
          console.warn(`   ⚠️ Филиал не найден: klinika_id=${exam.klinika_id}, exam_id=${exam.id}`);
          errors++;
          continue;
        }

        // Собрать жалобы из симптомов
        const complaints = exam.symptoms.length > 0 
          ? exam.symptoms.join('; ') 
          : null;

        // Собрать диагноз из диагнозов
        const diagnosis = exam.diagnoses.length > 0 
          ? exam.diagnoses.join('; ') 
          : null;

        // Собрать заметки из анамнеза и описания осмотра
        const notes = [
          exam.anamneza ? `Анамнез: ${exam.anamneza}` : null,
          exam.popis_vysetreni ? `Описание осмотра: ${exam.popis_vysetreni}` : null,
        ].filter(Boolean).join('\n\n') || null;

        // Определить тип визита
        const visitType = exam.diagnoses.length > 0 ? 'checkup' : 'consultation';

        recordsToInsert.push({
          tenantId: TENANT_ID,
          branchId,
          patientId,
          doctorId,
          visitDate: exam.datum_a_cas,
          visitType,
          complaints,
          diagnosis,
          notes,
          temperature: exam.teplota ? exam.teplota.toString() : null,
          weight: exam.vaha ? exam.vaha.toString() : null,
          vetaisId: exam.id,
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
