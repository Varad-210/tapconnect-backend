# Vistar API

Vistar's API is a standalone Next.js service deployed to Render and connected to the shared Neon PostgreSQL database. The Vercel frontend proxies `/api/*` requests to this service so browser sessions stay on `vistarai.vercel.app`.

## Environment

- `DATABASE_URL`: Neon pooled connection string for runtime requests
- `DIRECT_URL`: Neon direct connection string for Prisma migrations
- `SESSION_SECRET`: at least 32 random characters
- `APP_URL`: `https://vistarai.vercel.app`
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: credentials for the seeded admin

## Deploy

Build: `npm ci && npx prisma generate && npm run build`
Start: `npx prisma migrate deploy && npm run db:seed && npm start`

Health check: `/api/health`
