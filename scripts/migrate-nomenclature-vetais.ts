/**
 * Миграция номенклатуры (услуги и товары) из базы Vetais в VetSystem
 *
 * Запуск:
 *   DATABASE_URL=... npx tsx scripts/migrate-nomenclature-vetais.ts [tenantId] [vetaisDb]
 *
 * Пример:
 *   DATABASE_URL=... npx tsx scripts/migrate-nomenclature-vetais.ts default-tenant-001 vetais_alisavet
 *   DATABASE_URL=... npx tsx scripts/migrate-nomenclature-vetais.ts e7c3459d-599b-4570-858f-1674dbd8db82 vetais_haks
 *
 * Параметры по умолчанию:
 *   tenantId = default-tenant-001
 *   vetaisDb = vetais_alisavet
 *
 * Флаги:
 *   --dry-run  : только подсчёт, без вставки в базу
 *   --all-types: включить позиции без типа (id_type = -1)
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';

// ─── Аргументы командной строки ──────────────────────────────────────────────
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const flags = process.argv.slice(2).filter(a => a.startsWith('--'));
const DRY_RUN = flags.includes('--dry-run');
const INCLUDE_UNTYPED = flags.includes('--all-types');

const TENANT_ID = args[0] || 'default-tenant-001';
const VETAIS_DB  = args[1] || 'vetais_alisavet';

const VETAIS_HOST     = process.env.VETAIS_DB_HOST     || '45.128.206.134';
const VETAIS_PORT     = parseInt(process.env.VETAIS_DB_PORT || '5454');
const VETAIS_USER     = process.env.VETAIS_DB_USER     || 'postgres';
const VETAIS_PASSWORD = process.env.VETAIS_DB_PASSWORD || 'ASPI6rin';

// ─── Маппинг типов Vetais ─────────────────────────────────────────────────────
// id_type → { table: 'services'|'products', category: string }
const TYPE_MAP: Record<number, { table: 'services' | 'products'; category: string }> = {
  10005: { table: 'services',  category: 'Ветеринарные услуги' },
  10007: { table: 'services',  category: 'Анализы' },
  10001: { table: 'services',  category: 'Груминг' },
  10006: { table: 'products',  category: 'Препараты' },
  10008: { table: 'products',  category: 'Биопрепараты' },
  10009: { table: 'products',  category: 'Материалы' },
  10010: { table: 'products',  category: 'Аксессуары' },
  10011: { table: 'products',  category: 'Акции' },
  10012: { table: 'products',  category: 'Корма' },
  10013: { table: 'products',  category: 'Медицинские препараты' },
  10014: { table: 'products',  category: 'Зооаптека' },
  10015: { table: 'products',  category: 'Лакомства' },
  10016: { table: 'products',  category: 'Гигиена' },
};

// ─── Подключения ──────────────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(60));
  console.log(`Миграция номенклатуры из ${VETAIS_DB} → tenant ${TENANT_ID}`);
  if (DRY_RUN)       console.log('⚠️  DRY-RUN: записи НЕ будут вставлены');
  if (INCLUDE_UNTYPED) console.log('ℹ️  Включён режим --all-types (id_type = -1)');
  console.log('='.repeat(60));

  // Подключение к Vetais
  const vetaisPool = new Pool({
    host: VETAIS_HOST,
    port: VETAIS_PORT,
    user: VETAIS_USER,
    password: VETAIS_PASSWORD,
    database: VETAIS_DB,
    connectionTimeoutMillis: 15000,
  });

  // Подключение к VetSystem
  const vetsysPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 15000,
  });

  try {
    // 1. Загружаем все активные позиции из Vetais
    console.log('\n📥 Загрузка позиций из Vetais...');

    const untypedFilter = INCLUDE_UNTYPED ? '' : 'AND si.id_type != -1';

    const { rows: vetaisItems } = await vetaisPool.query(`
      SELECT
        si.id              AS vetais_id,
        si.name            AS name,
        si.id_type         AS id_type,
        it.name            AS type_name,
        si.code            AS code,
        COALESCE(
          (SELECT MAX(sip.sale_price)
           FROM stock_item_prices sip
           WHERE sip.item_id = si.id AND sip.sale_price > 0),
          0
        )                  AS price
      FROM stock_item si
      LEFT JOIN items_type it ON it.id = si.id_type
      WHERE si.deleted = 0
        ${untypedFilter}
      ORDER BY si.id
    `);

    console.log(`✅ Найдено ${vetaisItems.length} активных позиций в Vetais`);

    // 2. Загружаем уже существующие позиции в VetSystem (по name + external_id)
    console.log('\n📋 Загрузка существующих позиций из VetSystem...');

    const { rows: existingServices } = await vetsysPool.query(
      `SELECT LOWER(name) AS name_lower, external_id FROM services WHERE tenant_id = $1`,
      [TENANT_ID]
    );
    const { rows: existingProducts } = await vetsysPool.query(
      `SELECT LOWER(name) AS name_lower, external_id FROM products WHERE tenant_id = $1`,
      [TENANT_ID]
    );

    const existingServiceNames = new Set(existingServices.map(r => r.name_lower));
    const existingServiceExtIds = new Set(
      existingServices.filter(r => r.external_id).map(r => r.external_id)
    );
    const existingProductNames = new Set(existingProducts.map(r => r.name_lower));
    const existingProductExtIds = new Set(
      existingProducts.filter(r => r.external_id).map(r => r.external_id)
    );

    console.log(`  Уже есть услуг: ${existingServices.length}`);
    console.log(`  Уже есть товаров: ${existingProducts.length}`);

    // 3. Разбиваем и фильтруем
    const toInsertServices: typeof vetaisItems = [];
    const toInsertProducts: typeof vetaisItems = [];
    const skipped = { duplicate: 0, noType: 0, noName: 0 };

    for (const item of vetaisItems) {
      if (!item.name || item.name.trim() === '') {
        skipped.noName++;
        continue;
      }

      const mapping = TYPE_MAP[item.id_type];

      if (!mapping) {
        // id_type = -1 или неизвестный
        if (INCLUDE_UNTYPED) {
          // Попытка определить по имени — если похоже на лекарство, то product, иначе service
          const nameLower = item.name.toLowerCase();
          const isLikelyService =
            nameLower.includes('прием') ||
            nameLower.includes('приём') ||
            nameLower.includes('осмотр') ||
            nameLower.includes('консультация') ||
            nameLower.includes('операция') ||
            nameLower.includes('фиксация') ||
            nameLower.includes('кремация') ||
            nameLower.includes('терапия') ||
            nameLower.includes('процедура') ||
            nameLower.includes('снятие') ||
            nameLower.includes('обработка') ||
            nameLower.includes('введение') ||
            nameLower.includes('снятие');

          if (isLikelyService) {
            const extId = String(item.vetais_id);
            if (existingServiceExtIds.has(extId)) { skipped.duplicate++; continue; }
            if (existingServiceNames.has(item.name.toLowerCase())) { skipped.duplicate++; continue; }
            toInsertServices.push({ ...item, _category: 'Прочие услуги' });
          } else {
            const extId = String(item.vetais_id);
            if (existingProductExtIds.has(extId)) { skipped.duplicate++; continue; }
            if (existingProductNames.has(item.name.toLowerCase())) { skipped.duplicate++; continue; }
            toInsertProducts.push({ ...item, _category: 'Прочие товары' });
          }
        } else {
          skipped.noType++;
        }
        continue;
      }

      const extId = String(item.vetais_id);
      if (mapping.table === 'services') {
        if (existingServiceExtIds.has(extId)) { skipped.duplicate++; continue; }
        if (existingServiceNames.has(item.name.toLowerCase())) { skipped.duplicate++; continue; }
        toInsertServices.push({ ...item, _category: mapping.category });
      } else {
        if (existingProductExtIds.has(extId)) { skipped.duplicate++; continue; }
        if (existingProductNames.has(item.name.toLowerCase())) { skipped.duplicate++; continue; }
        toInsertProducts.push({ ...item, _category: mapping.category });
      }
    }

    console.log(`\n📊 Анализ:`);
    console.log(`  Новых услуг для вставки:  ${toInsertServices.length}`);
    console.log(`  Новых товаров для вставки: ${toInsertProducts.length}`);
    console.log(`  Пропущено (дубли):         ${skipped.duplicate}`);
    console.log(`  Пропущено (нет типа):      ${skipped.noType}`);
    console.log(`  Пропущено (нет названия):  ${skipped.noName}`);

    if (DRY_RUN) {
      console.log('\n✅ DRY-RUN завершён. Запустите без --dry-run для реальной вставки.');

      // Показать первые 10 для проверки
      console.log('\n--- Первые 10 услуг для вставки ---');
      toInsertServices.slice(0, 10).forEach(s =>
        console.log(`  [${s._category}] ${s.name} — ${s.price}₽`)
      );
      console.log('\n--- Первые 10 товаров для вставки ---');
      toInsertProducts.slice(0, 10).forEach(p =>
        console.log(`  [${p._category}] ${p.name} — ${p.price}₽`)
      );
      return;
    }

    // 4. Вставляем услуги батчами
    if (toInsertServices.length > 0) {
      console.log(`\n⬆️  Вставка ${toInsertServices.length} услуг...`);
      let inserted = 0;
      const BATCH = 100;
      for (let i = 0; i < toInsertServices.length; i += BATCH) {
        const batch = toInsertServices.slice(i, i + BATCH);
        const values = batch.map((item, idx) => {
          const base = idx * 6;
          return `($${base+1}, $${base+2}, $${base+3}, $${base+4}, $${base+5}, $${base+6})`;
        }).join(', ');
        const params: any[] = [];
        for (const item of batch) {
          params.push(
            item.name.trim().substring(0, 255),
            item._category,
            Math.max(parseFloat(item.price) || 0, 0),
            TENANT_ID,
            String(item.vetais_id),
            VETAIS_DB
          );
        }
        await vetsysPool.query(`
          INSERT INTO services (name, category, price, tenant_id, external_id, external_system)
          VALUES ${values}
          ON CONFLICT DO NOTHING
        `, params);
        inserted += batch.length;
        process.stdout.write(`\r  Вставлено: ${inserted}/${toInsertServices.length}`);
      }
      console.log(`\n✅ Услуги вставлены`);
    }

    // 5. Вставляем товары батчами
    if (toInsertProducts.length > 0) {
      console.log(`\n⬆️  Вставка ${toInsertProducts.length} товаров...`);
      let inserted = 0;
      const BATCH = 100;
      for (let i = 0; i < toInsertProducts.length; i += BATCH) {
        const batch = toInsertProducts.slice(i, i + BATCH);
        const values = batch.map((item, idx) => {
          const base = idx * 7;
          return `($${base+1}, $${base+2}, $${base+3}, $${base+4}, $${base+5}, $${base+6}, $${base+7})`;
        }).join(', ');
        const params: any[] = [];
        for (const item of batch) {
          params.push(
            item.name.trim().substring(0, 255),
            item._category,
            Math.max(parseFloat(item.price) || 0, 0),
            'шт',
            TENANT_ID,
            String(item.vetais_id),
            VETAIS_DB
          );
        }
        await vetsysPool.query(`
          INSERT INTO products (name, category, price, unit, tenant_id, external_id, external_system)
          VALUES ${values}
          ON CONFLICT DO NOTHING
        `, params);
        inserted += batch.length;
        process.stdout.write(`\r  Вставлено: ${inserted}/${toInsertProducts.length}`);
      }
      console.log(`\n✅ Товары вставлены`);
    }

    // 6. Итог
    const { rows: finalServices } = await vetsysPool.query(
      `SELECT COUNT(*) FROM services WHERE tenant_id = $1`, [TENANT_ID]
    );
    const { rows: finalProducts } = await vetsysPool.query(
      `SELECT COUNT(*) FROM products WHERE tenant_id = $1`, [TENANT_ID]
    );

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Миграция завершена!');
    console.log(`  Всего услуг в VetSystem:  ${finalServices[0].count}`);
    console.log(`  Всего товаров в VetSystem: ${finalProducts[0].count}`);
    console.log('='.repeat(60));

  } finally {
    await vetaisPool.end();
    await vetsysPool.end();
  }
}

main().catch(err => {
  console.error('\n❌ Ошибка миграции:', err.message);
  process.exit(1);
});
