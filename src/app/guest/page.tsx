"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import GuestSidebar from "./GuestSidebar";
import GuestHeader from "./GuestHeader";
import {
  Eye,
  FolderKanban,
  Sparkles as SparklesIcon,
  Mail,
  Award,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Edit3,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";

// ── Types ──────────────────────────────────────────────

interface GuestUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  image?: string | null;
}

interface PortfolioSummary {
  _id: string;
  title: string;
  description?: string;
  isPublished: boolean;
  views: number;
}

interface Stats {
  views: number;
  projectsCount: number;
  skillsCount: number;
  certificatesCount: number;
  messagesCount: number;
  messagesThisWeek: number;
}

interface RecentMessage {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  service?: string;
  message: string;
  createdAt: string;
}

interface DashboardData {
  hasPortfolio: boolean;
  portfolio: PortfolioSummary | null;
  stats: Stats;
  recentMessages: RecentMessage[];
}

interface ApiResponse {
  success: boolean;
  data: DashboardData;
  message?: string;
}

// ── Animated Counter ──

const AnimatedCounter = ({ value, duration = 1400 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number;
    let frame: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(eased * value));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <span>{count.toLocaleString()}</span>;
};

// ── Skeleton ──

const DashboardSkeleton = ({ isRTL }: { isRTL: boolean }) => (
  <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#0a0f17]">
    <div className="flex">
      <div className="w-64 h-screen bg-white dark:bg-[#161b22] border-l border-gray-200 dark:border-[#30363d] hidden lg:block">
        <div className="p-6 border-b border-gray-200 dark:border-[#30363d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff6700]/20 animate-pulse" />
            <div className="flex-1">
              <div className="h-5 w-32 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse mb-2" />
              <div className="h-3 w-24 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="p-3 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-[#21262d] animate-pulse" />
              <div className="flex-1 h-4 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <main className="flex-1 min-w-0">
        <div className="h-16 bg-white dark:bg-[#161b22] border-b border-gray-200 dark:border-[#30363d] px-6 flex items-center justify-between">
          <div className="w-8 h-8 bg-gray-200 dark:bg-[#21262d] rounded-lg animate-pulse lg:hidden" />
          <div className={`flex items-center gap-4 ${isRTL ? "mr-auto" : "ml-auto"}`}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-8 h-8 bg-gray-200 dark:bg-[#21262d] rounded-full animate-pulse" />
            ))}
          </div>
        </div>
        <div className="p-6 lg:p-8">
          <div className="rounded-3xl p-8 mb-8 animate-pulse h-48"
            style={{ background: "linear-gradient(135deg, #004d5933 0%, #ff670033 100%)" }} />
          <div className="grid grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-[#161b22] rounded-2xl p-6 h-32 animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    </div>
  </div>
);

// ── Main Component ──

export default function GuestDashboard() {
  const { locale } = useLocale();
  const isRTL = locale === "ar";
  const router = useRouter();
  const { data: session, status } = useSession();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const user: GuestUser | null = session?.user
    ? {
        id: (session.user as any).id,
        name: session.user.name || undefined,
        email: session.user.email || undefined,
        role: (session.user as any).role,
        image: session.user.image || null,
      }
    : null;

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/");
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const fetchData = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const res = await fetch("/api/guest/dashboard", {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const response: ApiResponse = await res.json();

      if (!res.ok || !response.success) throw new Error(response.message || "Error");
      setDashboardData(response.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      router.push("/");
    } catch (e) {}
  };

  const getGreetingIcon = () => {
    const h = new Date().getHours();
    return h < 12 ? "🌤️" : h < 18 ? "☀️" : "🌙";
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (status === "loading" || loading) return <DashboardSkeleton isRTL={isRTL} />;

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] dark:bg-[#0a0f17]" dir={isRTL ? "rtl" : "ltr"}>
        <div className="text-center max-w-md p-8">
          <div className="w-24 h-24 mx-auto bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="h-12 w-12 text-red-500 animate-pulse" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-[#e6edf3] mb-3">
            {isRTL ? "حدث خطأ" : "Something went wrong"}
          </h3>
          <p className="text-gray-600 dark:text-[#8b949e] mb-6">{error}</p>
          <button
            onClick={() => fetchData()}
            className="px-6 py-3 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}
          >
            {isRTL ? "إعادة المحاولة" : "Try Again"}
          </button>
        </div>
      </div>
    );
  }

  const { hasPortfolio, portfolio, stats, recentMessages = [] } = dashboardData!;

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#0a0f17] flex relative" dir={isRTL ? "rtl" : "ltr"}>
      {refreshing && (
        <div className={`fixed top-4 ${isRTL ? "left-4" : "right-4"} z-50 text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2`}
          style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-bold">{isRTL ? "جاري التحديث..." : "Refreshing..."}</span>
        </div>
      )}

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div
        className={`fixed lg:static inset-y-0 ${isRTL ? "right-0" : "left-0"} z-50 transform transition-all duration-500
          ${sidebarOpen ? "translate-x-0" : (isRTL ? "translate-x-full" : "-translate-x-full") + " lg:translate-x-0"}
          flex-shrink-0`}
      >
        <GuestSidebar
          user={user}
          onLogout={handleLogout}
          portfolioId={portfolio?._id || null}
          messagesCount={stats.messagesCount}
        />
      </div>

      <main className="flex-1 min-w-0 transition-all duration-300">
        <GuestHeader
          user={user || {}}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onRefresh={() => fetchData(true)}
          onLogout={handleLogout}
        />

        <div className="p-4 sm:p-6 lg:p-8">

          {/* ── No portfolio yet ── */}
          {!hasPortfolio && (
            <div className="max-w-2xl mx-auto text-center py-10 lg:py-14">
              <div className="w-64 h-64 sm:w-80 sm:h-80 mx-auto -mb-4 relative">
                <Image
                  src="/images/teacher-mascot.png"
                  alt=""
                  fill
                  className="object-contain drop-shadow-2xl"
                  priority
                />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-[#e6edf3] mb-3">
                {isRTL ? "لسه معملتش بورتفوليو" : "You haven't created a portfolio yet"}
              </h2>
              <p className="text-gray-500 dark:text-[#8b949e] mb-8">
                {isRTL
                  ? "اعمل بورتفوليو شخصي عشان تعرض شغلك ومهاراتك، وتقدر تستقبل رسائل من الزوار"
                  : "Build a personal portfolio to showcase your work and skills, and start receiving visitor messages"}
              </p>
              <Link
                href="/portfolio/builder"
                className="inline-flex items-center gap-2 px-8 py-3.5 text-white rounded-xl font-black hover:shadow-lg transition-all transform hover:-translate-y-1"
                style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}
              >
                {isRTL ? "إنشاء بورتفليو" : "Create Portfolio"}
                {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </Link>
            </div>
          )}

          {hasPortfolio && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">

              {/* ── Left Column ── */}
              <div className="lg:col-span-2 space-y-6 lg:space-y-8">

                {/* Hero Banner */}
                <div className="relative rounded-3xl shadow-lg overflow-hidden p-8 lg:p-10"
                  style={{ background: "linear-gradient(135deg, #004d59 0%, #ff6700 100%)" }}>
                  <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
                  <div className="absolute -bottom-16 -left-10 w-64 h-64 rounded-full bg-black/10 blur-3xl" />

                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 lg:gap-10">
                    {/* Text content */}
                    <div className="flex-1 text-center md:text-start w-full">
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                        <SparklesIcon className="w-4 h-4 text-[#feaf00] animate-pulse" />
                        <span className="text-[#feaf00] font-bold text-sm">
                          {getGreetingIcon()} {isRTL ? "أهلاً بيك" : "Welcome back"}, {user?.name?.split(" ")[0] || (isRTL ? "زائر" : "Guest")}!
                        </span>
                      </div>

                      <h2 className="text-2xl lg:text-3xl font-black text-white mb-2">
                        {portfolio?.title || (isRTL ? "بورتفليوك الشخصي" : "Your Personal Portfolio")}
                      </h2>

                      <p className="text-white/70 mb-6 text-base max-w-lg mx-auto md:mx-0">
                        {isRTL
                          ? `${stats.views} مشاهدة و ${stats.messagesCount} رسالة وصلتلك لحد دلوقتي`
                          : `${stats.views} views and ${stats.messagesCount} messages so far`}
                      </p>

                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <Link
                          href={portfolio ? `/portfolio/${portfolio._id}` : "/portfolio/builder"}
                          target="_blank"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-xl font-black hover:bg-orange-50 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1 text-sm"
                          style={{ color: "#ff6700" }}
                        >
                          {isRTL ? "عرض البورتفوليو" : "View Portfolio"}
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <Link
                          href="/portfolio/builder"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-white/15 text-white border border-white/30 rounded-xl font-black hover:bg-white/25 transition-all duration-300 text-sm backdrop-blur-sm"
                        >
                          <Edit3 className="w-4 h-4" />
                          {isRTL ? "تعديل" : "Edit"}
                        </Link>
                      </div>
                    </div>

                    {/* Mascot - takes half the banner's width and height */}
                    <div className="hidden md:block relative w-1/2 self-stretch min-h-[220px] lg:min-h-[260px]">
                      <Image
                        src="/images/teacher-mascot.png"
                        alt=""
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

                  {/* Views */}
                  <div className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5 -translate-y-4 translate-x-4"
                      style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }} />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg group-hover/stats:scale-110 transition-transform duration-300"
                          style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
                          <Eye className="w-7 h-7 text-white" />
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: "#ff670015", color: "#ff6700", border: "1px solid #ff670025" }}>
                          {isRTL ? "مشاهدات" : "Views"}
                        </span>
                      </div>
                      <h3 className="text-3xl font-black text-gray-900 dark:text-[#e6edf3] mb-1">
                        <AnimatedCounter value={stats.views} />
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                        {isRTL ? "مشاهدات البورتفوليو" : "Portfolio Views"}
                      </p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5 -translate-y-4 translate-x-4"
                      style={{ background: "linear-gradient(135deg, #004d59, #ff6437)" }} />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg group-hover/stats:scale-110 transition-transform duration-300"
                          style={{ background: "linear-gradient(135deg, #004d59, #ff6437)" }}>
                          <Mail className="w-7 h-7 text-white" />
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: "#004d5915", color: "#004d59", border: "1px solid #004d5925" }}>
                          {isRTL ? "رسائل" : "Messages"}
                        </span>
                      </div>
                      <h3 className="text-3xl font-black text-gray-900 dark:text-[#e6edf3] mb-1">
                        <AnimatedCounter value={stats.messagesCount} />
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                        {isRTL ? `+${stats.messagesThisWeek} خلال آخر أسبوع` : `+${stats.messagesThisWeek} this week`}
                      </p>
                    </div>
                  </div>

                  {/* Projects */}
                  <div className="group/stats relative bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d] hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5 -translate-y-4 translate-x-4"
                      style={{ background: "linear-gradient(135deg, #feaf00, #f67d00)" }} />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg group-hover/stats:scale-110 transition-transform duration-300"
                          style={{ background: "linear-gradient(135deg, #feaf00, #f67d00)" }}>
                          <FolderKanban className="w-7 h-7 text-white" />
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: "#feaf0015", color: "#f67d00", border: "1px solid #feaf0030" }}>
                          {isRTL ? "مشاريع" : "Projects"}
                        </span>
                      </div>
                      <h3 className="text-3xl font-black text-gray-900 dark:text-[#e6edf3] mb-1">
                        <AnimatedCounter value={stats.projectsCount} />
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                        {isRTL ? "مشاريع في البورتفوليو" : "Projects in Portfolio"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Portfolio breakdown */}
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 lg:p-8 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                  <h3 className="text-xl font-black text-gray-900 dark:text-[#e6edf3] mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" style={{ color: "#ff6700" }} />
                    {isRTL ? "محتوى البورتفوليو" : "Portfolio Content"}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { label: isRTL ? "مشاريع" : "Projects", value: stats.projectsCount, icon: FolderKanban, color: "#ff6700" },
                      { label: isRTL ? "مهارات" : "Skills", value: stats.skillsCount, icon: SparklesIcon, color: "#004d59" },
                      { label: isRTL ? "شهادات" : "Certificates", value: stats.certificatesCount, icon: Award, color: "#feaf00" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 dark:border-[#30363d]">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}15` }}>
                          <item.icon className="w-5 h-5" style={{ color: item.color }} />
                        </div>
                        <div>
                          <p className="text-lg font-black text-gray-900 dark:text-[#e6edf3]">{item.value}</p>
                          <p className="text-xs text-gray-500 dark:text-[#8b949e]">{item.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/portfolio/builder"
                    className="mt-6 inline-flex items-center gap-2 text-sm font-bold hover:underline"
                    style={{ color: "#ff6700" }}
                  >
                    <Edit3 className="w-4 h-4" />
                    {isRTL ? "إضافة أو تعديل المحتوى" : "Add or edit content"}
                  </Link>
                </div>
              </div>

              {/* ── Right Column: Recent Messages ── */}
              <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 lg:self-start">
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
                      <Mail className="w-5 h-5" style={{ color: "#ff6700" }} />
                      {isRTL ? "آخر الرسائل" : "Recent Messages"}
                    </h3>
                    {stats.messagesCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #ff6700, #f67d00)" }}>
                        {stats.messagesCount}
                      </span>
                    )}
                  </div>

                  {recentMessages.length > 0 ? (
                    <div className="space-y-3">
                      {recentMessages.map((m) => (
                        <Link
                          key={m._id}
                          href="/guest/messages"
                          className="block p-3 rounded-xl border border-gray-100 dark:border-[#30363d] hover:shadow-md transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-xs"
                              style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
                              {(m.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-sm text-gray-900 dark:text-[#e6edf3] truncate">{m.name}</p>
                              <p className="text-xs text-gray-500 dark:text-[#8b949e] line-clamp-2 mt-0.5">{m.message}</p>
                              <p className="text-[10px] text-gray-400 dark:text-[#6e7681] mt-1">{formatDate(m.createdAt)}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Mail className="w-10 h-10 text-gray-300 dark:text-[#6e7681] mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                        {isRTL ? "لسه مفيش رسائل" : "No messages yet"}
                      </p>
                    </div>
                  )}

                  <Link
                    href="/guest/messages"
                    className="mt-4 block text-center text-sm text-white px-4 py-2.5 rounded-xl font-black hover:shadow-lg transition-all hover:scale-105"
                    style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}
                  >
                    {isRTL ? "عرض كل الرسائل" : "View All Messages"}
                  </Link>
                </div>

                {/* Publish status */}
                <div className="bg-white dark:bg-[#161b22] rounded-2xl p-6 shadow-lg dark:shadow-black/40 border border-gray-100 dark:border-[#30363d]">
                  <h4 className="font-black text-gray-900 dark:text-[#e6edf3] mb-3 text-base">
                    {isRTL ? "حالة النشر" : "Publish Status"}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${portfolio?.isPublished ? "bg-emerald-500" : "bg-gray-300 dark:bg-[#6e7681]"}`} />
                    <span className="text-sm text-gray-600 dark:text-[#8b949e]">
                      {portfolio?.isPublished
                        ? (isRTL ? "بورتفوليوك منشور ومتاح للزوار" : "Your portfolio is published and visible")
                        : (isRTL ? "بورتفوليوك لسه مش منشور" : "Your portfolio isn't published yet")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}