"use client";
// components/Admin/OverviewDashboard.jsx
// ✅ صفحة نظرة عامة على المدرسين والطلاب وساعاتهم

import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Users,
  GraduationCap,
  Package,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Snowflake,
  Zap,
  Ban,
  Award,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Calendar,
  BarChart2,
  Star,
  User,
  Filter,
} from "lucide-react";

const SESSION_HOURS = 2;

// =============================================
// ✅ HELPERS
// =============================================

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function getInitials(name = "") {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
  { bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-700 dark:text-teal-300" },
  { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
  { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300" },
  { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-300" },
];

function Avatar({ name, idx = 0, size = "md" }) {
  const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  const sz = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return (
    <div
      className={`${sz} rounded-full ${color.bg} ${color.text} flex items-center justify-center font-medium flex-shrink-0`}
    >
      {getInitials(name)}
    </div>
  );
}

function CreditBadge({ level }) {
  const map = {
    active: {
      icon: Zap,
      label: "نشط",
      cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    },
    low: {
      icon: AlertCircle,
      label: "رصيد منخفض",
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    },
    expired: {
      icon: Ban,
      label: "منتهي",
      cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    },
    frozen: {
      icon: Snowflake,
      label: "مجمد",
      cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    },
    no_package: {
      icon: Package,
      label: "بدون باقة",
      cls: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    },
    completed: {
      icon: Award,
      label: "مكتمل",
      cls: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    },
  };
  const cfg = map[level] || map.no_package;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.cls}`}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function HoursBar({ used, total, remaining }) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const barColor =
    remaining <= 0
      ? "bg-red-500"
      : remaining <= 5
      ? "bg-amber-500"
      : "bg-green-500";
  return (
    <div>
      <div className="flex items-baseline gap-1.5 mb-1">
        <span
          className={`text-base font-semibold ${
            remaining <= 0
              ? "text-red-600 dark:text-red-400"
              : remaining <= 5
              ? "text-amber-600 dark:text-amber-400"
              : "text-green-700 dark:text-green-400"
          }`}
        >
          {remaining}
        </span>
        <span className="text-xs text-SlateBlueText dark:text-darktext">
          / {total} ساعة
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden w-24">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.max(0, 100 - pct)}%` }}
        />
      </div>
      <div className="text-[10px] text-SlateBlueText dark:text-darktext mt-0.5">
        {pct}% مستخدم
      </div>
    </div>
  );
}

// =============================================
// ✅ STAT CARD
// =============================================

function StatCard({ label, value, sub, icon: Icon, iconCls, valueCls }) {
  return (
    <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-SlateBlueText dark:text-darktext uppercase tracking-wide mb-1">
            {label}
          </p>
          <p className={`text-2xl font-bold ${valueCls || "text-MidnightNavyText dark:text-white"}`}>
            {value}
          </p>
          {sub && (
            <p className="text-[10px] text-SlateBlueText dark:text-darktext mt-0.5">
              {sub}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconCls}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

// =============================================
// ✅ INSTRUCTOR ROW (expandable)
// =============================================

function InstructorRow({ instructor, idx }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="hover:bg-gray-50 dark:hover:bg-dark_input transition-colors cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-2.5">
            <Avatar name={instructor.name} idx={idx} />
            <div>
              <p className="text-sm font-medium text-MidnightNavyText dark:text-white">
                {instructor.name}
              </p>
              <p className="text-xs text-SlateBlueText dark:text-darktext">
                {instructor.gender === "female" ? "مدرسة" : "مدرس"} ·{" "}
                {instructor.groups.length} مجموعة
              </p>
            </div>
          </div>
        </td>

        <td className="py-3 px-4">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-MidnightNavyText dark:text-white">
              {instructor.totalHours}
            </span>
            <span className="text-xs text-SlateBlueText dark:text-darktext">
              ساعة
            </span>
          </div>
          <p className="text-[11px] text-SlateBlueText dark:text-darktext">
            {instructor.totalSessions} جلسة × {SESSION_HOURS}س
          </p>
        </td>

        <td className="py-3 px-4">
          <div className="flex flex-wrap gap-1">
            {instructor.groups.slice(0, 2).map((g, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-[11px]"
              >
                <BookOpen className="w-2.5 h-2.5" />
                {g.groupName.length > 18 ? g.groupName.slice(0, 18) + "…" : g.groupName}
              </span>
            ))}
            {instructor.groups.length > 2 && (
              <span className="text-[11px] text-SlateBlueText dark:text-darktext px-1">
                +{instructor.groups.length - 2}
              </span>
            )}
          </div>
        </td>

        <td className="py-3 px-4">
          {instructor.lastSession ? (
            <div>
              <p className="text-xs font-medium text-MidnightNavyText dark:text-white truncate max-w-[160px]">
                {instructor.lastSession.title}
              </p>
              <p className="text-[11px] text-SlateBlueText dark:text-darktext">
                {formatDate(instructor.lastSession.date)}
              </p>
              <p className="text-[10px] text-SlateBlueText dark:text-darktext">
                {instructor.lastSession.groupName}
              </p>
            </div>
          ) : (
            <span className="text-xs text-SlateBlueText dark:text-darktext">
              —
            </span>
          )}
        </td>

        <td className="py-3 px-4">
          <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-primary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-SlateBlueText dark:text-darktext" />
            )}
          </button>
        </td>
      </tr>

      {/* ✅ Expanded rows: details per group */}
      {expanded &&
        instructor.groups.map((group, gi) => (
          <tr
            key={gi}
            className="bg-blue-50/40 dark:bg-blue-900/10 border-t border-blue-100 dark:border-blue-900/20"
          >
            <td className="py-2.5 px-4 pl-14">
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-MidnightNavyText dark:text-white">
                    {group.groupName}
                  </p>
                  <p className="text-[10px] text-SlateBlueText dark:text-darktext">
                    {group.courseName} · {group.groupCode}
                  </p>
                </div>
              </div>
            </td>

            <td className="py-2.5 px-4">
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-semibold text-primary">
                  {group.hoursInGroup}
                </span>
                <span className="text-[11px] text-SlateBlueText dark:text-darktext">
                  ساعة
                </span>
              </div>
              <p className="text-[10px] text-SlateBlueText dark:text-darktext">
                {group.sessionsCount} جلسة مكتملة
              </p>
            </td>

            <td className="py-2.5 px-4">
              <span className="text-[11px] text-SlateBlueText dark:text-darktext">
                {group.studentsCount} طالب
              </span>
              <span
                className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${
                  group.groupStatus === "active"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : group.groupStatus === "completed"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                }`}
              >
                {group.groupStatus === "active"
                  ? "نشطة"
                  : group.groupStatus === "completed"
                  ? "مكتملة"
                  : group.groupStatus === "draft"
                  ? "مسودة"
                  : group.groupStatus}
              </span>
            </td>

            <td className="py-2.5 px-4" colSpan={2}>
              {group.recentSessions?.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {group.recentSessions.map((sess, si) => (
                    <span
                      key={si}
                      className="text-[10px] px-1.5 py-0.5 bg-white dark:bg-darkmode border border-PowderBlueBorder dark:border-dark_border rounded text-SlateBlueText dark:text-darktext"
                    >
                      {sess.title} · {formatDate(sess.date)}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[11px] text-SlateBlueText dark:text-darktext">
                  لا توجد جلسات مكتملة
                </span>
              )}
            </td>
          </tr>
        ))}
    </>
  );
}

// =============================================
// ✅ STUDENT ROW (expandable)
// =============================================

function StudentRow({ student, idx }) {
  const [expanded, setExpanded] = useState(false);
  const c = student.credit;

  return (
    <>
      <tr
        className="hover:bg-gray-50 dark:hover:bg-dark_input transition-colors cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-2.5">
            <Avatar name={student.name} idx={idx} />
            <div>
              <p className="text-sm font-medium text-MidnightNavyText dark:text-white">
                {student.name}
              </p>
              <p className="text-xs text-SlateBlueText dark:text-darktext">
                {student.enrollmentNumber}
              </p>
            </div>
          </div>
        </td>

        <td className="py-3 px-4">
          <CreditBadge level={c.status} />
          {c.hasActiveFreeze && (
            <p className="text-[10px] text-blue-500 mt-0.5">حساب مجمد</p>
          )}
        </td>

        <td className="py-3 px-4">
          <HoursBar
            used={c.usedHours}
            total={c.totalHours}
            remaining={c.remainingHours}
          />
        </td>

        <td className="py-3 px-4">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-semibold text-MidnightNavyText dark:text-white">
              {c.usedHours}
            </span>
            <span className="text-xs text-SlateBlueText dark:text-darktext">
              ساعة
            </span>
          </div>
          <p className="text-[11px] text-SlateBlueText dark:text-darktext">
            {c.totalSessionsAttended} جلسة حضرها
          </p>
        </td>

        <td className="py-3 px-4">
          <p className="text-xs text-MidnightNavyText dark:text-white">
            {c.packageType
              ? {
                  "3months": "3 أشهر (24 ساعة)",
                  "6months": "6 أشهر (48 ساعة)",
                  "9months": "9 أشهر (72 ساعة)",
                  "12months": "12 شهر (96 ساعة)",
                }[c.packageType] || c.packageType
              : "—"}
          </p>
          <p className="text-[11px] text-SlateBlueText dark:text-darktext">
            ينتهي {formatDate(c.packageEndDate)}
          </p>
        </td>

        <td className="py-3 px-4">
          <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-primary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-SlateBlueText dark:text-darktext" />
            )}
          </button>
        </td>
      </tr>

      {/* ✅ Expanded: recent usage history */}
      {expanded && (
        <tr className="bg-amber-50/30 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-900/20">
          <td colSpan={6} className="py-3 px-4 pl-14">
            <p className="text-xs font-medium text-MidnightNavyText dark:text-white mb-2">
              آخر 5 استخدامات للساعات
            </p>
            {c.recentUsage?.length > 0 ? (
              <div className="space-y-1.5">
                {c.recentUsage.map((u, ui) => (
                  <div
                    key={ui}
                    className="flex items-center gap-3 text-[11px] bg-white dark:bg-darkmode rounded px-3 py-1.5 border border-PowderBlueBorder dark:border-dark_border"
                  >
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        u.attendanceStatus === "present"
                          ? "bg-green-500"
                          : u.attendanceStatus === "absent"
                          ? "bg-red-500"
                          : u.attendanceStatus === "refund"
                          ? "bg-blue-500"
                          : "bg-gray-400"
                      }`}
                    />
                    <span className="font-medium text-MidnightNavyText dark:text-white flex-1 truncate">
                      {u.sessionTitle}
                    </span>
                    <span className="text-SlateBlueText dark:text-darktext">
                      {u.groupName}
                    </span>
                    <span
                      className={`font-medium ${
                        u.hoursDeducted < 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {u.hoursDeducted < 0 ? "+" : "-"}
                      {Math.abs(u.hoursDeducted)}س
                    </span>
                    <span className="text-SlateBlueText dark:text-darktext">
                      {formatDate(u.date)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-SlateBlueText dark:text-darktext">
                لا يوجد سجل استخدام
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// =============================================
// ✅ MAIN COMPONENT
// =============================================

export default function OverviewDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("instructors");
  const [instSearch, setInstSearch] = useState("");
  const [stuSearch, setStuSearch] = useState("");
  const [stuFilter, setStuFilter] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/overview", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast.error(json.message || "فشل في تحميل البيانات");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطأ في الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ✅ Filtered instructors
  const filteredInstructors = useMemo(() => {
    if (!data?.instructors) return [];
    if (!instSearch.trim()) return data.instructors;
    const q = instSearch.toLowerCase();
    return data.instructors.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.groups.some(
          (g) =>
            g.groupName.toLowerCase().includes(q) ||
            g.courseName.toLowerCase().includes(q)
        )
    );
  }, [data, instSearch]);

  // ✅ Filtered students
  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];
    let list = data.students;
    if (stuSearch.trim()) {
      const q = stuSearch.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.enrollmentNumber?.toLowerCase().includes(q)
      );
    }
    if (stuFilter) {
      list = list.filter((s) => s.credit.status === stuFilter);
    }
    return list;
  }, [data, stuSearch, stuFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="animate-spin w-10 h-10 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-SlateBlueText dark:text-darktext">
            جاري تحميل البيانات...
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-24">
        <p className="text-SlateBlueText dark:text-darktext">
          لا توجد بيانات متاحة
        </p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const { stats } = data;

  return (
    <div className="space-y-5 p-2 md:p-0">
      {/* ── Header ── */}
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm p-5 border border-PowderBlueBorder dark:border-dark_border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <BarChart2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-MidnightNavyText dark:text-white">
                نظرة عامة — المدرسون والطلاب
              </h1>
              <p className="text-xs text-SlateBlueText dark:text-darktext mt-0.5">
                متابعة الساعات والجلسات وأرصدة الاعتماد
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </button>
        </div>
      </div>

      {/* ── Global Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="المدرسون"
          value={stats.instructors.total}
          sub={`${stats.instructors.totalHours} ساعة إجمالاً`}
          icon={GraduationCap}
          iconCls="bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400"
        />
        <StatCard
          label="جلسات مكتملة"
          value={stats.sessions.totalCompleted}
          sub={`${stats.sessions.totalHours} ساعة تدريس`}
          icon={CheckCircle}
          iconCls="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
        />
        <StatCard
          label="الطلاب"
          value={stats.students.total}
          sub={`${stats.credit.totalWithPackage} لديهم باقة`}
          icon={Users}
          iconCls="bg-primary/10 text-primary"
        />
        <StatCard
          label="رصيد منخفض / منتهي"
          value={stats.credit.low + stats.credit.expired}
          sub={`${stats.credit.low} منخفض · ${stats.credit.expired} منتهي`}
          icon={AlertCircle}
          iconCls="bg-red-100 dark:bg-red-900/30 text-red-500"
          valueCls={
            stats.credit.low + stats.credit.expired > 0
              ? "text-red-600 dark:text-red-400"
              : "text-MidnightNavyText dark:text-white"
          }
        />
      </div>

      {/* ── Second row stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          label="ساعات متبقية (طلاب)"
          value={stats.credit.totalRemainingHours}
          sub="ساعة اعتماد"
          icon={Clock}
          iconCls="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          label="ساعات مستخدمة"
          value={stats.credit.totalUsedHours}
          sub="إجمالي المستهلك"
          icon={TrendingUp}
          iconCls="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label="طلاب نشطون (رصيد)"
          value={stats.credit.active}
          icon={Zap}
          iconCls="bg-green-100 dark:bg-green-900/30 text-green-600"
        />
        <StatCard
          label="مجمدون"
          value={stats.credit.frozen}
          icon={Snowflake}
          iconCls="bg-blue-100 dark:bg-blue-900/30 text-blue-500"
        />
        <StatCard
          label="بدون باقة"
          value={stats.credit.noPackage}
          icon={Package}
          iconCls="bg-gray-100 dark:bg-gray-700 text-gray-500"
        />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 dark:bg-dark_input p-1 rounded-xl w-fit">
        {[
          { id: "instructors", label: "المدرسون", icon: GraduationCap },
          { id: "students", label: "الطلاب", icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white dark:bg-darkmode text-MidnightNavyText dark:text-white shadow-sm border border-PowderBlueBorder dark:border-dark_border"
                : "text-SlateBlueText dark:text-darktext hover:text-MidnightNavyText dark:hover:text-white"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "bg-gray-200 dark:bg-gray-600 text-SlateBlueText dark:text-darktext"
              }`}
            >
              {tab.id === "instructors"
                ? data.instructors.length
                : data.students.length}
            </span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          ✅ INSTRUCTORS TABLE
      ══════════════════════════════════════════ */}
      {activeTab === "instructors" && (
        <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border shadow-sm overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-PowderBlueBorder dark:border-dark_border">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث عن مدرس أو مجموعة..."
                value={instSearch}
                onChange={(e) => setInstSearch(e.target.value)}
                className="w-full pr-10 pl-4 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-PowderBlueBorder dark:divide-dark_border">
              <thead className="bg-gray-50 dark:bg-dark_input">
                <tr>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wide">
                    المدرس
                  </th>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wide">
                    إجمالي الساعات
                  </th>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wide">
                    المجموعات
                  </th>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wide">
                    آخر جلسة
                  </th>
                  <th className="py-2.5 px-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-PowderBlueBorder dark:divide-dark_border">
                {filteredInstructors.length > 0 ? (
                  filteredInstructors.map((inst, idx) => (
                    <InstructorRow key={inst._id} instructor={inst} idx={idx} />
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-10 text-sm text-SlateBlueText dark:text-darktext"
                    >
                      لا توجد نتائج مطابقة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary footer */}
          <div className="px-4 py-3 border-t border-PowderBlueBorder dark:border-dark_border bg-gray-50 dark:bg-dark_input flex items-center justify-between">
            <p className="text-xs text-SlateBlueText dark:text-darktext">
              {filteredInstructors.length} مدرس ·{" "}
              {filteredInstructors.reduce((s, i) => s + i.totalSessions, 0)} جلسة مكتملة
            </p>
            <p className="text-xs font-medium text-primary">
              إجمالي الساعات:{" "}
              {filteredInstructors.reduce((s, i) => s + i.totalHours, 0)} ساعة
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          ✅ STUDENTS TABLE
      ══════════════════════════════════════════ */}
      {activeTab === "students" && (
        <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border shadow-sm overflow-hidden">
          {/* Filters */}
          <div className="p-3 border-b border-PowderBlueBorder dark:border-dark_border flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث عن طالب أو رقم تسجيل..."
                value={stuSearch}
                onChange={(e) => setStuSearch(e.target.value)}
                className="w-full pr-10 pl-4 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select
                value={stuFilter}
                onChange={(e) => setStuFilter(e.target.value)}
                className="py-2 px-3 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
              >
                <option value="">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="low">رصيد منخفض</option>
                <option value="expired">منتهي</option>
                <option value="frozen">مجمد</option>
                <option value="no_package">بدون باقة</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-PowderBlueBorder dark:divide-dark_border">
              <thead className="bg-gray-50 dark:bg-dark_input">
                <tr>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wide">
                    الطالب
                  </th>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wide">
                    حالة الرصيد
                  </th>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wide">
                    الساعات المتبقية
                  </th>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wide">
                    الساعات المستخدمة
                  </th>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wide">
                    الباقة
                  </th>
                  <th className="py-2.5 px-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-PowderBlueBorder dark:divide-dark_border">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((stu, idx) => (
                    <StudentRow key={stu._id} student={stu} idx={idx} />
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-10 text-sm text-SlateBlueText dark:text-darktext"
                    >
                      لا توجد نتائج مطابقة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary footer */}
          <div className="px-4 py-3 border-t border-PowderBlueBorder dark:border-dark_border bg-gray-50 dark:bg-dark_input flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-SlateBlueText dark:text-darktext">
              {filteredStudents.length} طالب معروض
            </p>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-green-600 dark:text-green-400 font-medium">
                متبقي:{" "}
                {filteredStudents.reduce(
                  (s, st) => s + st.credit.remainingHours,
                  0
                )}{" "}
                ساعة
              </span>
              <span className="text-SlateBlueText dark:text-darktext">
                مستخدم:{" "}
                {filteredStudents.reduce(
                  (s, st) => s + st.credit.usedHours,
                  0
                )}{" "}
                ساعة
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}