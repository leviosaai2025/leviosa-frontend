"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Inbox } from "lucide-react";
import { toast } from "@/components/ui/toast";

import { InquiryDetailModal } from "@/components/app/inquiry-detail-modal";
import { InquiryStatusBadge } from "@/components/app/inquiry-status-badge";
import { InquiryTypeBadge } from "@/components/app/inquiry-type-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { inquiriesApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/api-client";
import { formatDateTime, truncateText } from "@/lib/format";
import type {
  InquiryStatus,
  InquiryType,
  ListResponse,
  InquiryResponse,
} from "@/types/api";

const STATUS_FILTERS: Array<{ label: string; value: InquiryStatus | "all" }> = [
  { label: "All Statuses", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Processing", value: "processing" },
  { label: "Needs Review", value: "needs_review" },
  { label: "Auto-posted", value: "auto_posted" },
  { label: "Auto-posted (Risky)", value: "auto_posted_risky" },
  { label: "Manually Posted", value: "manually_posted" },
  { label: "Rejected", value: "rejected" },
  { label: "Failed", value: "failed" },
];

const TYPE_FILTERS: Array<{ label: string; value: InquiryType | "all" }> = [
  { label: "All Types", value: "all" },
  { label: "Customer Inquiry", value: "customer_inquiry" },
  { label: "Product Q&A", value: "product_qna" },
  { label: "TalkTalk", value: "talktalk" },
];

const PAGE_SIZE = 10;

interface InquiriesListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStatus?: InquiryStatus;
}

export function InquiriesListModal({
  open,
  onOpenChange,
  initialStatus,
}: InquiriesListModalProps) {
  const [status, setStatus] = useState<InquiryStatus | "all">(
    initialStatus ?? "all",
  );
  const [inquiryType, setInquiryType] = useState<InquiryType | "all">("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse<InquiryResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState(false);

  const totalPages = useMemo(() => {
    const total = data?.total ?? 0;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  }, [data?.total]);

  const loadInquiries = useCallback(
    async (initial = false) => {
      try {
        if (initial) {
          setLoading(true);
        } else {
          // silent refresh
        }

        const response = await inquiriesApi.list({
          status: status === "all" ? undefined : status,
          inquiry_type: inquiryType === "all" ? undefined : inquiryType,
          page,
          page_size: PAGE_SIZE,
        });

        setData(response);
      } catch (error) {
        if (initial) {
          toast.error(getErrorMessage(error));
        }
      } finally {
        setLoading(false);
      }
    },
    [inquiryType, page, status],
  );

  // Reset and load when modal opens
  useEffect(() => {
    if (open) {
      setStatus(initialStatus ?? "all");
      setInquiryType("all");
      setPage(1);
      setData(null);
      setLoading(true);
    }
  }, [open, initialStatus]);

  // Load data when filters/page change
  useEffect(() => {
    if (!open) return;
    void loadInquiries(true);

    const intervalId = window.setInterval(() => {
      void loadInquiries(false);
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [open, loadInquiries]);

  const handleRowClick = (id: string) => {
    setSelectedInquiryId(id);
    setDetailOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
            <DialogTitle className="text-lg">Inquiries</DialogTitle>
            <div className="flex items-center gap-2">
              <DialogDescription className="flex-1">
                {data
                  ? `${data.total} total`
                  : "Loading"}{" "}
                — review incoming inquiries and AI-generated drafts.
              </DialogDescription>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as InquiryStatus | "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-auto shrink-0 border-none bg-transparent shadow-none text-xs text-muted-foreground hover:text-foreground transition-colors h-auto py-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={inquiryType}
                onValueChange={(value) => {
                  setInquiryType(value as InquiryType | "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-auto shrink-0 border-none bg-transparent shadow-none text-xs text-muted-foreground hover:text-foreground transition-colors h-auto py-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_FILTERS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto border-t border-border/50">
            {loading ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : data && data.data.length > 0 ? (
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead className="w-[160px]">Title</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-[100px]">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer border-border/40 transition-colors hover:bg-muted/30"
                      onClick={() => handleRowClick(item.id)}
                    >
                      <TableCell>
                        <InquiryStatusBadge status={item.status} />
                      </TableCell>
                      <TableCell>
                        <InquiryTypeBadge inquiryType={item.inquiry_type} />
                      </TableCell>
                      <TableCell
                        className="truncate font-medium"
                        title={item.title ?? undefined}
                      >
                        {item.title ?? "(No title)"}
                      </TableCell>
                      <TableCell
                        className="truncate text-muted-foreground"
                        title={item.message_text}
                      >
                        {truncateText(item.message_text, 50)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(
                          item.naver_created_at ?? item.created_at,
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 p-12">
                <Inbox className="size-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">
                  No inquiries yet
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Connect your Naver account and enable automation to get
                  started.
                </p>
              </div>
            )}
          </div>

          {data && data.data.length > 0 && (
            <div className="shrink-0 flex items-center justify-between border-t border-border/50 px-6 py-2.5">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages} ({data.total} total)
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ArrowLeft className="size-3.5" />
                  Prev
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <InquiryDetailModal
        inquiryId={selectedInquiryId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onActionComplete={() => void loadInquiries(false)}
      />
    </>
  );
}
