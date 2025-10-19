# Восстановление backup на внешнем сервере (vetsystemai.ru)

## ✅ Универсальный backup для PostgreSQL 14

**Файл:** `backup_no_owner_20251019_165716.sql.gz` (30 МБ)

Этот backup создан **специально для восстановления на внешних серверах**:
- ✅ Без ссылок на роли (neon_superuser и др.)
- ✅ Без привилегий (GRANT/REVOKE)
- ✅ Работает на PostgreSQL 14, 15, 16
- ✅ Все объекты будут принадлежать пользователю, который восстанавливает

## 🚀 Восстановление на vetsystemai.ru

### Вариант 1: Полное восстановление в новую БД (рекомендуется)

```bash
# 1. Создать новую пустую базу данных
createdb -U postgres vetsystem

# 2. Восстановить backup
gunzip -c backup_no_owner_20251019_165716.sql.gz | psql -U postgres -d vetsystem

# 3. Проверить результат
psql -U postgres -d vetsystem -c "\dt"
psql -U postgres -d vetsystem -c "SELECT count(*) FROM patients;"
```

### Вариант 2: Восстановление в существующую БД

⚠️ **ВНИМАНИЕ:** Это удалит существующие данные!

```bash
# 1. Создать backup существующей БД (для безопасности)
pg_dump -U postgres -d existing_db | gzip > old_backup_$(date +%Y%m%d).sql.gz

# 2. Очистить существующую БД
psql -U postgres -d existing_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 3. Восстановить новый backup
gunzip -c backup_no_owner_20251019_165716.sql.gz | psql -U postgres -d existing_db
```

### Вариант 3: С использованием sudo (если нужно)

```bash
# Распаковать файл
gunzip backup_no_owner_20251019_165716.sql.gz

# Восстановить от имени пользователя postgres
sudo -u postgres psql -d vetsystem < backup_no_owner_20251019_165716.sql
```

## 📥 Загрузка файла на сервер

### Через SCP:
```bash
# С локальной машины загрузить на сервер
scp backup_no_owner_20251019_165716.sql.gz user@vetsystemai.ru:/tmp/

# На сервере
cd /tmp
gunzip -c backup_no_owner_20251019_165716.sql.gz | psql -U postgres -d vetsystem
```

### Через wget (если файл доступен по URL):
```bash
# На сервере
wget https://your-replit-url/backup_no_owner_20251019_165716.sql.gz
gunzip -c backup_no_owner_20251019_165716.sql.gz | psql -U postgres -d vetsystem
```

## 🔍 Проверка после восстановления

```bash
# Подключиться к БД
psql -U postgres -d vetsystem

# Проверить таблицы
\dt

# Проверить количество записей
SELECT 
  'patients' as table_name, count(*) FROM patients
UNION ALL
SELECT 'owners', count(*) FROM owners
UNION ALL
SELECT 'appointments', count(*) FROM appointments
UNION ALL
SELECT 'medical_records', count(*) FROM medical_records
UNION ALL
SELECT 'invoices', count(*) FROM invoices;

# Проверить владельцев таблиц (должен быть ваш пользователь)
SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'public' LIMIT 10;

# Выход
\q
```

## ⚙️ Настройка переменных окружения на сервере

После восстановления обновите `.env` файл на сервере:

```env
# PostgreSQL на vetsystemai.ru
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/vetsystem
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_password
PGDATABASE=vetsystem

# Другие переменные
SESSION_SECRET=your_session_secret_here
NODE_ENV=production
```

## 🛠️ Решение возможных проблем

### Проблема: "could not connect to server"
```bash
# Проверить статус PostgreSQL
sudo systemctl status postgresql

# Запустить если остановлен
sudo systemctl start postgresql
```

### Проблема: "FATAL: password authentication failed"
```bash
# Переключиться на пользователя postgres
sudo -u postgres psql

# Создать/изменить пароль
ALTER USER postgres WITH PASSWORD 'new_password';
```

### Проблема: "database does not exist"
```bash
# Создать базу данных
sudo -u postgres createdb vetsystem

# Или через psql
sudo -u postgres psql -c "CREATE DATABASE vetsystem;"
```

### Проблема: Медленное восстановление
```bash
# Отключить автовакуум на время восстановления
psql -U postgres -d vetsystem -c "ALTER SYSTEM SET autovacuum = off;"

# Восстановить
gunzip -c backup_no_owner_20251019_165716.sql.gz | psql -U postgres -d vetsystem

# Включить обратно
psql -U postgres -d vetsystem -c "ALTER SYSTEM SET autovacuum = on;"
psql -U postgres -d vetsystem -c "SELECT pg_reload_conf();"
```

## 📊 Что включено в backup

**61 таблица** с полными данными:
- ✅ tenants (клиники)
- ✅ branches (филиалы)
- ✅ users (пользователи)
- ✅ owners (владельцы животных)
- ✅ patients (пациенты)
- ✅ appointments (записи на приём)
- ✅ medical_records (медицинские записи)
- ✅ clinical_cases (клинические случаи)
- ✅ invoices, invoice_items (счета)
- ✅ products, services (товары и услуги)
- ✅ hospital_stays, cages (стационар)
- ✅ call_logs (журнал звонков)
- ✅ cash_registers, cash_shifts (кассы)
- ✅ document_templates (шаблоны документов)
- ✅ integration_credentials (настройки интеграций)
- ✅ И все остальные таблицы системы

## 🔐 Безопасность

После восстановления:

1. **Измените пароли всех пользователей:**
```sql
-- Для каждого пользователя
UPDATE users SET password = crypt('new_password', gen_salt('bf')) WHERE id = 'user_id';
```

2. **Проверьте настройки интеграций:**
```sql
-- Проверить API ключи
SELECT id, integration_type, tenant_id FROM integration_credentials;

-- Обновить при необходимости через UI: Настройки → Интеграции
```

3. **Настройте pg_hba.conf** для безопасного доступа:
```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

## ✅ Итоговая команда (все в одну строку)

```bash
gunzip -c backup_no_owner_20251019_165716.sql.gz | psql -U postgres -d vetsystem 2>&1 | tee restore.log
```

Эта команда:
- ✅ Распаковывает backup на лету
- ✅ Восстанавливает в БД vetsystem
- ✅ Сохраняет вывод в restore.log для анализа
- ✅ Показывает процесс в реальном времени

---

**Дата создания:** 19 октября 2025  
**Версия PostgreSQL (источник):** 16.9  
**Совместимость:** PostgreSQL 14, 15, 16+  
**Размер:** 30 МБ (сжатый)
