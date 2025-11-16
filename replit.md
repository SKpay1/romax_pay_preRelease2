# CryptoPay Mini - Telegram Mini App

## Overview
CryptoPay Mini is a production-ready Telegram Mini App designed for secure and efficient cryptocurrency payment wallet management within Telegram's WebView. It enables users to manage USDT (TRC20) balances, view real-time exchange rates to Russian Rubles (RUB), create payment requests, and track transaction history. The application features a bold Neo-Brutalist design and a full-stack architecture utilizing PostgreSQL, Express.js, and React. Its primary purpose is to provide a seamless crypto transaction platform within Telegram.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React 18+ and TypeScript, using Vite for development. It utilizes `shadcn/ui` (New York variant) based on Radix UI, styled with Tailwind CSS, to achieve a Neo-Brutalist aesthetic. This design is characterized by thick borders, harsh drop shadows, vibrant colors, zero border-radius, high contrast typography (Inter font), and asymmetrical layouts. State management is handled with React Query for server state and local component state, avoiding a global state library. The application is a single-page application with component-based screen switching for core functionalities like Dashboard, TopUp, Pay, History, Support, and Settings. All text content is in Russian. It integrates with the Telegram WebApp SDK for features like authentication (`initData` validation), theme management, and viewport control, with a fallback demo mode for non-Telegram environments.

### Backend Architecture
The backend is an Express.js server developed with TypeScript. It integrates custom Vite middleware for development and production middleware for security and performance (e.g., Helmet, CORS, `express-rate-limit`). It also includes Telegram bot integration via `node-telegram-bot-api`. Data is stored in a PostgreSQL database using Drizzle ORM for type-safe queries. The API is RESTful, using JSON, and includes endpoints for user authentication, profile/balance management, payment request handling, notifications, real-time exchange rates, and a webhook for Telegram bot events.

### Data Storage Solutions
The PostgreSQL database schema includes `users`, `payment_requests`, `notifications`, `deposits`, and `operators` tables. Financial data, such as USDT balances and transaction amounts, uses high-precision numeric types (e.g., numeric 18,8) to prevent calculation errors.

### Admin Panel
The admin panel features password-based authentication (configured via `ADMIN_PASSWORD` environment variable). It allows operators to view and process pending payment requests, modify payment amounts (with automatic balance validation), add admin comments, view receipt attachments inline, approve TRC20 USDT deposits, and unified authentication across all admin endpoints.

### Authentication and Authorization
Authentication is secured via Telegram WebApp `initData` validation, identifying users by their Telegram ID. New users are automatically provisioned upon their first authentication. The application also supports a demo mode when accessed outside the Telegram environment.

## External Dependencies

### Core Dependencies
- `@tanstack/react-query`: Server state management and caching.
- `React Hook Form` with `Zod`: Form validation.
- `date-fns`: Date manipulation.

### UI Component Libraries
- `@radix-ui/*`: Accessible UI primitives.
- `lucide-react`: Icon system.
- `class-variance-authority`, `tailwind-merge`, `clsx`: Styling utilities.
- `cmdk`: Command menu component.
- `embla-carousel-react`: Carousel functionality.

### Database & ORM
- `Drizzle ORM`: Type-safe SQL query builder, specifically with `drizzle-orm/node-postgres` for Replit's PostgreSQL.
- `pg` (node-postgres): Standard PostgreSQL driver.
- `connect-pg-simple`: PostgreSQL session store for Express.

### Build & Development Tools
- `Vite`: Frontend build tool.
- `TypeScript`: Full-stack type safety.
- `ESBuild`: Server-side bundling.

### External Services & Integrations
- `Telegram WebApp SDK`: Integrated for Telegram-specific functionalities.
- `Telegram Bot API` via `node-telegram-bot-api`: For bot interactions and webhooks.
- `ExchangeRate-API` (`open.er-api.com`): Provides real-time USD/RUB exchange rates, updated every 30 minutes, with market adjustment and caching.

### Styling & Theming
- `Tailwind CSS` with `PostCSS`: For utility-first styling and theme configuration.
- `Google Fonts`: Inter font family.