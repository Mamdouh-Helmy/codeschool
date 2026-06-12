"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X, Link2, AlertTriangle, CheckCircle, Calendar,
  Video, WifiOff, RefreshCw, ChevronDown, ChevronUp,
  Lock, Unlock, Square, CheckSquare, ArrowRight,
  Zap, Layers, ExternalLink, Clock
} from "lucide-react";
import toast from "react-hot-toast";

const PLATFORM_META = {
  zoom: { emoji: "🔷", color: "text-blue-500", bg: "bg-blue-500/10", label: "Zoom" },
  google_meet: { emoji: "🔴", color: "text-red-500", bg: "bg-red-500/10", label: "Meet" },
  microsoft_teams: { emoji: "🟣", color: "text-purple-500", bg: "bg-purple-500/10", label: "Teams" },
  other: { emoji: "🔗", color: "text-gray-400", bg: "bg-gray-500/10", label: "Other" },
};

function distributeLinks(sessions, selectedLinks) {
  if (!selectedLinks.length)
    return sessions.map((s) => ({ ...s, assignedLink: null }));
  return sessions.map((s, i) => ({
    ...s,
    assignedLink: selectedLinks[i % selectedLinks.length],
  }));
}

/* ─── Modern Stat Card (باستخدام ألوان العلامة التجارية) ─────────── */
function StatCard({ label, value, icon, trend }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-darklight border border-gray-200 dark:border-dark_border shadow-sm hover:shadow-brand-md transition-all duration-300">
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-teal-brand/5 to-orange-brand/5 rounded-full blur-2xl" />
      <div className="relative p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-teal-brand to-teal-dark text-white shadow-lg shadow-teal-brand/20">
            {icon}
          </div>
          {trend && (
            <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
              {trend}
            </span>
          )}
        </div>
        <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</p>
        <p className="text-xs text-gray-500 dark:text-darktext mt-1 font-medium">{label}</p>
      </div>
    </div>
  );
}

/* ─── Modern Banner (باستخدام ألوان العلامة التجارية) ─────────────── */
function AlertBanner({ type, icon, title, body, action }) {
  const styles = {
    success: "bg-gradient-to-r from-teal-brand/5 to-teal-brand/10 dark:from-teal-brand/10 dark:to-teal-brand/5 border-teal-brand/20 dark:border-teal-brand/30 text-teal-brand dark:text-teal-brand",
    error: "bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-500/10 dark:to-rose-500/10 border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300",
    warning: "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300",
    info: "bg-gradient-to-r from-teal-brand/5 to-teal-brand/10 dark:from-teal-brand/10 dark:to-teal-brand/5 border-teal-brand/20 dark:border-teal-brand/30 text-teal-brand dark:text-teal-brand",
  };
  return (
    <div className={`flex items-start gap-4 p-4 rounded-2xl border backdrop-blur-sm ${styles[type]}`}>
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-bold">{title}</p>
        {body && <p className="text-xs mt-1 opacity-80 leading-relaxed">{body}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/* ─── Modern Link Selector (باستخدام ألوان العلامة التجارية) ───────── */
function LinkSelector({ availableLinks, reservedLinks, selectedIds, onToggle, onReleaseReserved, releasing }) {
  const allAvailableSelected = availableLinks.length > 0 && availableLinks.every((l) => selectedIds.has(l._id?.toString() || l.id?.toString()));

  const toggleAll = () => {
    if (allAvailableSelected) {
      availableLinks.forEach((l) => onToggle(l._id?.toString() || l.id?.toString(), false));
    } else {
      availableLinks.forEach((l) => onToggle(l._id?.toString() || l.id?.toString(), true));
    }
  };

  return (
    <div className="space-y-4">
      {availableLinks.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-darklight border border-gray-200 dark:border-dark_border overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-gray-50 to-white dark:from-darkhover/30 dark:to-darklight border-b border-gray-200 dark:border-dark_border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-brand/10 text-teal-brand">
                <Unlock className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                اللينكات المتاحة <span className="text-teal-brand">({availableLinks.length})</span>
              </span>
            </div>
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-teal-brand hover:bg-teal-brand/10 transition-all"
            >
              {allAvailableSelected ? (
                <><CheckSquare className="w-3.5 h-3.5" /> إلغاء الكل</>
              ) : (
                <><Square className="w-3.5 h-3.5" /> تحديد الكل</>
              )}
            </button>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-dark_border/50">
            {availableLinks.map((link) => {
              const id = link._id?.toString() || link.id?.toString();
              const pm = PLATFORM_META[link.platform] || PLATFORM_META.other;
              const checked = selectedIds.has(id);
              return (
                <button
                  key={id}
                  onClick={() => onToggle(id, !checked)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-right transition-all duration-200 ${
                    checked
                      ? "bg-teal-brand/5 dark:bg-teal-brand/10 border-r-4 border-teal-brand"
                      : "hover:bg-gray-50 dark:hover:bg-darkhover/30"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2 transition-all ${
                    checked ? "bg-teal-brand border-teal-brand shadow-sm" : "border-gray-300 dark:border-gray-600 bg-white dark:bg-darkmid"
                  }`}>
                    {checked && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                  </div>

                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {link.name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${pm.bg} ${pm.color}`}>
                        {pm.emoji} {pm.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-darktext truncate mt-1 font-mono">{link.link}</p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {reservedLinks.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-500/5 dark:to-orange-500/5 border border-amber-brand/30 dark:border-amber-brand/20 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-amber-brand/10 dark:bg-amber-brand/5 border-b border-amber-brand/20">
            <Lock className="w-4 h-4 text-amber-brand" />
            <span className="text-sm font-bold text-orange-deep dark:text-amber-brand">
              لينكات محجوزة مؤقتاً ({reservedLinks.length})
            </span>
          </div>

          <div className="divide-y divide-amber-brand/20">
            {reservedLinks.map((link) => {
              const pm = PLATFORM_META[link.platform] || PLATFORM_META.other;
              const until = link.reservedUntil
                ? new Date(link.reservedUntil).toLocaleDateString("ar-EG", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })
                : "—";
              return (
                <div key={link.id?.toString()} className="flex items-center gap-3 px-5 py-3">
                  <Clock className="w-4 h-4 text-amber-brand flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                        {link.name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pm.bg} ${pm.color}`}>
                        {pm.emoji} {pm.label}
                      </span>
                    </div>
                    <p className="text-xs text-amber-brand/80 dark:text-amber-brand/70 mt-0.5">🕒 محجوز حتى: {until}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-5 py-4 border-t border-amber-brand/20 bg-amber-brand/5">
            <button
              onClick={onReleaseReserved}
              disabled={releasing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-brand to-orange-brand hover:from-orange-brand hover:to-orange-deep text-white transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {releasing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
              {releasing ? "جاري الإلغاء..." : "إلغاء الحجز وإتاحة اللينكات"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Modern Sessions Table (باستخدام ألوان العلامة التجارية) ──────── */
function SessionsTable({ sessionRows, showAll, onToggleShow }) {
  const total = sessionRows.length;
  const displayed = showAll ? sessionRows : sessionRows.slice(0, 5);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <div className="p-1 rounded-lg bg-teal-brand/10 text-teal-brand">
            <Layers className="w-4 h-4" />
          </div>
          توزيع اللينكات على الجلسات
        </h3>
        {total > 5 && (
          <button
            onClick={onToggleShow}
            className="flex items-center gap-1 text-xs font-medium text-teal-brand hover:text-teal-dark transition-colors"
          >
            {showAll ? (
              <><ChevronUp className="w-3.5 h-3.5" /> عرض أقل</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" /> عرض الكل ({total})</>
            )}
          </button>
        )}
      </div>

      <div className="rounded-2xl bg-white dark:bg-darklight border border-gray-200 dark:border-dark_border overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 bg-gray-50 dark:bg-darkhover/50 px-5 py-3 text-xs font-bold text-gray-500 dark:text-darktext uppercase border-b border-gray-200 dark:border-dark_border">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-5">الجلسة</div>
          <div className="col-span-3 text-center">التاريخ</div>
          <div className="col-span-3 text-center">اللينك</div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-dark_border/50">
          {displayed.map((row, idx) => {
            const link = row.assignedLink;
            const pm = link ? (PLATFORM_META[link.platform] || PLATFORM_META.other) : null;
            const date = row.scheduledDate
              ? new Date(row.scheduledDate).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })
              : "—";

            return (
              <div
                key={idx}
                className={`grid grid-cols-12 px-5 py-3 items-center text-sm transition-colors ${
                  link ? "hover:bg-gray-50 dark:hover:bg-darkhover/30" : "bg-amber-brand/5 dark:bg-amber-brand/5"
                }`}
              >
                <div className="col-span-1 text-center">
                  <span className="inline-flex w-6 h-6 rounded-full bg-gray-100 dark:bg-darkmid text-xs font-bold items-center justify-center text-gray-500">
                    {idx + 1}
                  </span>
                </div>
                <div className="col-span-5 pr-2">
                  <p className="text-gray-800 dark:text-gray-200 font-semibold leading-tight truncate text-sm" title={row.title}>
                    {row.title || `جلسة ${idx + 1}`}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-darktext mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {row.startTime} – {row.endTime}
                  </p>
                </div>
                <div className="col-span-3 text-center text-xs text-gray-500 dark:text-darktext">
                  {date}
                </div>
                <div className="col-span-3 flex justify-center">
                  {link ? (
                    <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${pm.bg} ${pm.color} shadow-sm`}>
                      {pm.emoji}
                      <span className="truncate max-w-[70px]">{link.name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-amber-brand font-medium bg-amber-brand/10 px-3 py-1 rounded-full">
                      <WifiOff className="w-3 h-3" />
                      بدون
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {!showAll && total > 5 && (
            <div className="px-5 py-2 text-center text-xs text-darktext bg-gray-50 dark:bg-darkhover/30 font-medium">
              + {total - 5} جلسات أخرى
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Modal (باستخدام ألوان العلامة التجارية بالكامل) ─────────── */
export default function MeetingLinksCheckModal({ isOpen, groupId, onClose, onConfirm }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showAll, setShowAll] = useState(false);
  const [releasing, setReleasing] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/activate`);
      const data = await res.json();
      if (!data.success) { setError(data.error || "حدث خطأ"); return; }
      setRawData(data.data);
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
      const res = await fetch("/api/groups/release-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkIds: ids }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error || "فشل الإلغاء"); return; }
      toast.success(`✨ تم إلغاء حجز ${data.released} لينك بنجاح`);
      await fetchStatus();
    } catch {
      toast.error("فشل في التواصل مع الخادم");
    } finally {
      setReleasing(false);
    }
  };

  if (!isOpen) return null;

  const availableLinks = rawData?.availableLinks || [];
  const reservedLinks = rawData?.reservedLinks || [];
  const allSessions = (rawData?.sessions || []).map((r) => r.session ?? r);
  const totalSessions = allSessions.length;
  const hasNoLinks = (rawData?.totalLinks ?? 0) === 0;

  const chosenLinks = availableLinks.filter(
    (l) => selectedIds.has(l._id?.toString() || l.id?.toString())
  );
  const chosenLinkIds = Array.from(selectedIds);
  const sessionRows = distributeLinks(allSessions, chosenLinks);
  const sessionsWithLinks = sessionRows.filter((r) => r.assignedLink).length;
  const sessionsWithout = totalSessions - sessionsWithLinks;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white dark:bg-darkmode rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200/50 dark:border-dark_border/50 animate-in zoom-in-95 duration-300">
        
        {/* Header - باستخدام التدرج اللوني للعلامة التجارية */}
        <div className="relative bg-gradient-to-l from-teal-brand to-teal-dark px-6 py-5 flex items-center justify-between flex-shrink-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-black/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
              <Link2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">توزيع لينكات الاجتماعات</h2>
              <p className="text-sm text-white/70 mt-0.5">اختر اللينكات المناسبة لكل جلسة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-teal-brand/20 rounded-full animate-spin border-t-teal-brand" />
                <Zap className="w-5 h-5 text-teal-brand absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm text-gray-500 dark:text-darktext font-medium">جاري تحليل اللينكات والجلسات...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 gap-5 px-6">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium text-center">{error}</p>
              <button
                onClick={fetchStatus}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-brand to-teal-dark text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all"
              >
                <RefreshCw className="w-4 h-4" /> إعادة المحاولة
              </button>
            </div>
          )}

          {!loading && !error && rawData && (
            <div className="p-6 space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="إجمالي الجلسات" value={totalSessions} icon={<Calendar className="w-5 h-5" />} />
                <StatCard label="ستأخذ لينكات" value={sessionsWithLinks} icon={<CheckCircle className="w-5 h-5" />} trend="✓ جاهزة" />
                <StatCard label="بدون لينكات" value={sessionsWithout} icon={<WifiOff className="w-5 h-5" />} />
              </div>

              {hasNoLinks && (
                <AlertBanner
                  type="error"
                  icon={<AlertTriangle className="w-5 h-5" />}
                  title="لا توجد لينكات في النظام"
                  body="لم يتم إضافة أي لينكات اجتماعات بعد. يمكنك إضافتها لاحقاً من إعدادات المجموعة."
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
                <AlertBanner
                  type="success"
                  icon={<CheckCircle className="w-5 h-5" />}
                  title={`✅ ${chosenLinks.length === 1 ? "لينك واحد مختار" : `${chosenLinks.length} لينكات مختارة`}`}
                  body={chosenLinks.length === 1
                    ? `سيتم استخدام نفس اللينك لجميع الجلسات الـ ${totalSessions}`
                    : `سيتم توزيع اللينكات دورياً على الـ ${totalSessions} جلسة`}
                />
              )}

              {!hasNoLinks && chosenLinks.length === 0 && availableLinks.length > 0 && (
                <AlertBanner
                  type="warning"
                  icon={<AlertTriangle className="w-5 h-5" />}
                  title="⚠️ لم تختر أي لينك"
                  body="سيتم إنشاء الجلسات بدون لينكات، يمكنك إضافتها لاحقاً"
                />
              )}

              {totalSessions > 0 && (
                <SessionsTable sessionRows={sessionRows} showAll={showAll} onToggleShow={() => setShowAll((p) => !p)} />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && rawData && (
          <div className="border-t border-gray-200 dark:border-dark_border px-6 py-5 bg-gray-50/80 dark:bg-darkhover/30 flex items-center gap-3 flex-shrink-0">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-dark_border text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-100 dark:hover:bg-darkhover transition-all"
            >
              إلغاء
            </button>

            {hasNoLinks || chosenLinks.length === 0 ? (
              <button
                onClick={() => onConfirm(true, false, [], availableLinks)}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-brand to-orange-brand hover:from-orange-brand hover:to-orange-deep text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <Zap className="w-4 h-4" />
                تفعيل بدون لينكات
              </button>
            ) : (
              <button
                onClick={() => onConfirm(false, false, chosenLinkIds, availableLinks)}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-brand to-teal-dark hover:from-teal-dark hover:to-teal-deeper text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <ArrowRight className="w-4 h-4" />
                متابعة للإشعارات
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}