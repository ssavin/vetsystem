# Overview
VetSystem is a **Multi-Tenant SaaS platform** designed as a comprehensive veterinary clinic management system. It aims to streamline operations across client/patient registry, appointment scheduling, electronic medical records, inventory, and financial management. Built as a full-stack web application with a React frontend and Express backend, it serves healthcare professionals needing an efficient, reliable system for managing veterinary practice operations.

The platform features a multi-tenant architecture where each veterinary clinic operates as an independent tenant with complete data isolation, accessible via subdomains. It includes a superadmin portal for platform-wide management and supports tenant-specific subscriptions and billing. The system covers the entire veterinary clinic workflow, emphasizing healthcare-focused design patterns.

# User Preferences
Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
-   **Framework**: React 18 with TypeScript (Vite).
-   **UI Components**: Shadcn/ui built on Radix UI primitives.
-   **Styling**: Tailwind CSS with a custom healthcare-focused color palette.
-   **State Management**: TanStack Query for server state and caching.
-   **Routing**: Wouter for lightweight client-side routing.
-   **Forms**: React Hook Form with Zod for type-safe validation.

## Backend
-   **Runtime**: Node.js with Express.
-   **Language**: TypeScript with ES modules.
-   **API Design**: RESTful API with structured error handling and Zod validation.
-   **Database ORM**: Drizzle ORM for type-safe database operations.
-   **File Storage**: Tenant/branch-scoped file system storage for medical records and patient files, with Multer for uploads.

## Database
-   **Database**: PostgreSQL with Neon serverless hosting.
-   **Schema Management**: Drizzle Kit for migrations.
-   **Data Models**: Comprehensive veterinary domain models including Owners, Patients, Doctors, Appointments, Medical Records, Clinical Cases, Services, Products, and Invoicing.
-   **RF Legal Compliance Fields**: Extended schema for Russian Federation document flow (e.g., passport data, OGRN/OGRNIP, veterinary license, personal data consent).

## Authentication & Security
-   **Multi-Tenant Authentication**: JWT-based authentication with `tenant_id` embedding and validation.
-   **Tenant Isolation**: TenantResolver middleware, Auth middleware, and PostgreSQL Row-Level Security (RLS).
-   **Session Management**: Express sessions with PostgreSQL store.
-   **User Management**: Role-based access control (RBAC).

## Superadmin Portal
-   Provides CRUD operations for managing clinic tenants.
-   Superadmin routes bypass tenant isolation for platform management.

## Tenant-Specific Integrations
-   Each tenant manages independent API credentials for external services (e.g., МойСклад, YooKassa), secured by RLS.

## Document Generation & Printing
-   **Document Templates System**: Multi-tenant template management with system-wide fallback, using Handlebars for rendering and Puppeteer for PDF generation.
-   **Template Types**: Medical (invoice, prescription), Consent (informed consent), Agreements (service agreement), Legal (personal data consent).
-   **Context Data**: Templates can access owner, patient, clinic, and auto-generated contract number data.
-   **Security**: Tenant and branch ownership validation, RLS enforcement.
-   **API**: POST `/api/documents/generate` with Zod validation.
-   **Management UI**: CRUD operations for custom templates with live preview.

## Electronic Queue System
-   **Database Schema**: `queue_entries` and `queue_calls` tables with branch/tenant isolation via RLS.
-   **Security**: Zod validation, patient ownership verification, branch/tenant context validation.
-   **Atomic Queue Numbering**: Transaction-safe generation using PostgreSQL advisory locks, daily auto-reset.
-   **Expiration & Cleanup**: Queue calls have expiration timestamps and are cleaned up by a scheduler.
-   **API Endpoints**: CRUD operations for queue entries and calls, enriched with patient, owner, and doctor names.

## Design System
-   **Color Palette**: Medical-focused scheme.
-   **Typography**: Inter font for readability, JetBrains Mono for technical data.
-   **Layout**: Sidebar navigation.
-   **Responsiveness**: Mobile-first responsive design.
-   **Theming**: Dark/light mode support.

## Settings Page UI Structure
-   **Tab-based Organization**: Settings page reorganized into dedicated tabs for better UX and maintainability.
-   **Tabs**:
    -   **General Settings** (general): Clinic information, theme settings, quick action buttons, integrations management, notifications (email/SMS/appointments/stock/payments), system-wide settings
    -   **Branch Management** (branches): Complete CRUD operations for clinic branches with statistics (total, active, inactive)
    -   **Staff Management** (staff): Complete CRUD operations for users/staff with role management and statistics
    -   **Legal Entities** (legal-entities): Placeholder for future legal entity management
    -   **Document Templates** (templates): Document template management with live preview
-   **Benefits**: Reduced cognitive load, cleaner code organization, isolated functionality, easier maintenance

## Mobile Application
-   **Framework**: React Native with Expo for cross-platform development (iOS/Android).
-   **UI Library**: React Native Paper with Material Design 3 theming.
-   **Navigation**: React Navigation with native stack navigator.
-   **State Management**: 
    -   TanStack Query for server state and caching
    -   AuthContext for authentication state management
    -   Token rehydration on app launch via initializeAuth()
-   **Authentication**: 
    -   SMS-based authentication with JWT tokens via SMS.RU API
    -   Token persistence in AsyncStorage
    -   Automatic token injection into axios defaults on app relaunch
    -   Logout clears both AsyncStorage and axios headers
    -   SMS verification codes expire in 10 minutes
-   **API Integration**: 
    -   Axios client with automatic token management
    -   Tenant context extracted from JWT by mobileTenantMiddleware
    -   Base URL: `/api/mobile/*`
-   **Security**: 
    -   Tenant isolation enforced via mobileTenantMiddleware on backend (AsyncLocalStorage + RLS)
    -   All authenticated endpoints chain: authenticateToken → mobileTenantMiddleware
    -   Ownership validation for pets, appointments, and medical history
    -   Unauthenticated SMS endpoints intentionally outside tenant middleware
-   **Features**:
    -   SMS authentication (send code, verify code)
    -   Owner profile with pets list
    -   Pet details and medical history
    -   Appointment booking (multi-step process with real-time slot availability)
    -   Push notifications support (Expo Notifications)
    -   **V2 Features (NEW)**:
        -   **Chat System**: Real-time messaging with clinic staff via conversations API
        -   **Medical File Access**: View and download clinical encounter attachments (X-rays, lab results, prescriptions)
        -   **Proactive Health Notifications**: Automated reminders for upcoming vaccinations and appointments (7 days & 1 day ahead)
-   **Screens**:
    -   AuthScreen: SMS login flow with phone verification
    -   HomeScreen: Dashboard with owner info and pets carousel
    -   PetsScreen: Searchable list of all pets
    -   PetDetailScreen: Pet information and medical history timeline
    -   BookingScreen: Step-by-step appointment booking (pet → doctor → branch → date/time → confirm)
-   **API Endpoints** (Mobile-specific):
    -   POST `/api/mobile/auth/send-code` - Send SMS verification code (unauthenticated)
    -   POST `/api/mobile/auth/verify-code` - Verify code and authenticate (unauthenticated)
    -   GET `/api/mobile/me/profile` - Get owner profile with pets (authenticated)
    -   GET `/api/mobile/doctors` - Get active doctors (authenticated)
    -   GET `/api/mobile/branches` - Get active branches (authenticated)
    -   GET `/api/mobile/appointments/slots` - Get available time slots (authenticated)
    -   POST `/api/mobile/appointments` - Create appointment (authenticated)
    -   GET `/api/mobile/pets/:petId/history` - Get pet medical history (authenticated)
    -   POST `/api/mobile/me/register-push-token` - Register push notification token (authenticated)
    -   **V2 Endpoints (NEW)**:
        -   GET `/api/mobile/me/conversations` - Get owner's conversations (authenticated)
        -   POST `/api/mobile/me/conversations` - Create new conversation (authenticated)
        -   GET `/api/mobile/conversations/:id/messages` - Get conversation messages (authenticated)
        -   POST `/api/mobile/conversations/:id/messages` - Send message (authenticated)
        -   GET `/api/mobile/encounters/:id/attachments` - Get encounter attachments (authenticated)
        -   GET `/api/mobile/files/:fileId` - Download medical file (authenticated, ownership validated)
-   **Development Notes**:
    -   Entry point: `node_modules/expo/AppEntry.js` (configured in package.json)
    -   TypeScript errors in mobile-app are expected (Expo/React Native type mismatches)
    -   Run with: `cd mobile-app && npx expo start`

# External Dependencies

## Core Framework
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

## Mobile Push Notifications & SMS
-   `expo-server-sdk`: Expo push notification service for mobile app health reminders.

## SMS Service Integration
-   **Provider**: SMS.RU API for sending SMS verification codes
-   **Authentication**: API key-based authentication (SMSRU_API_KEY)
-   **Features**:
    -   6-digit verification codes with 10-minute expiration
    -   Bcrypt hashing for secure code storage
    -   Separate handling for staff users (2FA, phone verification) and mobile clients (mobile_login)
    -   Database schema supports both userId and ownerId with exclusive constraint
-   **Security**: Rate limiting (5 requests per 15 minutes), phone enumeration protection
-   **Service File**: `server/services/smsService.ts`
-   **Admin UI Integration** (NEW):
    -   SMS.RU configuration card in Settings → Integrations section
    -   "Настройки SMS" button in Settings page scrolls to integrations section
    -   Test connection functionality validates API key via account balance check
    -   Tenant-scoped credentials storage via integration_credentials table
    -   API endpoints: POST `/api/integration-credentials/smsru/test`, PUT `/api/integration-credentials/smsru`
    -   Integration module: `server/integrations/smsRu.ts` with testConnection() and sendSms()

# Production Deployment

## Deployment Architecture
-   **Target Server**: vetsystemai.ru (Ubuntu 22.04 LTS recommended)
-   **Process Manager**: PM2 in cluster mode with auto-restart
-   **Web Server**: Nginx reverse proxy with SSL/HTTPS
-   **SSL Certificates**: Let's Encrypt via Certbot with auto-renewal
-   **Database**: Self-hosted PostgreSQL 14+ (migrating from Neon)
-   **Build Process**: Vite production build (requires devDependencies)
-   **Runtime**: tsx loader for TypeScript (PM2 ecosystem.config.js)

## Critical Deployment Notes
-   **IMPORTANT**: Must use `npm install` (NOT `npm install --production`) to preserve devDependencies
-   **Reason**: Vite and tsx are devDependencies required for build and runtime
-   **Build Step**: `npm run build` compiles frontend before deployment
-   **Migration**: Use scripts/migrate-production.sh for safe DB migrations with automatic backups
-   **Zero Downtime**: deploy.sh script handles pull → install → build → migrate → restart

## Deployment Documentation
-   **DEPLOYMENT.md**: Comprehensive production deployment guide (server setup, Nginx, SSL, PM2, monitoring)
-   **QUICKSTART.md**: 30-minute quick setup guide for experienced admins
-   **.env.production.example**: Complete environment variables template
-   **deploy.sh**: Automated deployment script with zero-downtime updates
-   **scripts/migrate-production.sh**: Safe database migration script with backups
-   **ecosystem.config.js**: PM2 cluster configuration (4 instances, auto-restart)

## Required Environment Variables
See `.env.production.example` for complete list with descriptions. Critical variables:
-   NODE_ENV=production
-   DATABASE_URL (PostgreSQL connection string)
-   JWT_SECRET, SESSION_SECRET (64-character random strings)
-   External APIs: TWILIO_*, YOOKASSA_*, MOYSKLAD_*, DADATA_API_KEY, OPENAI_API_KEY
-   Optional: VETAIS_DB_* (for legacy data migration)