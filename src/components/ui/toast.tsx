"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

type ToastListener = (toast: ToastItem) => void;

const listeners: Set<ToastListener> = new Set();

export function toast(
  message: string,
  options?: { type?: ToastType; action?: ToastAction }
) {
  const item: ToastItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message,
    type: options?.type ?? "info",
    action: options?.action,
  };
  listeners.forEach((listener) => listener(item));
}

toast.success = (message: string, options?: { action?: ToastAction }) =>
  toast(message, { type: "success", action: options?.action });
toast.error = (message: string, options?: { action?: ToastAction }) =>
  toast(message, { type: "error", action: options?.action });
toast.info = (message: string, options?: { action?: ToastAction }) =>
  toast(message, { type: "info", action: options?.action });
toast.warning = (message: string, options?: { action?: ToastAction }) =>
  toast(message, { type: "warning", action: options?.action });

export function Toaster() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    const handleNewToast: ToastListener = (newToast) => {
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 4000);
    };

    listeners.add(handleNewToast);
    return () => {
      listeners.delete(handleNewToast);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((t) => {
        const isError = t.type === "error";
        const isSuccess = t.type === "success";
        const isWarning = t.type === "warning";

        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-xl border-[1.5px] border-[#0F172A] bg-white p-3.5 shadow-[3px_3px_0px_0px_#0F172A] animate-in fade-in slide-in-from-bottom-2 duration-150"
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && (
                <CheckCircle2 className="size-4 text-[#16A34A]" />
              )}
              {isError && (
                <AlertCircle className="size-4 text-[#DC2626]" />
              )}
              {isWarning && (
                <AlertTriangle className="size-4 text-[#D97706]" />
              )}
              {!isSuccess && !isError && !isWarning && (
                <Info className="size-4 text-[#2563EB]" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#0F172A] leading-snug">
                {t.message}
              </p>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onClick();
                    removeToast(t.id);
                  }}
                  className="mt-1 text-xs font-bold text-[#0F172A] underline hover:text-slate-700 cursor-pointer"
                >
                  {t.action.label}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="shrink-0 rounded p-0.5 text-slate-400 hover:text-[#0F172A] cursor-pointer"
              aria-label="Close notification"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

