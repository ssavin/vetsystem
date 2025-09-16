# Overview

VetSystem is a comprehensive veterinary clinic management system designed to streamline operations across multiple domains including client/patient registry, appointment scheduling, electronic medical records, inventory management, and financial operations. The system is built as a full-stack web application with a React frontend and Express backend, targeting healthcare professionals who need an efficient, reliable system for managing veterinary practice operations.

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
- **Session Management**: Express sessions with PostgreSQL session store
- **User Management**: Basic user authentication system for clinic staff
- **Data Validation**: Input sanitization and validation at API layer

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