#!/bin/bash
# Заполнение patient_owners для ВСЕХ тенантов.
# Запускать один раз после деплоя этого фикса на прод.
set -e

export NODE_OPTIONS="--max-old-space-size=4096"

log() { echo "[$(date '+%H:%M:%S')] $1"; }

log "=== ЗАПОЛНЕНИЕ patient_owners ДЛЯ ВСЕХ ТЕНАНТОВ ==="
echo ""

./node_modules/.bin/tsx scripts/fix-patient-owners.ts

log "=== ГОТОВО ==="
