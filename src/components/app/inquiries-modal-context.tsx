"use client";

import { createContext, useContext } from "react";
import type { InquiryStatus } from "@/types/api";

interface InquiriesModalContextValue {
  openInquiriesModal: (initialStatus?: InquiryStatus) => void;
}

export const InquiriesModalContext =
  createContext<InquiriesModalContextValue | null>(null);

export function useInquiriesModal() {
  const context = useContext(InquiriesModalContext);
  if (!context) {
    throw new Error(
      "useInquiriesModal must be used within InquiriesModalContext",
    );
  }
  return context;
}
