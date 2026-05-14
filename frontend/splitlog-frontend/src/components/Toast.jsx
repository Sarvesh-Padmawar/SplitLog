import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";
import { getToastListeners, setToastListeners } from "./toastStore";

/* ──────────────── Container ──────────────── */
export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, toast.duration);
    };

    const currentListeners = getToastListeners();
    setToastListeners([...currentListeners, handler]);
    
    return () => {
      const filtered = getToastListeners().filter((fn) => fn !== handler);
      setToastListeners(filtered);
    };
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onDismiss={dismiss} />
      ))}
    </div>
  );
}

/* ──────────────── Single Toast ──────────────── */
const iconMap = {
  success: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
  error: <XCircle className="w-5 h-5 text-red-400 shrink-0" />,
  info: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
};

const borderMap = {
  success: "border-emerald-500/30",
  error: "border-red-500/30",
  info: "border-blue-500/30",
};

function Toast({ id, message, type, onDismiss }) {
  return (
    <div
      className={`
        pointer-events-auto
        flex items-center gap-3
        px-4 py-3 rounded-xl min-w-[280px] max-w-sm
        glass-strong ${borderMap[type]}
        animate-slideInRight
        text-sm text-gray-200
      `}
    >
      {iconMap[type]}
      <span className="flex-1">{message}</span>
      <button
        onClick={() => onDismiss(id)}
        className="text-gray-500 hover:text-gray-300 transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
