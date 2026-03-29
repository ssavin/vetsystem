import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const hospAgreementContent = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; margin: 30px 40px; color: #000; }
  h1 { font-size: 15px; text-align: center; margin-bottom: 4px; }
  h2 { font-size: 12px; margin-top: 16px; margin-bottom: 4px; }
  .center { text-align: center; }
  p { margin: 6px 0; line-height: 1.5; }
  .sign-block { display: flex; justify-content: space-between; margin-top: 30px; }
  .sign-col { width: 45%; }
  .underline { border-bottom: 1px solid #000; min-width: 150px; display: inline-block; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  td, th { border: 1px solid #000; padding: 4px 8px; font-size: 11px; }
  th { background: #f0f0f0; text-align: left; }
</style>
</head>
<body>

<h1>ДОГОВОР НА СТАЦИОНАРНОЕ ЛЕЧЕНИЕ ЖИВОТНОГО № {{contractNumber}}</h1>
<p class="center" style="font-size:11px;">{{clinic.city}} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; «{{date}}»</p>

<p><strong>{{clinic.legalName}}</strong>, ИНН {{clinic.inn}}, в лице директора {{clinic.directorName}}, действующего на основании Устава, именуемое далее «Исполнитель», и</p>

<p><strong>{{owner.name}}</strong>, паспорт: серия {{owner.passportSeries}} № {{owner.passportNumber}}, выдан {{owner.passportIssuedBy}} {{owner.passportIssueDate}}, зарег.: {{owner.registrationAddress}}, именуемый(ая) далее «Заказчик», совместно именуемые «Стороны», заключили настоящий договор о нижеследующем:</p>

<h2>1. ПРЕДМЕТ ДОГОВОРА</h2>
<p>1.1. Исполнитель принимает на стационарное лечение животное Заказчика:</p>

<table>
  <tr><th>Кличка</th><th>Вид</th><th>Порода</th><th>Возраст</th><th>Пол</th><th>Окрас</th></tr>
  <tr><td>{{patient.name}}</td><td>{{patient.species}}</td><td>{{patient.breed}}</td><td>{{patient.age}}</td><td>{{patient.sex}}</td><td>{{patient.color}}</td></tr>
</table>

<p>1.2. Исполнитель обязуется оказывать ветеринарные услуги по диагностике, лечению и уходу за животным в период стационарного содержания.</p>
<p>1.3. Заказчик обязуется оплатить услуги согласно действующему прейскуранту.</p>

<h2>2. ОБЯЗАННОСТИ СТОРОН</h2>
<p>2.1. Исполнитель обязуется:</p>
<p>— обеспечить надлежащий уход и ветеринарное наблюдение за животным в период стационарного лечения;</p>
<p>— информировать Заказчика об изменениях в состоянии здоровья животного;</p>
<p>— оказывать медицинскую помощь в соответствии со стандартами ветеринарной практики.</p>
<p>2.2. Заказчик обязуется:</p>
<p>— своевременно оплачивать оказанные услуги согласно счёту;</p>
<p>— предоставить достоверную информацию об анамнезе и прививках животного;</p>
<p>— забрать животное по окончании лечения по уведомлению Исполнителя.</p>

<h2>3. СТОИМОСТЬ И ПОРЯДОК РАСЧЁТОВ</h2>
<p>3.1. Стоимость услуг определяется согласно действующему прейскуранту Исполнителя.</p>
<p>3.2. Оплата производится при выписке животного или по требованию Исполнителя.</p>
<p>3.3. Суточный тариф за содержание и наблюдение начисляется ежедневно.</p>

<h2>4. ОТВЕТСТВЕННОСТЬ СТОРОН</h2>
<p>4.1. Исполнитель не несёт ответственности за исход лечения в случаях, связанных с тяжестью заболевания, индивидуальными особенностями животного или несоблюдением назначений.</p>
<p>4.2. Заказчик несёт ответственность за своевременность оплаты оказанных услуг.</p>

<h2>5. СРОК ДЕЙСТВИЯ ДОГОВОРА</h2>
<p>5.1. Договор вступает в силу с даты подписания и действует до момента выписки животного и проведения окончательного расчёта.</p>

<h2>6. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</h2>
<div class="sign-block">
  <div class="sign-col">
    <p><strong>Исполнитель:</strong></p>
    <p>{{clinic.legalName}}</p>
    <p>ИНН: {{clinic.inn}} / КПП: {{clinic.kpp}}</p>
    <p>ОГРН: {{clinic.ogrn}}</p>
    <p>Адрес: {{clinic.legalAddress}}</p>
    <p>Тел.: {{clinic.phone}}</p>
    <br/>
    <p>Директор: ________________________ / {{clinic.directorName}}</p>
    <p>М.П.</p>
  </div>
  <div class="sign-col">
    <p><strong>Заказчик:</strong></p>
    <p>{{owner.name}}</p>
    <p>Тел.: {{owner.phone}}</p>
    <p>Адрес: {{owner.registrationAddress}}</p>
    <br/><br/>
    <p>Подпись: ________________________</p>
  </div>
</div>

</body>
</html>`;

const consentContent = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; margin: 30px 40px; color: #000; }
  h1 { font-size: 15px; text-align: center; margin-bottom: 4px; }
  h2 { font-size: 12px; margin-top: 16px; margin-bottom: 4px; }
  .center { text-align: center; }
  p { margin: 6px 0; line-height: 1.6; }
  .sign-block { display: flex; justify-content: space-between; margin-top: 30px; }
  .sign-col { width: 45%; }
  .underline { border-bottom: 1px solid #000; min-width: 150px; display: inline-block; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  td, th { border: 1px solid #000; padding: 4px 8px; font-size: 11px; }
  th { background: #f0f0f0; text-align: left; }
</style>
</head>
<body>

<h1>ИНФОРМИРОВАННОЕ СОГЛАСИЕ ВЛАДЕЛЬЦА ЖИВОТНОГО</h1>
<h1>НА ПРОВЕДЕНИЕ ВЕТЕРИНАРНОГО ЛЕЧЕНИЯ И МАНИПУЛЯЦИЙ</h1>
<p class="center" style="font-size:11px;">{{clinic.name}}, {{clinic.address}}</p>
<p class="center" style="font-size:11px;">«{{date}}»</p>

<p>Я, <strong>{{owner.name}}</strong>, паспорт: серия {{owner.passportSeries}} № {{owner.passportNumber}}, тел.: {{owner.phone}}, являясь владельцем животного:</p>

<table>
  <tr><th>Кличка</th><th>Вид</th><th>Порода</th><th>Возраст</th><th>Пол</th><th>Окрас</th></tr>
  <tr><td>{{patient.name}}</td><td>{{patient.species}}</td><td>{{patient.breed}}</td><td>{{patient.age}}</td><td>{{patient.sex}}</td><td>{{patient.color}}</td></tr>
</table>

<h2>ПОДТВЕРЖДАЮ И ВЫРАЖАЮ СОГЛАСИЕ НА:</h2>
<p>1. Проведение осмотра, диагностических исследований, лечебных и хирургических манипуляций, необходимых для установления диагноза и лечения моего животного.</p>
<p>2. Применение медикаментозных препаратов, анестезии, наркоза и других методов лечения по усмотрению лечащего врача.</p>
<p>3. Проведение лабораторных исследований (анализы крови, мочи, УЗИ, рентген и т.д.) при необходимости.</p>
<p>4. Стационарное содержание животного, если это потребуется в ходе лечения.</p>

<h2>МНЕ РАЗЪЯСНЕНО И МНЕ ПОНЯТНО:</h2>
<p>— Любые медицинские вмешательства сопряжены с риском, в том числе анестезия и хирургические процедуры;</p>
<p>— Результат лечения не может быть гарантирован в связи с индивидуальными особенностями животного;</p>
<p>— Я вправе отказаться от любой процедуры, предварительно уведомив ветеринарного врача;</p>
<p>— Стоимость услуг определяется согласно прейскуранту клиники.</p>

<h2>ОБЯЗУЮСЬ:</h2>
<p>— Предоставить полную и достоверную информацию о состоянии здоровья животного, имеющихся заболеваниях, принимаемых препаратах и аллергических реакциях;</p>
<p>— Своевременно оплатить оказанные ветеринарные услуги;</p>
<p>— Соблюдать рекомендации и назначения лечащего врача;</p>
<p>— Незамедлительно информировать клинику об изменениях в состоянии животного после выписки.</p>

<p>Настоящее согласие дано мной добровольно, осознанно и без принуждения.</p>

<div class="sign-block">
  <div class="sign-col">
    <p><strong>Владелец животного:</strong></p>
    <p>{{owner.name}}</p>
    <br/>
    <p>Подпись: ________________________</p>
    <p>Дата: {{date}}</p>
  </div>
  <div class="sign-col">
    <p><strong>Ветеринарный врач:</strong></p>
    <p>{{clinic.name}}</p>
    <br/>
    <p>Подпись: ________________________</p>
    <p>Дата: {{date}}</p>
  </div>
</div>

</body>
</html>`;

async function seed() {
  const client = await pool.connect();
  try {
    const templates = [
      {
        type: 'hospitalization_agreement',
        name: 'Системный шаблон: Договор на стационарное лечение',
        content: hospAgreementContent
      },
      {
        type: 'informed_consent_general',
        name: 'Системный шаблон: Информированное согласие',
        content: consentContent
      }
    ];

    for (const tpl of templates) {
      const existing = await client.query(
        "SELECT id FROM document_templates WHERE type = $1 AND tenant_id IS NULL",
        [tpl.type]
      );
      if (existing.rows.length > 0) {
        console.log(`[SKIP] ${tpl.type} — системный шаблон уже существует`);
        continue;
      }
      await client.query(
        `INSERT INTO document_templates (id, tenant_id, type, name, content, is_active, created_at, updated_at)
         VALUES (gen_random_uuid(), NULL, $1, $2, $3, true, NOW(), NOW())`,
        [tpl.type, tpl.name, tpl.content]
      );
      console.log(`[OK] ${tpl.type} — вставлен`);
    }
    console.log('Готово.');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(e => { console.error(e); process.exit(1); });
