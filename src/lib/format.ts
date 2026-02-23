import { format, formatDistanceToNow, parseISO } from "date-fns";

function parseDate(value?: string | null): Date | null {
  if (!value) return null;

  try {
    const parsed = parseISO(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function formatDateTime(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return "-";
  return format(date, "MMM d, yyyy HH:mm");
}

export function formatRelativeTime(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return "Unknown time";
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatPercentage(value?: number | null): string {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value * 100)}%`;
}

export function truncateText(value: string, maxLength = 90): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}
