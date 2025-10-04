#!/usr/bin/env tsx

/**
 * Скрипт миграции клиентов из базы Vetais в VetSystem
 * 
 * Использование:
 * 1. Настройте параметры подключения к базе Vetais ниже
 * 2. Запустите: npm run migrate:vetais
 */

import { Client } from 'pg';
import * as readline from 'readline';

// Интерфейс для чтения из консоли
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

// Конфигурация подключения к базе Vetais
interface VetaisConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  tableName: string;
}

// Маппинг полей Vetais -> VetSystem
interface FieldMapping {
  name: string;      // Поле для имени клиента
  phone: string;     // Поле для телефона
  email?: string;    // Поле для email (опционально)
  address?: string;  // Поле для адреса (опционально)
}

// Конфигурация целевой системы
interface TargetConfig {
  tenantId: string;
  branchId: string | null;
}

async function main() {
  console.log('=== Миграция клиентов из Vetais в VetSystem ===\n');

  // Шаг 1: Получить параметры подключения к Vetais
  console.log('Шаг 1: Параметры подключения к базе Vetais');
  const vetaisConfig: VetaisConfig = {
    host: await question('Хост базы Vetais (обычно localhost): ') || 'localhost',
    port: parseInt(await question('Порт базы Vetais (обычно 5432): ') || '5432'),
    database: await question('Имя базы данных Vetais: '),
    user: await question('Пользователь базы Vetais: '),
    password: await question('Пароль базы Vetais: '),
    tableName: await question('Название таблицы клиентов в Vetais: ')
  };

  // Шаг 2: Настройка маппинга полей
  console.log('\nШаг 2: Маппинг полей (как называются поля в таблице Vetais)');
  const fieldMapping: FieldMapping = {
    name: await question('Поле для имени клиента: '),
    phone: await question('Поле для телефона: '),
    email: await question('Поле для email (Enter для пропуска): ') || undefined,
    address: await question('Поле для адреса (Enter для пропуска): ') || undefined
  };

  // Шаг 3: Получить список tenants из VetSystem
  console.log('\nШаг 3: Выбор целевого tenant и филиала');
  const vetsystemDb = new Client({
    connectionString: process.env.DATABASE_URL
  });

  await vetsystemDb.connect();

  // Получить список tenants
  const tenantsResult = await vetsystemDb.query('SELECT id, name, slug FROM tenants WHERE status = $1', ['active']);
  
  if (tenantsResult.rows.length === 0) {
    console.error('Ошибка: Нет активных tenants в системе');
    process.exit(1);
  }

  console.log('\nДоступные клиники (tenants):');
  tenantsResult.rows.forEach((tenant, index) => {
    console.log(`${index + 1}. ${tenant.name} (${tenant.slug})`);
  });

  const tenantIndex = parseInt(await question('\nВыберите номер клиники: ')) - 1;
  const selectedTenant = tenantsResult.rows[tenantIndex];

  if (!selectedTenant) {
    console.error('Ошибка: Неверный номер клиники');
    process.exit(1);
  }

  // Получить филиалы выбранного tenant
  const branchesResult = await vetsystemDb.query(
    'SELECT id, name FROM branches WHERE tenant_id = $1',
    [selectedTenant.id]
  );

  let selectedBranchId: string | null = null;

  if (branchesResult.rows.length > 0) {
    console.log('\nДоступные филиалы:');
    branchesResult.rows.forEach((branch, index) => {
      console.log(`${index + 1}. ${branch.name}`);
    });
    console.log('0. Без привязки к филиалу');

    const branchIndex = parseInt(await question('\nВыберите номер филиала: '));
    if (branchIndex > 0) {
      selectedBranchId = branchesResult.rows[branchIndex - 1]?.id || null;
    }
  }

  const targetConfig: TargetConfig = {
    tenantId: selectedTenant.id,
    branchId: selectedBranchId
  };

  // Шаг 4: Подключение к базе Vetais и миграция
  console.log('\n=== Начало миграции ===');
  console.log(`Источник: ${vetaisConfig.database}@${vetaisConfig.host}`);
  console.log(`Назначение: ${selectedTenant.name} (tenant: ${selectedTenant.id})`);
  if (selectedBranchId) {
    const branch = branchesResult.rows.find(b => b.id === selectedBranchId);
    console.log(`Филиал: ${branch?.name}`);
  }

  const vetaisDb = new Client({
    host: vetaisConfig.host,
    port: vetaisConfig.port,
    database: vetaisConfig.database,
    user: vetaisConfig.user,
    password: vetaisConfig.password
  });

  try {
    await vetaisDb.connect();
    console.log('✓ Подключение к базе Vetais установлено');

    // Построить SQL запрос для выборки данных из Vetais
    const fields = [fieldMapping.name, fieldMapping.phone];
    if (fieldMapping.email) fields.push(fieldMapping.email);
    if (fieldMapping.address) fields.push(fieldMapping.address);

    const vetaisQuery = `SELECT ${fields.join(', ')} FROM ${vetaisConfig.tableName}`;
    const vetaisResult = await vetaisDb.query(vetaisQuery);

    console.log(`\nНайдено клиентов в Vetais: ${vetaisResult.rows.length}`);

    if (vetaisResult.rows.length === 0) {
      console.log('Нет данных для миграции');
      return;
    }

    // Подтверждение миграции
    const confirm = await question(`\nПродолжить миграцию ${vetaisResult.rows.length} клиентов? (yes/no): `);
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Миграция отменена');
      return;
    }

    // Миграция данных
    let migratedCount = 0;
    let errorCount = 0;
    const errors: Array<{ client: any; error: string }> = [];

    for (const row of vetaisResult.rows) {
      try {
        const name = row[fieldMapping.name];
        const phone = row[fieldMapping.phone];
        const email = fieldMapping.email ? row[fieldMapping.email] : null;
        const address = fieldMapping.address ? row[fieldMapping.address] : null;

        // Проверка обязательных полей
        if (!name || !phone) {
          errorCount++;
          errors.push({ 
            client: row, 
            error: 'Отсутствует обязательное поле (имя или телефон)' 
          });
          continue;
        }

        // Проверка на дубликаты по телефону
        const duplicateCheck = await vetsystemDb.query(
          'SELECT id FROM owners WHERE tenant_id = $1 AND phone = $2',
          [targetConfig.tenantId, phone]
        );

        if (duplicateCheck.rows.length > 0) {
          errorCount++;
          errors.push({ 
            client: row, 
            error: `Клиент с телефоном ${phone} уже существует` 
          });
          continue;
        }

        // Вставка клиента
        await vetsystemDb.query(
          `INSERT INTO owners (tenant_id, name, phone, email, address, branch_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [targetConfig.tenantId, name, phone, email, address, targetConfig.branchId]
        );

        migratedCount++;
        process.stdout.write(`\rМигрировано: ${migratedCount}/${vetaisResult.rows.length}`);
      } catch (error: any) {
        errorCount++;
        errors.push({ 
          client: row, 
          error: error.message 
        });
      }
    }

    console.log('\n\n=== Результаты миграции ===');
    console.log(`✓ Успешно мигрировано: ${migratedCount}`);
    console.log(`✗ Ошибок: ${errorCount}`);

    if (errors.length > 0) {
      console.log('\nПервые 10 ошибок:');
      errors.slice(0, 10).forEach((err, index) => {
        console.log(`${index + 1}. ${err.error}`);
        console.log(`   Данные:`, JSON.stringify(err.client, null, 2));
      });
    }

  } catch (error: any) {
    console.error('\nОшибка миграции:', error.message);
    process.exit(1);
  } finally {
    await vetaisDb.end();
    await vetsystemDb.end();
    rl.close();
  }
}

main().catch(console.error);
