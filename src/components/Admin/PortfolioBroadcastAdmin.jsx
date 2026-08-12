"use client";
import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Megaphone,
  Users,
  UserCog,
  GraduationCap,
  User,
  Search,
  RefreshCw,
  Send,
  CheckSquare,
  Square,
  Clock,
  Phone,
  PhoneOff,
  Crown,
  X,
  CheckCircle2,
  XCircle,
  SkipForward,
  ListFilter,
  Inbox,
} from "lucide-react";

// ─── Role → brand-token mapping ─────────────────────────────────────────────
const ROLE_META = {
  admin: {
    label: "Admin",
    icon: Crown,
    text: "text-amber-brand",
    bg: "bg-amber-brand/10 dark:bg-amber-brand/20",
  },
  marketing: {
    label: "Marketing",
    icon: Megaphone,
    text: "text-orange-coral",
    bg: "bg-orange-coral/10 dark:bg-orange-coral/20",
  },
  student: {
    label: "Student",
    icon: GraduationCap,
    text: "text-primary",
    bg: "bg-primary/10 dark:bg-primary/20",
  },
  instructor: {
    label: "Instructor",
    icon: UserCog,
    text: "text-secondary",
    bg: "bg-secondary/10 dark:bg-secondary/20",
  },
  guest: {
    label: "Guest",
    icon: User,
    text: "text-SlateBlueText dark:text-darktext",
    bg: "bg-gray-100 dark:bg-dark_input",
  },
};

const TARGET_OPTIONS = [
  { value: "all", label: "الكل", description: "كل أصحاب البورتفوليو", icon: Users },
  { value: "role", label: "حسب الدور", description: "فلترة حسب نوع الحساب", icon: ListFilter },
  { value: "specific", label: "أشخاص محددين", description: "اختيار يدوي من القائمة", icon: CheckSquare },
];

// ─── Small presentational helpers ───────────────────────────────────────────
function RoleBadge({ role }) {
  const meta = ROLE_META[role] || ROLE_META.guest;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${meta.bg} ${meta.text}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function Avatar({ name, role }) {
  const meta = ROLE_META[role] || ROLE_META.guest;
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${meta.bg} ${meta.text}`}>
      {initial}
    </div>
  );
}

export default function PortfolioBroadcastAdmin() {
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [target, setTarget] = useState("all");
  const [selectedRole, setSelectedRole] = useState("instructor");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [skipAlreadySent, setSkipAlreadySent] = useState(true);
  const [search, setSearch] = useState("");

  const [lastResult, setLastResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadRecipients = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/portfolio-broadcast", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setRecipients(json.data);
      } else {
        toast.error(json.message || "فشل تحميل القائمة");
      }
    } catch (err) {
      console.error(err);
      toast.error("حصل خطأ أثناء تحميل القائمة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipients();
  }, []);

  const filteredRecipients = useMemo(() => {
    if (!search.trim()) return recipients;
    const q = search.toLowerCase();
    return recipients.filter(
      (r) => r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q),
    );
  }, [recipients, search]);

  const stats = useMemo(() => {
    const total = recipients.length;
    const withPhone = recipients.filter((r) => r.hasPhone).length;
    return { total, withPhone, withoutPhone: total - withPhone };
  }, [recipients]);

  const toggleSelect = (userId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const key = String(userId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(filteredRecipients.map((r) => String(r.userId))));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const allVisibleSelected = useMemo(
    () => filteredRecipients.length > 0 && filteredRecipients.every((r) => selectedIds.has(String(r.userId))),
    [filteredRecipients, selectedIds],
  );

  const formatDate = (dateString) => {
    if (!dateString) return "لسه ماتبعتش";
    try {
      return new Date(dateString).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const targetCount = useMemo(() => {
    if (target === "all") return recipients.length;
    if (target === "role") return recipients.filter((r) => r.role === selectedRole).length;
    return selectedIds.size;
  }, [target, recipients, selectedRole, selectedIds]);

  const statCards = [
    { label: "إجمالي الأشخاص", value: stats.total, icon: Users, accent: "text-secondary", bg: "bg-secondary/10 dark:bg-secondary/20" },
    { label: "عندهم واتساب", value: stats.withPhone, icon: Phone, accent: "text-primary", bg: "bg-primary/10 dark:bg-primary/20" },
    { label: "من غير رقم", value: stats.withoutPhone, icon: PhoneOff, accent: "text-orange-coral", bg: "bg-orange-coral/10 dark:bg-orange-coral/20" },
    { label: "هيستقبلوا الرسالة", value: targetCount, icon: Send, accent: "text-amber-brand", bg: "bg-amber-brand/10 dark:bg-amber-brand/20" },
  ];

  const confirmMessage = useMemo(() => {
    if (target === "all") return `هيتبعت لكل الـ ${recipients.length} صاحب بورتفوليو.`;
    if (target === "role") return `هيتبعت لكل ${ROLE_META[selectedRole]?.label || selectedRole} (${targetCount} شخص).`;
    return `هيتبعت لـ ${selectedIds.size} شخص المختارين.`;
  }, [target, recipients.length, selectedRole, targetCount, selectedIds.size]);

  const openConfirm = () => {
    if (target === "specific" && selectedIds.size === 0) {
      toast.error("اختار شخص واحد على الأقل");
      return;
    }
    setConfirmOpen(true);
  };

  const confirmSend = async () => {
    setSending(true);
    const toastId = toast.loading("جاري إرسال الرسائل...");

    try {
      const res = await fetch("/api/admin/portfolio-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          role: target === "role" ? selectedRole : undefined,
          userIds: target === "specific" ? Array.from(selectedIds) : undefined,
          skipAlreadySent,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "فشل الإرسال");
      }

      setLastResult(json);
      toast.success(
        `تم: ${json.sent} اتبعت، ${json.skipped} اتخطى، ${json.failed} فشل`,
        { id: toastId, duration: 5000 },
      );
      await loadRecipients();
      clearSelection();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "حصل خطأ أثناء الإرسال", { id: toastId });
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-16">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 dark:border-dark_border border-t-primary" />
        <p className="text-sm text-SlateBlueText dark:text-darktext">جاري تحميل قائمة المستلمين...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* Header */}
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm p-4 md:p-6 border border-PowderBlueBorder dark:border-dark_border">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-2.5 bg-gradient-to-br from-primary to-orange-coral rounded-lg">
            <Megaphone className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-MidnightNavyText dark:text-white">
              إعلان تحديث البورتفوليو
            </h1>
            <p className="text-xs md:text-sm text-SlateBlueText dark:text-darktext">
              ابعت رسالة واتساب لكل أصحاب البورتفوليو أو لمجموعة منهم
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white dark:bg-darkmode rounded-xl p-3.5 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.bg}`}>
                <Icon className={`w-4 h-4 ${s.accent}`} />
              </div>
              <p className="text-lg md:text-xl font-bold text-MidnightNavyText dark:text-white">{s.value}</p>
              <p className="text-[11px] md:text-xs text-SlateBlueText dark:text-darktext">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Target Selection */}
      <div className="bg-white dark:bg-darkmode rounded-xl p-4 md:p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm space-y-4">
        <div className="text-sm font-semibold text-MidnightNavyText dark:text-white">
          مين هيستقبل الرسالة؟
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TARGET_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = target === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTarget(opt.value)}
                className={`text-start p-4 rounded-xl border-2 transition-colors ${
                  active
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-PowderBlueBorder dark:border-dark_border hover:border-primary/40"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${
                  active ? "bg-primary text-white" : "bg-gray-100 dark:bg-dark_input text-SlateBlueText dark:text-darktext"
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className={`text-sm font-semibold ${active ? "text-primary" : "text-MidnightNavyText dark:text-white"}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-SlateBlueText dark:text-darktext mt-0.5">{opt.description}</p>
              </button>
            );
          })}
        </div>

        {target === "role" && (
          <div className="flex flex-wrap gap-2 pt-1">
            {Object.entries(ROLE_META).map(([key, meta]) => {
              const Icon = meta.icon;
              const count = recipients.filter((r) => r.role === key).length;
              const active = selectedRole === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedRole(key)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    active
                      ? `border-transparent ${meta.bg} ${meta.text}`
                      : "border-PowderBlueBorder dark:border-dark_border text-SlateBlueText dark:text-darktext hover:border-primary/40"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {meta.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${active ? "bg-white/60 dark:bg-black/20" : "bg-gray-100 dark:bg-dark_input"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {target === "specific" && (
          <div className="flex items-center justify-between text-xs text-SlateBlueText dark:text-darktext bg-gray-50 dark:bg-dark_input rounded-lg px-3 py-2">
            <span>
              اختار من القائمة تحت — المختارين حاليًا:{" "}
              <strong className="text-MidnightNavyText dark:text-white">{selectedIds.size}</strong>
            </span>
            {selectedIds.size > 0 && (
              <button onClick={clearSelection} className="text-orange-coral hover:underline font-medium">
                امسح كل الاختيارات
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 py-1">
          <div>
            <p className="text-sm font-medium text-MidnightNavyText dark:text-white">تخطي اللي اتبعتله قبل كده</p>
            <p className="text-xs text-SlateBlueText dark:text-darktext">هيتم استبعاد أي حد استقبل الرسالة دي بنجاح من قبل</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={skipAlreadySent}
            onClick={() => setSkipAlreadySent((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
              skipAlreadySent ? "bg-primary" : "bg-gray-300 dark:bg-dark_input"
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-all ${skipAlreadySent ? "ms-6" : "ms-1"}`} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-PowderBlueBorder dark:border-dark_border">
          <p className="text-sm text-SlateBlueText dark:text-darktext">
            هيتبعت لـ <strong className="text-MidnightNavyText dark:text-white">{targetCount}</strong> شخص تقريباً
          </p>
          <button
            onClick={openConfirm}
            disabled={sending || (target === "specific" && selectedIds.size === 0)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Send className="w-4 h-4" />
            ابعت الرسالة
          </button>
        </div>
      </div>

      {/* Last result summary */}
      {lastResult && (
        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-SlateBlueText dark:text-darktext">اتبعت</p>
                <p className="text-sm font-bold text-MidnightNavyText dark:text-white">{lastResult.sent}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <SkipForward className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-SlateBlueText dark:text-darktext">اتخطى</p>
                <p className="text-sm font-bold text-MidnightNavyText dark:text-white">{lastResult.skipped}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-SlateBlueText dark:text-darktext">فشل</p>
                <p className="text-sm font-bold text-MidnightNavyText dark:text-white">{lastResult.failed}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="دور بالاسم أو الإيميل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full ps-10 pe-10 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={loadRecipients}
            disabled={loading}
            title="تحديث القائمة"
            className="shrink-0 p-2.5 rounded-lg border border-PowderBlueBorder dark:border-dark_border text-SlateBlueText dark:text-darktext hover:bg-gray-50 dark:hover:bg-dark_input disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        {search && (
          <p className="text-xs text-SlateBlueText dark:text-darktext mt-2">
            {filteredRecipients.length} نتيجة من أصل {recipients.length}
          </p>
        )}
      </div>

      {/* Recipients — desktop table */}
      <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-PowderBlueBorder dark:divide-dark_border">
            <thead className="bg-gray-50 dark:bg-dark_input">
              <tr>
                {target === "specific" && (
                  <th className="py-2.5 px-3 text-start w-10">
                    <button
                      onClick={allVisibleSelected ? clearSelection : selectAllVisible}
                      title={allVisibleSelected ? "امسح الاختيار" : "اختار الكل الظاهر"}
                    >
                      {allVisibleSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </th>
                )}
                <th className="py-2.5 px-3 text-start text-xs font-semibold text-MidnightNavyText dark:text-white">الاسم</th>
                <th className="py-2.5 px-3 text-start text-xs font-semibold text-MidnightNavyText dark:text-white">الدور</th>
                <th className="py-2.5 px-3 text-start text-xs font-semibold text-MidnightNavyText dark:text-white">
                  <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> الرقم</span>
                </th>
                <th className="py-2.5 px-3 text-start text-xs font-semibold text-MidnightNavyText dark:text-white">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> آخر إرسال</span>
                </th>
                <th className="py-2.5 px-3 text-start text-xs font-semibold text-MidnightNavyText dark:text-white">مرات الإرسال</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-PowderBlueBorder dark:divide-dark_border">
              {filteredRecipients.map((r) => (
                <tr key={r.userId} className="hover:bg-gray-50 dark:hover:bg-dark_input transition-colors">
                  {target === "specific" && (
                    <td className="py-2.5 px-3">
                      <button onClick={() => toggleSelect(r.userId)}>
                        {selectedIds.has(String(r.userId)) ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </td>
                  )}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.name} role={r.role} />
                      <div>
                        <p className="text-sm font-medium text-MidnightNavyText dark:text-white">{r.name}</p>
                        <p className="text-xs text-SlateBlueText dark:text-darktext">{r.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3"><RoleBadge role={r.role} /></td>
                  <td className="py-2.5 px-3">
                    {r.hasPhone ? (
                      <Phone className="w-4 h-4 text-primary" />
                    ) : (
                      <PhoneOff className="w-4 h-4 text-orange-coral" />
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-SlateBlueText dark:text-darktext">{formatDate(r.lastSentAt)}</td>
                  <td className="py-2.5 px-3 text-xs text-SlateBlueText dark:text-darktext">{r.totalTimesSent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recipients — mobile cards */}
        <div className="md:hidden divide-y divide-PowderBlueBorder dark:divide-dark_border">
          {filteredRecipients.map((r) => (
            <div key={r.userId} className="p-3 flex items-start gap-3">
              {target === "specific" && (
                <button onClick={() => toggleSelect(r.userId)} className="mt-1 shrink-0">
                  {selectedIds.has(String(r.userId)) ? (
                    <CheckSquare className="w-4 h-4 text-primary" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              )}
              <Avatar name={r.name} role={r.role} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-MidnightNavyText dark:text-white truncate">{r.name}</p>
                  {r.hasPhone ? (
                    <Phone className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <PhoneOff className="w-4 h-4 text-orange-coral shrink-0" />
                  )}
                </div>
                <p className="text-xs text-SlateBlueText dark:text-darktext truncate">{r.email}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <RoleBadge role={r.role} />
                  <span className="text-[11px] text-SlateBlueText dark:text-darktext">{formatDate(r.lastSentAt)}</span>
                  <span className="text-[11px] text-SlateBlueText dark:text-darktext">· {r.totalTimesSent} مرة</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredRecipients.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="inline-flex p-3 rounded-full bg-gray-100 dark:bg-dark_input mb-3">
              <Inbox className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-MidnightNavyText dark:text-white">مفيش نتايج مطابقة</p>
            <p className="text-xs text-SlateBlueText dark:text-darktext mt-1">جرب كلمة بحث تانية أو امسح الفلتر</p>
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !sending && setConfirmOpen(false)}
          />
          <div className="relative bg-white dark:bg-darkmode rounded-2xl shadow-xl border border-PowderBlueBorder dark:border-dark_border w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-bold text-MidnightNavyText dark:text-white">تأكيد الإرسال</h3>
                <p className="text-sm text-SlateBlueText dark:text-darktext mt-1">{confirmMessage}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={sending}
                className="px-4 py-2 text-sm font-medium rounded-lg text-SlateBlueText dark:text-darktext hover:bg-gray-100 dark:hover:bg-dark_input disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={confirmSend}
                disabled={sending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    تأكيد وإرسال
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}