#!/usr/bin/env tsx

/**
 * Скрипт для обновления имен клиентов, мигрированных из Vetais
 * Исправляет записи, содержащие только фамилию, добавляя имя и отчество
 * 
 * Использование:
 *   tsx scripts/update-migrated-names.ts [tenantId]
 */

import { Client } from 'pg';

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
  console.log('║   ОБНОВЛЕНИЕ ИМЕН МИГРИРОВАННЫХ КЛИЕНТОВ                     ║');
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
    const selectedTenant = tenantsResult.rows.find(t => t.id === tenantId);
    
    if (!selectedTenant) {
      console.error(`❌ Клиника с ID ${tenantId} не найдена`);
      process.exit(1);
    }

    console.log(`✅ Клиника: ${selectedTenant.name}\n`);

    // Загрузить всех клиентов из VetSystem
    console.log('📋 Загрузка клиентов из VetSystem...');
    const ownersResult = await vetsystemDb.query(
      'SELECT id, name, phone FROM owners WHERE tenant_id = $1 AND phone IS NOT NULL',
      [tenantId]
    );
    console.log(`✅ Найдено клиентов: ${ownersResult.rows.length}\n`);

    // Создать map телефон -> id клиента в VetSystem
    const phoneToOwnerId = new Map<string, string>();
    ownersResult.rows.forEach(row => {
      const phone = row.phone.replace(/[^\d+]/g, '');
      phoneToOwnerId.set(phone, row.id);
    });

    // Загрузить данные из Vetais
    console.log('📊 Загрузка данных из Vetais...');
    const vetaisResult = await vetaisDb.query(`
      SELECT 
        nazev_kado,
        poznamka_kado,
        jmeno,
        telefon,
        mobil
      FROM file_clients
      WHERE vymaz = 0
    `);
    console.log(`✅ Найдено записей в Vetais: ${vetaisResult.rows.length}\n`);

    // Подготовка обновлений
    console.log('🔄 Обработка данных...');
    const updates: Array<{ id: string; name: string }> = [];
    let matchedCount = 0;
    let skippedNoMatch = 0;
    let skippedNoFullName = 0;

    for (const row of vetaisResult.rows) {
      const phone = row.mobil?.replace(/[^\d+]/g, '') || row.telefon?.replace(/[^\d+]/g, '');
      if (!phone || phone.length < 10) continue;

      const ownerId = phoneToOwnerId.get(phone);
      if (!ownerId) {
        skippedNoMatch++;
        continue;
      }

      const fullName = buildFullName(row.nazev_kado, row.poznamka_kado, row.jmeno);
      if (!fullName) {
        skippedNoFullName++;
        continue;
      }

      updates.push({ id: ownerId, name: fullName });
      matchedCount++;
    }

    console.log(`✅ Сопоставлено: ${matchedCount}`);
    console.log(`⚠️  Не найдено в VetSystem: ${skippedNoMatch}`);
    console.log(`⚠️  Нет полного имени: ${skippedNoFullName}\n`);

    if (updates.length === 0) {
      console.log('✅ Нет записей для обновления');
      return;
    }

    // Обновление данных (batch mode)
    const BATCH_SIZE = 500;
    console.log(`🚀 Начало обновления (${updates.length} записей, батчами по ${BATCH_SIZE})...\n`);
    let updatedCount = 0;

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      
      // Создать CASE WHEN для batch-обновления
      const whenClauses = batch.map(u => `WHEN '${u.id}' THEN '${u.name.replace(/'/g, "''")}'`).join(' ');
      const ids = batch.map(u => `'${u.id}'`).join(', ');
      
      const query = `
        UPDATE owners 
        SET name = CASE id ${whenClauses} END,
            updated_at = NOW()
        WHERE id IN (${ids})
      `;

      await vetsystemDb.query(query);
      updatedCount += batch.length;

      process.stdout.write(`\r✅ Обновлено: ${updatedCount} / ${updates.length} (${Math.round(updatedCount / updates.length * 100)}%)`);
    }

    console.log(`\r✅ Обновлено: ${updatedCount} / ${updates.length} (100%)`);
    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 РЕЗУЛЬТАТЫ ОБНОВЛЕНИЯ');
    console.log('═'.repeat(80));
    console.log(`✅ Успешно обновлено:       ${updatedCount}`);
    console.log(`⚠️  Не найдено в VetSystem: ${skippedNoMatch}`);
    console.log(`⚠️  Нет полного имени:      ${skippedNoFullName}`);
    console.log('\n✨ Обновление завершено!\n');

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
