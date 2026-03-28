#!/usr/bin/env tsx

/**
 * Миграция пациентов из Vetais в VetSystem с поддержкой multi-owner
 * 
 * Этапы:
 * 1. Создание маппинга Vetais client_id → VetSystem owner_id
 * 2. Миграция пациентов из file_patients
 * 3. Создание связей patient-owner через file_bridge_clients_patients
 * 4. Первый владелец в списке становится primary owner
 * 
 * Использование:
 *   tsx scripts/migrate-vetais-patients.ts [tenantId] [batchSize]
 */

import { Client } from 'pg';

const BATCH_SIZE = parseInt(process.argv[3] || '2000'); // Увеличен для faster migration

// Маппинг видов животных Vetais → VetSystem
const SPECIES_MAP: Record<number, string> = {
  1: 'dog',        // Собака
  2: 'cat',        // Кошка
  3: 'horse',      // Лошадь
  4: 'bird',       // Птица
  5: 'rodent',     // Грызун
  6: 'rabbit',     // Кролик
  7: 'reptile',    // Рептилия
  8: 'exotic',     // Экзотика
  // Добавьте другие виды по необходимости
};

// Маппинг пола Vetais → VetSystem
const SEX_MAP: Record<number, string> = {
  1: 'male',           // Кобель/Самец
  2: 'female',         // Сука/Самка
  3: 'male',           // Самец (универсальный)
  4: 'female',         // Самка (универсальная)
  5: 'female',         // Стерилизированная
  6: 'male',           // Кастрированный
  '-1': 'unknown',     // Неизвестно
};

function mapSpecies(vetaisSpeciesId: number | null): string {
  if (!vetaisSpeciesId || vetaisSpeciesId === -1) return 'other';
  return SPECIES_MAP[vetaisSpeciesId] || 'other';
}

function mapSex(vetaisSexId: number | null): string {
  if (!vetaisSexId || vetaisSexId === -1) return 'unknown';
  return SEX_MAP[vetaisSexId] || 'unknown';
}

function cleanName(name: string | null): string {
  if (!name) return 'Без имени';
  const cleaned = name.trim();
  return cleaned.length > 0 ? cleaned : 'Без имени';
}

function cleanBreed(breed: string | null): string | null {
  if (!breed) return null;
  const cleaned = breed.trim();
  return cleaned.length > 0 && cleaned !== '-' ? cleaned : null;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   МИГРАЦИЯ ПАЦИЕНТОВ ИЗ VETAIS (MULTI-OWNER)                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const vetsystemDb = new Client({
    connectionString: process.env.DATABASE_URL
  });

  const vetaisDb = new Client({
    host: process.env.VETAIS_DB_HOST,
    port: parseInt(process.env.VETAIS_DB_PORT || '5432'),
    database: process.env.VETAIS_DB_NAME,
    user: process.env.VETAIS_DB_USER,
    password: process.env.VETAIS_DB_PASSWORD,
  });

  try {
    console.log('🔌 Подключение к базам данных...');
    await vetsystemDb.connect();
    await vetaisDb.connect();
    console.log('✅ Подключение успешно!\n');

    // Выбор tenant
    const tenantsResult = await vetsystemDb.query(
      'SELECT id, name, slug FROM tenants WHERE status = $1 ORDER BY name',
      ['active']
    );

    const tenantId = process.argv[2] || tenantsResult.rows[0].id;
    const selectedTenant = tenantsResult.rows.find(t => t.id === tenantId);
    
    if (!selectedTenant) {
      console.error(`❌ Клиника с ID ${tenantId} не найдена`);
      process.exit(1);
    }

    console.log(`✅ Клиника: ${selectedTenant.name}`);
    console.log(`✅ Размер батча: ${BATCH_SIZE}\n`);

    // ШАГ 1: Создание маппинга Vetais client_id → VetSystem owner_id через vetais_id
    console.log('📊 Создание маппинга владельцев...');
    
    const clientMapResult = await vetsystemDb.query(`
      SELECT vetais_id, id as vetsystem_id
      FROM owners
      WHERE tenant_id = $1 AND vetais_id IS NOT NULL
    `, [tenantId]);

    const clientIdMap = new Map<number, string>();
    clientMapResult.rows.forEach(row => {
      clientIdMap.set(parseInt(row.vetais_id), row.vetsystem_id);
    });

    console.log(`✅ Найдено ${clientIdMap.size} сопоставлений владельцев\n`);

    // ШАГ 1.5: Загрузка уже мигрированных пациентов
    console.log('📊 Загрузка уже мигрированных пациентов...');
    const migratedPatientsResult = await vetsystemDb.query(`
      SELECT vetais_id
      FROM patients
      WHERE tenant_id = $1 AND vetais_id IS NOT NULL
    `, [tenantId]);

    const migratedPatientIds = new Set<string>();
    migratedPatientsResult.rows.forEach(row => {
      migratedPatientIds.add(row.vetais_id);
    });

    console.log(`✅ Уже мигрировано: ${migratedPatientIds.size} пациентов\n`);

    // ШАГ 2: Пропускаем подсчет (медленно)
    console.log('📦 Начало миграции (подсчет пропущен для скорости)\n');

    // ШАГ 3: Получение маппинга филиалов (если есть)
    console.log('📊 Загрузка маппинга филиалов...');
    const branchMapResult = await vetsystemDb.query(`
      SELECT vetais_clinic_id, id as vetsystem_branch_id
      FROM branches
      WHERE tenant_id = $1 AND vetais_clinic_id IS NOT NULL
    `, [tenantId]);

    const branchIdMap = new Map<number, string>();
    branchMapResult.rows.forEach(row => {
      branchIdMap.set(parseInt(row.vetais_clinic_id), row.vetsystem_branch_id);
    });

    console.log(`✅ Найдено ${branchIdMap.size} сопоставлений филиалов\n`);

    // ШАГ 4: Миграция пациентов батчами
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let offset = 0;

    console.log('🚀 Начало миграции пациентов...\n');

    while (true) {
      // Получить батч пациентов с информацией о владельцах
      const patientsResult = await vetaisDb.query(`
        SELECT 
          p.id_pacienta,
          p.jmenop as name,
          p.id_zvire as species_id,
          p.id_rasa as breed_id,
          pb.nazev as breed_name,
          p.id_pohlavi as sex_id,
          p.narozen as birth_date,
          p.cip as microchip,
          p.poz as notes,
          p.clinic_id,
          p.department_id,
          ARRAY_AGG(
            bridge.id_klient ORDER BY bridge.id_most
          ) FILTER (WHERE bridge.id_klient IS NOT NULL AND (bridge.vymazk IS NULL OR bridge.vymazk = 0) AND (bridge.vymazp IS NULL OR bridge.vymazp = 0)) as owner_ids
        FROM file_patients p
        LEFT JOIN file_bridge_clients_patients bridge ON bridge.id_pacient = p.id_pacienta
        LEFT JOIN patient_breeds pb ON pb.id_rasa = p.id_rasa AND pb.vymaz = 0
        WHERE p.vymaz = 0
        GROUP BY p.id_pacienta, p.jmenop, p.id_zvire, p.id_rasa, pb.nazev, 
                 p.id_pohlavi, p.narozen, p.cip, p.poz, p.clinic_id, p.department_id
        ORDER BY p.id_pacienta
        LIMIT $1 OFFSET $2
      `, [BATCH_SIZE, offset]);

      if (patientsResult.rows.length === 0) break;

      for (const patient of patientsResult.rows) {
        try {
          // Проверить, не мигрирован ли уже этот пациент (через Set)
          if (migratedPatientIds.has(patient.id_pacienta.toString())) {
            skippedCount++;
            continue;
          }

          // Проверить наличие владельцев
          const ownersList = patient.owner_ids || [];
          if (ownersList.length === 0) {
            skippedCount++;
            continue;
          }

          // Преобразовать Vetais owner IDs в VetSystem owner IDs (сохраняя порядок)
          const vetsystemOwnerIds: string[] = [];
          for (const vetaisClientId of ownersList) {
            const vetsystemOwnerId = clientIdMap.get(parseInt(vetaisClientId));
            
            if (vetsystemOwnerId) {
              vetsystemOwnerIds.push(vetsystemOwnerId);
            }
          }

          if (vetsystemOwnerIds.length === 0) {
            skippedCount++;
            continue;
          }

          // Определить филиал
          let branchId: string | null = null;
          if (patient.clinic_id && branchIdMap.has(patient.clinic_id)) {
            branchId = branchIdMap.get(patient.clinic_id)!;
          }

          // Подготовить дату рождения
          let birthDate: Date | null = null;
          if (patient.birth_date) {
            const date = new Date(patient.birth_date);
            // Проверка на валидную дату (не 1900 и не 3000)
            if (date.getFullYear() > 1950 && date.getFullYear() < 2030) {
              birthDate = date;
            }
          }

          // Создать пациента
          const insertPatientResult = await vetsystemDb.query(`
            INSERT INTO patients (
              tenant_id,
              branch_id,
              name,
              species,
              breed,
              gender,
              birth_date,
              microchip_number,
              special_marks,
              vetais_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
          `, [
            tenantId,
            branchId,
            cleanName(patient.name),
            mapSpecies(patient.species_id),
            cleanBreed(patient.breed_name),
            mapSex(patient.sex_id),
            birthDate,
            patient.microchip || null,
            patient.notes || null,
            patient.id_pacienta.toString()
          ]);

          const newPatientId = insertPatientResult.rows[0].id;

          // Создать связи patient-owner (первый владелец - primary)
          for (let i = 0; i < vetsystemOwnerIds.length; i++) {
            const isPrimary = i === 0;
            
            await vetsystemDb.query(`
              INSERT INTO patient_owners (
                patient_id,
                owner_id,
                is_primary
              ) VALUES ($1, $2, $3)
            `, [newPatientId, vetsystemOwnerIds[i], isPrimary]);
          }

          migratedCount++;

          if (migratedCount % 100 === 0) {
            console.log(`   ✅ Обработано: ${migratedCount} пациентов`);
          }

        } catch (error: any) {
          console.error(`   ❌ Ошибка миграции пациента ID ${patient.id_pacienta}: ${error.message}`);
          errorCount++;
        }
      }

      offset += BATCH_SIZE;
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ МИГРАЦИЯ ЗАВЕРШЕНА!');
    console.log(`📊 Мигрировано пациентов: ${migratedCount}`);
    console.log(`⚠️  Пропущено: ${skippedCount}`);
    console.log(`❌ Ошибок: ${errorCount}`);
    console.log('═'.repeat(80) + '\n');

    // Статистика по владельцам
    const ownerStatsResult = await vetsystemDb.query(`
      WITH patient_stats AS (
        SELECT 
          po.patient_id,
          COUNT(*) as owner_count,
          COUNT(*) FILTER (WHERE po.is_primary = true) as primary_count
        FROM patient_owners po
        JOIN patients p ON p.id = po.patient_id
        WHERE p.tenant_id = $1 AND p.vetais_id IS NOT NULL
        GROUP BY po.patient_id
      )
      SELECT 
        COUNT(DISTINCT patient_id) as patients_with_owners,
        SUM(owner_count) as total_owner_links,
        SUM(primary_count) as primary_links,
        ROUND(AVG(owner_count), 2) as avg_owners_per_patient
      FROM patient_stats
    `, [tenantId]);

    if (ownerStatsResult.rows.length > 0) {
      const stats = ownerStatsResult.rows[0];
      console.log('📊 СТАТИСТИКА ВЛАДЕЛЬЦЕВ:');
      console.log(`   Пациентов с владельцами: ${stats.patients_with_owners || 0}`);
      console.log(`   Всего связей: ${stats.total_owner_links || 0}`);
      console.log(`   Первичных владельцев: ${stats.primary_links || 0}`);
      console.log(`   Среднее владельцев на пациента: ${stats.avg_owners_per_patient || 0}\n`);
    }

  } catch (error: any) {
    console.error('\n❌ Критическая ошибка:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await vetsystemDb.end();
    await vetaisDb.end();
  }
}

main().catch(console.error);
