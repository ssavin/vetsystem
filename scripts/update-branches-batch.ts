#!/usr/bin/env tsx

/**
 * Оптимизированное batch-обновление филиалов
 */

import { Client } from 'pg';

const BATCH_SIZE = 500;

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   BATCH-ОБНОВЛЕНИЕ ФИЛИАЛОВ (ОПТИМИЗИРОВАНО)                 ║');
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

    // Загрузка существующих филиалов
    console.log('📍 Загрузка филиалов...');
    const branchesResult = await vetsystemDb.query(
      'SELECT id, name FROM branches WHERE tenant_id = $1',
      [tenantId]
    );

    const branchMapping: Map<number, string> = new Map();
    
    // Сопоставление на основе названий
    for (const branch of branchesResult.rows) {
      if (branch.name.includes('Бутово')) {
        branchMapping.set(10000, branch.id);
      } else if (branch.name.includes('Лобачевского')) {
        branchMapping.set(10001, branch.id);
      } else if (branch.name.includes('Новопеределкино')) {
        branchMapping.set(10002, branch.id);
      }
    }

    console.log(`✅ Найдено ${branchMapping.size} филиалов для сопоставления\n`);

    // Загрузка клиентов из Vetais
    console.log('📊 Загрузка клиентов из Vetais...');
    const vetaisClients = await vetaisDb.query(`
      SELECT 
        telefon,
        mobil,
        clinic_id,
        created_clinic_id
      FROM file_clients
      WHERE vymaz = 0
    `);

    const cleanPhone = (phone: string | null) => {
      if (!phone) return null;
      const cleaned = phone.trim().replace(/[^\d+]/g, '');
      return cleaned.length >= 10 ? cleaned : null;
    };

    // Создаем карту телефон -> branch_id
    const updates: Array<{ phone: string; branchId: string }> = [];
    
    for (const row of vetaisClients.rows) {
      const phone = cleanPhone(row.mobil) || cleanPhone(row.telefon);
      if (!phone) continue;

      const clinicId = row.clinic_id || row.created_clinic_id;
      if (!clinicId || clinicId === -1) continue;

      const branchId = branchMapping.get(clinicId);
      if (!branchId) continue;

      updates.push({ phone, branchId });
    }

    console.log(`✅ Подготовлено ${updates.length} обновлений\n`);

    // Batch обновление
    console.log('🔄 Batch-обновление...\n');
    let updatedCount = 0;

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      
      // Используем CASE для batch-обновления
      const phoneList = batch.map(u => u.phone);
      const caseStatements = batch.map((u, idx) => 
        `WHEN phone = '${u.phone.replace(/'/g, "''")}' THEN '${u.branchId}'`
      ).join(' ');

      const query = `
        UPDATE owners 
        SET branch_id = CASE ${caseStatements} ELSE branch_id END,
            updated_at = NOW()
        WHERE tenant_id = $1 
          AND phone = ANY($2::text[])
          AND (branch_id IS NULL OR branch_id != CASE ${caseStatements} ELSE branch_id END)
      `;

      const result = await vetsystemDb.query(query, [tenantId, phoneList]);
      updatedCount += result.rowCount || 0;

      process.stdout.write(`\r✅ Обработано: ${Math.min(i + BATCH_SIZE, updates.length)} / ${updates.length}`);
    }

    console.log(`\n\n✅ Обновлено записей: ${updatedCount}\n`);

    // Статистика
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

    console.log('📊 СТАТИСТИКА ПО ФИЛИАЛАМ:');
    console.log('='.repeat(80));
    branchStats.rows.forEach(row => {
      console.log(`  ${row.branch_name.padEnd(50)} ${row.client_count} клиентов`);
    });

    const noBranchCount = await vetsystemDb.query(
      'SELECT COUNT(*) FROM owners WHERE tenant_id = $1 AND branch_id IS NULL',
      [tenantId]
    );
    console.log(`  ${'(Без филиала)'.padEnd(50)} ${noBranchCount.rows[0].count} клиентов`);

    console.log('\n✨ Обновление завершено!\n');

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
