import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InquiryTypeBadge } from "@/components/app/inquiry-type-badge";

describe("InquiryTypeBadge", () => {
  it('renders "Product Q&A" for product_qna', () => {
    render(<InquiryTypeBadge inquiryType="product_qna" />);
    expect(screen.getByText("Product Q&A")).toBeInTheDocument();
  });

  it('renders "TalkTalk" for talktalk', () => {
    render(<InquiryTypeBadge inquiryType="talktalk" />);
    expect(screen.getByText("TalkTalk")).toBeInTheDocument();
  });

  it('renders "Customer Inquiry" for customer_inquiry', () => {
    render(<InquiryTypeBadge inquiryType="customer_inquiry" />);
    expect(screen.getByText("Customer Inquiry")).toBeInTheDocument();
  });
});
