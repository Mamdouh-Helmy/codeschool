"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link2Off, AlertTriangle, Check, RefreshCw, Wand2, Lock, ChevronDown, X } from "lucide-react";
import toast from "react-hot-toast";

/*
 * ملاحظة مهمة: الملف ده مستقل تمامًا (مفيش imports لكومبوننتات تانية)،
 * ومش بيستخدم <section> ولا h1-h6 عشان قواعد globals.css العامة
 * (section { py-20 } و h1/h2 ...) متأثرش على المودال.
 */

const PLATFORM_META = {
  zoom: { color: "#3b82f6", label: "Zoom" },
  google_meet: { color: "#ef4444", label: "Meet" },
  microsoft_teams: { color: "#a855f7", label: "Teams" },
  other: { color: "#9ca3af", label: "أخرى" },
};

const ISSUE = {
  orphaned: { color: "#f43f5e", label: "اللينك اتمسح" },
  missing: { color: "#f59e0b", label: "بدون لينك" },
};

const getId = (l) => l._id?.toString() || l.id?.toString();
const platformKey = (p) => (PLATFORM_META[p] ? p : "other");
const muted = "text-gray-500 dark:text-darkmuted";
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";
const ease = "cubic-bezier(.22,1,.36,1)";

/* ───────────── Charts (SVG صافي، من غير أي مكتبة) ───────────── */

function DonutChart({ segments, total, drawn }) {
  const R = 60;
  const C = 2 * Math.PI * R;
  const live = segments.filter((s) => s.value > 0);
  const gap = live.length > 1 ? 6 : 0;
  let acc = 0;

  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg
        viewBox="0 0 160 160"
        className="w-full h-full"
        style={{ transform: "rotate(-90deg)" }}
        role="img"
        aria-label={`${total} جلسة محتاجة لينك`}
      >
        <circle cx="80" cy="80" r={R} fill="none" stroke="currentColor" className="text-gray-200 dark:text-white/10" strokeWidth="14" />
        {live.map((s) => {
          const len = (s.value / total) * C;
          const el = (
            <circle
              key={s.key}
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${drawn ? Math.max(len - gap, 0.01) : 0.01} ${C}`}
              strokeDashoffset={-acc}
              className="motion-reduce:!transition-none"
              style={{ transition: `stroke-dasharray 1s ${ease}` }}
            />
          );
          acc += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-5xl font-black tabular-nums leading-none text-[#004d59] dark:text-white">{total}</span>
        <span className={`text-xs mt-2 ${muted}`}>جلسة محتاجة لينك</span>
      </div>
    </div>
  );
}

function PlatformChart({ rows, drawn }) {
  const max = Math.max(...rows.map((r) => r.available + r.reserved), 1);
  return (
    <div className="space-y-3.5">
      {rows.map((r) => {
        const meta = PLATFORM_META[r.key];
        const total = r.available + r.reserved;
        return (
          <div key={r.key} className="flex items-center gap-3">
            <span className="w-16 flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-200 flex-shrink-0">
              <i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: meta.color }} />
              {meta.label}
            </span>
            <div className="flex-1 h-4 rounded-md bg-gray-100 dark:bg-white/[0.07] overflow-hidden flex">
              <div
                className="h-full rounded-md motion-reduce:!transition-none"
                style={{
                  width: drawn ? `${(r.available / max) * 100}%` : "0%",
                  background: meta.color,
                  transition: `width .9s ${ease}`,
                }}
              />
              <div
                className="h-full motion-reduce:!transition-none"
                style={{
                  width: drawn ? `${(r.reserved / max) * 100}%` : "0%",
                  backgroundImage: `repeating-linear-gradient(45deg, ${meta.color}99 0 4px, transparent 4px 8px)`,
                  transition: `width .9s ${ease} .1s`,
                }}
              />
            </div>
            <span className="w-10 text-xs font-bold tabular-nums text-gray-800 dark:text-white text-left flex-shrink-0" dir="ltr">
              {total}
            </span>
          </div>
        );
      })}
      <div className={`flex items-center gap-4 pt-1 text-[11px] ${muted}`}>
        <span className="flex items-center gap-1.5">
          <i className="w-3.5 h-2 rounded-sm bg-gray-500 dark:bg-gray-300 inline-block" /> متاح
        </span>
        <span className="flex items-center gap-1.5">
          <i
            className="w-3.5 h-2 rounded-sm inline-block"
            style={{ backgroundImage: "repeating-linear-gradient(45deg, #6b7280 0 2px, transparent 2px 4px)" }}
          />
          محجوز على نفس الميعاد
        </span>
      </div>
    </div>
  );
}

/* ───────────── Modal ───────────── */

export default function FixGroupLinksModal({ isOpen, groupId, onClose, onFixed }) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => setMounted(true), []);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/fix-links`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "حدث خطأ");
        return;
      }
      setData(json.data);
      setSelectedIds(new Set((json.data.availableLinks || []).map(getId)));
    } catch {
      setError("فشل في جلب حالة اللينكات");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (isOpen && groupId) fetchStatus();
  }, [isOpen, groupId, fetchStatus]);

  // قفل سكرول الصفحة + Esc
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose, saving]);

  const ready = !loading && !error && !!data;

  // رسم الشارتات بعد ما الداتا تظهر (حركة واحدة عند الفتح)
  useEffect(() => {
    if (!ready) {
      setDrawn(false);
      return;
    }
    const t = setTimeout(() => setDrawn(true), 80);
    return () => clearTimeout(t);
  }, [ready]);

  const availableLinks = useMemo(() => data?.availableLinks || [], [data]);
  const reservedLinks = useMemo(() => data?.reservedLinks || [], [data]);
  const brokenSessions = useMemo(() => data?.brokenSessions || [], [data]);
  const hasNoLinks = data?.hasNoLinks;

  const orphanedCount = useMemo(() => brokenSessions.filter((s) => s.issue === "orphaned").length, [brokenSessions]);
  const missingCount = brokenSessions.length - orphanedCount;
  const totalBroken = brokenSessions.length;

  const platformRows = useMemo(() => {
    const map = {};
    const bump = (l, field) => {
      const k = platformKey(l.platform);
      map[k] ??= { key: k, available: 0, reserved: 0 };
      map[k][field] += 1;
    };
    availableLinks.forEach((l) => bump(l, "available"));
    reservedLinks.forEach((l) => bump(l, "reserved"));
    return Object.values(map).sort((a, b) => b.available + b.reserved - (a.available + a.reserved));
  }, [availableLinks, reservedLinks]);

  const allSelected = availableLinks.length > 0 && availableLinks.every((l) => selectedIds.has(getId(l)));

  const toggleLink = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSubmit = async (skipLinks = false) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/fix-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedLinkIds: skipLinks ? [] : Array.from(selectedIds) }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "فشل الإصلاح");
        return;
      }
      toast.success(json.message || "تم الإصلاح بنجاح");
      onFixed?.();
      onClose();
    } catch {
      toast.error("فشل في التواصل مع الخادم");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const pct = (v) => (totalBroken ? Math.round((v / totalBroken) * 100) : 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      style={{ height: "100dvh" }}
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fix-links-title"
    >
      <style>{`
        @keyframes fx-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fx-pop { from { opacity: 0; transform: translateY(14px) scale(.985) } to { opacity: 1; transform: none } }
        .fx-fade { animation: fx-fade .2s ease both }
        .fx-pop { animation: fx-pop .3s ${ease} both }
        @media (prefers-reduced-motion: reduce) { .fx-fade, .fx-pop { animation: none } }
      `}</style>

      <div
        className="fx-fade absolute inset-0 bg-[#001a1f]/70 backdrop-blur-sm"
        onClick={() => !saving && onClose?.()}
        aria-hidden="true"
      />

      <div className="fx-pop relative w-full max-w-4xl max-h-[94dvh] flex flex-col overflow-hidden rounded-3xl bg-white dark:bg-darklight border border-gray-200 dark:border-dark_border shadow-[0_30px_100px_-20px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="relative flex items-center justify-between gap-4 px-6 py-5 bg-gradient-to-l from-[#004d59] to-[#002a33] text-white flex-shrink-0 overflow-hidden">
          <Link2Off className="absolute -left-4 -bottom-6 w-32 h-32 text-white/[0.06]" aria-hidden="true" />
          <div className="relative flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#feaf00]/15 border border-[#feaf00]/40 flex items-center justify-center flex-shrink-0">
              <Link2Off className="w-6 h-6 text-[#feaf00]" />
            </div>
            <div className="min-w-0">
              <p id="fix-links-title" className="text-lg sm:text-xl font-bold leading-snug">
                إصلاح لينكات الاجتماعات
              </p>
              <p className="text-sm text-white/65 mt-0.5 truncate">
                {data?.groupName ? `الجروب: ${data.groupName}` : "جاري التحميل..."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            aria-label="إغلاق"
            className={`relative p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 ${focusRing}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading && (
            <div className="flex flex-col items-center justify-center py-28 gap-4">
              <div className="w-10 h-10 rounded-full border-4 border-gray-200 dark:border-white/10 border-t-primary animate-spin" />
              <p className={`text-sm ${muted}`}>جاري الفحص...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
              <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>
              <button
                onClick={fetchStatus}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-[#e65c00] text-white text-sm font-semibold ${focusRing}`}
              >
                <RefreshCw className="w-4 h-4" /> إعادة المحاولة
              </button>
            </div>
          )}

          {ready && (
            <div className="grid md:grid-cols-[20rem_1fr]">
              {/* ── العمود الأول: التشخيص ── */}
              <div className="p-6 bg-gray-50 dark:bg-darkmode/40 md:border-l border-b md:border-b-0 border-gray-200 dark:border-dark_border">
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">إيه المشكلة؟</p>

                <DonutChart
                  total={totalBroken || 1}
                  drawn={drawn}
                  segments={[
                    { key: "orphaned", value: orphanedCount, color: ISSUE.orphaned.color },
                    { key: "missing", value: missingCount, color: ISSUE.missing.color },
                  ]}
                />

                <div className="mt-5 space-y-2">
                  {[
                    { k: "orphaned", v: orphanedCount },
                    { k: "missing", v: missingCount },
                  ].map(({ k, v }) => (
                    <div
                      key={k}
                      className="flex items-center justify-between rounded-xl bg-white dark:bg-darklight border border-gray-200 dark:border-dark_border px-3.5 py-2.5"
                    >
                      <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                        <i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: ISSUE[k].color }} />
                        {ISSUE[k].label}
                      </span>
                      <span className="flex items-baseline gap-1.5">
                        <b className="text-base font-black tabular-nums text-gray-900 dark:text-white">{v}</b>
                        <span className={`text-[11px] tabular-nums ${muted}`}>{pct(v)}%</span>
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-sm font-bold text-gray-900 dark:text-white mt-6 mb-2.5">الجلسات المتأثرة</p>
                <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 dark:border-dark_border bg-white dark:bg-darklight divide-y divide-gray-100 dark:divide-white/[0.06]">
                  {brokenSessions.map((s) => (
                    <div key={s.id} className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm">
                      <i
                        className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                        style={{ background: s.issue === "orphaned" ? ISSUE.orphaned.color : ISSUE.missing.color }}
                      />
                      <span className="text-gray-800 dark:text-gray-200 truncate">{s.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── العمود التاني: اللينكات ── */}
              <div className="p-6 space-y-7 min-w-0">
                {/* شارت المنصات */}
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">اللينكات حسب المنصة</p>
                  {hasNoLinks || platformRows.length === 0 ? (
                    <div className="flex items-start gap-3 rounded-xl border border-rose-200 dark:border-rose-400/30 bg-rose-50 dark:bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-200">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      لا توجد لينكات اجتماعات في النظام أصلاً — أضف لينكات جديدة الأول.
                    </div>
                  ) : (
                    <PlatformChart rows={platformRows} drawn={drawn} />
                  )}
                </div>

                {/* اختيار اللينكات */}
                {!hasNoLinks && (
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        اختار اللينكات
                        <span className={`font-normal mr-2 ${muted}`}>({availableLinks.length} متاح)</span>
                      </p>
                      {availableLinks.length > 0 && (
                        <button
                          onClick={() => setSelectedIds(allSelected ? new Set() : new Set(availableLinks.map(getId)))}
                          className={`text-xs font-semibold text-primary hover:underline rounded ${focusRing}`}
                        >
                          {allSelected ? "إلغاء الكل" : "تحديد الكل"}
                        </button>
                      )}
                    </div>

                    {availableLinks.length === 0 ? (
                      <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        كل اللينكات محجوزة على نفس الميعاد — مفيش لينك متاح للاختيار.
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pl-1">
                        {availableLinks.map((link) => {
                          const id = getId(link);
                          const meta = PLATFORM_META[platformKey(link.platform)];
                          const checked = selectedIds.has(id);
                          return (
                            <button
                              key={id}
                              onClick={() => toggleLink(id)}
                              aria-pressed={checked}
                              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border text-right transition-colors ${focusRing} ${
                                checked
                                  ? "border-primary bg-primary/[0.08]"
                                  : "border-gray-200 dark:border-dark_border hover:bg-gray-50 dark:hover:bg-darkhover"
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                  checked ? "bg-primary border-primary" : "border-gray-300 dark:border-gray-600"
                                }`}
                              >
                                {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                              </span>
                              <span className="flex-1 min-w-0 text-sm font-semibold text-gray-900 dark:text-white truncate">{link.name}</span>
                              <span className={`flex items-center gap-1.5 text-[11px] flex-shrink-0 ${muted}`}>
                                <i className="w-2 h-2 rounded-full inline-block" style={{ background: meta.color }} />
                                {meta.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* المحجوز */}
                {!hasNoLinks && reservedLinks.length > 0 && (
                  <details className="group rounded-xl border border-dashed border-gray-300 dark:border-dark_border overflow-hidden">
                    <summary
                      className={`flex items-center justify-between gap-2 px-4 py-2.5 text-xs font-semibold cursor-pointer select-none list-none ${muted} ${focusRing}`}
                    >
                      <span className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5" />
                        لينكات محجوزة على نفس الميعاد ({reservedLinks.length}) — مش هتظهر كخيار
                      </span>
                      <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="px-4 pb-3 pt-1 space-y-1.5">
                      {reservedLinks.map((l) => (
                        <p key={l.id} className={`text-xs ${muted}`}>
                          {l.name} — محجوز {l.reservedDays?.join("، ")} ({l.reservedTime})
                        </p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {ready && (
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-dark_border bg-gray-50/80 dark:bg-darkmode/50 flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => handleSubmit(false)}
                disabled={saving || selectedIds.size === 0}
                className={`px-6 py-2.5 rounded-xl bg-primary hover:bg-[#e65c00] text-white text-sm font-bold whitespace-nowrap flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${focusRing}`}
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                إصلاح الآن {selectedIds.size > 0 && `(${selectedIds.size})`}
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={saving}
                className={`px-5 py-2.5 rounded-xl border border-gray-300 dark:border-dark_border text-gray-700 dark:text-white text-sm font-medium whitespace-nowrap hover:bg-gray-100 dark:hover:bg-darkhover disabled:opacity-50 transition-colors ${focusRing}`}
              >
                متابعة بدون لينك
              </button>
              <button
                onClick={onClose}
                disabled={saving}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap text-gray-500 dark:text-darkmuted hover:bg-gray-100 dark:hover:bg-darkhover disabled:opacity-50 transition-colors ${focusRing}`}
              >
                إلغاء
              </button>
            </div>
            {!hasNoLinks && availableLinks.length > 0 && (
              <p className={`text-xs ${muted}`}>
                مختار <b className="text-gray-900 dark:text-white tabular-nums">{selectedIds.size}</b> من {availableLinks.length} لينك
              </p>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}