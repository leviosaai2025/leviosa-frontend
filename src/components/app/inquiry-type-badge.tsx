import { Badge } from "@/components/ui/badge";
import type { InquiryType } from "@/types/api";

interface InquiryTypeBadgeProps {
  inquiryType: InquiryType;
}

export function InquiryTypeBadge({ inquiryType }: InquiryTypeBadgeProps) {
  if (inquiryType === "product_qna") {
    return <Badge variant="secondary">Product Q&amp;A</Badge>;
  }

  if (inquiryType === "talktalk") {
    return <Badge className="border-transparent bg-emerald-200 text-emerald-900">TalkTalk</Badge>;
  }

  return <Badge variant="outline">Customer Inquiry</Badge>;
}
