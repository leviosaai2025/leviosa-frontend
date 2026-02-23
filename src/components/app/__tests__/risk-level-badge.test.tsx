import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RiskLevelBadge } from "@/components/app/risk-level-badge";

describe("RiskLevelBadge", () => {
  it('renders "Low Risk" for low', () => {
    render(<RiskLevelBadge riskLevel="low" />);
    expect(screen.getByText("Low Risk")).toBeInTheDocument();
  });

  it('renders "Medium Risk" for medium', () => {
    render(<RiskLevelBadge riskLevel="medium" />);
    expect(screen.getByText("Medium Risk")).toBeInTheDocument();
  });

  it('renders "High Risk" for high', () => {
    render(<RiskLevelBadge riskLevel="high" />);
    expect(screen.getByText("High Risk")).toBeInTheDocument();
  });
});
