# Overview
VetSystem is a **Multi-Tenant SaaS platform** designed as a comprehensive veterinary clinic management system. It aims to streamline operations across client/patient registry, appointment scheduling, electronic medical records, inventory, and financial management. Built as a full-stack web application, it serves healthcare professionals needing an efficient, reliable system for managing veterinary practice operations. The platform features a multi-tenant architecture with data isolation per clinic, accessible via subdomains, and includes a superadmin portal for platform-wide management.

# User Preferences
Preferred communication style: Simple, everyday language.

# System Architecture

## Core Principles
-   **Multi-Tenancy**: Data isolation per clinic, accessible via subdomains, with a superadmin portal for platform-wide management.
-   **Security**: JWT-based authentication with `tenant_id` embedding, `TenantResolver` middleware, Auth middleware, and PostgreSQL Row-Level Security (RLS) for robust tenant and role-based access control.

## Frontend
-   **Framework**: React 18 with TypeScript (Vite).
-   **UI/UX**: Shadcn/ui (Radix UI, Tailwind CSS with healthcare-focused palette), Inter font, sidebar navigation, mobile-first responsive design, dark/light mode.
-   **State Management**: TanStack Query for server state.
-   **Routing**: Wouter.
-   **Forms**: React Hook Form with Zod validation.

## Backend
-   **Runtime**: Node.js with Express (TypeScript, ES modules).
-   **API Design**: RESTful API with structured error handling and Zod validation.
-   **Database ORM**: Drizzle ORM.
-   **File Storage**: Tenant/branch-scoped file system storage.

## Database
-   **Type**: PostgreSQL.
-   **Schema Management**: Drizzle Kit for migrations.
-   **Data Models**: Comprehensive veterinary domain models (Owners, Patients, Doctors, Appointments, Medical Records, Clinical Cases, Services, Products, Invoicing), with extended fields for Russian Federation legal compliance.

## Key Features
-   **Superadmin Portal**: Manages clinic tenants with CRUD operations, bypassing tenant isolation.
-   **Document Generation**: Multi-tenant template management (Handlebars for rendering, Puppeteer for PDF generation) for medical, consent, agreement, and legal documents, with tenant/branch ownership validation and RLS enforcement.
-   **Electronic Queue System**: Manages queue entries and calls with branch/tenant isolation via RLS, featuring atomic daily auto-reset numbering and scheduled cleanup.
-   **Hospital/Inpatient Module**:
    -   Manages hospital cages with real-time availability.
    -   Automated patient admission with draft invoice creation and hospital stay record initialization.
    -   Treatment logging with automatic invoice item creation and recalculation on deletion.
    -   Daily "Daily Stay" service charge via cron job.
    -   Branch-level isolation for cages and patients.
    -   Draft invoices remain open until discharge and are finalized at reception.

## Companion Applications
-   **Mobile Application (React Native with Expo)**:
    -   **UI**: React Native Paper (Material Design 3).
    -   **Authentication**: SMS-based (SMS.RU API) with JWT tokens.
    -   **Security**: Tenant isolation via `mobileTenantMiddleware` and RLS.
    -   **Features**: SMS authentication, owner/pet profiles, medical history, appointment booking, push notifications, real-time chat, medical file access, proactive health notifications.
-   **Desktop Companion (Electron + React + TypeScript + Vite)**:
    -   **Purpose**: Offline-capable desktop application for clinic operations.
    -   **Local Database**: SQLite for offline data storage (clients, patients, nomenclature, appointments, invoices) with `INSERT OR REPLACE` for conflict resolution.
    -   **Authentication**: User login with username/password synchronized with the main server, branch selection on login.
    -   **Synchronization**: Bidirectional, fully automated sync every 60 seconds (manual sync also available), uploads pending changes when online. Tracks local changes in `sync_queue` table.
    -   **Features**: Offline client/patient management, appointment scheduling, invoice creation.
    -   **Distribution**: Windows .exe installer via electron-builder.

# External Dependencies

## Core Framework & Database
-   `@neondatabase/serverless`: PostgreSQL serverless driver.
-   `drizzle-orm`: Type-safe ORM.
-   `connect-pg-simple`: PostgreSQL session store.

## UI/UX Libraries
-   `@radix-ui/*`: Accessible UI primitives.
-   `@tanstack/react-query`: Server state management.
-   `class-variance-authority`: Component variant utility.
-   `cmdk`: Command palette.
-   `embla-carousel-react`: Carousel component.
-   `date-fns`: Date manipulation.

## Validation & Forms
-   `zod`: Schema validation.
-   `@hookform/resolvers`: React Hook Form integration.
-   `drizzle-zod`: Drizzle ORM and Zod integration.

## Document Generation
-   `handlebars`: Template engine.
-   `puppeteer`: Headless browser for PDF generation.

## Communication & Notifications
-   `expo-server-sdk`: Expo push notification service.
-   **SMS.RU API**: SMS verification codes and 2FA.
-   **Mango Office**: Telephony integration (webhook handler, call logging, real-time notifications via Socket.IO, auto-open client card, call history).

## Business Integrations
-   **МойСклад**: One-way inventory sync (МойСклад → VetSystem) and fiscal receipt creation from VetSystem invoices.
-   **Dreamkas Start**: Fiscal receipt integration for local cash registers, nomenclature synchronization, and fiscal receipt creation.
-   **YooKassa**: Payment gateway.
-   **DADATA**: Data enrichment service.
-   **OpenAI**: AI services.

## Vetais Legacy Databases (for Data Migration)
-   **Host**: `45.128.206.134` (Port: `5454`, User: `postgres`, Password: `ASPI6rin`)
    -   `vetais_alisavet` (Tenant ID: `default-tenant-001`) — **МИГРИРОВАН**: 61,974 владельцев, 82,371 пациентов, 3 врача
    -   `vetais_haks` (Tenant ID: `e7c3459d-599b-4570-858f-1674dbd8db82`) — **МИГРИРОВАН**: 27,833 владельцев, 34,200 пациентов
    -   `arutyn1` (Tenant ID: `06d235e4-e7ba-4b2c-87a2-77afc72c4358`, Slug: `usatyj-polosatyj`) — **МИГРИРОВАН**: 8,838 владельцев, 11,335 пациентов
-   **Host**: `94.198.53.52` (Port: `5454`, User: `postgres`, Password: `vetais`)
    -   `vetais_vasilek` (Tenant ID: `bd89523e-47e7-4d4b-8b94-e98c6d3e1959`, Slug: `vasilek`) — **МИГРИРОВАН**: 56,327 владельцев, 76,740 пациентов, 107 врачей
-   **Host**: `109.173.124.18` (Port: `5454`, User: `postgres`, Password: `vetais`)
    -   `vetais` (Tenant ID: `e556ed34-71a7-4003-a2cd-b5cf274bae12`, Slug: `dingo`) — **МИГРИРОВАН**: 46,493 владельцев, 55,455 пациентов, 247,510 медзаписей, 197,706 счетов; admin: `admin_dingo` / `password`
-   **Локальный бэкап на проде** (`localhost:5432`, User: `postgres`, Password: `ASPI6rin`)
    -   `vetais_probiko_local` (Tenant ID: `cc7d6b45-4a05-425d-890e-a5cb1bd89266`, Slug: `probiko`) — **МИГРИРОВАН**: 25,760 владельцев, 30,744 пациентов, 102,178 счетов, 298,365 позиций; файл бэкапа: `/var/www/vetsystem/downloads/vetais_dbname_old_licname_ACC1050_260408-1621.sql`; admin: `admin_probiko` / `password`

## Миграционные инструменты
-   `scripts/migrate-vetais-universal.ts` — Универсальный идемпотентный скрипт миграции (owners/patients/doctors/all phases). CLI: `--tenant`, `--db`, `--host`, `--port`, `--user`, `--password`, `--batch`, `--phase`.
-   `scripts/fix-patient-branches.ts` — Скрипт исправления branch_id для уже мигрированных пациентов по clinic_id из Vetais. Те же CLI параметры.
-   `scripts/vetais-config.ts` — Конфигурация маппинга Vetais БД → VetSystem тенанты.
-   **Ключевые особенности маппинга**:
    -   `patient_sex`: id_pohlavi 8=самец, 9=самка, 10=самец кастрированный, 11=самка кастрированная
    -   `file_bridge_clients_patients`: vymazk/vymazp могут быть NULL (не 0) — всегда фильтровать `IS NULL OR = 0`
    -   Пациенты без владельца (нет bridge-записей) пропускаются — нельзя добавить без owner_id
    -   admin user: `admin_vasilek` / `admin123`, филиал: Василёк-1