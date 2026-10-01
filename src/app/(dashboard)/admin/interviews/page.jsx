"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Globe,
  MapPin,
  Clock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import InterviewFormModal from "../../../../components/Admin/InterviewFormModal";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS = {
  scheduled: {
    label: "مجدولة",
    pill: "bg-secondary/10 text-secondary dark:bg-cyan-400/10 dark:text-cyan-300",
    dot: "bg-secondary dark:bg-cyan-300",
  },
  completed: {
    label: "مكتملة",
    pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  cancelled: {
    label: "ملغاة",
    pill: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  postponed: {
    label: "مؤجلة",
    pill: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    dot: "bg-amber-500",
  },
};

const TABS = [
  { value: "", label: "الكل" },
  { value: "scheduled", label: "مجدولة" },
  { value: "completed", label: "مكتملة" },
  { value: "postponed", label: "مؤجلة" },
  { value: "cancelled", label: "ملغاة" },
];

const ROW_GRID =
  "lg:grid lg:grid-cols-[76px_minmax(0,1.3fr)_minmax(0,1.2fr)_120px_84px] lg:items-center lg:gap-5";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

function relativeDay(date) {
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(date, now)) return "النهاردة";
  if (sameDay(date, tomorrow)) return "بكرة";
  return null;
}

const initialOf = (name) => (name || "؟").trim().charAt(0);

// ─── Small pieces ─────────────────────────────────────────────────────────────
function DateTile({ value }) {
  const d = new Date(value);
  const rel = relativeDay(d);
  return (
    <div
      className={`flex w-[76px] flex-shrink-0 flex-col items-center overflow-hidden rounded-xl border text-center ${
        rel === "النهاردة"
          ? "border-primary/40 bg-primary/5"
          : "border-slate-200 dark:border-dark_border"
      }`}
    >
      <span
        className={`w-full py-0.5 text-[11px] font-semibold ${
          rel === "النهاردة"
            ? "bg-primary text-white"
            : "bg-slate-100 text-slate-500 dark:bg-dark_input dark:text-darkmuted"
        }`}
      >
        {rel || d.toLocaleDateString("ar-EG", { weekday: "short" })}
      </span>
      <span className="pt-1 text-2xl font-extrabold leading-none text-slate-900 dark:text-white">
        {d.toLocaleDateString("ar-EG", { day: "numeric" })}
      </span>
      <span className="pb-1.5 pt-0.5 text-[11px] text-slate-500 dark:text-darkmuted">
        {d.toLocaleDateString("ar-EG", { month: "short" })}
      </span>
    </div>
  );
}

function Person({ label, name, tone }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${tone}`}
      >
        {initialOf(name)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-800 dark:text-white">
          {name || "—"}
        </p>
        <p className="text-[11px] text-slate-400 dark:text-darksubtle">{label}</p>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const s = STATUS[status];
  if (!s) {
    return <span className="text-xs text-slate-400">{status || "—"}</span>;
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function InterviewRow({ iv, onEdit, onDelete }) {
  const online = iv.deliveryMode !== "offline";
  return (
    <li
      className={`group flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-brand-soft/70 dark:hover:bg-white/[0.03] sm:px-5 ${ROW_GRID}`}
    >
      <DateTile value={iv.scheduledDate} />

      <div className="min-w-0">
        <p className="truncate text-[15px] font-bold text-slate-900 dark:text-white">
          {iv.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-darkmuted">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <bdi dir="ltr">
              {iv.startTime} – {iv.endTime}
            </bdi>
          </span>
          <span
            className={`inline-flex items-center gap-1 font-medium ${
              online
                ? "text-secondary dark:text-cyan-300"
                : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {online ? (
              <Globe className="h-3.5 w-3.5" />
            ) : (
              <MapPin className="h-3.5 w-3.5" />
            )}
            {online ? "أونلاين" : "حضوري"}
          </span>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-2">
        <Person
          label="الطالب"
          name={iv.student?.name}
          tone="bg-primary/10 text-primary"
        />
        <Person
          label="المدرس"
          name={iv.instructor?.name}
          tone="bg-secondary/10 text-secondary dark:bg-cyan-400/10 dark:text-cyan-300"
        />
      </div>

      <div className="flex items-center justify-between gap-2 lg:contents">
        <div className="lg:justify-self-start">
          <StatusPill status={iv.status} />
        </div>
        <div className="flex items-center gap-1 lg:justify-self-end">
          <button
            onClick={() => onEdit(iv)}
            title="تعديل"
            aria-label="تعديل"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-darkmuted"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(iv)}
            title="حذف"
            aria-label="حذف"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:text-darkmuted dark:hover:bg-rose-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
}

function SkeletonRows() {
  return Array.from({ length: 5 }).map((_, i) => (
    <li
      key={i}
      className={`flex animate-pulse flex-col gap-4 px-5 py-4 ${ROW_GRID}`}
    >
      <div className="h-[72px] w-[76px] rounded-xl bg-slate-100 dark:bg-dark_input" />
      <div className="space-y-2">
        <div className="h-4 w-2/3 rounded bg-slate-100 dark:bg-dark_input" />
        <div className="h-3 w-1/3 rounded bg-slate-100 dark:bg-dark_input" />
      </div>
      <div className="space-y-2">
        <div className="h-3.5 w-1/2 rounded bg-slate-100 dark:bg-dark_input" />
        <div className="h-3.5 w-2/5 rounded bg-slate-100 dark:bg-dark_input" />
      </div>
      <div className="h-6 w-20 rounded-full bg-slate-100 dark:bg-dark_input" />
      <div className="h-6 w-16 rounded bg-slate-100 dark:bg-dark_input" />
    </li>
  ));
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function InterviewsAdminPage() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/admin/interviews", window.location.origin);
      url.searchParams.set("page", page);
      url.searchParams.set("limit", 20);
      if (statusFilter) url.searchParams.set("status", statusFilter);

      const res = await fetch(url.toString(), { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setInterviews(json.data || []);
        setPagination(json.pagination || { total: 0, totalPages: 1 });
      } else {
        toast.error(json.error || "فشل التحميل");
      }
    } catch (e) {
      toast.error("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/interviews/${toDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("تم الحذف");
        setToDelete(null);
        load();
      } else {
        toast.error(json.error || "فشل الحذف");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return interviews;
    return interviews.filter(
      (iv) =>
        iv.title?.toLowerCase().includes(q) ||
        iv.student?.name?.toLowerCase().includes(q) ||
        iv.instructor?.name?.toLowerCase().includes(q)
    );
  }, [interviews, search]);

  const hasFilters = !!search || !!statusFilter;
  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-1200 space-y-5 p-4 sm:p-6" dir="rtl">
      {/* ═══ Header ═══ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-secondary dark:text-white">
            المقابلات الشخصية
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-darkmuted">
            {pagination.total > 0
              ? `${pagination.total} مقابلة في السجل`
              : "جدولة ومتابعة مقابلات الطلاب مع المدرسين"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            aria-label="تحديث"
            title="تحديث"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 dark:border-dark_border dark:bg-darklight dark:text-darkmuted"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-brand-md transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-darkmode"
          >
            <Plus className="h-4 w-4" />
            مقابلة جديدة
          </button>
        </div>
      </div>

      {/* ═══ Toolbar ═══ */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:max-w-364 md:flex-1">
          <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الطالب أو المدرس"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-dark_border dark:bg-darklight dark:text-white"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="مسح البحث"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div
          role="tablist"
          aria-label="فلترة بالحالة"
          className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-darklight"
        >
          {TABS.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <button
                key={tab.value || "all"}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
                className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-white text-secondary shadow-sm dark:bg-dark_input dark:text-primary"
                    : "text-slate-500 hover:text-slate-800 dark:text-darkmuted dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ List ═══ */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-dark_border dark:bg-darklight">
        <div
          className={`hidden border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-xs font-semibold text-slate-500 dark:border-dark_border dark:bg-white/[0.02] dark:text-darkmuted ${ROW_GRID}`}
        >
          <span>الموعد</span>
          <span>المقابلة</span>
          <span>المشاركون</span>
          <span>الحالة</span>
          <span />
        </div>

        <ul
          className={`divide-y divide-slate-100 transition-opacity dark:divide-dark_border ${
            loading && interviews.length > 0 ? "opacity-60" : ""
          }`}
        >
          {loading && interviews.length === 0 ? (
            <SkeletonRows />
          ) : filtered.length === 0 ? (
            <li className="flex flex-col items-center px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CalendarDays className="h-7 w-7" />
              </span>
              <p className="mt-4 text-base font-bold text-slate-800 dark:text-white">
                {hasFilters ? "مفيش نتايج مطابقة" : "لسه مفيش مقابلات"}
              </p>
              <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-darkmuted">
                {hasFilters
                  ? "جرّب تغيّر كلمة البحث أو تشيل فلتر الحالة."
                  : "ابدأ بجدولة أول مقابلة بين طالب ومدرس."}
              </p>
              {hasFilters ? (
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("");
                    setPage(1);
                  }}
                  className="mt-5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-primary/40 hover:text-primary dark:border-dark_border dark:text-white"
                >
                  مسح الفلاتر
                </button>
              ) : (
                <button
                  onClick={openNew}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover"
                >
                  <Plus className="h-4 w-4" />
                  مقابلة جديدة
                </button>
              )}
            </li>
          ) : (
            filtered.map((iv) => (
              <InterviewRow
                key={iv.id}
                iv={iv}
                onEdit={(row) => {
                  setEditing(row);
                  setModalOpen(true);
                }}
                onDelete={setToDelete}
              />
            ))
          )}
        </ul>
      </div>

      {/* ═══ Pagination ═══ */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark_border dark:text-white"
          >
            <ChevronRight className="h-4 w-4" />
            السابق
          </button>
          <span className="text-sm text-slate-500 dark:text-darkmuted">
            صفحة {page} من {pagination.totalPages}
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(page + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark_border dark:text-white"
          >
            التالي
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ═══ Form modal ═══ */}
      {modalOpen && (
        <InterviewFormModal
          initial={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setModalOpen(false);
            setEditing(null);
            load();
          }}
        />
      )}

      {/* ═══ Delete confirmation ═══ */}
      {toDelete &&
        createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-title"
          dir="rtl"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:border dark:border-dark_border dark:bg-darklight">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <h2
              id="delete-title"
              className="mt-4 text-base font-bold text-slate-900 dark:text-white"
            >
              حذف المقابلة؟
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-darkmuted">
              هتتحذف مقابلة «{toDelete.title}» نهائيًا ولا يمكن التراجع.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setToDelete(null)}
                disabled={deleting}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-dark_border dark:text-white dark:hover:bg-white/5"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                حذف المقابلة
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}