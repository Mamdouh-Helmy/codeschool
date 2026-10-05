"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import s from "./Notify.module.css";

export type NotifyType = "success" | "error" | "warning" | "info";

export interface NotifyOptions {
  type?: NotifyType;
  title: string;
  message?: string;
  /** بالمللي ثانية. 0 = مفيش إغلاق تلقائي */
  duration?: number;
  /** بيتنفذ بعد ما الإشعار يتقفل (تلقائي أو بالضغط) */
  onClose?: () => void;
}

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

const DEFAULT_DURATION: Record<NotifyType, number> = {
  success: 1800,
  info: 3000,
  warning: 3500,
  error: 0,
};

export function useNotify() {
  const [state, setState] = useState<(NotifyOptions & { type: NotifyType; id: number }) | null>(null);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cbRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setState(null);
    const cb = cbRef.current;
    cbRef.current = undefined;
    cb?.();
  }, []);

  const notify = useCallback(
    (opts: NotifyOptions) => {
      if (timer.current) clearTimeout(timer.current);
      const type = opts.type ?? "info";
      const duration = opts.duration ?? DEFAULT_DURATION[type];
      cbRef.current = opts.onClose;
      setState({ ...opts, type, duration, id: Date.now() });
      if (duration > 0) timer.current = setTimeout(close, duration);
    },
    [close]
  );

  // Esc للإغلاق
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, close]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const Icon = state ? ICONS[state.type] : null;

  const notifyHost = mounted
    ? createPortal(
        <AnimatePresence>
          {state && Icon && (
            <motion.div
              key={state.id}
              className={s.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
            >
              <motion.div
                role="alertdialog"
                aria-live="assertive"
                dir="auto"
                className={`${s.card} ${s[state.type]}`}
                initial={{ opacity: 0, scale: 0.85, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button type="button" className={s.closeX} onClick={close} aria-label="إغلاق">
                  <X size={16} />
                </button>

                <div className={s.iconWrap}>
                  <span className={s.ring} />
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.12, type: "spring", stiffness: 420, damping: 16 }}
                  >
                    <Icon size={38} strokeWidth={2.2} />
                  </motion.div>
                </div>

                <h3 className={s.title}>{state.title}</h3>
                {state.message && <p className={s.message}>{state.message}</p>}

                <button type="button" className={s.okBtn} onClick={close} autoFocus>
                  حسناً
                </button>

                {!!state.duration && state.duration > 0 && (
                  <span
                    className={s.progress}
                    style={{ animationDuration: `${state.duration}ms` }}
                  />
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )
    : null;

  return { notify, notifyHost };
}