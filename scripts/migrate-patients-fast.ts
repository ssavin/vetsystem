import postgres from 'postgres';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';

const TENANT_ID = 'default-tenant-001';
const BATCH_SIZE = 1000;

const CLINIC_TO_BRANCH: Record<number, string> = {
  10000: '280fcff4-2e1c-43d7-8ae5-6a48d288e518', // Бутово
  10001: '48ef0926-7fc3-4c82-b1b9-d8cb6d787ee8', // Лобачевского
  10002: 'c59ff876-d0c9-4220-b782-de28bdd0329c', // Новопеределкино
};

const SPECIES_MAP: Record<number, string> = {
  1: 'dog',
  2: 'cat',
  3: 'horse',
  4: 'bird',
  5: 'rodent',
  6: 'rabbit',
  7: 'reptile',
  8: 'exotic',
};

const SEX_MAP: Record<number, string> = {
  1: 'male',
  2: 'female',
  3: 'male',
  4: 'female',
  5: 'female',
  6: 'male',
};

function mapSpecies(id: number | null): string {
  if (!id || id === -1) return 'other';
  return SPECIES_MAP[id] || 'other';
}

function mapSex(id: number | null): string {
  if (!id || id === -1) return 'unknown';
  return SEX_MAP[id] || 'unknown';
}

async function migrate() {
  const vetaisClient = postgres({
    host: process.env.VETAIS_DB_HOST!,
    port: parseInt(process.env.VETAIS_DB_PORT!),
    database: process.env.VETAIS_DB_NAME!,
    username: process.env.VETAIS_DB_USER!,
    password: process.env.VETAIS_DB_PASSWORD!,
  });

  const vetsystemDb = drizzle(neon(process.env.DATABASE_URL!), { schema });

  console.log('🔄 Загрузка владельцев...');
  const owners = await vetsystemDb
    .select({ id: schema.owners.id, vetaisId: schema.owners.vetaisId })
    .from(schema.owners)
    .where(eq(schema.owners.tenantId, TENANT_ID));
  
  const ownerMap = new Map(
    owners
      .filter((o): o is typeof o & { vetaisId: string } => o.vetaisId !== null)
      .map(o => [parseInt(o.vetaisId), o.id])
  );

  console.log(`✅ ${ownerMap.size} владельцев\n`);

  console.log('🔄 Загрузка мигрированных пациентов...');
  const migrated = await vetsystemDb
    .select({ vetaisId: schema.patients.vetaisId })
    .from(schema.patients)
    .where(eq(schema.patients.tenantId, TENANT_ID));
  
  const migratedSet = new Set(
    migrated
      .filter((p): p is typeof p & { vetaisId: string } => p.vetaisId !== null)
      .map(p => parseInt(p.vetaisId))
  );

  console.log(`✅ Уже: ${migratedSet.size} пациентов\n`);

  const total = await vetaisClient`SELECT COUNT(*) as count FROM file_patients WHERE vymaz = 0`;
  const totalCount = parseInt(total[0].count);
  console.log(`📊 Всего: ${totalCount} пациентов\n`);

  let processed = 0;
  let inserted = 0;
  let offset = 0;

  while (offset < totalCount) {
    const patients = await vetaisClient`
      SELECT p.id_pacienta, p.jmenop as name, p.id_majitele as owner_id, p.id_zvire as species_id,
             pb.nazev as breed_name, p.id_pohlavi as sex_id, p.narozen as birth_date,
             p.cip as microchip, p.poz as notes, p.id_kliniky as clinic_id
      FROM file_patients p
      LEFT JOIN patient_breeds pb ON pb.id_rasa = p.id_rasa AND pb.vymaz = 0
      WHERE p.vymaz = 0 AND p.id_majitele IS NOT NULL
      ORDER BY p.id_pacienta
      LIMIT ${BATCH_SIZE} OFFSET ${offset}
    `;

    const toInsert: Array<{ patient: any; ownerId: string }> = [];

    for (const patient of patients) {
      if (migratedSet.has(patient.id_pacienta)) continue;

      const ownerId = ownerMap.get(patient.owner_id);
      if (!ownerId) continue;

      const branchId = CLINIC_TO_BRANCH[patient.clinic_id] || null;

      // Обработка даты рождения
      let birthDate: Date | null = null;
      if (patient.birth_date) {
        const date = new Date(patient.birth_date);
        if (date.getFullYear() > 1950 && date.getFullYear() < 2030) {
          birthDate = date;
        }
      }

      toInsert.push({
        ownerId,
        patient: {
          tenantId: TENANT_ID,
          branchId,
          name: (patient.name?.trim() || 'Без имени').substring(0, 255),
          species: mapSpecies(patient.species_id),
          breed: patient.breed_name?.trim()?.substring(0, 255) || null,
          gender: mapSex(patient.sex_id),
          birthDate,
          microchipNumber: patient.microchip?.trim()?.substring(0, 100) || null,
          specialMarks: patient.notes?.trim()?.substring(0, 1000) || null,
          vetaisId: patient.id_pacienta.toString(),
        }
      });
    }

    if (toInsert.length > 0) {
      const patientData = toInsert.map(item => item.patient);
      const result = await vetsystemDb.insert(schema.patients).values(patientData).returning({ id: schema.patients.id });
      
      // Создать patient_owners связи
      const patientOwners = result.map((r, idx) => ({
        patientId: r.id,
        ownerId: toInsert[idx].ownerId,
        isPrimary: true,
      }));
      
      await vetsystemDb.insert(schema.patientOwners).values(patientOwners);
      inserted += toInsert.length;
    }

    processed += patients.length;
    offset += BATCH_SIZE;

    const pct = Math.round((processed / totalCount) * 100);
    console.log(`📊 ${processed}/${totalCount} (${pct}%) | +${toInsert.length} | Всего: ${inserted + migratedSet.size}`);
  }

  console.log(`\n✅ ГОТОВО: ${inserted} новых пациентов`);
  process.exit(0);
}

migrate();
