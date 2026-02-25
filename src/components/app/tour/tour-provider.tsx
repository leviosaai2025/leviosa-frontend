"use client";

import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { TourName } from "./tour-steps";
import { TOUR_STORAGE_KEYS } from "./tour-steps";

interface TourContextValue {
  isTourPending: (name: TourName) => boolean;
  completeTour: (name: TourName) => void;
  resetTour: (name: TourName) => void;
}

export const TourContext = createContext<TourContextValue | null>(null);

function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    if (value) {
      localStorage.setItem(key, "true");
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // localStorage unavailable
  }
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [seen, setSeen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const [, storageKey] of Object.entries(TOUR_STORAGE_KEYS)) {
      initial[storageKey] = readFlag(storageKey);
    }
    return initial;
  });

  const isTourPending = useCallback(
    (name: TourName) => {
      const key = TOUR_STORAGE_KEYS[name];
      return !seen[key];
    },
    [seen],
  );

  const completeTour = useCallback((name: TourName) => {
    const key = TOUR_STORAGE_KEYS[name];
    writeFlag(key, true);
    setSeen((prev) => ({ ...prev, [key]: true }));

    const mainTours: TourName[] = ["search", "results", "dashboard"];
    const allKeys = mainTours.map((t) => TOUR_STORAGE_KEYS[t]);
    const allDone = allKeys.every((k) => k === key || readFlag(k));
    if (allDone) {
      writeFlag("hasSeenTour", true);
    }
  }, []);

  const resetTour = useCallback((name: TourName) => {
    const key = TOUR_STORAGE_KEYS[name];
    writeFlag(key, false);
    setSeen((prev) => ({ ...prev, [key]: false }));
    writeFlag("hasSeenTour", false);
  }, []);

  const value = useMemo(
    () => ({ isTourPending, completeTour, resetTour }),
    [isTourPending, completeTour, resetTour],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
