# Инструкция по восстановлению базы данных

## Файлы резервной копии

- **backup_20251019_115113.sql** (148 МБ) - полный SQL дамп базы данных
- **backup_20251019_115113.sql.gz** (30 МБ) - сжатая версия для скачивания

## Статистика backup

- Количество таблиц: **61**
- Включает все таблицы системы VetSystem:
  - appointments (записи на приём)
  - patients (пациенты)
  - owners (владельцы)
  - medical_records (медицинские записи)
  - clinical_cases (клинические случаи)
  - invoices (счета)
  - products, services (товары и услуги)
  - hospital_stays (стационар)
  - cages (клетки)
  - call_logs (журнал звонков)
  - cash_registers (кассы)
  - и все остальные таблицы системы

## Способ 1: Восстановление на Replit

```bash
# Из сжатого файла
gunzip -c backup_20251019_115113.sql.gz | psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE

# Из несжатого файла
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE < backup_20251019_115113.sql
```

## Способ 2: Восстановление на локальной PostgreSQL

```bash
# 1. Создайте новую базу данных
createdb vetsystem_restored

# 2. Восстановите из backup
gunzip -c backup_20251019_115113.sql.gz | psql -d vetsystem_restored

# Или из несжатого файла
psql -d vetsystem_restored < backup_20251019_115113.sql
```

## Способ 3: Восстановление на удалённом сервере

```bash
# Разархивируйте файл
gunzip backup_20251019_115113.sql.gz

# Загрузите на сервер
psql -h HOSTNAME -p PORT -U USERNAME -d DATABASE_NAME < backup_20251019_115113.sql
```

## Важно!

⚠️ **Перед восстановлением убедитесь:**
1. База данных назначения пуста или вы готовы перезаписать существующие данные
2. Версия PostgreSQL совместима (рекомендуется PostgreSQL 14+)
3. У пользователя БД есть права на создание таблиц и добавление данных

## Проверка целостности после восстановления

```bash
# Подключитесь к базе данных
psql -d your_database

# Проверьте количество таблиц
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
# Должно быть: 61

# Проверьте некоторые таблицы
SELECT count(*) FROM patients;
SELECT count(*) FROM owners;
SELECT count(*) FROM appointments;
```

## Создание нового backup

```bash
# SQL дамп
pg_dump -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE > backup_$(date +%Y%m%d_%H%M%S).sql

# Сжатый backup
pg_dump -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Custom формат (позволяет выборочное восстановление)
pg_dump -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -Fc > backup_$(date +%Y%m%d_%H%M%S).dump
```

## Скачивание файлов

Файлы backup находятся в корневой директории проекта:
- `backup_20251019_115113.sql` - несжатый (148 МБ)
- `backup_20251019_115113.sql.gz` - сжатый (30 МБ, рекомендуется)

Для скачивания используйте интерфейс Replit или команду:
```bash
# Показать список backup файлов
ls -lh backup_*
```
