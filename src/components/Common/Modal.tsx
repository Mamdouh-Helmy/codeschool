"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";

type ModalProps = {
  open: boolean;
  title?: string;
  children?: ReactNode;
  onClose: () => void;
  widthClass?: string; // لتغيير العرض إذا احتجت
};

export default function Modal({
  open,
  title,
  children,
  onClose,
  widthClass = "max-w-3xl",
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  // علشان نتأكد إن المودال بيتعرض في المتصفح فقط
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-darkmode rounded-2xl shadow-2xl w-full ${widthClass} max-h-[85vh] overflow-hidden border border-PowderBlueBorder dark:border-dark_border transition-all duration-300`}
      >
        {/* ===== Header ===== */}
        <div className="flex items-center justify-between p-4 border-b border-PowderBlueBorder dark:border-dark_border bg-IcyBreeze dark:bg-dark_input">
          <h2 className="text-20 font-bold text-MidnightNavyText dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-10 hover:bg-gray-100 dark:hover:bg-darkmode transition-colors duration-200 text-SlateBlueText dark:text-darktext hover:text-MidnightNavyText dark:hover:text-white"
            aria-label="Close modal"
          >
            <Icon icon="ion:close" className="w-5 h-5" />
          </button>
        </div>

  
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent dark:scrollbar-thumb-dark_border">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
