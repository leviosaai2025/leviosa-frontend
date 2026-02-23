import { afterEach, describe, expect, it } from "vitest";

import {
  clearStoredTokens,
  getAccessToken,
  getRefreshToken,
  hasStoredAccessToken,
  setStoredTokens,
} from "@/lib/auth-storage";
import type { TokenPair } from "@/types/api";

const tokens: TokenPair = {
  access_token: "access-abc",
  refresh_token: "refresh-xyz",
  token_type: "bearer",
};

describe("auth-storage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("getAccessToken returns null when nothing is stored", () => {
    expect(getAccessToken()).toBeNull();
  });

  it("getRefreshToken returns null when nothing is stored", () => {
    expect(getRefreshToken()).toBeNull();
  });

  it("setStoredTokens stores both tokens", () => {
    setStoredTokens(tokens);
    expect(getAccessToken()).toBe("access-abc");
    expect(getRefreshToken()).toBe("refresh-xyz");
  });

  it("clearStoredTokens removes both tokens", () => {
    setStoredTokens(tokens);
    clearStoredTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("hasStoredAccessToken returns false when no token", () => {
    expect(hasStoredAccessToken()).toBe(false);
  });

  it("hasStoredAccessToken returns true when token exists", () => {
    setStoredTokens(tokens);
    expect(hasStoredAccessToken()).toBe(true);
  });

  it("setStoredTokens overwrites existing tokens", () => {
    setStoredTokens(tokens);
    const newTokens: TokenPair = {
      access_token: "new-access",
      refresh_token: "new-refresh",
      token_type: "bearer",
    };
    setStoredTokens(newTokens);
    expect(getAccessToken()).toBe("new-access");
    expect(getRefreshToken()).toBe("new-refresh");
  });

  it("clearStoredTokens is safe to call when nothing is stored", () => {
    expect(() => clearStoredTokens()).not.toThrow();
  });

  it("hasStoredAccessToken returns false after clearing", () => {
    setStoredTokens(tokens);
    clearStoredTokens();
    expect(hasStoredAccessToken()).toBe(false);
  });
});
