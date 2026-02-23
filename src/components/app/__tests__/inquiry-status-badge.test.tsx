import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InquiryStatusBadge } from "@/components/app/inquiry-status-badge";
import type { InquiryStatus } from "@/types/api";

const statusLabels: Record<InquiryStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  needs_review: "Needs Review",
  auto_posted: "Auto-posted",
  auto_posted_risky: "Auto-posted (Risky)",
  manually_posted: "Manually Posted",
  rejected: "Rejected",
  failed: "Failed",
};

describe("InquiryStatusBadge", () => {
  for (const [status, label] of Object.entries(statusLabels)) {
    it(`renders "${label}" for status "${status}"`, () => {
      render(<InquiryStatusBadge status={status as InquiryStatus} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  }

  it("renders a spinner icon for processing status", () => {
    const { container } = render(<InquiryStatusBadge status="processing" />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("does not render a spinner for non-processing status", () => {
    const { container } = render(<InquiryStatusBadge status="pending" />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).not.toBeInTheDocument();
  });
});
