#!/usr/bin/env tsx

/**
 * Комплексная миграция клиентов из Vetais с автоматическим созданием филиалов
 * 
 * Этапы:
 * 1. Создание филиалов (branches) в VetSystem для каждой клиники Vetais
 * 2. Создание таблицы сопоставления Vetais clinic_id → VetSystem branch_id
 * 3. Миграция клиентов с привязкой к соответствующему филиалу
 */

import { Client } from 'pg';

const BATCH_SIZE = 1000;

function cleanPhone(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.trim().replace(/[^\d+]/g, '');
  return cleaned.length >= 10 ? cleaned : null;
}

function cleanEmail(email: string | null): string | null {
  if (!email) return null;
  if (email.toLowerCase().trim() === 'х') return null;
  
  const firstEmail = email.split(',')[0].trim();
  if (firstEmail.includes('@') && firstEmail.includes('.')) {
    return firstEmail;
  }
  return null;
}

function buildAddress(adresar: string | null, mesto: string | null): string | null {
  const parts: string[] = [];
  
  if (mesto && mesto !== '*' && mesto.trim()) {
    parts.push(mesto.trim());
  }
  
  if (adresar && adresar !== '*' && adresar.toLowerCase() !== 'null' && adresar.trim()) {
    parts.push(adresar.trim());
  }
  
  return parts.length > 0 ? parts.join(', ') : null;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   МИГРАЦИЯ VETAIS С АВТОМАТИЧЕСКИМ СОЗДАНИЕМ ФИЛИАЛОВ        ║');
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

    console.log(`✅ Клиника VetSystem: ${selectedTenant.name}\n`);

    // ШАГ 1: Загрузка клиник из Vetais
    console.log('📋 ШАГ 1: Загрузка клиник из Vetais...');
    console.log('='.repeat(80));
    
    const vetaisClinics = await vetaisDb.query(`
      SELECT id, name, clinic_city, clinic_street, clinic_phone, clinic_email
      FROM file_clinics
      WHERE del = 0
      ORDER BY id
    `);

    console.log(`\nНайдено клиник Vetais: ${vetaisClinics.rows.length}\n`);
    vetaisClinics.rows.forEach((clinic, index) => {
      console.log(`${index + 1}. ID ${clinic.id}: ${clinic.name}`);
      console.log(`   Адрес: ${clinic.clinic_city || ''} ${clinic.clinic_street || ''}`);
    });

    // ШАГ 2: Создание филиалов в VetSystem
    console.log('\n\n📍 ШАГ 2: Создание филиалов в VetSystem...');
    console.log('='.repeat(80));

    const branchMapping: Map<number, string> = new Map(); // Vetais clinic_id → VetSystem branch_id

    for (const clinic of vetaisClinics.rows) {
      // Проверяем существует ли уже такой филиал
      const existingBranch = await vetsystemDb.query(
        'SELECT id FROM branches WHERE tenant_id = $1 AND name = $2',
        [tenantId, clinic.name]
      );

      let branchId: string;

      if (existingBranch.rows.length > 0) {
        branchId = existingBranch.rows[0].id;
        console.log(`✓ Филиал уже существует: ${clinic.name} (ID: ${branchId})`);
      } else {
        const address = [clinic.clinic_city, clinic.clinic_street].filter(Boolean).join(', ');
        
        const newBranch = await vetsystemDb.query(
          `INSERT INTO branches (tenant_id, name, address, phone, email, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING id`,
          [tenantId, clinic.name, address || null, clinic.clinic_phone, clinic.clinic_email]
        );
        
        branchId = newBranch.rows[0].id;
        console.log(`✓ Создан филиал: ${clinic.name} (ID: ${branchId})`);
      }

      branchMapping.set(clinic.id, branchId);
    }

    // Филиал по умолчанию для клиентов без clinic_id
    console.log(`\n✓ Создано сопоставление для ${branchMapping.size} филиалов`);

    // ШАГ 3: Загрузка существующих телефонов
    console.log('\n\n📋 ШАГ 3: Загрузка существующих клиентов...');
    console.log('='.repeat(80));

    const existingPhones = new Set<string>();
    const existingResult = await vetsystemDb.query(
      'SELECT phone FROM owners WHERE tenant_id = $1 AND phone IS NOT NULL',
      [tenantId]
    );
    existingResult.rows.forEach(row => existingPhones.add(row.phone));
    console.log(`✅ Найдено ${existingPhones.size} существующих телефонов\n`);

    // ШАГ 4: Загрузка данных из Vetais
    console.log('📊 ШАГ 4: Загрузка клиентов из Vetais...');
    console.log('='.repeat(80));

    const vetaisResult = await vetaisDb.query(`
      SELECT 
        kod_kado,
        nazev_kado,
        telefon,
        mobil,
        email,
        adresar,
        mesto_k,
        poznamka,
        clinic_id,
        created_clinic_id
      FROM file_clients
      WHERE vymaz = 0
      ORDER BY kod_kado
    `);
    console.log(`✅ Найдено клиентов: ${vetaisResult.rows.length}\n`);

    // ШАГ 5: Подготовка данных
    console.log('🔄 ШАГ 5: Обработка данных...');
    console.log('='.repeat(80));

    const toInsert: Array<{
      name: string;
      phone: string;
      email: string | null;
      address: string | null;
      branchId: string | null;
    }> = [];

    let skippedNoName = 0;
    let skippedNoPhone = 0;
    let skippedDuplicate = 0;
    let noBranchMapping = 0;

    for (const row of vetaisResult.rows) {
      const name = row.nazev_kado?.trim();
      
      if (!name) {
        skippedNoName++;
        continue;
      }

      const phone = cleanPhone(row.mobil) || cleanPhone(row.telefon);
      if (!phone) {
        skippedNoPhone++;
        continue;
      }

      if (existingPhones.has(phone)) {
        skippedDuplicate++;
        continue;
      }

      const email = cleanEmail(row.email);
      const address = buildAddress(row.adresar, row.mesto_k);

      // Определяем филиал (приоритет clinic_id, затем created_clinic_id)
      const clinicId = row.clinic_id || row.created_clinic_id;
      let branchId: string | null = null;

      if (clinicId && clinicId !== -1) {
        branchId = branchMapping.get(clinicId) || null;
        if (!branchId) {
          noBranchMapping++;
        }
      }

      toInsert.push({ name, phone, email, address, branchId });
      existingPhones.add(phone);
    }

    console.log(`✅ Подготовлено к вставке: ${toInsert.length}`);
    console.log(`⚠️  Пропущено без имени: ${skippedNoName}`);
    console.log(`⚠️  Пропущено без телефона: ${skippedNoPhone}`);
    console.log(`⚠️  Пропущено дубликатов: ${skippedDuplicate}`);
    console.log(`⚠️  Без сопоставления филиала: ${noBranchMapping}\n`);

    if (toInsert.length === 0) {
      console.log('✅ Нет новых клиентов для миграции');
      return;
    }

    // ШАГ 6: Batch вставка
    console.log(`🚀 ШАГ 6: Batch-вставка (батчами по ${BATCH_SIZE})...`);
    console.log('='.repeat(80) + '\n');

    let insertedCount = 0;

    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      
      const values: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      batch.forEach(item => {
        values.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, NOW(), NOW())`);
        params.push(tenantId, item.name, item.phone, item.email, item.address, item.branchId);
      });

      const query = `
        INSERT INTO owners (tenant_id, name, phone, email, address, branch_id, created_at, updated_at)
        VALUES ${values.join(', ')}
      `;

      await vetsystemDb.query(query, params);
      insertedCount += batch.length;

      process.stdout.write(`\r✅ Вставлено: ${insertedCount} / ${toInsert.length} (${Math.round(insertedCount / toInsert.length * 100)}%)`);
    }

    // Статистика по филиалам
    console.log('\n\n📊 СТАТИСТИКА ПО ФИЛИАЛАМ:');
    console.log('='.repeat(80));

    const branchStats = await vetsystemDb.query(`
      SELECT 
        b.name as branch_name,
        COUNT(o.id) as client_count
      FROM branches b
      LEFT JOIN owners o ON o.branch_id = b.id AND o.tenant_id = b.tenant_id
      WHERE b.tenant_id = $1
      GROUP BY b.id, b.name
      ORDER BY client_count DESC
    `, [tenantId]);

    branchStats.rows.forEach(row => {
      console.log(`  ${row.branch_name.padEnd(50)} ${row.client_count} клиентов`);
    });

    const noBranchCount = await vetsystemDb.query(
      'SELECT COUNT(*) FROM owners WHERE tenant_id = $1 AND branch_id IS NULL',
      [tenantId]
    );
    console.log(`  ${'(Без филиала)'.padEnd(50)} ${noBranchCount.rows[0].count} клиентов`);

    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 ИТОГОВЫЕ РЕЗУЛЬТАТЫ');
    console.log('═'.repeat(80));
    console.log(`✅ Создано филиалов:     ${branchMapping.size}`);
    console.log(`✅ Успешно мигрировано:  ${insertedCount}`);
    console.log(`⚠️  Пропущено (нет имени): ${skippedNoName}`);
    console.log(`⚠️  Пропущено (нет тел.): ${skippedNoPhone}`);
    console.log(`⚠️  Пропущено (дубликат): ${skippedDuplicate}`);
    console.log(`📝 Всего обработано:     ${vetaisResult.rows.length}`);
    console.log('\n✨ Миграция завершена!\n');

  } catch (error: any) {
    console.error('\n❌ Критическая ошибка:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await vetaisDb.end();
    await vetsystemDb.end();
  }
}

main().catch(console.error);
