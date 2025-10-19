# Решение проблем с восстановлением backup

## Проблема: "invalid command \N" при восстановлении

### Причина
Backup создан в формате PostgreSQL `COPY`, который требует специального режима. Ошибка возникает когда:
- Используется неправильный синтаксис команды
- Файл поврежден при передаче
- Неправильная кодировка или окончания строк (Windows vs Linux)

## ✅ ПРАВИЛЬНЫЕ способы восстановления

### Способ 1: Использовать редирект `<` (РЕКОМЕНДУЕТСЯ)

```bash
# Из сжатого файла
gunzip -c backup_20251019_115113.sql.gz | psql -h YOUR_HOST -U YOUR_USER -d YOUR_DATABASE

# Или распаковать сначала
gunzip backup_20251019_115113.sql.gz
psql -h YOUR_HOST -U YOUR_USER -d YOUR_DATABASE < backup_20251019_115113.sql
```

### Способ 2: Использовать DATABASE_URL

```bash
# Если у вас есть DATABASE_URL
export DATABASE_URL="postgresql://user:password@host:port/database"
gunzip -c backup_20251019_115113.sql.gz | psql "$DATABASE_URL"
```

### Способ 3: Интерактивный режим psql

```bash
# Распакуйте файл
gunzip backup_20251019_115113.sql.gz

# Подключитесь к БД
psql -h YOUR_HOST -U YOUR_USER -d YOUR_DATABASE

# В psql выполните:
\i backup_20251019_115113.sql
```

## ❌ НЕПРАВИЛЬНЫЕ способы (НЕ ИСПОЛЬЗУЙТЕ)

```bash
# НЕ ДЕЛАЙТЕ ТАК - приведет к ошибкам
cat backup_20251019_115113.sql | psql ...
psql ... -c "$(cat backup_20251019_115113.sql)"
```

## Проверка файла backup перед восстановлением

```bash
# Проверить, что файл не поврежден
gunzip -t backup_20251019_115113.sql.gz
echo $?  # Должен вывести 0

# Посмотреть начало файла
gunzip -c backup_20251019_115113.sql.gz | head -20

# Посмотреть конец файла
gunzip -c backup_20251019_115113.sql.gz | tail -20
```

## Создание backup совместимого с любыми серверами

Если стандартный backup не работает, создайте версию с INSERT вместо COPY:

```bash
# ВНИМАНИЕ: Этот backup будет намного больше и медленнее
pg_dump "$DATABASE_URL" \
  --inserts \
  --column-inserts \
  --no-owner \
  --no-privileges \
  > backup_compatible.sql

# Сжать
gzip backup_compatible.sql
```

Восстановление такого backup:
```bash
gunzip -c backup_compatible.sql.gz | psql -h HOST -U USER -d DATABASE
```

## Проблемы с кодировкой

Если файл был передан с Windows на Linux:

```bash
# Конвертировать окончания строк
dos2unix backup_20251019_115113.sql

# Или использовать sed
sed -i 's/\r$//' backup_20251019_115113.sql
```

## Восстановление на чистую БД (рекомендуется)

```bash
# 1. Создать новую пустую базу данных
createdb -h YOUR_HOST -U YOUR_USER new_database_name

# 2. Восстановить в нее backup
gunzip -c backup_20251019_115113.sql.gz | psql -h YOUR_HOST -U YOUR_USER -d new_database_name

# 3. Проверить результат
psql -h YOUR_HOST -U YOUR_USER -d new_database_name -c "SELECT count(*) FROM patients;"
```

## Восстановление с игнорированием ошибок

Если нужно восстановить хотя бы часть данных:

```bash
# Продолжать даже при ошибках
gunzip -c backup_20251019_115113.sql.gz | psql -h HOST -U USER -d DB --set ON_ERROR_STOP=off > restore.log 2>&1

# Проверить лог ошибок
grep ERROR restore.log
```

## Альтернатива: Custom формат

Создать backup в custom формате (более надежный):

```bash
# Создание
pg_dump "$DATABASE_URL" -Fc -f backup_custom.dump

# Восстановление
pg_restore -h YOUR_HOST -U YOUR_USER -d YOUR_DATABASE backup_custom.dump

# С очисткой БД перед восстановлением
pg_restore -h YOUR_HOST -U YOUR_USER -d YOUR_DATABASE --clean backup_custom.dump
```

## Пошаговая инструкция для вашего случая

```bash
# 1. Скачайте файл backup_20251019_115113.sql.gz на ваш сервер

# 2. Проверьте целостность
gunzip -t backup_20251019_115113.sql.gz

# 3. Создайте пустую базу данных
createdb -h localhost -U postgres vetsystem_new

# 4. Восстановите backup
gunzip -c backup_20251019_115113.sql.gz | psql -h localhost -U postgres -d vetsystem_new 2>&1 | tee restore.log

# 5. Проверьте результат
psql -h localhost -U postgres -d vetsystem_new -c "\dt"
psql -h localhost -U postgres -d vetsystem_new -c "SELECT count(*) FROM patients;"
```

## Частичное восстановление

Если нужно восстановить только определенные таблицы:

```bash
# 1. Создать backup только схемы
pg_dump "$DATABASE_URL" --schema-only > schema.sql

# 2. Создать backup только данных определенной таблицы
pg_dump "$DATABASE_URL" --data-only -t patients > patients_data.sql

# 3. Восстановить
psql -h HOST -U USER -d DATABASE < schema.sql
psql -h HOST -U USER -d DATABASE < patients_data.sql
```

## Связь с технической поддержкой

Если проблема сохраняется, предоставьте:
1. Версию PostgreSQL: `psql --version`
2. Первые 50 строк из backup: `gunzip -c backup.sql.gz | head -50`
3. Точную команду которую вы используете
4. Полный текст ошибки
