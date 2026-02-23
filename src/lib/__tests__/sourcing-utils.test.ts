import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clearPersistedState,
  formatKRW,
  loadPersistedState,
  savePersistedState,
  SOURCING_STORAGE_KEY,
} from "@/lib/sourcing-utils";
import type { SourcingProduct } from "@/types/sourcing";

function makeProduct(overrides: Partial<SourcingProduct> = {}): SourcingProduct {
  return {
    product_no: "1",
    name: "Test Product",
    price: "10000",
    image_url: "",
    url: "",
    category: "",
    description: "",
    rating: 0,
    review_count: 0,
    seller: "",
    shipping_info: "",
    ...overrides,
  };
}

describe("formatKRW", () => {
  it("formats a number", () => {
    expect(formatKRW(10000)).toBe("₩10,000");
  });

  it("formats a string with commas", () => {
    expect(formatKRW("1,234,567")).toBe("₩1,234,567");
  });

  it("returns original string for NaN input", () => {
    expect(formatKRW("abc")).toBe("abc");
  });

  it("formats zero", () => {
    expect(formatKRW(0)).toBe("₩0");
  });
});

describe("loadPersistedState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns null when localStorage is empty", () => {
    expect(loadPersistedState()).toBeNull();
  });

  it("parses valid JSON", () => {
    const state = {
      keyword: "shoes",
      minPrice: "100",
      maxPrice: "500",
      freeShipping: true,
      sort: "rd",
      products: [makeProduct()],
      accepted: ["1"],
      reviewIndex: 0,
    };
    localStorage.setItem(SOURCING_STORAGE_KEY, JSON.stringify(state));
    expect(loadPersistedState()).toEqual(state);
  });

  it("returns null on corrupt JSON", () => {
    localStorage.setItem(SOURCING_STORAGE_KEY, "not-json{{{");
    expect(loadPersistedState()).toBeNull();
  });

  it("returns null on invalid shape", () => {
    localStorage.setItem(SOURCING_STORAGE_KEY, JSON.stringify({ keyword: 123 }));
    expect(loadPersistedState()).toBeNull();
  });
});

describe("savePersistedState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("writes to localStorage", () => {
    const state = {
      keyword: "shoes",
      minPrice: "",
      maxPrice: "",
      freeShipping: false,
      sort: "rd",
      products: [makeProduct()],
      accepted: [],
      reviewIndex: 0,
    };
    savePersistedState(state);
    const raw = localStorage.getItem(SOURCING_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).keyword).toBe("shoes");
  });

  it("caps products at 50", () => {
    const products = Array.from({ length: 80 }, (_, i) =>
      makeProduct({ product_no: String(i) }),
    );
    const state = {
      keyword: "shoes",
      minPrice: "",
      maxPrice: "",
      freeShipping: false,
      sort: "rd",
      products,
      accepted: [],
      reviewIndex: 0,
    };
    savePersistedState(state);
    const raw = localStorage.getItem(SOURCING_STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.products).toHaveLength(50);
  });
});

describe("clearPersistedState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("removes the key from localStorage", () => {
    localStorage.setItem(SOURCING_STORAGE_KEY, "data");
    clearPersistedState();
    expect(localStorage.getItem(SOURCING_STORAGE_KEY)).toBeNull();
  });
});
