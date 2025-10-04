#!/usr/bin/env tsx

/**
 * Скрипт миграции клиентов из базы Vetais в VetSystem
 * 
 * Использование:
 *   tsx scripts/migrate-vetais-to-vetsystem.ts [tenantId] [branchId]
 * 
 * Пример:
 *   tsx scripts/migrate-vetais-to-vetsystem.ts 1 null
 */

import { Client } from 'pg';

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
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   МИГРАЦИЯ КЛИЕНТОВ ИЗ VETAIS В VETSYSTEM              ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

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

    // Показать доступные клиники
    console.log('📋 Доступные клиники:');
    const tenantsResult = await vetsystemDb.query(
      'SELECT id, name, slug FROM tenants WHERE status = $1 ORDER BY name',
      ['active']
    );

    if (tenantsResult.rows.length === 0) {
      console.error('❌ Нет активных клиник в системе');
      process.exit(1);
    }

    tenantsResult.rows.forEach((tenant) => {
      console.log(`  ID ${tenant.id}: ${tenant.name} (${tenant.slug})`);
    });

    // Получить параметры из аргументов
    const tenantId = process.argv[2] || tenantsResult.rows[0].id;
    const branchIdArg = process.argv[3];
    const branchId = branchIdArg && branchIdArg !== 'null' ? branchIdArg : null;

    const selectedTenant = tenantsResult.rows.find(t => t.id === tenantId);
    if (!selectedTenant) {
      console.error(`❌ Клиника с ID ${tenantId} не найдена`);
      process.exit(1);
    }

    console.log(`\n✅ Выбрана клиника: ${selectedTenant.name}`);

    if (branchId) {
      const branchResult = await vetsystemDb.query(
        'SELECT name FROM branches WHERE id = $1 AND tenant_id = $2',
        [branchId, tenantId]
      );
      if (branchResult.rows.length > 0) {
        console.log(`✅ Филиал: ${branchResult.rows[0].name}`);
      }
    }

    // Загрузка данных из Vetais
    console.log('\n📊 Загрузка данных из Vetais...');
    const vetaisQuery = `
      SELECT 
        kod_kado,
        nazev_kado,
        telefon,
        mobil,
        email,
        adresar,
        mesto_k,
        poznamka
      FROM file_clients
      WHERE vymaz = 0
      ORDER BY kod_kado
    `;

    const vetaisResult = await vetaisDb.query(vetaisQuery);
    console.log(`✅ Найдено клиентов в Vetais: ${vetaisResult.rows.length}\n`);

    // Превью
    console.log('📝 Превью данных (первые 3 клиента):');
    console.log('-'.repeat(80));
    vetaisResult.rows.slice(0, 3).forEach((row, i) => {
      const phone = cleanPhone(row.mobil) || cleanPhone(row.telefon) || 'нет телефона';
      const email = cleanEmail(row.email) || 'нет email';
      const address = buildAddress(row.adresar, row.mesto_k) || 'нет адреса';
      
      console.log(`${i + 1}. ${row.nazev_kado}`);
      console.log(`   📞 ${phone}`);
      console.log(`   ✉️  ${email}`);
      console.log(`   📍 ${address}\n`);
    });

    // Миграция
    console.log(`🚀 Начало миграции в "${selectedTenant.name}"...\n`);
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors: Array<{ client: string; reason: string }> = [];

    for (let i = 0; i < vetaisResult.rows.length; i++) {
      const row = vetaisResult.rows[i];
      const name = row.nazev_kado?.trim();
      
      const phone = cleanPhone(row.mobil) || cleanPhone(row.telefon);
      const email = cleanEmail(row.email);
      const address = buildAddress(row.adresar, row.mesto_k);

      try {
        if (!name) {
          skippedCount++;
          errors.push({ client: `ID ${row.kod_kado}`, reason: 'Отсутствует имя' });
          continue;
        }

        if (!phone) {
          skippedCount++;
          errors.push({ client: name, reason: 'Отсутствует телефон' });
          continue;
        }

        // Проверка на дубликаты
        const duplicateCheck = await vetsystemDb.query(
          'SELECT id FROM owners WHERE tenant_id = $1 AND phone = $2',
          [tenantId, phone]
        );

        if (duplicateCheck.rows.length > 0) {
          skippedCount++;
          errors.push({ client: name, reason: `Телефон ${phone} уже существует` });
          continue;
        }

        // Вставка клиента
        await vetsystemDb.query(
          `INSERT INTO owners (tenant_id, name, phone, email, address, branch_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [tenantId, name, phone, email, address, branchId]
        );

        successCount++;
        
        if (successCount % 100 === 0) {
          process.stdout.write(`\r✅ Мигрировано: ${successCount} / ${vetaisResult.rows.length}`);
        }

      } catch (error: any) {
        errorCount++;
        errors.push({ client: name || `ID ${row.kod_kado}`, reason: error.message });
      }
    }

    // Результаты
    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 РЕЗУЛЬТАТЫ МИГРАЦИИ');
    console.log('═'.repeat(80));
    console.log(`✅ Успешно мигрировано:  ${successCount}`);
    console.log(`⚠️  Пропущено:           ${skippedCount}`);
    console.log(`❌ Ошибок:              ${errorCount}`);
    console.log(`📝 Всего обработано:    ${vetaisResult.rows.length}`);

    if (errors.length > 0) {
      console.log('\n⚠️  ДЕТАЛИ ОШИБОК И ПРОПУСКОВ (первые 20):');
      console.log('-'.repeat(80));
      errors.slice(0, 20).forEach((err, index) => {
        console.log(`${index + 1}. ${err.client}: ${err.reason}`);
      });

      if (errors.length > 20) {
        console.log(`\n... и еще ${errors.length - 20} записей`);
      }
    }

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
