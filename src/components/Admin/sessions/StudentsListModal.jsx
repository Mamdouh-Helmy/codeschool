"use client";
import React from "react";
import { Users, Mail, Phone, Hash } from "lucide-react";
import ModalShell from "./ModalShell";

export default function StudentsListModal({ groupStudents, group, onClose, isRTL, t }) {
  return (
    <ModalShell
      open
      onClose={onClose}
      size="2xl"
      accent="slate"
      isRTL={isRTL}
      title={`${isRTL ? "قائمة الطلاب" : "Students List"} — ${group?.name || ""}`}
      subtitle={`${isRTL ? "الإجمالي" : "Total"}: ${groupStudents.length}`}
      footer={
        <button
          onClick={onClose}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-900 dark:bg-white/10 dark:hover:bg-white/20"
        >
          {isRTL ? "إغلاق" : "Close"}
        </button>
      }
    >
      <div className="space-y-2.5">
        {groupStudents.map((student) => {
          const lang   = student.communicationPreferences?.preferredLanguage || "ar";
          const gender = student.personalInfo?.gender || "male";
          const rel    = student.guardianInfo?.relationship || "father";

          return (
            <div
              key={student._id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-800 dark:text-white">
                  {student.personalInfo?.fullName}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5" /> {student.enrollmentNumber}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {student.personalInfo?.email || "—"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {student.personalInfo?.phone || "—"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                  {lang === "ar" ? "🇸🇦 العربية" : "🇬🇧 English"}
                </span>
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                  {gender === "male" ? (isRTL ? "👦 ذكر" : "👦 Male") : (isRTL ? "👧 أنثى" : "👧 Female")}
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {rel === "father" ? (isRTL ? "👨 أب" : "👨 Father") : rel === "mother" ? (isRTL ? "👩 أم" : "👩 Mother") : (isRTL ? "👤 ولي أمر" : "👤 Guardian")}
                </span>
              </div>
            </div>
          );
        })}

        {groupStudents.length === 0 && (
          <div className="py-10 text-center">
            <Users className="mx-auto mb-2 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              {isRTL ? "لا يوجد طلاب في هذه المجموعة" : "No students in this group"}
            </p>
          </div>
        )}
      </div>
    </ModalShell>
  );
}