#!/bin/bash
# Исправление doctor_id в medical_records для Динго и Василёк
# Запускать на продакшн-сервере: bash scripts/run-fix-doctors.sh
set -e

log() { echo "[$(date '+%H:%M:%S')] $1"; }

fix_doctors() {
  local tenant=$1 db=$2 host=$3 pass=$4 name=$5
  log "=== $name: исправление doctor_id ==="
  ./node_modules/.bin/tsx scripts/fix-medical-record-doctors.ts \
    --tenant "$tenant" \
    --db "$db" \
    --host "$host" \
    --password "$pass"
  log "=== $name: готово ==="
}

# Динго
fix_doctors \
  "e556ed34-71a7-4003-a2cd-b5cf274bae12" \
  "vetais" \
  "109.173.124.18" \
  "vetais" \
  "Динго"

# Василёк
fix_doctors \
  "bd89523e-47e7-4d4b-8b94-e98c6d3e1959" \
  "vetais_vasilek" \
  "94.198.53.52" \
  "vetais" \
  "Василёк"

log "Все исправления завершены!"
