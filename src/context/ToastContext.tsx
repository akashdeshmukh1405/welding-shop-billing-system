"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", title?: string, duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: Toast = { id, message, type, title, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title = "Success") => showToast(message, "success", title),
    [showToast]
  );
  const error = useCallback(
    (message: string, title = "Error") => showToast(message, "error", title),
    [showToast]
  );
  const info = useCallback(
    (message: string, title = "Notice") => showToast(message, "info", title),
    [showToast]
  );
  const warning = useCallback(
    (message: string, title = "Warning") => showToast(message, "warning", title),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none no-print">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border transition-all duration-200 transform translate-y-0 ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-950 border-emerald-200"
                : toast.type === "error"
                ? "bg-red-50 text-red-950 border-red-200"
                : toast.type === "warning"
                ? "bg-amber-50 text-amber-950 border-amber-200"
                : "bg-blue-50 text-blue-950 border-blue-200"
            }`}
          >
            {toast.type === "success" && (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            )}
            {toast.type === "error" && (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            {toast.type === "warning" && (
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            )}
            {toast.type === "info" && (
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            )}

            <div className="flex-1 min-w-0">
              {toast.title && <p className="font-semibold text-sm leading-snug">{toast.title}</p>}
              <p className="text-sm opacity-90 leading-snug">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-1 -mr-1 -mt-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
