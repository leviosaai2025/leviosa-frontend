"use client";

import { motion } from "framer-motion";
import {
  Toaster as SonnerToaster,
  toast as sonnerToast,
} from "sonner";
import {
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "error" | "warning" | "loading";
type Position =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

const variantStyles: Record<Variant, string> = {
  default: "bg-card border-border text-foreground",
  success: "bg-card border-green-600/50",
  error: "bg-card border-destructive/50",
  warning: "bg-card border-amber-600/50",
  loading: "bg-card border-blue-600/50",
};

const titleColor: Record<Variant, string> = {
  default: "text-foreground",
  success: "text-green-600 dark:text-green-400",
  error: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
  loading: "text-blue-600 dark:text-blue-400",
};

const iconColor: Record<Variant, string> = {
  default: "text-muted-foreground",
  success: "text-green-600 dark:text-green-400",
  error: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
  loading: "text-blue-600 dark:text-blue-400",
};

const variantIcons: Record<
  Variant,
  React.ComponentType<{ className?: string }>
> = {
  default: Info,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  loading: Info,
};

// ---------- Styled toast renderer ----------

function StyledToast({
  toastId,
  title,
  message,
  variant,
}: {
  toastId: string | number;
  title?: string;
  message: string;
  variant: Variant;
}) {
  const Icon = variantIcons[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "relative w-full max-w-xs rounded-xl border shadow-md overflow-hidden",
        variantStyles[variant],
      )}
    >
      <div className="flex items-center justify-between p-3">
        <div className="flex items-start gap-2">
          <Icon
            className={cn("h-4 w-4 mt-0.5 flex-shrink-0", iconColor[variant])}
          />
          <div className="space-y-0.5">
            {title && (
              <h3
                className={cn(
                  "text-xs font-medium leading-none",
                  titleColor[variant],
                )}
              >
                {title}
              </h3>
            )}
            <p className="text-xs text-muted-foreground">{message}</p>
          </div>
        </div>

        <button
          onClick={() => sonnerToast.dismiss(toastId)}
          className="rounded-full p-1 hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors flex-shrink-0 ml-2"
          aria-label="Dismiss"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>

      {variant === "loading" && (
        <div className="h-1 w-full bg-blue-600/10 dark:bg-blue-400/10">
          <motion.div
            className="h-full w-2/5 rounded-full bg-blue-600 dark:bg-blue-400"
            animate={{ x: ["0%", "150%", "0%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      )}
    </motion.div>
  );
}

// ---------- Functional API (drop-in replacement for sonner's toast) ----------

interface ToastOptions {
  title?: string;
  duration?: number;
}

function showToast(message: string, variant: Variant, options?: ToastOptions) {
  return sonnerToast.custom(
    (toastId) => (
      <StyledToast
        toastId={toastId}
        title={options?.title}
        message={message}
        variant={variant}
      />
    ),
    { duration: options?.duration ?? 4000 },
  );
}

export const toast = {
  success: (message: string, options?: ToastOptions) =>
    showToast(message, "success", options),
  error: (message: string, options?: ToastOptions) =>
    showToast(message, "error", options),
  info: (message: string, options?: ToastOptions) =>
    showToast(message, "default", options),
  warning: (message: string, options?: ToastOptions) =>
    showToast(message, "warning", options),
  loading: (message: string, options?: ToastOptions) =>
    showToast(message, "loading", { ...options, duration: Infinity }),
  dismiss: sonnerToast.dismiss,
};

// ---------- Toaster container (place in layout.tsx) ----------

export function Toaster({ position = "top-right" }: { position?: Position }) {
  return (
    <SonnerToaster
      position={position}
      toastOptions={{ unstyled: true, className: "flex justify-end" }}
    />
  );
}
