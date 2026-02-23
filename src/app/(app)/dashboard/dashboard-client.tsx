"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClockArrowUp,
  Inbox,
  MessageSquareText,
  RefreshCw,
  Zap,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

import { InquiryDetailModal } from "@/components/app/inquiry-detail-modal";
import { useInquiriesModal } from "@/components/app/inquiries-modal-context";
import { BentoGrid } from "@/components/ui/bento-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { dashboardApi, inquiriesApi, naverApi, talktalkApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/api-client";
import { formatTimeAgo, formatActivityData } from "@/lib/dashboard-utils";
import type { ActivityItem, DashboardPeriod, DashboardStats, InquiryResponse, InquiryStatus, NaverConnectionStatus, TalkTalkStatus } from "@/types/api";

const DashboardChart = dynamic(
  () => import("@/components/app/dashboard-chart"),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full rounded-xl" /> },
);

const INQUIRY_STATUS_STYLES: Record<InquiryStatus, { label: string; badge: string; icon: string }> = {
  pending:          { label: "Pending",      badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",      icon: "text-slate-400" },
  processing:       { label: "Processing",   badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",       icon: "text-blue-400" },
  needs_review:     { label: "Needs Review", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",   icon: "text-amber-500" },
  auto_posted:      { label: "Auto-posted",  badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: "text-emerald-500" },
  auto_posted_risky:{ label: "Risky Post",   badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", icon: "text-orange-500" },
  manually_posted:  { label: "Posted",       badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", icon: "text-violet-500" },
  rejected:         { label: "Rejected",     badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",        icon: "text-rose-500" },
  failed:           { label: "Failed",       badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",            icon: "text-red-500" },
};

const PERIOD_OPTIONS: Array<{ label: string; value: DashboardPeriod }> = [
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "All time", value: "all" },
];

const BENTO_CARD_BASE = cn(
  "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl",
  "bg-white/80 backdrop-blur-sm border border-white/60",
  "[box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
  "transform-gpu dark:bg-black dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
);

const SPARKLINE_PATHS = [
  "M0 28 C8 24, 16 30, 24 22 S40 18, 48 24 S64 12, 72 16 S88 8, 96 14 S112 20, 120 10",
  "M0 20 C8 26, 16 18, 24 24 S40 28, 48 20 S64 26, 72 22 S88 28, 96 18 S112 14, 120 22",
  "M0 24 C8 18, 16 26, 24 14 S40 22, 48 16 S64 24, 72 10 S88 18, 96 12 S112 22, 120 8",
  "M0 26 C8 22, 16 28, 24 18 S40 24, 48 14 S64 20, 72 26 S88 16, 96 22 S112 12, 120 18",
  "M0 22 C8 16, 16 24, 24 20 S40 14, 48 22 S64 18, 72 28 S88 14, 96 20 S112 26, 120 16",
];

function Sparkline({ color, index }: { color: string; index: number }) {
  const path = SPARKLINE_PATHS[index % SPARKLINE_PATHS.length];
  return (
    <svg
      viewBox="0 0 120 36"
      fill="none"
      className="pointer-events-none absolute bottom-4 right-5 z-10 h-8 w-24 opacity-60"
      preserveAspectRatio="none"
    >
      <path d={path} stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({
  Icon,
  label,
  value,
  description,
  onClick,
  cta,
  className,
  numberClassName,
  iconClassName,
  sparklineColor,
  sparklineIndex = 0,
  urgent,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  description: string;
  onClick: () => void;
  cta: string;
  className?: string;
  numberClassName?: string;
  iconClassName?: string;
  sparklineColor?: string;
  sparklineIndex?: number;
  urgent?: boolean;
}) {
  const showUrgent = urgent && value > 0;

  return (
    <div className={cn(BENTO_CARD_BASE, showUrgent && "ring-2 ring-amber-400/60 dark:ring-amber-500/40 shadow-[0_0_24px_-4px_rgba(245,158,11,0.25)] dark:shadow-[0_0_24px_-4px_rgba(245,158,11,0.15)]", className)}>
      <span className={cn(
        "pointer-events-none absolute right-4 top-2 select-none text-[5.5rem] font-black leading-none tracking-tighter bg-clip-text text-transparent",
        showUrgent
          ? "bg-gradient-to-br from-amber-400/40 to-amber-600/20"
          : numberClassName ?? "bg-gradient-to-br from-foreground/25 to-foreground/10",
      )}>
        {value}
      </span>

      {sparklineColor && (
        <Sparkline color={sparklineColor} index={sparklineIndex} />
      )}

      <div className="pointer-events-none z-10 p-5 pb-0">
        <div className={cn(
          "flex size-9 items-center justify-center rounded-lg",
          showUrgent
            ? "bg-transparent"
            : iconClassName ?? "bg-transparent",
        )}>
          <Icon className={cn(
            "size-5 transform-gpu transition-all duration-300 ease-in-out group-hover:scale-90",
            showUrgent ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
          )} />
        </div>
      </div>

      <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 px-5 pb-5 pt-3 transition-all duration-300 group-hover:-translate-y-10">
        <div className="flex items-center gap-2">
          <h3 className={cn(
            "text-base font-semibold tracking-tight",
            showUrgent ? "text-amber-900 dark:text-amber-100" : "text-foreground",
          )}>
            {label}
          </h3>
          {showUrgent && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500 opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-amber-500" />
              </span>
              Action needed
            </span>
          )}
        </div>
        <p className={cn(
          "text-sm",
          showUrgent ? "text-amber-700/80 dark:text-amber-300/70" : "text-muted-foreground",
        )}>{description}</p>
      </div>

      <div className={cn(
        "pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100",
      )}>
        <Button variant={showUrgent ? "default" : "ghost"} size="sm" className={cn(
          "pointer-events-auto",
          showUrgent
            ? "bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400"
            : "bg-white/80 hover:bg-white dark:bg-white/10 dark:hover:bg-white/20",
        )} onClick={onClick}>
          {cta}
          <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>
      <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-white/[.15] group-hover:dark:bg-white/[.03]" />
    </div>
  );
}

export function DashboardClient() {
  const { openInquiriesModal } = useInquiriesModal();

  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [period, setPeriod] = useState<DashboardPeriod>("all");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [queue, setQueue] = useState<InquiryResponse[]>([]);
  const [naverStatus, setNaverStatus] = useState<NaverConnectionStatus | null>(null);
  const [talktalkStatus, setTalktalkStatus] = useState<TalkTalkStatus | null>(null);
  const [queueStatus, setQueueStatus] = useState<InquiryStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadQueue = useCallback(async () => {
    try {
      const response = await inquiriesApi.list({
        page: 1,
        page_size: 20,
        status: queueStatus === "all" ? undefined : queueStatus,
      });
      setQueue(response.data);
    } catch {
      // silent — queue is non-critical
    }
  }, [queueStatus]);

  const loadDashboardData = useCallback(async (initial = false) => {
    try {
      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const [statsResponse, activityResponse, naverStatusResponse, talktalkResponse] = await Promise.all([
        dashboardApi.stats(period),
        dashboardApi.activity(20),
        naverApi.status(),
        talktalkApi.status(),
      ]);

      setStats(statsResponse.data);
      setActivity(activityResponse.data);
      setNaverStatus(naverStatusResponse.data);
      setTalktalkStatus(talktalkResponse.data);
    } catch (error) {
      if (initial) {
        toast.error(getErrorMessage(error));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  // Keep refs so the interval/visibility callbacks never go stale
  const loadRef = useRef(loadDashboardData);
  loadRef.current = loadDashboardData;
  const loadQueueRef = useRef(loadQueue);
  loadQueueRef.current = loadQueue;

  // Full dashboard load on mount + period change, with Page Visibility API
  useEffect(() => {
    void loadDashboardData(true);
    void loadQueueRef.current();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadRef.current(false);
        void loadQueueRef.current();
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadRef.current(false);
        void loadQueueRef.current();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadDashboardData]);

  // Queue-only reload on status filter change
  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const periodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? "Today";
  const chartData = useMemo(() => formatActivityData(activity), [activity]);

  const handleActionComplete = useCallback(() => {
    void loadDashboardData(false);
  }, [loadDashboardData]);

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col gap-6 max-w-6xl mx-auto">
      <div className="pointer-events-none absolute -top-8 left-0 right-0 h-64" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">CS Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {periodLabel} — automation stats and recent worker activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(value) => setPeriod(value as DashboardPeriod)}>
            <SelectTrigger className="w-auto border-none bg-transparent shadow-none text-muted-foreground hover:text-foreground transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="gap-1.5 rounded-sm border-none font-normal text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", naverStatus?.is_connected ? "bg-emerald-500" : "bg-destructive")} />
            {naverStatus?.is_connected ? "Naver" : "Naver Offline"}
          </Badge>
          <Badge variant="outline" className="gap-1.5 rounded-sm border-none font-normal text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", talktalkStatus?.talktalk_enabled ? "bg-emerald-500" : "bg-muted-foreground/40")} />
            {talktalkStatus?.talktalk_enabled ? "TalkTalk" : "TalkTalk Off"}
          </Badge>
          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-full bg-muted/50 text-muted-foreground hover:text-foreground"
            onClick={() => void loadDashboardData(false)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="min-h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : stats ? (
        <div className="flex flex-1 flex-col gap-4">
          {/* Stat cards */}
          <BentoGrid className="flex-1 auto-rows-[minmax(10rem,1fr)] lg:grid-rows-[1fr_1fr]">
            <StatCard
              Icon={AlertCircle}
              label="Needs Review"
              value={stats.needs_review}
              description={`${stats.needs_review} inquiries awaiting your review`}
              onClick={() => openInquiriesModal("needs_review")}
              cta="Open review queue"
              urgent
              sparklineColor="#d97706"
              sparklineIndex={0}
              className="lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3 border-amber-300/70 bg-gradient-to-br from-amber-100/90 to-orange-100/70 dark:border-amber-700/40 dark:from-amber-950/40 dark:to-orange-950/30"
            />
            <StatCard
              Icon={Activity}
              label="Total Inquiries"
              value={stats.total_inquiries}
              description={`All statuses${stats.failed > 0 ? ` incl. ${stats.failed} failed` : ""} — ${periodLabel.toLowerCase()}`}
              onClick={() => openInquiriesModal()}
              cta="View all inquiries"
              sparklineColor="#3b82f6"
              sparklineIndex={1}
              className="lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2 border-blue-300/60 bg-gradient-to-br from-blue-100/80 to-indigo-100/60 dark:from-blue-950/30 dark:to-indigo-950/20"
              numberClassName="bg-gradient-to-br from-blue-500/45 to-indigo-500/25"
            />
            <StatCard
              Icon={Zap}
              label="Auto-posted"
              value={stats.auto_posted}
              description={`${stats.auto_posted} posted automatically`}
              onClick={() => openInquiriesModal("auto_posted")}
              cta="View auto-posted"
              sparklineColor="#10b981"
              sparklineIndex={2}
              className="lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-2 border-emerald-300/60 bg-gradient-to-br from-emerald-100/80 to-teal-100/60 dark:from-emerald-950/30 dark:to-teal-950/20"
              numberClassName="bg-gradient-to-br from-emerald-500/45 to-teal-500/25"
            />
            <StatCard
              Icon={ClockArrowUp}
              label="Rejected"
              value={stats.rejected}
              description={`${stats.rejected} responses rejected`}
              onClick={() => openInquiriesModal("rejected")}
              cta="View rejected"
              sparklineColor="#f43f5e"
              sparklineIndex={3}
              className="lg:col-start-2 lg:col-end-3 lg:row-start-2 lg:row-end-3 border-rose-300/60 bg-gradient-to-br from-rose-100/80 to-pink-100/60 dark:from-rose-950/30 dark:to-pink-950/20"
              numberClassName="bg-gradient-to-br from-rose-500/45 to-pink-500/25"
            />
            <StatCard
              Icon={CheckCircle2}
              label="Manually Posted"
              value={stats.manually_posted}
              description={`${stats.manually_posted} reviewed and posted`}
              onClick={() => openInquiriesModal("manually_posted")}
              cta="View manual posts"
              sparklineColor="#8b5cf6"
              sparklineIndex={4}
              className="lg:col-start-3 lg:col-end-4 lg:row-start-2 lg:row-end-3 border-violet-300/60 bg-gradient-to-br from-violet-100/80 to-purple-100/60 dark:from-violet-950/30 dark:to-purple-950/20"
              numberClassName="bg-gradient-to-br from-violet-500/45 to-purple-500/25"
            />
          </BentoGrid>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            {/* Activity chart */}
            <div className={cn(BENTO_CARD_BASE, "lg:col-span-3 flex flex-col bg-gradient-to-br from-white/90 to-slate-50/50")}>
              <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    Worker Activity
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Total fetched and auto-posted inquiries over time
                  </p>
                </div>
              </div>

              <DashboardChart chartData={chartData} />
            </div>

            {/* Inquiry Queue */}
            <div className={cn(BENTO_CARD_BASE, "lg:col-span-2 flex max-h-[320px] flex-col bg-gradient-to-br from-white/90 to-blue-50/20")}>
              <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    Inquiry Queue
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Latest inquiries
                  </p>
                </div>
                <Select
                  value={queueStatus}
                  onValueChange={(value) => setQueueStatus(value as InquiryStatus | "all")}
                >
                  <SelectTrigger className="w-auto border-none bg-transparent shadow-none text-xs text-muted-foreground hover:text-foreground transition-colors h-auto py-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="needs_review">Needs Review</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="auto_posted">Auto-posted</SelectItem>
                    <SelectItem value="manually_posted">Manually Posted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                {queue.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
                    <Inbox className="size-8 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">No inquiries yet</p>
                    <p className="text-xs text-muted-foreground/70">New inquiries will appear here.</p>
                  </div>
                ) : (
                  <ul className="flex flex-1 flex-col divide-y divide-border/40 overflow-y-auto">
                    {queue.map((inquiry) => {
                      const age = formatTimeAgo(inquiry.created_at);
                      const statusStyle = INQUIRY_STATUS_STYLES[inquiry.status];
                      return (
                        <li key={inquiry.id}>
                          <button
                            type="button"
                            onClick={() => { setSelectedInquiryId(inquiry.id); setModalOpen(true); }}
                            className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40"
                          >
                            <MessageSquareText className={cn("mt-0.5 size-4 flex-shrink-0", statusStyle.icon)} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {inquiry.title || inquiry.message_text.slice(0, 50)}
                                </p>
                              </div>
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none", statusStyle.badge)}>
                                  {statusStyle.label}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  · {inquiry.inquiry_type === "talktalk" ? "TalkTalk" : "Naver"} · {age}
                                </span>
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <InquiryDetailModal
        inquiryId={selectedInquiryId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onActionComplete={handleActionComplete}
      />
    </div>
  );
}
