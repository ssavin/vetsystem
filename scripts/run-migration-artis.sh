#!/bin/bash
# Полная миграция данных Артис в VetSystem (локальная база artis)
set -e

TENANT="229948ed-759c-45a5-8eb9-13ea97af495a"
SLUG="artis"
HOST="localhost"
PORT="5432"
DB="artis"
USER="postgres"
PASS="ASPI6rin"
BATCH=300

export NODE_OPTIONS="--max-old-space-size=4096"

export VETAIS_DB_HOST="$HOST"
export VETAIS_DB_PORT="$PORT"
export VETAIS_DB_USER="$USER"
export VETAIS_DB_PASSWORD="$PASS"

log() { echo "[$(date '+%H:%M:%S')] $1"; }

log "=== ЗАПУСК ПОЛНОЙ МИГРАЦИИ АРТИС ==="
log "Тенант: $TENANT"
log "База: $HOST:$PORT/$DB"

# ── Шаг 1: Создать тенант в VetSystem ─────────────────────────────────────────
log ">>> Создание тенанта Артис в VetSystem"
psql "$DATABASE_URL" -c "
  INSERT INTO tenants (id, name, slug, status, created_at, updated_at)
  VALUES (
    '$TENANT',
    'Артис',
    '$SLUG',
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;"
log "Тенант готов"

# ── Шаг 2: Посмотреть структуру file_clinics и создать филиалы ────────────────
log ">>> Структура file_clinics в базе artis:"
PGPASSWORD=$PASS psql -h $HOST -p $PORT -U $USER -d $DB -c "\d file_clinics" 2>/dev/null || \
  log "Таблица file_clinics не найдена или нет прав"

log ">>> Клиники в базе artis (первые 20 строк):"
PGPASSWORD=$PASS psql -h $HOST -p $PORT -U $USER -d $DB -c \
  "SELECT * FROM file_clinics ORDER BY id LIMIT 20" 2>/dev/null || \
  log "Не удалось прочитать file_clinics"

log ">>> Создание филиалов в VetSystem"
# Читаем id и name из file_clinics (без фильтра deleted — определим колонку выше)
PGPASSWORD=$PASS psql -h $HOST -p $PORT -U $USER -d $DB -t -A -F'|' -c \
  "SELECT id, name FROM file_clinics ORDER BY id" 2>/dev/null | \
while IFS='|' read -r clinic_id clinic_name; do
  clinic_id=$(echo "$clinic_id" | xargs)
  clinic_name=$(echo "$clinic_name" | xargs)
  [ -z "$clinic_id" ] && continue
  # Экранируем одинарные кавычки в имени
  clinic_name_safe="${clinic_name//\'/\'\'}"
  log "  Создаём филиал: $clinic_name (clinic_id=$clinic_id)"
  psql "$DATABASE_URL" -c "
    INSERT INTO branches (id, tenant_id, name, address, city, phone, status, vetais_clinic_id, created_at, updated_at)
    VALUES (
      gen_random_uuid()::text,
      '$TENANT',
      '$clinic_name_safe',
      '',
      '',
      '',
      'active',
      $clinic_id,
      NOW(),
      NOW()
    )
    ON CONFLICT (tenant_id, name) DO UPDATE SET vetais_clinic_id = EXCLUDED.vetais_clinic_id;" \
  && log "    OK: $clinic_name" || log "    ПРОПУСК (уже есть): $clinic_name"
done

log ">>> Созданные филиалы:"
psql "$DATABASE_URL" -c "SELECT id, name, vetais_clinic_id, status FROM branches WHERE tenant_id='$TENANT' ORDER BY vetais_clinic_id"

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

run_branch_mapping() {
  log "--- Маппинг филиалов ---"
  ./node_modules/.bin/tsx scripts/setup-branch-mapping.ts \
    --tenant "$TENANT" \
    --db "$DB" \
    --host "$HOST" \
    --port "$PORT" \
    --user "$USER" \
    --password "$PASS"
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

# ── Основные данные ───────────────────────────────────────────────────────────
log ">>> Владельцы"
run_universal owners

log ">>> Пациенты"
run_universal patients

log ">>> Маппинг филиалов (Vetais clinic_id → VetSystem branch_id)"
run_branch_mapping

log ">>> Врачи + создание пользователей"
run_universal doctors

# ── Медицинские данные ────────────────────────────────────────────────────────
log ">>> Медицинские записи"
run_medical records

log ">>> Вакцинации"
run_medical vaccinations

log ">>> Счета и позиции"
run_medical invoices

log "=== МИГРАЦИЯ ЗАВЕРШЕНА ==="

# Итоговая статистика
psql "$DATABASE_URL" -c "
SELECT 'owners'        AS table_name, COUNT(*) AS count FROM owners        WHERE tenant_id='$TENANT'
UNION ALL SELECT 'patients',          COUNT(*) FROM patients               WHERE tenant_id='$TENANT'
UNION ALL SELECT 'doctors',           COUNT(*) FROM doctors                WHERE tenant_id='$TENANT'
UNION ALL SELECT 'users',             COUNT(*) FROM users                  WHERE tenant_id='$TENANT' AND role IN ('doctor','staff')
UNION ALL SELECT 'medical_records',   COUNT(*) FROM medical_records        WHERE tenant_id='$TENANT'
UNION ALL SELECT 'invoices',          COUNT(*) FROM invoices               WHERE tenant_id='$TENANT'
UNION ALL SELECT 'invoice_items',     COUNT(*) FROM invoice_items ii
  JOIN invoices i ON ii.invoice_id=i.id WHERE i.tenant_id='$TENANT';"

log "Готово!"
sleep infinity
