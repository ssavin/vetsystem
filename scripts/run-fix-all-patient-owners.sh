#!/bin/bash
# Заполнение patient_owners для ВСЕХ тенантов.
# Запускать один раз после деплоя этого фикса на прод.
set -e

# Загрузить DATABASE_URL из .env если не задан в окружении
if [ -z "$DATABASE_URL" ] && [ -f .env ]; then
  set -a; source .env; set +a
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL не задан. Добавьте в .env или экспортируйте вручную."
  exit 1
fi

export NODE_OPTIONS="--max-old-space-size=4096"

log() { echo "[$(date '+%H:%M:%S')] $1"; }

log "=== ЗАПОЛНЕНИЕ patient_owners ДЛЯ ВСЕХ ТЕНАНТОВ ==="
echo ""

./node_modules/.bin/tsx scripts/fix-patient-owners.ts

log "=== ГОТОВО ==="
