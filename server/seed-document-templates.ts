import { storage } from './storage';

/**
 * Seed default document templates
 * These templates are used as system-wide fallbacks when tenant-specific templates don't exist
 */
export async function seedDocumentTemplates() {
  console.log('🌱 Seeding default document templates...');

  try {
    // Invoice template
    const invoiceTemplate = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Счет-фактура</title>
  <style>
    body {
      font-family: 'DejaVu Sans', Arial, sans-serif;
      margin: 0;
      padding: 40px;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 20px;
    }
    .clinic-name {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    .invoice-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-weight: bold;
      font-size: 14px;
      color: #2563eb;
      margin-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background-color: #f3f4f6;
      font-weight: 600;
      color: #1f2937;
    }
    .total-row {
      background-color: #f9fafb;
      font-weight: bold;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="clinic-name">{{clinic.name}}</div>
    <div>{{clinic.address}}</div>
    <div>Тел: {{clinic.phone}} | Email: {{clinic.email}}</div>
  </div>

  <div class="invoice-info">
    <div>
      <div class="section-title">СЧЕТ-ФАКТУРА</div>
      <div>№ {{invoiceNumber}}</div>
      <div>Дата: {{date}}</div>
    </div>
    <div>
      <div class="section-title">КЛИЕНТ</div>
      <div>{{client.name}}</div>
      <div>Тел: {{client.phone}}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Наименование</th>
        <th>Кол-во</th>
        <th>Цена</th>
        <th>Сумма</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{this.name}}</td>
        <td>{{this.quantity}}</td>
        <td>{{this.price}} ₽</td>
        <td>{{this.total}} ₽</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div style="text-align: right; margin-top: 20px;">
    <div style="margin-bottom: 10px;">Подытог: {{subtotal}} ₽</div>
    <div style="margin-bottom: 10px;">НДС: {{tax}} ₽</div>
    <div style="font-size: 18px; font-weight: bold; color: #2563eb;">Итого: {{total}} ₽</div>
  </div>

  <div class="footer">
    Спасибо за посещение нашей клиники!
  </div>
</body>
</html>
    `.trim();

    // Encounter summary template
    const encounterSummaryTemplate = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Протокол приема</title>
  <style>
    body {
      font-family: 'DejaVu Sans', Arial, sans-serif;
      margin: 0;
      padding: 40px;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 20px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    .info-section {
      background-color: #f9fafb;
      padding: 15px;
      border-radius: 8px;
    }
    .label {
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 5px;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-weight: bold;
      font-size: 16px;
      color: #2563eb;
      margin-bottom: 10px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 5px;
    }
    .content {
      line-height: 1.6;
    }
    ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .signature-line {
      margin-top: 40px;
      border-bottom: 1px solid #333;
      width: 250px;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">ПРОТОКОЛ ПРИЕМА</div>
    <div>Дата: {{date}}</div>
  </div>

  <div class="info-grid">
    <div class="info-section">
      <div class="label">ПАЦИЕНТ</div>
      <div>Кличка: {{patient.name}}</div>
      <div>Вид: {{patient.species}}</div>
      <div>Порода: {{patient.breed}}</div>
      <div>Возраст: {{patient.age}}</div>
    </div>
    <div class="info-section">
      <div class="label">ВЛАДЕЛЕЦ</div>
      <div>{{owner.name}}</div>
      <div>Тел: {{owner.phone}}</div>
    </div>
  </div>

  <div class="info-section" style="margin-bottom: 30px;">
    <div class="label">ВРАЧ</div>
    <div>{{doctor.name}}</div>
    <div>{{doctor.specialization}}</div>
  </div>

  <div class="section">
    <div class="section-title">ЖАЛОБЫ</div>
    <div class="content">{{complaints}}</div>
  </div>

  <div class="section">
    <div class="section-title">ДИАГНОЗ</div>
    <div class="content">{{diagnosis}}</div>
  </div>

  <div class="section">
    <div class="section-title">НАЗНАЧЕННОЕ ЛЕЧЕНИЕ</div>
    <ul>
      {{#each treatment}}
      <li>{{this}}</li>
      {{/each}}
    </ul>
  </div>

  <div class="section">
    <div class="section-title">РЕКОМЕНДАЦИИ</div>
    <div class="content">{{recommendations}}</div>
  </div>

  <div class="footer">
    <div>Врач: <span class="signature-line"></span></div>
    <div style="margin-top: 10px; color: #6b7280; font-size: 12px;">Подпись врача</div>
  </div>
</body>
</html>
    `.trim();

    // Create system templates (tenant_id = null for system-wide)
    await storage.createDocumentTemplate({
      tenantId: null,
      type: 'invoice',
      name: 'Системный шаблон: Счет-фактура',
      content: invoiceTemplate,
      isActive: true
    });

    await storage.createDocumentTemplate({
      tenantId: null,
      type: 'encounter_summary',
      name: 'Системный шаблон: Протокол приема',
      content: encounterSummaryTemplate,
      isActive: true
    });

    console.log('✅ Default document templates seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding document templates:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDocumentTemplates()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
