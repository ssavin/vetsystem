-- =====================================================================
-- СПРАВОЧНИК SQL-ЗАПРОСОВ К БАЗЕ VETAIS
-- Структура БД одинакова для всех клиник (alisavet, vasilek, dingo, probiko)
-- =====================================================================
--
-- ПОДКЛЮЧЕНИЕ:
--   alisavet : PGPASSWORD=ASPI6rin psql -h 45.128.206.134 -p 5454 -U postgres -d vetais_alisavet
--   vasilek  : PGPASSWORD=vetais    psql -h 94.198.53.52   -p 5454 -U postgres -d vetais_vasilek
--   dingo    : PGPASSWORD=vetais    psql -h 109.173.124.18 -p 5454 -U postgres -d vetais
--   probiko  : PGPASSWORD=ASPI6rin psql -h localhost       -p 5432 -U postgres -d vetais_probiko_local
--
-- =====================================================================


-- =====================================================================
-- 1. СТРУКТУРА КЛЮЧЕВЫХ ТАБЛИЦ
-- =====================================================================

-- Поля клиентов
-- file_clients.kod_kado      — первичный ключ клиента (JOIN с accounts_headers.client_id)
-- file_clients.nazev_kado    — Фамилия
-- file_clients.poznamka_kado — Имя
-- file_clients.jmeno         — Отчество
-- file_clients.telefon       — Телефон
-- file_clients.mobil         — Мобильный
-- file_clients.email         — Email
-- file_clients.date_birth    — Дата рождения
-- file_clients.gender_id     — Пол (1=женский, 2=мужской)
-- file_clients.no_pass       — Паспорт
-- file_clients.no_contract   — Номер договора (поле почти не используется)
-- file_clients.contract_validity — Действует до
-- file_clients.vymaz         — Удалён (0 = активный)
-- file_clients.vyrazen       — Исключён ('N' = активный)
-- file_clients.id_mesto      — FK → file_cities.kod_mes
-- file_clients.id_str        — FK → file_streets.id_str
-- file_clients.id_reg        — FK → file_regions.id_reg
-- file_clients.id_rajon      — FK → file_areas.id
-- file_clients.id_megarajon  — FK → file_superareas.id

-- Поля счетов/актов
-- accounts_headers.id             — PK
-- accounts_headers.client_id      — FK → file_clients.kod_kado
-- accounts_headers.patient_id     — FK → file_patients.id_pacienta
-- accounts_headers.sequence       — Номер акта/счёта
-- accounts_headers.datetime_create — Дата создания
-- accounts_headers.price_to_pay   — Сумма к оплате
-- accounts_headers.price_sum      — Сумма без скидки
-- accounts_headers.price_discount — Скидка
-- accounts_headers.deleted        — Удалён (0 = активный)
-- accounts_headers.clinic_id      — ID клиники

-- Договоры (генерируемые документы)
-- patient_doc_filled.client_id       — FK → file_clients.kod_kado
-- patient_doc_filled.doc_number      — Номер документа (напр. ДЛЯ/2021/01/03846)
-- patient_doc_filled.dt_created      — Дата создания
-- patient_doc_filled.doc_template_id — FK → patient_doc_templates.id
-- patient_doc_filled.deleted         — Удалён (0 = активный)
-- patient_doc_templates.name         — Название шаблона (напр. 'Договор новый клиент')


-- =====================================================================
-- 2. РЕЕСТР КЛИЕНТОВ С АКТАМИ — ДЛЯ ФНС (за произвольный период)
-- =====================================================================
-- Заменить даты в фильтре ah.datetime_create на нужный диапазон
-- Заменить имя файла и базу данных при необходимости

COPY (
  SELECT
    fc.kod_kado                                 AS "ID клиента",
    fc.nazev_kado                               AS "Фамилия",
    fc.poznamka_kado                            AS "Имя",
    fc.jmeno                                    AS "Отчество",
    TO_CHAR(fc.date_birth, 'DD.MM.YYYY')        AS "Дата рождения",
    CASE
      WHEN fc.gender_id = 1 THEN 'женский'
      WHEN fc.gender_id = 2 THEN 'мужской'
      ELSE ''
    END                                         AS "Пол",
    fc.no_pass                                  AS "Паспорт",
    fc.telefon                                  AS "Телефон",
    fc.mobil                                    AS "Мобильный",
    fc.email                                    AS "Email",
    COALESCE(fst.name || ' ', '') ||
    COALESCE(fs.nazev || ', ', '') ||
    COALESCE(fc.mesto_k, '')                   AS "Адрес",
    fc2.nazev_mes                               AS "Город",
    fc2.nazev_psc                               AS "Индекс",
    fr.nazev                                    AS "Регион",
    pdf.doc_number                              AS "Номер договора",
    TO_CHAR(pdf.dt_created, 'DD.MM.YYYY')      AS "Дата договора",
    ah.sequence                                 AS "Номер акта",
    TO_CHAR(ah.datetime_create, 'DD.MM.YYYY')  AS "Дата акта",
    ah.price_to_pay                             AS "Сумма",
    fc.created_clinic_name                      AS "Клиника"
  FROM file_clients fc
  JOIN accounts_headers ah ON ah.client_id = fc.kod_kado
  LEFT JOIN file_cities fc2 ON fc.id_mesto = fc2.kod_mes
  LEFT JOIN file_streets fs ON fc.id_str = fs.id_str
  LEFT JOIN file_street_types fst ON fs.idtypu = fst.id
  LEFT JOIN file_regions fr ON fc.id_reg = fr.id_reg
  LEFT JOIN patient_doc_filled pdf ON pdf.client_id = fc.kod_kado
    AND pdf.deleted = 0
    AND pdf.doc_template_id IN (
      SELECT id FROM patient_doc_templates WHERE name ILIKE '%договор%'
    )
  WHERE fc.vymaz = 0
    AND fc.vyrazen = 'N'
    AND (ah.deleted IS NULL OR ah.deleted = 0)
    -- Фильтр по периоду (раскомментировать и подставить даты):
    -- AND ah.datetime_create >= '2026-01-01 00:00:00'
    -- AND ah.datetime_create <  '2026-04-01 00:00:00'
  ORDER BY fc.nazev_kado, fc.poznamka_kado, fc.jmeno, ah.datetime_create
) TO '/tmp/fns_registry.csv'
WITH (FORMAT CSV, HEADER, DELIMITER ';', ENCODING 'UTF8');


-- =====================================================================
-- 3. РЕЕСТР КЛИЕНТОВ С АКТАМИ — Q1 2026 (январь–март)
-- =====================================================================

COPY (
  SELECT
    fc.kod_kado                                 AS "ID клиента",
    fc.nazev_kado                               AS "Фамилия",
    fc.poznamka_kado                            AS "Имя",
    fc.jmeno                                    AS "Отчество",
    TO_CHAR(fc.date_birth, 'DD.MM.YYYY')        AS "Дата рождения",
    CASE
      WHEN fc.gender_id = 1 THEN 'женский'
      WHEN fc.gender_id = 2 THEN 'мужской'
      ELSE ''
    END                                         AS "Пол",
    fc.no_pass                                  AS "Паспорт",
    fc.telefon                                  AS "Телефон",
    fc.mobil                                    AS "Мобильный",
    fc.email                                    AS "Email",
    COALESCE(fst.name || ' ', '') ||
    COALESCE(fs.nazev || ', ', '') ||
    COALESCE(fc.mesto_k, '')                   AS "Адрес",
    fc2.nazev_mes                               AS "Город",
    fc2.nazev_psc                               AS "Индекс",
    fr.nazev                                    AS "Регион",
    pdf.doc_number                              AS "Номер договора",
    TO_CHAR(pdf.dt_created, 'DD.MM.YYYY')      AS "Дата договора",
    ah.sequence                                 AS "Номер акта",
    TO_CHAR(ah.datetime_create, 'DD.MM.YYYY')  AS "Дата акта",
    ah.price_to_pay                             AS "Сумма",
    fc.created_clinic_name                      AS "Клиника"
  FROM file_clients fc
  JOIN accounts_headers ah ON ah.client_id = fc.kod_kado
  LEFT JOIN file_cities fc2 ON fc.id_mesto = fc2.kod_mes
  LEFT JOIN file_streets fs ON fc.id_str = fs.id_str
  LEFT JOIN file_street_types fst ON fs.idtypu = fst.id
  LEFT JOIN file_regions fr ON fc.id_reg = fr.id_reg
  LEFT JOIN patient_doc_filled pdf ON pdf.client_id = fc.kod_kado
    AND pdf.deleted = 0
    AND pdf.doc_template_id IN (
      SELECT id FROM patient_doc_templates WHERE name ILIKE '%договор%'
    )
  WHERE fc.vymaz = 0
    AND fc.vyrazen = 'N'
    AND (ah.deleted IS NULL OR ah.deleted = 0)
    AND ah.datetime_create >= '2026-01-01 00:00:00'
    AND ah.datetime_create <  '2026-04-01 00:00:00'
  ORDER BY fc.nazev_kado, fc.poznamka_kado, fc.jmeno, ah.datetime_create
) TO '/tmp/fns_registry_q1_2026.csv'
WITH (FORMAT CSV, HEADER, DELIMITER ';', ENCODING 'UTF8');


-- =====================================================================
-- 4. СПИСОК КЛИЕНТОВ (без счетов) — полная карточка
-- =====================================================================

COPY (
  SELECT DISTINCT
    fc.kod_kado                                 AS "ID клиента",
    fc.nazev_kado                               AS "Фамилия",
    fc.poznamka_kado                            AS "Имя",
    fc.jmeno                                    AS "Отчество",
    TO_CHAR(fc.date_birth, 'DD.MM.YYYY')        AS "Дата рождения",
    CASE
      WHEN fc.gender_id = 1 THEN 'женский'
      WHEN fc.gender_id = 2 THEN 'мужской'
      ELSE ''
    END                                         AS "Пол",
    fc.no_pass                                  AS "Паспорт",
    fc.telefon                                  AS "Телефон",
    fc.mobil                                    AS "Мобильный",
    fc.email                                    AS "Email",
    COALESCE(fst.name || ' ', '') ||
    COALESCE(fs.nazev || ', ', '') ||
    COALESCE(fc.mesto_k, '')                   AS "Адрес",
    fc2.nazev_mes                               AS "Город",
    fc2.nazev_psc                               AS "Индекс",
    fr.nazev                                    AS "Регион",
    TO_CHAR(fc.datum_kado, 'DD.MM.YYYY')        AS "Дата регистрации",
    fc.created_clinic_name                      AS "Клиника создания"
  FROM file_clients fc
  LEFT JOIN file_cities fc2 ON fc.id_mesto = fc2.kod_mes
  LEFT JOIN file_streets fs ON fc.id_str = fs.id_str
  LEFT JOIN file_street_types fst ON fs.idtypu = fst.id
  LEFT JOIN file_regions fr ON fc.id_reg = fr.id_reg
  WHERE fc.vymaz = 0
    AND fc.vyrazen = 'N'
  ORDER BY fc.nazev_kado, fc.poznamka_kado, fc.jmeno
) TO '/tmp/clients_full.csv'
WITH (FORMAT CSV, HEADER, DELIMITER ';', ENCODING 'UTF8');


-- =====================================================================
-- 5. ДИАГНОСТИКА И ПРОВЕРКА СВЯЗОК
-- =====================================================================

-- Проверка кол-ва клиентов / счетов
SELECT COUNT(*) AS clients FROM file_clients WHERE vymaz = 0 AND vyrazen = 'N';
SELECT COUNT(*) AS accounts FROM accounts_headers WHERE deleted = 0;

-- Проверка JOIN клиент → счёт
SELECT COUNT(*) FROM file_clients fc
JOIN accounts_headers ah ON ah.client_id = fc.kod_kado
WHERE fc.vymaz = 0 AND (ah.deleted IS NULL OR ah.deleted = 0);

-- Список шаблонов документов
SELECT id, name, prefix FROM patient_doc_templates ORDER BY id;

-- Кол-во договоров по шаблону
SELECT pdt.name, COUNT(*) AS cnt
FROM patient_doc_filled pdf
JOIN patient_doc_templates pdt ON pdt.id = pdf.doc_template_id
WHERE pdf.deleted = 0
GROUP BY pdt.name ORDER BY cnt DESC;

-- Проверка заполненности поля no_contract
SELECT
  COUNT(*) AS всего,
  COUNT(CASE WHEN no_contract IS NOT NULL AND no_contract != '' THEN 1 END) AS с_договором
FROM file_clients WHERE vymaz = 0;
