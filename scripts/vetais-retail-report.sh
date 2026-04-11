#!/bin/bash
# Отчёт о розничных продажах из Vetais для 1С:Бухгалтерия
# Использование: ./scripts/vetais-retail-report.sh [date_from] [date_to] [db_url]
#
# Примеры:
#   ./scripts/vetais-retail-report.sh 2025-01-01 2025-12-31
#   ./scripts/vetais-retail-report.sh 2025-04-01 2025-04-30 "postgresql://postgres:ASPI6rin@localhost:5432/vetais_probiko_local"

DATE_FROM="${1:-$(date -d 'first day of last month' '+%Y-%m-%d' 2>/dev/null || date -v1d -v-1m '+%Y-%m-%d')}"
DATE_TO="${2:-$(date -d 'last day of last month' '+%Y-%m-%d' 2>/dev/null || date -v-1d '+%Y-%m-%d')}"
DB_URL="${3:-postgresql://postgres:ASPI6rin@localhost:5432/vetais_probiko_local}"

echo "Период: $DATE_FROM — $DATE_TO"
echo "База:   $DB_URL"
echo ""

psql "$DB_URL" << EOF
WITH totals AS (
  SELECT
    sum(ai.sum_with_vat) FILTER (WHERE it.id_type = 1)                    AS tovary,
    sum(ai.sum_with_vat) FILTER (WHERE it.id_type = 2)                    AS uslugi,
    sum(ai.sum_with_vat) FILTER (WHERE it.id_type IS NULL OR it.id_type NOT IN (1,2)) AS prochee,
    sum(ai.sum_with_vat)                                                   AS itogo
  FROM accounts_items ai
  JOIN accounts_headers ah ON ah.id = ai.account_header_id
  LEFT JOIN items_type it ON it.id = ai.item_type_id
  WHERE ai.deleted = 0
    AND ah.deleted = 0
    AND ah.datetime_create::date BETWEEN '$DATE_FROM' AND '$DATE_TO'
)
SELECT
  'дата с $DATE_FROM по $DATE_TO' ||
  ' на сумму '  || round(coalesce(itogo,   0)::numeric, 2) ||
  ', услуги: '  || round(coalesce(uslugi,  0)::numeric, 2) ||
  ', товары: '  || round(coalesce(tovary,  0)::numeric, 2) ||
  CASE WHEN coalesce(prochee, 0) <> 0
       THEN ', прочее: ' || round(prochee::numeric, 2)
       ELSE '' END
  AS "Строка для 1С"
FROM totals;

-- Детализация по типам
SELECT
  coalesce(it.name, 'Без типа') AS "Тип/Категория",
  count(DISTINCT ah.id)         AS "Счетов",
  count(ai.id)                  AS "Позиций",
  round(sum(ai.sum_with_vat)::numeric, 2) AS "Сумма"
FROM accounts_items ai
JOIN accounts_headers ah ON ah.id = ai.account_header_id
LEFT JOIN items_type it ON it.id = ai.item_type_id
WHERE ai.deleted = 0
  AND ah.deleted = 0
  AND ah.datetime_create::date BETWEEN '$DATE_FROM' AND '$DATE_TO'
GROUP BY it.name
ORDER BY "Сумма" DESC;
EOF
