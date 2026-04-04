#!/bin/bash
# Миграция данных Динго в VetSystem
set -e

TENANT="e556ed34-71a7-4003-a2cd-b5cf274bae12"
HOST="109.173.124.18"
DB="vetais"
PASS="vetais"
BATCH=300

export NODE_OPTIONS="--max-old-space-size=4096"

log() { echo "[$(date '+%H:%M:%S')] $1"; }

log "=== ЗАПУСК МИГРАЦИИ ДИНГО ==="
log "Тенант: $TENANT"
log "База: $HOST/$DB"

# Владельцы
log "--- Фаза: owners ---"
./node_modules/.bin/tsx scripts/migrate-vetais-universal.ts \
  --tenant "$TENANT" \
  --db "$DB" \
  --host "$HOST" \
  --password "$PASS" \
  --phase owners \
  --batch "$BATCH"

# Пациенты
log "--- Фаза: patients ---"
./node_modules/.bin/tsx scripts/migrate-vetais-universal.ts \
  --tenant "$TENANT" \
  --db "$DB" \
  --host "$HOST" \
  --password "$PASS" \
  --phase patients \
  --batch "$BATCH"

# Врачи
log "--- Фаза: doctors ---"
./node_modules/.bin/tsx scripts/migrate-vetais-universal.ts \
  --tenant "$TENANT" \
  --db "$DB" \
  --host "$HOST" \
  --password "$PASS" \
  --phase doctors \
  --batch "$BATCH"

log "=== МИГРАЦИЯ ЗАВЕРШЕНА ==="

# Итоговая статистика
psql "$DATABASE_URL" -c "
SELECT 'owners'   AS table_name, COUNT(*) AS count FROM owners   WHERE tenant_id='$TENANT'
UNION ALL
SELECT 'patients', COUNT(*) FROM patients WHERE tenant_id='$TENANT'
UNION ALL
SELECT 'users',    COUNT(*) FROM users    WHERE tenant_id='$TENANT';
"

log "Готово! Воркфлоу можно остановить."
sleep infinity
