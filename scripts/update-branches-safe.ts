#!/usr/bin/env tsx

/**
 * Безопасное обновление филиалов для существующих клиентов
 * Без удаления данных!
 */

import { Client } from 'pg';

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   БЕЗОПАСНОЕ ОБНОВЛЕНИЕ ФИЛИАЛОВ КЛИЕНТОВ                    ║');
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
    await vetsystemDb.connect();
    await vetaisDb.connect();
    console.log('✅ Подключение успешно!\n');

    const tenantId = process.argv[2] || 'default-tenant-001';

    // ШАГ 1: Создание филиалов
    console.log('📍 ШАГ 1: Создание филиалов...');
    console.log('='.repeat(80));

    const vetaisClinics = await vetaisDb.query(`
      SELECT id, name, clinic_city, clinic_street, clinic_phone, clinic_email
      FROM file_clinics
      WHERE del = 0
      ORDER BY id
    `);

    const branchMapping: Map<number, string> = new Map();

    for (const clinic of vetaisClinics.rows) {
      const existingBranch = await vetsystemDb.query(
        'SELECT id FROM branches WHERE tenant_id = $1 AND name = $2',
        [tenantId, clinic.name]
      );

      let branchId: string;

      if (existingBranch.rows.length > 0) {
        branchId = existingBranch.rows[0].id;
        console.log(`✓ Филиал существует: ${clinic.name} (ID: ${branchId})`);
      } else {
        const city = clinic.clinic_city || 'Москва';
        const address = clinic.clinic_street || clinic.name;
        const phone = clinic.clinic_phone || '+7 (800) 555-95-13';
        
        const newBranch = await vetsystemDb.query(
          `INSERT INTO branches (tenant_id, name, address, city, phone, email, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           RETURNING id`,
          [tenantId, clinic.name, address, city, phone, clinic.clinic_email]
        );
        
        branchId = newBranch.rows[0].id;
        console.log(`✓ Создан филиал: ${clinic.name} (ID: ${branchId})`);
      }

      branchMapping.set(clinic.id, branchId);
    }

    console.log(`\n✅ Создано сопоставление для ${branchMapping.size} филиалов\n`);

    // ШАГ 2: Загрузка клиентов из Vetais с их clinic_id
    console.log('📊 ШАГ 2: Загрузка привязки клиентов к филиалам из Vetais...');
    console.log('='.repeat(80));

    const vetaisClients = await vetaisDb.query(`
      SELECT 
        telefon,
        mobil,
        clinic_id,
        created_clinic_id
      FROM file_clients
      WHERE vymaz = 0
      ORDER BY kod_kado
    `);

    // Создаем карту телефон -> branch_id из Vetais
    const phoneToVetaisBranch: Map<string, string> = new Map();
    
    for (const row of vetaisClients.rows) {
      const cleanPhone = (phone: string | null) => {
        if (!phone) return null;
        const cleaned = phone.trim().replace(/[^\d+]/g, '');
        return cleaned.length >= 10 ? cleaned : null;
      };

      const phone = cleanPhone(row.mobil) || cleanPhone(row.telefon);
      if (!phone) continue;

      const clinicId = row.clinic_id || row.created_clinic_id;
      if (clinicId && clinicId !== -1) {
        const branchId = branchMapping.get(clinicId);
        if (branchId) {
          phoneToVetaisBranch.set(phone, branchId);
        }
      }
    }

    console.log(`✅ Сопоставлено ${phoneToVetaisBranch.size} телефонов с филиалами\n`);

    // ШАГ 3: Обновление существующих клиентов в VetSystem
    console.log('🔄 ШАГ 3: Обновление существующих клиентов...');
    console.log('='.repeat(80));

    const existingClients = await vetsystemDb.query(
      'SELECT id, phone, branch_id FROM owners WHERE tenant_id = $1 AND phone IS NOT NULL',
      [tenantId]
    );

    let updatedCount = 0;
    let alreadyCorrect = 0;
    let noBranchMapping = 0;

    for (const client of existingClients.rows) {
      const vetaisBranchId = phoneToVetaisBranch.get(client.phone);
      
      if (!vetaisBranchId) {
        noBranchMapping++;
        continue;
      }

      if (client.branch_id === vetaisBranchId) {
        alreadyCorrect++;
        continue;
      }

      await vetsystemDb.query(
        'UPDATE owners SET branch_id = $1, updated_at = NOW() WHERE id = $2',
        [vetaisBranchId, client.id]
      );
      
      updatedCount++;

      if (updatedCount % 100 === 0) {
        process.stdout.write(`\r✅ Обновлено: ${updatedCount}`);
      }
    }

    console.log(`\n\n✅ Обновлено клиентов: ${updatedCount}`);
    console.log(`✓ Уже правильно: ${alreadyCorrect}`);
    console.log(`⚠️  Без сопоставления: ${noBranchMapping}\n`);

    // Статистика по филиалам
    console.log('📊 СТАТИСТИКА ПО ФИЛИАЛАМ:');
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

    console.log('\n' + '═'.repeat(80));
    console.log('✨ Обновление завершено!\n');

  } catch (error: any) {
    console.error('\n❌ Ошибка:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await vetaisDb.end();
    await vetsystemDb.end();
  }
}

main().catch(console.error);
