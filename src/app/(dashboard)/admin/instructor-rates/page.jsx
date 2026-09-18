"use client";
// src/app/admin/instructor-rates/page.jsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Wallet, Search, RefreshCw, Loader2, X, Save, History,
  AlertCircle, CheckCircle2, Bus, Clock, TrendingUp, User,
  Calendar, PencilLine, Users,
} from "lucide-react";

const EGP = (n) =>
  `${Number(n || 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج.م`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("ar-EG", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ─── Rate Modal ───────────────────────────────────────────────────────────────
function RateModal({ instructor, onClose, onSaved }) {
  const [hourlyRate, setHourlyRate] = useState(instructor.hourlyRate || "");
  const [transport, setTransport] = useState(instructor.transportationAllowance || "");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/instructor-rates/${instructor.instructorId}`, { credentials: "include" });
        const json = await res.json();
        if (json.success) setHistory(json.data.history || []);
      } catch { /* best-effort */ }
      finally { setLoadingHistory(false); }
    })();
  }, [instructor.instructorId]);

  const handleSave = async () => {
    if (hourlyRate === "" || Number(hourlyRate) < 0) {
      toast.error("سعر الساعة مطلوب");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/instructor-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          instructorId: instructor.instructorId,
          hourlyRate: Number(hourlyRate),
          transportationAllowance: Number(transport) || 0,
          effectiveFrom,
          note,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "تم الحفظ");
        onSaved();
        onClose();
      } else {
        toast.error(json.message || "فشل الحفظ");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full sm:max-w-xl max-h-[94vh] overflow-y-auto bg-white dark:bg-[#0d1117] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 dark:border-[#21262d]">
        {/* Header */}
        <div className="relative overflow-hidden p-5" style={{ background: "linear-gradient(135deg, #004d59 0%, #004d59cc 45%, #ff6700 100%)" }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">تحديد سعر المدرس</h3>
                <p className="text-white/70 text-xs font-medium mt-0.5">{instructor.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center border border-white/20">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-gray-500 dark:text-[#8b949e] mb-1.5">
                سعر الساعة (ج.م) *
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 start-3" />
                <input
                  type="number" min="0" step="0.5" dir="ltr"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full ps-9 pe-3 py-2.5 rounded-xl text-sm font-bold bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] text-gray-800 dark:text-[#e6edf3] outline-none focus:border-[#ff6700]/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-500 dark:text-[#8b949e] mb-1.5">
                بدل المواصلات (ج.م)
              </label>
              <div className="relative">
                <Bus className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 start-3" />
                <input
                  type="number" min="0" step="5" dir="ltr"
                  value={transport}
                  onChange={(e) => setTransport(e.target.value)}
                  className="w-full ps-9 pe-3 py-2.5 rounded-xl text-sm font-bold bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] text-gray-800 dark:text-[#e6edf3] outline-none focus:border-[#ff6700]/60"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 dark:text-[#8b949e] mb-1.5">
              ساري من تاريخ *
            </label>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] text-gray-800 dark:text-[#e6edf3] outline-none focus:border-[#ff6700]/60"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 dark:text-[#8b949e] mb-1.5">ملاحظة (اختياري)</label>
            <input
              type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="سبب التعديل..."
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] text-gray-800 dark:text-[#e6edf3] outline-none focus:border-[#ff6700]/60"
            />
          </div>

          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#feaf00]/10 border border-[#feaf00]/30">
            <AlertCircle className="w-4 h-4 text-[#f67d00] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#f67d00] dark:text-[#feaf00] leading-relaxed">
              السعر الجديد بيسري من التاريخ ده وبعده بس. الجلسات القديمة بتفضل محسوبة بسعرها وقتها ومش هتتأثر خالص.
            </p>
          </div>

          {/* History */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <History className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-black text-gray-500 dark:text-[#8b949e]">تاريخ الأسعار</p>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-5 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-[#6e7681] py-3 text-center">لسه مفيش أسعار مسجّلة</p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {history.map((h) => (
                  <div key={h._id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-[#161b22] border border-gray-100 dark:border-[#30363d]">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${!h.effectiveTo ? "bg-emerald-400" : "bg-gray-300 dark:bg-[#30363d]"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 dark:text-[#e6edf3]">
                        {EGP(h.hourlyRate)} / ساعة
                        {h.transportationAllowance > 0 && (
                          <span className="text-[10px] text-gray-400 font-medium"> · مواصلات {EGP(h.transportationAllowance)}</span>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-[#6e7681]">
                        {fmtDate(h.effectiveFrom)} → {h.effectiveTo ? fmtDate(h.effectiveTo) : "الآن"}
                        {h.note ? ` · ${h.note}` : ""}
                      </p>
                    </div>
                    {!h.effectiveTo && (
                      <span className="text-[10px] font-black px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                        ساري
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-2 p-4 border-t border-gray-100 dark:border-[#30363d] bg-white/95 dark:bg-[#0d1117]/95 backdrop-blur-md">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-bold bg-gray-100 dark:bg-[#21262d] text-gray-700 dark:text-[#8b949e] hover:bg-gray-200 dark:hover:bg-[#30363d] transition-all">
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-black text-white shadow-lg hover:shadow-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ السعر
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function InstructorRatesPage() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ total: 0, configured: 0, missing: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (missingOnly) params.set("missingOnly", "true");

      const res = await fetch(`/api/instructor-rates?${params}`, { credentials: "include", cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setRows(json.data || []);
        setStats(json.stats || { total: 0, configured: 0, missing: 0 });
      } else {
        toast.error(json.message || "فشل التحميل");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }, [search, missingOnly]);

  useEffect(() => {
    const id = setTimeout(load, 300);
    return () => clearTimeout(id);
  }, [load]);

  const statCards = useMemo(() => [
    { label: "إجمالي المدرسين", value: stats.total, icon: Users, color: "#004d59" },
    { label: "لهم سعر مسجّل", value: stats.configured, icon: CheckCircle2, color: "#ff6700" },
    { label: "بدون سعر", value: stats.missing, icon: AlertCircle, color: "#ff6437" },
  ], [stats]);

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl p-6 shadow-lg" style={{ background: "linear-gradient(135deg, #004d59 0%, #004d59dd 45%, #ff6700 100%)" }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="absolute -top-10 -start-10 w-48 h-48 rounded-full blur-3xl" style={{ background: "#feaf00", opacity: 0.15 }} />
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">أسعار المدرسين</h1>
              <p className="text-white/70 text-xs mt-0.5">سعر الساعة وبدل المواصلات — بيتطبق على الجلسات من تاريخ السريان</p>
            </div>
          </div>
          <button onClick={load} className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center transition-all">
            <RefreshCw className={`w-4 h-4 text-white ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white dark:bg-[#161b22] rounded-2xl p-4 border border-gray-100 dark:border-[#30363d] shadow-sm">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-[#6e7681] truncate">{s.label}</p>
                  <p className="text-2xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
                </div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}15` }}>
                  <Icon className="w-4.5 h-4.5" style={{ color: s.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 border border-gray-100 dark:border-[#30363d] shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 start-3" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الإيميل..."
            className="w-full ps-9 pe-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] text-gray-800 dark:text-[#e6edf3] outline-none focus:border-[#ff6700]/60"
          />
        </div>
        <button
          onClick={() => setMissingOnly((v) => !v)}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            missingOnly
              ? "text-white shadow-md"
              : "bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-[#8b949e]"
          }`}
          style={missingOnly ? { background: "linear-gradient(135deg, #ff6437, #ff6700)" } : {}}
        >
          <AlertCircle className="w-4 h-4" />
          بدون سعر فقط
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse border border-gray-100 dark:border-[#30363d]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d]">
          <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 dark:bg-[#21262d] flex items-center justify-center mb-3">
            <Users className="w-10 h-10 text-gray-300 dark:text-[#6e7681]" />
          </div>
          <p className="text-sm text-gray-500 dark:text-[#8b949e] font-medium">مفيش مدرسين مطابقين</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div
              key={r.instructorId}
              className={`group bg-white dark:bg-[#161b22] rounded-2xl border p-4 shadow-sm hover:shadow-lg transition-all ${
                r.hasRate ? "border-gray-100 dark:border-[#30363d]" : "border-[#ff6437]/40 dark:border-[#ff6437]/30"
              }`}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white flex-shrink-0 shadow-md"
                  style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
                  {(r.name?.[0] || "?").toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate">{r.name}</p>
                  <p className="text-[11px] text-gray-400 dark:text-[#6e7681] truncate">{r.email}</p>
                </div>

                {r.hasRate ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl bg-[#004d59]/10 dark:bg-[#004d59]/20 text-[#004d59] dark:text-teal-400 border border-[#004d59]/20">
                      <Clock className="w-3.5 h-3.5" />
                      {EGP(r.hourlyRate)} / ساعة
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl bg-[#feaf00]/10 text-[#f67d00] dark:text-[#feaf00] border border-[#feaf00]/30">
                      <Bus className="w-3.5 h-3.5" />
                      {r.transportationAllowance > 0 ? EGP(r.transportationAllowance) : "بدون بدل"}
                    </span>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl bg-[#ff6437]/10 text-[#ff6437] border border-[#ff6437]/30">
                    <AlertCircle className="w-3.5 h-3.5" />
                    مفيش سعر — الجلسات مش هتتحسب
                  </span>
                )}

                <button
                  onClick={() => setModal(r)}
                  className="px-4 py-2.5 rounded-xl text-xs font-black text-white shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}
                >
                  <PencilLine className="w-3.5 h-3.5" />
                  {r.hasRate ? "تعديل" : "تحديد سعر"}
                </button>
              </div>

              {r.hasRate && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-[#30363d] text-[11px] text-gray-400 dark:text-[#6e7681]">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> ساري من {fmtDate(r.effectiveFrom)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {r.changesCount} تعديل
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <RateModal instructor={modal} onClose={() => setModal(null)} onSaved={load} />
      )}
    </div>
  );
}