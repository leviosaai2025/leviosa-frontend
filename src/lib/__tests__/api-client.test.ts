import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, ReauthRequiredError, apiRequest, getErrorMessage } from "@/lib/api-client";
import { emptyResponse, errorResponse, jsonResponse, mockFetch } from "@/test/helpers/mock-fetch";

describe("apiRequest", () => {
  beforeEach(() => {
    localStorage.clear();
    // Prevent redirect side-effects
    delete (window as Record<string, unknown>).location;
    Object.defineProperty(window, "location", {
      value: { href: "/" },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("makes a GET request and returns parsed JSON", async () => {
    const body = { data: { id: "1" }, message: "ok" };
    mockFetch(jsonResponse(body));

    const result = await apiRequest("/api/v1/test", { auth: false });
    expect(result).toEqual(body);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("makes a POST request with JSON body", async () => {
    const body = { data: { id: "2" }, message: "created" };
    mockFetch(jsonResponse(body, { status: 201 }));

    await apiRequest("/api/v1/test", {
      method: "POST",
      body: { name: "test" },
      auth: false,
    });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ name: "test" }));
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
  });

  it("attaches Authorization header when auth is true and token exists", async () => {
    localStorage.setItem("leviosa_cs_access_token", "my-token");
    mockFetch(jsonResponse({ data: null }));

    await apiRequest("/api/v1/test");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer my-token");
  });

  it("does not attach Authorization header when auth is false", async () => {
    localStorage.setItem("leviosa_cs_access_token", "my-token");
    mockFetch(jsonResponse({ data: null }));

    await apiRequest("/api/v1/test", { auth: false });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(new Headers(init?.headers).get("Authorization")).toBeNull();
  });

  it("returns undefined for 204 No Content", async () => {
    mockFetch(emptyResponse());

    const result = await apiRequest("/api/v1/test", { auth: false });
    expect(result).toBeUndefined();
  });

  it("throws ApiError for non-ok responses", async () => {
    mockFetch(errorResponse("Not Found", 404));

    await expect(apiRequest("/api/v1/test", { auth: false })).rejects.toThrow(ApiError);
  });

  it("includes status and detail in ApiError", async () => {
    mockFetch(errorResponse("Something went wrong", 422));

    try {
      await apiRequest("/api/v1/test", { auth: false });
      expect.fail("should have thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(422);
      expect(apiErr.detail).toBe("Something went wrong");
    }
  });

  it("formats validation error details", async () => {
    const detail = [
      { loc: ["body", "email"], msg: "field required", type: "value_error" },
    ];
    mockFetch(errorResponse(detail, 422));

    try {
      await apiRequest("/api/v1/test", { auth: false });
      expect.fail("should have thrown");
    } catch (err) {
      expect((err as ApiError).message).toBe("body.email: field required");
    }
  });

  it("attempts token refresh on 401 then retries", async () => {
    localStorage.setItem("leviosa_cs_access_token", "expired");
    localStorage.setItem("leviosa_cs_refresh_token", "valid-refresh");

    const refreshBody = {
      data: {
        access_token: "new-access",
        refresh_token: "new-refresh",
        token_type: "bearer",
      },
    };
    const successBody = { data: { ok: true } };

    const fetchFn = mockFetch(
      jsonResponse(null, { status: 401 }), // initial 401
      jsonResponse(refreshBody),            // refresh succeeds
      jsonResponse(successBody),            // retry succeeds
    );

    const result = await apiRequest("/api/v1/test");
    expect(result).toEqual(successBody);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("throws ReauthRequiredError when refresh fails", async () => {
    localStorage.setItem("leviosa_cs_access_token", "expired");
    localStorage.setItem("leviosa_cs_refresh_token", "bad-refresh");

    mockFetch(
      jsonResponse(null, { status: 401 }),
      jsonResponse(null, { status: 401 }),
    );

    await expect(apiRequest("/api/v1/test")).rejects.toThrow(ReauthRequiredError);
  });

  it("does not set Content-Type for FormData bodies", async () => {
    mockFetch(jsonResponse({ data: null }));

    const formData = new FormData();
    formData.append("file", "content");

    await apiRequest("/api/v1/upload", {
      method: "POST",
      body: formData,
      auth: false,
    });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(new Headers(init?.headers).has("Content-Type")).toBe(false);
  });

  it("passes signal to fetch", async () => {
    const controller = new AbortController();
    mockFetch(jsonResponse({ data: null }));

    await apiRequest("/api/v1/test", { auth: false, signal: controller.signal });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.signal).toBe(controller.signal);
  });
});

describe("getErrorMessage", () => {
  it("returns message from ApiError", () => {
    const err = new ApiError("bad request", 400, null);
    expect(getErrorMessage(err)).toBe("bad request");
  });

  it("returns message from generic Error", () => {
    expect(getErrorMessage(new Error("oops"))).toBe("oops");
  });

  it('returns "Unexpected error" for non-Error values', () => {
    expect(getErrorMessage("string")).toBe("Unexpected error");
    expect(getErrorMessage(42)).toBe("Unexpected error");
    expect(getErrorMessage(null)).toBe("Unexpected error");
  });
});
