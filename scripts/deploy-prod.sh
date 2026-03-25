#!/bin/bash
# =============================================================================
# Деплой VetSystem на продакшн сервер
# Запускать на сервере: /var/www/vetsystem
# =============================================================================

set -e  # Остановиться при любой ошибке

echo "=== [1/6] Переход в директорию проекта ==="
cd /var/www/vetsystem

echo "=== [2/6] Получение обновлений из GitHub ==="
git pull origin main

echo "=== [3/6] Установка зависимостей ==="
npm install --production=false

echo "=== [4/6] Применение миграций базы данных ==="
# Создаём таблицу распознавания лиц (если ещё не существует)
PGPASSWORD='ASPI6rin' psql -h localhost -p 5432 -U postgres -d vetsystem << 'SQL'
CREATE TABLE IF NOT EXISTS face_descriptors (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id VARCHAR NOT NULL,
  owner_name VARCHAR NOT NULL,
  descriptor JSONB NOT NULL,
  tenant_id VARCHAR NOT NULL,
  branch_id VARCHAR NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS face_desc_owner_idx  ON face_descriptors (owner_id);
CREATE INDEX IF NOT EXISTS face_desc_tenant_idx ON face_descriptors (tenant_id);
CREATE INDEX IF NOT EXISTS face_desc_branch_idx ON face_descriptors (branch_id);

SELECT 'face_descriptors: OK' as status;
SQL

echo "=== [5/6] Сборка фронтенда ==="
npm run build

echo "=== Проверка моделей face-api в сборке ==="
if ls dist/public/models/*.json 1> /dev/null 2>&1; then
  echo "✅ Модели face-api найдены в dist/public/models/"
  ls -lh dist/public/models/
else
  echo "⚠️  Модели НЕ найдены в dist/public/models/ — копируем вручную..."
  mkdir -p dist/public/models
  cp -v client/public/models/* dist/public/models/
  echo "✅ Модели скопированы"
fi

echo "=== [6/6] Перезапуск PM2 ==="
pm2 restart vetsystem

echo ""
echo "✅ Деплой завершён успешно!"
echo "   Статус PM2:"
pm2 show vetsystem | grep -E "status|uptime|memory|cpu"
