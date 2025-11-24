"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration: number = 3000) => {
      const id = Math.random().toString(36).substring(7);
      const toast: Toast = { id, message, type, duration };
      setToasts((prev) => [...prev, toast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="size-5" />;
      case "error":
        return <AlertCircle className="size-5" />;
      case "warning":
        return <AlertTriangle className="size-5" />;
      default:
        return <Info className="size-5" />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm min-w-[300px] max-w-md animate-in slide-in-from-right",
              toast.type === "success" &&
                "bg-green-50/90 border-green-200 text-green-900 dark:bg-green-950/90 dark:border-green-800 dark:text-green-100",
              toast.type === "error" &&
                "bg-red-50/90 border-red-200 text-red-900 dark:bg-red-950/90 dark:border-red-800 dark:text-red-100",
              toast.type === "warning" &&
                "bg-yellow-50/90 border-yellow-200 text-yellow-900 dark:bg-yellow-950/90 dark:border-yellow-800 dark:text-yellow-100",
              toast.type === "info" &&
                "bg-blue-50/90 border-blue-200 text-blue-900 dark:bg-blue-950/90 dark:border-blue-800 dark:text-blue-100"
            )}
          >
            <div className="flex-shrink-0">{getIcon(toast.type)}</div>
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 rounded p-1 hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

