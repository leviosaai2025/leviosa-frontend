import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InquiryStatus } from "@/types/api";

const STATUS_META: Record<
  InquiryStatus,
  {
    label: string;
    className: string;
    loading?: boolean;
  }
> = {
  pending: {
    label: "Pending",
    className: "bg-slate-200 text-slate-800",
  },
  processing: {
    label: "Processing",
    className: "bg-slate-200 text-slate-800",
    loading: true,
  },
  needs_review: {
    label: "Needs Review",
    className: "bg-amber-200 text-amber-900",
  },
  auto_posted: {
    label: "Auto-posted",
    className: "bg-emerald-200 text-emerald-900",
  },
  auto_posted_risky: {
    label: "Auto-posted (Risky)",
    className: "bg-amber-200 text-amber-900",
  },
  manually_posted: {
    label: "Manually Posted",
    className: "bg-sky-200 text-sky-900",
  },
  rejected: {
    label: "Rejected",
    className: "bg-rose-200 text-rose-900",
  },
  failed: {
    label: "Failed",
    className: "bg-rose-200 text-rose-900",
  },
};

interface InquiryStatusBadgeProps {
  status: InquiryStatus;
}

export function InquiryStatusBadge({ status }: InquiryStatusBadgeProps) {
  const meta = STATUS_META[status];

  return (
    <Badge className={cn("gap-1.5 border-transparent", meta.className)}>
      {meta.loading ? <Loader2 className="size-3 animate-spin" /> : null}
      {meta.label}
    </Badge>
  );
}
