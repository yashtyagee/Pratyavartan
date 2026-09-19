"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, ShieldAlert, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "RECOVERED" | "SECURITY_ALERT" | "CRITICAL" | "INFO";
  title: string;
  message: string;
}

interface ToastSystemProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastSystem({ toasts, onDismiss }: ToastSystemProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex max-w-sm flex-col gap-2.5 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          let borderStyle = "border-accent/40 bg-accent/10 text-accent";
          let Icon = CheckCircle2;

          if (toast.type === "RECOVERED") {
            borderStyle = "border-recovered/40 bg-recovered/15 text-recovered";
            Icon = CheckCircle2;
          } else if (toast.type === "SECURITY_ALERT") {
            borderStyle = "border-critical/40 bg-critical/15 text-critical";
            Icon = ShieldAlert;
          } else if (toast.type === "CRITICAL") {
            borderStyle = "border-critical/40 bg-critical/15 text-critical";
            Icon = AlertTriangle;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className={`glass pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl ${borderStyle}`}
            >
              <div className="mt-0.5 shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 font-mono text-xs">
                <p className="font-bold text-white">{toast.title}</p>
                <p className="mt-0.5 text-text/80 leading-relaxed">{toast.message}</p>
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 text-muted hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
