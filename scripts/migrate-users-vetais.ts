#!/usr/bin/env tsx

/**
 * Миграция пользователей из Vetais в VetSystem
 * 
 * Использование:
 *   tsx scripts/migrate-users-vetais.ts [tenantId]
 */

import { Client } from 'pg';
import bcrypt from 'bcryptjs';

const ROLE_MAPPING: Record<number, string> = {
  1: 'врач',                  // Врач
  2: 'администратор',         // Администратор
  3: 'администратор',         // Администратор (вариант 2)
  7: 'менеджер',             // Менеджер
  15: 'руководитель',        // Руководитель
  10000: 'врач',             // Врач (старый код)
  10002: 'администратор',    // Администратор (старый код)
  10003: 'врач',             // Врач специалист
};

const DEPARTMENT_MAPPING: Record<number, string> = {
  0: 'Не указано',
  1: 'Общий прием',
  10001: 'Хирургия',
  10002: 'Терапия',
  10003: 'Диагностика',
  10005: 'Стационар',
};

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║        МИГРАЦИЯ ПОЛЬЗОВАТЕЛЕЙ ИЗ VETAIS В VETSYSTEM          ║');
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
      'SELECT id, name FROM tenants WHERE status = $1 ORDER BY name',
      ['active']
    );

    const tenantId = process.argv[2] || tenantsResult.rows[0].id;
    const selectedTenant = tenantsResult.rows.find(t => t.id === tenantId);
    
    if (!selectedTenant) {
      console.error(`❌ Клиника с ID ${tenantId} не найдена`);
      process.exit(1);
    }

    console.log(`✅ Клиника: ${selectedTenant.name}\n`);

    // Загрузить маппинг филиалов
    const branchesResult = await vetsystemDb.query(`
      SELECT id, name, vetais_clinic_id 
      FROM branches 
      WHERE tenant_id = $1
    `, [tenantId]);

    const clinicToBranch = new Map<number, string>();
    branchesResult.rows.forEach(row => {
      if (row.vetais_clinic_id) {
        clinicToBranch.set(row.vetais_clinic_id, row.id);
      }
    });

    console.log('📍 Маппинг филиалов:');
    clinicToBranch.forEach((branchId, clinicId) => {
      const branch = branchesResult.rows.find(b => b.id === branchId);
      console.log(`  Vetais ${clinicId} → ${branch?.name}`);
    });
    console.log();

    // Загрузить пользователей из Vetais
    console.log('📊 Загрузка пользователей из Vetais...');
    const vetaisUsers = await vetaisDb.query(`
      SELECT 
        kod_uzivatele,
        jmeno,
        prijmeni,
        otcestvo,
        funkce,
        telefon,
        mobile,
        email,
        id_kliniky,
        id_ordinace,
        is_doctor
      FROM system_users
      WHERE vymaz = 0 AND is_active = 1
      ORDER BY kod_uzivatele
    `);
    console.log(`✅ Загружено ${vetaisUsers.rows.length} активных пользователей\n`);

    // Статистика
    const stats = {
      total: vetaisUsers.rows.length,
      created: 0,
      skipped: 0,
      errors: 0,
      byRole: new Map<string, number>(),
    };

    // Хэшировать временный пароль
    const defaultPassword = await bcrypt.hash('Alisa2024!', 10);

    console.log('🔄 Начало миграции...\n');

    for (const user of vetaisUsers.rows) {
      try {
        const fullName = [
          user.prijmeni?.trim(),
          user.jmeno?.trim(),
          user.otcestvo?.trim(),
        ].filter(Boolean).join(' ') || 'Без имени';

        const role = ROLE_MAPPING[user.funkce] || 'врач';
        const phone = user.mobile?.trim() || user.telefon?.trim() || null;
        const email = user.email?.trim() || null;
        const branchId = clinicToBranch.get(user.id_kliniky) || null;
        const department = DEPARTMENT_MAPPING[user.id_ordinace] || `Отделение ${user.id_ordinace}`;

        // Генерировать username из email или телефона с добавлением vetais_id
        let username = `user_${user.kod_uzivatele}`;
        if (email && email.includes('@')) {
          const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
          username = `${emailPrefix}_${user.kod_uzivatele}`;
        } else if (phone) {
          const phoneDigits = phone.replace(/[^0-9]/g, '');
          username = `${phoneDigits}_${user.kod_uzivatele}`;
        }

        // Проверить, существует ли пользователь
        const existingUser = await vetsystemDb.query(
          'SELECT id FROM users WHERE tenant_id = $1 AND vetais_id = $2',
          [tenantId, user.kod_uzivatele]
        );

        if (existingUser.rows.length > 0) {
          console.log(`⏭️  Пропуск: ${fullName} (уже существует)`);
          stats.skipped++;
          continue;
        }

        // Создать пользователя
        await vetsystemDb.query(`
          INSERT INTO users (
            tenant_id,
            username,
            password,
            email,
            full_name,
            role,
            phone,
            branch_id,
            department,
            vetais_id,
            status,
            locale
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          tenantId,
          username,
          defaultPassword,
          email,
          fullName,
          role,
          phone,
          branchId,
          department,
          user.kod_uzivatele,
          'active',
          'ru'
        ]);

        console.log(`✅ ${fullName} → ${role} (${department})`);
        stats.created++;
        stats.byRole.set(role, (stats.byRole.get(role) || 0) + 1);

      } catch (error: any) {
        console.error(`❌ Ошибка при создании ${user.jmeno} ${user.prijmeni}:`, error.message);
        stats.errors++;
      }
    }

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                      ИТОГОВАЯ СТАТИСТИКА                      ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    console.log(`📊 Всего пользователей в Vetais: ${stats.total}`);
    console.log(`✅ Создано: ${stats.created}`);
    console.log(`⏭️  Пропущено (уже есть): ${stats.skipped}`);
    console.log(`❌ Ошибок: ${stats.errors}\n`);

    console.log('👥 По ролям:');
    stats.byRole.forEach((count, role) => {
      console.log(`  ${role}: ${count}`);
    });

    console.log('\n🔐 Временный пароль для всех пользователей: Alisa2024!');
    console.log('⚠️  Пользователи должны сменить пароль при первом входе\n');

    console.log('✅ Миграция завершена!');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  } finally {
    await vetsystemDb.end();
    await vetaisDb.end();
  }
}

main();
