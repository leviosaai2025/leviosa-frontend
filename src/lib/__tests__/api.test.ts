import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { authApi, automationApi, dashboardApi, inquiriesApi, naverApi, talktalkApi } from "@/lib/api";

// Mock apiRequest at the module level
vi.mock("@/lib/api-client", () => ({
  apiRequest: vi.fn().mockResolvedValue({ data: null, message: "ok" }),
  getErrorMessage: vi.fn((e: unknown) => (e instanceof Error ? e.message : "error")),
  ApiError: class extends Error {
    status: number;
    detail: unknown;
    constructor(m: string, s: number, d: unknown) {
      super(m);
      this.status = s;
      this.detail = d;
    }
  },
}));

import { apiRequest } from "@/lib/api-client";
const mockApiRequest = vi.mocked(apiRequest);

describe("api wrappers", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("authApi.me calls GET /api/v1/auth/me with default auth", async () => {
    await authApi.me();
    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/auth/me");
  });

  it("naverApi.connect calls POST /api/v1/naver/connect", async () => {
    const payload = { naver_client_id: "id", client_secret: "sec", store_id: "store" };
    await naverApi.connect(payload);
    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/naver/connect", {
      method: "POST",
      body: payload,
    });
  });

  it("naverApi.disconnect calls DELETE /api/v1/naver/disconnect", async () => {
    await naverApi.disconnect();
    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/naver/disconnect", {
      method: "DELETE",
    });
  });

  it("automationApi.toggle calls POST with payload", async () => {
    await automationApi.toggle({ is_enabled: true });
    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/automation/toggle", {
      method: "POST",
      body: { is_enabled: true },
    });
  });

  it("inquiriesApi.list builds query string from params", async () => {
    await inquiriesApi.list({ status: "pending", page: 2, page_size: 10 });
    const [path] = mockApiRequest.mock.calls[0];
    expect(path).toContain("/api/v1/inquiries?");
    expect(path).toContain("status=pending");
    expect(path).toContain("page=2");
    expect(path).toContain("page_size=10");
  });

  it("inquiriesApi.list omits undefined params from query string", async () => {
    await inquiriesApi.list({});
    const [path] = mockApiRequest.mock.calls[0];
    expect(path).toBe("/api/v1/inquiries");
  });

  it("inquiriesApi.approve calls POST with inquiry ID", async () => {
    await inquiriesApi.approve("inq-123");
    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/inquiries/inq-123/approve", {
      method: "POST",
    });
  });

  it("dashboardApi.stats passes period as query param", async () => {
    await dashboardApi.stats("7d");
    const [path] = mockApiRequest.mock.calls[0];
    expect(path).toContain("period=7d");
  });

  it("talktalkApi.connect calls POST /api/v1/talktalk/connect", async () => {
    const payload = { talktalk_token: "tok-123" };
    await talktalkApi.connect(payload);
    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/talktalk/connect", {
      method: "POST",
      body: payload,
    });
  });

  it("talktalkApi.status calls GET /api/v1/talktalk/status", async () => {
    await talktalkApi.status();
    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/talktalk/status");
  });

  it("talktalkApi.disconnect calls DELETE /api/v1/talktalk/disconnect", async () => {
    await talktalkApi.disconnect();
    expect(mockApiRequest).toHaveBeenCalledWith("/api/v1/talktalk/disconnect", {
      method: "DELETE",
    });
  });
});
