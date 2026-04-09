#!/bin/bash
# Полная миграция данных Probiko в VetSystem (локальная база vetais_probiko_local)
set -e

TENANT="cc7d6b45-4a05-425d-890e-a5cb1bd89266"
HOST="localhost"
PORT="5432"
DB="vetais_probiko_local"
USER="postgres"
PASS="ASPI6rin"
BATCH=300

export NODE_OPTIONS="--max-old-space-size=4096"

# Экспортируем переменные окружения для vetais-config.ts
export VETAIS_DB_HOST="$HOST"
export VETAIS_DB_PORT="$PORT"
export VETAIS_DB_USER="$USER"
export VETAIS_DB_PASSWORD="$PASS"

log() { echo "[$(date '+%H:%M:%S')] $1"; }

log "=== ЗАПУСК ПОЛНОЙ МИГРАЦИИ PROBIKO ==="
log "Тенант: $TENANT"
log "База: $HOST:$PORT/$DB"

run_universal() {
  local phase=$1
  log "--- Фаза: $phase ---"
  ./node_modules/.bin/tsx scripts/migrate-vetais-universal.ts \
    --tenant "$TENANT" \
    --db "$DB" \
    --host "$HOST" \
    --port "$PORT" \
    --user "$USER" \
    --password "$PASS" \
    --phase "$phase" \
    --batch "$BATCH"
}

run_medical() {
  local phase=$1
  log "--- Фаза медданных: $phase ---"
  ./node_modules/.bin/tsx scripts/migrate-medical-data.ts \
    --tenant "$TENANT" \
    --db "$DB" \
    --host "$HOST" \
    --port "$PORT" \
    --user "$USER" \
    --password "$PASS" \
    --phase "$phase" \
    --batch "$BATCH"
}

# ── Базовые данные ────────────────────────────────────────────────────────────
log ">>> Владельцы"
run_universal owners

log ">>> Пациенты"
run_universal patients

log ">>> Врачи"
run_universal doctors

# ── Медицинские данные ────────────────────────────────────────────────────────
log ">>> Медицинские записи и история болезней"
run_medical records

log ">>> Вакцинации"
run_medical vaccinations

log ">>> Счета и позиции"
run_medical invoices

log "=== МИГРАЦИЯ ЗАВЕРШЕНА ==="

# Итоговая статистика
psql "$DATABASE_URL" -c "
SELECT 'owners'          AS table_name, COUNT(*) AS count FROM owners          WHERE tenant_id='$TENANT'
UNION ALL SELECT 'patients',          COUNT(*) FROM patients          WHERE tenant_id='$TENANT'
UNION ALL SELECT 'doctors',           COUNT(*) FROM doctors           WHERE tenant_id='$TENANT'
UNION ALL SELECT 'medical_records',   COUNT(*) FROM medical_records   WHERE tenant_id='$TENANT'
UNION ALL SELECT 'health_reminders',  COUNT(*) FROM health_reminders  WHERE tenant_id='$TENANT'
UNION ALL SELECT 'invoices',          COUNT(*) FROM invoices          WHERE tenant_id='$TENANT'
UNION ALL SELECT 'invoice_items',     COUNT(*) FROM invoice_items ii
  JOIN invoices i ON ii.invoice_id=i.id WHERE i.tenant_id='$TENANT';
"

log "Готово! Воркфлоу можно остановить."
sleep infinity
