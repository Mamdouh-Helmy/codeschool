"use client";
import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Clock,
  Search,
  RefreshCw,
  Phone,
  PhoneOff,
  CheckCircle,
  AlertCircle,
  MinusCircle,
  Ban,
  Send,
  Filter,
} from "lucide-react";

const STATUS_META = {
  sent_recently: {
    label: "اتبعتله قريب",
    icon: CheckCircle,
    className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  },
  pending: {
    label: "مستني الدور",
    icon: AlertCircle,
    className: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  },
  not_due: {
    label: "لسه معملش 30 يوم",
    icon: MinusCircle,
    className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  },
  skipped: {
    label: "مستبعد",
    icon: Ban,
    className: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200",
  },
};

const FILTER_TABS = [
  { value: "", label: "الكل" },
  { value: "pending", label: "مستنيين" },
  { value: "sent_recently", label: "اتبعتلهم" },
  { value: "not_due", label: "لسه بدري" },
  { value: "skipped", label: "مستبعدين" },
];

export default function PortfolioInactivityAdmin() {
  const [details, setDetails] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState(""); // "" | "has" | "no"

  const loadDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/portfolio-inactivity-status", {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) {
        setDetails(json.details);
        setSummary(json.summary);
      } else {
        toast.error(json.message || "فشل تحميل البيانات");
      }
    } catch (err) {
      console.error(err);
      toast.error("حصل خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, []);

  const filteredDetails = useMemo(() => {
    let result = details;

    if (statusFilter) {
      result = result.filter((d) => d.status === statusFilter);
    }

    if (phoneFilter === "has") {
      result = result.filter((d) => d.hasPhoneOnFile);
    } else if (phoneFilter === "no") {
      result = result.filter((d) => !d.hasPhoneOnFile);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) => d.name?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [details, statusFilter, phoneFilter, search]);

  const formatDate = (dateString) => {
    if (!dateString) return "—";
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

  const handleRunNow = async () => {
    if (!window.confirm(`متأكد إنك عاوز تبعت الرسالة دلوقتي لكل الـ ${summary?.pending || 0} شخص المستنيين؟`)) {
      return;
    }

    setSending(true);
    const toastId = toast.loading("جاري إرسال الرسائل...");

    try {
      const res = await fetch("/api/admin/portfolio-inactivity-status", {
        method: "POST",
      });
      const json = await res.json();

      if (!res.ok || !json.success) throw new Error(json.message || "فشل التنفيذ");

      toast.success(
        `تم: ${json.sent} اتبعت، ${json.skipped} اتخطى، ${json.failed} فشل`,
        { id: toastId, duration: 5000 },
      );
      await loadDetails();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "حصل خطأ أثناء الإرسال", { id: toastId });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* Header */}
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm p-4 md:p-6 border border-PowderBlueBorder dark:border-dark_border">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="w-5 h-5 md:w-7 md:h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-MidnightNavyText dark:text-white">
                تذكير عدم تحديث البورتفوليو
              </h1>
              <p className="text-xs md:text-sm text-SlateBlueText dark:text-darktext">
                تفاصيل مين اتبعتله، مين مستني، ومين معندوش رقم مسجل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadDetails}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-dark_input hover:bg-gray-200 text-SlateBlueText dark:text-darktext rounded-lg text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              تحديث
            </button>
            <button
              onClick={handleRunNow}
              disabled={sending || !summary?.pending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold"
            >
              {sending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              ابعت دلوقتي ({summary?.pending || 0})
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <StatCard label="الإجمالي" value={summary.total} icon={Clock} color="primary" />
          <StatCard label="اتبعتلهم" value={summary.sentRecently} icon={CheckCircle} color="green" />
          <StatCard label="مستنيين" value={summary.pending} icon={AlertCircle} color="amber" />
          <StatCard label="لسه بدري" value={summary.notDue} icon={MinusCircle} color="blue" />
          <StatCard label="معندهمش رقم" value={summary.noPhone} icon={PhoneOff} color="red" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-SlateBlueText dark:text-darktext uppercase tracking-wide">
          <Filter className="w-3.5 h-3.5" />
          الفلاتر
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                statusFilter === tab.value
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-dark_input text-SlateBlueText dark:text-darktext hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="دور بالاسم أو الإيميل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            />
          </div>

          <select
            value={phoneFilter}
            onChange={(e) => setPhoneFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
          >
            <option value="">كل حالات الرقم</option>
            <option value="has">عنده رقم</option>
            <option value="no">معندوش رقم</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-PowderBlueBorder dark:divide-dark_border">
            <thead className="bg-gray-50 dark:bg-dark_input">
              <tr>
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-MidnightNavyText dark:text-white">الاسم</th>
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-MidnightNavyText dark:text-white">الدور</th>
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-MidnightNavyText dark:text-white">الرقم</th>
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-MidnightNavyText dark:text-white">آخر تحديث للبورتفوليو</th>
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-MidnightNavyText dark:text-white">آخر تذكير اتبعت</th>
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-MidnightNavyText dark:text-white">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-PowderBlueBorder dark:divide-dark_border">
              {filteredDetails.map((d) => {
                const meta = STATUS_META[d.status] || STATUS_META.skipped;
                const StatusIcon = meta.icon;
                return (
                  <tr key={d.portfolioId} className="hover:bg-gray-50 dark:hover:bg-dark_input">
                    <td className="py-2.5 px-3">
                      <p className="text-sm font-medium text-MidnightNavyText dark:text-white">{d.name}</p>
                      <p className="text-xs text-SlateBlueText dark:text-darktext">{d.email}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-xs text-SlateBlueText dark:text-darktext">{d.role}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      {d.hasPhoneOnFile ? (
                        <Phone className="w-4 h-4 text-green-500" />
                      ) : (
                        <PhoneOff className="w-4 h-4 text-red-400" />
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-SlateBlueText dark:text-darktext">
                      {formatDate(d.lastUpdatedAt)}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-SlateBlueText dark:text-darktext">
                      {formatDate(d.lastReminderSentAt)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${meta.className}`}>
                        <StatusIcon className="w-3 h-3" />
                        {meta.label}
                        {d.status === "pending" && !d.hasPhoneOnFile && " (معندوش رقم)"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredDetails.length === 0 && (
          <div className="text-center py-8 text-sm text-SlateBlueText dark:text-darktext">
            مفيش نتايج مطابقة
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    red: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  };

  return (
    <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
            {label}
          </p>
          <p className="text-lg md:text-2xl font-bold text-MidnightNavyText dark:text-white mt-0.5">
            {value}
          </p>
        </div>
        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4 h-4 md:w-5 md:h-5" />
        </div>
      </div>
    </div>
  );
}