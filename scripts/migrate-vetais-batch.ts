#!/usr/bin/env tsx

/**
 * Оптимизированная миграция с batch-вставками
 * 
 * Использование:
 *   tsx scripts/migrate-vetais-batch.ts [tenantId] [branchId] [batchSize]
 */

import { Client } from 'pg';

const BATCH_SIZE = parseInt(process.argv[4] || '500');

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

function buildFullName(surname: string | null, firstName: string | null, patronymic: string | null): string | null {
  const parts: string[] = [];
  
  if (surname?.trim()) {
    parts.push(surname.trim());
  }
  
  if (firstName?.trim()) {
    parts.push(firstName.trim());
  }
  
  if (patronymic?.trim()) {
    parts.push(patronymic.trim());
  }
  
  return parts.length > 0 ? parts.join(' ') : null;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   ОПТИМИЗИРОВАННАЯ МИГРАЦИЯ КЛИЕНТОВ (BATCH MODE)            ║');
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

    const tenantsResult = await vetsystemDb.query(
      'SELECT id, name, slug FROM tenants WHERE status = $1 ORDER BY name',
      ['active']
    );

    const tenantId = process.argv[2] || tenantsResult.rows[0].id;
    const branchIdArg = process.argv[3];
    const branchId = branchIdArg && branchIdArg !== 'null' ? branchIdArg : null;

    const selectedTenant = tenantsResult.rows.find(t => t.id === tenantId);
    if (!selectedTenant) {
      console.error(`❌ Клиника с ID ${tenantId} не найдена`);
      process.exit(1);
    }

    console.log(`✅ Клиника: ${selectedTenant.name}`);
    console.log(`✅ Размер батча: ${BATCH_SIZE}\n`);

    // Загрузить существующие телефоны для быстрой проверки дубликатов
    console.log('📋 Загрузка существующих телефонов...');
    const existingPhones = new Set<string>();
    const existingResult = await vetsystemDb.query(
      'SELECT phone FROM owners WHERE tenant_id = $1 AND phone IS NOT NULL',
      [tenantId]
    );
    existingResult.rows.forEach(row => existingPhones.add(row.phone));
    console.log(`✅ Найдено ${existingPhones.size} существующих телефонов\n`);

    // Загрузка данных из Vetais
    console.log('📊 Загрузка данных из Vetais...');
    const vetaisResult = await vetaisDb.query(`
      SELECT 
        kod_kado,
        nazev_kado,
        poznamka_kado,
        jmeno,
        telefon,
        mobil,
        email,
        adresar,
        mesto_k,
        poznamka,
        no_pass,
        date_birth,
        gender_id
      FROM file_clients
      WHERE vymaz = 0
      ORDER BY kod_kado
    `);
    console.log(`✅ Найдено клиентов: ${vetaisResult.rows.length}\n`);

    // Подготовка данных
    console.log('🔄 Обработка данных...');
    const toInsert: Array<{
      name: string;
      phone: string;
      email: string | null;
      address: string | null;
      passportNumber: string | null;
      dateOfBirth: Date | null;
      gender: string | null;
      vetaisId: string;
    }> = [];

    let skippedNoName = 0;
    let skippedNoPhone = 0;
    let skippedDuplicate = 0;

    for (const row of vetaisResult.rows) {
      const name = buildFullName(row.nazev_kado, row.poznamka_kado, row.jmeno);
      
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
      
      // Паспорт и личные данные из Vetais
      const passportNumber = row.no_pass?.trim() || null;
      const dateOfBirth = row.date_birth ? new Date(row.date_birth) : null;
      // gender_id: 1 = мужской, 2 = женский
      const gender = row.gender_id === 1 ? 'male' : 
                     row.gender_id === 2 ? 'female' : null;
      const vetaisId = row.kod_kado.toString();

      toInsert.push({ name, phone, email, address, passportNumber, dateOfBirth, gender, vetaisId });
      existingPhones.add(phone);
    }

    console.log(`✅ Подготовлено к вставке: ${toInsert.length}`);
    console.log(`⚠️  Пропущено без имени: ${skippedNoName}`);
    console.log(`⚠️  Пропущено без телефона: ${skippedNoPhone}`);
    console.log(`⚠️  Пропущено дубликатов: ${skippedDuplicate}\n`);

    if (toInsert.length === 0) {
      console.log('✅ Нет новых клиентов для миграции');
      return;
    }

    // Batch вставка
    console.log(`🚀 Начало batch-вставки (батчами по ${BATCH_SIZE})...\n`);
    let insertedCount = 0;

    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      
      const values: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      batch.forEach(item => {
        values.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, NOW(), NOW())`);
        params.push(
          tenantId, 
          item.name, 
          item.phone, 
          item.email, 
          item.address, 
          item.passportNumber, 
          item.dateOfBirth, 
          item.gender, 
          branchId,
          item.vetaisId
        );
      });

      const query = `
        INSERT INTO owners (tenant_id, name, phone, email, address, passport_number, date_of_birth, gender, branch_id, vetais_id, created_at, updated_at)
        VALUES ${values.join(', ')}
      `;

      await vetsystemDb.query(query, params);
      insertedCount += batch.length;

      process.stdout.write(`\r✅ Вставлено: ${insertedCount} / ${toInsert.length} (${Math.round(insertedCount / toInsert.length * 100)}%)`);
    }

    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 РЕЗУЛЬТАТЫ МИГРАЦИИ');
    console.log('═'.repeat(80));
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
