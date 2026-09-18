"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Link2Off, AlertTriangle, CheckCircle, RefreshCw, Square, CheckSquare, Wand2 } from "lucide-react";
import toast from "react-hot-toast";

const PLATFORM_META = {
  zoom: { emoji: "🔷", color: "text-blue-500", bg: "bg-blue-500/10", label: "Zoom" },
  google_meet: { emoji: "🔴", color: "text-red-500", bg: "bg-red-500/10", label: "Meet" },
  microsoft_teams: { emoji: "🟣", color: "text-purple-500", bg: "bg-purple-500/10", label: "Teams" },
  other: { emoji: "🔗", color: "text-gray-400", bg: "bg-gray-500/10", label: "Other" },
};

export default function FixGroupLinksModal({ isOpen, groupId, onClose, onFixed }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/fix-links`);
      const json = await res.json();
      if (!json.success) { setError(json.error || "حدث خطأ"); return; }
      setData(json.data);
      const ids = new Set((json.data.availableLinks || []).map((l) => l._id?.toString() || l.id?.toString()));
      setSelectedIds(ids);
    } catch {
      setError("فشل في جلب حالة اللينكات");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (isOpen && groupId) fetchStatus();
  }, [isOpen, groupId, fetchStatus]);

  const toggleLink = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSubmit = async (skipLinks = false) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/fix-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedLinkIds: skipLinks ? [] : Array.from(selectedIds) }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error || "فشل الإصلاح"); return; }
      toast.success(json.message || "تم الإصلاح بنجاح");
      onFixed?.();
      onClose();
    } catch {
      toast.error("فشل في التواصل مع الخادم");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const availableLinks = data?.availableLinks || [];
  const reservedLinks = data?.reservedLinks || [];
  const brokenSessions = data?.brokenSessions || [];
  const hasNoLinks = data?.hasNoLinks;

  const allSelected = availableLinks.length > 0 && availableLinks.every((l) => selectedIds.has(l._id?.toString() || l.id?.toString()));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white dark:bg-darkmode rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        <div className="relative bg-gradient-to-l from-amber-500 to-orange-600 px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Link2Off className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">إصلاح لينكات الاجتماعات</h2>
              <p className="text-sm text-white/70 mt-0.5">
                {data?.groupName ? `الجروب: ${data.groupName}` : "جاري التحميل..."}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-all">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-10 h-10 border-4 border-amber-500/20 rounded-full animate-spin border-t-amber-500" />
              <p className="text-sm text-gray-500">جاري الفحص...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <AlertTriangle className="w-10 h-10 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
              <button onClick={fetchStatus} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold">
                <RefreshCw className="w-4 h-4" /> إعادة المحاولة
              </button>
            </div>
          )}

          {!loading && !error && data && (
            <>
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                    {brokenSessions.length} جلسة محتاجة لينك
                  </p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-300/70 mt-1">
                    {brokenSessions.some((s) => s.issue === "orphaned")
                      ? "فيه جلسات كانت مرتبطة بلينك اتمسح من النظام، وجلسات تانية من غير لينك أصلاً."
                      : "الجلسات دي مفيهاش لينك اجتماع محدد."}
                  </p>
                </div>
              </div>

              {/* قائمة الجلسات المتأثرة */}
              <div className="rounded-2xl border border-gray-200 dark:border-dark_border overflow-hidden">
                <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-dark_border/50">
                  {brokenSessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="text-gray-700 dark:text-gray-300 truncate">{s.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        s.issue === "orphaned"
                          ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                      }`}>
                        {s.issue === "orphaned" ? "اللينك اتمسح" : "بدون لينك"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {hasNoLinks && (
                <div className="rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-4 text-sm text-red-700 dark:text-red-300">
                  لا توجد لينكات اجتماعات متاحة في النظام أصلاً — أضف لينكات جديدة الأول.
                </div>
              )}

              {!hasNoLinks && availableLinks.length > 0 && (
                <div className="rounded-2xl border border-gray-200 dark:border-dark_border overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-dark_input/40 border-b border-gray-200 dark:border-dark_border">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                      لينكات متاحة فعليًا ({availableLinks.length})
                    </span>
                    <button
                      onClick={() =>
                        allSelected
                          ? setSelectedIds(new Set())
                          : setSelectedIds(new Set(availableLinks.map((l) => l._id?.toString() || l.id?.toString())))
                      }
                      className="text-xs font-medium text-primary flex items-center gap-1"
                    >
                      {allSelected ? <><CheckSquare className="w-3.5 h-3.5" /> إلغاء الكل</> : <><Square className="w-3.5 h-3.5" /> تحديد الكل</>}
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-dark_border/50 max-h-56 overflow-y-auto">
                    {availableLinks.map((link) => {
                      const linkId = link._id?.toString() || link.id?.toString();
                      const pm = PLATFORM_META[link.platform] || PLATFORM_META.other;
                      const checked = selectedIds.has(linkId);
                      return (
                        <button
                          key={linkId}
                          onClick={() => toggleLink(linkId)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-all ${checked ? "bg-primary/5" : "hover:bg-gray-50 dark:hover:bg-dark_input/40"}`}
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 ${checked ? "bg-primary border-primary" : "border-gray-300 dark:border-gray-600"}`}>
                            {checked && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{link.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${pm.bg} ${pm.color}`}>{pm.emoji} {pm.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {!hasNoLinks && reservedLinks.length > 0 && (
                <div className="rounded-2xl bg-gray-50 dark:bg-dark_input/40 border border-gray-200 dark:border-dark_border p-4">
                  <p className="text-xs font-bold text-gray-500 mb-2">
                    لينكات محجوزة فعليًا على نفس الميعاد ({reservedLinks.length}) — مش هتظهر كخيار:
                  </p>
                  <div className="space-y-1">
                    {reservedLinks.map((l) => (
                      <p key={l.id} className="text-xs text-gray-500 dark:text-gray-400">
                        • {l.name} — محجوز {l.reservedDays?.join("، ")} ({l.reservedTime})
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {!loading && !error && data && (
          <div className="border-t border-gray-200 dark:border-dark_border px-6 py-4 flex items-center gap-3 flex-shrink-0">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-dark_border text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold">
              إلغاء
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-bold disabled:opacity-50"
            >
              متابعة بدون لينك
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={saving || selectedIds.size === 0}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Wand2 className="w-4 h-4" />}
              إصلاح الآن
            </button>
          </div>
        )}
      </div>
    </div>
  );
}