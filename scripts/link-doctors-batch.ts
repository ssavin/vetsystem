#!/usr/bin/env tsx

import postgres from 'postgres';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../shared/schema';
import { eq, and, isNull } from 'drizzle-orm';

const TENANT_ID = 'default-tenant-001';

async function linkDoctorsBatch() {
  console.log('🔗 Связывание медицинских записей с докторами (BATCH)...\n');

  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  const vetsystemDb = drizzle(neon(process.env.DATABASE_URL!), { schema });

  try {
    // 1. Загрузить маппинг всех пользователей с vetais_id (не только врачей)
    // В Vetais могут быть записи от пользователей, которые сейчас не врачи
    console.log('👨‍⚕️ Загрузка пользователей из users...');
    const doctors = await vetsystemDb
      .select({ 
        id: schema.users.id, 
        vetaisId: schema.users.vetaisId,
      })
      .from(schema.users)
      .where(eq(schema.users.tenantId, TENANT_ID));
    
    const doctorMap = new Map<string, string>(
      doctors
        .filter(d => d.vetaisId !== null)
        .map(d => [String(d.vetaisId), d.id])
    );
    
    console.log(`✅ Найдено ${doctorMap.size} пользователей с vetais_id\n`);
    
    // Проверка: есть ли ключи 10021, 10105, 10058?
    const testKeys = ['10021', '10105', '10058', '10046', '10118'];
    console.log('🔍 Проверка ключей в doctorMap:');
    for (const key of testKeys) {
      console.log(`  ${key}: ${doctorMap.has(key) ? '✅ есть' : '❌ нет'}`);
    }
    console.log('');

    // 2. Загрузить ВСЕ exams из Vetais с id_doctor
    console.log('📊 Загрузка всех exam из Vetais...');
    const vetaisExams = await vetaisClient`
      SELECT id, id_doctor
      FROM medical_exams
      WHERE id_doctor IS NOT NULL AND id_doctor != 0
    `;
    
    const examDoctorMap = new Map<string, string>(
      vetaisExams
        .filter(e => e.id_doctor !== null && e.id_doctor !== 0)
        .map(e => [e.id.toString(), e.id_doctor.toString()])
    );
    
    console.log(`✅ Загружено ${examDoctorMap.size} exam с докторами\n`);

    // 3. Загрузить medical_records без doctorId
    console.log('🔍 Загрузка записей без доктора...');
    const recordsToUpdate = await vetsystemDb
      .select({
        id: schema.medicalRecords.id,
        vetaisId: schema.medicalRecords.vetaisId,
      })
      .from(schema.medicalRecords)
      .where(and(
        eq(schema.medicalRecords.tenantId, TENANT_ID),
        isNull(schema.medicalRecords.doctorId)
      ));

    console.log(`📊 Найдено ${recordsToUpdate.length} записей без доктора\n`);

    // 4. Связать записи с докторами
    console.log('🔗 Связывание записей...\n');
    
    let matched = 0;
    let updated = 0;
    let noVetaisId = 0;
    let noExamMatch = 0;
    let noDoctorMatch = 0;
    
    for (const record of recordsToUpdate) {
      if (!record.vetaisId) {
        noVetaisId++;
        continue;
      }

      const vetaisDoctorId = examDoctorMap.get(record.vetaisId);
      if (!vetaisDoctorId) {
        noExamMatch++;
        continue;
      }

      const doctorId = doctorMap.get(vetaisDoctorId);
      if (!doctorId) {
        noDoctorMatch++;
        continue;
      }

      matched++;

      await vetsystemDb
        .update(schema.medicalRecords)
        .set({ doctorId })
        .where(eq(schema.medicalRecords.id, record.id));

      updated++;

      if (updated % 1000 === 0) {
        console.log(`   ✅ Обновлено: ${updated}`);
      }
    }
    
    console.log(`\n📊 Причины пропуска:`);
    console.log(`   Нет vetaisId: ${noVetaisId}`);
    console.log(`   Нет соответствия в exam: ${noExamMatch}`);
    console.log(`   Нет доктора в users: ${noDoctorMatch}`);

    console.log(`\n✅ ГОТОВО: ${updated} записей связаны с докторами\n`);

    // 5. Статистика
    const allRecords = await vetsystemDb
      .select({
        id: schema.medicalRecords.id,
        doctorId: schema.medicalRecords.doctorId,
      })
      .from(schema.medicalRecords)
      .where(eq(schema.medicalRecords.tenantId, TENANT_ID));

    const totalRecords = allRecords.length;
    const withDoctor = allRecords.filter(r => r.doctorId !== null).length;
    const withoutDoctor = totalRecords - withDoctor;

    console.log('📊 Финальная статистика:');
    console.log(`   Всего записей: ${totalRecords}`);
    console.log(`   С доктором: ${withDoctor} (${Math.round((withDoctor/totalRecords)*100)}%)`);
    console.log(`   Без доктора: ${withoutDoctor} (${Math.round((withoutDoctor/totalRecords)*100)}%)`);

  } catch (error) {
    console.error('\n❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await vetaisClient.end();
  }

  process.exit(0);
}

linkDoctorsBatch();
