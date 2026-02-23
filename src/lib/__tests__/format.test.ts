import { describe, expect, it } from "vitest";

import { formatDateTime, formatPercentage, formatRelativeTime, truncateText } from "@/lib/format";

describe("formatDateTime", () => {
  it("formats a valid ISO date", () => {
    const result = formatDateTime("2024-03-15T14:30:00Z");
    expect(result).toMatch(/Mar 15, 2024/);
  });

  it('returns "-" for null', () => {
    expect(formatDateTime(null)).toBe("-");
  });

  it('returns "-" for undefined', () => {
    expect(formatDateTime(undefined)).toBe("-");
  });

  it('returns "-" for empty string', () => {
    expect(formatDateTime("")).toBe("-");
  });

  it('returns "-" for invalid date string', () => {
    expect(formatDateTime("not-a-date")).toBe("-");
  });
});

describe("formatRelativeTime", () => {
  it("returns a relative time string for a valid date", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const result = formatRelativeTime(fiveMinutesAgo);
    expect(result).toContain("ago");
  });

  it('returns "Unknown time" for null', () => {
    expect(formatRelativeTime(null)).toBe("Unknown time");
  });

  it('returns "Unknown time" for undefined', () => {
    expect(formatRelativeTime(undefined)).toBe("Unknown time");
  });

  it('returns "Unknown time" for invalid date', () => {
    expect(formatRelativeTime("not-a-date")).toBe("Unknown time");
  });
});

describe("formatPercentage", () => {
  it("formats 0.95 as 95%", () => {
    expect(formatPercentage(0.95)).toBe("95%");
  });

  it("formats 1 as 100%", () => {
    expect(formatPercentage(1)).toBe("100%");
  });

  it("formats 0 as 0%", () => {
    expect(formatPercentage(0)).toBe("0%");
  });

  it('returns "-" for null', () => {
    expect(formatPercentage(null)).toBe("-");
  });

  it('returns "-" for undefined', () => {
    expect(formatPercentage(undefined)).toBe("-");
  });
});

describe("truncateText", () => {
  it("returns short text unchanged", () => {
    expect(truncateText("hello")).toBe("hello");
  });

  it("truncates text exceeding maxLength and appends ellipsis", () => {
    const long = "a".repeat(100);
    const result = truncateText(long, 10);
    expect(result).toHaveLength(10);
    expect(result.endsWith("…")).toBe(true);
  });
});
