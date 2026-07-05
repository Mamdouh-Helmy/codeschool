"use client";
// components/Admin/InstructorHistoryModal.jsx
// ✅ مودال السجل الكامل للمدرس + فلترة بالشهر

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { X, Clock, BookOpen, Users, CheckCircle, RefreshCw, Filter } from "lucide-react";

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

const ARABIC_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

function formatMonthLabel(monthKey) {
  if (!monthKey) return "";
  const [year, month] = monthKey.split("-");
  return `${ARABIC_MONTHS[parseInt(month, 10) - 1]} ${year}`;
}

function SummaryCard({ label, value, icon: Icon, iconCls }) {
  return (
    <div className="bg-gray-50 dark:bg-dark_input rounded-lg p-3 border border-PowderBlueBorder dark:border-dark_border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-SlateBlueText dark:text-darktext uppercase tracking-wide mb-1">{label}</p>
          <p className="text-lg font-bold text-MidnightNavyText dark:text-white">{value}</p>
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconCls}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

export default function InstructorHistoryModal({ instructorId, instructorName, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("");

  const loadData = async (month = "") => {
    setLoading(true);
    try {
      const url = month
        ? `/api/overview/instructor/${instructorId}?month=${month}`
        : `/api/overview/instructor/${instructorId}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast.error(json.message || "فشل في تحميل السجل");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطأ في الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (instructorId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instructorId]);

  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    loadData(month);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-darkmode rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-PowderBlueBorder dark:border-dark_border sticky top-0 bg-white dark:bg-darkmode z-10">
          <div>
            <h2 className="text-lg font-bold text-MidnightNavyText dark:text-white">السجل الكامل — {instructorName}</h2>
            <p className="text-xs text-SlateBlueText dark:text-darktext mt-0.5">{data?.jobTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => loadData(selectedMonth)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="تحديث">
              <RefreshCw className="w-4 h-4 text-SlateBlueText dark:text-darktext" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <X className="w-5 h-5 text-SlateBlueText dark:text-darktext" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-SlateBlueText dark:text-darktext text-sm">تعذر تحميل بيانات المدرس</div>
        ) : (
          <div className="p-4 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              <SummaryCard label="إجمالي الساعات" value={`${data.totalHours} س`} icon={Clock} iconCls="bg-primary/10 text-primary" />
              <SummaryCard label="إجمالي الجلسات" value={data.totalSessions} icon={CheckCircle} iconCls="bg-green-100 dark:bg-green-900/30 text-green-600" />
              <SummaryCard label="المجموعات" value={data.totalGroups} icon={Users} iconCls="bg-blue-100 dark:bg-blue-900/30 text-blue-600" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-SlateBlueText dark:text-darktext">
                <Filter className="w-3.5 h-3.5" />
                فلترة بالشهر:
              </div>
              <button
                onClick={() => handleMonthChange("")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedMonth === "" ? "bg-primary text-white" : "bg-gray-100 dark:bg-dark_input text-SlateBlueText dark:text-darktext"
                }`}
              >
                كل الشهور
              </button>
              {data.monthsSummary.map((m) => (
                <button
                  key={m.monthKey}
                  onClick={() => handleMonthChange(m.monthKey)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedMonth === m.monthKey ? "bg-primary text-white" : "bg-gray-100 dark:bg-dark_input text-SlateBlueText dark:text-darktext"
                  }`}
                >
                  {formatMonthLabel(m.monthKey)} · {m.sessionsCount}
                </button>
              ))}
            </div>

            {selectedMonth &&
              (() => {
                const monthData = data.monthsSummary.find((m) => m.monthKey === selectedMonth);
                if (!monthData) return null;
                return (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs">
                    <p className="text-MidnightNavyText dark:text-white font-medium mb-1">
                      {formatMonthLabel(selectedMonth)}: {monthData.sessionsCount} جلسة · {monthData.totalHours} ساعة
                    </p>
                    <p className="text-SlateBlueText dark:text-darktext">المجموعات: {monthData.groups.join("، ")}</p>
                  </div>
                );
              })()}

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-MidnightNavyText dark:text-white">الجلسات ({data.sessions.length})</p>
              {data.sessions.length === 0 ? (
                <p className="text-center py-8 text-sm text-SlateBlueText dark:text-darktext">لا توجد جلسات في هذه الفترة</p>
              ) : (
                data.sessions.map((s) => (
                  <div key={s.sessionId} className="flex items-center gap-3 text-xs bg-gray-50 dark:bg-dark_input rounded-lg px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-MidnightNavyText dark:text-white truncate">{s.title}</p>
                      <p className="text-[10px] text-SlateBlueText dark:text-darktext">{s.groupName} · {s.courseName}</p>
                    </div>
                    <div className="text-center flex-shrink-0">
                      <p className="text-[10px] text-SlateBlueText dark:text-darktext">حضور</p>
                      <p className="font-medium text-green-600">{s.presentCount}</p>
                    </div>
                    <div className="text-center flex-shrink-0">
                      <p className="text-[10px] text-SlateBlueText dark:text-darktext">غياب</p>
                      <p className="font-medium text-red-600">{s.absentCount}</p>
                    </div>
                    <span className="font-semibold text-primary whitespace-nowrap">{s.hours}س</span>
                    <span className="text-SlateBlueText dark:text-darktext whitespace-nowrap">{formatDate(s.date)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}