# Overview

VetSystem is a **Multi-Tenant SaaS platform** - a comprehensive veterinary clinic management system designed to streamline operations across multiple domains including client/patient registry, appointment scheduling, electronic medical records, inventory management, and financial operations. The system is built as a full-stack web application with a React frontend and Express backend, targeting healthcare professionals who need an efficient, reliable system for managing veterinary practice operations.

**Multi-Tenant Architecture**: Each veterinary clinic operates as an independent tenant with complete data isolation. Each tenant can have multiple branches (locations), with all data scoped by tenant_id for security and scalability. The system supports:
- Independent clinic instances accessible via subdomains (e.g., clinic1.vetsystem.ru, clinic2.vetsystem.ru)
- Superadmin portal (admin.vetsystem.ru) for platform-wide management
- Tenant-specific subscriptions, billing, and quotas
- Complete data isolation between clinics using Row-Level Security (RLS)

The application supports the complete veterinary clinic workflow from initial client registration through appointment scheduling, medical record keeping, inventory tracking, and financial management. It emphasizes healthcare-focused design patterns inspired by enterprise medical applications like Epic MyChart.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite for development and building
- **UI Components**: Shadcn/ui component library with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom healthcare-focused color palette and design tokens
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

## Backend Architecture
- **Runtime**: Node.js with Express framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with structured error handling and request validation
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Performance**: Built-in query performance monitoring and logging
- **Data Validation**: Zod schemas for request/response validation
- **File Storage**: Tenant/branch-scoped file system storage at `uploads/{tenantId}/{branchId}/`
  - Medical records and patient files isolated per tenant and branch
  - Automatic directory creation on upload
  - Multer configuration enforces authentication and tenant context
  - Superadmin files stored in `uploads/system/{branchId}/`

## Database Design
- **Database**: PostgreSQL with Neon serverless hosting
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Data Models**: Comprehensive veterinary domain models including:
  - Owners (clients) with contact information and address
  - Patients (animals) with medical information and multi-owner support
  - **Multi-Owner Patient System (October 2025)**: Many-to-many patient-owner relationships
    - patient_owners junction table with uniqueIndex on (patient_id, owner_id)
    - Primary owner designation via is_primary boolean flag
    - Covering index on (patient_id, is_primary, created_at) for query performance
    - Storage methods: getPatientOwners, addPatientOwner, removePatientOwner, setPrimaryOwner
    - Transaction-safe operations: setPrimaryOwner and removePatientOwner run in single transactions
    - Automatic primary owner promotion when removing current primary
    - Data integrity: addPatientOwner forces isPrimary=false, requires explicit promotion
    - Migration script: scripts/migrate-patient-owners.ts for legacy data transfer
    - Backwards compatible: patients.owner_id maintained for legacy support, COALESCE fallback in queries
    - API returns owners[] array with deterministic ordering (primary first, then by creation date)
  - Doctors with specializations and contact details
  - Appointments with scheduling and status management
  - Medical records with treatment history and file attachments
  - **Clinical Cases Module (October 2025)**: Comprehensive patient care tracking system
    - Clinical Cases: Long-term medical cases tracking (open/closed/resolved status)
    - Clinical Encounters: Individual doctor visits within a case (in_progress/completed status)
    - Lab Analyses: Laboratory test orders and results (ordered/in_progress/completed/cancelled status)
    - Attachments: File attachments for analyses (lab results, images, documents)
  - Services and products for inventory management
  - Invoicing system with line items and payment tracking
- **Indexing**: Strategic database indexes on frequently queried fields (names, phones, dates)
- **Performance**: Query optimization with performance monitoring

## Authentication & Security
- **Multi-Tenant Authentication**: JWT-based authentication with tenant_id embedded in tokens
  - Login validates user belongs to current tenant (subdomain)
  - Token refresh enforces tenant isolation (prevents cross-tenant token reuse)
  - Branch switching validates branch belongs to user's tenant
  - Superadmin portal (admin.vetsystem.ru) bypasses tenant checks for platform management
- **Tenant Isolation Layers**:
  - TenantResolver middleware: Determines tenant from subdomain/custom domain, sets isSuperAdmin flag for admin.vetsystem.ru
  - Auth middleware: Validates JWT tenant_id matches request tenant_id, enforces requireSuperAdmin for admin routes
  - Database RLS: Row-Level Security policies enforce tenant isolation at PostgreSQL level
  - RLS Bypass: Superadmin requests skip tenant_id context (app.tenant_id not set), enabling cross-tenant queries
  - **Storage Layer (October 2025)**: All 94+ tenant-scoped storage methods refactored to use withTenantContext pattern
    - Request-scoped database instances via AsyncLocalStorage for optimal performance
    - Every tenant-facing query wrapped in withTenantContext(undefined, async (dbInstance) => {})
    - Authentication methods (getUserByUsername, verifyPassword) intentionally excluded (pre-tenant determination)
    - Superadmin tenant management methods bypass tenant context by design
    - Performance logging maintained across all methods
- **Session Management**: Express sessions with PostgreSQL session store
- **User Management**: Role-based access control (RBAC) for clinic staff per tenant
- **Data Validation**: Input sanitization and validation at API layer with Zod schemas

## Superadmin Portal (admin.vetsystem.ru)
- **Tenant Management**: Full CRUD operations for managing clinic tenants
  - Create new tenants with unique slug and optional custom domain
  - Update tenant details, status (active/suspended/trial/cancelled)
  - Soft delete with dependency checks (prevents deletion if branches exist)
  - Slug uniqueness validation and 409 conflict handling
- **RLS Bypass**: Superadmin routes automatically bypass tenant isolation by not setting app.tenant_id
- **UI**: SuperAdminPanel with dedicated "Клиники" tab, CreateTenantDialog and EditTenantDialog
- **API Routes**: /api/admin/tenants endpoints protected by authenticateToken + requireSuperAdmin middleware
- **Security**: Superadmin role verified in JWT, tenant context skipped for cross-tenant access

## Tenant-Specific Integrations (October 2025)
- **Integration Credentials Management**: Each tenant has independent API credentials for external services
  - МойСклад (MoySklad) integration: apiToken, login, password, retailStoreId per tenant
  - YooKassa payment gateway: shopId, secretKey per tenant
  - Stored in `integration_credentials` table with JSONB credentials column (requires encryption in production)
  - Complete RLS policies ensure tenant data isolation
- **Security Pattern**: 
  - All integration functions accept credentials as first parameter instead of global env variables
  - Recursive credential masking in API responses prevents secret leakage
  - Secret fields (password, apiToken, secretKey) never returned to frontend
  - Non-sensitive fields (retailStoreId, shopId) allowlisted for display
- **UI Management**: IntegrationsSettings component in Settings page
  - Card-based UI for each integration with status badges
  - Form validation with Zod schemas
  - Password/secret visibility toggles for secure input
  - Test connection functionality for МойСклад
  - Toast notifications for success/error feedback
- **API Routes**: 
  - GET/PUT `/api/integration-credentials/{integration_type}` for CRUD operations
  - POST `/api/integration-credentials/moysklad/test` for connection testing
  - All routes use req.tenantId from tenant-resolver middleware

## Data Migration (October 2025)
- **Vetais Migration**: Successfully migrated 60,142+ client records from legacy Vetais PostgreSQL database with branch distribution
  - Source: Vetais Java/PostgreSQL system (file_clients table, 67,235 active records)
  - Field Mapping: nazev_kado→name, telefon/mobil→phone, email (cleaned), mesto_k+adresar→address
  - Branch Mapping: Automatic branch creation and assignment based on clinic_id/created_clinic_id
    - 3 branches created: Бутово (20,755 clients), Новопеределкино (11,509), Лобачевского (6,980)
    - 22,677 clients without branch assignment (no clinic_id in Vetais)
  - Data Quality: 52% with email, 85% with address, 100% with unique phone numbers
  - Filter: Only active clients (vymaz=0) migrated, duplicates and invalid records skipped
  - Scripts: 
    - `scripts/explore-vetais-db.ts`: Database exploration and structure analysis
    - `scripts/migrate-vetais-batch.ts`: Optimized batch client migration (1000 records/batch)
    - `scripts/update-branches-batch.ts`: Batch branch assignment (500 records/batch)
  - Security: Vetais credentials stored in Replit Secrets (VETAIS_DB_HOST, VETAIS_DB_PORT, VETAIS_DB_NAME, VETAIS_DB_USER, VETAIS_DB_PASSWORD)
  - Performance: Batch operations with pre-loaded duplicate detection for optimal speed
  - **NULL Branch Handling**: Storage methods (getOwners, getPatients, searchOwners, searchPatients) include records with NULL branch_id in all branches for visibility until branch assignment

## Design System
- **Color Palette**: Medical-focused color scheme with primary blue (#2563eb), success green, warning orange, and error red
- **Typography**: Inter font for readability with JetBrains Mono for technical data
- **Layout**: Sidebar navigation with module-based organization
- **Responsiveness**: Mobile-first responsive design with consistent spacing units
- **Dark Mode**: Built-in dark/light mode support with system preference detection

# External Dependencies

## Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless database driver for cloud deployment
- **drizzle-orm**: Type-safe ORM for database operations and query building
- **connect-pg-simple**: PostgreSQL session store for Express sessions

## UI/UX Libraries
- **@radix-ui/**: Complete suite of accessible UI primitives (dialog, dropdown, etc.)
- **@tanstack/react-query**: Server state management with caching and synchronization
- **class-variance-authority**: Utility for creating type-safe component variants
- **cmdk**: Command palette component for search and navigation
- **embla-carousel-react**: Carousel component for image galleries
- **date-fns**: Date manipulation and formatting library

## Development Tools
- **tsx**: TypeScript execution environment for development
- **esbuild**: Fast bundler for production builds
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Development debugging tools

## Validation & Forms
- **zod**: Schema validation library for type-safe data validation
- **@hookform/resolvers**: React Hook Form integration with Zod validation
- **drizzle-zod**: Integration between Drizzle ORM and Zod schemas

## Database & Session Storage
- **ws**: WebSocket client for Neon database connections
- Session storage configured with PostgreSQL backend for scalable user sessions

The architecture prioritizes type safety, performance, and healthcare-specific workflows while maintaining scalability for growing veterinary practices.