/**
 * Одноразовый скрипт миграции клиники Динго для прод-сервера.
 * Запуск: npx tsx scripts/migrate-dingo-prod.ts [owners|patients|doctors]
 */
import { Client } from 'pg';
import * as crypto from 'crypto';

const TENANT_ID   = 'e556ed34-71a7-4003-a2cd-b5cf274bae12';
const BATCH_SIZE  = 300;
const PHASE       = (process.argv[2] || 'owners') as 'owners' | 'patients' | 'doctors';

// ── Подключение к VetSystem (прод) ──────────────────────────────────────────
const vsDb = new Client({ connectionString: process.env.DATABASE_URL });

// ── Подключение к Vetais Динго (жёстко прописано) ──────────────────────────
const vtDb = new Client({
  host:     '109.173.124.18',
  port:     5454,
  database: 'vetais',
  user:     'postgres',
  password: 'vetais',
  connectionTimeoutMillis: 30000,
});

// ── Утилиты ─────────────────────────────────────────────────────────────────
function uuid(): string {
  return crypto.randomUUID();
}

function cleanPhone(raw: any): string | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(/\D/g, '');
  if (cleaned.length < 7) return null;
  return String(raw).trim().substring(0, 50);
}

function cleanEmail(raw: any): string | null {
  if (!raw) return null;
  const e = String(raw).trim().toLowerCase();
  return e.includes('@') ? e.substring(0, 255) : null;
}

function buildName(...parts: any[]): string | null {
  const name = parts.map(p => (p || '').toString().trim()).filter(Boolean).join(' ').trim();
  return name || null;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.substring(0, n) : s;
}

function safeBirthDate(raw: any): Date | null {
  if (!raw) return null;
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime()) || d.getFullYear() < 1900 || d.getFullYear() > 2100) return null;
    return d;
  } catch { return null; }
}

// ── МАППИНГ ВИДОВ ────────────────────────────────────────────────────────────
const SPECIES_MAP: Record<number, string> = {
  1:'dog',2:'cat',3:'horse',4:'bird',5:'rodent',6:'rabbit',7:'reptile',8:'exotic',9:'fish',10:'other',
  10000:'dog',10001:'cat',10002:'horse',10003:'bird',10004:'rodent',10005:'rabbit',
  10006:'reptile',10007:'exotic',10008:'fish',10009:'other',10010:'dog',10011:'cat',
};

// ── МИГРАЦИЯ ВЛАДЕЛЬЦЕВ ──────────────────────────────────────────────────────
async function migrateOwners(branchMap: Map<number, string>) {
  console.log('\n👤 ФАЗА: ВЛАДЕЛЬЦЫ');

  const existing = new Set<string>(
    (await vsDb.query(`SELECT vetais_id FROM owners WHERE tenant_id=$1 AND vetais_id IS NOT NULL`, [TENANT_ID]))
      .rows.map((r: any) => r.vetais_id)
  );
  console.log(`   Уже мигрировано: ${existing.size}`);

  let offset = 0, inserted = 0, skipped = 0, errors = 0;

  while (true) {
    const res = await vtDb.query(`
      SELECT kod_kado, nazev_kado, poznamka_kado, jmeno,
             mobil, telefon, email,
             adresar, mesto_k, poznamka,
             no_pass, date_birth, gender_id,
             no_contract, clinic_id, vymaz
      FROM file_clients
      WHERE vymaz = 0
      ORDER BY kod_kado
      LIMIT $1 OFFSET $2
    `, [BATCH_SIZE, offset]);

    if (!res.rows.length) break;
    offset += BATCH_SIZE;

    for (const r of res.rows) {
      const vetaisId = r.kod_kado.toString();
      if (existing.has(vetaisId)) { skipped++; continue; }

      const name = buildName(r.nazev_kado, r.poznamka_kado, r.jmeno);
      if (!name) { skipped++; continue; }

      const phone    = cleanPhone(r.mobil) || cleanPhone(r.telefon) || 'не указан';
      const email    = cleanEmail(r.email);
      const address  = [r.mesto_k, r.adresar].filter(Boolean).join(', ') || null;
      const branchId = (r.clinic_id && branchMap.has(parseInt(r.clinic_id)))
        ? branchMap.get(parseInt(r.clinic_id))! : null;
      const notes    = r.poznamka?.trim() || null;

      try {
        await vsDb.query(
          `INSERT INTO owners
            (id, tenant_id, vetais_id, name, phone, email, address,
             passport_number, date_of_birth, gender, branch_id, notes,
             created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
           ON CONFLICT DO NOTHING`,
          [uuid(), TENANT_ID, vetaisId, truncate(name, 100), phone, email, address,
           r.no_pass?.trim() || null, safeBirthDate(r.date_birth),
           r.gender_id === 1 ? 'male' : r.gender_id === 2 ? 'female' : null,
           branchId, notes]
        );
        inserted++;
        existing.add(vetaisId);
      } catch (e: any) {
        errors++;
        if (errors <= 5) console.error(`   ❌ Ошибка ${vetaisId}: ${e.message}`);
      }
    }
    process.stdout.write(`\r   Обработано: ${offset} | ✅ ${inserted} | ⏭️ ${skipped} | ❌ ${errors}`);
  }
  console.log(`\n   ✅ Владельцы: вставлено ${inserted}, ошибок ${errors}`);
}

// ── МИГРАЦИЯ ПАЦИЕНТОВ ───────────────────────────────────────────────────────
async function migratePatients(branchMap: Map<number, string>) {
  console.log('\n🐾 ФАЗА: ПАЦИЕНТЫ');

  const ownerMap = new Map<number, string>(
    (await vsDb.query(`SELECT vetais_id, id FROM owners WHERE tenant_id=$1 AND vetais_id IS NOT NULL`, [TENANT_ID]))
      .rows.map((r: any) => [parseInt(r.vetais_id), r.id])
  );
  console.log(`   Владельцев в VetSystem: ${ownerMap.size}`);

  const existing = new Set<string>(
    (await vsDb.query(`SELECT vetais_id FROM patients WHERE tenant_id=$1 AND vetais_id IS NOT NULL`, [TENANT_ID]))
      .rows.map((r: any) => r.vetais_id)
  );
  console.log(`   Уже мигрировано пациентов: ${existing.size}`);

  let offset = 0, inserted = 0, skipped = 0, errors = 0;

  while (true) {
    const res = await vtDb.query(`
      SELECT p.id_pacienta, p.jmenop, p.id_zvire, p.id_pohlavi,
             p.narozen, p.cip, p.clinic_id,
             ARRAY_AGG(b.id_klient ORDER BY b.id_most)
               FILTER (WHERE b.id_klient IS NOT NULL
                 AND (b.vymazk IS NULL OR b.vymazk = 0)
                 AND (b.vymazp IS NULL OR b.vymazp = 0)
               ) AS owner_ids
      FROM file_patients p
      LEFT JOIN file_bridge_clients_patients b ON b.id_pacient = p.id_pacienta
      WHERE p.vymaz = 0
      GROUP BY p.id_pacienta, p.jmenop, p.id_zvire, p.id_pohlavi, p.narozen, p.cip, p.clinic_id
      ORDER BY p.id_pacienta
      LIMIT $1 OFFSET $2
    `, [BATCH_SIZE, offset]);

    if (!res.rows.length) break;
    offset += BATCH_SIZE;

    for (const p of res.rows) {
      const vetaisId = p.id_pacienta.toString();
      if (existing.has(vetaisId)) { skipped++; continue; }

      const ownersList: number[] = p.owner_ids || [];
      let ownerId: string | null = null;
      for (const vid of ownersList) {
        const mapped = ownerMap.get(parseInt(vid));
        if (mapped) { ownerId = mapped; break; }
      }
      if (!ownerId) { skipped++; continue; }

      const name     = (p.jmenop || '').trim() || 'Без имени';
      const species  = SPECIES_MAP[parseInt(p.id_zvire)] || 'other';
      const branchId = (p.clinic_id && branchMap.has(parseInt(p.clinic_id)))
        ? branchMap.get(parseInt(p.clinic_id))! : null;

      try {
        await vsDb.query(
          `INSERT INTO patients
            (id, tenant_id, vetais_id, owner_id, name, species,
             date_of_birth, microchip_number, branch_id, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
           ON CONFLICT DO NOTHING`,
          [uuid(), TENANT_ID, vetaisId, ownerId, truncate(name, 100), species,
           safeBirthDate(p.narozen), p.cip?.trim() || null, branchId]
        );
        inserted++;
        existing.add(vetaisId);
      } catch (e: any) {
        errors++;
        if (errors <= 5) console.error(`   ❌ Ошибка ${vetaisId}: ${e.message}`);
      }
    }
    process.stdout.write(`\r   Обработано: ${offset} | ✅ ${inserted} | ⏭️ ${skipped} | ❌ ${errors}`);
  }
  console.log(`\n   ✅ Пациенты: вставлено ${inserted}, ошибок ${errors}`);
}

// ── МИГРАЦИЯ ВРАЧЕЙ ──────────────────────────────────────────────────────────
async function migrateDoctors(branchMap: Map<number, string>) {
  console.log('\n👨‍⚕️ ФАЗА: ВРАЧИ');

  const res = await vtDb.query(`
    SELECT id_doktora, prijmeni, jmeno, mid_name, email, telefon, clinic_id
    FROM file_doctors
    WHERE vymaz = 0
    ORDER BY id_doktora
  `);
  console.log(`   Найдено врачей в Vetais: ${res.rows.length}`);

  let inserted = 0, skipped = 0;
  for (const d of res.rows) {
    const name = buildName(d.prijmeni, d.jmeno, d.mid_name);
    if (!name) { skipped++; continue; }

    const branchId = (d.clinic_id && branchMap.has(parseInt(d.clinic_id)))
      ? branchMap.get(parseInt(d.clinic_id))! : null;
    const email    = cleanEmail(d.email);
    const phone    = cleanPhone(d.telefon);

    const existing = await vsDb.query(
      `SELECT id FROM doctors WHERE tenant_id=$1 AND name=$2 AND (branch_id=$3 OR branch_id IS NULL)`,
      [TENANT_ID, name, branchId]
    );
    if (existing.rows.length > 0) { skipped++; continue; }

    try {
      await vsDb.query(
        `INSERT INTO doctors (id, tenant_id, name, email, phone, branch_id, specialization, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
        [uuid(), TENANT_ID, truncate(name, 100), email, phone, branchId, 'Ветеринар']
      );
      inserted++;
    } catch (e: any) {
      if (inserted + skipped < 5) console.error(`   ❌ ${name}: ${e.message}`);
    }
  }
  console.log(`   ✅ Врачи: вставлено ${inserted}, пропущено ${skipped}`);
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   МИГРАЦИЯ ДИНГО (standalone скрипт)                ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  Фаза: ${PHASE}\n`);

  await vsDb.connect();
  await vtDb.connect();
  console.log('✅ Подключено к обеим базам!\n');

  // Маппинг филиалов
  const branchRows = await vsDb.query(
    `SELECT id, name, vetais_clinic_id FROM branches WHERE tenant_id=$1 AND vetais_clinic_id IS NOT NULL`,
    [TENANT_ID]
  );
  const branchMap = new Map<number, string>();
  branchRows.rows.forEach((r: any) => branchMap.set(parseInt(r.vetais_clinic_id), r.id));
  console.log(`📍 Филиалов: ${branchMap.size}`);

  if (PHASE === 'owners') await migrateOwners(branchMap);
  if (PHASE === 'patients') await migratePatients(branchMap);
  if (PHASE === 'doctors') await migrateDoctors(branchMap);

  const stats = await vsDb.query(`
    SELECT 'owners' AS t, COUNT(*) FROM owners WHERE tenant_id=$1
    UNION ALL SELECT 'patients', COUNT(*) FROM patients WHERE tenant_id=$1
    UNION ALL SELECT 'doctors', COUNT(*) FROM doctors WHERE tenant_id=$1
  `, [TENANT_ID]);
  console.log('\n📊 Итог:');
  stats.rows.forEach((r: any) => console.log(`   ${r.t}: ${r.count}`));

  await vsDb.end();
  await vtDb.end();
}

main().catch(e => { console.error('❌ Критическая ошибка:', e.message); process.exit(1); });
