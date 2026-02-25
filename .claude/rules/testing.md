# Testing Rules

## Framework & Config

- **Vitest 4** + **jsdom** + **React Testing Library** + **@testing-library/user-event**
- Globals enabled (`describe`, `it`, `expect` available without imports — but prefer explicit imports from `vitest` for clarity)
- Setup file: `src/test/setup.tsx` (auto-mocks `next/navigation`, `next/image`, and localStorage)
- Test path alias: `@/*` resolves to `./src/*` via `vite-tsconfig-paths`

## File Placement & Naming

- Co-locate tests in `__tests__/` directories next to the source:
  - `src/lib/__tests__/api-client.test.ts`
  - `src/components/app/__tests__/app-shell.test.tsx`
  - `src/app/login/__tests__/login-client.test.tsx`
- Name: `{module-name}.test.ts` for utils, `{component-name}.test.tsx` for components.

## Mocking

### Module Mocking Order

`vi.mock()` calls MUST come before the import of the module being tested. Vitest hoists `vi.mock()`, but extracting mock references requires this order:

```typescript
// 1. vi.mock() first
const mockGetSession = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: mockGetSession },
  }),
}));

// 2. THEN import module under test
import { apiRequest } from "@/lib/api-client";
```

### Fetch Mocking

Use the helpers in `src/test/helpers/mock-fetch.ts`:

```typescript
import { mockFetch, jsonResponse, errorResponse, emptyResponse } from "@/test/helpers/mock-fetch";

it("fetches data", async () => {
  mockFetch(jsonResponse({ data: { id: "1" }, message: "ok" }));
  const result = await apiRequest("/api/v1/test");
  expect(fetch).toHaveBeenCalledOnce();
});
```

- `jsonResponse(body, { status?, headers? })` — JSON response with 200 default
- `errorResponse(detail, status)` — JSON `{ detail }` response
- `emptyResponse(status)` — null body (204 default)
- `mockFetch(res1, res2, ...)` — stubs `globalThis.fetch` with ordered responses

Inspect fetch calls:
```typescript
const [url, init] = vi.mocked(fetch).mock.calls[0];
expect(init?.headers).toBeDefined();
```

### Framer Motion

Mock framer-motion to bypass animations in component tests:

```typescript
vi.mock("framer-motion", () => {
  const motionProps = ["initial", "animate", "exit", "variants", "transition", "whileHover", "whileTap", "whileInView", "layout"];
  const Passthrough = ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
    const htmlProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (!motionProps.includes(key)) htmlProps[key] = value;
    }
    return <div {...htmlProps}>{children}</div>;
  };
  return {
    motion: { div: Passthrough, span: Passthrough, p: Passthrough },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
    useInView: () => true,
  };
});
```

### Time

```typescript
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});
```

## Setup & Teardown

```typescript
beforeEach(() => {
  localStorage.clear();
  mockFn.mockResolvedValue(defaultValue);
});

afterEach(() => {
  vi.restoreAllMocks(); // Always use this — not just mockClear()
});
```

- `vi.restoreAllMocks()` in `afterEach()` is required. Do not use only `mockFn.mockClear()`.
- Clear `localStorage` in `beforeEach()` when tests touch storage.
- Restore real timers in `afterEach()` when using `vi.useFakeTimers()`.

## Component Tests

### Rendering

```typescript
import { render, screen } from "@testing-library/react";

render(<Component prop="value" />);
expect(screen.getByText("Expected")).toBeInTheDocument();
```

### User Interactions

Always use `userEvent.setup()` (not `fireEvent`):

```typescript
import userEvent from "@testing-library/user-event";

const user = userEvent.setup();
await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
await user.click(screen.getByRole("button", { name: "Submit" }));
```

### Query Priority

Prefer queries in this order:
1. `getByRole()` — semantic (buttons, headings, etc.)
2. `getByLabelText()` — form fields
3. `getByPlaceholderText()` — inputs without labels
4. `getByText()` — visible text content
5. `findByText()` / `findByRole()` — async (waits for element to appear)
6. `queryByText()` — asserting absence (`expect(...).not.toBeInTheDocument()`)

Avoid `container.querySelector()` except for CSS class assertions.

## Assertions

### Async Errors

Use `rejects` — do not use try/catch with `expect.fail()`:

```typescript
// GOOD
await expect(apiRequest("/bad")).rejects.toThrow(ApiError);

// BAD — avoid this pattern
try {
  await apiRequest("/bad");
  expect.fail("should have thrown");
} catch (err) { /* ... */ }
```

### Common Matchers

```typescript
expect(value).toBe(exact);                    // strict equality
expect(value).toEqual(deep);                  // deep equality
expect(element).toBeInTheDocument();          // DOM presence
expect(screen.queryByText("x")).not.toBeInTheDocument(); // DOM absence
expect(mockFn).toHaveBeenCalledOnce();
expect(mockFn).toHaveBeenCalledWith(arg);
```

## What's Already Mocked in Setup

The global setup (`src/test/setup.tsx`) provides:
- `next/navigation`: `useRouter` (returns push/replace/back/forward/refresh/prefetch mocks), `usePathname` (returns "/"), `useSearchParams` (returns empty), `redirect`
- `next/image`: renders plain `<img>`
- `localStorage`: Map-based mock (Node 22 jsdom compatibility fix)
- `@testing-library/jest-dom/vitest` matchers (toBeInTheDocument, etc.)
- Auto `cleanup()` after each test

Do NOT re-mock these unless overriding for a specific test.

## Coverage

Coverage includes `src/lib/`, `src/components/app/`, `src/app/`. Excludes `src/components/ui/` (shadcn primitives) and `src/types/`.

Run: `bun run test:coverage`
