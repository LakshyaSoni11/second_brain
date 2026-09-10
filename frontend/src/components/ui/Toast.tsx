import React, { useEffect, useState } from "react";

interface Toast {
  id: number;
  message: string;
  type: "error" | "success";
}

type ToastOptions = { type?: "error" | "success" };

// Minimal pub/sub so we can fire toasts without a context provider wrapper.
const listeners = new Set<(t: Toast) => void>();
let idCounter = 0;

export const toast = (message: string, opts: ToastOptions = {}): void => {
  const t: Toast = { id: ++idCounter, message, type: opts.type ?? "error" };
  listeners.forEach((fn) => fn(t));
};

export const Toaster: React.FC = () => {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const add = (t: Toast) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 3500);
    };
    listeners.add(add);
    return () => {
      listeners.delete(add);
    };
  }, []);

  if (items.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg border ${
            t.type === "error"
              ? "bg-red-500/90 border-red-400 text-white"
              : "bg-green-500/90 border-green-400 text-white"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
};