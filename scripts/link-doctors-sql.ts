#!/usr/bin/env tsx

import postgres from 'postgres';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';

const TENANT_ID = 'default-tenant-001';
const BATCH_SIZE = 5000;

async function linkDoctorsSQL() {
  console.log('🔗 Связывание медицинских записей с докторами (SQL BATCH)...\n');

  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  const vetsystemDb = drizzle(neon(process.env.DATABASE_URL!), { schema });
  const vetsystemSql = neon(process.env.DATABASE_URL!);

  try {
    // 1. Загрузить маппинг всех пользователей с vetais_id
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

    // 2. Загрузить exam из Vetais с id_doctor
    console.log('📊 Загрузка exam из Vetais...');
    const vetaisExams = await vetaisClient`
      SELECT id, id_doctor
      FROM medical_exams
      WHERE id_doctor IS NOT NULL AND id_doctor != 0
    `;
    
    console.log(`✅ Загружено ${vetaisExams.length} exam с докторами\n`);

    // 3. Создать массив обновлений
    console.log('🔍 Подготовка обновлений...');
    const updates: Array<{ recordVetaisId: string; doctorId: string }> = [];
    
    for (const exam of vetaisExams) {
      const doctorId = doctorMap.get(exam.id_doctor.toString());
      if (doctorId) {
        updates.push({
          recordVetaisId: exam.id.toString(),
          doctorId
        });
      }
    }
    
    console.log(`✅ Подготовлено ${updates.length} обновлений\n`);

    // 4. Выполнить батч-обновления через SQL
    console.log('🔗 Обновление записей батчами...\n');
    
    let totalUpdated = 0;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      
      // Создать CASE WHEN для батча
      const caseWhen = batch
        .map(u => `WHEN '${u.recordVetaisId}' THEN '${u.doctorId}'`)
        .join('\n        ');
      
      const vetaisIds = batch.map(u => `'${u.recordVetaisId}'`).join(', ');
      
      const sql = `
        UPDATE medical_records
        SET doctor_id = CASE vetais_id
          ${caseWhen}
        END
        WHERE tenant_id = '${TENANT_ID}'
          AND vetais_id IN (${vetaisIds})
          AND doctor_id IS NULL
      `;
      
      const result = await vetsystemSql(sql);
      const count = result.length || batch.length;
      totalUpdated += count;
      
      console.log(`   ✅ Обновлено: ${totalUpdated} / ${updates.length}`);
    }

    console.log(`\n✅ ГОТОВО: ${totalUpdated} записей связаны с докторами\n`);

    // 5. Финальная статистика
    const statsResult = await vetsystemSql`
      SELECT 
        COUNT(*) as total,
        COUNT(doctor_id) as with_doctor
      FROM medical_records
      WHERE tenant_id = ${TENANT_ID}
    `;
    
    const stats = statsResult[0];
    const total = parseInt(stats.total);
    const withDoctor = parseInt(stats.with_doctor);
    const withoutDoctor = total - withDoctor;

    console.log('📊 Финальная статистика:');
    console.log(`   Всего записей: ${total}`);
    console.log(`   С доктором: ${withDoctor} (${Math.round((withDoctor/total)*100)}%)`);
    console.log(`   Без доктора: ${withoutDoctor} (${Math.round((withoutDoctor/total)*100)}%)`);

  } catch (error) {
    console.error('\n❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await vetaisClient.end();
  }

  process.exit(0);
}

linkDoctorsSQL();
