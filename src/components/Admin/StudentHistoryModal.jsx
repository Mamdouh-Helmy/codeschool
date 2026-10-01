"use client";
// components/Admin/StudentHistoryModal.jsx
// ✅ مودال السجل الكامل للطالب: سجل الاستخدام + الباقات + الاستثناءات

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Package,
  PlusCircle,
  MinusCircle,
  Snowflake,
  CheckCircle,
} from "lucide-react";
import {
  ModalShell,
  ModalSkeleton,
  Segmented,
  ProgressBar,
  formatDate,
  PACKAGE_LABELS,
  balanceTone,
} from "./OverviewShared";

const PACKAGE_STATUS = {
  active: { label: "نشطة", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" },
  expired: { label: "منتهية", cls: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-darkmuted" },
  completed: { label: "مكتملة", cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300" },
  suspended: { label: "موقوفة", cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" },
};

const EXCEPTION_TYPE = {
  deduction: { label: "خصم ساعات", icon: MinusCircle, cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" },
  addition: { label: "إضافة ساعات", icon: PlusCircle, cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" },
  freeze: { label: "تجميد", icon: Snowflake, cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300" },
};

const ATTENDANCE = {
  present: { label: "حاضر", dot: "bg-emerald-500", cls: "text-emerald-700 dark:text-emerald-400" },
  absent: { label: "غائب", dot: "bg-rose-500", cls: "text-rose-700 dark:text-rose-400" },
  late: { label: "متأخر", dot: "bg-amber-500", cls: "text-amber-700 dark:text-amber-400" },
  excused: { label: "بعذر", dot: "bg-slate-400", cls: "text-slate-600 dark:text-slate-400" },
  refund: { label: "استرجاع", dot: "bg-sky-500", cls: "text-sky-700 dark:text-sky-400" },
};

function hoursChange(h) {
  if (h > 0)
    return { text: `خُصم ${Math.abs(h)} س`, cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" };
  if (h < 0)
    return { text: `أُضيف ${Math.abs(h)} س`, cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" };
  return { text: "بدون خصم", cls: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-darkmuted" };
}

function Empty({ text }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400 dark:border-dark_border">
      {text}
    </p>
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

  const s = data?.stats;
  const tone = s ? balanceTone(s.totalHoursRemaining) : null;
  const remainingPct =
    s && s.totalHoursPurchased > 0
      ? (s.totalHoursRemaining / s.totalHoursPurchased) * 100
      : 0;

  return (
    <ModalShell
      title={studentName}
      avatarName={studentName}
      subtitle={
        data?.enrollmentNumber
          ? `السجل الكامل · رقم القيد ${data.enrollmentNumber}`
          : "السجل الكامل للطالب"
      }
      onClose={onClose}
      onRefresh={loadData}
      refreshing={loading && !!data}
    >
      {loading && !data ? (
        <ModalSkeleton />
      ) : !data ? (
        <p className="py-16 text-center text-sm text-slate-500 dark:text-darkmuted">
          مقدرناش نحمّل بيانات الطالب.
        </p>
      ) : (
        <div className={`space-y-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {/* ── Balance ── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-slate-200 p-5 dark:border-dark_border">
              <p className="text-sm font-semibold text-slate-500 dark:text-darkmuted">
                الساعات المتبقية
              </p>
              <p className={`mt-1 text-4xl font-extrabold tabular-nums ${tone.text}`}>
                {s.totalHoursRemaining}
                <span className="ms-1.5 text-base font-semibold text-slate-400">ساعة</span>
              </p>
              <ProgressBar pct={remainingPct} tone={tone.bar} className="mt-3" />
              <p className="mt-2 text-xs text-slate-500 dark:text-darkmuted">
                استُخدم {s.totalHoursUsed} من إجمالي {s.totalHoursPurchased} ساعة اشتراها
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5 dark:border-dark_border">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-darkmuted">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                جلسات حضرها
              </p>
              <p className="mt-1 text-4xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                {s.totalSessionsAttended}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(data.attendanceBreakdown).map(([key, count]) => {
                  const cfg = ATTENDANCE[key];
                  if (!cfg || count === 0) return null;
                  return (
                    <span key={key} className="inline-flex items-center gap-1.5 text-xs">
                      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                      <span className={cfg.cls}>{cfg.label}</span>
                      <b className="text-slate-800 dark:text-white">{count}</b>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <Segmented
            value={tab}
            onChange={setTab}
            label="أقسام السجل"
            options={[
              { value: "usage", label: "سجل الاستخدام", count: data.usageHistory.length },
              { value: "packages", label: "الباقات", count: data.packages.length },
              { value: "exceptions", label: "الاستثناءات", count: data.exceptions.length },
            ]}
          />

          {/* ── Usage ── */}
          {tab === "usage" && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 dark:text-darksubtle">
                كل جلسة اتخصم منها من رصيد الطالب، أو اتسترجع له ساعات منها.
              </p>
              {data.usageHistory.length === 0 ? (
                <Empty text="لسه مفيش استخدام للساعات" />
              ) : (
                data.usageHistory.map((u, i) => {
                  const att = ATTENDANCE[u.attendanceStatus] || ATTENDANCE.present;
                  const ch = hoursChange(u.hoursDeducted);
                  return (
                    <div
                      key={i}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 px-4 py-3 dark:border-dark_border sm:flex-nowrap"
                    >
                      <span className="w-24 flex-shrink-0 text-xs text-slate-500 dark:text-darkmuted">
                        {formatDate(u.date)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {u.sessionTitle || "—"}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-darkmuted">
                          {u.groupName || "—"}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${att.cls}`}>
                        <span className={`h-2 w-2 rounded-full ${att.dot}`} />
                        {att.label}
                      </span>
                      <span
                        className={`w-24 flex-shrink-0 rounded-full px-2.5 py-1 text-center text-xs font-bold ${ch.cls}`}
                      >
                        {ch.text}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── Packages ── */}
          {tab === "packages" && (
            <div className="space-y-2.5">
              {data.packages.length === 0 ? (
                <Empty text="مفيش باقات" />
              ) : (
                data.packages.map((p, i) => {
                  const st = PACKAGE_STATUS[p.status] || PACKAGE_STATUS.expired;
                  const pTone = balanceTone(p.remainingHours);
                  const pPct = p.totalHours > 0 ? (p.remainingHours / p.totalHours) * 100 : 0;
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border p-4 ${
                        p.isCurrent
                          ? "border-primary/40 bg-primary/[0.03]"
                          : "border-slate-200 dark:border-dark_border"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Package className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                              {PACKAGE_LABELS[p.packageType] || p.packageType}
                              {p.isCurrent && (
                                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                                  الحالية
                                </span>
                              )}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-darkmuted">
                              من {formatDate(p.startDate)} إلى {formatDate(p.endDate)}
                              {p.price > 0 && ` · ${p.price} ج.م`}
                            </p>
                          </div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>
                          {st.label}
                        </span>
                      </div>
                      <div className="mt-3">
                        <ProgressBar pct={pPct} tone={pTone.bar} />
                        <p className="mt-1.5 text-xs text-slate-500 dark:text-darkmuted">
                          متبقي {p.remainingHours} من {p.totalHours} ساعة
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── Exceptions ── */}
          {tab === "exceptions" && (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-400 dark:text-darksubtle">
                تعديلات يدوية على الرصيد: خصم ساعات، إضافة ساعات، أو تجميد الحساب.
              </p>
              {data.exceptions.length === 0 ? (
                <Empty text="مفيش استثناءات على الحساب" />
              ) : (
                data.exceptions.map((ex, i) => {
                  const cfg = EXCEPTION_TYPE[ex.type] || EXCEPTION_TYPE.deduction;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-dark_border"
                    >
                      <span
                        className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${cfg.cls}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {cfg.label}
                        {ex.hours ? ` · ${ex.hours} س` : ""}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {ex.reason}
                        </p>
                        {ex.notes && (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-darkmuted">
                            {ex.notes}
                          </p>
                        )}
                        <p className="mt-1.5 text-[11px] text-slate-400">
                          {formatDate(ex.startDate)}
                          {ex.endDate ? ` إلى ${formatDate(ex.endDate)}` : ""}
                        </p>
                      </div>
                      <span
                        className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          ex.status === "active"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-darkmuted"
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
    </ModalShell>
  );
}