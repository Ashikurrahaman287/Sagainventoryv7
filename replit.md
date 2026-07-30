# Saga Inventory - Inventory Management System

## Overview

Saga Inventory is a comprehensive inventory management system designed for retail and business operations. The application provides complete product tracking, sales management, customer relationship management, and business analytics. Built as a full-stack web application, it enables businesses to manage their inventory, process sales transactions, generate receipts, track customers and suppliers, and analyze business performance through detailed reports.

## Quick Start (Replit)

1. **Database** — provisioned automatically via the `javascript_database` integration (PostgreSQL). `DATABASE_URL` is set in the environment.
2. **Install dependencies** — `npm install`
3. **Apply schema** — `npm run db:push` (safe to re-run; idempotent)
4. **Run** — `npm run dev` (or use the Run button / "Start application" workflow)
5. **Login** — default password: `ASHIK123456789@00` (set `APP_PASSWORD` env var to change it)

The post-merge setup script (`scripts/post-merge.sh`) handles steps 2–3 automatically after any code merge.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server, configured with custom plugins for Replit integration
- **Wouter** for client-side routing (lightweight alternative to React Router)
- **TanStack Query v5** for server state management, data fetching, and caching

**UI Design System**
- **Shadcn/ui** component library following Material Design 3 principles with "new-york" style variant
- **Tailwind CSS** for utility-first styling with extensive custom theme configuration
- **Radix UI** primitives for accessible, unstyled component foundations
- **Dark mode primary** with light mode support via theme provider
- Custom design tokens defined in CSS variables (HSL color space)
- Typography: Inter for UI text, JetBrains Mono for data/codes

**State & Form Management**
- React Hook Form with Zod validation resolvers for form handling
- Local component state for UI interactions (modals, search, filters)
- Query invalidation patterns for optimistic updates

**Code Organization**
- Component-based architecture with clear separation:
  - `/client/src/pages/*` - Route-level page components
  - `/client/src/components/*` - Reusable UI components
  - `/client/src/components/ui/*` - Shadcn base components
  - `/client/src/lib/*` - Utility functions and shared logic
  - `/client/src/hooks/*` - Custom React hooks

### Backend Architecture

**Runtime & Framework**
- **Node.js** with ES modules
- **Express.js** REST API server
- **TypeScript** for type safety across the stack

**API Design**
- RESTful endpoints following resource-based URL patterns
- Standard HTTP methods (GET, POST, PATCH, DELETE)
- JSON request/response format
- Centralized error handling middleware
- Request logging with timing metrics

**Business Logic Layer**
- Storage abstraction layer (`server/storage.ts`) defining interface contracts
- Separation of route handlers (`server/routes.ts`) from data access
- Transaction support for multi-step operations (sales with inventory updates)
- Validation using Zod schemas shared between client and server

### Data Storage Solutions

**Database**
- **PostgreSQL** via Neon serverless driver with WebSocket support
- **Drizzle ORM** for type-safe database queries and schema management
- Schema-first approach with TypeScript types generated from database schema

**Schema Design** (`shared/schema.ts`)
- **suppliers** - Supplier contact information
- **customers** - Customer records with contact details
- **sellers** - Employee/seller information
- **products** - Product catalog with pricing, stock levels, categories, and supplier relationships
- **sales** - Sales transaction headers with customer, seller, payment, and totals
- **saleItems** - Line items for each sale linking products and quantities

**Key Relationships**
- Products reference suppliers (many-to-one)
- Sales reference customers and sellers (many-to-one)
- Sale items reference sales and products (many-to-one)

**Data Integrity**
- UUID primary keys using `gen_random_uuid()`
- Foreign key constraints for referential integrity
- Unique constraints on business identifiers (stock codes, receipt numbers)
- Timestamp tracking with `created_at` fields

### Authentication and Authorization

**Current State**: No authentication system implemented. The application assumes a trusted single-user or internal network environment.

**Future Considerations**: Session-based authentication with `connect-pg-simple` package already included for PostgreSQL session storage.

### External Dependencies

**Database Services**
- **Neon Database** - Serverless PostgreSQL with WebSocket connection pooling
- Connection managed via `DATABASE_URL` environment variable
- Migration management through Drizzle Kit

**Google Fonts**
- Inter font family (weights: 300, 400, 500, 600, 700)
- JetBrains Mono (weights: 400, 500, 600)
- Loaded via Google Fonts CDN with preconnect optimization

**Build & Development Tools**
- **Replit-specific plugins** for development environment integration:
  - `@replit/vite-plugin-runtime-error-modal` - Error overlay in development
  - `@replit/vite-plugin-cartographer` - Code navigation tools
  - `@replit/vite-plugin-dev-banner` - Development environment banner

**Third-Party UI Libraries**
- **Radix UI** - 20+ component primitives for accessibility
- **Lucide React** - Icon library
- **date-fns** - Date formatting and manipulation
- **cmdk** - Command palette component
- **embla-carousel-react** - Carousel functionality
- **vaul** - Drawer component

**Development Dependencies**
- **tsx** - TypeScript execution for development server
- **esbuild** - Production build bundler for server code
- **drizzle-kit** - Database migration and introspection tool