# Технологии и средства проекта VetSystem

## Frontend (Клиентская часть)

| Технология | Назначение |
|------------|------------|
| **React 18** | Основной UI-фреймворк |
| **TypeScript** | Типизация JavaScript |
| **Vite** | Сборщик и dev-сервер |
| **Tailwind CSS** | Стилизация (utility-first CSS) |
| **Shadcn/ui + Radix UI** | Библиотека UI-компонентов |
| **TanStack Query** | Управление серверным состоянием, кэширование запросов |
| **Wouter** | Маршрутизация |
| **React Hook Form + Zod** | Формы и валидация |
| **Lucide React** | Иконки |
| **i18next** | Мультиязычность (RU/EN) |
| **Framer Motion** | Анимации |
| **Recharts** | Графики и диаграммы |
| **Socket.IO Client** | Real-time коммуникация |

---

## Backend (Серверная часть)

| Технология | Назначение |
|------------|------------|
| **Node.js + Express** | Веб-сервер |
| **TypeScript (ES modules)** | Типизация |
| **Drizzle ORM** | ORM для PostgreSQL |
| **Zod** | Валидация запросов |
| **Passport.js** | Аутентификация |
| **Express Session** | Управление сессиями |
| **JWT** | Токены авторизации |
| **bcryptjs** | Хеширование паролей |
| **Multer** | Загрузка файлов |
| **node-cron** | Планировщик задач |
| **Socket.IO** | WebSocket сервер |

---

## База данных

| Технология | Назначение |
|------------|------------|
| **PostgreSQL (Neon)** | Основная БД |
| **Drizzle Kit** | Миграции схемы |
| **Row-Level Security (RLS)** | Изоляция данных между клиниками |
| **connect-pg-simple** | Хранение сессий в PostgreSQL |

---

## Генерация документов

| Технология | Назначение |
|------------|------------|
| **Handlebars** | Шаблонизатор HTML |
| **Puppeteer** | Генерация PDF через headless Chrome |

---

## Мобильное приложение

| Технология | Назначение |
|------------|------------|
| **React Native + Expo** | Кроссплатформенное приложение |
| **React Native Paper** | UI-компоненты (Material Design 3) |
| **expo-server-sdk** | Push-уведомления |

---

## Desktop Companion (Electron)

| Технология | Назначение |
|------------|------------|
| **Electron** | Desktop-приложение |
| **SQLite** | Локальная БД для офлайн-режима |
| **electron-builder** | Сборка .exe/.dmg |
| **esbuild + Vite** | Сборка main/renderer процессов |

---

## Внешние интеграции

| Сервис | Назначение |
|--------|------------|
| **SMS.RU** | SMS-авторизация |
| **МойСклад** | Синхронизация номенклатуры |
| **Dreamkas Start** | Фискальные чеки |
| **Mango Office** | Телефония, входящие звонки |
| **YooKassa** | Онлайн-платежи |
| **DADATA** | Обогащение данных (адреса, ИНН) |
| **OpenAI** | AI-функции |
| **Vetais (Legacy)** | Миграция данных из старой системы |

---

## Архитектура

- **Multi-Tenant SaaS** — изоляция данных по клиникам через tenant_id
- **Subdomain-based routing** — каждая клиника на своём поддомене
- **RBAC** — ролевой доступ (admin, doctor, receptionist и др.)
- **Superadmin Portal** — управление всеми клиниками

---

## Инструменты разработки

| Инструмент | Назначение |
|------------|------------|
| **tsx** | Запуск TypeScript напрямую |
| **ESBuild** | Быстрая компиляция |
| **Drizzle Studio** | Визуальный редактор БД |

---

## Vetais Legacy Database (Внешняя БД для миграции)

- **Host:** 45.128.206.134
- **Port:** 5454
- **Database:** vetais_alisavet
- **User:** postgres

### Ключевые таблицы Vetais:
- `file_clients` — клиенты (kod_kado = ID, nazev_kado = ФИО)
- `file_patients` — пациенты (id_majitele = ID владельца)
- `accounts_headers` — счета (client_id, client_name)
- `accounts_items` — позиции счетов
- `stock_item` — товары/услуги
- `stock_item_group` — группы товаров
- `items_type` — типы (товар/услуга)

### Подключение через psql:
```bash
PGPASSWORD='ASPI6rin' psql -h 45.128.206.134 -p 5454 -U postgres -d vetais_alisavet
```
