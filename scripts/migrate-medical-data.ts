#!/usr/bin/env tsx
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║       СКРИПТ МИГРАЦИИ МЕДИЦИНСКИХ ДАННЫХ ИЗ VETAIS                     ║
 * ║                                                                          ║
 * ║  Мигрирует (идемпотентно, по vetais_id):                               ║
 * ║    1. clinical_cases   ← medical_cases                                 ║
 * ║    2. medical_records  ← medical_exams + medical_documents             ║
 * ║    3. health_reminders ← vaccination_patient                           ║
 * ║    4. invoices         ← accounts_headers                              ║
 * ║    5. invoice_items    ← accounts_items                                ║
 * ║                                                                          ║
 * ║  Использование:                                                          ║
 * ║    tsx scripts/migrate-medical-data.ts \                                ║
 * ║      --tenant bd89523e-47e7-4d4b-8b94-e98c6d3e1959 \                  ║
 * ║      --db vetais_vasilek \                                              ║
 * ║      --host 94.198.53.52 --password vetais \                           ║
 * ║      [--phase cases|records|vaccinations|invoices|all] \               ║
 * ║      [--batch 500]                                                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { Client } from 'pg';

// ─── CLI ──────────────────────────────────────────────────────────────────────
function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const TENANT_ID   = arg('tenant') || '';
const VETAIS_DB   = arg('db')     || 'vetais_vasilek';
const VETAIS_HOST = arg('host')   || '94.198.53.52';
const VETAIS_PORT = parseInt(arg('port') || '5454');
const VETAIS_USER = arg('user')   || 'postgres';
const VETAIS_PASS = arg('password') || 'vetais';
const BATCH       = parseInt(arg('batch') || '500');
const PHASE       = arg('phase') || 'all';

if (!TENANT_ID) { console.error('❌ Укажите --tenant <id>'); process.exit(1); }

// ─── Статистика ────────────────────────────────────────────────────────────────
const S = {
  cases:        { inserted: 0, skipped: 0, errors: 0 },
  records:      { inserted: 0, skipped: 0, errors: 0 },
  vaccinations: { inserted: 0, skipped: 0, errors: 0 },
  invoices:     { inserted: 0, skipped: 0, errors: 0 },
  inv_items:    { inserted: 0, skipped: 0, errors: 0 },
};

// ─── Утилиты ───────────────────────────────────────────────────────────────────
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function safeDt(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function truncate(s: any, n: number): string | null {
  if (!s) return null;
  const str = String(s);
  return str.length > n ? str.substring(0, n) : str;
}

function parseVetaisDate(s: string | null): Date | null {
  if (!s) return null;
  // Формат "28.03.2026"
  const m = String(s).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}`);
  return safeDt(s);
}

// ─── Основная функция ─────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║       МИГРАЦИЯ МЕДИЦИНСКИХ ДАННЫХ ИЗ VETAIS                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
  console.log(`  База Vetais : ${VETAIS_DB} @ ${VETAIS_HOST}:${VETAIS_PORT}`);
  console.log(`  Tenant ID   : ${TENANT_ID}`);
  console.log(`  Фаза        : ${PHASE}`);
  console.log(`  Batch size  : ${BATCH}\n`);

  const vs = new Client({ connectionString: process.env.DATABASE_URL });
  const vt = new Client({
    host: VETAIS_HOST, port: VETAIS_PORT,
    database: VETAIS_DB, user: VETAIS_USER, password: VETAIS_PASS,
    connectionTimeoutMillis: 15000,
  });

  await vs.connect();
  await vt.connect();
  console.log('✅ Подключено!\n');

  // Проверить тенант
  const tenantRow = await vs.query('SELECT name FROM tenants WHERE id=$1', [TENANT_ID]);
  if (!tenantRow.rows.length) { console.error('❌ Тенант не найден'); process.exit(1); }
  console.log(`🏥 Клиника: ${tenantRow.rows[0].name}\n`);

  // Дефолтный пользователь и филиал (для NOT NULL полей)
  const defaultUserRow = await vs.query(
    `SELECT id FROM users WHERE tenant_id=$1 ORDER BY created_at LIMIT 1`, [TENANT_ID]
  );
  const DEFAULT_USER_ID = defaultUserRow.rows[0]?.id || null;
  if (!DEFAULT_USER_ID) { console.error('❌ Нет пользователей для тенанта'); process.exit(1); }

  const defaultBranchRow = await vs.query(
    `SELECT id FROM branches WHERE tenant_id=$1 ORDER BY vetais_clinic_id LIMIT 1`, [TENANT_ID]
  );
  const DEFAULT_BRANCH_ID = defaultBranchRow.rows[0]?.id || null;
  if (!DEFAULT_BRANCH_ID) { console.error('❌ Нет филиалов для тенанта'); process.exit(1); }

  console.log(`  Дефолтный пользователь: ${DEFAULT_USER_ID}`);
  console.log(`  Дефолтный филиал: ${DEFAULT_BRANCH_ID}\n`);

  // Маппинги
  const patientMap = await buildPatientMap(vs);
  const ownerMap   = await buildOwnerMap(vs);
  const doctorMap  = await buildDoctorMap(vs, vt);
  const branchMap  = await buildBranchMap(vs);

  console.log(`  Пациентов в системе : ${patientMap.size}`);
  console.log(`  Владельцев в системе: ${ownerMap.size}`);
  console.log(`  Врачей (имя→id)     : ${doctorMap.size}`);
  console.log(`  Филиалов            : ${branchMap.size}\n`);

  // ── ФАЗЫ ─────────────────────────────────────────────────────────────────────
  if (PHASE === 'all' || PHASE === 'cases') {
    await migrateCases(vs, vt, patientMap, doctorMap, branchMap, DEFAULT_USER_ID, DEFAULT_BRANCH_ID);
  }

  const caseMap = await buildCaseMap(vs); // нужен для records

  if (PHASE === 'all' || PHASE === 'records') {
    await migrateRecords(vs, vt, patientMap, doctorMap, branchMap, caseMap, DEFAULT_BRANCH_ID);
  }

  if (PHASE === 'all' || PHASE === 'vaccinations') {
    await migrateVaccinations(vs, vt, patientMap, branchMap, DEFAULT_BRANCH_ID);
  }

  if (PHASE === 'all' || PHASE === 'invoices') {
    await migrateInvoices(vs, vt, patientMap, ownerMap, branchMap, DEFAULT_BRANCH_ID);
  }

  // ── ИТОГ ─────────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(70));
  console.log('📊 ИТОГИ МИГРАЦИИ');
  console.log('═'.repeat(70));
  printStat('🗂️  Случаи (clinical_cases)',    S.cases);
  printStat('📋 Осмотры (medical_records)',   S.records);
  printStat('💉 Вакцинации',                  S.vaccinations);
  printStat('🧾 Счета (invoices)',             S.invoices);
  printStat('   Позиции счетов',              S.inv_items);
  console.log('\n✨ Готово!\n');

  await vt.end();
  await vs.end();
}

function printStat(label: string, s: { inserted: number; skipped: number; errors: number }) {
  console.log(`\n${label}`);
  console.log(`   ✅ Добавлено: ${s.inserted}  ⏭️  Пропущено: ${s.skipped}  ❌ Ошибок: ${s.errors}`);
}

// ─── Маппинги ─────────────────────────────────────────────────────────────────
async function buildPatientMap(vs: Client): Promise<Map<number, string>> {
  const r = await vs.query(
    'SELECT vetais_id::int AS vid, id FROM patients WHERE tenant_id=$1 AND vetais_id IS NOT NULL',
    [TENANT_ID]
  );
  return new Map(r.rows.map(x => [x.vid, x.id]));
}

async function buildOwnerMap(vs: Client): Promise<Map<number, string>> {
  const r = await vs.query(
    'SELECT vetais_id::int AS vid, id FROM owners WHERE tenant_id=$1 AND vetais_id IS NOT NULL',
    [TENANT_ID]
  );
  return new Map(r.rows.map(x => [x.vid, x.id]));
}

async function buildDoctorMap(vs: Client, vt: Client): Promise<Map<number, string>> {
  // Vetais system_users id → VetSystem doctor id (по имени)
  const vtDocs = await vt.query(
    'SELECT kod_uzivatele AS vid, jmeno, prijmeni, otcestvo FROM system_users WHERE vymaz=0'
  );
  const vsDocs = await vs.query(
    'SELECT id, name FROM doctors WHERE tenant_id=$1', [TENANT_ID]
  );
  const nameToId = new Map<string, string>(vsDocs.rows.map(r => [r.name.toLowerCase(), r.id]));
  const map = new Map<number, string>();
  for (const r of vtDocs.rows) {
    const fullName = [r.prijmeni, r.jmeno, r.otcestvo].filter(Boolean).join(' ').trim().toLowerCase();
    if (nameToId.has(fullName)) map.set(parseInt(r.vid), nameToId.get(fullName)!);
  }
  return map;
}

async function buildBranchMap(vs: Client): Promise<Map<number, string>> {
  const r = await vs.query(
    'SELECT vetais_clinic_id::int AS cid, id FROM branches WHERE tenant_id=$1 AND vetais_clinic_id IS NOT NULL',
    [TENANT_ID]
  );
  return new Map(r.rows.map(x => [x.cid, x.id]));
}

async function buildCaseMap(vs: Client): Promise<Map<number, string>> {
  const r = await vs.query(
    'SELECT vetais_id::int AS vid, id FROM clinical_cases WHERE tenant_id=$1 AND vetais_id IS NOT NULL',
    [TENANT_ID]
  );
  return new Map(r.rows.map(x => [x.vid, x.id]));
}

// ─── Фаза 1: Клинические случаи ──────────────────────────────────────────────
async function migrateCases(
  vs: Client, vt: Client,
  patientMap: Map<number, string>,
  doctorMap: Map<number, string>,
  branchMap: Map<number, string>,
  DEFAULT_USER_ID: string,
  DEFAULT_BRANCH_ID: string
) {
  console.log('━'.repeat(70));
  console.log('🗂️  ФАЗА 1: СЛУЧАИ (medical_cases → clinical_cases)');
  console.log('━'.repeat(70));

  // Уже мигрированные
  const existing = await vs.query(
    'SELECT vetais_id FROM clinical_cases WHERE tenant_id=$1 AND vetais_id IS NOT NULL', [TENANT_ID]
  );
  const done = new Set(existing.rows.map(r => parseInt(r.vetais_id)));
  console.log(`   Уже мигрировано: ${done.size}`);

  let offset = 0;
  while (true) {
    const rows = await vt.query(`
      SELECT id, id_patient, id_doctor, id_clinic, id_type,
             date_start, date_closing, date_created, note, state, deleted
      FROM medical_cases
      WHERE deleted = 0
      ORDER BY id
      LIMIT $1 OFFSET $2
    `, [BATCH, offset]);
    if (!rows.rows.length) break;
    offset += BATCH;

    for (const r of rows.rows) {
      if (done.has(r.id)) { S.cases.skipped++; continue; }
      const patId = patientMap.get(parseInt(r.id_patient));
      if (!patId) { S.cases.skipped++; continue; }

      const doctorId = doctorMap.get(parseInt(r.id_doctor)) || null;
      const branchId = branchMap.get(parseInt(r.id_clinic)) || DEFAULT_BRANCH_ID;
      const startDate = safeDt(r.date_start) || safeDt(r.date_created) || new Date();
      const closeDate = r.date_closing && r.date_closing !== '0000-00-00' ? safeDt(r.date_closing) : null;
      const status = closeDate ? 'closed' : 'open';

      try {
        await vs.query(`
          INSERT INTO clinical_cases
            (id, tenant_id, branch_id, patient_id, reason_for_visit, status,
             start_date, close_date, created_by_user_id, created_at, updated_at, vetais_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11)
          ON CONFLICT DO NOTHING
        `, [
          uuid(), TENANT_ID, branchId, patId,
          truncate(r.note, 1000) || 'Обращение',
          status, startDate, closeDate, DEFAULT_USER_ID,
          new Date(), r.id
        ]);
        done.add(r.id);
        S.cases.inserted++;
      } catch (e: any) {
        S.cases.errors++;
        console.error(`\n   ❌ Случай ${r.id}: ${e.message}`);
      }
    }
    process.stdout.write(`\r   Обработано: ${offset} | ✅ ${S.cases.inserted} | ⏭️ ${S.cases.skipped}`);
  }
  console.log(`\n   ✅ Завершено\n`);
}

// ─── Фаза 2: Осмотры / Медкарты ──────────────────────────────────────────────
async function migrateRecords(
  vs: Client, vt: Client,
  patientMap: Map<number, string>,
  doctorMap: Map<number, string>,
  branchMap: Map<number, string>,
  caseMap: Map<number, string>,
  DEFAULT_BRANCH_ID: string
) {
  console.log('━'.repeat(70));
  console.log('📋 ФАЗА 2: ОСМОТРЫ (medical_exams + medical_documents → medical_records)');
  console.log('━'.repeat(70));

  // Уже мигрированные (храним только строки-id, не весь контент)
  const existing = await vs.query(
    'SELECT vetais_id FROM medical_records WHERE tenant_id=$1 AND vetais_id IS NOT NULL', [TENANT_ID]
  );
  const done = new Set(existing.rows.map(r => r.vetais_id));
  console.log(`   Уже мигрировано: ${done.size}`);
  console.log(`   Документы загружаются по батчам (без загрузки всего в память)\n`);

  let offset = 0;
  while (true) {
    const rows = await vt.query(`
      SELECT id, id_patient, id_case, id_doctor, id_clinic,
             date_created, note, state
      FROM medical_exams
      WHERE deleted = 0
      ORDER BY id
      LIMIT $1 OFFSET $2
    `, [BATCH, offset]);
    if (!rows.rows.length) break;
    offset += BATCH;

    // Для текущего батча загружаем документы только для нужных exam_id
    const examIds = rows.rows.map(r => parseInt(r.id));
    const docsMap = new Map<number, Record<string, string>>();
    if (examIds.length > 0) {
      const docRes = await vt.query(`
        SELECT record_id, doc_type, doc_data
        FROM medical_documents
        WHERE deleted = 0
          AND doc_data IS NOT NULL AND length(doc_data) > 0
          AND record_id = ANY($1::int[])
        ORDER BY record_id, doc_type
      `, [examIds]);
      for (const d of docRes.rows) {
        const rid = parseInt(d.record_id);
        if (!docsMap.has(rid)) docsMap.set(rid, {});
        docsMap.get(rid)![d.doc_type] = d.doc_data;
      }
    }

    for (const r of rows.rows) {
      const vid = r.id.toString();
      if (done.has(vid)) { S.records.skipped++; continue; }

      const patId = patientMap.get(parseInt(r.id_patient));
      if (!patId) { S.records.skipped++; continue; }

      // doctor_id в medical_records ссылается на users(id), а не doctors(id).
      // Поскольку прямой связи нет — ставим NULL (поле nullable).
      const branchId = branchMap.get(parseInt(r.id_clinic)) || DEFAULT_BRANCH_ID;
      const caseId   = r.id_case ? caseMap.get(parseInt(r.id_case)) || null : null;
      const visitDate = safeDt(r.date_created) || new Date();

      // Собрать текст из документов батча
      const docs = docsMap.get(parseInt(r.id)) || {};
      const anamnesis    = htmlToText(docs['anamnesis']    || '');
      const clinical     = htmlToText(docs['clinical']     || '');
      const therapy      = htmlToText(docs['therapy_desc'] || '');
      const conclusion   = htmlToText(docs['conclusion']   || '');
      const labReqRes    = htmlToText(docs['lab_req_res']  || '');
      const operationDesc= htmlToText(docs['operation_desc'] || '');

      const complaints  = anamnesis || null;
      const diagnosis   = clinical || conclusion || null;
      const treatment   = therapy || operationDesc ? { text: [therapy, operationDesc].filter(Boolean).join('\n') } : null;
      const notes       = [labReqRes, r.note].filter(Boolean).join('\n') || null;

      try {
        await vs.query(`
          INSERT INTO medical_records
            (id, tenant_id, branch_id, patient_id, doctor_id, appointment_id,
             visit_date, visit_type, complaints, diagnosis, treatment,
             status, notes, created_at, updated_at, vetais_id)
          VALUES ($1,$2,$3,$4,NULL,NULL,$5,$6,$7,$8,$9,$10,$11,$12,$12,$13)
          ON CONFLICT DO NOTHING
        `, [
          uuid(), TENANT_ID, branchId, patId,
          visitDate, 'visit',
          truncate(complaints, 5000),
          truncate(diagnosis, 5000),
          treatment ? JSON.stringify(treatment) : null,
          'completed',
          truncate(notes, 2000),
          new Date(), vid
        ]);
        done.add(vid);
        S.records.inserted++;
      } catch (e: any) {
        S.records.errors++;
        if (S.records.errors <= 10) console.error(`\n   ❌ Осмотр ${r.id}: ${e.message}`);
        else if (S.records.errors === 11) console.error(`   (дальнейшие ошибки подавлены)`);
      }
    }
    process.stdout.write(`\r   Обработано: ${offset} | ✅ ${S.records.inserted} | ⏭️ ${S.records.skipped}`);
  }
  console.log(`\n   ✅ Завершено\n`);
}

// ─── Фаза 3: Вакцинации ───────────────────────────────────────────────────────
async function migrateVaccinations(
  vs: Client, vt: Client,
  patientMap: Map<number, string>,
  branchMap: Map<number, string>,
  DEFAULT_BRANCH_ID: string
) {
  // Строим карту patient_uuid → owner_uuid из VetSystem
  const patOwnerRes = await vs.query(
    `SELECT id, owner_id FROM patients WHERE tenant_id=$1 AND owner_id IS NOT NULL`, [TENANT_ID]
  );
  const patientOwnerMap = new Map<string, string>(
    patOwnerRes.rows.map(r => [r.id, r.owner_id])
  );

  console.log('━'.repeat(70));
  console.log('💉 ФАЗА 3: ВАКЦИНАЦИИ (vaccination_patient → health_reminders)');
  console.log('━'.repeat(70));

  // Проверить наличие таблицы health_reminders
  const exists = await vs.query(
    `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='health_reminders') AS e`
  );
  if (!exists.rows[0].e) {
    console.log('   ⚠️  Таблица health_reminders не найдена, пропуск\n');
    return;
  }

  const colsRes = await vs.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='health_reminders' ORDER BY ordinal_position`
  );
  const cols = colsRes.rows.map(r => r.column_name);

  // Уже мигрированные
  const existingCol = cols.includes('vetais_id');
  let done = new Set<number>();
  if (existingCol) {
    const ex = await vs.query(
      `SELECT vetais_id FROM health_reminders WHERE tenant_id=$1 AND vetais_id IS NOT NULL`, [TENANT_ID]
    );
    done = new Set(ex.rows.map(r => parseInt(r.vetais_id)));
  }
  console.log(`   Уже мигрировано: ${done.size}`);
  console.log(`   Колонки health_reminders: ${cols.join(', ')}\n`);

  // Загрузить схемы вакцинаций для названий
  const schemasRes = await vt.query(`
    SELECT id_schema, step_num, vacc_name 
    FROM vaccination_steps vs2
    JOIN vaccination_schemas vs3 ON vs3.id = vs2.id_schema
    ORDER BY id_schema, step_num
  `).catch(() => ({ rows: [] as any[] }));
  const vaccNames = new Map<string, string>(); // schema_step → name
  for (const s of schemasRes.rows) {
    vaccNames.set(`${s.id_schema}_${s.id_step}`, s.vacc_name || 'Вакцинация');
  }

  let offset = 0;
  while (true) {
    const rows = await vt.query(`
      SELECT id, id_patient, id_clinic, vaccination_date, id_schema, id_step, id_exam, deleted
      FROM vaccination_patient
      WHERE deleted = 0
      ORDER BY id
      LIMIT $1 OFFSET $2
    `, [BATCH, offset]);
    if (!rows.rows.length) break;
    offset += BATCH;

    for (const r of rows.rows) {
      if (done.has(r.id)) { S.vaccinations.skipped++; continue; }

      const patId = patientMap.get(parseInt(r.id_patient));
      if (!patId) { S.vaccinations.skipped++; continue; }

      const ownerId = patientOwnerMap.get(patId);
      if (!ownerId) { S.vaccinations.skipped++; continue; } // owner_id NOT NULL

      const branchId = branchMap.get(parseInt(r.id_clinic)) || DEFAULT_BRANCH_ID;
      const vaccDate = parseVetaisDate(r.vaccination_date) || new Date();
      const vaccName = vaccNames.get(`${r.id_schema}_${r.id_step}`) || 'Вакцинация';

      try {
        // Строим INSERT динамически под реальные колонки
        const hasVetaisId = cols.includes('vetais_id');
        const hasBranchId = cols.includes('branch_id');
        const hasTenantId = cols.includes('tenant_id');
        const hasStatus   = cols.includes('status');
        const hasType     = cols.includes('reminder_type') || cols.includes('type');
        const hasOwnerId  = cols.includes('owner_id');
        const reminderTypeCol = cols.includes('reminder_type') ? 'reminder_type' : 'type';

        let insertCols = ['id', 'patient_id', 'title', 'due_date', 'created_at', 'updated_at'];
        let values: any[] = [uuid(), patId, vaccName, vaccDate, new Date(), new Date()];

        if (hasOwnerId)  { insertCols.push('owner_id');  values.push(ownerId); }
        if (hasTenantId) { insertCols.push('tenant_id'); values.push(TENANT_ID); }
        if (hasBranchId) { insertCols.push('branch_id'); values.push(branchId); }
        if (hasStatus)   { insertCols.push('status');    values.push('completed'); }
        if (hasType)     { insertCols.push(reminderTypeCol); values.push('vaccination'); }
        if (hasVetaisId) { insertCols.push('vetais_id'); values.push(r.id); }

        const placeholders = values.map((_, i) => `$${i + 1}`).join(',');
        await vs.query(
          `INSERT INTO health_reminders (${insertCols.join(',')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
        done.add(r.id);
        S.vaccinations.inserted++;
      } catch (e: any) {
        S.vaccinations.errors++;
        if (S.vaccinations.errors <= 10) console.error(`\n   ❌ Вакцинация ${r.id}: ${e.message}`);
        else if (S.vaccinations.errors === 11) console.error(`   (дальнейшие ошибки подавлены)`);
      }
    }
    process.stdout.write(`\r   Обработано: ${offset} | ✅ ${S.vaccinations.inserted} | ⏭️ ${S.vaccinations.skipped}`);
  }
  console.log(`\n   ✅ Завершено\n`);
}

// ─── Фаза 4: Счета / Инвойсы ─────────────────────────────────────────────────
async function migrateInvoices(
  vs: Client, vt: Client,
  patientMap: Map<number, string>,
  ownerMap: Map<number, string>,
  branchMap: Map<number, string>,
  DEFAULT_BRANCH_ID: string
) {
  console.log('━'.repeat(70));
  console.log('🧾 ФАЗА 4: СЧЕТА (accounts_headers/items → invoices/invoice_items)');
  console.log('━'.repeat(70));

  // Уже мигрированные invoice
  const existingRes = await vs.query(
    `SELECT invoice_number FROM invoices WHERE tenant_id=$1 AND invoice_number LIKE 'VT-%'`,
    [TENANT_ID]
  );
  const done = new Set(existingRes.rows.map(r => r.invoice_number));
  console.log(`   Уже мигрировано счетов: ${done.size}`);

  // Проверить есть ли branch_id / owner_id у invoices
  const invColsRes = await vs.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='invoices'`
  );
  const invCols = new Set(invColsRes.rows.map(r => r.column_name));

  let offset = 0;
  let invoicesInserted = 0;
  const invoiceIdMap = new Map<number, string>(); // vetais_id → vs uuid

  while (true) {
    const rows = await vt.query(`
      SELECT id, client_id, patient_id, clinic_id,
             datetime_create, datetime_tax,
             price_sum, price_to_pay, price_discount,
             status_id, deleted
      FROM accounts_headers
      WHERE deleted = 0
      ORDER BY id
      LIMIT $1 OFFSET $2
    `, [BATCH, offset]);
    if (!rows.rows.length) break;
    offset += BATCH;

    for (const r of rows.rows) {
      const invNum = `VT-${r.id}`;
      if (done.has(invNum)) { S.invoices.skipped++; continue; }

      const patId    = r.patient_id ? patientMap.get(parseInt(r.patient_id)) || null : null;
      if (!patId) { S.invoices.skipped++; continue; } // patient_id NOT NULL

      const branchId = branchMap.get(parseInt(r.clinic_id)) || DEFAULT_BRANCH_ID;
      const issueDate = safeDt(r.datetime_create) || new Date();
      const paidDate  = safeDt(r.datetime_tax);
      const total     = parseFloat(r.price_to_pay) || parseFloat(r.price_sum) || 0;
      const discount  = parseFloat(r.price_discount) || 0;
      const subtotal  = total + discount;

      // status: 0=draft, 1=paid, 2=cancelled
      const statusMap: Record<number, string> = { 0: 'draft', 1: 'paid', 2: 'cancelled' };
      const status = statusMap[parseInt(r.status_id)] || 'draft';

      const newId = uuid();

      try {
        const insertCols = ['id', 'invoice_number', 'patient_id', 'issue_date',
          'subtotal', 'discount', 'total', 'status', 'paid_date',
          'created_at', 'updated_at', 'tenant_id'];
        const vals: any[] = [
          newId, invNum, patId, issueDate,
          subtotal, discount, total, status, paidDate,
          new Date(), new Date(), TENANT_ID
        ];
        if (invCols.has('branch_id')) { insertCols.push('branch_id'); vals.push(branchId); }

        const ph = vals.map((_, i) => `$${i + 1}`).join(',');
        await vs.query(
          `INSERT INTO invoices (${insertCols.join(',')}) VALUES (${ph}) ON CONFLICT DO NOTHING`,
          vals
        );
        done.add(invNum);
        invoiceIdMap.set(r.id, newId);
        S.invoices.inserted++;
        invoicesInserted++;
      } catch (e: any) {
        S.invoices.errors++;
        if (S.invoices.errors <= 3) console.error(`\n   ❌ Счёт ${r.id}: ${e.message}`);
      }
    }
    process.stdout.write(`\r   Счёта: ${offset} | ✅ ${S.invoices.inserted} | ⏭️ ${S.invoices.skipped}`);
  }
  console.log(`\n   ✅ Счета мигрированы: ${invoicesInserted}\n`);

  // ── Позиции счётов ────────────────────────────────────────────────────────
  console.log('   📦 Миграция позиций счетов (accounts_items → invoice_items)...');

  // Для уже существующих счетов загрузим их id тоже
  const allInvRes = await vs.query(
    `SELECT invoice_number, id FROM invoices WHERE tenant_id=$1 AND invoice_number LIKE 'VT-%'`,
    [TENANT_ID]
  );
  for (const row of allInvRes.rows) {
    const vtId = parseInt(row.invoice_number.replace('VT-', ''));
    if (!isNaN(vtId) && !invoiceIdMap.has(vtId)) invoiceIdMap.set(vtId, row.id);
  }

  // Уже мигрированные позиции — по item_id с префиксом
  const existingItems = await vs.query(
    `SELECT item_id FROM invoice_items WHERE invoice_id IN (
      SELECT id FROM invoices WHERE tenant_id=$1 AND invoice_number LIKE 'VT-%'
    ) AND item_id LIKE 'VTI-%'`,
    [TENANT_ID]
  );
  const doneItems = new Set(existingItems.rows.map(r => r.item_id));
  console.log(`   Уже мигрировано позиций: ${doneItems.size}`);

  let itemOffset = 0;
  while (true) {
    const rows = await vt.query(`
      SELECT ai.id, ai.account_header_id, ai.item_name, ai.item_stock_id,
             ai.sold_amount, ai.sale_price, ai.sum_with_vat,
             ai.vat_sale_perc, ai.item_type_id, ai.deleted
      FROM accounts_items ai
      WHERE ai.deleted = 0
        AND ai.account_header_id > 0
      ORDER BY ai.id
      LIMIT $1 OFFSET $2
    `, [BATCH * 2, itemOffset]);
    if (!rows.rows.length) break;
    itemOffset += BATCH * 2;

    for (const r of rows.rows) {
      const itemKey = `VTI-${r.id}`;
      if (doneItems.has(itemKey)) { S.inv_items.skipped++; continue; }

      const invoiceId = invoiceIdMap.get(parseInt(r.account_header_id));
      if (!invoiceId) { S.inv_items.skipped++; continue; }

      // quantity — INTEGER в БД, Vetais хранит дробные (0.5, 0.9) → округляем вверх, минимум 1
      const qtyRaw = parseFloat(r.sold_amount) || 1;
      const qty   = Math.max(1, Math.ceil(qtyRaw));
      const price = parseFloat(r.sale_price)  || 0;
      const total = parseFloat(r.sum_with_vat) || (qtyRaw * price);
      const vatRate = r.vat_sale_perc ? `${r.vat_sale_perc}%` : '0%';
      // item_type_id: 1=услуга, 2=товар
      const itemType = parseInt(r.item_type_id) === 2 ? 'product' : 'service';

      try {
        await vs.query(`
          INSERT INTO invoice_items (id, invoice_id, item_type, item_id, item_name, quantity, price, total, vat_rate, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
          ON CONFLICT DO NOTHING
        `, [
          uuid(), invoiceId, itemType, itemKey,
          truncate(r.item_name, 500) || 'Услуга/Товар',
          qty, price, total, vatRate
        ]);
        doneItems.add(itemKey);
        S.inv_items.inserted++;
      } catch (e: any) {
        S.inv_items.errors++;
        if (S.inv_items.errors <= 3) console.error(`\n   ❌ Позиция ${r.id}: ${e.message}`);
      }
    }
    process.stdout.write(`\r   Позиции: ${itemOffset} | ✅ ${S.inv_items.inserted} | ⏭️ ${S.inv_items.skipped}`);
  }
  console.log(`\n   ✅ Позиции счетов завершены\n`);
}

// ─── HTML → plain text ────────────────────────────────────────────────────────
function htmlToText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d)))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
