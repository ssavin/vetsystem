#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  СКРИПТ НАСТРОЙКИ ТЕНАНТА ВАСИЛЁК НА ПРОДАКШЕН-СЕРВЕРЕ                ║
# ║                                                                          ║
# ║  Запуск: bash scripts/setup-vasilek-prod.sh                             ║
# ║  Выполнять из /var/www/vetsystem на продакшен-сервере                   ║
# ╚══════════════════════════════════════════════════════════════════════════╝

set -e

PROD_DB="postgresql://postgres:ASPI6rin@localhost:5432/vetsystem"
TENANT_ID="bd89523e-47e7-4d4b-8b94-e98c6d3e1959"

echo "╔══════════════════════════════════════════════════════╗"
echo "║   Настройка тенанта Василёк на продакшене           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Шаг 1: Создать тенант ─────────────────────────────────────────────────
echo "📋 Шаг 1: Создание тенанта Василёк..."
psql "$PROD_DB" << 'EOSQL'
INSERT INTO tenants (id, name, slug, status, max_branches, max_users)
VALUES (
  'bd89523e-47e7-4d4b-8b94-e98c6d3e1959',
  'Василёк',
  'vasilek',
  'active',
  10,
  50
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status;
EOSQL
echo "✅ Тенант создан"
echo ""

# ── Шаг 2: Создать филиалы ─────────────────────────────────────────────────
echo "🏥 Шаг 2: Создание филиалов..."
psql "$PROD_DB" << 'EOSQL'
INSERT INTO branches (id, tenant_id, name, address, city, phone, status, vetais_clinic_id)
VALUES
  ('a797197e-973c-4210-9d7b-83c2b02e4d74','bd89523e-47e7-4d4b-8b94-e98c6d3e1959',
   'Василёк-1','г. Москва, ул. Лётчика Ульянина дом 7','Москва','8-499-110-01-05 доб. 1','active',10000),
  ('d32427c4-c2cd-4a19-9c4b-d94c9483f6ea','bd89523e-47e7-4d4b-8b94-e98c6d3e1959',
   'Василёк-2','Москва, Боровское ш., дом 20','Москва','8-499-110-01-05 доб.2','active',10001),
  ('5f458007-0e7c-43e2-ba8e-985c177c153d','bd89523e-47e7-4d4b-8b94-e98c6d3e1959',
   'Василёк-3','ул. Скульптора Мухиной, д.13','Москва','8-499-110-01-05 доб.3','active',10002),
  ('ac5016a4-19d3-4541-99b5-ec9dfac0231c','bd89523e-47e7-4d4b-8b94-e98c6d3e1959',
   'Василёк-4','ул. Пастернака, дом 23','Москва','8-499-110-01-05 доб.4','active',10003),
  ('9afff974-64cc-4f73-9854-052eb8806688','bd89523e-47e7-4d4b-8b94-e98c6d3e1959',
   'Василёк-3 ОРИТ','ул. Скульптора Мухиной, д.13','Москва','8-499-110-01-05 доб.3','active',10004),
  ('c7b3ea65-17ad-43f0-8b30-d5a739850931','bd89523e-47e7-4d4b-8b94-e98c6d3e1959',
   'Василёк-5','ул. Производственная, д. 10, кор.1','Москва','8-499-110-01-05','active',10005),
  ('e86d7099-9128-4e68-925f-cb6b14e59107','bd89523e-47e7-4d4b-8b94-e98c6d3e1959',
   'Лаборатория','ул. Производственная, д. 10, кор.1','Москва','8-499-110-01-05','active',10006)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  vetais_clinic_id = EXCLUDED.vetais_clinic_id;
EOSQL
echo "✅ 7 филиалов создано"
echo ""

# ── Шаг 3: Создать admin-пользователя ─────────────────────────────────────
echo "👤 Шаг 3: Создание пользователя admin_vasilek..."
psql "$PROD_DB" << 'EOSQL'
INSERT INTO users (id, tenant_id, username, role, branch_id, password)
VALUES (
  '0984b54c-01cf-4843-b7ee-961eee7ee68d',
  'bd89523e-47e7-4d4b-8b94-e98c6d3e1959',
  'admin_vasilek',
  'администратор',
  'a797197e-973c-4210-9d7b-83c2b02e4d74',
  '$2b$10$Nqz4EvvlQq5fDSNosp7u5uGwsa0fEOz1YV4FrJ7O.Rax79K8UDEoC'
) ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  role     = EXCLUDED.role;
EOSQL
echo "✅ Пользователь admin_vasilek создан (пароль: admin123)"
echo ""

# ── Шаг 4: Миграция владельцев ─────────────────────────────────────────────
echo "👥 Шаг 4: Миграция владельцев из Vetais Василёк..."
echo "   (это займёт 3-7 минут)"
DATABASE_URL="$PROD_DB" tsx scripts/migrate-vetais-universal.ts \
  --tenant bd89523e-47e7-4d4b-8b94-e98c6d3e1959 \
  --db vetais_vasilek \
  --host 94.198.53.52 \
  --password vetais \
  --phase owners \
  --batch 2000
echo ""

# ── Шаг 5: Миграция пациентов ─────────────────────────────────────────────
echo "🐾 Шаг 5: Миграция пациентов из Vetais Василёк..."
echo "   (это займёт 10-20 минут)"
DATABASE_URL="$PROD_DB" tsx scripts/migrate-vetais-universal.ts \
  --tenant bd89523e-47e7-4d4b-8b94-e98c6d3e1959 \
  --db vetais_vasilek \
  --host 94.198.53.52 \
  --password vetais \
  --phase patients \
  --batch 2000
echo ""

# ── Шаг 6: Миграция врачей ─────────────────────────────────────────────────
echo "👨‍⚕️ Шаг 6: Миграция врачей..."
DATABASE_URL="$PROD_DB" tsx scripts/migrate-vetais-universal.ts \
  --tenant bd89523e-47e7-4d4b-8b94-e98c6d3e1959 \
  --db vetais_vasilek \
  --host 94.198.53.52 \
  --password vetais \
  --phase doctors
echo ""

# ── Шаг 7: Исправление привязки к филиалам ────────────────────────────────
echo "📍 Шаг 7: Привязка пациентов к филиалам..."
DATABASE_URL="$PROD_DB" tsx scripts/fix-patient-branches.ts \
  --tenant bd89523e-47e7-4d4b-8b94-e98c6d3e1959 \
  --db vetais_vasilek \
  --host 94.198.53.52 \
  --password vetais
echo ""

# ── Итог ──────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════"
echo "✨ ГОТОВО! Тенант Василёк полностью настроен."
echo ""
echo "   Логин:  admin_vasilek"
echo "   Пароль: admin123"
echo "   URL:    https://vasilek.вашдомен.ru"
echo "═══════════════════════════════════════════════════════"
