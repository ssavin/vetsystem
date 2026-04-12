#!/usr/bin/env tsx

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║          УНИВЕРСАЛЬНЫЙ СКРИПТ МИГРАЦИИ ИЗ VETAIS                    ║
 * ║                                                                      ║
 * ║  Поддерживает все базы Vetais. Идемпотентен — безопасно запускать   ║
 * ║  повторно. Пропускает уже мигрированные записи по vetais_id.        ║
 * ║                                                                      ║
 * ║  Использование:                                                      ║
 * ║    tsx scripts/migrate-vetais-universal.ts \                        ║
 * ║      --tenant <tenantId> \                                          ║
 * ║      --db <dbname> \                                                ║
 * ║      [--host <host>] [--port <port>]                                ║
 * ║      [--user <user>] [--password <pass>]                            ║
 * ║      [--batch <size>] [--phase <owners|patients|doctors|all>]       ║
 * ║                                                                      ║
 * ║  Env vars (альтернатива CLI):                                        ║
 * ║    VETAIS_DB_HOST, VETAIS_DB_PORT, VETAIS_DB_USER,                  ║
 * ║    VETAIS_DB_PASSWORD, VETAIS_DB_NAME                               ║
 * ║                                                                      ║
 * ║  Пример:                                                             ║
 * ║    tsx scripts/migrate-vetais-universal.ts \                        ║
 * ║      --tenant bd89523e-47e7-4d4b-8b94-e98c6d3e1959 \               ║
 * ║      --db vetais_vasilek \                                          ║
 * ║      --host 94.198.53.52 --password vetais                          ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { Client } from 'pg';
import bcrypt from 'bcryptjs';

// ─── CLI парсинг ───────────────────────────────────────────────────────────
function getArg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

const TENANT_ID   = getArg('tenant') || '';
const VETAIS_DB   = getArg('db')     || process.env.VETAIS_DB_NAME || 'vetais_alisavet';
const VETAIS_HOST = getArg('host')   || process.env.VETAIS_DB_HOST || '45.128.206.134';
const VETAIS_PORT = parseInt(getArg('port') || process.env.VETAIS_DB_PORT || '5454');
const VETAIS_USER = getArg('user')   || process.env.VETAIS_DB_USER || 'postgres';
const VETAIS_PASS: string = String(getArg('password') ?? process.env.VETAIS_DB_PASSWORD ?? '');
const BATCH_SIZE  = parseInt(getArg('batch') || '1000');
const PHASE       = (getArg('phase') || 'all') as 'owners' | 'patients' | 'doctors' | 'all';

if (!TENANT_ID) {
  console.error('❌ Укажите --tenant <tenantId>');
  process.exit(1);
}

// ─── Маппинг видов животных ───────────────────────────────────────────────
const SPECIES_MAP: Record<number, string> = {
  // Стандартные Vetais
  1: 'dog', 2: 'cat', 3: 'horse', 4: 'bird', 5: 'rodent',
  6: 'rabbit', 7: 'reptile', 8: 'exotic', 9: 'fish', 10: 'other',
  // Расширенные id (у разных баз разные)
  10000: 'dog', 10001: 'cat', 10002: 'horse', 10003: 'bird',
  10004: 'rodent', 10005: 'rabbit', 10006: 'reptile', 10007: 'exotic',
  10008: 'fish', 10009: 'other', 10010: 'dog', 10011: 'cat',
  10012: 'other', 10013: 'other', 10014: 'cat', 10015: 'dog',
  10016: 'cat', 10017: 'dog', 10018: 'cat', 10019: 'dog', 10020: 'dog',
};

// ─── Маппинг пола из patient_sex (ключи — id_pohlavi) ────────────────────
// Заполняется динамически из таблицы patient_sex при старте
let SEX_MAP: Record<number, { gender: string; neutered: boolean }> = {
  // Стандартные значения (fallback)
  1: { gender: 'unknown', neutered: false },
  2: { gender: 'male',    neutered: false },
  3: { gender: 'female',  neutered: false },
  4: { gender: 'male',    neutered: false },
  5: { gender: 'female',  neutered: true  },
  6: { gender: 'male',    neutered: true  },
  8: { gender: 'male',    neutered: false },
  9: { gender: 'female',  neutered: false },
  10:{ gender: 'male',    neutered: true  },
  11:{ gender: 'female',  neutered: true  },
  '-1': { gender: 'unknown', neutered: false },
};

// ─── Утилиты ─────────────────────────────────────────────────────────────
function cleanPhone(p: string | null): string | null {
  if (!p) return null;
  const c = p.trim().replace(/[^\d+]/g, '');
  if (c.length < 7) return null;
  // Нормализация российских номеров
  if (c.startsWith('8') && c.length === 11) return '+7' + c.slice(1);
  if (c.startsWith('7') && c.length === 11) return '+' + c;
  if (c.length === 10) return '+7' + c;
  return c.length >= 7 ? c : null;
}

function cleanEmail(e: string | null): string | null {
  if (!e) return null;
  const first = e.split(/[,;]/)[0].trim().toLowerCase();
  if (first === 'х' || first === '-' || first === 'нет') return null;
  return first.includes('@') && first.includes('.') ? first : null;
}

function buildName(...parts: (string | null | undefined)[]): string | null {
  const r = parts.filter(p => p?.trim()).map(p => p!.trim()).join(' ');
  return r || null;
}

function buildAddress(...parts: (string | null | undefined)[]): string | null {
  const r = parts
    .filter(p => p?.trim() && p !== '*' && p?.toLowerCase() !== 'null')
    .map(p => p!.trim())
    .join(', ');
  return r || null;
}

function truncate(s: string | null, max: number): string | null {
  if (!s) return null;
  return s.length > max ? s.substring(0, max) : s;
}

function safeBirthDate(d: any): Date | null {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  if (year < 1950 || year > 2030) return null;
  return date;
}

function mapSpecies(id: number | null): string {
  if (!id || id === -1) return 'other';
  return SPECIES_MAP[id] || 'other';
}

function mapSex(id: number | null): { gender: string; neutered: boolean } {
  if (!id || id === -1) return { gender: 'unknown', neutered: false };
  return SEX_MAP[id] || { gender: 'unknown', neutered: false };
}

// ─── Статистика ────────────────────────────────────────────────────────────
const stats = {
  owners:   { inserted: 0, skipped_exists: 0, skipped_no_name: 0, errors: 0 },
  patients: { inserted: 0, skipped_exists: 0, skipped_no_owner: 0, errors: 0, no_branch: 0 },
  doctors:  { inserted: 0, inserted_staff: 0, skipped_exists: 0, errors: 0, users_inserted: 0, users_skipped: 0 },
};

// ─── Основная функция ──────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║        УНИВЕРСАЛЬНЫЙ СКРИПТ МИГРАЦИИ ИЗ VETAIS                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
  console.log(`  База Vetais : ${VETAIS_DB} @ ${VETAIS_HOST}:${VETAIS_PORT}`);
  console.log(`  Tenant ID   : ${TENANT_ID}`);
  console.log(`  Фаза        : ${PHASE}`);
  console.log(`  Batch size  : ${BATCH_SIZE}\n`);

  const vsDb = new Client({ connectionString: process.env.DATABASE_URL });
  const vtDb = new Client({
    host: VETAIS_HOST, port: VETAIS_PORT,
    database: VETAIS_DB, user: VETAIS_USER, password: VETAIS_PASS,
    connectionTimeoutMillis: 15000,
  });

  try {
    console.log('🔌 Подключение к базам данных...');
    await vsDb.connect();
    await vtDb.connect();
    console.log('✅ Подключено!\n');

    // Проверить тенант
    const tenantRow = await vsDb.query('SELECT id, name FROM tenants WHERE id = $1', [TENANT_ID]);
    if (tenantRow.rows.length === 0) {
      console.error(`❌ Тенант ${TENANT_ID} не найден`);
      process.exit(1);
    }
    console.log(`🏥 Клиника: ${tenantRow.rows[0].name}\n`);

    // Загрузить маппинг филиалов: vetais_clinic_id → branch_id
    const branchRows = await vsDb.query(
      'SELECT id, name, vetais_clinic_id FROM branches WHERE tenant_id = $1 AND vetais_clinic_id IS NOT NULL',
      [TENANT_ID]
    );
    const branchMap = new Map<number, string>();
    branchRows.rows.forEach(r => branchMap.set(parseInt(r.vetais_clinic_id), r.id));
    console.log(`📍 Филиалов с маппингом: ${branchMap.size}`);
    branchRows.rows.forEach(r => console.log(`   ${r.vetais_clinic_id} → ${r.name}`));
    console.log();

    // Загрузить patient_sex если таблица существует
    const hasSexTable = await vtDb.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='patient_sex') AS exists`
    );
    if (hasSexTable.rows[0].exists) {
      const sexRows = await vtDb.query(`SELECT id_pohlavi, nazev FROM patient_sex WHERE vymaz = 0`);
      for (const r of sexRows.rows) {
        const id = parseInt(r.id_pohlavi);
        const name = (r.nazev || '').toLowerCase();
        const isMale    = name.includes('самец') || name.includes(' м') || name === 'м';
        const isFemale  = name.includes('самка') || name.includes(' ж') || name === 'ж';
        const neutered  = name.includes('кастр') || name.includes('стерил');
        if (isMale)   SEX_MAP[id] = { gender: 'male',   neutered };
        else if (isFemale) SEX_MAP[id] = { gender: 'female', neutered };
        else          SEX_MAP[id] = { gender: 'unknown', neutered: false };
      }
      console.log(`🔤 Загружено ${sexRows.rows.length} значений пола\n`);
    }

    // ═══════════════════════════════════════════════════════
    // ФАЗА 1: ВЛАДЕЛЬЦЫ
    // ═══════════════════════════════════════════════════════
    if (PHASE === 'all' || PHASE === 'owners') {
      await migrateOwners(vsDb, vtDb, branchMap);
    }

    // ═══════════════════════════════════════════════════════
    // ФАЗА 2: ПАЦИЕНТЫ
    // ═══════════════════════════════════════════════════════
    if (PHASE === 'all' || PHASE === 'patients') {
      await migratePatients(vsDb, vtDb, branchMap);
    }

    // ═══════════════════════════════════════════════════════
    // ФАЗА 3: ВРАЧИ
    // ═══════════════════════════════════════════════════════
    if (PHASE === 'all' || PHASE === 'doctors') {
      await migrateDoctors(vsDb, vtDb, branchMap);
    }

    // ─── ИТОГ ─────────────────────────────────────────────
    console.log('\n' + '═'.repeat(72));
    console.log('📊 ИТОГИ МИГРАЦИИ');
    console.log('═'.repeat(72));
    if (PHASE === 'all' || PHASE === 'owners') {
      console.log(`\n👤 ВЛАДЕЛЬЦЫ`);
      console.log(`   ✅ Добавлено:          ${stats.owners.inserted}`);
      console.log(`   ⏭️  Уже было:           ${stats.owners.skipped_exists}`);
      console.log(`   ⚠️  Пропущено (нет имени): ${stats.owners.skipped_no_name}`);
      console.log(`   ❌ Ошибок:             ${stats.owners.errors}`);
    }
    if (PHASE === 'all' || PHASE === 'patients') {
      console.log(`\n🐾 ПАЦИЕНТЫ`);
      console.log(`   ✅ Добавлено:          ${stats.patients.inserted}`);
      console.log(`   ⏭️  Уже было:           ${stats.patients.skipped_exists}`);
      console.log(`   ⚠️  Без владельца:      ${stats.patients.skipped_no_owner}`);
      console.log(`   ⚠️  Без филиала:        ${stats.patients.no_branch}`);
      console.log(`   ❌ Ошибок:             ${stats.patients.errors}`);
    }
    if (PHASE === 'all' || PHASE === 'doctors') {
      console.log(`\n👨‍⚕️ ВРАЧИ И СОТРУДНИКИ`);
      console.log(`   ✅ Врачей добавлено:       ${stats.doctors.inserted}`);
      console.log(`   ✅ Сотрудников добавлено:  ${stats.doctors.inserted_staff}`);
      console.log(`   ⏭️  Уже было (doctors):    ${stats.doctors.skipped_exists}`);
      console.log(`   ✅ Users создано:          ${stats.doctors.users_inserted}`);
      console.log(`   ⏭️  Users уже были:        ${stats.doctors.users_skipped}`);
      console.log(`   ❌ Ошибок:                ${stats.doctors.errors}`);
    }
    console.log('\n✨ Миграция завершена!\n');

  } catch (err: any) {
    console.error('\n❌ Критическая ошибка:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await vtDb.end().catch(() => {});
    await vsDb.end().catch(() => {});
  }
}

// ─── Фаза 1: Владельцы ────────────────────────────────────────────────────
async function migrateOwners(vsDb: Client, vtDb: Client, branchMap: Map<number, string>) {
  console.log('━'.repeat(72));
  console.log('👤 ФАЗА 1: ВЛАДЕЛЬЦЫ (file_clients)');
  console.log('━'.repeat(72));

  // Загрузить уже мигрированные vetais_id
  const existingRes = await vsDb.query(
    'SELECT vetais_id FROM owners WHERE tenant_id = $1 AND vetais_id IS NOT NULL',
    [TENANT_ID]
  );
  const existing = new Set(existingRes.rows.map(r => r.vetais_id.toString()));
  console.log(`   Уже в системе: ${existing.size}`);

  // Загрузить всех клиентов из Vetais
  console.log('   Загрузка данных из Vetais...');
  const res = await vtDb.query(`
    SELECT
      kod_kado, nazev_kado, poznamka_kado, jmeno,
      telefon, mobil, email,
      adresar, mesto_k,
      poznamka,
      no_pass, date_birth, gender_id,
      no_contract, contract_validity,
      clinic_id, department_id,
      blok, vymaz
    FROM file_clients
    WHERE vymaz = 0
    ORDER BY kod_kado
  `);
  console.log(`   Найдено в Vetais: ${res.rows.length}`);

  let toInsert: any[] = [];

  for (const r of res.rows) {
    const vetaisId = r.kod_kado.toString();
    if (existing.has(vetaisId)) { stats.owners.skipped_exists++; continue; }

    // Имя: склеиваем фамилию (nazev_kado) + имя (poznamka_kado) + отчество (jmeno)
    const name = buildName(r.nazev_kado, r.poznamka_kado, r.jmeno);
    if (!name) { stats.owners.skipped_no_name++; continue; }

    const phone   = cleanPhone(r.mobil) || cleanPhone(r.telefon) || 'не указан';
    const email   = cleanEmail(r.email);
    const address = buildAddress(r.mesto_k, r.adresar);

    // Паспортные данные
    const passportNum = r.no_pass?.trim() ? truncate(r.no_pass.trim(), 50) : null;
    const birthDate   = safeBirthDate(r.date_birth);
    const gender      = r.gender_id === 1 ? 'male' : r.gender_id === 2 ? 'female' : null;

    // Определить филиал по clinic_id клиента
    const branchId = (r.clinic_id && branchMap.has(parseInt(r.clinic_id)))
      ? branchMap.get(parseInt(r.clinic_id))!
      : null;

    // Заблокирован?
    const notes = r.poznamka?.trim() || null;
    const contractNum = r.no_contract?.trim() ? truncate(r.no_contract.trim(), 100) : null;

    toInsert.push({
      vetaisId, name: truncate(name, 100)!, phone, email, address,
      passportNum, birthDate, gender, branchId, notes, contractNum,
    });
    existing.add(vetaisId);
  }

  console.log(`   Подготовлено к вставке: ${toInsert.length}`);

  // Batch вставка
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const values: string[] = [];
    const params: any[] = [];
    let p = 1;

    for (const item of batch) {
      values.push(`($${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},NOW(),NOW())`);
      params.push(
        TENANT_ID, item.vetaisId, item.name, item.phone, item.email,
        item.address, item.passportNum, item.birthDate, item.gender,
        item.branchId, item.notes,
      );
    }

    try {
      await vsDb.query(
        `INSERT INTO owners
          (tenant_id, vetais_id, name, phone, email, address, passport_number,
           date_of_birth, gender, branch_id, notes, created_at, updated_at)
         VALUES ${values.join(',')}
         ON CONFLICT DO NOTHING`,
        params
      );
      stats.owners.inserted += batch.length;
    } catch (e: any) {
      // При ошибке батча — вставляем по одному
      for (const item of batch) {
        try {
          await vsDb.query(
            `INSERT INTO owners
              (tenant_id, vetais_id, name, phone, email, address, passport_number,
               date_of_birth, gender, branch_id, notes, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
             ON CONFLICT DO NOTHING`,
            [TENANT_ID, item.vetaisId, item.name, item.phone, item.email,
             item.address, item.passportNum, item.birthDate, item.gender,
             item.branchId, item.notes]
          );
          stats.owners.inserted++;
        } catch (e2: any) {
          stats.owners.errors++;
          console.error(`   ❌ Ошибка владельца vetais_id=${item.vetaisId}: ${e2.message}`);
        }
      }
    }

    const done = Math.min(i + BATCH_SIZE, toInsert.length);
    process.stdout.write(`\r   ✅ ${done}/${toInsert.length} (${Math.round(done/toInsert.length*100)}%)`);
  }
  console.log('\n   ✅ Владельцы завершены\n');
}

// ─── Фаза 2: Пациенты ─────────────────────────────────────────────────────
async function migratePatients(vsDb: Client, vtDb: Client, branchMap: Map<number, string>) {
  console.log('━'.repeat(72));
  console.log('🐾 ФАЗА 2: ПАЦИЕНТЫ (file_patients + bridge)');
  console.log('━'.repeat(72));

  // Маппинг vetais owner_id → VetSystem owner_id
  const ownerMapRes = await vsDb.query(
    'SELECT vetais_id, id FROM owners WHERE tenant_id = $1 AND vetais_id IS NOT NULL',
    [TENANT_ID]
  );
  const ownerMap = new Map<number, string>();
  ownerMapRes.rows.forEach(r => ownerMap.set(parseInt(r.vetais_id), r.id));
  console.log(`   Владельцев в системе: ${ownerMap.size}`);

  // Уже мигрированные пациенты
  const existingRes = await vsDb.query(
    'SELECT vetais_id FROM patients WHERE tenant_id = $1 AND vetais_id IS NOT NULL',
    [TENANT_ID]
  );
  const existing = new Set(existingRes.rows.map(r => r.vetais_id.toString()));
  console.log(`   Уже в системе: ${existing.size}`);

  // Проверить наличие breed-таблицы
  const hasBreeds = await vtDb.query(
    `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='patient_breeds') AS exists`
  );
  const breedJoin = hasBreeds.rows[0].exists
    ? `LEFT JOIN patient_breeds pb ON pb.id_rasa = p.id_rasa AND pb.vymaz = 0`
    : '';
  const breedSelect = hasBreeds.rows[0].exists ? `, pb.nazev AS breed_name` : `, NULL AS breed_name`;

  let offset = 0;
  let totalProcessed = 0;

  console.log('   Загрузка пациентов батчами...\n');

  while (true) {
    const res = await vtDb.query(`
      SELECT
        p.id_pacienta,
        p.jmenop      AS name,
        p.id_zvire    AS species_id,
        p.id_rasa     AS breed_id,
        p.id_pohlavi  AS sex_id,
        p.narozen     AS birth_date,
        p.cip         AS microchip,
        p.rz          AS tattoo,
        p.poz         AS notes,
        p.clinic_id,
        p.zemrel,
        p.vyrazen     AS discharged
        ${breedSelect},
        ARRAY_AGG(b.id_klient ORDER BY b.id_most)
          FILTER (WHERE b.id_klient IS NOT NULL
            AND (b.vymazk IS NULL OR b.vymazk = 0)
            AND (b.vymazp IS NULL OR b.vymazp = 0)
          ) AS owner_ids
      FROM file_patients p
      ${breedJoin}
      LEFT JOIN file_bridge_clients_patients b ON b.id_pacient = p.id_pacienta
      WHERE p.vymaz = 0
      GROUP BY p.id_pacienta, p.jmenop, p.id_zvire, p.id_rasa, p.id_pohlavi,
               p.narozen, p.cip, p.rz, p.poz, p.clinic_id, p.zemrel, p.vyrazen
               ${hasBreeds.rows[0].exists ? ', pb.nazev' : ''}
      ORDER BY p.id_pacienta
      LIMIT $1 OFFSET $2
    `, [BATCH_SIZE, offset]);

    if (res.rows.length === 0) break;
    offset += BATCH_SIZE;

    for (const p of res.rows) {
      const vetaisId = p.id_pacienta.toString();
      if (existing.has(vetaisId)) { stats.patients.skipped_exists++; continue; }

      // Определить основного владельца
      const ownersList: number[] = p.owner_ids || [];
      let primaryOwnerId: string | null = null;
      for (const vid of ownersList) {
        const mapped = ownerMap.get(parseInt(vid));
        if (mapped) { primaryOwnerId = mapped; break; }
      }

      if (!primaryOwnerId) {
        stats.patients.skipped_no_owner++;
        continue; // пропустить без владельца — нельзя добавить в систему
      }

      // Определить филиал
      let branchId: string | null = null;
      const clinicId = parseInt(p.clinic_id);
      if (!isNaN(clinicId) && clinicId > 0 && branchMap.has(clinicId)) {
        branchId = branchMap.get(clinicId)!;
      } else {
        stats.patients.no_branch++;
      }

      // Пол и кастрация
      const { gender, neutered } = mapSex(p.sex_id ? parseInt(p.sex_id) : null);

      // Статус
      const isDead = p.zemrel && new Date(p.zemrel).getFullYear() > 1900;
      const status = isDead ? 'deceased' : 'healthy';

      // Имя
      const name = (p.name?.trim()) || 'Без имени';

      // Дата рождения
      const birthDate = safeBirthDate(p.birth_date);

      // Татуировка (rz — может содержать и другие данные, берём как есть)
      const tattoo = p.tattoo?.trim()
        ? truncate(p.tattoo.trim(), 50)
        : null;

      // Микрочип
      const microchip = p.microchip?.trim()
        ? truncate(p.microchip.trim(), 255)
        : null;

      try {
        // Вставить пациента
        const patRes = await vsDb.query(`
          INSERT INTO patients
            (tenant_id, branch_id, vetais_id, name, species, breed,
             gender, birth_date, microchip_number, tattoo_number,
             is_neutered, special_marks, status, owner_id,
             created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())
          ON CONFLICT DO NOTHING
          RETURNING id
        `, [
          TENANT_ID, branchId, vetaisId,
          truncate(name, 255)!,
          mapSpecies(p.species_id ? parseInt(p.species_id) : null),
          truncate(p.breed_name, 255),
          gender, birthDate, microchip, tattoo,
          neutered,
          truncate(p.notes, 1000),
          status,
          primaryOwnerId,
        ]);

        if (patRes.rows.length > 0) {
          const patientId = patRes.rows[0].id;
          // Создать запись в patient_owners (нужна для карточки пациента)
          await vsDb.query(`
            INSERT INTO patient_owners (id, patient_id, owner_id, is_primary, created_at)
            VALUES (gen_random_uuid()::text, $1, $2, true, NOW())
            ON CONFLICT DO NOTHING
          `, [patientId, primaryOwnerId]);
        }

        stats.patients.inserted++;
        existing.add(vetaisId);
      } catch (e: any) {
        stats.patients.errors++;
        console.error(`\n   ❌ Пациент ${vetaisId}: ${e.message}`);
      }

      totalProcessed++;
      if (totalProcessed % 500 === 0) {
        process.stdout.write(`\r   ✅ Обработано: ${totalProcessed} | Добавлено: ${stats.patients.inserted} | Пропущено: ${stats.patients.skipped_exists}`);
      }
    }
  }
  console.log(`\r   ✅ Всего обработано: ${totalProcessed}`);
  console.log('   ✅ Пациенты завершены\n');
}

// ─── Фаза 3: Врачи ────────────────────────────────────────────────────────
async function migrateDoctors(vsDb: Client, vtDb: Client, branchMap: Map<number, string>) {
  console.log('━'.repeat(72));
  console.log('👨‍⚕️ ФАЗА 3: ВРАЧИ (system_users → doctors + users)');
  console.log('━'.repeat(72));

  // Проверить наличие system_users
  const hasTable = await vtDb.query(
    `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='system_users') AS exists`
  );
  if (!hasTable.rows[0].exists) {
    console.log('   ⚠️  Таблица system_users не найдена, пропуск\n');
    return;
  }

  // Проверить наличие колонки jmeno_prihlaseni (логин в Vetais)
  const hasLoginCol = await vtDb.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name='system_users' AND column_name='jmeno_prihlaseni'
    ) AS exists
  `);
  const loginColSql = hasLoginCol.rows[0].exists ? ', jmeno_prihlaseni' : '';

  const existingRes = await vtDb.query(`
    SELECT kod_uzivatele, jmeno, prijmeni, otcestvo,
           telefon, mobile, email,
           is_doctor, is_active, id_kliniky, vymaz${loginColSql}
    FROM system_users
    WHERE vymaz = 0
    ORDER BY kod_uzivatele
  `);
  console.log(`   Найдено пользователей в Vetais: ${existingRes.rows.length}`);

  // Уже мигрированные doctors и users
  const existingDoctors = await vsDb.query(
    `SELECT name FROM doctors WHERE tenant_id = $1`, [TENANT_ID]
  );
  const existingNames = new Set(existingDoctors.rows.map(r => r.name.toLowerCase()));

  const existingUsers = await vsDb.query(
    `SELECT vetais_id FROM users WHERE tenant_id = $1 AND vetais_id IS NOT NULL`, [TENANT_ID]
  );
  const existingUserVetaisIds = new Set(existingUsers.rows.map(r => r.vetais_id));

  // Хэш пароля user123 (вычислить один раз)
  const passwordHash = await bcrypt.hash('user123', 10);

  for (const u of existingRes.rows) {
    const name = buildName(u.prijmeni, u.jmeno, u.otcestvo);
    if (!name) continue;

    const vetaisId = parseInt(u.kod_uzivatele);
    const branchId = (u.id_kliniky && branchMap.has(parseInt(u.id_kliniky)))
      ? branchMap.get(parseInt(u.id_kliniky))!
      : null;
    const isDoctor = u.is_doctor === 1;
    const phone    = cleanPhone(u.mobile) || cleanPhone(u.telefon);
    const email    = cleanEmail(u.email);
    const isActive = u.is_active === 1;

    // ─── Запись в doctors ────────────────────────────────────────────────────
    if (!existingNames.has(name.toLowerCase())) {
      try {
        await vsDb.query(`
          INSERT INTO doctors (tenant_id, branch_id, name, phone, email, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        `, [TENANT_ID, branchId, truncate(name, 255), phone, email, isActive]);
        if (isDoctor) stats.doctors.inserted++;
        else stats.doctors.inserted_staff++;
        existingNames.add(name.toLowerCase());
      } catch (e: any) {
        stats.doctors.errors++;
        console.error(`   ❌ ${isDoctor ? 'Врач' : 'Сотрудник'} "${name}" (doctors): ${e.message}`);
      }
    } else {
      stats.doctors.skipped_exists++;
    }

    // ─── Запись в users ──────────────────────────────────────────────────────
    if (existingUserVetaisIds.has(vetaisId)) {
      stats.doctors.users_skipped++;
      continue;
    }

    // Сформировать username: Vetais-логин или staff_<vetaisId>
    const rawLogin = u.jmeno_prihlaseni?.trim();
    const username = rawLogin
      ? rawLogin.toLowerCase().replace(/[^a-zа-яёА-ЯЁ0-9_.-]/gi, '_').substring(0, 50)
      : `staff_${vetaisId}`;

    const role = isDoctor ? 'doctor' : 'staff';

    try {
      // Проверка уникальности username в рамках тенанта
      const existsCheck = await vsDb.query(
        `SELECT id FROM users WHERE tenant_id = $1 AND username = $2`,
        [TENANT_ID, username]
      );
      const finalUsername = existsCheck.rows.length > 0
        ? `${username}_${vetaisId}`
        : username;

      await vsDb.query(`
        INSERT INTO users (tenant_id, branch_id, username, password, full_name, role, status,
                           phone, email, vetais_id, locale, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ru', NOW(), NOW())
      `, [
        TENANT_ID, branchId, finalUsername, passwordHash,
        truncate(name, 255), role,
        isActive ? 'active' : 'inactive',
        phone, email, vetaisId,
      ]);
      stats.doctors.users_inserted++;
      existingUserVetaisIds.add(vetaisId);
    } catch (e: any) {
      console.error(`   ❌ Пользователь "${name}" (users): ${e.message}`);
    }
  }
  console.log(`   ✅ Врачи и сотрудники завершены\n`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
