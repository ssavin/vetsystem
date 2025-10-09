#!/usr/bin/env tsx

import postgres from 'postgres';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';

const TENANT_ID = 'default-tenant-001';

async function analyzeMissingDoctors() {
  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  const vetsystemDb = drizzle(neon(process.env.DATABASE_URL!), { schema });

  try {
    // Загрузить всех пользователей с vetais_id
    const users = await vetsystemDb
      .select({ vetaisId: schema.users.vetaisId })
      .from(schema.users)
      .where(eq(schema.users.tenantId, TENANT_ID));
    
    const userVetaisIds = new Set(
      users
        .filter(u => u.vetaisId !== null)
        .map(u => u.vetaisId)
    );
    
    console.log(`👥 Пользователей с vetais_id: ${userVetaisIds.size}\n`);

    // Загрузить уникальные id_doctor из Vetais
    const uniqueDoctors = await vetaisClient`
      SELECT DISTINCT id_doctor
      FROM medical_exams
      WHERE id_doctor IS NOT NULL AND id_doctor != 0
      ORDER BY id_doctor
    `;
    
    console.log(`🩺 Уникальных докторов в Vetais: ${uniqueDoctors.length}\n`);
    
    // Найти отсутствующих
    const missing: number[] = [];
    const found: number[] = [];
    
    for (const doc of uniqueDoctors) {
      if (userVetaisIds.has(doc.id_doctor)) {
        found.push(doc.id_doctor);
      } else {
        missing.push(doc.id_doctor);
      }
    }
    
    console.log(`✅ Докторов найдено в users: ${found.length}`);
    console.log(`❌ Докторов отсутствует: ${missing.length}\n`);
    
    if (missing.length > 0) {
      console.log(`📋 Отсутствующие ID докторов (первые 20):`);
      console.log(missing.slice(0, 20).join(', '));
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await vetaisClient.end();
  }
}

analyzeMissingDoctors();
