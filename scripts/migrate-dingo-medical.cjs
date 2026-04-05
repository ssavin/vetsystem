// Миграция медданных Динго: node scripts/migrate-dingo-medical.cjs [cases|records|vaccinations|invoices|all]
const { Client } = require('pg');
const crypto = require('crypto');

const TENANT_ID = 'e556ed34-71a7-4003-a2cd-b5cf274bae12';
const BATCH = 300;
const PHASE = process.argv[2] || 'all';

const vs = new Client({ connectionString: process.env.DATABASE_URL });
const vt = new Client({
  host: '109.173.124.18', port: 5454,
  database: 'vetais', user: 'postgres', password: 'vetais',
  connectionTimeoutMillis: 30000,
});

const uuid = () => crypto.randomUUID();
const trunc = (s, n) => { if (!s) return null; const r = String(s); return r.length > n ? r.substring(0, n) : r; };
const safeDt = v => { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d; };
const parseVetDate = s => {
  if (!s) return null;
  const m = String(s).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}`);
  return safeDt(s);
};
const htmlToText = html => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d)))
    .replace(/\n{3,}/g, '\n\n').trim();
};

const S = {
  cases:        { ins: 0, sk: 0, err: 0 },
  records:      { ins: 0, sk: 0, err: 0 },
  vaccinations: { ins: 0, sk: 0, err: 0 },
  invoices:     { ins: 0, sk: 0, err: 0 },
  inv_items:    { ins: 0, sk: 0, err: 0 },
};

async function buildMaps() {
  // Пациенты Динго хранятся с префиксом 'DNG_' в vetais_id
  const patRes = await vs.query("SELECT REPLACE(vetais_id,'DNG_','')::int AS vid, id FROM patients WHERE tenant_id=$1 AND vetais_id LIKE 'DNG_%'", [TENANT_ID]);
  const patientMap = new Map(patRes.rows.map(r => [parseInt(r.vid), r.id]));

  const owRes = await vs.query('SELECT vetais_id::int AS vid, id FROM owners WHERE tenant_id=$1 AND vetais_id IS NOT NULL', [TENANT_ID]);
  const ownerMap = new Map(owRes.rows.map(r => [r.vid, r.id]));

  const brRes = await vs.query('SELECT vetais_clinic_id::int AS cid, id FROM branches WHERE tenant_id=$1 AND vetais_clinic_id IS NOT NULL', [TENANT_ID]);
  const branchMap = new Map(brRes.rows.map(r => [r.cid, r.id]));

  // Doctor map: vetais system_users.kod_uzivatele → vs doctor id (matched by name)
  const vtDocs = await vt.query('SELECT kod_uzivatele AS vid, jmeno, prijmeni, otcestvo FROM system_users WHERE vymaz=0').catch(() => ({ rows: [] }));
  const vsDocs = await vs.query('SELECT id, name FROM doctors WHERE tenant_id=$1', [TENANT_ID]);
  const nameToId = new Map(vsDocs.rows.map(r => [r.name.toLowerCase(), r.id]));
  const doctorMap = new Map();
  for (const r of vtDocs.rows) {
    const nm = [r.prijmeni, r.jmeno, r.otcestvo].filter(Boolean).join(' ').trim().toLowerCase();
    if (nameToId.has(nm)) doctorMap.set(parseInt(r.vid), nameToId.get(nm));
  }

  console.log(`  Пациентов: ${patientMap.size} | Владельцев: ${ownerMap.size} | Врачей: ${doctorMap.size} | Филиалов: ${branchMap.size}`);
  return { patientMap, ownerMap, branchMap, doctorMap };
}

async function migrateCases(maps) {
  const { patientMap, doctorMap, branchMap } = maps;
  console.log('\n--- ФАЗА: СЛУЧАИ (medical_cases → clinical_cases) ---');

  const defUserRow = await vs.query('SELECT id FROM users WHERE tenant_id=$1 ORDER BY created_at LIMIT 1', [TENANT_ID]);
  const DEF_USER = defUserRow.rows[0]?.id;
  const defBrRow = await vs.query('SELECT id FROM branches WHERE tenant_id=$1 ORDER BY vetais_clinic_id LIMIT 1', [TENANT_ID]);
  const DEF_BR = defBrRow.rows[0]?.id;

  const ex = new Set((await vs.query('SELECT vetais_id FROM clinical_cases WHERE tenant_id=$1 AND vetais_id IS NOT NULL', [TENANT_ID])).rows.map(r => parseInt(r.vetais_id)));
  console.log(`  Уже есть: ${ex.size}`);

  let off = 0;
  while (true) {
    const rows = (await vt.query(`SELECT id, id_patient, id_doctor, id_clinic, date_start, date_closing, date_created, note, state FROM medical_cases WHERE deleted=0 ORDER BY id LIMIT $1 OFFSET $2`, [BATCH, off])).rows;
    if (!rows.length) break; off += BATCH;
    for (const r of rows) {
      if (ex.has(r.id)) { S.cases.sk++; continue; }
      const patId = patientMap.get(parseInt(r.id_patient));
      if (!patId) { S.cases.sk++; continue; }
      const brId = branchMap.get(parseInt(r.id_clinic)) || DEF_BR;
      const start = safeDt(r.date_start) || safeDt(r.date_created) || new Date();
      const close = r.date_closing && r.date_closing !== '0000-00-00' ? safeDt(r.date_closing) : null;
      try {
        await vs.query(`INSERT INTO clinical_cases (id,tenant_id,branch_id,patient_id,reason_for_visit,status,start_date,close_date,created_by_user_id,created_at,updated_at,vetais_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11) ON CONFLICT DO NOTHING`,
          [uuid(), TENANT_ID, brId, patId, trunc(r.note, 1000) || 'Обращение', close ? 'closed' : 'open', start, close, DEF_USER, new Date(), r.id]);
        ex.add(r.id); S.cases.ins++;
      } catch (e) { S.cases.err++; if (S.cases.err <= 5) console.error(`\n  ERR case ${r.id}: ${e.message}`); }
    }
    process.stdout.write(`\r  ${off} обр | ${S.cases.ins} вст | ${S.cases.err} ош`);
  }
  console.log(`\n  Случаи готово: ${S.cases.ins} вставлено`);
}

async function migrateRecords(maps) {
  const { patientMap, branchMap } = maps;
  console.log('\n--- ФАЗА: ОСМОТРЫ (medical_exams → medical_records) ---');

  const defBrRow = await vs.query('SELECT id FROM branches WHERE tenant_id=$1 ORDER BY vetais_clinic_id LIMIT 1', [TENANT_ID]);
  const DEF_BR = defBrRow.rows[0]?.id;

  const caseMapRes = await vs.query('SELECT vetais_id::int AS vid, id FROM clinical_cases WHERE tenant_id=$1 AND vetais_id IS NOT NULL', [TENANT_ID]);
  const caseMap = new Map(caseMapRes.rows.map(r => [r.vid, r.id]));

  const ex = new Set((await vs.query('SELECT vetais_id FROM medical_records WHERE tenant_id=$1 AND vetais_id IS NOT NULL', [TENANT_ID])).rows.map(r => r.vetais_id));
  console.log(`  Уже есть: ${ex.size}`);

  let off = 0;
  while (true) {
    const rows = (await vt.query(`SELECT id, id_patient, id_case, id_clinic, date_created, note FROM medical_exams WHERE deleted=0 ORDER BY id LIMIT $1 OFFSET $2`, [BATCH, off])).rows;
    if (!rows.length) break; off += BATCH;

    const examIds = rows.map(r => parseInt(r.id));
    const docsMap = new Map();
    if (examIds.length) {
      const docRes = (await vt.query(`SELECT record_id, doc_type, doc_data FROM medical_documents WHERE deleted=0 AND doc_data IS NOT NULL AND length(doc_data)>0 AND record_id=ANY($1::int[]) ORDER BY record_id, doc_type`, [examIds])).rows;
      for (const d of docRes) {
        const rid = parseInt(d.record_id);
        if (!docsMap.has(rid)) docsMap.set(rid, {});
        docsMap.get(rid)[d.doc_type] = d.doc_data;
      }
    }

    for (const r of rows) {
      const vid = r.id.toString();
      if (ex.has(vid)) { S.records.sk++; continue; }
      const patId = patientMap.get(parseInt(r.id_patient));
      if (!patId) { S.records.sk++; continue; }
      const brId = branchMap.get(parseInt(r.id_clinic)) || DEF_BR;
      const caseId = r.id_case ? caseMap.get(parseInt(r.id_case)) || null : null;
      const docs = docsMap.get(parseInt(r.id)) || {};
      const complaints = htmlToText(docs['anamnesis'] || '') || null;
      const diagnosis  = htmlToText(docs['clinical'] || '') || htmlToText(docs['conclusion'] || '') || null;
      const therapyTxt = [htmlToText(docs['therapy_desc'] || ''), htmlToText(docs['operation_desc'] || '')].filter(Boolean).join('\n');
      const treatment  = therapyTxt ? JSON.stringify({ text: therapyTxt }) : null;
      const notes = [htmlToText(docs['lab_req_res'] || ''), r.note].filter(Boolean).join('\n') || null;
      try {
        await vs.query(`INSERT INTO medical_records (id,tenant_id,branch_id,patient_id,doctor_id,appointment_id,visit_date,visit_type,complaints,diagnosis,treatment,status,notes,created_at,updated_at,vetais_id) VALUES ($1,$2,$3,$4,NULL,NULL,$5,$6,$7,$8,$9,$10,$11,$12,$12,$13) ON CONFLICT DO NOTHING`,
          [uuid(), TENANT_ID, brId, patId, safeDt(r.date_created) || new Date(), 'visit', trunc(complaints, 5000), trunc(diagnosis, 5000), treatment, 'completed', trunc(notes, 2000), new Date(), vid]);
        ex.add(vid); S.records.ins++;
      } catch (e) { S.records.err++; if (S.records.err <= 5) console.error(`\n  ERR record ${r.id}: ${e.message}`); }
    }
    process.stdout.write(`\r  ${off} обр | ${S.records.ins} вст | ${S.records.err} ош`);
  }
  console.log(`\n  Осмотры готово: ${S.records.ins} вставлено`);
}

async function migrateVaccinations(maps) {
  const { patientMap, branchMap } = maps;
  console.log('\n--- ФАЗА: ВАКЦИНАЦИИ (vaccination_patient → health_reminders) ---');

  const defBrRow = await vs.query('SELECT id FROM branches WHERE tenant_id=$1 ORDER BY vetais_clinic_id LIMIT 1', [TENANT_ID]);
  const DEF_BR = defBrRow.rows[0]?.id;

  const patOwnerMap = new Map((await vs.query('SELECT id, owner_id FROM patients WHERE tenant_id=$1 AND owner_id IS NOT NULL', [TENANT_ID])).rows.map(r => [r.id, r.owner_id]));

  // Колонки таблицы
  const cols = new Set((await vs.query(`SELECT column_name FROM information_schema.columns WHERE table_name='health_reminders'`)).rows.map(r => r.column_name));

  const ex = new Set();
  if (cols.has('vetais_id')) {
    (await vs.query('SELECT vetais_id FROM health_reminders WHERE tenant_id=$1 AND vetais_id IS NOT NULL', [TENANT_ID])).rows.forEach(r => ex.add(parseInt(r.vetais_id)));
  }
  console.log(`  Уже есть: ${ex.size}`);

  // Названия вакцин
  const vaccNames = new Map();
  try {
    const sc = (await vt.query('SELECT id_schema, step_num, vacc_name FROM vaccination_steps vs2 JOIN vaccination_schemas vs3 ON vs3.id=vs2.id_schema ORDER BY id_schema, step_num')).rows;
    for (const s of sc) vaccNames.set(`${s.id_schema}_${s.step_num}`, s.vacc_name || 'Вакцинация');
  } catch (_) {}

  const reminderTypeCol = cols.has('reminder_type') ? 'reminder_type' : (cols.has('type') ? 'type' : null);

  let off = 0;
  while (true) {
    const rows = (await vt.query(`SELECT id, id_patient, id_clinic, vaccination_date, id_schema, id_step FROM vaccination_patient WHERE deleted=0 ORDER BY id LIMIT $1 OFFSET $2`, [BATCH, off])).rows;
    if (!rows.length) break; off += BATCH;
    for (const r of rows) {
      if (ex.has(r.id)) { S.vaccinations.sk++; continue; }
      const patId = patientMap.get(parseInt(r.id_patient));
      if (!patId) { S.vaccinations.sk++; continue; }
      const ownerId = patOwnerMap.get(patId);
      if (!ownerId) { S.vaccinations.sk++; continue; }
      const brId = branchMap.get(parseInt(r.id_clinic)) || DEF_BR;
      const vDate = parseVetDate(r.vaccination_date) || new Date();
      const vName = vaccNames.get(`${r.id_schema}_${r.id_step}`) || 'Вакцинация';
      try {
        const insertCols = ['id', 'patient_id', 'title', 'due_date', 'created_at', 'updated_at'];
        const vals = [uuid(), patId, vName, vDate, new Date(), new Date()];
        if (cols.has('owner_id'))  { insertCols.push('owner_id');  vals.push(ownerId); }
        if (cols.has('tenant_id')) { insertCols.push('tenant_id'); vals.push(TENANT_ID); }
        if (cols.has('branch_id')) { insertCols.push('branch_id'); vals.push(brId); }
        if (cols.has('status'))    { insertCols.push('status');    vals.push('completed'); }
        if (reminderTypeCol)       { insertCols.push(reminderTypeCol); vals.push('vaccination'); }
        if (cols.has('vetais_id')) { insertCols.push('vetais_id'); vals.push(r.id); }
        const ph = vals.map((_, i) => `$${i + 1}`).join(',');
        await vs.query(`INSERT INTO health_reminders (${insertCols.join(',')}) VALUES (${ph}) ON CONFLICT DO NOTHING`, vals);
        ex.add(r.id); S.vaccinations.ins++;
      } catch (e) { S.vaccinations.err++; if (S.vaccinations.err <= 5) console.error(`\n  ERR vacc ${r.id}: ${e.message}`); }
    }
    process.stdout.write(`\r  ${off} обр | ${S.vaccinations.ins} вст | ${S.vaccinations.err} ош`);
  }
  console.log(`\n  Вакцинации готово: ${S.vaccinations.ins} вставлено`);
}

async function migrateInvoices(maps) {
  const { patientMap, ownerMap, branchMap } = maps;
  console.log('\n--- ФАЗА: СЧЕТА (accounts_headers/items → invoices/invoice_items) ---');

  const defBrRow = await vs.query('SELECT id FROM branches WHERE tenant_id=$1 ORDER BY vetais_clinic_id LIMIT 1', [TENANT_ID]);
  const DEF_BR = defBrRow.rows[0]?.id;

  const invCols = new Set((await vs.query(`SELECT column_name FROM information_schema.columns WHERE table_name='invoices'`)).rows.map(r => r.column_name));

  const done = new Set((await vs.query(`SELECT invoice_number FROM invoices WHERE tenant_id=$1 AND invoice_number LIKE 'VT-%'`, [TENANT_ID])).rows.map(r => r.invoice_number));
  console.log(`  Счетов уже есть: ${done.size}`);

  const SM = { 0: 'draft', 1: 'paid', 2: 'cancelled' };
  const invoiceIdMap = new Map();
  let off = 0;

  while (true) {
    const rows = (await vt.query(`SELECT id, client_id, patient_id, clinic_id, datetime_create, datetime_tax, price_sum, price_to_pay, price_discount, status_id FROM accounts_headers WHERE deleted=0 ORDER BY id LIMIT $1 OFFSET $2`, [BATCH, off])).rows;
    if (!rows.length) break; off += BATCH;
    for (const r of rows) {
      const invNum = `VT-${r.id}`;
      if (done.has(invNum)) { S.invoices.sk++; continue; }
      const ownerId = r.client_id ? ownerMap.get(parseInt(r.client_id)) || null : null;
      if (!ownerId) { S.invoices.sk++; continue; }
      const patId = r.patient_id ? patientMap.get(parseInt(r.patient_id)) || null : null;
      const brId = branchMap.get(parseInt(r.clinic_id)) || DEF_BR;
      const total = Math.max(0, parseFloat(r.price_to_pay) || parseFloat(r.price_sum) || 0);
      const disc = parseFloat(r.price_discount) || 0;
      const subtotal = Math.max(0, total + disc);
      const status = SM[parseInt(r.status_id)] || 'draft';
      const newId = uuid();
      try {
        const ic = ['id', 'invoice_number', 'owner_id', 'patient_id', 'issue_date', 'subtotal', 'discount', 'total', 'status', 'paid_date', 'created_at', 'updated_at', 'tenant_id'];
        const vals = [newId, invNum, ownerId, patId, safeDt(r.datetime_create) || new Date(), subtotal, disc, total, status, safeDt(r.datetime_tax), new Date(), new Date(), TENANT_ID];
        if (invCols.has('branch_id')) { ic.push('branch_id'); vals.push(brId); }
        const ph = vals.map((_, i) => `$${i + 1}`).join(',');
        await vs.query(`INSERT INTO invoices (${ic.join(',')}) VALUES (${ph}) ON CONFLICT DO NOTHING`, vals);
        done.add(invNum); invoiceIdMap.set(r.id, newId); S.invoices.ins++;
      } catch (e) { S.invoices.err++; if (S.invoices.err <= 3) console.error(`\n  ERR invoice ${r.id}: ${e.message}`); }
    }
    process.stdout.write(`\r  ${off} обр | ${S.invoices.ins} вст | ${S.invoices.err} ош`);
  }
  console.log(`\n  Счета готово: ${S.invoices.ins} вставлено`);

  // Загрузить маппинг уже существующих счетов
  const allInv = (await vs.query(`SELECT invoice_number, id FROM invoices WHERE tenant_id=$1 AND invoice_number LIKE 'VT-%'`, [TENANT_ID])).rows;
  for (const row of allInv) {
    const vtId = parseInt(row.invoice_number.replace('VT-', ''));
    if (!isNaN(vtId) && !invoiceIdMap.has(vtId)) invoiceIdMap.set(vtId, row.id);
  }

  // Позиции
  console.log('  Позиции счетов...');
  const doneItems = new Set((await vs.query(`SELECT item_id FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE tenant_id=$1 AND invoice_number LIKE 'VT-%') AND item_id LIKE 'VTI-%'`, [TENANT_ID])).rows.map(r => r.item_id));
  console.log(`  Позиций уже есть: ${doneItems.size}`);

  let iOff = 0;
  while (true) {
    const rows = (await vt.query(`SELECT ai.id, ai.account_header_id, ai.item_name, ai.sold_amount, ai.sale_price, ai.sum_with_vat, ai.vat_sale_perc, ai.item_type_id FROM accounts_items ai WHERE ai.deleted=0 AND ai.account_header_id>0 ORDER BY ai.id LIMIT $1 OFFSET $2`, [BATCH * 2, iOff])).rows;
    if (!rows.length) break; iOff += BATCH * 2;
    for (const r of rows) {
      const itemKey = `VTI-${r.id}`;
      if (doneItems.has(itemKey)) { S.inv_items.sk++; continue; }
      const invoiceId = invoiceIdMap.get(parseInt(r.account_header_id));
      if (!invoiceId) { S.inv_items.sk++; continue; }
      const qty = Math.max(1, Math.ceil(parseFloat(r.sold_amount) || 1));
      const price = parseFloat(r.sale_price) || 0;
      const total = parseFloat(r.sum_with_vat) || (qty * price);
      try {
        await vs.query(`INSERT INTO invoice_items (id,invoice_id,item_type,item_id,item_name,quantity,price,total,vat_rate,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) ON CONFLICT DO NOTHING`,
          [uuid(), invoiceId, parseInt(r.item_type_id) === 2 ? 'product' : 'service', itemKey, trunc(r.item_name, 255) || 'Услуга/Товар', qty, price, total, r.vat_sale_perc ? `${r.vat_sale_perc}%` : '0%']);
        doneItems.add(itemKey); S.inv_items.ins++;
      } catch (e) { S.inv_items.err++; if (S.inv_items.err <= 3) console.error(`\n  ERR item ${r.id}: ${e.message}`); }
    }
    process.stdout.write(`\r  ${iOff} обр | ${S.inv_items.ins} вст | ${S.inv_items.err} ош`);
  }
  console.log(`\n  Позиции готово: ${S.inv_items.ins} вставлено`);
}

async function main() {
  console.log('=== МИГРАЦИЯ МЕДДАННЫХ ДИНГО: ' + PHASE + ' ===');
  await vs.connect(); await vt.connect();
  console.log('Подключено!');

  const tenantRow = await vs.query('SELECT name FROM tenants WHERE id=$1', [TENANT_ID]);
  if (!tenantRow.rows.length) { console.error('Тенант не найден!'); process.exit(1); }
  console.log('Клиника: ' + tenantRow.rows[0].name);

  const maps = await buildMaps();

  if (PHASE === 'all' || PHASE === 'cases')        await migrateCases(maps);
  if (PHASE === 'all' || PHASE === 'records')      await migrateRecords(maps);
  if (PHASE === 'all' || PHASE === 'vaccinations') await migrateVaccinations(maps);
  if (PHASE === 'all' || PHASE === 'invoices')     await migrateInvoices(maps);

  console.log('\n=== ИТОГИ ===');
  console.log(`cases:        вст=${S.cases.ins}        ск=${S.cases.sk}        ош=${S.cases.err}`);
  console.log(`records:      вст=${S.records.ins}      ск=${S.records.sk}      ош=${S.records.err}`);
  console.log(`vaccinations: вст=${S.vaccinations.ins} ск=${S.vaccinations.sk} ош=${S.vaccinations.err}`);
  console.log(`invoices:     вст=${S.invoices.ins}     ск=${S.invoices.sk}     ош=${S.invoices.err}`);
  console.log(`inv_items:    вст=${S.inv_items.ins}    ск=${S.inv_items.sk}    ош=${S.inv_items.err}`);

  await vs.end(); await vt.end();
  console.log('\nГотово!');
}

main().catch(e => { console.error('ОШИБКА: ' + e.message); process.exit(1); });
