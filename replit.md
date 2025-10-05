# Overview

VetSystem is a **Multi-Tenant SaaS platform** designed as a comprehensive veterinary clinic management system. It aims to streamline operations across client/patient registry, appointment scheduling, electronic medical records, inventory, and financial management. Built as a full-stack web application with a React frontend and Express backend, it serves healthcare professionals needing an efficient, reliable system for managing veterinary practice operations.

The platform features a multi-tenant architecture where each veterinary clinic operates as an independent tenant with complete data isolation, accessible via subdomains. It includes a superadmin portal for platform-wide management and supports tenant-specific subscriptions and billing. The system covers the entire veterinary clinic workflow, emphasizing healthcare-focused design patterns.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript (Vite).
- **UI Components**: Shadcn/ui built on Radix UI primitives.
- **Styling**: Tailwind CSS with a custom healthcare-focused color palette.
- **State Management**: TanStack Query for server state and caching.
- **Routing**: Wouter for lightweight client-side routing.
- **Forms**: React Hook Form with Zod for type-safe validation.

## Backend Architecture
- **Runtime**: Node.js with Express.
- **Language**: TypeScript with ES modules.
- **API Design**: RESTful API with structured error handling and Zod validation.
- **Database ORM**: Drizzle ORM for type-safe database operations.
- **File Storage**: Tenant/branch-scoped file system storage for medical records and patient files, with Multer for uploads.

## Database Design
- **Database**: PostgreSQL with Neon serverless hosting.
- **Schema Management**: Drizzle Kit for migrations.
- **Data Models**: Comprehensive veterinary domain models including Owners, Patients (with multi-owner support), Doctors, Appointments, Medical Records, Clinical Cases (tracking long-term cases, encounters, and lab analyses), Services, Products, and Invoicing.
- **Indexing**: Strategic indexes for query performance.

## Authentication & Security
- **Multi-Tenant Authentication**: JWT-based authentication with `tenant_id` embedding and validation.
- **Tenant Isolation Layers**: TenantResolver middleware, Auth middleware, and PostgreSQL Row-Level Security (RLS) enforce data isolation. Superadmin bypasses RLS for platform management.
- **Storage Layer**: Tenant-scoped storage methods use `withTenantContext` for request-scoped database instances.
- **Session Management**: Express sessions with PostgreSQL store.
- **User Management**: Role-based access control (RBAC).
- **Data Validation**: Input sanitization and validation with Zod.

## Superadmin Portal (admin.vetsystem.ru)
- Provides CRUD operations for managing clinic tenants.
- Superadmin routes bypass tenant isolation for cross-tenant access.
- Uses dedicated UI components and API endpoints protected by `authenticateToken` + `requireSuperAdmin` middleware.

## Tenant-Specific Integrations
- Each tenant manages independent API credentials for external services (e.g., МойСклад, YooKassa).
- Credentials stored in `integration_credentials` table with JSONB, secured by RLS.
- Integration functions accept credentials as parameters; sensitive fields are masked in API responses.
- UI allows managing, validating, and testing integration connections.

## Data Migration
- Successfully migrated over 60,000 client records from a legacy Vetais PostgreSQL database, including branch distribution.
- Utilizes batch processing scripts for efficient migration and branch assignment.
- Handles NULL branch IDs in storage methods for visibility until assignment.

## Design System
- **Color Palette**: Medical-focused scheme with primary blue, success green, warning orange, and error red.
- **Typography**: Inter font for readability, JetBrains Mono for technical data.
- **Layout**: Sidebar navigation.
- **Responsiveness**: Mobile-first responsive design.
- **Dark Mode**: Built-in dark/light mode support.

# External Dependencies

## Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless driver.
- **drizzle-orm**: Type-safe ORM.
- **connect-pg-simple**: PostgreSQL session store.

## UI/UX Libraries
- **@radix-ui/**: Accessible UI primitives.
- **@tanstack/react-query**: Server state management.
- **class-variance-authority**: Component variant utility.
- **cmdk**: Command palette.
- **embla-carousel-react**: Carousel component.
- **date-fns**: Date manipulation.

## Development Tools
- **tsx**: TypeScript execution.
- **esbuild**: Fast bundler.
- **@replit/vite-plugin-runtime-error-modal**: Error overlay.
- **@replit/vite-plugin-cartographer**: Debugging tools.

## Validation & Forms
- **zod**: Schema validation.
- **@hookform/resolvers**: React Hook Form integration.
- **drizzle-zod**: Drizzle ORM and Zod integration.

## Database & Session Storage
- **ws**: WebSocket client for Neon.
- PostgreSQL backend for session storage.