"use client";

import type { TooltipRenderProps } from "react-joyride";

export function TourTooltip({
  backProps,
  closeProps,
  continuous,
  index,
  primaryProps,
  skipProps,
  step,
  size,
  tooltipProps,
}: TooltipRenderProps) {
  return (
    <div
      {...tooltipProps}
      className="relative w-[360px] rounded-xl border border-neutral-700 bg-neutral-900 p-5 shadow-2xl shadow-black/40"
    >
      {/* Close button */}
      <button
        {...closeProps}
        aria-label="Close"
        className="absolute right-3 top-3 text-neutral-500 hover:text-white transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M1 1l12 12M13 1L1 13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Content */}
      {step.title && (
        <h4 className="mb-2 text-sm font-semibold text-white pr-6">
          {step.title}
        </h4>
      )}
      <div className="text-sm leading-relaxed text-neutral-300 pr-4">
        {step.content}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        {/* Skip */}
        <button
          {...skipProps}
          className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          Skip tour
        </button>

        <div className="flex items-center gap-3">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: size }).map((_, i) => (
              <div
                key={i}
                className={`size-1.5 rounded-full transition-colors ${
                  i === index ? "bg-emerald-500" : "bg-neutral-600"
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                {...backProps}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
              >
                Back
              </button>
            )}
            {continuous && (
              <button
                {...primaryProps}
                className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 transition-colors"
              >
                {index === size - 1 ? "Done" : "Next"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
