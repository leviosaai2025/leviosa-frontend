import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatActivityData, formatTimeAgo } from "@/lib/dashboard-utils";
import type { ActivityItem } from "@/types/api";

describe("formatTimeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for timestamps within the last minute', () => {
    expect(formatTimeAgo("2025-06-15T11:59:30Z")).toBe("just now");
  });

  it('returns "Xm ago" for timestamps within the last hour', () => {
    expect(formatTimeAgo("2025-06-15T11:45:00Z")).toBe("15m ago");
  });

  it('returns "Xh ago" for timestamps within the last day', () => {
    expect(formatTimeAgo("2025-06-15T09:00:00Z")).toBe("3h ago");
  });

  it('returns "Xd ago" for timestamps older than a day', () => {
    expect(formatTimeAgo("2025-06-13T12:00:00Z")).toBe("2d ago");
  });
});

describe("formatActivityData", () => {
  it("returns empty array for empty input", () => {
    expect(formatActivityData([])).toEqual([]);
  });

  it("sorts by created_at ascending", () => {
    const items: ActivityItem[] = [
      { event_type: "poll", event_data: { total_fetched: 5, auto_posted: 2 }, created_at: "2025-06-15T14:00:00Z" },
      { event_type: "poll", event_data: { total_fetched: 3, auto_posted: 1 }, created_at: "2025-06-15T10:00:00Z" },
    ];
    const result = formatActivityData(items);
    expect(result[0].fetched).toBe(3);
    expect(result[1].fetched).toBe(5);
  });

  it("extracts fetched and autoPosted fields", () => {
    const items: ActivityItem[] = [
      { event_type: "poll", event_data: { total_fetched: 10, auto_posted: 4 }, created_at: "2025-06-15T10:30:00Z" },
    ];
    const result = formatActivityData(items);
    expect(result[0]).toEqual(
      expect.objectContaining({ fetched: 10, autoPosted: 4 }),
    );
  });

  it("defaults to 0 when event_data is null", () => {
    const items: ActivityItem[] = [
      { event_type: "poll", event_data: null, created_at: "2025-06-15T10:00:00Z" },
    ];
    const result = formatActivityData(items);
    expect(result[0].fetched).toBe(0);
    expect(result[0].autoPosted).toBe(0);
  });

  it("formats time as 12-hour with AM/PM", () => {
    const items: ActivityItem[] = [
      { event_type: "poll", event_data: { total_fetched: 1, auto_posted: 0 }, created_at: "2025-06-15T15:05:00Z" },
    ];
    const result = formatActivityData(items);
    // Time depends on local timezone, so just verify format
    expect(result[0].time).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
  });
});
