"use client";
import React, { useEffect } from "react";
import { X } from "lucide-react";

/**
 * ModalShell
 * ──────────────────────────────────────────────────────────────────────────
 * One consistent container for every modal in the sessions area.
 *
 * Fixes the old problem where each modal built its own
 * `fixed inset-0 ... max-w-6xl w-full` wrapper by hand: sizes drifted,
 * the card sometimes read as "the whole screen" because there was no
 * breathing room around it on large screens, and there was no shared
 * scroll behavior (header/footer would scroll away with the content).
 *
 * This shell:
 *  - always leaves clear space around the card (p-4 sm:p-6 on the backdrop)
 *  - caps the card at `size` and at 88vh tall, and only the BODY scrolls —
 *    header and footer stay put
 *  - gives every modal the same entrance motion, radius, border and shadow
 *  - carries an `accent` color so each modal keeps its own identity
 *    (attendance = emerald, edit = indigo, hold/lock = amber, list = slate)
 */
const ACCENTS = {
  emerald: "from-emerald-500 to-teal-500",
  indigo: "from-indigo-500 to-violet-500",
  amber: "from-amber-500 to-orange-500",
  slate: "from-slate-500 to-slate-400",
  rose: "from-rose-500 to-red-500",
};

const SIZES = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-5xl",
  "3xl": "max-w-6xl",
};

export default function ModalShell({
  open = true,
  onClose,
  size = "xl",
  accent = "indigo",
  isRTL = false,
  title,
  subtitle,
  headerBadge,
  footer,
  children,
  closeOnBackdrop = true,
}) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4 sm:p-6 animate-[fadeIn_.15s_ease-out]"
    >
      <div
        className={`relative flex w-full ${SIZES[size] || SIZES.xl} flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-2xl shadow-slate-900/20 dark:border-white/10 dark:bg-[#12141c] max-h-[88vh] animate-[popIn_.18s_ease-out]`}
      >
        {/* accent hairline */}
        <div className={`h-1 w-full shrink-0 bg-gradient-to-r ${ACCENTS[accent] || ACCENTS.indigo}`} />

        {/* header */}
        {(title || onClose) && (
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-white/10">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">
                  {title}
                </h2>
                {headerBadge}
              </div>
              {subtitle && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
              )}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                aria-label={isRTL ? "إغلاق" : "Close"}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* body — only this scrolls */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* footer */}
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-3.5 dark:border-white/10 dark:bg-white/[0.02]">
            {footer}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          from { opacity: 0; transform: translateY(6px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}