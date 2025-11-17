"use client";
import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";

type ModalProps = {
  open: boolean;
  title?: string;
  children?: ReactNode;
  onClose: () => void;
};

export default function Modal({ open, title, children, onClose }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  // نتاكد ان الكومبوننت اشتغل في المتصفح (مش SSR)
  useEffect(() => setMounted(true), []);

  if (!open || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-darkmode rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden border border-PowderBlueBorder dark:border-dark_border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-PowderBlueBorder dark:border-dark_border bg-IcyBreeze dark:bg-dark_input">
          <h2 className="text-20 font-bold text-MidnightNavyText dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            title="Close"
            aria-label="Close modal"
            className="w-8 h-8 flex items-center justify-center rounded-10 hover:bg-white dark:hover:bg-darkmode transition-colors duration-200 text-SlateBlueText dark:text-darktext hover:text-MidnightNavyText dark:hover:text-white"
          >
            <Icon icon="ion:close" className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-dark_border">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
