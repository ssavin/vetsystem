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

    // Prescription template
    const prescriptionTemplate = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Рецепт</title>
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
    .title {
      font-size: 20px;
      font-weight: bold;
      color: #2563eb;
      margin: 30px 0 20px 0;
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
    .prescription-box {
      border: 2px solid #2563eb;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      background-color: #f0f7ff;
    }
    .medication-item {
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid #e5e7eb;
    }
    .medication-item:last-child {
      border-bottom: none;
    }
    .medication-name {
      font-size: 16px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 5px;
    }
    .medication-details {
      color: #6b7280;
      line-height: 1.6;
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
    <div class="clinic-name">{{clinic.name}}</div>
    <div>{{clinic.address}}</div>
    <div>Тел: {{clinic.phone}}</div>
  </div>

  <div class="title">РЕЦЕПТ</div>
  <div style="text-align: right; color: #6b7280;">Дата: {{date}}</div>

  <div class="info-grid">
    <div class="info-section">
      <div class="label">ПАЦИЕНТ</div>
      <div>Кличка: {{patient.name}}</div>
      <div>Вид: {{patient.species}}</div>
      <div>Порода: {{patient.breed}}</div>
      <div>Возраст: {{patient.age}}</div>
      <div>Вес: {{patient.weight}} кг</div>
    </div>
    <div class="info-section">
      <div class="label">ВЛАДЕЛЕЦ</div>
      <div>{{owner.name}}</div>
      <div>Тел: {{owner.phone}}</div>
    </div>
  </div>

  <div class="prescription-box">
    <div class="label" style="margin-bottom: 15px;">НАЗНАЧЕННЫЕ ПРЕПАРАТЫ:</div>
    {{#each medications}}
    <div class="medication-item">
      <div class="medication-name">{{this.name}}</div>
      <div class="medication-details">
        <div>Дозировка: {{this.dosage}}</div>
        <div>Способ применения: {{this.route}}</div>
        <div>Частота: {{this.frequency}}</div>
        <div>Длительность: {{this.duration}}</div>
        {{#if this.notes}}
        <div style="margin-top: 5px; font-style: italic;">Примечание: {{this.notes}}</div>
        {{/if}}
      </div>
    </div>
    {{/each}}
  </div>

  {{#if recommendations}}
  <div style="margin: 20px 0;">
    <div class="label">РЕКОМЕНДАЦИИ:</div>
    <div style="margin-top: 10px; line-height: 1.6;">{{recommendations}}</div>
  </div>
  {{/if}}

  <div class="footer">
    <div style="margin-bottom: 30px;">
      <div class="label">ЛЕЧАЩИЙ ВРАЧ</div>
      <div>{{doctor.name}}</div>
      <div style="color: #6b7280;">{{doctor.specialization}}</div>
    </div>
    <div>Подпись врача: <span class="signature-line"></span></div>
    <div style="margin-top: 20px; color: #6b7280; font-size: 12px;">
      Печать клиники
    </div>
  </div>
</body>
</html>
    `.trim();

    // Vaccination certificate template
    const vaccinationTemplate = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Сертификат вакцинации</title>
  <style>
    body {
      font-family: 'DejaVu Sans', Arial, sans-serif;
      margin: 0;
      padding: 40px;
      color: #333;
    }
    .certificate-border {
      border: 3px solid #2563eb;
      padding: 30px;
      border-radius: 12px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .clinic-name {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 10px;
    }
    .certificate-title {
      font-size: 28px;
      font-weight: bold;
      color: #2563eb;
      text-align: center;
      margin: 30px 0;
      text-transform: uppercase;
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
    .vaccination-record {
      border: 1px solid #e5e7eb;
      padding: 15px;
      margin: 15px 0;
      border-radius: 8px;
      background-color: #f0f7ff;
    }
    .vaccine-name {
      font-size: 16px;
      font-weight: bold;
      color: #1f2937;
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
      background-color: #2563eb;
      color: white;
      font-weight: 600;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #2563eb;
      display: flex;
      justify-content: space-between;
    }
    .signature-box {
      text-align: center;
    }
    .signature-line {
      border-bottom: 1px solid #333;
      width: 200px;
      display: inline-block;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="certificate-border">
    <div class="header">
      <div class="clinic-name">{{clinic.name}}</div>
      <div>{{clinic.address}}</div>
      <div>Тел: {{clinic.phone}} | Email: {{clinic.email}}</div>
      <div style="margin-top: 10px; color: #6b7280;">Ветеринарная лицензия: {{clinic.license}}</div>
    </div>

    <div class="certificate-title">Сертификат вакцинации</div>
    <div style="text-align: center; color: #6b7280; margin-bottom: 30px;">№ {{certificateNumber}}</div>

    <div class="info-grid">
      <div class="info-section">
        <div class="label">ИНФОРМАЦИЯ О ЖИВОТНОМ</div>
        <div>Кличка: {{patient.name}}</div>
        <div>Вид: {{patient.species}}</div>
        <div>Порода: {{patient.breed}}</div>
        <div>Пол: {{patient.gender}}</div>
        <div>Дата рождения: {{patient.dateOfBirth}}</div>
        <div>Окрас: {{patient.color}}</div>
        {{#if patient.chipNumber}}
        <div>Номер чипа: {{patient.chipNumber}}</div>
        {{/if}}
      </div>
      <div class="info-section">
        <div class="label">ВЛАДЕЛЕЦ</div>
        <div>{{owner.name}}</div>
        <div>Адрес: {{owner.address}}</div>
        <div>Тел: {{owner.phone}}</div>
        {{#if owner.email}}
        <div>Email: {{owner.email}}</div>
        {{/if}}
      </div>
    </div>

    <div class="label" style="margin-top: 30px; margin-bottom: 15px;">ИСТОРИЯ ВАКЦИНАЦИИ:</div>
    
    <table>
      <thead>
        <tr>
          <th>Дата</th>
          <th>Вакцина</th>
          <th>Серия/Партия</th>
          <th>Следующая вакцинация</th>
        </tr>
      </thead>
      <tbody>
        {{#each vaccinations}}
        <tr>
          <td>{{this.date}}</td>
          <td>{{this.vaccineName}}</td>
          <td>{{this.batchNumber}}</td>
          <td>{{this.nextDate}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>

    {{#if notes}}
    <div class="vaccination-record">
      <div class="label">ПРИМЕЧАНИЯ:</div>
      <div style="margin-top: 10px;">{{notes}}</div>
    </div>
    {{/if}}

    <div class="footer">
      <div class="signature-box">
        <div class="label">ВЕТЕРИНАРНЫЙ ВРАЧ</div>
        <div>{{doctor.name}}</div>
        <div style="color: #6b7280; font-size: 14px;">{{doctor.specialization}}</div>
        <div class="signature-line"></div>
        <div style="font-size: 12px; color: #6b7280;">Подпись</div>
      </div>
      <div class="signature-box">
        <div class="label">ДАТА ВЫДАЧИ</div>
        <div style="font-size: 18px; margin: 10px 0;">{{issueDate}}</div>
        <div style="margin-top: 20px;">
          <div class="signature-line"></div>
          <div style="font-size: 12px; color: #6b7280;">Печать клиники</div>
        </div>
      </div>
    </div>

    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
      Данный сертификат подтверждает проведение вакцинации животного в соответствии с ветеринарными нормами
    </div>
  </div>
</body>
</html>
    `.trim();

    // Personal Data Consent template
    const personalDataConsentTemplate = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Согласие на обработку персональных данных</title>
  <style>
    body {
      font-family: 'DejaVu Sans', Arial, sans-serif;
      margin: 0;
      padding: 40px;
      color: #333;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 20px;
    }
    .clinic-name {
      font-size: 22px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 10px;
    }
    .document-title {
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      margin: 30px 0 20px 0;
      text-transform: uppercase;
    }
    .info-section {
      background-color: #f9fafb;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .label {
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 5px;
    }
    .content {
      margin: 15px 0;
      text-align: justify;
    }
    .consent-text {
      background-color: #f0f7ff;
      border: 1px solid #2563eb;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .signature-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px solid #e5e7eb;
    }
    .signature-box {
      text-align: center;
    }
    .signature-line {
      border-bottom: 1px solid #333;
      width: 250px;
      display: inline-block;
      margin: 20px 0 5px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    ul {
      margin: 10px 0;
      padding-left: 30px;
    }
    li {
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="clinic-name">{{clinic.name}}</div>
    {{#if clinic.ogrn}}
    <div style="font-size: 12px; color: #6b7280;">ОГРН: {{clinic.ogrn}}</div>
    {{/if}}
    {{#if clinic.inn}}
    <div style="font-size: 12px; color: #6b7280;">ИНН: {{clinic.inn}}</div>
    {{/if}}
    <div style="font-size: 14px; margin-top: 10px;">{{clinic.address}}</div>
    <div style="font-size: 14px;">Тел: {{clinic.phone}} | Email: {{clinic.email}}</div>
  </div>

  <div class="document-title">
    СОГЛАСИЕ<br>
    на обработку персональных данных
  </div>

  <div class="info-section">
    <div class="label">СУБЪЕКТ ПЕРСОНАЛЬНЫХ ДАННЫХ:</div>
    <div>{{owner.name}}</div>
    {{#if owner.passportSeries}}
    <div>Паспорт: серия {{owner.passportSeries}} № {{owner.passportNumber}}</div>
    {{/if}}
    {{#if owner.passportIssuedBy}}
    <div>Выдан: {{owner.passportIssuedBy}}</div>
    {{/if}}
    {{#if owner.passportIssueDate}}
    <div>Дата выдачи: {{owner.passportIssueDate}}</div>
    {{/if}}
    {{#if owner.registrationAddress}}
    <div>Адрес регистрации: {{owner.registrationAddress}}</div>
    {{/if}}
    {{#if owner.residenceAddress}}
    <div>Адрес проживания: {{owner.residenceAddress}}</div>
    {{/if}}
    <div>Телефон: {{owner.phone}}</div>
    {{#if owner.email}}
    <div>Email: {{owner.email}}</div>
    {{/if}}
  </div>

  <div class="content">
    <p>В соответствии с требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных»,</p>
    
    <p style="text-align: center; font-weight: bold;">Я, {{owner.name}}, даю свое согласие:</p>
  </div>

  <div class="consent-text">
    <p><strong>{{clinic.name}}</strong> (далее – Оператор) на обработку моих персональных данных на следующих условиях:</p>
    
    <p><strong>1. Цели обработки персональных данных:</strong></p>
    <ul>
      <li>Оказание ветеринарных услуг</li>
      <li>Ведение медицинской документации пациентов</li>
      <li>Информирование о состоянии здоровья животных</li>
      <li>Напоминание о предстоящих визитах и вакцинациях</li>
      <li>Выставление счетов и проведение расчетов</li>
      <li>Направление информационных сообщений о работе клиники</li>
    </ul>

    <p><strong>2. Перечень персональных данных, на обработку которых дается согласие:</strong></p>
    <ul>
      <li>Фамилия, имя, отчество</li>
      <li>Паспортные данные (серия, номер, кем и когда выдан)</li>
      <li>Адрес регистрации и фактического проживания</li>
      <li>Контактные данные (телефон, email)</li>
      <li>Сведения о домашних животных</li>
    </ul>

    <p><strong>3. Перечень действий с персональными данными:</strong></p>
    <p>Сбор, запись, систематизация, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передача (распространение, предоставление, доступ), обезличивание, блокирование, удаление, уничтожение персональных данных.</p>

    <p><strong>4. Общее описание используемых способов обработки персональных данных:</strong></p>
    <p>Обработка персональных данных осуществляется с использованием средств автоматизации и без использования таких средств.</p>

    <p><strong>5. Срок действия согласия:</strong></p>
    <p>Настоящее согласие действует с момента его подписания до момента отзыва в письменной форме.</p>

    <p><strong>6. Порядок отзыва согласия:</strong></p>
    <p>Субъект персональных данных вправе отозвать настоящее согласие путем направления письменного заявления Оператору.</p>
  </div>

  <div class="content">
    <p>Я подтверждаю, что ознакомлен(а) с положениями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных», права и обязанности в области защиты персональных данных мне разъяснены.</p>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="label">СУБЪЕКТ ПЕРСОНАЛЬНЫХ ДАННЫХ</div>
      <div style="margin: 10px 0;">{{owner.name}}</div>
      <div class="signature-line"></div>
      <div style="font-size: 12px; color: #6b7280;">(подпись)</div>
    </div>
    <div class="signature-box">
      <div class="label">ДАТА</div>
      <div style="font-size: 18px; margin: 20px 0;">{{date}}</div>
      <div style="font-size: 12px; color: #6b7280; margin-top: 20px;">
        «___» _____________ 20___ г.
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Согласие на обработку персональных данных в соответствии с Федеральным законом № 152-ФЗ</p>
    <p>Документ создан: {{currentDate}}</p>
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

    await storage.createDocumentTemplate({
      tenantId: null,
      type: 'prescription',
      name: 'Системный шаблон: Рецепт',
      content: prescriptionTemplate,
      isActive: true
    });

    await storage.createDocumentTemplate({
      tenantId: null,
      type: 'vaccination_certificate',
      name: 'Системный шаблон: Сертификат вакцинации',
      content: vaccinationTemplate,
      isActive: true
    });

    await storage.createDocumentTemplate({
      tenantId: null,
      type: 'personal_data_consent',
      name: 'Системный шаблон: Согласие на обработку ПД',
      content: personalDataConsentTemplate,
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
