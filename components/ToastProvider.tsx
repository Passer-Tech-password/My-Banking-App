"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  type: ToastType;
  message: string;
  durationMs: number;
};

type ToastContextValue = {
  push: (message: string, type?: ToastType, durationMs?: number) => void;
  success: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, type: ToastType = "info", durationMs: number = 3500) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const toast: Toast = { id, type, message, durationMs };
      setToasts((prev) => [toast, ...prev].slice(0, 5));
      window.setTimeout(() => remove(id), durationMs);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (message, durationMs) => push(message, "success", durationMs),
      error: (message, durationMs) => push(message, "error", durationMs),
      info: (message, durationMs) => push(message, "info", durationMs),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-[min(420px,calc(100vw-2rem))]">
        {toasts.map((t) => {
          const Icon =
            t.type === "success"
              ? CheckCircleIcon
              : t.type === "error"
                ? ExclamationCircleIcon
                : InformationCircleIcon;
          const accent =
            t.type === "success"
              ? "border-green-200 bg-green-50 text-green-900"
              : t.type === "error"
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-blue-200 bg-blue-50 text-blue-900";
          return (
            <div
              key={t.id}
              className={`border ${accent} rounded-xl shadow-sm px-4 py-3 flex items-start gap-3`}
              role="status"
            >
              <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="text-sm leading-snug flex-1">{t.message}</div>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="text-current/70 hover:text-current transition-colors"
                aria-label="Dismiss"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

