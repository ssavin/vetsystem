#!/bin/bash

# ===== VetSystem Production Database Migration Script =====
# Использование: ./scripts/migrate-production.sh

set -e  # Выход при ошибке

echo "🗄️  VetSystem Production Database Migration"
echo "=========================================="
echo ""

# Проверка environment
if [ "$NODE_ENV" != "production" ]; then
    echo "⚠️  Warning: NODE_ENV is not set to 'production'"
    echo "Current NODE_ENV: $NODE_ENV"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted"
        exit 1
    fi
fi

# Проверка DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set it in .env.production or export it"
    exit 1
fi

echo "ℹ️  Database URL: ${DATABASE_URL%%@*}@***"  # Скрыть пароль
echo ""

# Создание резервной копии
echo "📦 Step 1/4: Creating database backup..."
BACKUP_DIR="./backups/db"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pre_migration_$TIMESTAMP.sql.gz"

# Извлечение параметров из DATABASE_URL
# Формат: postgresql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's|postgresql://\([^:]*\):.*|\1|p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's|postgresql://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's|postgresql://[^@]*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's|postgresql://[^@]*@[^:]*:\([^/]*\)/.*|\1|p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's|postgresql://[^/]*/\(.*\)|\1|p')

# Создание бэкапа
PGPASSWORD=$DB_PASS pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME | gzip > $BACKUP_FILE

if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h $BACKUP_FILE | cut -f1)
    echo "✅ Backup created: $BACKUP_FILE ($BACKUP_SIZE)"
else
    echo "❌ ERROR: Backup creation failed"
    exit 1
fi
echo ""

# Проверка подключения к БД
echo "🔌 Step 2/4: Testing database connection..."
if PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ ERROR: Cannot connect to database"
    echo "Please check your DATABASE_URL and database credentials"
    exit 1
fi
echo ""

# Показать текущие таблицы
echo "📋 Step 3/4: Current database state..."
TABLES_COUNT=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "Current tables count: $TABLES_COUNT"
echo ""

# Применение миграций
echo "🚀 Step 4/4: Applying database migrations..."
echo "⚠️  This will modify your database schema"
read -p "Continue with migration? (y/n): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration aborted"
    echo "Backup is saved at: $BACKUP_FILE"
    exit 0
fi

echo "Running: npm run db:push"
echo ""

# Применить миграции
if npm run db:push; then
    echo ""
    echo "✅ Migration completed successfully!"
else
    MIGRATION_EXIT_CODE=$?
    echo ""
    echo "❌ Migration failed with exit code: $MIGRATION_EXIT_CODE"
    echo ""
    echo "⚠️  IMPORTANT: Your database backup is at:"
    echo "   $BACKUP_FILE"
    echo ""
    echo "If you need to restore, run:"
    echo "   gunzip < $BACKUP_FILE | PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
    exit 1
fi

# Проверка после миграции
NEW_TABLES_COUNT=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo ""
echo "📊 Migration Summary:"
echo "   Tables before: $TABLES_COUNT"
echo "   Tables after:  $NEW_TABLES_COUNT"
echo "   Backup: $BACKUP_FILE"
echo ""
echo "✅ All done! Your database is up to date."
echo ""
echo "Next steps:"
echo "  1. Test your application"
echo "  2. If everything works, you can remove old backups:"
echo "     find $BACKUP_DIR -name '*.sql.gz' -mtime +30 -delete"
echo "  3. If something is wrong, restore from backup (see above)"
