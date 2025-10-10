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