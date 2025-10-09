#!/usr/bin/env tsx

/**
 * Оптимизированный скрипт обновления личных данных владельцев из Vetais
 * Использует временную таблицу для массового обновления
 * 
 * Использование:
 *   tsx scripts/update-owners-personal-data-batch.ts [tenantId]
 */

import { Client } from 'pg';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   ОБНОВЛЕНИЕ ЛИЧНЫХ ДАННЫХ ВЛАДЕЛЬЦЕВ (BATCH MODE)           ║');
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

    // Функция очистки телефона
    const cleanPhone = (phone: string | null): string | null => {
      if (!phone) return null;
      const cleaned = phone.trim().replace(/[^\d+]/g, '');
      return cleaned.length >= 10 ? cleaned : null;
    };

    // Загрузка данных из Vetais
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

    // Создание временной таблицы
    console.log('🔨 Создание временной таблицы...');
    await vetsystemDb.query(`
      CREATE TEMP TABLE temp_owner_updates (
        phone VARCHAR(50) PRIMARY KEY,
        passport_number VARCHAR(100),
        date_of_birth DATE,
        gender VARCHAR(20)
      )
    `);

    // Подготовка данных для batch вставки (убираем дубликаты по телефону)
    console.log('🔄 Подготовка данных...');
    const phoneDataMap = new Map<string, {
      passportNumber: string | null;
      dateOfBirth: Date | null;
      gender: string | null;
    }>();

    for (const row of vetaisResult.rows) {
      const phone = cleanPhone(row.mobil) || cleanPhone(row.telefon);
      if (!phone) continue;

      // Если телефон уже есть, пропускаем (берем первую запись)
      if (phoneDataMap.has(phone)) continue;

      const passportNumber = row.no_pass?.trim() || null;
      const dateOfBirth = row.date_birth ? new Date(row.date_birth) : null;
      const gender = row.gender_id === 1 ? 'male' : 
                     row.gender_id === 2 ? 'female' : null;

      phoneDataMap.set(phone, { passportNumber, dateOfBirth, gender });
    }

    const values: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    let processedCount = 0;

    for (const [phone, data] of phoneDataMap.entries()) {
      values.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
      params.push(phone, data.passportNumber, data.dateOfBirth, data.gender);
      processedCount++;

      // Вставка батчами по 1000 записей
      if (values.length >= 1000) {
        await vetsystemDb.query(`
          INSERT INTO temp_owner_updates (phone, passport_number, date_of_birth, gender)
          VALUES ${values.join(', ')}
        `, params);
        
        values.length = 0;
        params.length = 0;
        paramIndex = 1;
        process.stdout.write(`\r📥 Загружено во временную таблицу: ${processedCount}`);
      }
    }

    // Вставка оставшихся записей
    if (values.length > 0) {
      await vetsystemDb.query(`
        INSERT INTO temp_owner_updates (phone, passport_number, date_of_birth, gender)
        VALUES ${values.join(', ')}
      `, params);
      process.stdout.write(`\r📥 Загружено во временную таблицу: ${processedCount}\n`);
    }

    // Массовое обновление владельцев
    console.log('\n🚀 Выполнение массового обновления...');
    const updateResult = await vetsystemDb.query(`
      UPDATE owners o
      SET 
        passport_number = COALESCE(o.passport_number, t.passport_number),
        date_of_birth = COALESCE(o.date_of_birth, t.date_of_birth),
        gender = COALESCE(o.gender, t.gender),
        updated_at = NOW()
      FROM temp_owner_updates t
      WHERE o.tenant_id = $1 
        AND o.phone = t.phone
        AND (
          (o.passport_number IS NULL AND t.passport_number IS NOT NULL) OR
          (o.date_of_birth IS NULL AND t.date_of_birth IS NOT NULL) OR
          (o.gender IS NULL AND t.gender IS NOT NULL)
        )
    `, [tenantId]);

    const updatedCount = updateResult.rowCount || 0;

    // Статистика
    const statsResult = await vetsystemDb.query(`
      SELECT 
        COUNT(*) FILTER (WHERE o.passport_number IS NOT NULL) as with_passport,
        COUNT(*) FILTER (WHERE o.date_of_birth IS NOT NULL) as with_birth_date,
        COUNT(*) FILTER (WHERE o.gender IS NOT NULL) as with_gender,
        COUNT(*) as total
      FROM owners o
      WHERE o.tenant_id = $1
    `, [tenantId]);

    const stats = statsResult.rows[0];

    console.log('\n' + '═'.repeat(80));
    console.log('📊 РЕЗУЛЬТАТЫ ОБНОВЛЕНИЯ');
    console.log('═'.repeat(80));
    console.log(`✅ Обновлено владельцев:         ${updatedCount}`);
    console.log(`📝 Обработано записей из Vetais: ${processedCount}`);
    console.log('\n📈 СТАТИСТИКА ПО ВЛАДЕЛЬЦАМ:');
    console.log(`   Всего владельцев:             ${stats.total}`);
    console.log(`   С номером паспорта:           ${stats.with_passport}`);
    console.log(`   С датой рождения:             ${stats.with_birth_date}`);
    console.log(`   С указанием пола:             ${stats.with_gender}`);
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
