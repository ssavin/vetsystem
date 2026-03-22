#!/usr/bin/env tsx

/**
 * Миграция данных из базы arutyn1 (Усатый Полосатый) в VetSystem
 * 
 * Тенант:   Усатый Полосатый (06d235e4-e7ba-4b2c-87a2-77afc72c4358)
 * Филиал 1: Дрожжино  (fde48131-9495-478f-806b-274fa1fcbdba) ← clinic_id=10000, -1
 * Филиал 2: Остафьево (7b46d4f5-7cb3-404c-8642-e3d025a281b8) ← clinic_id=10001
 * 
 * Использование:
 *   tsx scripts/migrate-arutyn1.ts [owners|patients|all]
 */

import { Client } from 'pg';

const TENANT_ID = '06d235e4-e7ba-4b2c-87a2-77afc72c4358';
const BRANCH_DROZHZHINO = 'fde48131-9495-478f-806b-274fa1fcbdba'; // clinic_id=10000, -1
const BRANCH_OSTAFYEVO = '7b46d4f5-7cb3-404c-8642-e3d025a281b8';  // clinic_id=10001
const BATCH_SIZE = 500;
const MODE = process.argv[2] || 'all'; // owners | patients | all

function getBranchId(clinicId: number | null): string {
  if (clinicId === 10001) return BRANCH_OSTAFYEVO;
  return BRANCH_DROZHZHINO; // 10000, -1, null → Дрожжино (основная)
}

function cleanPhone(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.trim().replace(/[^\d+]/g, '');
  return cleaned.length >= 10 ? cleaned : null;
}

function cleanEmail(email: string | null): string | null {
  if (!email) return null;
  if (email.toLowerCase().trim() === 'х') return null;
  const firstEmail = email.split(',')[0].trim();
  if (firstEmail.includes('@') && firstEmail.includes('.')) return firstEmail;
  return null;
}

function buildAddress(adresar: string | null, mesto: string | null): string | null {
  const parts: string[] = [];
  if (mesto && mesto !== '*' && mesto.trim()) parts.push(mesto.trim());
  if (adresar && adresar !== '*' && adresar.toLowerCase() !== 'null' && adresar.trim()) parts.push(adresar.trim());
  return parts.length > 0 ? parts.join(', ') : null;
}

function buildFullName(surname: string | null, firstName: string | null, patronymic: string | null): string | null {
  const parts: string[] = [];
  if (surname?.trim()) parts.push(surname.trim());
  if (firstName?.trim()) parts.push(firstName.trim());
  if (patronymic?.trim()) parts.push(patronymic.trim());
  return parts.length > 0 ? parts.join(' ') : null;
}

async function migrateOwners(vetsystemDb: Client, arutynDb: Client): Promise<Map<number, string>> {
  console.log('\n════════════════════════════════════════');
  console.log('  МИГРАЦИЯ ВЛАДЕЛЬЦЕВ (КЛИЕНТОВ)');
  console.log('════════════════════════════════════════\n');

  const ownerMap = new Map<number, string>();

  const existingPhones = new Set<string>();
  const existingVetaisIds = new Map<number, string>();
  const existingResult = await vetsystemDb.query(
    'SELECT id, phone, vetais_id FROM owners WHERE tenant_id = $1',
    [TENANT_ID]
  );
  existingResult.rows.forEach(row => {
    if (row.phone) existingPhones.add(row.phone);
    if (row.vetais_id) existingVetaisIds.set(parseInt(row.vetais_id), row.id);
  });
  console.log(`Уже в системе: ${existingVetaisIds.size} клиентов`);

  const sourceResult = await arutynDb.query(`
    SELECT 
      kod_kado, nazev_kado, poznamka_kado, jmeno,
      telefon, mobil, email, adresar, mesto_k,
      no_pass, date_birth, gender_id, clinic_id
    FROM file_clients
    WHERE vymaz = 0
    ORDER BY kod_kado
  `);
  console.log(`Источник (arutyn1): ${sourceResult.rows.length} клиентов\n`);

  const toInsert: Array<{
    name: string; phone: string | null; email: string | null;
    address: string | null; passportNumber: string | null;
    dateOfBirth: Date | null; gender: string | null;
    vetaisId: number; branchId: string;
  }> = [];

  let skippedNoName = 0;
  let skippedNoPhone = 0;
  let skippedDuplicate = 0;
  let alreadyMigrated = 0;

  for (const row of sourceResult.rows) {
    const vetaisId = parseInt(row.kod_kado);

    if (existingVetaisIds.has(vetaisId)) {
      ownerMap.set(vetaisId, existingVetaisIds.get(vetaisId)!);
      alreadyMigrated++;
      continue;
    }

    const name = buildFullName(row.nazev_kado, row.poznamka_kado, row.jmeno);
    if (!name) { skippedNoName++; continue; }

    const phone = cleanPhone(row.mobil) || cleanPhone(row.telefon);
    if (!phone) { skippedNoPhone++; continue; }

    if (existingPhones.has(phone)) {
      skippedDuplicate++;
      continue;
    }

    const branchId = getBranchId(row.clinic_id);
    existingPhones.add(phone);

    toInsert.push({
      name: name.substring(0, 100),
      phone,
      email: cleanEmail(row.email),
      address: buildAddress(row.adresar, row.mesto_k),
      passportNumber: row.no_pass?.trim()?.substring(0, 50) || null,
      dateOfBirth: row.date_birth ? new Date(row.date_birth) : null,
      gender: row.gender_id === 1 ? 'male' : row.gender_id === 2 ? 'female' : null,
      vetaisId,
      branchId,
    });
  }

  console.log(`Уже мигрированы: ${alreadyMigrated}`);
  console.log(`К вставке: ${toInsert.length}`);
  console.log(`Пропущено (нет имени): ${skippedNoName}`);
  console.log(`Пропущено (нет телефона): ${skippedNoPhone}`);
  console.log(`Пропущено (дубликат тел.): ${skippedDuplicate}\n`);

  if (toInsert.length > 0) {
    console.log(`Batch-вставка (батчами по ${BATCH_SIZE})...`);
    let insertedCount = 0;

    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      const values: string[] = [];
      const params: any[] = [];
      let pi = 1;

      batch.forEach(item => {
        values.push(`($${pi++},$${pi++},$${pi++},$${pi++},$${pi++},$${pi++},$${pi++},$${pi++},$${pi++},$${pi++},NOW(),NOW())`);
        params.push(TENANT_ID, item.name, item.phone, item.email, item.address,
          item.passportNumber, item.dateOfBirth, item.gender, item.branchId, item.vetaisId);
      });

      const insertResult = await vetsystemDb.query(`
        INSERT INTO owners (tenant_id, name, phone, email, address, passport_number, date_of_birth, gender, branch_id, vetais_id, created_at, updated_at)
        VALUES ${values.join(', ')}
        RETURNING id, vetais_id
      `, params);

      insertResult.rows.forEach(row => {
        ownerMap.set(parseInt(row.vetais_id), row.id);
      });

      insertedCount += batch.length;
      process.stdout.write(`\r  Вставлено: ${insertedCount} / ${toInsert.length} (${Math.round(insertedCount / toInsert.length * 100)}%)`);
    }
    console.log(`\n✅ Владельцев вставлено: ${insertedCount}`);
  }

  existingVetaisIds.forEach((id, vetaisId) => {
    if (!ownerMap.has(vetaisId)) ownerMap.set(vetaisId, id);
  });

  return ownerMap;
}

async function migratePatients(vetsystemDb: Client, arutynDb: Client, ownerMap: Map<number, string>): Promise<void> {
  console.log('\n════════════════════════════════════════');
  console.log('  МИГРАЦИЯ ПАЦИЕНТОВ');
  console.log('════════════════════════════════════════\n');

  const existingVetaisIds = new Set<number>();
  const existingResult = await vetsystemDb.query(
    'SELECT vetais_id FROM patients WHERE tenant_id = $1 AND vetais_id IS NOT NULL',
    [TENANT_ID]
  );
  existingResult.rows.forEach(row => existingVetaisIds.add(parseInt(row.vetais_id)));
  console.log(`Уже в системе: ${existingVetaisIds.size} пациентов`);

  // Справочник видов животных (patient_species в arutyn1)
  const speciesResult = await arutynDb.query('SELECT id_zvire, nazev FROM patient_species WHERE vymaz=0');
  const speciesMap = new Map<number, string>();
  speciesResult.rows.forEach(row => speciesMap.set(row.id_zvire, row.nazev));

  // Справочник пород (patient_breeds в arutyn1)
  const breedResult = await arutynDb.query('SELECT id_rasa, nazev FROM patient_breeds WHERE vymaz=0');
  const breedMap = new Map<number, string>();
  breedResult.rows.forEach(row => breedMap.set(row.id_rasa, row.nazev));

  const sourceResult = await arutynDb.query(`
    SELECT id_pacienta, jmenop, id_majitele, id_zvire, id_rasa,
           id_pohlavi, narozen, zemrel, cip, clinic_id
    FROM file_patients
    WHERE vymaz = 0
    ORDER BY id_pacienta
  `);
  console.log(`Источник (arutyn1): ${sourceResult.rows.length} пациентов\n`);

  const toInsert: Array<{
    name: string; ownerId: string; species: string; breed: string | null;
    gender: string | null; birthDate: Date | null;
    microchipNumber: string | null; vetaisId: number; branchId: string;
  }> = [];

  let skippedNoName = 0;
  let skippedNoOwner = 0;
  let alreadyMigrated = 0;

  for (const row of sourceResult.rows) {
    const vetaisId = parseInt(row.id_pacienta);
    if (existingVetaisIds.has(vetaisId)) { alreadyMigrated++; continue; }

    const name = row.jmenop?.trim();
    if (!name) { skippedNoName++; continue; }

    const ownerId = ownerMap.get(parseInt(row.id_majitele));
    if (!ownerId) { skippedNoOwner++; continue; }

    const species = speciesMap.get(row.id_zvire) || 'Не указан';
    const breed = breedMap.get(row.id_rasa) || null;
    const gender = row.id_pohlavi === 1 ? 'male' : row.id_pohlavi === 2 ? 'female' : null;
    const birthDate = row.narozen ? new Date(row.narozen) : null;
    const microchipNumber = row.cip?.trim() || null;
    const branchId = getBranchId(row.clinic_id);

    toInsert.push({ name: name.substring(0, 100), ownerId, species, breed, gender, birthDate, microchipNumber, vetaisId, branchId });
  }

  console.log(`Уже мигрированы: ${alreadyMigrated}`);
  console.log(`К вставке: ${toInsert.length}`);
  console.log(`Пропущено (нет имени): ${skippedNoName}`);
  console.log(`Пропущено (нет владельца): ${skippedNoOwner}\n`);

  if (toInsert.length > 0) {
    console.log(`Batch-вставка (батчами по ${BATCH_SIZE})...`);
    let insertedCount = 0;

    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      const values: string[] = [];
      const params: any[] = [];
      let pi = 1;

      batch.forEach(item => {
        values.push(`($${pi++},$${pi++},$${pi++},$${pi++},$${pi++},$${pi++},$${pi++},$${pi++},$${pi++},$${pi++},NOW(),NOW())`);
        params.push(TENANT_ID, item.ownerId, item.name, item.species, item.breed,
          item.gender, item.birthDate, item.microchipNumber, item.branchId, item.vetaisId);
      });

      await vetsystemDb.query(`
        INSERT INTO patients (tenant_id, owner_id, name, species, breed, gender, birth_date, microchip_number, branch_id, vetais_id, created_at, updated_at)
        VALUES ${values.join(', ')}
        ON CONFLICT DO NOTHING
      `, params);

      insertedCount += batch.length;
      process.stdout.write(`\r  Вставлено: ${insertedCount} / ${toInsert.length} (${Math.round(insertedCount / toInsert.length * 100)}%)`);
    }
    console.log(`\n✅ Пациентов вставлено: ${insertedCount}`);
  }
}

async function migrateDoctors(vetsystemDb: Client, arutynDb: Client): Promise<void> {
  console.log('\n════════════════════════════════════════');
  console.log('  МИГРАЦИЯ ВРАЧЕЙ');
  console.log('════════════════════════════════════════\n');

  const sourceResult = await arutynDb.query(`
    SELECT kod_uzivatele, prijmeni, jmeno, otcestvo, email, mobile, telefon, id_kliniky
    FROM system_users
    WHERE is_doctor = 1 AND vymaz = 0
    ORDER BY id_kliniky, prijmeni
  `);
  console.log(`Источник (arutyn1): ${sourceResult.rows.length} врачей\n`);

  let inserted = 0;
  let skipped = 0;

  for (const row of sourceResult.rows) {
    const nameParts = [row.prijmeni, row.jmeno, row.otcestvo].filter(p => p?.trim());
    const name = nameParts.join(' ').trim();
    if (!name || name.toLowerCase() === 'administrator' || name.toLowerCase().includes('техподдержка')) {
      skipped++;
      continue;
    }

    const branchId = getBranchId(row.id_kliniky);
    const phone = cleanPhone(row.mobile) || cleanPhone(row.telefon);
    const email = cleanEmail(row.email);

    await vetsystemDb.query(`
      INSERT INTO doctors (tenant_id, branch_id, name, phone, email, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [TENANT_ID, branchId, name, phone, email]);

    inserted++;
    console.log(`  ✅ ${name}`);
  }

  console.log(`\n✅ Врачей добавлено: ${inserted}`);
  console.log(`⚠️  Пропущено: ${skipped}`);
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   МИГРАЦИЯ: Усатый Полосатый (arutyn1)                   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`Тенант:    ${TENANT_ID}`);
  console.log(`Режим:     ${MODE}`);
  console.log(`Дрожжино:  ${BRANCH_DROZHZHINO}`);
  console.log(`Остафьево: ${BRANCH_OSTAFYEVO}\n`);

  const vetsystemDb = new Client({ connectionString: process.env.DATABASE_URL });
  const arutynDb = new Client({
    host: process.env.VETAIS_DB_HOST,
    port: parseInt(process.env.VETAIS_DB_PORT || '5454'),
    database: 'arutyn1',
    user: process.env.VETAIS_DB_USER,
    password: process.env.VETAIS_DB_PASSWORD,
  });

  try {
    console.log('Подключение к базам данных...');
    await vetsystemDb.connect();
    await arutynDb.connect();
    console.log('✅ Подключение успешно!\n');

    let ownerMap = new Map<number, string>();

    if (MODE === 'owners' || MODE === 'all') {
      ownerMap = await migrateOwners(vetsystemDb, arutynDb);
    } else {
      const result = await vetsystemDb.query(
        'SELECT id, vetais_id FROM owners WHERE tenant_id = $1 AND vetais_id IS NOT NULL',
        [TENANT_ID]
      );
      result.rows.forEach(row => ownerMap.set(parseInt(row.vetais_id), row.id));
      console.log(`Загружена карта владельцев: ${ownerMap.size}`);
    }

    if (MODE === 'patients' || MODE === 'all') {
      await migratePatients(vetsystemDb, arutynDb, ownerMap);
    }

    if (MODE === 'doctors' || MODE === 'all') {
      await migrateDoctors(vetsystemDb, arutynDb);
    }

    console.log('\n✨ Миграция завершена!\n');

  } catch (err: any) {
    console.error('\n❌ Ошибка:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await arutynDb.end();
    await vetsystemDb.end();
  }
}

main().catch(console.error);
