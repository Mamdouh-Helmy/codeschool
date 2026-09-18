"use client";
// src/app/admin/payroll/page.jsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Coins, Filter, RefreshCw, Loader2, Clock, Bus, Users,
  Globe, MapPin, CheckCircle2, BadgeCheck, XCircle, Wallet,
  ChevronLeft, ChevronRight, Calendar, LayoutGrid, ListFilter,
} from "lucide-react";

const EGP = (n) =>
  `${Number(n || 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج.م`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("ar-EG", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtDuration = (mins) => {
  const h = Math.floor((mins || 0) / 60);
  const m = (mins || 0) % 60;
  if (!h) return `${m} د`;
  return m ? `${h} س ${m} د` : `${h} س`;
};

const STATUS_CFG = {
  pending:   { label: "قيد المراجعة", cls: "bg-[#feaf00]/10 text-[#f67d00] dark:text-[#feaf00] border-[#feaf00]/30" },
  approved:  { label: "معتمد",        cls: "bg-[#004d59]/10 text-[#004d59] dark:text-teal-400 border-[#004d59]/25" },
  paid:      { label: "مدفوع",        cls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40" },
  cancelled: { label: "ملغي",         cls: "bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/30" },
};

const firstDayOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
};
const today = () => new Date().toISOString().split("T")[0];

export default function PayrollPage() {
  const [entries, setEntries] = useState([]);
  const [byInstructor, setByInstructor] = useState([]);
  const [totals, setTotals] = useState({ totalMinutes: 0, totalSessionAmount: 0, totalTransportation: 0, totalAmount: 0 });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [view, setView] = useState("summary"); // summary | entries

  const [filters, setFilters] = useState({
    instructorId: "",
    status: "",
    deliveryMode: "",
    from: firstDayOfMonth(),
    to: today(),
    page: 1,
    limit: 50,
  });

  // ── قائمة المدرسين للفلتر ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/instructor-rates", { credentials: "include" });
        const json = await res.json();
        if (json.success) setInstructors(json.data || []);
      } catch { /* best-effort */ }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });

      const res = await fetch(`/api/payroll?${params}`, { credentials: "include", cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setEntries(json.data || []);
        setByInstructor(json.byInstructor || []);
        setTotals(json.totals || {});
        setPagination(json.pagination || { page: 1, totalPages: 1, total: 0 });
      } else {
        toast.error(json.message || "فشل التحميل");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, value) => setFilters((p) => ({ ...p, [key]: value, page: 1 }));

  const updateStatus = async (entryId, status) => {
    setUpdatingId(entryId);
    try {
      const res = await fetch(`/api/payroll/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("تم التحديث");
        setEntries((prev) => prev.map((e) => (e._id === entryId ? { ...e, status } : e)));
      } else {
        toast.error(json.message || "فشل التحديث");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setUpdatingId(null);
    }
  };

  const statCards = useMemo(() => [
    { label: "إجمالي المستحق", value: EGP(totals.totalAmount), icon: Coins, color: "#ff6700" },
    { label: "أجر الجلسات", value: EGP(totals.totalSessionAmount), icon: Wallet, color: "#004d59" },
    { label: "بدل المواصلات", value: EGP(totals.totalTransportation), icon: Bus, color: "#feaf00" },
    { label: "إجمالي الساعات", value: fmtDuration(totals.totalMinutes), icon: Clock, color: "#ff6437" },
  ], [totals]);

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl p-6 shadow-lg" style={{ background: "linear-gradient(135deg, #004d59 0%, #004d59dd 45%, #ff6700 100%)" }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="absolute -bottom-12 -end-8 w-52 h-52 rounded-full blur-3xl" style={{ background: "#feaf00", opacity: 0.15 }} />
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">كشف مرتبات المدرسين</h1>
              <p className="text-white/70 text-xs mt-0.5">الحساب بالدقيقة من سعر الساعة وقت الجلسة + بدل المواصلات</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/15 border border-white/20">
              {[
                { id: "summary", icon: LayoutGrid, label: "ملخص" },
                { id: "entries", icon: ListFilter, label: "التفاصيل" },
              ].map((v) => {
                const Icon = v.icon;
                return (
                  <button
                    key={v.id}
                    onClick={() => setView(v.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                      view === v.id ? "bg-white text-[#004d59]" : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {v.label}
                  </button>
                );
              })}
            </div>
            <button onClick={load} className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center transition-all">
              <RefreshCw className={`w-4 h-4 text-white ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white dark:bg-[#161b22] rounded-2xl p-4 border border-gray-100 dark:border-[#30363d] shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-[#6e7681] truncate">{s.label}</p>
                  <p className="text-lg font-black tabular-nums truncate" style={{ color: s.color }}>{s.value}</p>
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
      <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 border border-gray-100 dark:border-[#30363d] shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-[#ff6700]" />
          <p className="text-xs font-black text-gray-500 dark:text-[#8b949e]">الفلاتر</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select
            value={filters.instructorId}
            onChange={(e) => setFilter("instructorId", e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] text-gray-800 dark:text-[#e6edf3] outline-none focus:border-[#ff6700]/60"
          >
            <option value="">كل المدرسين</option>
            {instructors.map((i) => (
              <option key={i.instructorId} value={i.instructorId}>{i.name}</option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilter("status", e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] text-gray-800 dark:text-[#e6edf3] outline-none focus:border-[#ff6700]/60"
          >
            <option value="">كل الحالات</option>
            <option value="pending">قيد المراجعة</option>
            <option value="approved">معتمد</option>
            <option value="paid">مدفوع</option>
            <option value="cancelled">ملغي</option>
          </select>

          <select
            value={filters.deliveryMode}
            onChange={(e) => setFilter("deliveryMode", e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] text-gray-800 dark:text-[#e6edf3] outline-none focus:border-[#ff6700]/60"
          >
            <option value="">أونلاين + أوفلاين</option>
            <option value="online">أونلاين</option>
            <option value="offline">أوفلاين</option>
          </select>

          <input
            type="date" value={filters.from} onChange={(e) => setFilter("from", e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] text-gray-800 dark:text-[#e6edf3] outline-none focus:border-[#ff6700]/60"
          />
          <input
            type="date" value={filters.to} onChange={(e) => setFilter("to", e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] text-gray-800 dark:text-[#e6edf3] outline-none focus:border-[#ff6700]/60"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white dark:bg-[#161b22] rounded-2xl animate-pulse border border-gray-100 dark:border-[#30363d]" />
          ))}
        </div>
      ) : view === "summary" ? (
        // ── ملخص لكل مدرس ────────────────────────────────────────────────
        byInstructor.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {byInstructor.map((i) => (
              <div key={i.instructorId} className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] p-4 shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white shadow-md flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
                    {(i.name?.[0] || "?").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate">{i.name || "—"}</p>
                    <p className="text-[11px] text-gray-400 dark:text-[#6e7681]">
                      {i.sessionsCount} جلسة · {fmtDuration(i.totalMinutes)}
                    </p>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <p className="text-[10px] text-gray-400 dark:text-[#6e7681]">الإجمالي</p>
                    <p className="text-lg font-black" style={{ color: "#ff6700" }}>{EGP(i.totalAmount)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#004d59]/5 dark:bg-[#004d59]/15 border border-[#004d59]/15">
                    <p className="text-[10px] text-gray-400 dark:text-[#6e7681] mb-0.5">أجر الجلسات</p>
                    <p className="text-sm font-black text-[#004d59] dark:text-teal-400">{EGP(i.totalSessionAmount)}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#feaf00]/10 border border-[#feaf00]/25">
                    <p className="text-[10px] text-gray-400 dark:text-[#6e7681] mb-0.5">بدل المواصلات</p>
                    <p className="text-sm font-black text-[#f67d00] dark:text-[#feaf00]">{EGP(i.totalTransportation)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // ── تفاصيل السطور ────────────────────────────────────────────────
        entries.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="space-y-3">
              {entries.map((e) => {
                const st = STATUS_CFG[e.status] || STATUS_CFG.pending;
                const isOffline = e.deliveryMode === "offline";
                return (
                  <div key={e._id} className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] p-4 shadow-sm hover:shadow-lg transition-all">
                    <div className="flex items-start gap-3 flex-wrap">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isOffline ? "bg-[#ff6437]/10" : "bg-[#004d59]/10"
                      }`}>
                        {isOffline
                          ? <MapPin className="w-5 h-5 text-[#ff6437]" />
                          : <Globe className="w-5 h-5 text-[#004d59] dark:text-teal-400" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate">
                          {e.instructorId?.name || "—"}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-[#6e7681] truncate">
                          {e.sessionTitle} · {e.groupId?.name || e.groupName}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[10px] text-gray-400 dark:text-[#6e7681]">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {fmtDate(e.sessionDate)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {e.actualStartTime} - {e.actualEndTime} ({fmtDuration(e.durationMinutes)})
                          </span>
                          {e.durationSource === "scheduled" && (
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#21262d]">وقت مجدول</span>
                          )}
                        </div>
                      </div>

                      <div className="text-end flex-shrink-0">
                        <p className="text-base font-black" style={{ color: "#ff6700" }}>{EGP(e.totalAmount)}</p>
                        <p className="text-[10px] text-gray-400 dark:text-[#6e7681]">
                          {EGP(e.hourlyRateSnapshot)}/س
                          {e.transportationApplied && ` + ${EGP(e.transportationAllowance)} مواصلات`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-[#30363d] flex-wrap">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${st.cls}`}>
                        {st.label}
                      </span>

                      {isOffline && !e.transportationApplied && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#21262d] text-gray-500 dark:text-[#6e7681]">
                          {e.transportationSkipReason === "already_paid_today"
                            ? "بدل المواصلات اتصرف في جلسة قبلها اليوم"
                            : "مفيش بدل مواصلات محدد"}
                        </span>
                      )}

                      <div className="flex items-center gap-1.5 ms-auto">
                        {e.status === "pending" && (
                          <ActionBtn
                            loading={updatingId === e._id}
                            onClick={() => updateStatus(e._id, "approved")}
                            icon={BadgeCheck} label="اعتماد" color="#004d59"
                          />
                        )}
                        {["pending", "approved"].includes(e.status) && (
                          <ActionBtn
                            loading={updatingId === e._id}
                            onClick={() => updateStatus(e._id, "paid")}
                            icon={CheckCircle2} label="تم الدفع" color="#ff6700"
                          />
                        )}
                        {e.status !== "cancelled" && e.status !== "paid" && (
                          <ActionBtn
                            loading={updatingId === e._id}
                            onClick={() => updateStatus(e._id, "cancelled")}
                            icon={XCircle} label="إلغاء" color="#ff6437" ghost
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
                  className="w-9 h-9 rounded-xl bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] flex items-center justify-center disabled:opacity-40 text-gray-500"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-gray-500 dark:text-[#8b949e] px-3">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
                  className="w-9 h-9 rounded-xl bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] flex items-center justify-center disabled:opacity-40 text-gray-500"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}

// ─── Small pieces ─────────────────────────────────────────────────────────────
function ActionBtn({ onClick, icon: Icon, label, color, loading, ghost }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-3 py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center gap-1.5 disabled:opacity-50 border"
      style={
        ghost
          ? { color, borderColor: `${color}40`, background: `${color}10` }
          : { color: "#fff", background: color, borderColor: color }
      }
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d]">
      <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 dark:bg-[#21262d] flex items-center justify-center mb-3">
        <Users className="w-10 h-10 text-gray-300 dark:text-[#6e7681]" />
      </div>
      <p className="text-sm text-gray-500 dark:text-[#8b949e] font-medium">مفيش سطور مرتبات في الفترة دي</p>
    </div>
  );
}