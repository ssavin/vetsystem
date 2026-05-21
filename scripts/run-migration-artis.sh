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

# ── Шаг 1: Создать тенант и филиалы в VetSystem ───────────────────────────────
log ">>> Создание тенанта Артис в VetSystem"
psql "$DATABASE_URL" << SQL
DO \$\$
BEGIN
  -- Создаём тенант если не существует
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = '$TENANT') THEN
    INSERT INTO tenants (id, name, slug, is_active, created_at, updated_at)
    VALUES (
      '$TENANT',
      'Артис',
      '$SLUG',
      true,
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Тенант Артис создан';
  ELSE
    RAISE NOTICE 'Тенант уже существует, пропускаем';
  END IF;
END
\$\$;
SQL

# ── Шаг 2: Получить clinic_id из базы artis и создать филиалы ─────────────────
log ">>> Получение списка клиник из базы artis"
CLINICS=$(PGPASSWORD=$PASS psql -h $HOST -p $PORT -U $USER -d $DB -t -c \
  "SELECT id, name FROM file_clinics WHERE deleted IS NULL OR deleted = 0 ORDER BY id")

log "Клиники в базе artis:"
echo "$CLINICS"

log ">>> Создание филиалов в VetSystem"
PGPASSWORD=$PASS psql -h $HOST -p $PORT -U $USER -d $DB -t -c \
  "SELECT id, name FROM file_clinics WHERE deleted IS NULL OR deleted = 0 ORDER BY id" | \
while IFS='|' read -r clinic_id clinic_name; do
  clinic_id=$(echo "$clinic_id" | xargs)
  clinic_name=$(echo "$clinic_name" | xargs)
  if [ -n "$clinic_id" ] && [ -n "$clinic_name" ]; then
    log "  Создаём филиал: $clinic_name (clinic_id=$clinic_id)"
    psql "$DATABASE_URL" << SQL
DO \$\$
DECLARE
  branch_id TEXT;
BEGIN
  -- Проверяем нет ли уже ветки для этого clinic_id
  IF NOT EXISTS (
    SELECT 1 FROM branches 
    WHERE tenant_id = '$TENANT' 
    AND vetais_clinic_id = $clinic_id
  ) THEN
    INSERT INTO branches (
      id, tenant_id, name, is_active, vetais_clinic_id, created_at, updated_at
    ) VALUES (
      gen_random_uuid()::text,
      '$TENANT',
      '$clinic_name',
      true,
      $clinic_id,
      NOW(),
      NOW()
    )
    RETURNING id INTO branch_id;
    RAISE NOTICE 'Филиал % создан: %', '$clinic_name', branch_id;
  ELSE
    RAISE NOTICE 'Филиал % уже существует', '$clinic_name';
  END IF;
END
\$\$;
SQL
  fi
done

log ">>> Проверка созданных филиалов"
psql "$DATABASE_URL" -c "SELECT id, name, vetais_clinic_id FROM branches WHERE tenant_id='$TENANT' ORDER BY vetais_clinic_id"

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
SELECT 'owners'             AS table_name, COUNT(*) AS count FROM owners        WHERE tenant_id='$TENANT'
UNION ALL SELECT 'patients',              COUNT(*) FROM patients        WHERE tenant_id='$TENANT'
UNION ALL SELECT 'doctors',              COUNT(*) FROM doctors         WHERE tenant_id='$TENANT'
UNION ALL SELECT 'users',                COUNT(*) FROM users           WHERE tenant_id='$TENANT' AND role IN ('doctor','staff')
UNION ALL SELECT 'medical_records',      COUNT(*) FROM medical_records WHERE tenant_id='$TENANT'
UNION ALL SELECT 'invoices',             COUNT(*) FROM invoices        WHERE tenant_id='$TENANT'
UNION ALL SELECT 'invoice_items',        COUNT(*) FROM invoice_items ii
  JOIN invoices i ON ii.invoice_id=i.id  WHERE i.tenant_id='$TENANT';
"

log "Готово!"
sleep infinity
