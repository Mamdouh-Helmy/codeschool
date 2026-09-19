"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Link2Off, AlertTriangle, Check, RefreshCw, Wand2, Lock } from "lucide-react";
import toast from "react-hot-toast";

const PLATFORM_META = {
  zoom: { color: "#3b82f6", label: "Zoom" },
  google_meet: { color: "#ef4444", label: "Meet" },
  microsoft_teams: { color: "#a855f7", label: "Teams" },
  other: { color: "#9ca3af", label: "أخرى" },
};

const ISSUE_COLORS = { orphaned: "#fb7185", missing: "#feaf00" };

const PANEL_BG = {
  backgroundColor: "#00222a",
  backgroundImage: [
    "radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,.55), transparent)",
    "radial-gradient(1px 1px at 110px 85px, rgba(255,255,255,.35), transparent)",
    "radial-gradient(1.5px 1.5px at 170px 45px, rgba(254,175,0,.55), transparent)",
    "radial-gradient(ellipse at top right, rgba(0,77,89,.95), transparent 65%)",
  ].join(","),
  backgroundSize: "210px 120px, 210px 120px, 210px 120px, 100% 100%",
  backgroundRepeat: "repeat, repeat, repeat, no-repeat",
};

const getId = (l) => l._id?.toString() || l.id?.toString();
const platformKey = (p) => (PLATFORM_META[p] ? p : "other");
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#feaf00]/70";

/* ───────────── Charts (pure SVG / CSS, no extra dependency) ───────────── */

function Donut({ segments, total }) {
  const R = 54;
  const C = 2 * Math.PI * R;
  const live = segments.filter((s) => s.value > 0);
  const gap = live.length > 1 ? 5 : 0;
  let acc = 0;

  return (
    <div className="relative w-40 h-40 mx-auto flex-shrink-0">
      <svg
        viewBox="0 0 140 140"
        className="w-full h-full fx-orbit"
        style={{ transform: "rotate(-90deg)" }}
        role="img"
        aria-label={`${total} جلسة محتاجة لينك`}
      >
        <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" />
        {live.map((s) => {
          const len = (s.value / total) * C;
          const el = (
            <circle
              key={s.key}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${Math.max(len - gap, 0.01)} ${C}`}
              strokeDashoffset={-acc}
            />
          );
          acc += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-white tabular-nums leading-none">{total}</span>
        <span className="text-xs text-white/50 mt-1.5">جلسة محتاجة لينك</span>
      </div>
    </div>
  );
}

function PlatformBars({ rows }) {
  const max = Math.max(...rows.map((r) => r.available + r.reserved), 1);
  return (
    <div className="space-y-3.5">
      {rows.map((r) => {
        const meta = PLATFORM_META[r.key];
        return (
          <div key={r.key} className="flex items-center gap-3">
            <span className="w-14 flex items-center gap-1.5 text-xs text-white/75 flex-shrink-0">
              <i className="w-2 h-2 rounded-full inline-block" style={{ background: meta.color }} />
              {meta.label}
            </span>
            <div className="flex-1 h-3 rounded-full bg-white/[0.06] overflow-hidden flex">
              <div
                className="h-full"
                style={{ width: `${(r.available / max) * 100}%`, background: meta.color }}
              />
              <div
                className="h-full"
                style={{
                  width: `${(r.reserved / max) * 100}%`,
                  backgroundImage: `repeating-linear-gradient(45deg, ${meta.color}88 0 4px, transparent 4px 8px)`,
                }}
              />
            </div>
            <span className="w-14 text-xs tabular-nums text-white/55 flex-shrink-0 text-left" dir="ltr">
              {r.available} · {r.reserved}
            </span>
          </div>
        );
      })}
      <div className="flex items-center gap-4 pt-1 text-[11px] text-white/45">
        <span className="flex items-center gap-1.5">
          <i className="w-3 h-1.5 rounded-full bg-white/70 inline-block" /> متاح
        </span>
        <span className="flex items-center gap-1.5">
          <i
            className="w-3 h-1.5 rounded-full inline-block"
            style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,.7) 0 2px, transparent 2px 4px)" }}
          />
          محجوز
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

  useEffect(() => setMounted(true), []);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/fix-links`);
      const json = await res.json();
      if (!json.success) { setError(json.error || "حدث خطأ"); return; }
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

  // قفل سكرول الصفحة + Esc للإغلاق
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  const availableLinks = useMemo(() => data?.availableLinks || [], [data]);
  const reservedLinks = useMemo(() => data?.reservedLinks || [], [data]);
  const brokenSessions = useMemo(() => data?.brokenSessions || [], [data]);
  const hasNoLinks = data?.hasNoLinks;

  const orphanedCount = useMemo(() => brokenSessions.filter((s) => s.issue === "orphaned").length, [brokenSessions]);
  const missingCount = brokenSessions.length - orphanedCount;

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

  if (!isOpen || !mounted) return null;

  const ready = !loading && !error && data;

  // Portal على body: الخلفية بتاخد الشاشة كلها مهما كان الـ parent (transform / overflow / z-index)
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      style={{ height: "100dvh" }}
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="إصلاح لينكات الاجتماعات"
    >
      <style>{`
        @keyframes fx-orbit-in { from { transform: rotate(-300deg); opacity: 0; } to { transform: rotate(-90deg); opacity: 1; } }
        .fx-orbit { animation: fx-orbit-in .9s cubic-bezier(.22,1,.36,1) both; }
        @media (prefers-reduced-motion: reduce) { .fx-orbit { animation: none; } }
      `}</style>

      {/* الخلفية السمراء: fixed على الشاشة كلها */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} aria-hidden="true" />

      <div
        className="relative w-full max-w-3xl max-h-[92dvh] flex flex-col overflow-hidden rounded-[28px] border border-white/10 shadow-[0_30px_120px_-20px_rgba(0,0,0,0.9)]"
        style={PANEL_BG}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-full border border-[#feaf00]/40 bg-[#feaf00]/10 flex items-center justify-center flex-shrink-0">
              <Link2Off className="w-5 h-5 text-[#feaf00]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white">إصلاح لينكات الاجتماعات</h2>
              <p className="text-sm text-white/55 mt-0.5 truncate">
                {data?.groupName ? `الجروب: ${data.groupName}` : "جاري التحميل..."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className={`p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors ${focusRing}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 rounded-full border-4 border-white/10 border-t-[#feaf00] animate-spin" />
              <p className="text-sm text-white/50">جاري الفحص...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <AlertTriangle className="w-10 h-10 text-rose-400" />
              <p className="text-sm text-rose-300">{error}</p>
              <button
                onClick={fetchStatus}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff6700] text-white text-sm font-bold ${focusRing}`}
              >
                <RefreshCw className="w-4 h-4" /> إعادة المحاولة
              </button>
            </div>
          )}

          {ready && (
            <>
              {/* Charts */}
              <div className="grid gap-4 md:grid-cols-[minmax(0,15rem)_1fr]">
                <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 flex flex-col items-center gap-4">
                  <Donut
                    total={brokenSessions.length || 1}
                    segments={[
                      { key: "orphaned", value: orphanedCount, color: ISSUE_COLORS.orphaned },
                      { key: "missing", value: missingCount, color: ISSUE_COLORS.missing },
                    ]}
                  />
                  <div className="w-full space-y-2 text-xs">
                    <div className="flex items-center justify-between text-white/70">
                      <span className="flex items-center gap-2">
                        <i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: ISSUE_COLORS.orphaned }} />
                        اللينك اتمسح
                      </span>
                      <b className="text-white tabular-nums">{orphanedCount}</b>
                    </div>
                    <div className="flex items-center justify-between text-white/70">
                      <span className="flex items-center gap-2">
                        <i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: ISSUE_COLORS.missing }} />
                        بدون لينك
                      </span>
                      <b className="text-white tabular-nums">{missingCount}</b>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <h3 className="text-sm font-bold text-white mb-4">اللينكات حسب المنصة</h3>
                  {hasNoLinks || platformRows.length === 0 ? (
                    <div className="flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      لا توجد لينكات اجتماعات متاحة في النظام أصلاً — أضف لينكات جديدة الأول.
                    </div>
                  ) : (
                    <PlatformBars rows={platformRows} />
                  )}
                </section>
              </div>

              {/* الجلسات المتأثرة */}
              <section className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 text-sm font-bold text-white">
                  الجلسات المتأثرة
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-white/[0.06]">
                  {brokenSessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="text-white/80 truncate">{s.title}</span>
                      <span
                        className="text-[11px] px-2.5 py-0.5 rounded-full font-medium flex-shrink-0"
                        style={{
                          color: s.issue === "orphaned" ? ISSUE_COLORS.orphaned : ISSUE_COLORS.missing,
                          background: s.issue === "orphaned" ? "rgba(251,113,133,.12)" : "rgba(254,175,0,.12)",
                        }}
                      >
                        {s.issue === "orphaned" ? "اللينك اتمسح" : "بدون لينك"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* اختيار اللينكات */}
              {!hasNoLinks && availableLinks.length > 0 && (
                <section className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <span className="text-sm font-bold text-white">
                      لينكات متاحة فعليًا ({availableLinks.length})
                    </span>
                    <button
                      onClick={() =>
                        setSelectedIds(allSelected ? new Set() : new Set(availableLinks.map(getId)))
                      }
                      className={`text-xs font-medium text-[#feaf00] hover:underline rounded ${focusRing}`}
                    >
                      {allSelected ? "إلغاء الكل" : "تحديد الكل"}
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 p-3 max-h-56 overflow-y-auto">
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
                              ? "border-[#ff6700]/60 bg-[#ff6700]/10"
                              : "border-white/10 hover:bg-white/[0.06]"
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              checked ? "bg-[#ff6700] border-[#ff6700]" : "border-white/25"
                            }`}
                          >
                            {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                          </span>
                          <span className="flex-1 min-w-0 text-sm font-semibold text-white truncate">{link.name}</span>
                          <span className="flex items-center gap-1.5 text-[11px] text-white/55 flex-shrink-0">
                            <i className="w-2 h-2 rounded-full inline-block" style={{ background: meta.color }} />
                            {meta.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* اللينكات المحجوزة */}
              {!hasNoLinks && reservedLinks.length > 0 && (
                <section className="rounded-2xl border border-dashed border-white/15 p-4">
                  <p className="flex items-center gap-2 text-xs font-bold text-white/60 mb-2.5">
                    <Lock className="w-3.5 h-3.5" />
                    لينكات محجوزة فعليًا على نفس الميعاد ({reservedLinks.length}) — مش هتظهر كخيار
                  </p>
                  <div className="space-y-1.5">
                    {reservedLinks.map((l) => (
                      <p key={l.id} className="text-xs text-white/45">
                        {l.name} — محجوز {l.reservedDays?.join("، ")} ({l.reservedTime})
                      </p>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {ready && (
          <div className="border-t border-white/10 bg-black/20 backdrop-blur px-5 sm:px-6 py-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 flex-shrink-0">
            <button
              onClick={onClose}
              className={`sm:flex-1 px-4 py-2.5 rounded-xl border border-white/15 text-white/80 text-sm font-bold hover:bg-white/10 transition-colors ${focusRing}`}
            >
              إلغاء
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className={`sm:flex-1 px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/15 transition-colors disabled:opacity-50 ${focusRing}`}
            >
              متابعة بدون لينك
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={saving || selectedIds.size === 0}
              className={`sm:flex-[1.4] px-4 py-2.5 rounded-xl bg-[#ff6700] hover:bg-[#ff7a1f] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${focusRing}`}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              إصلاح الآن {selectedIds.size > 0 && `(${selectedIds.size})`}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}