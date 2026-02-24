import { afterEach, describe, expect, it, vi } from "vitest";

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  }),
}));

import { SourcingApiError, searchProducts } from "@/lib/sourcing-api";
import { jsonResponse, mockFetch } from "@/test/helpers/mock-fetch";

describe("searchProducts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends POST with search params and returns response", async () => {
    const body = { success: true, products: [], items: [], message: "ok", search_info: {} };
    const fetchFn = mockFetch(jsonResponse(body));

    const result = await searchProducts({ keyword: "shoes" });
    expect(result).toEqual(body);

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toContain("/api/domeggook/search");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ keyword: "shoes" });
  });

  it("throws SourcingApiError on non-ok response", async () => {
    mockFetch(new Response("Server Error", { status: 500 }));

    await expect(searchProducts({ keyword: "fail" })).rejects.toThrow(SourcingApiError);
  });

  it("passes AbortSignal to fetch", async () => {
    const controller = new AbortController();
    const fetchFn = mockFetch(jsonResponse({ success: true, products: [], items: [], message: "", search_info: {} }));

    await searchProducts({ keyword: "test" }, controller.signal);

    const [, init] = fetchFn.mock.calls[0];
    expect(init?.signal).toBe(controller.signal);
  });

  it("includes SourcingApiError status", async () => {
    mockFetch(new Response("Not Found", { status: 404 }));

    try {
      await searchProducts({ keyword: "missing" });
      expect.fail("should have thrown");
    } catch (err) {
      const apiErr = err as SourcingApiError;
      expect(apiErr.status).toBe(404);
      expect(apiErr.message).toBe("Not Found");
    }
  });
});

