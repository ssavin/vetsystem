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

run_universal() {
  local phase=$1
  log "--- Фаза: $phase ---"
  ./node_modules/.bin/tsx scripts/migrate-vetais-universal.ts \
    --tenant "$TENANT" \
    --db "$DB" \
    --host "$HOST" \
    --password "$PASS" \
    --phase "$phase" \
    --batch "$BATCH"
}

run_branch_mapping() {
  log "--- Маппинг филиалов ---"
  ./node_modules/.bin/tsx scripts/setup-branch-mapping.ts \
    --tenant "$TENANT" \
    --db "$DB" \
    --host "$HOST" \
    --password "$PASS"
}

run_phase() {
  local phase=$1
  log "--- Фаза медданных: $phase ---"
  ./node_modules/.bin/tsx scripts/migrate-medical-data.ts \
    --tenant "$TENANT" \
    --db "$DB" \
    --host "$HOST" \
    --password "$PASS" \
    --phase "$phase" \
    --batch "$BATCH"
}

# ── Маппинг филиалов и создание пользователей для врачей ─────────────────────
log ">>> Маппинг филиалов (Vetais clinic_id → VetSystem branch_id)"
run_branch_mapping

log ">>> Врачи + создание пользователей (идемпотентно)"
run_universal doctors

# ── Медицинские данные ────────────────────────────────────────────────────────
log ">>> Медицинские записи (records)"
run_phase records

log ">>> Вакцинации"
run_phase vaccinations

log ">>> Счета и позиции"
run_phase invoices

log "=== МИГРАЦИЯ ЗАВЕРШЕНА ==="

# Итоговая статистика
psql "$DATABASE_URL" -c "
SELECT
  'users (doctors/staff)' as table_name, COUNT(*) as count FROM users WHERE tenant_id='$TENANT' AND role IN ('doctor','staff')
UNION ALL SELECT 'medical_records', COUNT(*) FROM medical_records WHERE tenant_id='$TENANT'
UNION ALL SELECT 'health_reminders', COUNT(*) FROM health_reminders WHERE tenant_id='$TENANT'
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices WHERE tenant_id='$TENANT'
UNION ALL SELECT 'invoice_items', COUNT(*) FROM invoice_items ii
  JOIN invoices i ON ii.invoice_id=i.id WHERE i.tenant_id='$TENANT';
"

log "Готово! Воркфлоу можно остановить."

# Держим процесс живым (чтобы воркфлоу не перезапускался)
sleep infinity
