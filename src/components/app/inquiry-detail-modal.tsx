"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/toast";

import { InquiryStatusBadge } from "@/components/app/inquiry-status-badge";
import { InquiryTypeBadge } from "@/components/app/inquiry-type-badge";
import { RiskLevelBadge } from "@/components/app/risk-level-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { inquiriesApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/api-client";
import { formatDateTime, formatPercentage } from "@/lib/format";
import type { InquiryDetail } from "@/types/api";

interface InquiryDetailModalProps {
  inquiryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionComplete?: () => void;
}

export function InquiryDetailModal({
  inquiryId,
  open,
  onOpenChange,
  onActionComplete,
}: InquiryDetailModalProps) {
  const [detail, setDetail] = useState<InquiryDetail | null>(null);
  const [editedAnswer, setEditedAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<
    "approve" | "reject" | "edit" | null
  >(null);
  const [showReasoning, setShowReasoning] = useState(false);

  const canReview = detail?.inquiry.status === "needs_review";
  const ai = detail?.ai_response;

  const loadDetail = useCallback(async () => {
    if (!inquiryId) return;
    try {
      setLoading(true);
      const response = await inquiriesApi.detail(inquiryId);
      setDetail(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [inquiryId]);

  useEffect(() => {
    if (open && inquiryId) {
      setDetail(null);
      setShowReasoning(false);
      void loadDetail();
    }
  }, [open, inquiryId, loadDetail]);

  useEffect(() => {
    setEditedAnswer(ai?.answer ?? "");
  }, [ai?.id, ai?.answer]);

  const confidenceText = useMemo(
    () => formatPercentage(ai?.confidence),
    [ai?.confidence],
  );

  const handleApprove = async () => {
    if (!inquiryId || !ai || !detail) return;
    const nextAnswer = editedAnswer.trim();
    if (!nextAnswer) {
      toast.error("Answer cannot be empty.");
      return;
    }
    try {
      setActionLoading("approve");
      if (nextAnswer !== (ai.answer?.trim() ?? "")) {
        await inquiriesApi.edit(inquiryId, { answer: nextAnswer });
      }
      await inquiriesApi.approve(inquiryId);
      const channel =
        detail.inquiry.inquiry_type === "talktalk" ? "TalkTalk" : "Naver";
      toast.success(`Answer posted to ${channel}.`);
      await loadDetail();
      onActionComplete?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!inquiryId) return;
    try {
      setActionLoading("reject");
      await inquiriesApi.reject(inquiryId);
      toast.success("Inquiry rejected.");
      await loadDetail();
      onActionComplete?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!inquiryId || !editedAnswer.trim()) {
      if (!editedAnswer.trim()) toast.error("Answer cannot be empty.");
      return;
    }
    try {
      setActionLoading("edit");
      await inquiriesApi.edit(inquiryId, { answer: editedAnswer.trim() });
      toast.success("Answer updated.");
      await loadDetail();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-6">
            <DialogHeader className="items-center text-center">
              <DialogTitle asChild>
                <div><Skeleton className="h-5 w-48 mx-auto" /></div>
              </DialogTitle>
              <DialogDescription asChild>
                <div><Skeleton className="h-4 w-32 mx-auto" /></div>
              </DialogDescription>
            </DialogHeader>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !detail ? (
          <div className="p-8 text-center">
            <DialogHeader className="items-center">
              <DialogTitle>Inquiry</DialogTitle>
              <DialogDescription>Unable to load inquiry</DialogDescription>
            </DialogHeader>
          </div>
        ) : (
          <>
            {/* Centered header */}
            <DialogHeader className="shrink-0 items-center text-center px-8 pt-8 pb-2">
              <DialogTitle className="text-lg">
                {detail.inquiry.title ?? "Untitled inquiry"}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <InquiryStatusBadge status={detail.inquiry.status} />
                  <InquiryTypeBadge inquiryType={detail.inquiry.inquiry_type} />
                </div>
              </DialogDescription>
            </DialogHeader>

            {/* Stat row */}
            <div className="grid grid-cols-3 text-center py-4 mx-8 border-b border-border">
              <div>
                <p className="text-sm font-semibold">
                  {formatDateTime(
                    detail.inquiry.naver_created_at ?? detail.inquiry.created_at,
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Created</p>
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {ai?.category ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Category</p>
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {ai ? confidenceText : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Confidence</p>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              {/* Customer message */}
              <div className="px-8 py-5">
                <h3 className="text-sm font-semibold mb-3">Customer Message</h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {detail.inquiry.message_text}
                </p>
                {detail.inquiry.product_info && (
                  <p className="text-xs text-muted-foreground/70 mt-3">
                    Product: {detail.inquiry.product_info}
                  </p>
                )}
              </div>

              <div className="h-px bg-border mx-8" />

              {/* AI response */}
              {ai ? (
                <div className="px-8 py-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">AI Draft</h3>
                    <div className="flex items-center gap-1.5">
                      {ai.risk_level && (
                        <RiskLevelBadge riskLevel={ai.risk_level} />
                      )}
                    </div>
                  </div>

                  {ai.safety_overridden && (
                    <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-md p-3">
                      <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                      <span>
                        {(ai.safety_note ?? "Flagged by safety checker").replace(/_/g, " ")}
                      </span>
                    </div>
                  )}

                  <Textarea
                    className="min-h-[120px] text-sm"
                    value={editedAnswer}
                    onChange={(e) => setEditedAnswer(e.target.value)}
                    disabled={!canReview}
                  />

                  {ai.reasoning && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowReasoning(!showReasoning)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronRight
                          className={cn(
                            "size-3 transition-transform duration-150",
                            showReasoning && "rotate-90",
                          )}
                        />
                        Reasoning
                      </button>
                      {showReasoning && (
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/50 rounded-md p-3">
                          {ai.reasoning}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="px-8 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    AI response not yet generated
                  </p>
                </div>
              )}
            </div>

            {/* Sticky bottom actions */}
            {canReview && ai && (
              <div className="shrink-0 px-8 pb-6 pt-2 space-y-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      className="w-full bg-foreground text-background hover:bg-foreground/90"
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === "approve" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Approve & Post
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Post to{" "}
                        {detail.inquiry.inquiry_type === "talktalk"
                          ? "TalkTalk"
                          : "Naver"}
                        ?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will post the answer and mark the inquiry as
                        manually posted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleApprove}>
                        Post
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-muted-foreground hover:text-foreground"
                    onClick={handleSaveEdit}
                    disabled={actionLoading !== null || !editedAnswer.trim()}
                  >
                    {actionLoading === "edit" && (
                      <Loader2 className="size-3.5 animate-spin" />
                    )}
                    Save edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-muted-foreground hover:text-destructive"
                        disabled={actionLoading !== null}
                      >
                        {actionLoading === "reject" && (
                          <Loader2 className="size-3.5 animate-spin" />
                        )}
                        Reject
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Reject this response?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          The AI draft will not be posted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReject}>
                          Reject
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
