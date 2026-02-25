"use client";

import { useContext } from "react";
import { TourContext } from "./tour-provider";
import type { TourName } from "./tour-steps";

export function useTour(name: TourName) {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used within <TourProvider>");
  }

  return {
    pending: ctx.isTourPending(name),
    complete: () => ctx.completeTour(name),
    reset: () => ctx.resetTour(name),
  };
}
