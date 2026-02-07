# CMS Project

A full-featured Content Management System built as a master's-level project. The application enables users to create, manage, modify, and publish digital content through an intuitive interface with role-based access control.

## Tech Stack

- **Backend:** NestJS (TypeScript)
- **Frontend:** React + Vite (TypeScript)
- **Database:** PostgreSQL with Prisma ORM
- **Caching:** Redis (with in-memory fallback)
- **Editor:** TipTap WYSIWYG
- **Containerization:** Docker
- **CI/CD:** GitHub Actions

## Features

- Content CRUD with rich text editing (TipTap)
- Content versioning and rollback
- Content scheduling and automation
- Role-based access control (Admin, Editor, Author, Subscriber)
- Media library with image optimization
- Category and tag taxonomy
- Comment system with moderation
- SEO management and analysis
- Full-text search with PostgreSQL
- Analytics dashboard
- Redis caching with automatic invalidation
- Rate limiting and security hardening

## Project Structure

```
gmc-cms-project/
├── backend/          # NestJS API server
├── frontend/         # React + Vite client
├── docker-compose.yml
├── .github/workflows/
└── package.json      # Workspace root
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Docker and Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

### Development Setup

1. Clone the repository and install dependencies:
   ```bash
   git clone <repo-url>
   cd gmc-cms-project
   npm install
   ```

2. Start infrastructure services:
   ```bash
   docker-compose up -d postgres redis
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Run database migrations and seed:
   ```bash
   npm run db:migrate:dev
   npm run db:seed
   ```

5. Start development servers:
   ```bash
   npm run dev
   ```

- Backend API: http://localhost:3000
- Frontend: http://localhost:5173
- Swagger Docs: http://localhost:3000/api/docs

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both backend and frontend in dev mode |
| `npm run build` | Build both workspaces |
| `npm run test` | Run tests in both workspaces |
| `npm run lint` | Lint both workspaces |
| `npm run format` | Format code in both workspaces |
| `npm run db:migrate:dev` | Run Prisma migrations (dev) |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio |

## License

ISC
