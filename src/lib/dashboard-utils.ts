import type { ActivityItem } from "@/types/api";

export interface FormattedActivityPoint {
  time: string;
  fetched: number;
  autoPosted: number;
}

export function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function formatActivityData(items: ActivityItem[]): FormattedActivityPoint[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return sorted.map((item) => {
    const d = new Date(item.created_at);
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    const time = `${h12}:${String(m).padStart(2, "0")} ${ampm}`;

    const fetched = typeof item.event_data?.total_fetched === "number"
      ? item.event_data.total_fetched
      : 0;
    const autoPosted = typeof item.event_data?.auto_posted === "number"
      ? item.event_data.auto_posted
      : 0;

    return { time, fetched, autoPosted };
  });
}
