"use client";
// components/MeetingLinksCheckModal.jsx

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Link2,
  AlertTriangle,
  CheckCircle,
  Lock,
  Unlock,
  Calendar,
  Video,
  WifiOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Square,
  CheckSquare,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Platform meta ────────────────────────────────────────────────────────────
const PLATFORM_META = {
  zoom:            { emoji: "🔷", color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20",     label: "Zoom" },
  google_meet:     { emoji: "🔴", color: "text-red-600",    bg: "bg-red-50 dark:bg-red-900/20",       label: "Meet" },
  microsoft_teams: { emoji: "🔵", color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20", label: "Teams" },
  other:           { emoji: "🔗", color: "text-gray-600",   bg: "bg-gray-50 dark:bg-gray-800",        label: "Other" },
};

// ── modulo distribution ──────────────────────────────────────────────────────
function distributeLinks(sessions, links) {
  if (!links || links.length === 0)
    return sessions.map((s) => ({ ...s, assignedLink: null }));
  return sessions.map((s, i) => ({
    ...s,
    assignedLink: links[i % links.length],
  }));
}

// ── Reserved links panel ─────────────────────────────────────────────────────
function ReservedLinksPanel({ reservedLinks, onReleased }) {
  const [selected, setSelected] = useState(new Set());
  const [releasing, setReleasing] = useState(false);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectAll  = () => setSelected(new Set(reservedLinks.map((l) => l.id?.toString())));
  const clearAll   = () => setSelected(new Set());
  const allChecked = selected.size === reservedLinks.length && reservedLinks.length > 0;

  const handleRelease = async () => {
    if (selected.size === 0) return;
    setReleasing(true);
    try {
      const res  = await fetch(`/api/groups/release-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkIds: [...selected] }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error || "فشل إلغاء الحجز"); return; }

      const noun = selected.size === 1 ? "لينك" : "لينكات";
      toast.success(`تم إلغاء حجز ${data.released} ${noun} بنجاح`);
      onReleased();
    } catch {
      toast.error("فشل في التواصل مع الخادم");
    } finally {
      setReleasing(false);
    }
  };

  // زرار الإلغاء — نصه يتغير حسب الاختيار
  const releaseLabel = () => {
    if (releasing)  return "جاري الإلغاء...";
    if (selected.size === 0) return "اختر لينكات لإلغاء حجزها";
    if (selected.size === reservedLinks.length)
      return `إلغاء حجز الكل (${selected.size}) وإعادة التوزيع`;
    return `إلغاء حجز ${selected.size} ${selected.size === 1 ? "لينك" : "لينكات"} وإعادة التوزيع`;
  };

  return (
    <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-200 dark:border-yellow-800">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
            {reservedLinks.length === 1
              ? "لينك واحد محجوز"
              : `${reservedLinks.length} لينكات محجوزة`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={allChecked ? clearAll : selectAll}
            className="flex items-center gap-1 text-xs text-yellow-700 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-200 transition"
          >
            {allChecked
              ? <CheckSquare className="w-3.5 h-3.5" />
              : <Square className="w-3.5 h-3.5" />
            }
            {allChecked ? "إلغاء تحديد الكل" : "تحديد الكل"}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-yellow-100 dark:divide-yellow-900/40">
        {reservedLinks.map((link) => {
          const id  = link.id?.toString();
          const pm  = PLATFORM_META[link.platform] || PLATFORM_META.other;
          const checked = selected.has(id);
          const until = link.reservedUntil
            ? new Date(link.reservedUntil).toLocaleDateString("ar-EG", {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
              })
            : "—";

          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors ${
                checked
                  ? "bg-blue-50 dark:bg-blue-900/20"
                  : "bg-white dark:bg-gray-900 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
              }`}
            >
              {/* Checkbox */}
              <div
                className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-all ${
                  checked
                    ? "bg-blue-600 border-blue-600"
                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                }`}
              >
                {checked && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {link.name}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${pm.bg} ${pm.color}`}>
                    {pm.emoji} {pm.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  محجوز حتى: {until}
                </p>
              </div>

              {/* Unlock hint */}
              {checked && (
                <Unlock className="w-4 h-4 text-blue-500 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Action */}
      <div className="px-4 py-3 border-t border-yellow-200 dark:border-yellow-800">
        <button
          onClick={handleRelease}
          disabled={selected.size === 0 || releasing}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
            selected.size === 0
              ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {releasing ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : selected.size > 0 ? (
            <Unlock className="w-4 h-4" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
          {releaseLabel()}
        </button>
      </div>
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────
export default function MeetingLinksCheckModal({
  isOpen,
  groupId,
  onClose,
  onConfirm,
}) {
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);
  const [rawData, setRawData]                 = useState(null);
  const [sessionRows, setSessionRows]         = useState([]);
  const [showAllSessions, setShowAllSessions] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/groups/${groupId}/activate`);
      const data = await res.json();
      if (!data.success) { setError(data.error || "حدث خطأ"); return; }

      const d = data.data;
      setRawData(d);

      const rows = distributeLinks(
        (d.sessions || []).map((r) => r.session ?? r),
        d.availableLinks || [],
      );
      setSessionRows(rows);
    } catch {
      setError("فشل في التحقق من اللينكات");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (isOpen && groupId) fetchStatus();
  }, [isOpen, groupId, fetchStatus]);

  if (!isOpen) return null;

  const totalSessions     = sessionRows.length;
  const sessionsWithLinks = sessionRows.filter((r) => r.assignedLink).length;
  const sessionsWithout   = totalSessions - sessionsWithLinks;
  const hasNoLinksAtAll   = (rawData?.totalLinks ?? 0) === 0;
  const allGood           = (rawData?.availableLinksCount ?? 0) > 0;
  const reservedLinks     = rawData?.reservedLinks ?? [];
  const hasReservedLinks  = reservedLinks.length > 0;
  const displayedRows     = showAllSessions ? sessionRows : sessionRows.slice(0, 6);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      dir="rtl"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">

        {/* Header */}
        <div className="bg-gradient-to-l from-blue-700 to-indigo-700 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">توزيع لينكات الاجتماعات</h2>
              <p className="text-xs text-white/70">مراجعة قبل تفعيل المجموعة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              <p className="text-sm text-gray-500">جاري تحليل اللينكات والجلسات...</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 px-6">
              <AlertTriangle className="w-12 h-12 text-red-500" />
              <p className="text-sm text-red-600 font-medium text-center">{error}</p>
              <button
                onClick={fetchStatus}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
              >
                <RefreshCw className="w-4 h-4" /> إعادة المحاولة
              </button>
            </div>
          )}

          {/* Content */}
          {!loading && !error && rawData && (
            <div className="p-5 space-y-4">

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <SummaryCard
                  label="إجمالي الجلسات"
                  value={totalSessions}
                  icon={<Calendar className="w-5 h-5" />}
                  color="blue"
                />
                <SummaryCard
                  label="ستأخذ لينكات"
                  value={sessionsWithLinks}
                  icon={<CheckCircle className="w-5 h-5" />}
                  color="green"
                />
                <SummaryCard
                  label="بدون لينكات"
                  value={sessionsWithout}
                  icon={<WifiOff className="w-5 h-5" />}
                  color={sessionsWithout > 0 ? "orange" : "green"}
                />
              </div>

              {/* ── لا يوجد لينكات خالص ── */}
              {hasNoLinksAtAll && (
                <Banner
                  type="error"
                  icon={<AlertTriangle className="w-5 h-5 flex-shrink-0" />}
                  title="لا توجد لينكات في النظام"
                  body="لم يتم إضافة أي لينكات اجتماعات بعد. ستُنشأ الجلسات بدون لينكات ويمكن إضافتها لاحقاً."
                />
              )}

              {/* ── لينكات محجوزة — Panel دينامك ── */}
              {!hasNoLinksAtAll && hasReservedLinks && sessionsWithout > 0 && (
                <ReservedLinksPanel
                  reservedLinks={reservedLinks}
                  onReleased={fetchStatus}
                />
              )}

              {/* ── كل الجلسات OK ── */}
              {!hasNoLinksAtAll && allGood && (
                <Banner
                  type="success"
                  icon={<CheckCircle className="w-5 h-5 flex-shrink-0" />}
                  title="كل الجلسات ستحصل على لينكات ✓"
                  body={
                    rawData.availableLinksCount === 1
                      ? `لينك واحد متاح وسيتوزع على جميع الـ ${totalSessions} جلسة.`
                      : `${rawData.availableLinksCount} لينكات متاحة ستتوزع دورياً على ${totalSessions} جلسة.`
                  }
                />
              )}

              {/* Sessions table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    توزيع اللينكات على الجلسات
                    {rawData.availableLinksCount === 1 && (
                      <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                        (نفس اللينك على جميع الجلسات)
                      </span>
                    )}
                    {rawData.availableLinksCount > 1 && (
                      <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                        (توزيع دوري)
                      </span>
                    )}
                  </h3>
                  {totalSessions > 6 && (
                    <button
                      onClick={() => setShowAllSessions((p) => !p)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      {showAllSessions
                        ? <><ChevronUp className="w-3 h-3" /> عرض أقل</>
                        : <><ChevronDown className="w-3 h-3" /> عرض الكل ({totalSessions})</>
                      }
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="grid grid-cols-12 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-5">اسم الجلسة</div>
                    <div className="col-span-3 text-center">التاريخ</div>
                    <div className="col-span-3 text-center">اللينك</div>
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {displayedRows.map((row, idx) => {
                      const link    = row.assignedLink;
                      const pm      = link ? (PLATFORM_META[link.platform] || PLATFORM_META.other) : null;
                      const session = row.session ?? row;
                      const date    = session?.scheduledDate
                        ? new Date(session.scheduledDate).toLocaleDateString("ar-EG", {
                            day: "numeric", month: "short",
                          })
                        : "—";

                      return (
                        <div
                          key={idx}
                          className={`grid grid-cols-12 px-4 py-3 items-center text-sm transition-colors ${
                            link
                              ? "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                              : "bg-orange-50/60 dark:bg-orange-900/10"
                          }`}
                        >
                          <div className="col-span-1 text-center">
                            <span className="inline-flex w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold items-center justify-center text-gray-500 dark:text-gray-400">
                              {idx + 1}
                            </span>
                          </div>
                          <div className="col-span-5 pr-1">
                            <p className="text-gray-800 dark:text-gray-200 font-medium leading-tight truncate" title={session?.title}>
                              {session?.title || `جلسة ${idx + 1}`}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {session?.startTime} – {session?.endTime}
                            </p>
                          </div>
                          <div className="col-span-3 text-center text-xs text-gray-500 dark:text-gray-400">
                            {date}
                          </div>
                          <div className="col-span-3 flex justify-center">
                            {link ? (
                              <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${pm.bg} ${pm.color}`}>
                                <span>{pm.emoji}</span>
                                <span className="truncate max-w-[60px]">{link.name}</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 font-medium bg-orange-100 dark:bg-orange-900/30 px-2.5 py-1 rounded-full">
                                <WifiOff className="w-3 h-3" />
                                لا يوجد
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {!showAllSessions && totalSessions > 6 && (
                      <div className="px-4 py-2.5 text-center text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800">
                        + {totalSessions - 6} جلسة أخرى
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Available links (compact) */}
              {rawData.availableLinks?.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer list-none flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 select-none">
                    <Video className="w-3.5 h-3.5" />
                    <span>اللينكات المتاحة ({rawData.availableLinks.length})</span>
                    <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-2 pt-1">
                    {rawData.availableLinks.map((link) => {
                      const pm = PLATFORM_META[link.platform] || PLATFORM_META.other;
                      return (
                        <span
                          key={link._id || link.id}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 ${pm.bg} ${pm.color} font-medium`}
                        >
                          {pm.emoji} {link.name}
                        </span>
                      );
                    })}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && rawData && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800/60 flex items-center gap-3 flex-shrink-0">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              إلغاء
            </button>

            {hasNoLinksAtAll ? (
              <button
                onClick={() => onConfirm(true, false)}
                className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                التفعيل بدون لينكات
              </button>
            ) : (
              <button
                onClick={() => onConfirm(false, false)}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                متابعة للإشعارات
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SummaryCard({ label, value, icon, color }) {
  const colors = {
    blue:   "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800",
    green:  "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800",
    orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800",
  };
  return (
    <div className={`rounded-xl border p-3 text-center ${colors[color]}`}>
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

function Banner({ type, icon, title, body }) {
  const styles = {
    success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300",
    error:   "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300",
    info:    "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300",
  };
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${styles[type]}`}>
      {icon}
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs mt-0.5 opacity-80">{body}</p>
      </div>
    </div>
  );
}