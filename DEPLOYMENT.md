# Deployment Guide — Heroku

This project deploys as a single Heroku dyno. The NestJS backend serves both the API and the React frontend's built static files.

## Architecture

```
Browser → Heroku Dyno (NestJS)
            ├── /auth/*        → Auth controller
            ├── /content/*     → Content controller
            ├── /users/*       → Users controller
            ├── /api/docs      → Swagger UI
            ├── /uploads/*     → Static uploads
            └── /*             → React SPA (index.html fallback)
```

NestJS controller routes always take priority. Unmatched routes fall through to the static file server, which returns `index.html` for SPA client-side routing.

## Prerequisites

- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
- A Heroku account
- Cloudinary account (for media uploads)

## Initial Setup

### 1. Create the Heroku app

```bash
heroku create your-app-name
```

### 2. Add add-ons

```bash
heroku addons:create heroku-postgresql:essential-0
heroku addons:create heroku-redis:mini
```

`DATABASE_URL` and `REDIS_URL` are set automatically by the add-ons.

### 3. Set environment variables

```bash
heroku config:set \
  NODE_ENV=production \
  JWT_SECRET=$(openssl rand -base64 32) \
  FRONTEND_URL=same-origin \
  CLOUDINARY_CLOUD_NAME=your_cloud_name \
  CLOUDINARY_API_KEY=your_api_key \
  CLOUDINARY_API_SECRET=your_api_secret
```

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Must be `production` |
| `JWT_SECRET` | Secure random string for signing tokens |
| `FRONTEND_URL` | Set to `same-origin` — tells CORS to allow requests from the same origin |
| `CLOUDINARY_*` | Media upload credentials |
| `DATABASE_URL` | Auto-set by Heroku Postgres |
| `REDIS_URL` | Auto-set by Heroku Redis |
| `PORT` | Auto-set by Heroku |

### 4. Deploy

```bash
git push heroku main
```

## How the Build Works

Heroku runs the following sequence automatically:

1. **`npm install`** — Installs all workspace dependencies (backend + frontend)
2. **`heroku-postbuild`** — Runs automatically after install:
   - `npm run build` — Compiles backend (`backend/dist/`) then frontend (`frontend/dist/`)
   - `cp -r frontend/dist/. backend/client/` — Copies the built frontend into `backend/client/`
3. **`release`** (from Procfile) — Runs `prisma migrate deploy` to apply database migrations
4. **`web`** (from Procfile) — Starts the NestJS server via `npm start` → `node backend/dist/src/main.js`

## Key Files

| File | Purpose |
|------|---------|
| `Procfile` | Defines `web` (server start) and `release` (DB migrations) processes |
| `package.json` (root) | `start`, `build:heroku`, `heroku-postbuild` scripts; `engines` field |
| `backend/src/app.module.ts` | `ServeStaticModule` serves frontend from `backend/client/` |
| `backend/src/main.ts` | CORS configured to accept `same-origin` |
| `frontend/src/lib/axios.ts` | API calls use relative URLs (empty string base) in production |

## Local Production Simulation

The project includes a Docker Compose setup for Postgres and Redis. Make sure the containers are running first:

```bash
# Start Docker services (Postgres on port 5343, Redis on port 6379)
docker compose up -d postgres redis
```

Then build and run the production server against the local Docker services:

```bash
# Build everything
npm run build:heroku

# Run with local Docker env vars
NODE_ENV=production \
FRONTEND_URL=same-origin \
PORT=3000 \
DATABASE_URL=postgresql://cms_user:cms_password@localhost:5343/cms_db?schema=public \
REDIS_URL=redis://localhost:6379 \
JWT_SECRET=your-super-secret-jwt-key-change-in-production \
  node backend/dist/src/main.js
```

Then visit `http://localhost:3000` — you should see the React app, and API calls should work.

**Seed users** (from `prisma/seed.ts`):

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@cms.com | Admin@123 |
| Author | author@cms.com | Author@123 |

## Redeployment

After pushing new commits:

```bash
git push heroku main
```

Heroku will rebuild, run migrations, and restart the dyno automatically.

## Troubleshooting

**App crashes on start:**
```bash
heroku logs --tail
```

**Database migration issues:**
```bash
heroku run "cd backend && npx prisma migrate status"
```

**Check environment variables:**
```bash
heroku config
```

**Open a shell on the dyno:**
```bash
heroku run bash
```
