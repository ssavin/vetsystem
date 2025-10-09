#!/usr/bin/env tsx

import postgres from 'postgres';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../shared/schema';
import { eq, and, isNull } from 'drizzle-orm';

const TENANT_ID = 'default-tenant-001';

async function linkDoctors() {
  console.log('🔗 Связывание медицинских записей с докторами...\n');

  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  const vetsystemDb = drizzle(neon(process.env.DATABASE_URL!), { schema });

  try {
    // 1. Загрузить маппинг докторов (vetais_id → user_id)
    console.log('👨‍⚕️ Загрузка докторов из users...');
    const doctors = await vetsystemDb
      .select({ 
        id: schema.users.id, 
        vetaisId: schema.users.vetaisId,
        fullName: schema.users.fullName 
      })
      .from(schema.users)
      .where(and(
        eq(schema.users.tenantId, TENANT_ID),
        eq(schema.users.role, 'врач')
      ));
    
    const doctorMap = new Map<string, string>(
      doctors
        .filter((d): d is typeof d & { vetaisId: string } => d.vetaisId !== null)
        .map(d => [d.vetaisId, d.id])
    );
    
    console.log(`✅ Найдено ${doctorMap.size} врачей с vetais_id\n`);

    // 2. Загрузить medical_records без doctorId, которые имеют vetais_id
    console.log('🔍 Поиск записей без доктора...');
    const recordsWithoutDoctor = await vetsystemDb
      .select({
        id: schema.medicalRecords.id,
        vetaisId: schema.medicalRecords.vetaisId,
      })
      .from(schema.medicalRecords)
      .where(and(
        eq(schema.medicalRecords.tenantId, TENANT_ID),
        isNull(schema.medicalRecords.doctorId)
      ));

    console.log(`📊 Найдено ${recordsWithoutDoctor.length} записей без доктора\n`);

    if (recordsWithoutDoctor.length === 0) {
      console.log('✅ Все записи уже связаны с докторами!');
      process.exit(0);
    }

    // 3. Для каждой записи найти доктора в Vetais и связать
    console.log('🔗 Связывание записей с докторами...\n');

    const recordsToUpdate: Array<{ recordId: string; doctorId: string }> = [];
    
    for (const record of recordsWithoutDoctor) {
      if (!record.vetaisId) continue;

      // Найти exam в Vetais по ID
      const vetaisExam = await vetaisClient`
        SELECT id_doctor 
        FROM medical_exams 
        WHERE id = ${parseInt(record.vetaisId)}
        LIMIT 1
      `;

      if (vetaisExam.length === 0) continue;

      const vetaisDoctorId = vetaisExam[0].id_doctor?.toString();
      if (!vetaisDoctorId) continue;

      const doctorId = doctorMap.get(vetaisDoctorId);
      if (!doctorId) continue;

      recordsToUpdate.push({
        recordId: record.id,
        doctorId,
      });

      if (recordsToUpdate.length % 100 === 0) {
        console.log(`   📊 Найдено соответствий: ${recordsToUpdate.length}`);
      }
    }

    console.log(`\n✅ Найдено ${recordsToUpdate.length} записей для связывания\n`);

    // 4. Обновить записи батчами
    if (recordsToUpdate.length > 0) {
      console.log('💾 Обновление записей...\n');
      
      let updated = 0;
      for (const { recordId, doctorId } of recordsToUpdate) {
        await vetsystemDb
          .update(schema.medicalRecords)
          .set({ doctorId })
          .where(eq(schema.medicalRecords.id, recordId));
        
        updated++;
        
        if (updated % 1000 === 0) {
          console.log(`   ✅ Обновлено: ${updated}/${recordsToUpdate.length}`);
        }
      }

      console.log(`\n✅ ГОТОВО: ${updated} записей связаны с докторами`);
    }

    // 5. Статистика
    const stats = await vetsystemDb
      .select({
        total: schema.medicalRecords.id,
        withDoctor: schema.medicalRecords.doctorId,
      })
      .from(schema.medicalRecords)
      .where(eq(schema.medicalRecords.tenantId, TENANT_ID));

    const totalRecords = stats.length;
    const recordsWithDoctorCount = stats.filter(s => s.withDoctor !== null).length;
    const recordsWithoutDoctorCount = totalRecords - recordsWithDoctorCount;

    console.log('\n📊 Финальная статистика:');
    console.log(`   Всего записей: ${totalRecords}`);
    console.log(`   С доктором: ${recordsWithDoctorCount} (${Math.round((recordsWithDoctorCount/totalRecords)*100)}%)`);
    console.log(`   Без доктора: ${recordsWithoutDoctorCount} (${Math.round((recordsWithoutDoctorCount/totalRecords)*100)}%)`);

  } catch (error) {
    console.error('\n❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await vetaisClient.end();
  }

  process.exit(0);
}

linkDoctors();
