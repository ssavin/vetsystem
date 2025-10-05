#!/usr/bin/env tsx

/**
 * Миграция медицинских файлов из Vetais в VetSystem
 * 
 * Переносит:
 * - medical_media_data → patient_files (рентген, УЗИ, фото)
 * 
 * Особенности:
 * - Извлечение бинарных данных из БД Vetais
 * - Сохранение файлов на диск в структуре tenant/branch/patient
 * - Батчевая обработка (по 100 файлов - меньше из-за размера)
 * - Идемпотентность (проверка vetais_id)
 * - Определение MIME типа из данных
 */

import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import postgres from 'postgres';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import * as schema from '../shared/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { fileTypeFromBuffer } from 'file-type';
import * as fs from 'fs';
import * as path from 'path';

const BATCH_SIZE = 100; // Меньше из-за размера файлов
const TENANT_ID = '0d0e5c59-aae1-4da8-9a5e-83bd12aeee7c';
const FILES_BASE_PATH = path.join(process.cwd(), 'uploads');

// Маппинг типов Vetais → VetSystem fileType
const FILE_TYPE_MAPPING: Record<string, string> = {
  'RTG': 'xray',
  'USG': 'scan',
  'FOTO': 'medical_image',
  'LAB': 'lab_result',
  'DOC': 'document',
};

interface VetaisMediaFile {
  id: number;
  medical_exam_id: number;
  pacient_id: number;
  nazev: string | null;
  typ: string | null;
  soubor: Buffer | null;
  datum: Date | null;
}

async function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function main() {
  console.log('📁 Начало миграции медицинских файлов из Vetais...\n');

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
    // 1. Получить маппинг пациентов
    console.log('📋 Загрузка маппинга пациентов...');
    const patients = await vetsystemDb
      .select({ 
        id: schema.patients.id, 
        vetaisId: schema.patients.vetaisId,
        branchId: schema.patients.branchId 
      })
      .from(schema.patients)
      .where(eq(schema.patients.tenantId, TENANT_ID));
    
    const patientMap = new Map<number, { id: string; branchId: string | null }>(
      patients
        .filter((p): p is typeof p & { vetaisId: number } => p.vetaisId !== null)
        .map(p => [p.vetaisId, { id: p.id, branchId: p.branchId }])
    );
    console.log(`✅ Загружено ${patientMap.size} пациентов\n`);

    // 2. Получить маппинг medical_records
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
    console.log(`✅ Загружено ${recordMap.size} медицинских записей\n`);

    // 3. Получить первого пользователя (для uploadedBy)
    const firstUser = await vetsystemDb
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.tenantId, TENANT_ID))
      .limit(1);
    
    if (firstUser.length === 0) {
      console.error('❌ Не найден пользователь для uploadedBy');
      process.exit(1);
    }
    const uploadedBy = firstUser[0].id;

    // 4. Подсчитать общее количество файлов
    const totalCountResult = await vetaisClient`
      SELECT COUNT(*) as count 
      FROM medical_media_data 
      WHERE soubor IS NOT NULL
        AND pacient_id IS NOT NULL
    `;
    const totalCount = parseInt(totalCountResult[0].count);
    console.log(`📊 Всего медицинских файлов в Vetais: ${totalCount}\n`);

    // 5. Обработка батчами
    let processed = 0;
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (let offset = 0; offset < totalCount; offset += BATCH_SIZE) {
      console.log(`\n🔄 Обработка батча ${Math.floor(offset / BATCH_SIZE) + 1}/${Math.ceil(totalCount / BATCH_SIZE)}...`);
      
      // Получить батч из Vetais
      const filesData = await vetaisClient`
        SELECT 
          id,
          medical_exam_id,
          pacient_id,
          nazev,
          typ,
          soubor,
          datum
        FROM medical_media_data
        WHERE soubor IS NOT NULL
          AND pacient_id IS NOT NULL
        ORDER BY id
        LIMIT ${BATCH_SIZE} OFFSET ${offset}
      `;

      const files = filesData as unknown as VetaisMediaFile[];
      
      if (files.length === 0) {
        console.log('   Батч пуст, завершаем.');
        break;
      }

      // Проверить, какие файлы уже мигрированы
      const vetaisIds = files.map(f => f.id);
      const existingFiles = vetaisIds.length > 0
        ? await vetsystemDb
            .select({ vetaisId: schema.patientFiles.vetaisId })
            .from(schema.patientFiles)
            .where(inArray(schema.patientFiles.vetaisId, vetaisIds as any))
        : [];
      
      const existingVetaisIds = new Set<number>(
        existingFiles
          .map(f => f.vetaisId)
          .filter((id): id is number => id !== null)
      );

      // Преобразовать и вставить файлы
      const filesToInsert: typeof schema.patientFiles.$inferInsert[] = [];
      
      for (const file of files) {
        processed++;

        // Пропустить уже мигрированные
        if (existingVetaisIds.has(file.id)) {
          skipped++;
          continue;
        }

        // Получить информацию о пациенте
        const patientInfo = patientMap.get(file.pacient_id);
        if (!patientInfo) {
          console.warn(`   ⚠️ Пациент не найден: vetais_id=${file.pacient_id}, file_id=${file.id}`);
          errors++;
          continue;
        }

        // Пропустить файлы без данных
        if (!file.soubor) {
          errors++;
          continue;
        }

        // Определить MIME тип из данных
        let mimeType = 'application/octet-stream';
        let fileExtension = 'bin';
        
        try {
          const fileTypeResult = await fileTypeFromBuffer(file.soubor);
          if (fileTypeResult) {
            mimeType = fileTypeResult.mime;
            fileExtension = fileTypeResult.ext;
          }
        } catch (e) {
          console.warn(`   ⚠️ Не удалось определить тип файла ${file.id}`);
        }

        // Определить тип файла для VetSystem
        const fileType = FILE_TYPE_MAPPING[file.typ?.toUpperCase() || ''] || 'other';

        // Получить ID медицинской записи (если есть)
        const medicalRecordId = file.medical_exam_id 
          ? recordMap.get(file.medical_exam_id) || null
          : null;

        // Создать путь для сохранения файла
        const branchId = patientInfo.branchId || 'default';
        const fileName = `${file.id}_${Date.now()}.${fileExtension}`;
        const relativePath = `${TENANT_ID}/${branchId}/${patientInfo.id}`;
        const fullDirPath = path.join(FILES_BASE_PATH, relativePath);
        const fullFilePath = path.join(fullDirPath, fileName);
        const relativeFilePath = path.join(relativePath, fileName);

        // Создать директорию и сохранить файл
        try {
          await ensureDirectoryExists(fullDirPath);
          fs.writeFileSync(fullFilePath, file.soubor);
        } catch (e) {
          console.error(`   ❌ Ошибка сохранения файла ${file.id}:`, e);
          errors++;
          continue;
        }

        filesToInsert.push({
          patientId: patientInfo.id,
          fileName,
          originalName: file.nazev || `file_${file.id}.${fileExtension}`,
          fileType,
          mimeType,
          fileSize: file.soubor.length,
          filePath: relativeFilePath,
          description: file.nazev || null,
          uploadedBy,
          medicalRecordId,
          vetaisId: file.id,
        });
      }

      // Вставить батч
      if (filesToInsert.length > 0) {
        await vetsystemDb.insert(schema.patientFiles).values(filesToInsert);
        migrated += filesToInsert.length;
        console.log(`   ✅ Мигрировано: ${filesToInsert.length} файлов`);
      } else {
        console.log('   ℹ️ Нет файлов для миграции в этом батче');
      }

      console.log(`   📈 Прогресс: обработано ${processed}/${totalCount}, мигрировано ${migrated}, пропущено ${skipped}, ошибок ${errors}`);
    }

    console.log('\n✨ Миграция файлов завершена!');
    console.log(`📊 Итого:`);
    console.log(`   - Обработано файлов: ${processed}`);
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
