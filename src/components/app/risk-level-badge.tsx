import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types/api";

const RISK_META: Record<RiskLevel, { label: string; className: string }> = {
  low: {
    label: "Low Risk",
    className: "bg-emerald-200 text-emerald-900",
  },
  medium: {
    label: "Medium Risk",
    className: "bg-amber-200 text-amber-900",
  },
  high: {
    label: "High Risk",
    className: "bg-rose-200 text-rose-900",
  },
};

interface RiskLevelBadgeProps {
  riskLevel: RiskLevel;
}

export function RiskLevelBadge({ riskLevel }: RiskLevelBadgeProps) {
  const meta = RISK_META[riskLevel];
  return <Badge className={cn("border-transparent", meta.className)}>{meta.label}</Badge>;
}
