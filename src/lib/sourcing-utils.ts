import type { SourcingProduct } from "@/types/sourcing";

export function formatKRW(value: string | number): string {
  const num =
    typeof value === "string" ? Number(value.replace(/,/g, "")) : value;
  if (Number.isNaN(num)) return String(value);
  return `₩${num.toLocaleString("ko-KR")}`;
}

// ---------- Price Optimization ----------

export function parsePrice(raw: string | number): number {
  if (typeof raw === "number") return raw;
  return Number(raw.replace(/[^0-9.-]/g, "")) || 0;
}

export interface OptimizedPriceResult {
  price: number;
  feeRate: number;
  margin: number;
}

const DEFAULT_DELIVERY = 3000;

/**
 * optimizedPrice = (sourcePrice + delivery) / ((1 - feeRate/100) * (1 - margin/100)) - delivery
 * Rounds up to the nearest 10 KRW.
 */
export function calculateOptimizedPrice(
  sourcePrice: number,
  feeRate: number,
  margin: number,
  delivery: number = DEFAULT_DELIVERY,
): number {
  const feeMultiplier = 1 - feeRate / 100;
  const marginMultiplier = 1 - margin / 100;
  const divisor = feeMultiplier * marginMultiplier;
  if (divisor <= 0) return sourcePrice;
  const raw = (sourcePrice + delivery) / divisor - delivery;
  return Math.ceil(raw / 10) * 10;
}

// ---------- State Persistence ----------

export const SOURCING_STORAGE_KEY = "leviosa_sourcing_state";

const MAX_PERSISTED_PRODUCTS = 50;

export interface PersistedSourcingState {
  keyword: string;
  minPrice: string;
  maxPrice: string;
  freeShipping: boolean;
  sort: string;
  products: SourcingProduct[];
  accepted: string[];
  reviewIndex: number;
  optimizedPrices?: Record<string, OptimizedPriceResult>;
  optimizedNames?: Record<string, string>;
  coverImages?: Record<string, string>;
}

function isValidPersistedState(value: unknown): value is PersistedSourcingState {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.keyword === "string" &&
    typeof obj.minPrice === "string" &&
    typeof obj.maxPrice === "string" &&
    typeof obj.freeShipping === "boolean" &&
    typeof obj.sort === "string" &&
    Array.isArray(obj.products) &&
    Array.isArray(obj.accepted) &&
    typeof obj.reviewIndex === "number"
  );
}

export function loadPersistedState(): PersistedSourcingState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SOURCING_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidPersistedState(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePersistedState(state: PersistedSourcingState): void {
  if (typeof window === "undefined") return;
  try {
    const capped: PersistedSourcingState = {
      ...state,
      products: state.products.slice(0, MAX_PERSISTED_PRODUCTS),
    };
    localStorage.setItem(SOURCING_STORAGE_KEY, JSON.stringify(capped));
  } catch {
    // localStorage full — ignore
  }
}

export function clearPersistedState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SOURCING_STORAGE_KEY);
}
