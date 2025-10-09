#!/usr/bin/env tsx

/**
 * Скрипт обновления личных данных владельцев из Vetais
 * Импортирует: номер паспорта (no_pass), дату рождения (date_birth), пол (gender)
 * 
 * Использование:
 *   tsx scripts/update-owners-personal-data.ts [tenantId]
 */

import { Client } from 'pg';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   ОБНОВЛЕНИЕ ЛИЧНЫХ ДАННЫХ ВЛАДЕЛЬЦЕВ ИЗ VETAIS              ║');
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

    // Загрузка данных из Vetais с личными данными
    console.log('📊 Загрузка данных из Vetais...');
    const vetaisResult = await vetaisDb.query(`
      SELECT 
        telefon,
        mobil,
        no_pass,
        date_birth,
        gender_id
      FROM file_clients
      WHERE vymaz = 0 
        AND (no_pass IS NOT NULL OR date_birth IS NOT NULL OR gender_id IS NOT NULL)
    `);
    console.log(`✅ Найдено записей с личными данными: ${vetaisResult.rows.length}\n`);

    // Подготовка данных для обновления
    console.log('🔄 Обработка данных...');
    
    let updatedCount = 0;
    let notFoundCount = 0;
    let alreadyHasDataCount = 0;
    let skippedNoPhoneCount = 0;

    for (const row of vetaisResult.rows) {
      // Очистка телефона для поиска
      const cleanPhone = (phone: string | null): string | null => {
        if (!phone) return null;
        const cleaned = phone.trim().replace(/[^\d+]/g, '');
        return cleaned.length >= 10 ? cleaned : null;
      };

      const phone = cleanPhone(row.mobil) || cleanPhone(row.telefon);
      
      if (!phone) {
        skippedNoPhoneCount++;
        continue;
      }

      // Поиск владельца по телефону
      const ownerResult = await vetsystemDb.query(
        'SELECT id, passport_number, date_of_birth, gender FROM owners WHERE tenant_id = $1 AND phone = $2',
        [tenantId, phone]
      );

      if (ownerResult.rows.length === 0) {
        notFoundCount++;
        continue;
      }

      const owner = ownerResult.rows[0];

      // Проверка, есть ли уже данные
      if (owner.passport_number && owner.date_of_birth && owner.gender) {
        alreadyHasDataCount++;
        continue;
      }

      // Подготовка данных для обновления
      const passportNumber = row.no_pass?.trim() || null;
      const dateOfBirth = row.date_birth ? new Date(row.date_birth) : null;
      // gender_id: 1 = мужской, 2 = женский (предположительно)
      const gender = row.gender_id === 1 ? 'male' : 
                     row.gender_id === 2 ? 'female' : null;

      // Обновление только пустых полей
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (!owner.passport_number && passportNumber) {
        updates.push(`passport_number = $${paramIndex++}`);
        params.push(passportNumber);
      }

      if (!owner.date_of_birth && dateOfBirth) {
        updates.push(`date_of_birth = $${paramIndex++}`);
        params.push(dateOfBirth);
      }

      if (!owner.gender && gender) {
        updates.push(`gender = $${paramIndex++}`);
        params.push(gender);
      }

      if (updates.length > 0) {
        params.push(owner.id);
        const query = `
          UPDATE owners 
          SET ${updates.join(', ')}, updated_at = NOW()
          WHERE id = $${paramIndex}
        `;
        
        await vetsystemDb.query(query, params);
        updatedCount++;

        if (updatedCount % 100 === 0) {
          process.stdout.write(`\r✅ Обновлено: ${updatedCount}`);
        }
      }
    }

    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 РЕЗУЛЬТАТЫ ОБНОВЛЕНИЯ');
    console.log('═'.repeat(80));
    console.log(`✅ Успешно обновлено:        ${updatedCount}`);
    console.log(`⚠️  Владельцев не найдено:    ${notFoundCount}`);
    console.log(`ℹ️  Уже имеют данные:         ${alreadyHasDataCount}`);
    console.log(`⚠️  Пропущено (нет телефона): ${skippedNoPhoneCount}`);
    console.log(`📝 Всего обработано:          ${vetaisResult.rows.length}`);
    console.log('\n✨ Обновление завершено!\n');

  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await vetsystemDb.end();
    await vetaisDb.end();
  }
}

main();
