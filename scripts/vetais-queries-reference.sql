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


-- =====================================================================
-- 6. ИНСПЕКЦИЯ СХЕМЫ БД (исследование структуры)
-- =====================================================================

-- Список всех таблиц в базе
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Поля конкретной таблицы
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'accounts_headers'   -- заменить на нужную таблицу
ORDER BY ordinal_position;

-- Поиск таблиц по части названия
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name ILIKE '%doc%'
ORDER BY table_name;

-- Поиск полей по части названия (во всех таблицах)
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name ILIKE '%contract%'
ORDER BY table_name, column_name;

-- Просмотр первых строк таблицы
SELECT * FROM patient_doc_filled LIMIT 5;
SELECT * FROM accounts_headers   LIMIT 5;
SELECT * FROM file_clients        LIMIT 5;


-- =====================================================================
-- 7. ПРОСТОЙ РЕЕСТР С АКТАМИ (без адреса и договора)
-- =====================================================================
-- Минимальный вариант — быстрая выгрузка для проверки данных

COPY (
  SELECT
    fc.nazev_kado                               AS "ФИО",
    COALESCE(fc.no_contract, '')               AS "Номер договора",
    TO_CHAR(fc.contract_validity, 'DD.MM.YYYY') AS "Действует до",
    ah.sequence                                 AS "Номер акта",
    TO_CHAR(ah.datetime_create, 'DD.MM.YYYY')  AS "Дата акта",
    ah.price_to_pay                             AS "Сумма",
    COALESCE(fc.telefon, fc.mobil)             AS "Телефон"
  FROM file_clients fc
  JOIN accounts_headers ah ON ah.client_id = fc.kod_kado
  WHERE fc.vymaz = 0
    AND (ah.deleted IS NULL OR ah.deleted = 0)
  ORDER BY fc.nazev_kado, ah.datetime_create
) TO '/tmp/registry_simple.csv'
WITH (FORMAT CSV, HEADER, DELIMITER ';', ENCODING 'UTF8');


-- =====================================================================
-- 8. ЗАПРОС РАЗРАБОТЧИКОВ VETAIS — КАРТОЧКА КЛИЕНТА (оригинал)
-- =====================================================================
-- Оригинальный запрос от разработчиков Vetais с полным набором полей.
-- ВНИМАНИЕ: содержит fncGetIsPatientAlive() — функция только в Vetais,
-- фильтрует клиентов у кого есть хотя бы один живой пациент.
-- Также фильтрует по datum_kado (дата регистрации карточки).

SELECT
    DISTINCT file_clients.kod_kado             AS client_id,
    file_clients.nazev_kado                    AS client_surname,
    file_clients.poznamka_kado                 AS client_name,
    file_clients.jmeno                         AS client_secname,
    file_clients.mesto_k                       AS house_number,
    file_clients.blok                          AS quadrant,
    file_clients.room                          AS flat,
    file_streets.nazev                         AS street_name,
    file_street_types.name                     AS street_type_name,
    file_cities.nazev_mes                      AS city_name,
    file_cities.nazev_psc                      AS city_zip,
    file_regions.nazev                         AS region_name,
    file_areas.name                            AS area_name,
    file_superareas.name                       AS superarea_name,
    file_clients.telefon                       AS client_phone,
    file_clients.mobil                         AS client_mobile,
    file_clients.email                         AS client_email,
    file_clients.datum_kado                    AS card_created_date,
    file_clients.created_clinic_id,
    file_clients.created_clinic_name,
    file_clients.created_department_id,
    file_clients.created_department_name,
    file_clients.no_pass,
    file_clients.date_birth                    AS date_of_birth,
    file_clients.last_cosmo_login              AS last_login,
    CASE
        WHEN file_clients.gender_id = 1 THEN 'женский'
        WHEN file_clients.gender_id = 2 THEN 'мужской'
        ELSE ''
    END                                        AS client_gender
FROM public.file_bridge_clients_patients
LEFT JOIN public.file_clients
        ON file_clients.kod_kado = file_bridge_clients_patients.id_klient
LEFT JOIN public.file_patients
        ON file_patients.id_pacienta = file_bridge_clients_patients.id_pacient
LEFT JOIN public.file_cities
        ON file_clients.id_mesto = file_cities.kod_mes
LEFT JOIN public.file_streets
        ON file_clients.id_str = file_streets.id_str
LEFT JOIN public.file_street_types
        ON file_street_types.id = file_streets.idtypu
LEFT JOIN public.file_areas
        ON file_clients.id_rajon = file_areas.id
LEFT JOIN public.file_superareas
        ON file_clients.id_megarajon = file_superareas.id
LEFT JOIN public.file_regions
        ON file_clients.id_reg = file_regions.id_reg
WHERE file_bridge_clients_patients.id_most > 0
    AND file_clients.kod_kado > 0
    AND file_clients.vymaz = 0
    AND file_clients.vyrazen = 'N'
    AND file_patients.id_pacienta > 0
    AND file_patients.vymaz = 0
    AND file_patients.vyrazen = 'N'
    AND fncGetIsPatientAlive(file_patients.zemrel) = 1
    -- Фильтр по дате регистрации карточки (подставить нужный диапазон):
    AND file_clients.datum_kado BETWEEN '2026-01-01 00:00:00' AND '2026-03-31 23:59:59'
ORDER BY client_surname, client_name, client_secname;


-- =====================================================================
-- 9. ВАЖНЫЕ НАХОДКИ / ЛОВУШКИ
-- =====================================================================
--
-- 1. КЛЮЧ КЛИЕНТА: file_clients.kod_kado (НЕ id_k — поле id_k обычно NULL/0)
--    JOIN: accounts_headers.client_id = file_clients.kod_kado
--
-- 2. ФИЛЬТР УДАЛЁННЫХ:
--    file_clients:      vymaz = 0 AND vyrazen = 'N'
--    accounts_headers:  deleted IS NULL OR deleted = 0
--    file_patients:     vymaz = 0 AND vyrazen = 'N'
--    patient_doc_filled: deleted = 0
--
-- 3. НОМЕР ДОГОВОРА: поле no_contract почти пустое (< 0.1% заполнено).
--    Реальные договоры — в patient_doc_filled, тип 'Договор новый клиент'
--    (фильтр: patient_doc_templates.name ILIKE '%договор%')
--
-- 4. НОМЕР АКТА/СЧЁТА: accounts_headers.sequence
--
-- 5. pricelist_vat: id=1→0%, id=2→10%, id=3→18% (НДС)
--
-- 6. НДС в purchase_headers: нет триггеров — после импорта прихода
--    обязательно открыть Склад→Приходы и подтвердить документ вручную
--
