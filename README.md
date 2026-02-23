# Leviosa CS Frontend

Frontend console for Leviosa CS, an automated Naver Commerce customer-service SaaS.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui components
- `fetch`-based API client with JWT access/refresh handling
- Sonner toast notifications

## Environment

Create `.env.local` (or copy from `.env.example`):

```bash
NEXT_PUBLIC_CS_API_URL=http://localhost:8000
NEXT_PUBLIC_SOURCING_API_URL=http://localhost:8001
GEMINI_API_KEY=
```

## Run

```bash
bun install
bun run dev
```

App runs on `http://localhost:3000` by default.

## Run with Docker Compose

```bash
# Development
docker compose up

# Production-like build
cp .env.production.example .env
docker compose -f docker-compose.prod.yml up --build
```

## Repository Layout

This frontend is now a standalone repository and should live next to backend repositories:

```text
leviosa/
├── leviosa-sourcing-server/
├── leviosa-cs-server/
└── leviosa-frontend/
```

## Production Deploy (Dedicated Frontend Server)

- Deploy workflow: `.github/workflows/deploy.yml`
- Required repository secrets:
  - `VPS_HOST`
  - `VPS_USER`
  - `VPS_SSH_KEY`
- Optional repository variables (for CI build stage):
  - `NEXT_PUBLIC_CS_API_URL`
  - `NEXT_PUBLIC_SOURCING_API_URL`
- Server path: `/opt/leviosa/leviosa-frontend`
- Production environment file: `.env` (template: `.env.production.example`)

## Auth + API Behavior

- Access and refresh tokens are stored in `localStorage`.
- Authenticated requests automatically send `Authorization: Bearer <access_token>`.
- On `401` or `403`, the client attempts `/api/v1/auth/refresh` once and retries the original request.
- If refresh fails, tokens are cleared and the user is redirected to `/login`.

## Implemented Routes

- `/login`
- `/register`
- `/dashboard`
- `/inquiries`
- `/inquiries/[id]`
- `/settings`

`/dashboard`, `/inquiries`, and `/settings` run behind the authenticated app shell with sidebar + top bar.

## UX Features Included

- Skeleton loading states
- Empty-state messaging
- Success/error toast feedback on mutations
- 30-second polling refresh on dashboard and inquiries list
- Confirmation dialogs for approve/reject/disconnect actions
- Responsive desktop/tablet layout
