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
- **Search & Autocomplete**: Real-time owner/patient search with dropdown autocomplete in medical record forms (`/api/owners/search-with-patients` endpoint).

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
- **RF Legal Compliance Fields**: Extended schema with fields required for Russian Federation document flow:
  - **Owners table**: Personal data (date of birth, gender), passport data (series, number, issued by, issue date), registration/residence addresses, personal data consent (ФЗ-152 compliance).
  - **Patients table**: Tattoo number (клеймо) for animal identification alongside microchip.
  - **Tenants table**: OGRN/OGRNIP (13/15 digits), veterinary license number and issue date, logo URL for document branding, Galen integration credentials (encrypted).

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

## Document Generation & Printing
- **Document Templates System**: Multi-tenant template management with system-wide fallback.
  - Database schema: `document_templates` table with tenant isolation via RLS.
  - Template types: 
    - Medical: invoice, encounter_summary, prescription, vaccination_certificate, lab_results_report
    - Consent: informed_consent_surgery, informed_consent_anesthesia, informed_consent_general
    - Agreements: service_agreement (vet services contract), hospitalization_agreement (inpatient care contract)
    - Legal: personal_data_consent (ФЗ-152 compliance)
  - Handlebars template engine for flexible HTML rendering.
  - Puppeteer for high-quality PDF generation with A4 formatting.
- **Template Context Data**: Owner data retrieval pattern for templates requiring full personal/passport data:
  - First uses `getPatientOwners()` to identify primary owner link
  - Then fetches complete owner record via `storage.getOwner(ownerId)` to access passport/address fields
  - Templates with full owner data: personal_data_consent, service_agreement, hospitalization_agreement, informed_consent_general
  - **Contract Number Generation**: Automatic contract number generation in format `ДОГ-YYYYMMDD-XXXX` (timestamp-based, unique per request)
  - Available variables include: 
    - owner: name, phone, email, passportSeries, passportNumber, passportIssuedBy, passportIssueDate, registrationAddress, residenceAddress
    - patient: name, species, breed, age, sex, color, identificationNumber, tattooNumber
    - clinic: all legal entity requisites
    - contractNumber: auto-generated for service_agreement and hospitalization_agreement templates
    - date: historical date (invoice date, record date) or current date depending on context
    - currentDate: always current date
    - docCreateDate: always current date (document creation/generation date)
- **Security & Isolation**: Tenant and branch ownership validation before document generation.
  - DocumentService verifies entity ownership before accessing data.
  - API endpoint enforces branchId requirement and tenant context.
  - Branch-level access control: owners with NULL branchId accessible to all branches, otherwise branchId must match.
  - All storage queries use `withTenantContext` ensuring RLS enforcement for tenant isolation.
- **Integration Points**:
  - `PrintDocumentButton` React component with dropdown for template selection.
  - Integrated into MedicalRecordCard for medical documents and Registry for owner documents.
  - API endpoint: POST /api/documents/generate with Zod validation.
- **System Templates**: Pre-configured templates seeded via `server/seed-document-templates.ts`:
  - Invoice, Encounter Summary, Prescription, Vaccination Certificate
  - Personal Data Consent (ФЗ-152 compliance) - includes passport data, addresses, consent terms
  - Service Agreement, Hospitalization Agreement, Informed Consent (General) - all with full owner personal data
  - Tenants can override with custom templates or use system defaults.

## Data Migration
- **Client Migration**: ✅ **COMPLETE** - Successfully migrated 61,993 client records from legacy Vetais PostgreSQL database.
  - Migrated full client names (surname + first name + patronymic) from Vetais fields.
  - Personal data fields imported from Vetais:
    - Gender (gender_id): 3,036 clients (5%) have gender data
    - Note: Vetais date_birth and no_pass fields contain technical/placeholder values, not actual personal data
  - All clients assigned to Бутово branch initially (can be redistributed manually).
  - Vetais clinic ID mapping: 10000=Бутово, 10001=Лобачевского, 10002=Новопеределкino.
- **User Migration**: ✅ **COMPLETE** - Successfully migrated 164 users total (57 active + 107 missing doctors).
  - **Initial migration**: 57 active users from Vetais system_users (aktivni=1 filter).
  - **Doctor completion**: Added 107 missing doctors (including inactive) based on medical_exams linkage analysis.
    - medical_exams.id_doctor → system_users.kod_uzivatele (not id_pracovnika).
    - 160 unique doctors in Vetais medical_exams; 164 users with vetais_id (some non-doctors have records).
  - User schema enhanced with `department` (отделение) and `vetais_id` (integer) fields for migration tracking.
  - Role mapping: Vetais funkce codes + is_doctor flag → system roles (врач, администратор, менеджер, руководитель).
  - Branch distribution: Based on id_kliniky (10000→Бутово, 10001→Лобачевского, 10002→Новопеределкино).
  - Default password: Alisa2024! (users must change on first login).
- **Patient Migration**: ✅ **COMPLETE** - Successfully migrated 82,371 patients (92% of Vetais 89,611 total).
  - 7,240 patients excluded (8%) due to missing owners in Vetais (id_majitele IS NULL).
  - Patient-owner relationships: 82,366 links created (99.9% coverage).
  - Species mapping: dog, cat, horse, bird, rodent, rabbit, reptile, exotic.
  - Microchip numbers, breed names, birth dates, gender preserved from Vetais.
  - Script: `migrate-patients-fast.ts` (optimized batch processing with 1000 batch size).
- **Medical Records Migration**: ✅ **COMPLETE** - Successfully migrated 364,151 medical records (95% of Vetais 383,503 total).
  - 65,307 patients (79%) have complete medical history.
  - 19,353 records excluded (5%) - linked to patients without owners in Vetais.
  - **Doctor Linking**: ✅ **COMPLETE** - 308,406 records (85%) successfully linked to doctors.
    - Initial state: all doctorId fields NULL (doctors in `users` table, not unused `doctors` table).
    - Fixed schema: medical_records.doctorId → users.id foreign key.
    - vetais_id type mismatch resolved: users.vetais_id (integer) converted to string in scripts.
    - Remaining 55,745 records (15%) have id_doctor=0 or NULL in Vetais - legitimately without doctors.
  - Extended schema with `vetais_id` (text) tracking field in medical_records for idempotency.
  - Scripts: `migrate-medical-records.ts`, `migrate-missing-doctors.ts`, `link-doctors-sql.ts` (batched CASE WHEN updates).
- **Known Limitations**:
  - ⏭️ **Medications migration skipped** - Vetais lacks structured medication data (only HTML text in plan_header.doc_data, no dosage/frequency fields).
  - ⏭️ **Medical files migration skipped** - Files stored on Seafile server (28,445 files in medical_media_data), requires separate Seafile API integration.
  - ⚠️ **Migrated doctor accounts use default password (Alisa2024!)** - schedule forced password reset before production.
- **Migration Infrastructure**: Batch processing scripts with idempotency, error handling, progress logging, duplicate prevention.
  - Scripts: `migrate-vetais-batch.ts`, `migrate-patients-fast.ts`, `migrate-medical-records.ts`, `fix-client-branches-fast.ts`, `migrate-users-vetais.ts`.

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

## Document Generation
- **handlebars**: Template engine for HTML document generation.
- **puppeteer**: Headless browser for PDF generation.
- **@types/handlebars**: TypeScript definitions for Handlebars.

## Database & Session Storage
- **ws**: WebSocket client for Neon.
- PostgreSQL backend for session storage.