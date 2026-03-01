# Product Tour Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add context-based onboarding mini-tours using react-joyride that guide first-time users through the sourcing search, results/card review, and CS dashboard pages.

**Architecture:** A `TourProvider` React context manages localStorage flags and exposes a `useTour(tourName)` hook. Each page consumes the hook and renders its own `<Joyride>` instance. A shared custom dark tooltip component provides consistent styling. Tour targets use `data-tour-*` attributes added to existing elements.

**Tech Stack:** react-joyride, React Context, localStorage, Tailwind CSS

---

### Task 1: Install react-joyride

**Files:**
- Modify: `package.json`

**Step 1: Install the dependency**

Run: `bun add react-joyride`

**Step 2: Verify installation**

Run: `bun run build 2>&1 | head -5`
Expected: No import errors related to react-joyride

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "feat: add react-joyride dependency for product tour"
```

---

### Task 2: Create tour step definitions

**Files:**
- Create: `src/components/app/tour/tour-steps.ts`

**Step 1: Create the step definitions file**

```typescript
import type { Step } from "react-joyride";

export const SEARCH_TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="search-input"]',
    content:
      "Search for products by keyword. Try entering a product name or category to find items from Domeggook.",
    placement: "bottom",
    disableBeacon: true,
    spotlightClicks: true,
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="filter-shortcuts"]',
    content:
      "Use quick filters to narrow results \u2014 free shipping, sort by sales, price, or reviews. Hover here to reveal them.",
    placement: "bottom",
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="price-filters"]',
    content:
      "Set min/max price range to filter products within your budget.",
    placement: "bottom",
    spotlightClicks: true,
    spotlightPadding: 8,
  },
];

export const RESULTS_TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="product-list"]',
    content:
      "Your search results appear here. Click any product to jump to it in the card view.",
    placement: "right",
    disableBeacon: true,
    spotlightClicks: true,
    spotlightPadding: 4,
  },
  {
    target: '[data-tour="product-card"]',
    content:
      "Review products one by one. Click the image to toggle between original and AI-generated cover.",
    placement: "left",
    spotlightClicks: true,
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="swipe-buttons"]',
    content:
      "Swipe through products: Skip (\u2715) or Accept (\u2665). You can also use arrow keys \u2190 \u2192.",
    placement: "top",
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="opt-buttons"]',
    content:
      "Optimize products with AI \u2014 fix pricing, generate SEO names, or create professional cover images.",
    placement: "top",
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="bulk-actions"]',
    content:
      "Use bulk actions to optimize or upload all accepted products at once. Configure your fee rate and margin in Settings first.",
    placement: "top",
    spotlightPadding: 4,
  },
];

export const DASHBOARD_TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="stat-cards"]',
    content:
      "Track your customer service performance at a glance \u2014 response times, automation rate, and pending inquiries.",
    placement: "bottom",
    disableBeacon: true,
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="inquiry-queue"]',
    content:
      "View and manage all incoming inquiries. AI-generated responses are flagged by confidence level.",
    placement: "left",
    spotlightClicks: true,
    spotlightPadding: 4,
  },
  {
    target: '[data-tour="activity-chart"]',
    content:
      "Monitor worker activity over time \u2014 see how many inquiries are fetched and auto-posted each period.",
    placement: "right",
    spotlightPadding: 8,
  },
];

export const SETTINGS_REMINDER_STEPS: Step[] = [
  {
    target: '[data-tour="settings-button"]',
    content:
      "Make sure your Naver fee rate and profit margin are configured here before optimizing prices.",
    placement: "right",
    disableBeacon: true,
    spotlightClicks: true,
    spotlightPadding: 4,
  },
];

export type TourName = "search" | "results" | "dashboard" | "settings-reminder";

export const TOUR_STEPS: Record<TourName, Step[]> = {
  search: SEARCH_TOUR_STEPS,
  results: RESULTS_TOUR_STEPS,
  dashboard: DASHBOARD_TOUR_STEPS,
  "settings-reminder": SETTINGS_REMINDER_STEPS,
};

export const TOUR_STORAGE_KEYS: Record<TourName, string> = {
  search: "tour_search_seen",
  results: "tour_results_seen",
  dashboard: "tour_dashboard_seen",
  "settings-reminder": "tour_price_opt_reminded",
};
```

**Step 2: Commit**

```bash
git add src/components/app/tour/tour-steps.ts
git commit -m "feat: add tour step definitions for all mini-tours"
```

---

### Task 3: Create custom dark tooltip component

**Files:**
- Create: `src/components/app/tour/tour-tooltip.tsx`

This is a custom tooltip matching the app's dark theme. It receives props from react-joyride's `tooltipComponent` API.

**Step 1: Create the tooltip component**

```tsx
"use client";

import type { TooltipRenderProps } from "react-joyride";

export function TourTooltip({
  backProps,
  closeProps,
  continuous,
  index,
  primaryProps,
  skipProps,
  step,
  size,
  tooltipProps,
}: TooltipRenderProps) {
  return (
    <div
      {...tooltipProps}
      className="w-[360px] rounded-xl border border-neutral-700 bg-neutral-900 p-5 shadow-2xl shadow-black/40"
    >
      {/* Close button */}
      <button
        {...closeProps}
        className="absolute right-3 top-3 text-neutral-500 hover:text-white transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M1 1l12 12M13 1L1 13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Content */}
      {step.title && (
        <h4 className="mb-2 text-sm font-semibold text-white pr-6">
          {step.title}
        </h4>
      )}
      <div className="text-sm leading-relaxed text-neutral-300 pr-4">
        {step.content}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        {/* Skip */}
        <button
          {...skipProps}
          className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          Skip tour
        </button>

        <div className="flex items-center gap-3">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: size }).map((_, i) => (
              <div
                key={i}
                className={`size-1.5 rounded-full transition-colors ${
                  i === index ? "bg-emerald-500" : "bg-neutral-600"
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                {...backProps}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
              >
                Back
              </button>
            )}
            {continuous && (
              <button
                {...primaryProps}
                className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 transition-colors"
              >
                {index === size - 1 ? "Done" : "Next"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/app/tour/tour-tooltip.tsx
git commit -m "feat: add custom dark tooltip component for tours"
```

---

### Task 4: Create TourProvider context and useTour hook

**Files:**
- Create: `src/components/app/tour/tour-provider.tsx`
- Create: `src/components/app/tour/use-tour.ts`

**Step 1: Create the provider**

`src/components/app/tour/tour-provider.tsx`:

```tsx
"use client";

import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { TourName } from "./tour-steps";
import { TOUR_STORAGE_KEYS } from "./tour-steps";

interface TourContextValue {
  /** Returns true if tour has NOT been seen yet */
  isTourPending: (name: TourName) => boolean;
  /** Mark a tour as completed */
  completeTour: (name: TourName) => void;
  /** Reset a specific tour (for debugging / re-triggering) */
  resetTour: (name: TourName) => void;
}

export const TourContext = createContext<TourContextValue | null>(null);

function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    if (value) {
      localStorage.setItem(key, "true");
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // localStorage unavailable
  }
}

export function TourProvider({ children }: { children: ReactNode }) {
  // Seed from localStorage on mount
  const [seen, setSeen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const [, storageKey] of Object.entries(TOUR_STORAGE_KEYS)) {
      initial[storageKey] = readFlag(storageKey);
    }
    return initial;
  });

  const isTourPending = useCallback(
    (name: TourName) => {
      const key = TOUR_STORAGE_KEYS[name];
      return !seen[key];
    },
    [seen],
  );

  const completeTour = useCallback((name: TourName) => {
    const key = TOUR_STORAGE_KEYS[name];
    writeFlag(key, true);
    setSeen((prev) => ({ ...prev, [key]: true }));

    // Set master flag if all main tours done
    const mainTours: TourName[] = ["search", "results", "dashboard"];
    const allKeys = mainTours.map((t) => TOUR_STORAGE_KEYS[t]);
    const allDone = allKeys.every(
      (k) => k === key || readFlag(k),
    );
    if (allDone) {
      writeFlag("hasSeenTour", true);
    }
  }, []);

  const resetTour = useCallback((name: TourName) => {
    const key = TOUR_STORAGE_KEYS[name];
    writeFlag(key, false);
    setSeen((prev) => ({ ...prev, [key]: false }));
    writeFlag("hasSeenTour", false);
  }, []);

  const value = useMemo(
    () => ({ isTourPending, completeTour, resetTour }),
    [isTourPending, completeTour, resetTour],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
```

**Step 2: Create the hook**

`src/components/app/tour/use-tour.ts`:

```typescript
"use client";

import { useContext } from "react";
import { TourContext } from "./tour-provider";
import type { TourName } from "./tour-steps";

export function useTour(name: TourName) {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used within <TourProvider>");
  }

  return {
    pending: ctx.isTourPending(name),
    complete: () => ctx.completeTour(name),
    reset: () => ctx.resetTour(name),
  };
}
```

**Step 3: Create barrel export**

Create `src/components/app/tour/index.ts`:

```typescript
export { TourProvider } from "./tour-provider";
export { useTour } from "./use-tour";
export { TourTooltip } from "./tour-tooltip";
export { TOUR_STEPS } from "./tour-steps";
export type { TourName } from "./tour-steps";
```

**Step 4: Commit**

```bash
git add src/components/app/tour/
git commit -m "feat: add TourProvider context, useTour hook, and barrel export"
```

---

### Task 5: Integrate TourProvider into app layout

**Files:**
- Modify: `src/app/(app)/layout.tsx`

**Step 1: Wrap children with TourProvider**

The current layout is:
```tsx
import { AppShell } from "@/components/app/app-shell";

export default function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
```

Change to:
```tsx
import { AppShell } from "@/components/app/app-shell";
import { TourProvider } from "@/components/app/tour";

export default function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <TourProvider>
      <AppShell>{children}</AppShell>
    </TourProvider>
  );
}
```

**Step 2: Verify build**

Run: `bun run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/\(app\)/layout.tsx
git commit -m "feat: wrap authenticated layout with TourProvider"
```

---

### Task 6: Add data-tour attributes to sourcing page elements

**Files:**
- Modify: `src/app/(app)/sourcing/sourcing-client.tsx`

This task adds `data-tour-*` attributes to existing elements so react-joyride can target them. No functional changes.

**Step 1: Add `data-tour="search-input"` to the search bar container**

At line ~865 (the `<motion.div>` wrapping the search input), add the data attribute to the outer search bar container div at line ~843:

Find the `renderSearchBar` function's outer `<div>` (line 843):
```tsx
    <div
      onMouseEnter={() => {
```

Add `data-tour="search-input"` to this div.

**Step 2: Add `data-tour="filter-shortcuts"` to the shortcuts container**

The shortcuts are inside an `<AnimatePresence>` at line ~909. Since they're conditionally rendered, wrap the hover area. The `data-tour="filter-shortcuts"` attribute should go on the same outer div from step 1 (the one containing both the search bar and shortcut buttons). Actually — since the search-input already targets that div, we need the filter-shortcuts on a narrower element.

Add a wrapper `<div data-tour="filter-shortcuts">` around the AnimatePresence block at line 909:
```tsx
      {/* Animated shortcut buttons (blob-emerge on hover) */}
      <div data-tour="filter-shortcuts">
      <AnimatePresence mode="popLayout">
        {hovered &&
          FILTER_SHORTCUTS.map((shortcut, index) => (
            ...
          ))}
      </AnimatePresence>
      </div>
```

**Step 3: Add `data-tour="price-filters"` to the price range container**

At line 957, the `priceFilters` JSX starts with:
```tsx
  const priceFilters = (
    <div className="flex flex-wrap items-center gap-3">
```

Add `data-tour="price-filters"`:
```tsx
  const priceFilters = (
    <div data-tour="price-filters" className="flex flex-wrap items-center gap-3">
```

**Step 4: Add `data-tour="product-list"` to the product list container**

At line 1063:
```tsx
          <div
            className="relative flex w-full max-w-[640px] ...
```

Add `data-tour="product-list"`:
```tsx
          <div
            data-tour="product-list"
            className="relative flex w-full max-w-[640px] ...
```

**Step 5: Add `data-tour="product-card"` to the card container**

At line 1260, the card swipe wrapper:
```tsx
            <div className="flex flex-col items-center justify-center gap-3 order-1 lg:order-2 lg:h-[680px] lg:flex-shrink-0">
```

Add `data-tour="product-card"`:
```tsx
            <div data-tour="product-card" className="flex flex-col items-center justify-center gap-3 order-1 lg:order-2 lg:h-[680px] lg:flex-shrink-0">
```

**Step 6: Add `data-tour="swipe-buttons"` to the skip and accept button row**

At line 1328:
```tsx
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleSkip}
```

We need to wrap the skip + accept buttons (the outer ones, not the opt buttons). Since they share one container div, add `data-tour="swipe-buttons"` to that container and add a separate `data-tour="opt-buttons"` wrapper around the 3 middle optimization buttons.

Actually, they're all in one `<div className="flex items-center gap-2.5">`. We need to split the data attributes. The simplest approach: add `data-tour="swipe-buttons"` to the whole row (line 1328), and add `data-tour="opt-buttons"` as a wrapper around the 3 optimization buttons.

On line 1328:
```tsx
              <div data-tour="swipe-buttons" className="flex items-center gap-2.5">
```

Then wrap lines 1338-1381 (the 3 optimization buttons) in:
```tsx
                <div data-tour="opt-buttons" className="flex items-center gap-2.5">
                  {/* price opt button */}
                  {/* name opt button */}
                  {/* cover opt button */}
                </div>
```

And remove the `gap-2.5` from the individual button spacing since the wrapper handles it. The outer div keeps `gap-2.5` as well.

**Step 7: Add `data-tour="bulk-actions"` to the bulk actions footer**

At line 1162:
```tsx
            <div className="flex-shrink-0 border-t border-border/40 px-3 py-2.5 space-y-2">
```

Add `data-tour="bulk-actions"`:
```tsx
            <div data-tour="bulk-actions" className="flex-shrink-0 border-t border-border/40 px-3 py-2.5 space-y-2">
```

**Step 8: Verify no visual changes**

Run: `bun run dev` and visually confirm the sourcing page looks identical.

Run: `bun run lint`
Expected: No new lint errors

**Step 9: Commit**

```bash
git add src/app/\(app\)/sourcing/sourcing-client.tsx
git commit -m "feat: add data-tour attributes to sourcing page elements"
```

---

### Task 7: Add data-tour attributes to dashboard and app shell

**Files:**
- Modify: `src/app/(app)/dashboard/dashboard-client.tsx`
- Modify: `src/components/app/app-shell.tsx`

**Step 1: Add `data-tour="stat-cards"` to the BentoGrid**

At line 339 in `dashboard-client.tsx`:
```tsx
          <BentoGrid className="flex-1 auto-rows-[minmax(10rem,1fr)] lg:grid-rows-[1fr_1fr]">
```

Add `data-tour="stat-cards"`:
```tsx
          <BentoGrid data-tour="stat-cards" className="flex-1 auto-rows-[minmax(10rem,1fr)] lg:grid-rows-[1fr_1fr]">
```

Note: Verify that `BentoGrid` passes through extra props (spread `...props` onto its root element). If not, wrap the BentoGrid in a `<div data-tour="stat-cards">` instead.

**Step 2: Add `data-tour="activity-chart"` to the chart card**

At line 404:
```tsx
            <div className={cn(BENTO_CARD_BASE, "lg:col-span-3 flex flex-col bg-gradient-to-br from-white/90 to-slate-50/50")}>
```

Add `data-tour="activity-chart"`:
```tsx
            <div data-tour="activity-chart" className={cn(BENTO_CARD_BASE, "lg:col-span-3 flex flex-col bg-gradient-to-br from-white/90 to-slate-50/50")}>
```

**Step 3: Add `data-tour="inquiry-queue"` to the queue card**

At line 420:
```tsx
            <div className={cn(BENTO_CARD_BASE, "lg:col-span-2 flex max-h-[320px] flex-col bg-gradient-to-br from-white/90 to-blue-50/20")}>
```

Add `data-tour="inquiry-queue"`:
```tsx
            <div data-tour="inquiry-queue" className={cn(BENTO_CARD_BASE, "lg:col-span-2 flex max-h-[320px] flex-col bg-gradient-to-br from-white/90 to-blue-50/20")}>
```

**Step 4: Add `data-tour="settings-button"` to the settings menu item in app-shell**

At line 161 in `app-shell.tsx`:
```tsx
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onOpenSettings();
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-neutral-50 transition-colors"
              >
```

Add `data-tour="settings-button"`:
```tsx
              <button
                data-tour="settings-button"
                onClick={() => {
```

**Step 5: Verify no visual changes**

Run: `bun run lint`
Expected: No new lint errors

**Step 6: Commit**

```bash
git add src/app/\(app\)/dashboard/dashboard-client.tsx src/components/app/app-shell.tsx
git commit -m "feat: add data-tour attributes to dashboard and app shell"
```

---

### Task 8: Add Joyride to sourcing page (search + results tours)

**Files:**
- Modify: `src/app/(app)/sourcing/sourcing-client.tsx`

**Step 1: Add imports**

At the top of `sourcing-client.tsx`, add:

```typescript
import Joyride, { type CallBackProps, STATUS } from "react-joyride";
import { useTour, TourTooltip, TOUR_STEPS } from "@/components/app/tour";
```

**Step 2: Add tour hooks inside the component**

Near the top of the `SourcingClient` component function (after existing useState calls), add:

```typescript
  const searchTour = useTour("search");
  const resultsTour = useTour("results");
  const settingsReminder = useTour("settings-reminder");

  const [runSearchTour, setRunSearchTour] = useState(false);
  const [runResultsTour, setRunResultsTour] = useState(false);
  const [runSettingsReminder, setRunSettingsReminder] = useState(false);
```

**Step 3: Trigger search tour on first mount when welcome state**

Add a useEffect that triggers the search tour after a short delay (to let animations settle):

```typescript
  useEffect(() => {
    if (!hasSearched && searchTour.pending) {
      const timer = setTimeout(() => setRunSearchTour(true), 600);
      return () => clearTimeout(timer);
    }
  }, [hasSearched, searchTour.pending]);
```

**Step 4: Trigger results tour when results first load**

Add a useEffect that triggers the results tour when products appear for the first time:

```typescript
  const hasTriggeredResultsTour = useRef(false);
  useEffect(() => {
    if (
      hasSearched &&
      products.length > 0 &&
      !loading &&
      resultsTour.pending &&
      !hasTriggeredResultsTour.current
    ) {
      hasTriggeredResultsTour.current = true;
      const timer = setTimeout(() => setRunResultsTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, [hasSearched, products.length, loading, resultsTour.pending]);
```

**Step 5: Add settings reminder trigger to the price optimization handler**

Find `handleSinglePriceOpt` (the function that handles single price optimization). At the beginning, add:

```typescript
  // Inside handleSinglePriceOpt, at the top:
  if (settingsReminder.pending) {
    setRunSettingsReminder(true);
    settingsReminder.complete();
  }
```

**Step 6: Add Joyride callback handlers**

```typescript
  const handleSearchTourCallback = useCallback(
    (data: CallBackProps) => {
      const { status } = data;
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRunSearchTour(false);
        searchTour.complete();
      }
    },
    [searchTour],
  );

  const handleResultsTourCallback = useCallback(
    (data: CallBackProps) => {
      const { status } = data;
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRunResultsTour(false);
        resultsTour.complete();
      }
    },
    [resultsTour],
  );

  const handleSettingsReminderCallback = useCallback(
    (data: CallBackProps) => {
      const { status } = data;
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRunSettingsReminder(false);
      }
    },
    [],
  );
```

**Step 7: Render Joyride instances**

Add these at the top of the return JSX in the welcome state section (before the first `<div>`), and also in the results section. Since both sections return separately, add a JSX fragment approach.

In the **welcome state return** (around line 1005-1030), add right after the opening wrapper:

```tsx
  // At the top of the welcome-state return block:
  <>
    <Joyride
      steps={TOUR_STEPS.search}
      run={runSearchTour}
      continuous
      showSkipButton
      callback={handleSearchTourCallback}
      tooltipComponent={TourTooltip}
      disableOverlayClose
      scrollToFirstStep
      styles={{
        options: {
          zIndex: 10000,
          overlayColor: "rgba(0, 0, 0, 0.6)",
        },
      }}
    />
    {/* ... existing welcome JSX */}
  </>
```

In the **results layout return** (around line 1035), add right after the opening `<div>`:

```tsx
  // Inside the results layout return, after the opening div:
  <Joyride
    steps={TOUR_STEPS.results}
    run={runResultsTour}
    continuous
    showSkipButton
    callback={handleResultsTourCallback}
    tooltipComponent={TourTooltip}
    disableOverlayClose
    scrollToFirstStep
    styles={{
      options: {
        zIndex: 10000,
        overlayColor: "rgba(0, 0, 0, 0.6)",
      },
    }}
  />
  <Joyride
    steps={TOUR_STEPS["settings-reminder"]}
    run={runSettingsReminder}
    continuous
    callback={handleSettingsReminderCallback}
    tooltipComponent={TourTooltip}
    disableOverlayClose
    styles={{
      options: {
        zIndex: 10000,
        overlayColor: "rgba(0, 0, 0, 0.6)",
      },
    }}
  />
```

**Step 8: Verify build and manual test**

Run: `bun run build`
Expected: No errors

Manual test: Open `/sourcing` in browser. The search tour should appear with dark tooltips on first visit.

**Step 9: Commit**

```bash
git add src/app/\(app\)/sourcing/sourcing-client.tsx
git commit -m "feat: integrate Joyride tours into sourcing page"
```

---

### Task 9: Add Joyride to dashboard page

**Files:**
- Modify: `src/app/(app)/dashboard/dashboard-client.tsx`

**Step 1: Add imports**

```typescript
import Joyride, { type CallBackProps, STATUS } from "react-joyride";
import { useTour, TourTooltip, TOUR_STEPS } from "@/components/app/tour";
```

**Step 2: Add tour hook and state**

Inside the `DashboardClient` component, add:

```typescript
  const dashboardTour = useTour("dashboard");
  const [runDashboardTour, setRunDashboardTour] = useState(false);
```

**Step 3: Trigger tour when stats are loaded**

```typescript
  useEffect(() => {
    if (stats && !loading && dashboardTour.pending) {
      const timer = setTimeout(() => setRunDashboardTour(true), 600);
      return () => clearTimeout(timer);
    }
  }, [stats, loading, dashboardTour.pending]);
```

**Step 4: Add callback handler**

```typescript
  const handleDashboardTourCallback = useCallback(
    (data: CallBackProps) => {
      const { status } = data;
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRunDashboardTour(false);
        dashboardTour.complete();
      }
    },
    [dashboardTour],
  );
```

**Step 5: Render Joyride**

Inside the return JSX, right after the outermost `<div>`:

```tsx
      <Joyride
        steps={TOUR_STEPS.dashboard}
        run={runDashboardTour}
        continuous
        showSkipButton
        callback={handleDashboardTourCallback}
        tooltipComponent={TourTooltip}
        disableOverlayClose
        scrollToFirstStep
        styles={{
          options: {
            zIndex: 10000,
            overlayColor: "rgba(0, 0, 0, 0.6)",
          },
        }}
      />
```

**Step 6: Verify build**

Run: `bun run build`
Expected: No errors

**Step 7: Commit**

```bash
git add src/app/\(app\)/dashboard/dashboard-client.tsx
git commit -m "feat: integrate Joyride tour into dashboard page"
```

---

### Task 10: Verify BentoGrid passes through data attributes

**Files:**
- Check: `src/components/ui/bento-grid.tsx`

**Step 1: Read BentoGrid component and check if it spreads extra props**

If BentoGrid does NOT spread `...props` onto its root `<div>`, the `data-tour="stat-cards"` attribute won't reach the DOM. In that case, wrap the BentoGrid call in dashboard-client.tsx:

```tsx
<div data-tour="stat-cards">
  <BentoGrid className="...">
    ...
  </BentoGrid>
</div>
```

**Step 2: Verify in browser dev tools**

Open `/dashboard`, inspect the stat cards grid, confirm `data-tour="stat-cards"` appears in the DOM.

**Step 3: Commit if changes needed**

```bash
git add src/app/\(app\)/dashboard/dashboard-client.tsx
git commit -m "fix: ensure data-tour attribute reaches DOM on stat cards"
```

---

### Task 11: Final verification and build

**Step 1: Run lint**

Run: `bun run lint`
Expected: No errors

**Step 2: Run build**

Run: `bun run build`
Expected: Clean build with no errors

**Step 3: Manual E2E test**

1. Clear localStorage (or use incognito)
2. Navigate to `/sourcing` → Search tour should appear (3 steps)
3. Complete the tour, search for a product → Results tour should appear (5 steps)
4. Click price optimization → Settings reminder should appear
5. Navigate to `/dashboard` → Dashboard tour should appear (3 steps)
6. Refresh page → No tours should appear (localStorage flags persist)
7. Check `localStorage.getItem("hasSeenTour")` === `"true"`

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete product tour onboarding system with react-joyride"
```
