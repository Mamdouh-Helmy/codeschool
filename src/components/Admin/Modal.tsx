"use client";
import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

type ModalProps = {
  open: boolean;
  title?: string;
  children?: ReactNode;
  onClose: () => void;
  size?: ModalSize;
  noPadding?: boolean;
};

const sizeClasses: Record<ModalSize, string> = {
  sm:    "max-w-md",
  md:    "max-w-xl",
  lg:    "max-w-2xl",
  xl:    "max-w-4xl",   // ⬆️ كان max-w-3xl
  "2xl": "max-w-6xl",   // ✅ جديد — للفورمات الكبيرة زي GroupForm
  full:  "max-w-[96vw]",
};

export default function Modal({
  open, title, children, onClose, size = "xl", noPadding = false,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ✅ قفل سكرول الصفحة اللي ورا المودال + إغلاق بـ Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`
          bg-white dark:bg-darkmode rounded-2xl shadow-2xl w-full flex flex-col
          ${sizeClasses[size]}
          ${noPadding
            ? "h-[92vh] sm:h-[88vh] overflow-hidden"
            : "max-h-[90vh] overflow-hidden border border-PowderBlueBorder dark:border-dark_border"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {noPadding ? (
          // ── الـ child بيتحكم بالكامل (header + scroll + sticky footer) ──
          children
        ) : (
          <>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-PowderBlueBorder dark:border-dark_border bg-IcyBreeze dark:bg-dark_input flex-shrink-0">
              <h2 className="text-18 sm:text-20 font-bold text-MidnightNavyText dark:text-white">
                {title}
              </h2>
              <button
                onClick={onClose}
                title="Close"
                aria-label="Close modal"
                className="w-9 h-9 flex items-center justify-center rounded-10 hover:bg-white dark:hover:bg-darkmode transition-colors duration-200 text-SlateBlueText dark:text-darktext hover:text-MidnightNavyText dark:hover:text-white"
              >
                <Icon icon="ion:close" className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-dark_border">
              {children}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}