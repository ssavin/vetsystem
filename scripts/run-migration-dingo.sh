#!/bin/bash
# Полная миграция данных Динго в VetSystem (владельцы + пациенты + врачи + медкарты + счета)
set -e

TENANT="e556ed34-71a7-4003-a2cd-b5cf274bae12"
HOST="109.173.124.18"
DB="vetais"
PASS="vetais"
BATCH=300

export NODE_OPTIONS="--max-old-space-size=4096"

log() { echo "[$(date '+%H:%M:%S')] $1"; }

log "=== ЗАПУСК ПОЛНОЙ МИГРАЦИИ ДИНГО ==="
log "Тенант: $TENANT"
log "База: $HOST/$DB"

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

run_medical() {
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

# ── Базовые данные ────────────────────────────────────────────────────────────
log ">>> Владельцы"
run_universal owners

log ">>> Пациенты"
run_universal patients

log ">>> Маппинг филиалов (Vetais clinic_id → VetSystem branch_id)"
run_branch_mapping

log ">>> Врачи + создание пользователей"
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
SELECT 'owners'               AS table_name, COUNT(*) AS count FROM owners          WHERE tenant_id='$TENANT'
UNION ALL SELECT 'patients',               COUNT(*) FROM patients          WHERE tenant_id='$TENANT'
UNION ALL SELECT 'doctors (profiles)',     COUNT(*) FROM doctors           WHERE tenant_id='$TENANT'
UNION ALL SELECT 'users (doctor/staff)',   COUNT(*) FROM users             WHERE tenant_id='$TENANT' AND role IN ('doctor','staff')
UNION ALL SELECT 'medical_records',       COUNT(*) FROM medical_records   WHERE tenant_id='$TENANT'
UNION ALL SELECT 'health_reminders',      COUNT(*) FROM health_reminders  WHERE tenant_id='$TENANT'
UNION ALL SELECT 'invoices',              COUNT(*) FROM invoices          WHERE tenant_id='$TENANT'
UNION ALL SELECT 'invoice_items',         COUNT(*) FROM invoice_items ii
  JOIN invoices i ON ii.invoice_id=i.id WHERE i.tenant_id='$TENANT';
"

log "Готово! Воркфлоу можно остановить."
sleep infinity
