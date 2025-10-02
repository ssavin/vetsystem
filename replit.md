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
  - Patients (animals) with medical information and relationship to owners
  - Doctors with specializations and contact details
  - Appointments with scheduling and status management
  - Medical records with treatment history and file attachments
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