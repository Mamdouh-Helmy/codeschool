// components/admin/ConfirmDialog.jsx
"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, Archive, PlayCircle, AlertTriangle, X } from "lucide-react";

const VARIANTS = {
    danger: {
        icon: Trash2,
        glow: "from-rose-400/30",
        iconWrap: "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
        btn: "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30 focus-visible:ring-rose-500/40",
        chip: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20",
    },
    warning: {
        icon: Archive,
        glow: "from-amber-400/30",
        iconWrap: "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
        btn: "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30 focus-visible:ring-amber-500/40",
        chip: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
    },
    success: {
        icon: PlayCircle,
        glow: "from-emerald-400/30",
        iconWrap: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
        btn: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 focus-visible:ring-emerald-500/40",
        chip: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    },
    info: {
        icon: AlertTriangle,
        glow: "from-sky-400/30",
        iconWrap: "bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/20",
        btn: "bg-primary hover:bg-primary/90 shadow-primary/30 focus-visible:ring-primary/40",
        chip: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20",
    },
};

export function ConfirmDialog({
    open,
    variant = "danger",
    title,
    message,
    note,
    itemName,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isRTL = false,
    onConfirm,
    onCancel,
}) {
    const confirmBtnRef = useRef(null);
    const v = VARIANTS[variant] || VARIANTS.danger;
    const Icon = v.icon;

    useEffect(() => {
        if (!open) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const t = setTimeout(() => confirmBtnRef.current?.focus(), 30);

        const onKey = (e) => {
            if (e.key === "Escape") onCancel?.();
        };
        document.addEventListener("keydown", onKey);

        return () => {
            clearTimeout(t);
            document.body.style.overflow = prevOverflow;
            document.removeEventListener("keydown", onKey);
        };
    }, [open, onCancel]);

    if (!open || typeof document === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            dir={isRTL ? "rtl" : "ltr"}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
        >
            {/* Backdrop */}
            <div
                onClick={onCancel}
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
            />

            {/* Card */}
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-darkmode border border-gray-100 dark:border-dark_border shadow-[0_24px_80px_rgba(11,20,26,0.35)] animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
                {/* Soft glow header */}
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${v.glow} to-transparent`} />

                <button
                    type="button"
                    onClick={onCancel}
                    aria-label={cancelText}
                    className="absolute top-3 end-3 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="relative px-6 pt-8 pb-5 text-center">
                    <div className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center ring-8 ${v.iconWrap}`}>
                        <Icon className="w-7 h-7" />
                    </div>

                    <h3 id="confirm-title" className="text-lg font-bold text-MidnightNavyText dark:text-white">
                        {title}
                    </h3>

                    {itemName && (
                        <span className={`inline-flex max-w-full items-center mt-2.5 px-3 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${v.chip}`}>
                            <span className="truncate">{itemName}</span>
                        </span>
                    )}

                    {message && (
                        <p className="mt-3 text-sm leading-relaxed text-SlateBlueText dark:text-darktext">
                            {message}
                        </p>
                    )}

                    {note && (
                        <p className="mt-3 mx-auto px-3 py-2 rounded-xl bg-[#f7f8fa] dark:bg-white/5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                            {note}
                        </p>
                    )}
                </div>

                <div className="px-6 pb-6 flex flex-col-reverse sm:flex-row gap-2.5">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 h-11 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 transition-all active:scale-[0.98]"
                    >
                        {cancelText}
                    </button>
                    <button
                        ref={confirmBtnRef}
                        type="button"
                        onClick={onConfirm}
                        className={`flex-1 h-11 rounded-xl text-sm font-semibold text-white shadow-lg outline-none focus-visible:ring-4 transition-all active:scale-[0.98] ${v.btn}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

/**
 * Promise-based hook — drop-in replacement for window.confirm
 *
 * const [confirm, confirmDialog] = useConfirm(isRTL);
 * if (!(await confirm({ title, message, variant: "danger" }))) return;
 * ...
 * render {confirmDialog} anywhere in your JSX
 */
export function useConfirm(isRTL = false) {
    const [state, setState] = useState({ open: false });
    const resolverRef = useRef(null);

    const confirm = useCallback(
        (options = {}) =>
            new Promise((resolve) => {
                resolverRef.current?.(false);
                resolverRef.current = resolve;
                setState({ open: true, ...options });
            }),
        []
    );

    const close = useCallback((result) => {
        resolverRef.current?.(result);
        resolverRef.current = null;
        setState((s) => ({ ...s, open: false }));
    }, []);

    const dialog = (
        <ConfirmDialog
            {...state}
            isRTL={isRTL}
            onConfirm={() => close(true)}
            onCancel={() => close(false)}
        />
    );

    return [confirm, dialog];
}

export default ConfirmDialog;