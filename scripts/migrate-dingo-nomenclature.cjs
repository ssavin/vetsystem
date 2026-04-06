'use strict';
const { Client } = require('pg');

const TENANT_ID = 'e556ed34-71a7-4003-a2cd-b5cf274bae12';
const EXTERNAL_SYSTEM = 'vetais_dingo';

// Группы которые считаются УСЛУГАМИ
const SERVICE_KEYWORDS = [
  'услуг', 'операц', 'манипул', 'исследован', 'капельниц',
  'диагност', 'консультац', 'анализ', 'процедур', 'вакцинац',
  'кастрац', 'стерилиз', 'хирург', 'анестез', 'физиотерап'
];

function isService(groupName) {
  if (!groupName) return false;
  const lower = groupName.toLowerCase();
  return SERVICE_KEYWORDS.some(kw => lower.includes(kw));
}

function cleanPrice(price) {
  const p = parseFloat(price);
  if (isNaN(p) || p < 0) return 0;
  return Math.round(p * 100) / 100;
}

function cleanUnit(unit) {
  if (!unit) return 'шт';
  const u = unit.trim();
  if (!u) return 'шт';
  // Обрезаем до 50 символов
  return u.substring(0, 50);
}

async function main() {
  const vtConn = new Client({
    host: 'localhost',
    port: 5432,
    database: 'vetais_dingo_local',
    user: 'postgres',
    password: 'ASPI6rin',
    connectionTimeoutMillis: 30000,
  });

  const vsConn = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 30000,
  });

  await vtConn.connect();
  await vsConn.connect();
  console.log('Подключено к обеим БД');

  // Загружаем номенклатуру с ценами и единицами
  const { rows: items } = await vtConn.query(`
    SELECT 
      si.id,
      si.name,
      si.ean_code,
      COALESCE(sig.name, 'Прочее') AS group_name,
      COALESCE(pu.name, 'шт') AS unit_name,
      COALESCE(sip.sale_price, 0) AS sale_price,
      COALESCE(sip.purchase_price, 0) AS purchase_price
    FROM stock_item si
    LEFT JOIN stock_item_group sig ON sig.id = si.group_id
    LEFT JOIN pricelist_units pu ON pu.id = si.unit_sale_id
    LEFT JOIN LATERAL (
      SELECT sale_price, purchase_price
      FROM stock_item_prices
      WHERE item_id = si.id
      ORDER BY id
      LIMIT 1
    ) sip ON true
    WHERE si.deleted = 0
    ORDER BY sig.name, si.name
  `);

  console.log(`Загружено ${items.length} позиций из Vetais`);

  // Проверяем что уже есть
  const { rows: existingProducts } = await vsConn.query(
    `SELECT external_id FROM products WHERE tenant_id=$1 AND external_system=$2`,
    [TENANT_ID, EXTERNAL_SYSTEM]
  );
  const { rows: existingServices } = await vsConn.query(
    `SELECT external_id FROM services WHERE tenant_id=$1 AND external_system=$2`,
    [TENANT_ID, EXTERNAL_SYSTEM]
  );

  const existingProductIds = new Set(existingProducts.map(r => r.external_id));
  const existingServiceIds = new Set(existingServices.map(r => r.external_id));
  console.log(`Уже есть: ${existingProductIds.size} товаров, ${existingServiceIds.size} услуг`);

  let insProducts = 0, insServices = 0, skipProducts = 0, skipServices = 0, errCount = 0;
  const BATCH = 200;

  // Разделяем на услуги и товары
  const services = items.filter(i => isService(i.group_name));
  const products = items.filter(i => !isService(i.group_name));

  console.log(`Услуг: ${services.length}, Товаров: ${products.length}`);

  // --- УСЛУГИ ---
  console.log('\nМигрирую услуги...');
  for (let i = 0; i < services.length; i += BATCH) {
    const batch = services.slice(i, i + BATCH);
    for (const item of batch) {
      const externalId = `DNG_NOM_${item.id}`;
      if (existingServiceIds.has(externalId)) { skipServices++; continue; }

      try {
        await vsConn.query(`
          INSERT INTO services (name, category, price, is_active, external_id, external_system, tenant_id)
          VALUES ($1, $2, $3, true, $4, $5, $6)
        `, [
          item.name.substring(0, 255),
          item.group_name.substring(0, 255),
          cleanPrice(item.sale_price),
          externalId,
          EXTERNAL_SYSTEM,
          TENANT_ID,
        ]);
        insServices++;
      } catch (e) {
        errCount++;
        if (errCount <= 5) console.error(`ERR service ${item.id}: ${e.message}`);
      }
    }
    if ((i + BATCH) % 500 === 0 || i + BATCH >= services.length) {
      console.log(`  Услуги: ${Math.min(i + BATCH, services.length)}/${services.length} | вст=${insServices} ск=${skipServices} ош=${errCount}`);
    }
  }

  // --- ТОВАРЫ ---
  console.log('\nМигрирую товары...');
  let prodErrCount = 0;
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    for (const item of batch) {
      const externalId = `DNG_NOM_${item.id}`;
      if (existingProductIds.has(externalId)) { skipProducts++; continue; }

      // Barcode: берём первый если несколько через запятую
      let barcode = null;
      if (item.ean_code) {
        const firstCode = item.ean_code.split(',')[0].trim();
        if (firstCode) barcode = firstCode.substring(0, 255);
      }

      try {
        await vsConn.query(`
          INSERT INTO products (name, category, price, unit, is_active, barcode, external_id, external_system, tenant_id)
          VALUES ($1, $2, $3, $4, true, $5, $6, $7, $8)
        `, [
          item.name.substring(0, 255),
          item.group_name.substring(0, 255),
          cleanPrice(item.sale_price),
          cleanUnit(item.unit_name),
          barcode,
          externalId,
          EXTERNAL_SYSTEM,
          TENANT_ID,
        ]);
        insProducts++;
      } catch (e) {
        prodErrCount++;
        if (prodErrCount <= 5) console.error(`ERR product ${item.id}: ${e.message}`);
      }
    }
    if ((i + BATCH) % 500 === 0 || i + BATCH >= products.length) {
      console.log(`  Товары: ${Math.min(i + BATCH, products.length)}/${products.length} | вст=${insProducts} ск=${skipProducts} ош=${prodErrCount}`);
    }
  }

  await vtConn.end();
  await vsConn.end();

  console.log('\n=== ИТОГИ ===');
  console.log(`Услуги:  вставлено=${insServices}  пропущено=${skipServices}  ошибок=${errCount}`);
  console.log(`Товары:  вставлено=${insProducts}  пропущено=${skipProducts}  ошибок=${prodErrCount}`);
  console.log('Готово!');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
