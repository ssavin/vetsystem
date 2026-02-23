#!/usr/bin/env tsx

/**
 * Упрощённая миграция пациентов из Vetais
 * Использует прямую ссылку id_majitele вместо bridge таблицы
 */

import { Client } from 'pg';

const BATCH_SIZE = 2000;
const TENANT_ID = process.argv[2] || 'default-tenant-001';
const BRANCH_ID = process.argv[3] && process.argv[3] !== 'null' ? process.argv[3] : null;
const VETAIS_DB_NAME = process.argv[4] || process.env.VETAIS_DB_NAME || 'vetais_alisavet';

const CLINIC_TO_BRANCH: Record<number, string> = {
  10000: '280fcff4-2e1c-43d7-8ae5-6a48d288e518',
  10001: '48ef0926-7fc3-4c82-b1b9-d8cb6d787ee8',
  10002: 'c59ff876-d0c9-4220-b782-de28bdd0329c',
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

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   МИГРАЦИЯ ПАЦИЕНТОВ ИЗ VETAIS (УПРОЩЁННАЯ)               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`  Tenant: ${TENANT_ID}`);
  console.log(`  Branch: ${BRANCH_ID || 'auto'}`);
  console.log(`  Vetais DB: ${VETAIS_DB_NAME}\n`);

  const vetsystemDb = new Client({ connectionString: process.env.DATABASE_URL });
  const vetaisDb = new Client({
    host: process.env.VETAIS_DB_HOST,
    port: parseInt(process.env.VETAIS_DB_PORT || '5454'),
    database: VETAIS_DB_NAME,
    user: process.env.VETAIS_DB_USER,
    password: process.env.VETAIS_DB_PASSWORD,
  });

  try {
    console.log('🔌 Подключение к базам данных...');
    await vetsystemDb.connect();
    await vetaisDb.connect();
    console.log('✅ Подключение успешно!\n');

    // Маппинг владельцев
    console.log('📊 Загрузка маппинга владельцев...');
    const ownersResult = await vetsystemDb.query(
      'SELECT vetais_id, id FROM owners WHERE tenant_id = $1 AND vetais_id IS NOT NULL',
      [TENANT_ID]
    );
    const ownerMap = new Map<number, string>();
    ownersResult.rows.forEach(row => {
      ownerMap.set(parseInt(row.vetais_id), row.id);
    });
    console.log(`✅ Найдено ${ownerMap.size} владельцев\n`);

    // Загрузка уже мигрированных пациентов
    console.log('📊 Загрузка мигрированных пациентов...');
    const migratedResult = await vetsystemDb.query(
      'SELECT vetais_id FROM patients WHERE tenant_id = $1 AND vetais_id IS NOT NULL',
      [TENANT_ID]
    );
    const migratedIds = new Set<number>();
    migratedResult.rows.forEach(row => {
      migratedIds.add(parseInt(row.vetais_id));
    });
    console.log(`✅ Уже мигрировано: ${migratedIds.size} пациентов\n`);

    // Подсчёт всего
    const countResult = await vetaisDb.query(
      'SELECT COUNT(*) FROM file_patients WHERE vymaz = 0 AND id_majitele IS NOT NULL'
    );
    const totalCount = parseInt(countResult.rows[0].count);
    console.log(`📊 Всего пациентов для миграции: ${totalCount}\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    let offset = 0;

    while (offset < totalCount) {
      console.log(`\n🔄 Батч ${Math.floor(offset / BATCH_SIZE) + 1}/${Math.ceil(totalCount / BATCH_SIZE)} (${offset + 1}-${Math.min(offset + BATCH_SIZE, totalCount)})...`);

      const patientsResult = await vetaisDb.query(`
        SELECT 
          p.id_pacienta,
          p.jmenop as name,
          p.id_majitele as owner_id,
          p.id_zvire as species_id,
          p.id_rasa as breed_id,
          pb.nazev as breed_name,
          p.id_pohlavi as sex_id,
          p.narozen as birth_date,
          p.cip as microchip,
          p.poz as notes,
          p.id_kliniky as clinic_id
        FROM file_patients p
        LEFT JOIN patient_breeds pb ON pb.id_rasa = p.id_rasa AND pb.vymaz = 0
        WHERE p.vymaz = 0 AND p.id_majitele IS NOT NULL
        ORDER BY p.id_pacienta
        LIMIT $1 OFFSET $2
      `, [BATCH_SIZE, offset]);

      if (patientsResult.rows.length === 0) break;

      for (const patient of patientsResult.rows) {
        // Проверка на уже мигрированного
        if (migratedIds.has(patient.id_pacienta)) {
          skipped++;
          continue;
        }

        // Проверка владельца
        const vetsystemOwnerId = ownerMap.get(patient.owner_id);
        if (!vetsystemOwnerId) {
          errors++;
          if (errors <= 10) {
            console.log(`   ⚠️  Владелец ${patient.owner_id} не найден для пациента ${patient.id_pacienta}`);
          }
          continue;
        }

        const branchId = BRANCH_ID || CLINIC_TO_BRANCH[patient.clinic_id] || null;

        // Подготовка даты рождения
        let birthDate: Date | null = null;
        if (patient.birth_date) {
          const date = new Date(patient.birth_date);
          if (date.getFullYear() > 1950 && date.getFullYear() < 2030) {
            birthDate = date;
          }
        }

        try {
          // Вставка пациента
          const insertResult = await vetsystemDb.query(`
            INSERT INTO patients (
              tenant_id, branch_id, name, species, breed, gender,
              birth_date, microchip_number, special_marks, vetais_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
          `, [
            TENANT_ID,
            branchId,
            patient.name?.trim() || 'Без имени',
            mapSpecies(patient.species_id),
            patient.breed_name?.trim() || null,
            mapSex(patient.sex_id),
            birthDate,
            patient.microchip?.trim() || null,
            patient.notes?.trim() || null,
            patient.id_pacienta.toString()
          ]);

          const patientId = insertResult.rows[0].id;

          // Создание связи patient-owner
          await vetsystemDb.query(`
            INSERT INTO patient_owners (patient_id, owner_id, is_primary)
            VALUES ($1, $2, true)
          `, [patientId, vetsystemOwnerId]);

          migrated++;
          
          if (migrated % 100 === 0) {
            console.log(`   ✅ Мигрировано: ${migrated}`);
          }
        } catch (error) {
          errors++;
          if (errors <= 10) {
            console.error(`   ❌ Ошибка для пациента ${patient.id_pacienta}:`, error);
          }
        }
      }

      offset += BATCH_SIZE;
      console.log(`   📊 Прогресс: ${Math.min(offset, totalCount)}/${totalCount} (${Math.round(Math.min(offset, totalCount)/totalCount*100)}%)`);
    }

    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('✅ МИГРАЦИЯ ЗАВЕРШЕНА!');
    console.log(`📊 Всего обработано: ${migrated + skipped + errors}`);
    console.log(`✅ Мигрировано: ${migrated}`);
    console.log(`⏭️  Пропущено (уже есть): ${skipped}`);
    console.log(`❌ Ошибок: ${errors}`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
  } finally {
    await vetsystemDb.end();
    await vetaisDb.end();
  }
}

main();
