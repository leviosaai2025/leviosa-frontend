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
    target: '[data-tour="search-input"]',
    content:
      "Hover over the search bar to reveal quick filters — free shipping, sort by sales, price, or reviews.",
    placement: "bottom",
    spotlightClicks: true,
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
      "Optimize products with AI — fix pricing, generate SEO names, or create professional cover images.",
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
      "Track your customer service performance at a glance — response times, automation rate, and pending inquiries.",
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
      "Monitor worker activity over time — see how many inquiries are fetched and auto-posted each period.",
    placement: "right",
    spotlightPadding: 8,
  },
];

export const SETTINGS_REMINDER_STEPS: Step[] = [
  {
    target: '[data-tour="settings-button"]',
    content:
      "Click your avatar to access Settings — make sure your Naver fee rate and profit margin are configured before optimizing prices.",
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
