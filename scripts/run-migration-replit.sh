#!/bin/bash
# Непрерывная миграция данных Василёк в Replit до полного завершения
set -e

TENANT="bd89523e-47e7-4d4b-8b94-e98c6d3e1959"
HOST="94.198.53.52"
DB="vetais_vasilek"
PASS="vetais"
BATCH=300

export NODE_OPTIONS="--max-old-space-size=4096"

log() { echo "[$(date '+%H:%M:%S')] $1"; }

log "=== ЗАПУСК МИГРАЦИИ ВАСИЛЁК ==="
log "Тенант: $TENANT"

run_phase() {
  local phase=$1
  log "--- Фаза: $phase ---"
  ./node_modules/.bin/tsx scripts/migrate-medical-data.ts \
    --tenant "$TENANT" \
    --db "$DB" \
    --host "$HOST" \
    --password "$PASS" \
    --phase "$phase" \
    --batch "$BATCH"
}

# Осмотры
log ">>> Медицинские записи (records)"
run_phase records

# Вакцинации
log ">>> Вакцинации"
run_phase vaccinations

# Счета
log ">>> Счета и позиции"
run_phase invoices

log "=== МИГРАЦИЯ ЗАВЕРШЕНА ==="

# Итоговая статистика
psql "$DATABASE_URL" -c "
SELECT
  'medical_records' as table_name, COUNT(*) as count FROM medical_records WHERE tenant_id='$TENANT'
UNION ALL SELECT 'health_reminders', COUNT(*) FROM health_reminders WHERE tenant_id='$TENANT'
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices WHERE tenant_id='$TENANT'
UNION ALL SELECT 'invoice_items', COUNT(*) FROM invoice_items ii
  JOIN invoices i ON ii.invoice_id=i.id WHERE i.tenant_id='$TENANT';
"

log "Готово! Воркфлоу можно остановить."

# Держим процесс живым (чтобы воркфлоу не перезапускался)
sleep infinity
