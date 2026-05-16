"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";
interface Toast { id: number; message: string; type: ToastType; }

const ToastCtx = createContext<{ toast: (msg: string, type?: ToastType) => void }>({
  toast: () => {},
});

let _id = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const remove = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const iconMap = { success: CheckCircle2, error: XCircle, info: Info };
  const colorMap = {
    success: "border-emerald-800 bg-emerald-950/90 text-emerald-300",
    error:   "border-red-800 bg-red-950/90 text-red-300",
    info:    "border-sky-800 bg-sky-950/90 text-sky-300",
  };

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-full">
        {toasts.map(t => {
          const Icon = iconMap[t.type];
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-sm ${colorMap[t.type]} animate-in slide-in-from-bottom-2`}
            >
              <Icon size={16} className="mt-0.5 flex-shrink-0" />
              <span className="flex-1">{t.message}</span>
              <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
