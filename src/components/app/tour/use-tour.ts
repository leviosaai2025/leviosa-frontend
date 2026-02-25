"use client";

import { useContext, useMemo } from "react";
import { TourContext } from "./tour-provider";
import type { TourName } from "./tour-steps";

export function useTour(name: TourName) {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used within <TourProvider>");
  }

  const pending = ctx.isTourPending(name);
  return useMemo(
    () => ({
      pending,
      complete: () => ctx.completeTour(name),
      reset: () => ctx.resetTour(name),
    }),
    [pending, ctx, name],
  );
}
