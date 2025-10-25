"use client";
import { ReactNode } from "react";
import { Icon } from "@iconify/react";

type ModalProps = {
  open: boolean;
  title?: string;
  children?: ReactNode;
  onClose: () => void;
};

export default function Modal({ open, title, children, onClose }: ModalProps) {
  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
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
            className="w-8 h-8 flex items-center justify-center rounded-10 hover:bg-white dark:hover:bg-darkmode transition-colors duration-200 text-SlateBlueText dark:text-darktext hover:text-MidnightNavyText dark:hover:text-white"
          >
            <Icon icon="ion:close" className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-track]:bg-dark_input dark:[&::-webkit-scrollbar-thumb]:bg-dark_border hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-darktext">
          {children}
        </div>
      </div>
    </div>
  );
}