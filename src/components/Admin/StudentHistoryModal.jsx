"use client";
// components/Admin/StudentHistoryModal.jsx
// ✅ مودال السجل الكامل للطالب: سجل الاستخدام + الباقات + الاستثناءات

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  X,
  Package,
  Clock,
  TrendingUp,
  CheckCircle,
  Snowflake,
  PlusCircle,
  MinusCircle,
  RefreshCw,
} from "lucide-react";

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

const PACKAGE_LABELS = {
  "3months": "3 أشهر (24 ساعة)",
  "6months": "6 أشهر (48 ساعة)",
  "9months": "9 أشهر (72 ساعة)",
  "12months": "12 شهر (96 ساعة)",
};

const PACKAGE_STATUS_MAP = {
  active: { label: "نشطة", cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  expired: { label: "منتهية", cls: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
  completed: { label: "مكتملة", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  suspended: { label: "موقوفة", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

const EXCEPTION_TYPE_MAP = {
  deduction: { label: "خصم", icon: MinusCircle, cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  addition: { label: "إضافة", icon: PlusCircle, cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  freeze: { label: "تجميد", icon: Snowflake, cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
};

const ATTENDANCE_MAP = {
  present: { label: "حاضر", dot: "bg-green-500", cls: "text-green-700 dark:text-green-400" },
  absent: { label: "غائب", dot: "bg-red-500", cls: "text-red-700 dark:text-red-400" },
  late: { label: "متأخر", dot: "bg-amber-500", cls: "text-amber-700 dark:text-amber-400" },
  excused: { label: "بعذر", dot: "bg-gray-400", cls: "text-gray-600 dark:text-gray-400" },
  refund: { label: "استرجاع", dot: "bg-blue-500", cls: "text-blue-700 dark:text-blue-400" },
};

function SummaryCard({ label, value, icon: Icon, iconCls }) {
  return (
    <div className="bg-gray-50 dark:bg-dark_input rounded-lg p-3 border border-PowderBlueBorder dark:border-dark_border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-SlateBlueText dark:text-darktext uppercase tracking-wide mb-1">
            {label}
          </p>
          <p className="text-lg font-bold text-MidnightNavyText dark:text-white">
            {value}
          </p>
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconCls}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

export default function StudentHistoryModal({ studentId, studentName, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("usage");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/overview/student/${studentId}`, { cache: "no-store" });
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
    if (studentId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-darkmode rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-PowderBlueBorder dark:border-dark_border sticky top-0 bg-white dark:bg-darkmode z-10">
          <div>
            <h2 className="text-lg font-bold text-MidnightNavyText dark:text-white">
              السجل الكامل — {studentName}
            </h2>
            <p className="text-xs text-SlateBlueText dark:text-darktext mt-0.5">
              {data?.enrollmentNumber}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="تحديث">
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
          <div className="text-center py-20 text-SlateBlueText dark:text-darktext text-sm">
            تعذر تحميل بيانات الطالب
          </div>
        ) : (
          <div className="p-4 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <SummaryCard label="إجمالي المشترى" value={`${data.stats.totalHoursPurchased} س`} icon={Package} iconCls="bg-primary/10 text-primary" />
              <SummaryCard label="المستخدم" value={`${data.stats.totalHoursUsed} س`} icon={TrendingUp} iconCls="bg-amber-100 dark:bg-amber-900/30 text-amber-600" />
              <SummaryCard label="المتبقي" value={`${data.stats.totalHoursRemaining} س`} icon={Clock} iconCls="bg-green-100 dark:bg-green-900/30 text-green-600" />
              <SummaryCard label="جلسات حضرها" value={data.stats.totalSessionsAttended} icon={CheckCircle} iconCls="bg-blue-100 dark:bg-blue-900/30 text-blue-600" />
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.entries(data.attendanceBreakdown).map(([key, count]) => {
                const cfg = ATTENDANCE_MAP[key];
                if (!cfg || count === 0) return null;
                return (
                  <span key={key} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 dark:bg-dark_input rounded-lg text-xs border border-PowderBlueBorder dark:border-dark_border">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className={cfg.cls}>{cfg.label}</span>
                    <span className="font-semibold text-MidnightNavyText dark:text-white">{count}</span>
                  </span>
                );
              })}
            </div>

            <div className="flex gap-1 bg-gray-100 dark:bg-dark_input p-1 rounded-xl w-fit">
              {[
                { id: "usage", label: "سجل الاستخدام", count: data.usageHistory.length },
                { id: "packages", label: "الباقات", count: data.packages.length },
                { id: "exceptions", label: "الاستثناءات", count: data.exceptions.length },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    tab === t.id
                      ? "bg-white dark:bg-darkmode text-MidnightNavyText dark:text-white shadow-sm border border-PowderBlueBorder dark:border-dark_border"
                      : "text-SlateBlueText dark:text-darktext"
                  }`}
                >
                  {t.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-primary/10 text-primary" : "bg-gray-200 dark:bg-gray-600"}`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {tab === "usage" && (
              <div className="space-y-1.5">
                {data.usageHistory.length === 0 ? (
                  <p className="text-center py-8 text-sm text-SlateBlueText dark:text-darktext">لا يوجد سجل استخدام</p>
                ) : (
                  data.usageHistory.map((u, i) => {
                    const cfg = ATTENDANCE_MAP[u.attendanceStatus] || ATTENDANCE_MAP.present;
                    return (
                      <div key={i} className="flex items-center gap-3 text-xs bg-gray-50 dark:bg-dark_input rounded-lg px-3 py-2 border border-PowderBlueBorder dark:border-dark_border">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-MidnightNavyText dark:text-white truncate">{u.sessionTitle || "—"}</p>
                          <p className="text-[10px] text-SlateBlueText dark:text-darktext">{u.groupName || "—"}</p>
                        </div>
                        <span className={`${cfg.cls} font-medium whitespace-nowrap`}>{cfg.label}</span>
                        <span className={`font-semibold whitespace-nowrap ${u.hoursDeducted < 0 ? "text-green-600" : "text-red-600"}`}>
                          {u.hoursDeducted < 0 ? "+" : "-"}
                          {Math.abs(u.hoursDeducted)}س
                        </span>
                        <span className="text-SlateBlueText dark:text-darktext whitespace-nowrap">{formatDate(u.date)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {tab === "packages" && (
              <div className="space-y-2">
                {data.packages.length === 0 ? (
                  <p className="text-center py-8 text-sm text-SlateBlueText dark:text-darktext">لا توجد باقات</p>
                ) : (
                  data.packages.map((p, i) => {
                    const statusCfg = PACKAGE_STATUS_MAP[p.status] || PACKAGE_STATUS_MAP.expired;
                    return (
                      <div key={i} className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-dark_input rounded-lg px-4 py-3 border border-PowderBlueBorder dark:border-dark_border">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-MidnightNavyText dark:text-white flex items-center gap-1.5">
                              {PACKAGE_LABELS[p.packageType] || p.packageType}
                              {p.isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">الحالية</span>
                              )}
                            </p>
                            <p className="text-[11px] text-SlateBlueText dark:text-darktext">
                              {formatDate(p.startDate)} → {formatDate(p.endDate)}
                              {p.price > 0 && ` · ${p.price} ج.م`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusCfg.cls}`}>{statusCfg.label}</span>
                          <p className="text-xs text-SlateBlueText dark:text-darktext">{p.remainingHours}/{p.totalHours} ساعة متبقية</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {tab === "exceptions" && (
              <div className="space-y-2">
                {data.exceptions.length === 0 ? (
                  <p className="text-center py-8 text-sm text-SlateBlueText dark:text-darktext">لا توجد استثناءات</p>
                ) : (
                  data.exceptions.map((ex, i) => {
                    const cfg = EXCEPTION_TYPE_MAP[ex.type] || EXCEPTION_TYPE_MAP.deduction;
                    const Icon = cfg.icon;
                    return (
                      <div key={i} className="flex items-start gap-3 bg-gray-50 dark:bg-dark_input rounded-lg px-4 py-3 border border-PowderBlueBorder dark:border-dark_border">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.cls}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                          {ex.hours ? ` · ${ex.hours}س` : ""}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-MidnightNavyText dark:text-white">{ex.reason}</p>
                          {ex.notes && <p className="text-[11px] text-SlateBlueText dark:text-darktext mt-0.5">{ex.notes}</p>}
                          <p className="text-[10px] text-SlateBlueText dark:text-darktext mt-1">
                            {formatDate(ex.startDate)}
                            {ex.endDate ? ` → ${formatDate(ex.endDate)}` : ""}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                            ex.status === "active"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {ex.status === "active" ? "نشط" : ex.status === "completed" ? "منتهي" : "ملغي"}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}