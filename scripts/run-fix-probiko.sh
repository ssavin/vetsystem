#!/bin/bash
# Исправление данных Probiko:
#   1. Создание филиалов из vetais_probiko_local
#   2. Привязка пациентов к филиалам
#   3. Привязка владельцев (клиентов) к филиалам
#   4. Заполнение таблицы patient_owners
set -e

# Загрузить DATABASE_URL из .env если не задан в окружении
if [ -z "$DATABASE_URL" ] && [ -f .env ]; then
  set -a; source .env; set +a
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL не задан. Добавьте в .env или экспортируйте вручную."
  exit 1
fi

TENANT="cc7d6b45-4a05-425d-890e-a5cb1bd89266"
HOST="localhost"
PORT="5432"
DB="vetais_probiko_local"
USER="postgres"
PASS="ASPI6rin"

export NODE_OPTIONS="--max-old-space-size=4096"

# Экспорт для fix-client-branches-fast.ts
export VETAIS_DB_HOST="$HOST"
export VETAIS_DB_PORT="$PORT"
export VETAIS_DB_NAME="$DB"
export VETAIS_DB_USER="$USER"
export VETAIS_DB_PASSWORD="$PASS"

log() { echo "[$(date '+%H:%M:%S')] $1"; }

log "=== ИСПРАВЛЕНИЕ ДАННЫХ PROBIKO ==="
log "Тенант: $TENANT"
log "Vetais: $HOST:$PORT/$DB"
echo ""

# Шаг 1: Создать филиалы
log "--- Шаг 1: Создание филиалов ---"
./node_modules/.bin/tsx scripts/fix-probiko-branches.ts \
  --host "$HOST" --port "$PORT" \
  --user "$USER" --password "$PASS" \
  --db "$DB"
echo ""

# Шаг 2: Привязать пациентов к филиалам
log "--- Шаг 2: Привязка пациентов к филиалам ---"
./node_modules/.bin/tsx scripts/fix-patient-branches.ts \
  --tenant "$TENANT" \
  --db "$DB" \
  --host "$HOST" --port "$PORT" \
  --user "$USER" --password "$PASS"
echo ""

# Шаг 3: Привязать владельцев к филиалам
log "--- Шаг 3: Привязка владельцев к филиалам ---"
./node_modules/.bin/tsx scripts/fix-client-branches-fast.ts "$TENANT"
echo ""

# Шаг 4: Заполнить patient_owners
log "--- Шаг 4: Заполнение связей пациент-владелец ---"
./node_modules/.bin/tsx scripts/fix-patient-owners.ts \
  --tenant "$TENANT"
echo ""

log "=== ВСЕ ИСПРАВЛЕНИЯ ЗАВЕРШЕНЫ ==="
