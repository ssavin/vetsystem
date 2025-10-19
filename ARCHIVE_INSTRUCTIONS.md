# VetSystem - Архив проекта

## Созданные архивы

### ✅ Рекомендуется: Чистый архив
**vetsystem_clean_20251019_115746.tar.gz** (11 МБ)
- Содержит только исходный код проекта
- 769 файлов
- Исключены зависимости и временные файлы

### Полный архив (опционально)
**vetsystem_project_20251019_115641.tar.gz** (497 МБ)
- Содержит все файлы включая служебные
- Не рекомендуется для передачи

## Содержимое чистого архива

### Структура проекта:
```
.
├── client/          # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── pages/      # Страницы приложения
│   │   ├── components/ # UI компоненты
│   │   ├── lib/        # Утилиты
│   │   └── hooks/      # React хуки
│   └── public/
├── server/          # Backend (Express + TypeScript)
│   ├── routes.ts       # API endpoints
│   ├── storage.ts      # Работа с БД
│   ├── middleware/     # Middleware
│   └── utils/          # Утилиты
├── shared/          # Общий код
│   └── schema.ts       # Схемы базы данных (Drizzle ORM)
├── db/              # Миграции и схемы БД
├── mobile/          # Мобильное приложение (опционально)
└── attached_assets/ # Медиа-файлы
```

### Типы файлов:
- **216 .py** - Python скрипты
- **134 .tsx** - React компоненты с TypeScript
- **97 .ts** - TypeScript файлы
- **23 .json** - Конфигурационные файлы
- **15 .png** - Изображения
- **13 .md** - Документация

## Распаковка архива

### Linux / macOS:
```bash
tar -xzf vetsystem_clean_20251019_115746.tar.gz
```

### Windows (Git Bash / WSL):
```bash
tar -xzf vetsystem_clean_20251019_115746.tar.gz
```

### Windows (7-Zip / WinRAR):
1. Правый клик на файл → Извлечь здесь
2. Если архив .tar.gz, нужно распаковать дважды

## Установка и запуск проекта

### 1. Установите зависимости
```bash
npm install
```

### 2. Настройте переменные окружения
Создайте файл `.env` в корне проекта:
```env
DATABASE_URL=postgresql://user:password@host:port/database
PGHOST=your_host
PGPORT=5432
PGUSER=your_user
PGPASSWORD=your_password
PGDATABASE=your_database
SESSION_SECRET=your_session_secret
```

### 3. Примените миграции базы данных
```bash
npm run db:push
```

### 4. Запустите проект
```bash
npm run dev
```

Приложение будет доступно по адресу: http://localhost:5000

## Восстановление базы данных

Если у вас есть файл backup базы данных, восстановите его:

```bash
# Из сжатого backup
gunzip -c backup_20251019_115113.sql.gz | psql -d your_database

# Из несжатого backup
psql -d your_database < backup_20251019_115113.sql
```

## Требования

### Необходимые компоненты:
- **Node.js** 18+ (рекомендуется 20+)
- **PostgreSQL** 14+ 
- **npm** или **yarn**

### Опционально:
- **Python** 3.11+ (для вспомогательных скриптов)
- **Git** (для контроля версий)

## Структура базы данных

Проект использует:
- **ORM**: Drizzle ORM
- **Миграции**: `npm run db:push`
- **Схемы**: определены в `shared/schema.ts`

### Основные таблицы:
- `tenants` - клиники (мультитенантность)
- `branches` - филиалы
- `users` - пользователи и сотрудники
- `owners` - владельцы животных
- `patients` - пациенты (животные)
- `appointments` - записи на приём
- `medical_records` - медицинские карты
- `clinical_cases` - клинические случаи
- `invoices` - счета
- `products` - товары
- `services` - услуги
- `hospital_stays` - стационар
- `cages` - клетки
- `call_logs` - журнал звонков
- и другие (всего 61 таблица)

## Интеграции

Проект поддерживает интеграции с:
- **МойСклад** - синхронизация товаров и услуг
- **YooKassa** - онлайн платежи
- **Dreamkas Start** - фискализация чеков
- **Mango Office** - телефония с автоматическими уведомлениями
- **SMS.RU** - SMS уведомления и 2FA
- **OpenAI** - AI функции

Настройки интеграций: Настройки → вкладки с интеграциями

## Документация

- `README.md` - общая информация о проекте
- `replit.md` - техническая архитектура
- `RESTORE_INSTRUCTIONS.md` - восстановление БД
- `ARCHIVE_INSTRUCTIONS.md` - этот файл

## Поддержка

Для вопросов по развёртыванию и настройке:
1. Проверьте переменные окружения
2. Убедитесь, что PostgreSQL запущен и доступен
3. Проверьте логи: `npm run dev`

## Лицензия

Проект разработан для ветеринарных клиник.

---

**Дата создания архива:** 19 октября 2025
**Версия:** Production
