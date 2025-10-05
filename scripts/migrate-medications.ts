#!/usr/bin/env tsx

/**
 * Миграция назначений лекарств из Vetais в VetSystem
 * 
 * Переносит:
 * - medical_plan_item → medications (назначенные лекарства и процедуры)
 * 
 * Особенности:
 * - Батчевая обработка (по 1000 записей)
 * - Идемпотентность (проверка vetais_id)
 * - Маппинг medical_exam_id через medical_records.vetais_id
 * - Разделение на лекарства и процедуры
 */

import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import postgres from 'postgres';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import * as schema from '../shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

const BATCH_SIZE = 1000;
const TENANT_ID = '0d0e5c59-aae1-4da8-9a5e-83bd12aeee7c';

interface VetaisPlanItem {
  id: number;
  medical_exam_id: number;
  nazev: string;
  mnozstvi: number | null;
  jednotka: string | null;
  cena: number | null;
  datum: Date | null;
  typ: string | null; // 'lek' для лекарств, 'vykon' для процедур
  poznamka: string | null;
}

async function main() {
  console.log('💊 Начало миграции назначений из Vetais...\n');

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
    // 1. Получить маппинг medical_records (vetais_exam_id → vetsystem_record_id)
    console.log('📋 Загрузка маппинга медицинских записей...');
    const medicalRecords = await vetsystemDb
      .select({ 
        id: schema.medicalRecords.id, 
        vetaisId: schema.medicalRecords.vetaisId 
      })
      .from(schema.medicalRecords)
      .where(eq(schema.medicalRecords.tenantId, TENANT_ID));
    
    const recordMap = new Map<number, string>(
      medicalRecords
        .filter((r): r is typeof r & { vetaisId: number } => r.vetaisId !== null)
        .map(r => [r.vetaisId, r.id])
    );
    console.log(`✅ Загружено ${recordMap.size} медицинских записей с vetais_id\n`);

    // 2. Подсчитать общее количество назначений
    const totalCountResult = await vetaisClient`
      SELECT COUNT(*) as count 
      FROM medical_plan_item 
      WHERE medical_exam_id IS NOT NULL
        AND nazev IS NOT NULL
    `;
    const totalCount = parseInt(totalCountResult[0].count);
    console.log(`📊 Всего назначений в Vetais: ${totalCount}\n`);

    // 3. Обработка батчами
    let processed = 0;
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    let medicationsCount = 0;
    let proceduresCount = 0;

    for (let offset = 0; offset < totalCount; offset += BATCH_SIZE) {
      console.log(`\n🔄 Обработка батча ${Math.floor(offset / BATCH_SIZE) + 1}/${Math.ceil(totalCount / BATCH_SIZE)}...`);
      
      // Получить батч из Vetais
      const planItemsData = await vetaisClient`
        SELECT 
          id,
          medical_exam_id,
          nazev,
          mnozstvi,
          jednotka,
          cena,
          datum,
          typ,
          poznamka
        FROM medical_plan_item
        WHERE medical_exam_id IS NOT NULL
          AND nazev IS NOT NULL
        ORDER BY id
        LIMIT ${BATCH_SIZE} OFFSET ${offset}
      `;

      const planItems = planItemsData as unknown as VetaisPlanItem[];
      
      if (planItems.length === 0) {
        console.log('   Батч пуст, завершаем.');
        break;
      }

      // Проверить, какие записи уже мигрированы
      const vetaisIds = planItems.map(p => p.id);
      const existingMedications = vetaisIds.length > 0
        ? await vetsystemDb
            .select({ vetaisId: schema.medications.vetaisId })
            .from(schema.medications)
            .where(inArray(schema.medications.vetaisId, vetaisIds as any))
        : [];
      
      const existingVetaisIds = new Set<number>(
        existingMedications
          .map(m => m.vetaisId)
          .filter((id): id is number => id !== null)
      );

      // Преобразовать и вставить записи
      const medicationsToInsert: typeof schema.medications.$inferInsert[] = [];
      
      for (const item of planItems) {
        processed++;

        // Пропустить уже мигрированные
        if (existingVetaisIds.has(item.id)) {
          skipped++;
          continue;
        }

        // Получить ID медицинской записи
        const medicalRecordId = recordMap.get(item.medical_exam_id);
        if (!medicalRecordId) {
          console.warn(`   ⚠️ Медицинская запись не найдена: vetais_exam_id=${item.medical_exam_id}, item_id=${item.id}`);
          errors++;
          continue;
        }

        // Определить тип (лекарство или процедура)
        const isMedication = !item.typ || item.typ === 'lek' || item.typ.toLowerCase().includes('lek');
        
        // Пропустить процедуры - они должны идти в treatment поле medical_records
        if (!isMedication) {
          proceduresCount++;
          continue;
        }
        
        medicationsCount++;

        // Собрать дозировку
        const dosage = [
          item.mnozstvi ? item.mnozstvi.toString() : null,
          item.jednotka || null
        ].filter(Boolean).join(' ') || '-';

        // Собрать инструкции из заметок
        const instructions = item.poznamka || null;

        medicationsToInsert.push({
          recordId: medicalRecordId,
          name: item.nazev,
          dosage,
          frequency: '-', // Нет данных в Vetais
          duration: '-', // Нет данных в Vetais
          instructions,
          vetaisId: item.id,
        });
      }

      // Вставить батч
      if (medicationsToInsert.length > 0) {
        await vetsystemDb.insert(schema.medications).values(medicationsToInsert);
        migrated += medicationsToInsert.length;
        console.log(`   ✅ Мигрировано: ${medicationsToInsert.length} назначений`);
      } else {
        console.log('   ℹ️ Нет назначений для миграции в этом батче');
      }

      console.log(`   📈 Прогресс: обработано ${processed}/${totalCount}, мигрировано ${migrated}, пропущено ${skipped}, ошибок ${errors}`);
    }

    console.log('\n✨ Миграция завершена!');
    console.log(`📊 Итого:`);
    console.log(`   - Обработано назначений: ${processed}`);
    console.log(`   - Успешно мигрировано: ${migrated}`);
    console.log(`     • Лекарств: ${medicationsCount}`);
    console.log(`     • Процедур: ${proceduresCount}`);
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
