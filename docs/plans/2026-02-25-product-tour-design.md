# Product Tour / Onboarding Design

**Date:** 2026-02-25
**Status:** Approved

## Decisions

- **Approach:** Context-based mini-tours (separate per page/state, 3-5 steps each)
- **Settings reminder:** Tooltip on first price optimization click
- **Visual style:** Dark theme (neutral-900 bg, white text, emerald accents)
- **Interactivity:** Hybrid — informational with `spotlightClicks` on interactive elements
- **Library:** react-joyride
- **Persistence:** localStorage flags per tour + master `hasSeenTour`

## Tour Definitions

### Tour 1: Search Welcome (3 steps)

Triggers on first visit to `/sourcing` when welcome state is showing.

| Step | Target | Content | spotlightClicks |
|------|--------|---------|-----------------|
| 1 | Search input | "Search for products by keyword. Try entering a product name or category to find items from Domeggook." | yes |
| 2 | Filter shortcut buttons | "Use quick filters to narrow results — free shipping, sort by sales, price, or reviews." | no |
| 3 | Price range inputs | "Set min/max price range to filter products within your budget." | yes |

### Tour 2: Results & Card Review (5 steps)

Triggers when search results load for the first time.

| Step | Target | Content | spotlightClicks |
|------|--------|---------|-----------------|
| 1 | Product list container | "Your search results appear here. Click any product to jump to it in the card view." | yes |
| 2 | Product card | "Review products one by one. Click the image to toggle between original and AI-generated cover." | yes |
| 3 | Skip + Accept buttons | "Swipe through products: Skip (✕) or Accept (♥). You can also use arrow keys ← →." | no |
| 4 | Name/Cover/Price opt buttons | "Optimize products with AI — fix pricing, generate SEO names, or create professional cover images." | no |
| 5 | Bulk actions footer | "Use bulk actions to optimize or upload all accepted products at once. Configure your fee rate and margin in Settings first." | no |

### Tour 3: Dashboard (3 steps)

Triggers on first visit to `/dashboard`.

| Step | Target | Content | spotlightClicks |
|------|--------|---------|-----------------|
| 1 | Stats cards row | "Track your customer service performance at a glance — response times, automation rate, and pending inquiries." | no |
| 2 | Inquiries table/list | "View and manage all incoming inquiries. AI-generated responses are flagged by confidence level." | yes |
| 3 | Automation config section | "Configure auto-reply settings — set confidence thresholds and choose which inquiry types to automate." | no |

### Settings Reminder (contextual, single step)

On first price optimization click (flag: `tour_price_opt_reminded`), single-step Joyride pointing at settings nav item: "Make sure your Naver fee rate and profit margin are configured here before optimizing prices."

## Custom Tooltip

- Dark: `neutral-900` bg, white text, `1px neutral-700` border
- Emerald-500 "Next"/"Done" buttons, neutral "Back"
- Step indicator dots (emerald active, neutral-600 inactive)
- "Skip tour" text link
- ~360px width
- Font: Plus Jakarta Sans (matches app)

## File Structure

```
src/components/app/tour/
├── tour-provider.tsx       # Context + localStorage logic
├── tour-tooltip.tsx        # Custom dark tooltip component
├── tour-steps.ts           # All step definitions
└── use-tour.ts             # Hook for consuming tour state
```

## Integration Points

- `src/app/(app)/layout.tsx` — wrap with `<TourProvider>`
- `src/app/(app)/sourcing/sourcing-client.tsx` — `data-tour-*` attributes, consume search + results tours
- `src/app/(app)/dashboard/dashboard-client.tsx` — consume dashboard tour
- `src/components/app/app-shell.tsx` — `data-tour-settings` on settings nav item
