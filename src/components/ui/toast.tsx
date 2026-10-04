"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastItem = {
  id: string;
  message: string;
  undoLabel?: string;
  onUndo?: () => void;
  duration?: number;
};

type ToastContextType = {
  showToast: (toast: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(({ message, undoLabel = "Hoàn tác", onUndo, duration = 4500 }: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const item: ToastItem = { id, message, undoLabel, onUndo, duration };

    setToasts((prev) => [...prev, item]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 rounded-pill bg-ink px-5 py-3 text-xs font-bold text-white shadow-nav border border-white/10 animate-in fade-in slide-in-from-bottom-3 duration-fast"
          >
            <span>{toast.message}</span>
            {toast.onUndo && (
              <button
                type="button"
                onClick={() => {
                  toast.onUndo?.();
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                }}
                className="rounded-pill bg-white/15 px-2.5 py-1 text-[11px] font-black uppercase text-pink transition hover:bg-white/25 active:scale-press"
              >
                {toast.undoLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => {},
    };
  }
  return context;
}
