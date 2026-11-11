// components/admin/StudentEvaluationModal.jsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ClipboardCheck, Inbox, Loader2, X } from "lucide-react";
// ⚠️ عدّل المسار لو الصفحة عندك في مكان تاني
import { ReportDialog } from "../../app/(dashboard)/admin/evaluations/_components/ReportDialog";
import { buildStudentReport } from "../../app/(dashboard)/admin/evaluations/_components/helpers";

function Shell({ onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-2xl dark:border-dark_border dark:bg-darklight">
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute left-3 top-3 rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-dark_input"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/**
 * تقييمات طالب واحد داخل جروب معين — بنفس بوب تقرير الطالب في صفحة التقييمات.
 * عشان يعرض تقييمات الطالب في كل الجروبات: شيل groupId من الـ query تحت.
 */
export default function StudentEvaluationModal({ groupId, studentId, studentName, onClose }) {
  const [state, setState] = useState({ loading: true, error: null, list: [] });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams({ studentId, groupId });
        const res = await fetch(`/api/student-evaluations?${qs}`, { cache: "no-store" });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || json.error || "تعذر تحميل التقييمات");
        if (!cancelled) setState({ loading: false, error: null, list: json.data || [] });
      } catch (err) {
        if (!cancelled) setState({ loading: false, error: err.message, list: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId, studentId]);

  const report = useMemo(() => buildStudentReport(state.list.filter((e) => e.studentId)), [state.list]);

  if (report) {
    return (
      <ReportDialog
        report={report}
        rows={[]}
        focusEvalId={null}
        onClose={onClose}
        onSelect={() => {}}
        onPrev={null}
        onNext={null}
        position=""
        hideRail
      />
    );
  }

  return (
    <Shell onClose={onClose}>
      {state.loading ? (
        <>
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
          <p className="mt-3 text-sm text-gray-500">جاري تحميل تقييمات {studentName}…</p>
        </>
      ) : state.error ? (
        <>
          <ClipboardCheck className="mx-auto h-9 w-9 text-rose-400" />
          <p className="mt-3 text-sm font-semibold text-rose-600">{state.error}</p>
        </>
      ) : (
        <>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/5">
            <Inbox className="h-7 w-7 text-gray-400" />
          </div>
          <h4 className="mt-4 text-base font-bold text-gray-900 dark:text-white">مفيش تقييمات لـ {studentName}</h4>
          <p className="mt-1 text-xs text-gray-500">لسه المدرس ماقيّمش الطالب ده في الجروب ده.</p>
        </>
      )}
    </Shell>
  );
}