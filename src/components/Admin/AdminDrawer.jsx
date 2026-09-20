"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * مودال مشترك لصفحات الأدمن.
 * - بيتعمل Portal على document.body عشان الخلفية تغطي الشاشة كلها
 *   مهما كان الـ parent (transform / overflow / z-index).
 * - قفل سكرول الصفحة + Esc للإغلاق + إغلاق بالضغط على الخلفية.
 * - الـ Header والـ Footer ثابتين، والـ Body بس هو اللي بيسكرول.
 */
export default function AdminModal({
  isOpen,
  onClose,
  title,
  icon: Icon,
  iconClassName = "text-primary bg-primary/10",
  children,
  footer,
  maxWidth = "max-w-md",
  locked = false, // true أثناء الحفظ: يمنع الإغلاق
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape" && !locked) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose, locked]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      style={{ height: "100dvh" }}
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* الخلفية */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !locked && onClose?.()}
        aria-hidden="true"
      />

      {/* اللوحة */}
      <div
        className={`relative w-full ${maxWidth} max-h-[92dvh] flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-dark_border bg-white dark:bg-darklight shadow-2xl`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-dark_border flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconClassName}`}
              >
                <Icon className="w-5 h-5" />
              </span>
            )}
            <h3 className="text-base sm:text-lg font-bold text-MidnightNavyText dark:text-white truncate">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={locked}
            aria-label="إغلاق"
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-darkmuted dark:hover:text-white dark:hover:bg-darkhover transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-dark_border bg-gray-50 dark:bg-darkmode/40 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}