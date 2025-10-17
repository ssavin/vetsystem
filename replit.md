# Overview
VetSystem is a **Multi-Tenant SaaS platform** designed as a comprehensive veterinary clinic management system. It aims to streamline operations across client/patient registry, appointment scheduling, electronic medical records, inventory, and financial management. Built as a full-stack web application, it serves healthcare professionals needing an efficient, reliable system for managing veterinary practice operations. The platform features a multi-tenant architecture with data isolation per clinic, accessible via subdomains, and includes a superadmin portal for platform-wide management.

# User Preferences
Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
-   **Framework**: React 18 with TypeScript (Vite).
-   **UI Components**: Shadcn/ui built on Radix UI, styled with Tailwind CSS (healthcare-focused palette).
-   **State Management**: TanStack Query for server state.
-   **Routing**: Wouter.
-   **Forms**: React Hook Form with Zod validation.

## Backend
-   **Runtime**: Node.js with Express (TypeScript, ES modules).
-   **API Design**: RESTful API with structured error handling and Zod validation.
-   **Database ORM**: Drizzle ORM.
-   **File Storage**: Tenant/branch-scoped file system storage for medical records.

## Database
-   **Database**: PostgreSQL.
-   **Schema Management**: Drizzle Kit for migrations.
-   **Data Models**: Comprehensive veterinary domain models (Owners, Patients, Doctors, Appointments, Medical Records, Clinical Cases, Services, Products, Invoicing), with extended fields for Russian Federation legal compliance.

## Authentication & Security
-   **Multi-Tenant Authentication**: JWT-based with `tenant_id` embedding.
-   **Tenant Isolation**: TenantResolver middleware, Auth middleware, and PostgreSQL Row-Level Security (RLS).
-   **Session Management**: Express sessions with PostgreSQL store.
-   **User Management**: Role-based access control (RBAC).

## Superadmin Portal
-   Manages clinic tenants with CRUD operations, bypassing tenant isolation for platform management.

## Document Generation & Printing
-   Multi-tenant template management (Handlebars for rendering, Puppeteer for PDF generation) for medical, consent, agreement, and legal documents. Templates access owner, patient, clinic data, with tenant/branch ownership validation and RLS enforcement.

## Electronic Queue System
-   Manages queue entries and calls with branch/tenant isolation via RLS. Features atomic queue numbering with daily auto-reset and scheduled cleanup.

## Hospital/Inpatient Module (Стационар)
-   **Cage Management**: Track and manage hospital cages with real-time availability status (available/occupied/maintenance).
-   **Patient Admission**: Automated workflow for admitting patients - creates draft invoice, occupies cage, and initializes hospital stay record.
-   **Treatment Logging**: 
    - Record all procedures and treatments with automatic invoice item creation
    - Delete procedures from treatment log with automatic invoice recalculation
    - Display owner information (name, phone) and treatment count for active patients
-   **Automatic Billing**: 
    - Procedures are automatically added to patient invoice upon logging
    - Daily cron job (00:00 UTC) adds "Daily Stay" service charge for all active inpatients
    - Service ID for daily charge configured via system setting: `HOSPITAL_DAILY_SERVICE_ID_{tenantId}_{branchId}`
    - Invoice recalculation on procedure deletion maintains data integrity
-   **Security**: Branch-level isolation enforced - users can only access cages and patients within their branch.
-   **Invoice Management**: 
    - Hospital stays use draft invoices that remain open until patient discharge, then finalized at reception
    - Draft invoices visible in Finance section with "Черновик" badge
    - Invoice visibility ensures branch isolation via hospital_stays JOIN for multi-branch support

## Design System
-   Medical-focused color palette, Inter font, sidebar navigation, mobile-first responsive design, dark/light mode support.

## Settings Page UI
-   Tab-based organization for General Settings, Branch Management, Staff Management, Legal Entities (placeholder), and Document Templates.

## Mobile Application
-   **Framework**: React Native with Expo.
-   **UI Library**: React Native Paper (Material Design 3).
-   **Authentication**: SMS-based (SMS.RU API) with JWT tokens, token persistence, and automatic injection.
-   **Security**: Tenant isolation via `mobileTenantMiddleware` and RLS.
-   **Features**: SMS authentication, owner profiles, pet details, medical history, appointment booking, push notifications, real-time chat, medical file access, proactive health notifications.

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

## Mobile Push Notifications
-   `expo-server-sdk`: Expo push notification service.

## SMS Service Integration
-   **Provider**: SMS.RU API for SMS verification codes and 2FA. Features API key-based authentication, rate limiting, and phone enumeration protection. Configuration via admin UI with tenant-scoped credentials.

## Other Integrations
-   **МойСклад**: One-way inventory sync (МойСклад → VetSystem) for products and services nomenclature, including fiscal receipt creation from VetSystem invoices.
-   **YooKassa**: Payment gateway (implied by environment variables).
-   **Dreamkas Start**: Fiscal receipt integration for local cash registers. Features nomenclature synchronization (products/services → Dreamkas), fiscal receipt creation from VetSystem invoices with automatic VAT calculation, and connection testing via device API. Configuration via admin UI with tenant-scoped API tokens and device IDs.
-   **DADATA**: Data enrichment service (implied by environment variables).
-   **OpenAI**: AI services (implied by environment variables).