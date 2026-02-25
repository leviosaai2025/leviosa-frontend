# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install              # install dependencies
bun run dev              # dev server (port 3000)
bun run build            # production build
bun run lint             # ESLint (eslint-config-next with core-web-vitals + typescript)
bun run test             # Vitest — all tests
bun run test:watch       # Vitest watch mode
bun run test:coverage    # Vitest with V8 coverage
bunx vitest run src/lib/__tests__/api-client.test.ts   # single test file
bunx vitest run -t "test name pattern"                 # single test by name
```

## Architecture

Next.js 16 (App Router) frontend for the Leviosa platform — serves both the **CS (Customer Service)** and **Sourcing** domains. Uses `bun` as the package manager.

### Routing & Layouts

- `src/app/layout.tsx` — Root layout. Fonts: Plus Jakarta Sans (body) + Space Mono (mono). Sonner `<Toaster>` mounted here.
- `src/app/(app)/layout.tsx` — Authenticated shell (`<AppShell>` with sidebar). All protected pages live under `(app)/`.
- `src/app/login/`, `src/app/register/` — Public auth pages.
- `src/app/page.tsx` — Landing page (public).
- Pages follow client/server split: `page.tsx` is a thin server component that renders a `*-client.tsx` client component.

### Authentication (Supabase)

Auth is handled entirely through Supabase (`@supabase/ssr`):
- **Browser client**: `src/lib/supabase/client.ts` — `createBrowserClient()` for client components.
- **Server client**: `src/lib/supabase/server.ts` — `createServerClient()` for server components/route handlers.
- **Middleware**: `src/middleware.ts` → `src/lib/supabase/middleware.ts` — refreshes session on every request, redirects unauthenticated users away from protected routes, redirects authenticated users away from `/login` and `/register`.
- Access tokens from Supabase sessions are forwarded as `Authorization: Bearer` headers to backend APIs.

### API Layer

Two separate API clients exist:

1. **`src/lib/api-client.ts`** — Generic `apiRequest<T>()` function. Supports `target: "cs" | "sourcing"` to route to different backends. Handles auth via Supabase tokens, 401/403 → redirect to `/login`, structured error parsing (`ApiError`, `ReauthRequiredError`).
2. **`src/lib/api.ts`** — Domain-specific wrappers for CS backend (`authApi`, `naverApi`, `talktalkApi`, `automationApi`, `inquiriesApi`, `dashboardApi`). All use `apiRequest()` internally.
3. **`src/lib/sourcing-api.ts`** — Separate client for sourcing backend with its own `SourcingApiError`. Has HTTPS/HTTP mixed-content handling (falls back to relative URLs when browser is HTTPS but API is HTTP).

### Next.js API Routes (Server-Side AI Proxies)

- `src/app/api/optimize-name/route.ts` — Proxies to Google Gemini (`gemini-2.5-flash`) for product name SEO optimization. Requires `GEMINI_API_KEY`.
- `src/app/api/optimize-cover/route.ts` — Proxies to Replicate (`p-image-edit`) for product cover image generation. Requires `REPLICATE_API_TOKEN`.

### Component Organization

- `src/components/ui/` — shadcn/ui primitives (new-york style, neutral base color, Lucide icons). Do not manually edit these.
- `src/components/app/` — Application-specific components (app shell, modals, badges, charts).

### Types

- `src/types/api.ts` — CS backend request/response types (matches FastAPI schemas).
- `src/types/sourcing.ts` — Sourcing backend types.

## Environment Variables

Required in `.env.local` (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project credentials
- `NEXT_PUBLIC_CS_API_URL` — CS backend (default `http://localhost:8000`)
- `NEXT_PUBLIC_SOURCING_API_URL` — Sourcing backend (default `http://localhost:8001`)
- `GEMINI_API_KEY` — Server-side only, for product name optimization
- `REPLICATE_API_TOKEN` — Server-side only, for cover image generation

## Testing

- **Framework**: Vitest 4 + jsdom + React Testing Library.
- **Setup file**: `src/test/setup.tsx` — mocks `next/navigation` (useRouter, usePathname, useSearchParams, redirect), `next/image`, and localStorage.
- **Test location**: Co-located `__tests__/` directories (e.g., `src/lib/__tests__/`, `src/app/login/__tests__/`, `src/components/app/__tests__/`).
- **Coverage**: V8 provider. Includes `src/lib/`, `src/components/app/`, `src/app/`. Excludes `src/components/ui/` and `src/types/`.
- **Path aliases**: `@/*` → `./src/*` (resolved via `vite-tsconfig-paths`).

## Deployment

- CI: GitHub Actions (`.github/workflows/deploy.yml`) — lint → test → Docker build → push to DockerHub → SSH deploy to NCP server.
- Build output: `standalone` mode for Docker.
- Production runs behind nginx with SSL (Cloudflare origin certs).
- `NEXT_PUBLIC_*` vars are baked in at Docker build time via `--build-arg`.

## Key Patterns

- All backend communication uses Supabase access tokens (not custom JWT). The old localStorage-based auth has been replaced.
- The `apiRequest()` function in `api-client.ts` is the single gateway for CS API calls — always use it or the wrappers in `api.ts` rather than raw `fetch`.
- Sourcing API has a separate client (`sourcing-api.ts`) due to different error handling and mixed-content URL resolution.
- CSP headers are configured in `next.config.ts` — update `connect-src` when adding new API endpoints.
