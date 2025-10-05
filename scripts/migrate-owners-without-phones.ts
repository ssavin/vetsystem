#!/usr/bin/env tsx

/**
 * Миграция владельцев БЕЗ телефонов (с фиктивными телефонами)
 * Для завершения цепочки миграции: владельцы → пациенты → медицинские записи
 */

import { Client } from 'pg';

const BATCH_SIZE = 1000;
const TENANT_ID = 'default-tenant-001';

// Маппинг клиник Vetais → филиалы VetSystem  
const CLINIC_TO_BRANCH: Record<number, string> = {
  10000: '280fcff4-2e1c-43d7-8ae5-6a48d288e518', // Бутово
  10001: '48ef0926-7fc3-4c82-b1b9-d8cb6d787ee8', // Лобачевского
  10002: 'c59ff876-d0c9-4220-b782-de28bdd0329c', // Новопеределкино
};

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
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   МИГРАЦИЯ ВЛАДЕЛЬЦЕВ БЕЗ ТЕЛЕФОНОВ (ФИКТИВНЫЕ ТЕЛЕФОНЫ) ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const vetsystemDb = new Client({ connectionString: process.env.DATABASE_URL });
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

    // Загрузить уже мигрированных владельцев
    console.log('📊 Загрузка мигрированных владельцев...');
    const migratedResult = await vetsystemDb.query(
      'SELECT vetais_id FROM owners WHERE tenant_id = $1 AND vetais_id IS NOT NULL',
      [TENANT_ID]
    );
    const migratedIds = new Set<number>();
    migratedResult.rows.forEach(row => {
      migratedIds.add(parseInt(row.vetais_id));
    });
    console.log(`✅ Уже мигрировано: ${migratedIds.size} владельцев\n`);

    // Загрузка владельцев БЕЗ телефонов из Vetais
    console.log('📊 Загрузка владельцев без телефонов из Vetais...');
    const vetaisResult = await vetaisDb.query(`
      SELECT 
        kod_kado,
        nazev_kado,
        poznamka_kado,
        jmeno,
        email,
        adresar,
        mesto_k,
        id_kliniky
      FROM file_clients
      WHERE vymaz = 0
        AND (telefon IS NULL OR TRIM(telefon) = '' OR LENGTH(REGEXP_REPLACE(telefon, '[^0-9+]', '', 'g')) < 10)
        AND (mobil IS NULL OR TRIM(mobil) = '' OR LENGTH(REGEXP_REPLACE(mobil, '[^0-9+]', '', 'g')) < 10)
      ORDER BY kod_kado
    `);
    console.log(`✅ Всего владельцев без телефонов в Vetais: ${vetaisResult.rows.length}\n`);

    // Подготовка данных
    console.log('🔄 Обработка данных...');
    const toInsert: Array<{
      vetais_id: number;
      name: string;
      phone: string;
      email: string | null;
      address: string | null;
      branch_id: string | null;
    }> = [];

    let skippedNoName = 0;
    let skippedAlreadyMigrated = 0;

    for (const row of vetaisResult.rows) {
      // Проверка на уже мигрированного
      if (migratedIds.has(row.kod_kado)) {
        skippedAlreadyMigrated++;
        continue;
      }

      const name = buildFullName(row.nazev_kado, row.poznamka_kado, row.jmeno);
      
      if (!name) {
        skippedNoName++;
        continue;
      }

      // Создать фиктивный телефон на основе vetais_id
      const phone = `9000${String(row.kod_kado).padStart(6, '0')}`;

      const email = cleanEmail(row.email);
      const address = buildAddress(row.adresar, row.mesto_k);
      const branchId = CLINIC_TO_BRANCH[row.id_kliniky] || null;

      toInsert.push({ 
        vetais_id: row.kod_kado,
        name, 
        phone, 
        email, 
        address,
        branch_id: branchId
      });
    }

    console.log(`✅ Подготовлено к вставке: ${toInsert.length}`);
    console.log(`⚠️  Пропущено (уже есть): ${skippedAlreadyMigrated}`);
    console.log(`⚠️  Пропущено (нет имени): ${skippedNoName}\n`);

    if (toInsert.length === 0) {
      console.log('✅ Нет новых владельцев для миграции');
      return;
    }

    // Batch вставка
    console.log(`🚀 Начало миграции (батчами по ${BATCH_SIZE})...\n`);
    let insertedCount = 0;
    let errors = 0;

    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      
      for (const item of batch) {
        try {
          await vetsystemDb.query(`
            INSERT INTO owners (tenant_id, name, phone, email, address, branch_id, vetais_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          `, [TENANT_ID, item.name, item.phone, item.email, item.address, item.branch_id, item.vetais_id.toString()]);
          
          insertedCount++;
          
          if (insertedCount % 100 === 0) {
            console.log(`   ✅ Мигрировано: ${insertedCount} / ${toInsert.length} (${Math.round(insertedCount / toInsert.length * 100)}%)`);
          }
        } catch (error: any) {
          errors++;
          if (errors <= 10) {
            console.error(`   ❌ Ошибка для владельца ${item.vetais_id}:`, error.message);
          }
        }
      }
    }

    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('✅ МИГРАЦИЯ ЗАВЕРШЕНА!');
    console.log(`✅ Успешно мигрировано: ${insertedCount}`);
    console.log(`⏭️  Пропущено (уже есть): ${skippedAlreadyMigrated}`);
    console.log(`⚠️  Пропущено (нет имени): ${skippedNoName}`);
    console.log(`❌ Ошибок: ${errors}`);
    console.log(`📝 Всего обработано: ${vetaisResult.rows.length}`);
    console.log('═══════════════════════════════════════════════════════════\n');

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
