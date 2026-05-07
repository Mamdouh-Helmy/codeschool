"use client";
import { useState, useEffect, useCallback } from "react";
import {
  X, Link2, AlertTriangle, CheckCircle, Calendar,
  Video, WifiOff, RefreshCw, ChevronDown, ChevronUp,
  Lock, Unlock, Square, CheckSquare,
} from "lucide-react";
import toast from "react-hot-toast";

const PLATFORM_META = {
  zoom:            { emoji: "🔷", color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20",     label: "Zoom" },
  google_meet:     { emoji: "🔴", color: "text-red-600",    bg: "bg-red-50 dark:bg-red-900/20",       label: "Meet" },
  microsoft_teams: { emoji: "🔵", color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20", label: "Teams" },
  other:           { emoji: "🔗", color: "text-gray-600",   bg: "bg-gray-50 dark:bg-gray-800",        label: "Other" },
};

function distributeLinks(sessions, selectedLinks) {
  if (!selectedLinks.length)
    return sessions.map((s) => ({ ...s, assignedLink: null }));
  return sessions.map((s, i) => ({
    ...s,
    assignedLink: selectedLinks[i % selectedLinks.length],
  }));
}

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
    warning: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300",
    info:    "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300",
  };
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${styles[type]}`}>
      {icon}
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {body && <p className="text-xs mt-0.5 opacity-80">{body}</p>}
      </div>
    </div>
  );
}

function LinkSelector({ availableLinks, reservedLinks, selectedIds, onToggle, onReleaseReserved, releasing }) {
  const allAvailableSelected = availableLinks.length > 0 &&
    availableLinks.every((l) => selectedIds.has(l._id?.toString() || l.id?.toString()));

  const toggleAll = () => {
    if (allAvailableSelected) {
      availableLinks.forEach((l) => onToggle(l._id?.toString() || l.id?.toString(), false));
    } else {
      availableLinks.forEach((l) => onToggle(l._id?.toString() || l.id?.toString(), true));
    }
  };

  return (
    <div className="space-y-3">
      {availableLinks.length > 0 && (
        <div className="rounded-xl border border-green-200 dark:border-green-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <Unlock className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-800 dark:text-green-300">
                اللينكات المتاحة ({availableLinks.length})
              </span>
            </div>
            <button
              onClick={toggleAll}
              className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400 hover:text-green-900 transition"
            >
              {allAvailableSelected
                ? <><CheckSquare className="w-3.5 h-3.5" /> إلغاء تحديد الكل</>
                : <><Square className="w-3.5 h-3.5" /> تحديد الكل</>
              }
            </button>
          </div>
          <div className="divide-y divide-green-50 dark:divide-green-900/20">
            {availableLinks.map((link) => {
              const id  = link._id?.toString() || link.id?.toString();
              const pm  = PLATFORM_META[link.platform] || PLATFORM_META.other;
              const checked = selectedIds.has(id);
              return (
                <button
                  key={id}
                  onClick={() => onToggle(id, !checked)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors ${
                    checked
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : "bg-white dark:bg-gray-900 hover:bg-green-50 dark:hover:bg-green-900/10"
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-all ${
                    checked
                      ? "bg-blue-600 border-blue-600"
                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  }`}>
                    {checked && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {link.name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${pm.bg} ${pm.color}`}>
                        {pm.emoji} {pm.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                      {link.link}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {reservedLinks.length > 0 && (
        <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                لينكات محجوزة ({reservedLinks.length})
              </span>
            </div>
          </div>
          <div className="divide-y divide-yellow-50 dark:divide-yellow-900/20">
            {reservedLinks.map((link) => {
              const pm = PLATFORM_META[link.platform] || PLATFORM_META.other;
              const until = link.reservedUntil
                ? new Date(link.reservedUntil).toLocaleDateString("ar-EG", {
                    day: "numeric", month: "short",
                    hour: "2-digit", minute: "2-digit",
                  })
                : "—";
              return (
                <div key={link.id?.toString()} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900">
                  <Lock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                        {link.name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${pm.bg} ${pm.color}`}>
                        {pm.emoji} {pm.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      محجوز حتى: {until}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-4 py-3 border-t border-yellow-200 dark:border-yellow-800">
            <button
              onClick={onReleaseReserved}
              disabled={releasing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-yellow-500 hover:bg-yellow-600 text-white transition disabled:opacity-50"
            >
              {releasing
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Unlock className="w-4 h-4" />
              }
              {releasing ? "جاري الإلغاء..." : "إلغاء حجزها وإتاحتها"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionsTable({ sessionRows, showAll, onToggleShow }) {
  const total     = sessionRows.length;
  const displayed = showAll ? sessionRows : sessionRows.slice(0, 6);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          توزيع اللينكات على الجلسات
        </h3>
        {total > 6 && (
          <button
            onClick={onToggleShow}
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            {showAll
              ? <><ChevronUp className="w-3 h-3" /> عرض أقل</>
              : <><ChevronDown className="w-3 h-3" /> عرض الكل ({total})</>
            }
          </button>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-5">الجلسة</div>
          <div className="col-span-3 text-center">التاريخ</div>
          <div className="col-span-3 text-center">اللينك</div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {displayed.map((row, idx) => {
            const link = row.assignedLink;
            const pm   = link ? (PLATFORM_META[link.platform] || PLATFORM_META.other) : null;
            const date = row.scheduledDate
              ? new Date(row.scheduledDate).toLocaleDateString("ar-EG", {
                  day: "numeric", month: "short",
                })
              : "—";

            return (
              <div
                key={idx}
                className={`grid grid-cols-12 px-4 py-3 items-center text-sm ${
                  link
                    ? "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    : "bg-orange-50/60 dark:bg-orange-900/10"
                }`}
              >
                <div className="col-span-1 text-center">
                  <span className="inline-flex w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold items-center justify-center text-gray-500">
                    {idx + 1}
                  </span>
                </div>
                <div className="col-span-5 pr-1">
                  <p className="text-gray-800 dark:text-gray-200 font-medium leading-tight truncate text-xs" title={row.title}>
                    {row.title || `جلسة ${idx + 1}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {row.startTime} – {row.endTime}
                  </p>
                </div>
                <div className="col-span-3 text-center text-xs text-gray-500 dark:text-gray-400">
                  {date}
                </div>
                <div className="col-span-3 flex justify-center">
                  {link ? (
                    <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${pm.bg} ${pm.color}`}>
                      {pm.emoji}
                      <span className="truncate max-w-[60px]">{link.name}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 font-medium bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-full">
                      <WifiOff className="w-3 h-3" />
                      لا يوجد
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {!showAll && total > 6 && (
            <div className="px-4 py-2 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800">
              + {total - 6} جلسة أخرى
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── المودال الرئيسي ───────────────────────────────────────────────────────────
// ✅ onConfirm(forceActivate, releaseReserved, selectedLinkIds)
export default function MeetingLinksCheckModal({ isOpen, groupId, onClose, onConfirm }) {
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [rawData, setRawData]           = useState(null);
  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [showAll, setShowAll]           = useState(false);
  const [releasing, setReleasing]       = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/groups/${groupId}/activate`);
      const data = await res.json();
      if (!data.success) { setError(data.error || "حدث خطأ"); return; }
      setRawData(data.data);
      // اختر كل المتاحة تلقائياً
      const ids = new Set(
        (data.data.availableLinks || []).map((l) => l._id?.toString() || l.id?.toString())
      );
      setSelectedIds(ids);
    } catch {
      setError("فشل في التحقق من اللينكات");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (isOpen && groupId) fetchStatus();
  }, [isOpen, groupId, fetchStatus]);

  const toggleLink = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const handleReleaseReserved = async () => {
    setReleasing(true);
    try {
      const ids = (rawData?.reservedLinks || []).map((l) => l.id?.toString());
      const res  = await fetch("/api/groups/release-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkIds: ids }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error || "فشل الإلغاء"); return; }
      toast.success(`تم إلغاء حجز ${data.released} لينك وإعادة توفيرهم`);
      await fetchStatus();
    } catch {
      toast.error("فشل في التواصل مع الخادم");
    } finally {
      setReleasing(false);
    }
  };

  if (!isOpen) return null;

  const availableLinks = rawData?.availableLinks || [];
  const reservedLinks  = rawData?.reservedLinks  || [];
  const allSessions    = (rawData?.sessions || []).map((r) => r.session ?? r);
  const totalSessions  = allSessions.length;
  const hasNoLinks     = (rawData?.totalLinks ?? 0) === 0;

  // اللينكات المختارة فعلياً
  const chosenLinks = availableLinks.filter(
    (l) => selectedIds.has(l._id?.toString() || l.id?.toString())
  );

  // ✅ IDs المختارة كـ array جاهزة للإرسال
  const chosenLinkIds = Array.from(selectedIds);

  // توزيع اللينكات على الجلسات للمعاينة
  const sessionRows       = distributeLinks(allSessions, chosenLinks);
  const sessionsWithLinks = sessionRows.filter((r) => r.assignedLink).length;
  const sessionsWithout   = totalSessions - sessionsWithLinks;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">

        {/* Header */}
        <div className="bg-gradient-to-l from-blue-700 to-indigo-700 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">توزيع لينكات الاجتماعات</h2>
              <p className="text-xs text-white/70">اختر اللينكات التي ستُوزَّع على الجلسات</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              <p className="text-sm text-gray-500">جاري تحليل اللينكات والجلسات...</p>
            </div>
          )}

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

          {!loading && !error && rawData && (
            <div className="p-5 space-y-4">

              {/* إحصاءات */}
              <div className="grid grid-cols-3 gap-3">
                <SummaryCard label="إجمالي الجلسات" value={totalSessions}      icon={<Calendar className="w-5 h-5" />}  color="blue" />
                <SummaryCard label="ستأخذ لينكات"   value={sessionsWithLinks}  icon={<CheckCircle className="w-5 h-5" />} color="green" />
                <SummaryCard label="بدون لينكات"    value={sessionsWithout}    icon={<WifiOff className="w-5 h-5" />}    color={sessionsWithout > 0 ? "orange" : "green"} />
              </div>

              {hasNoLinks && (
                <Banner
                  type="error"
                  icon={<AlertTriangle className="w-5 h-5 flex-shrink-0" />}
                  title="لا توجد لينكات في النظام"
                  body="لم يتم إضافة أي لينكات اجتماعات بعد. ستُنشأ الجلسات بدون لينكات ويمكن إضافتها لاحقاً."
                />
              )}

              {!hasNoLinks && (
                <LinkSelector
                  availableLinks={availableLinks}
                  reservedLinks={reservedLinks}
                  selectedIds={selectedIds}
                  onToggle={toggleLink}
                  onReleaseReserved={handleReleaseReserved}
                  releasing={releasing}
                />
              )}

              {!hasNoLinks && chosenLinks.length > 0 && (
                <Banner
                  type="success"
                  icon={<CheckCircle className="w-5 h-5 flex-shrink-0" />}
                  title={`${chosenLinks.length === 1 ? "لينك واحد مختار" : `${chosenLinks.length} لينكات مختارة`} — كل الجلسات ستحصل على لينك ✓`}
                  body={
                    chosenLinks.length === 1
                      ? `نفس اللينك سيُستخدم لجميع الـ ${totalSessions} جلسة.`
                      : `سيتوزعون دورياً على الـ ${totalSessions} جلسة.`
                  }
                />
              )}

              {!hasNoLinks && chosenLinks.length === 0 && availableLinks.length > 0 && (
                <Banner
                  type="warning"
                  icon={<AlertTriangle className="w-5 h-5 flex-shrink-0" />}
                  title="لم تختر أي لينك"
                  body="ستُنشأ الجلسات بدون لينكات. يمكنك إضافتها لاحقاً."
                />
              )}

              {totalSessions > 0 && (
                <SessionsTable
                  sessionRows={sessionRows}
                  showAll={showAll}
                  onToggleShow={() => setShowAll((p) => !p)}
                />
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

            {hasNoLinks || chosenLinks.length === 0 ? (
              <button
                onClick={() => onConfirm(true, false, [])}
                className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                التفعيل بدون لينكات
              </button>
            ) : (
              <button
                onClick={() => onConfirm(false, false, chosenLinkIds)}
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