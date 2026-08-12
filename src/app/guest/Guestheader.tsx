"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useLocale } from "@/app/context/LocaleContext";
import { useI18n } from "@/i18n/I18nProvider";
import {
  Bell,
  Menu,
  X,
  LogOut,
  Moon,
  Sun,
  ChevronDown,
  Sparkles,
  Mail,
} from "lucide-react";

// ─── Brand colors — same palette as InstructorHeader ─────────────────────────
// #004d59  deep teal    (primary dark)
// #ff6700  vivid orange (primary accent)
// #feaf00  golden amber (highlight)
// #ff6437  coral        (warning / secondary)

const DEFAULT_AVATAR = "/images/default-avatar.jpg";

interface GuestUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  image?: string | null;
}

interface RecentMessage {
  _id: string;
  name: string;
  email: string;
  message: string;
  service?: string;
  createdAt: string;
}

interface GuestHeaderProps {
  user: GuestUser;
  onMenuClick?: () => void;
  sidebarOpen?: boolean;
  onRefresh?: () => void;
  onLogout?: () => void;
}

export default function GuestHeader({
  user,
  onMenuClick,
  sidebarOpen = false,
  onRefresh,
  onLogout,
}: GuestHeaderProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { locale, toggleLocale } = useLocale();
  const isArabic = locale === "ar";

  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // ── Notifications: fetched here directly, so the badge behaves
  //    the same no matter which page renders the header ──
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/guest/notifications", { credentials: "include" });
      const response = await res.json();
      if (response.success) {
        setUnreadCount(response.data.unreadCount);
        setRecentMessages(response.data.recentMessages);
      }
    } catch (e) {
      // silent fail — badge simply won't update this cycle
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Opening the bell marks everything as read — both in the UI and in the DB,
  // so the badge won't come back until a genuinely new message arrives.
  const handleBellClick = async () => {
    const opening = !showNotifications;
    setShowNotifications(opening);

    if (opening && unreadCount > 0) {
      setUnreadCount(0);
      try {
        await fetch("/api/guest/notifications/mark-read", {
          method: "PATCH",
          credentials: "include",
        });
      } catch (e) {
        // ignore — next fetchNotifications() call will reconcile
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node))
        setShowNotifications(false);
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node))
        setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (onLogout) return onLogout();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const getUserInitial = () =>
    user?.name && user.name.length > 0 ? user.name.charAt(0).toUpperCase() : isArabic ? "ز" : "G";

  const getFirstName = () => (user?.name || (isArabic ? "زائر" : "Guest")).split(" ")[0];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return isArabic ? "صباح الخير" : "Good Morning";
    if (hour < 18) return isArabic ? "مساء الخير" : "Good Afternoon";
    return isArabic ? "مساء الخير" : "Good Evening";
  };

  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return isArabic ? "الآن" : "now";
    if (mins < 60) return isArabic ? `منذ ${mins} د` : `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return isArabic ? `منذ ${hours} س` : `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return isArabic ? `منذ ${days} يوم` : `${days}d ago`;
  };

  const dropdownClass = `
    absolute mt-2 z-50 overflow-hidden rounded-xl shadow-2xl
    bg-white dark:bg-[#161b22]
    border border-gray-200 dark:border-[#30363d]
    transform transition-all duration-200
    ${isArabic ? "left-0 origin-top-left" : "right-0 origin-top-right"}
    w-[calc(100vw-2rem)] sm:w-auto max-w-[380px]
  `;

  const iconBtn = `
    relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl
    hover:bg-gray-100 dark:hover:bg-[#21262d]
    transition-all flex items-center justify-center
    group flex-shrink-0
  `;

  return (
    <header
      dir={isArabic ? "rtl" : "ltr"}
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md shadow-lg"
          : "bg-white dark:bg-[#161b22] shadow-sm"
      } border-b border-gray-200 dark:border-[#30363d]`}
    >
      <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-2 sm:py-3 lg:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-3 lg:gap-4">

          {/* ── Left: menu + greeting ── */}
          <div className={`flex items-center gap-2 sm:gap-3 ${isArabic ? "order-3" : "order-1"} flex-shrink-0`}>
            <button
              onClick={onMenuClick}
              className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] transition-all flex items-center justify-center"
            >
              {sidebarOpen ? (
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-[#8b949e]" />
              ) : (
                <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-[#8b949e]" />
              )}
            </button>

            <div className="hidden lg:block flex-shrink-0">
              <h1 className="text-xl xl:text-2xl font-bold flex items-center gap-2">
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(135deg, #004d59, #ff6700)" }}
                >
                  {isArabic ? `أهلاً، ${getFirstName()}!` : `Hello, ${getFirstName()}!`}
                </span>
                <span className="text-2xl animate-wave">👋</span>
              </h1>
              <p className="text-xs xl:text-sm text-gray-500 dark:text-[#8b949e] mt-1 flex items-center gap-2">
                <Sparkles className="w-3 h-3" style={{ color: "#feaf00" }} />
                {isArabic ? "بورتفليوك ورسائلك في مكان واحد" : "Your portfolio and messages, in one place"}
              </p>
            </div>
          </div>

          {/* ── Center: mobile title ── */}
          <div className="lg:hidden text-center flex-1 min-w-0 px-2">
            <div
              className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full"
              style={{ background: "linear-gradient(135deg, #004d5910, #ff670010)" }}
            >
              <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: "#feaf00" }} />
              <span className="text-[10px] sm:text-xs font-medium truncate" style={{ color: "#004d59" }}>
                {getGreeting()}
              </span>
            </div>
            <h1
              className="text-sm sm:text-base font-bold bg-clip-text text-transparent mt-0.5 truncate"
              style={{ backgroundImage: "linear-gradient(135deg, #004d59, #ff6700)" }}
            >
              {isArabic ? `أهلاً ${getFirstName()}!` : `Hi ${getFirstName()}!`}
            </h1>
          </div>

          {/* ── Right: action buttons ── */}
          <div className="flex items-center gap-1 sm:gap-2 order-3 flex-shrink-0">

            {/* Refresh */}
            {onRefresh && (
              <button onClick={onRefresh} className={iconBtn}>
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: "linear-gradient(135deg, #004d5910, #ff670010)" }} />
                <svg
                  className="relative z-10 w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-[#8b949e] group-hover:rotate-180 transition-transform duration-500"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}

            {/* Language toggle */}
            <button onClick={toggleLocale} className={iconBtn}>
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "linear-gradient(135deg, #004d5910, #ff670010)" }} />
              <span className="relative z-10 text-xs sm:text-sm font-medium text-gray-700 dark:text-[#8b949e] group-hover:text-[#ff6700] transition-colors">
                {isArabic ? "EN" : "عربي"}
              </span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={iconBtn}
              suppressHydrationWarning
            >
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "linear-gradient(135deg, #004d5910, #ff670010)" }} />
              {!mounted ? (
                <Moon className="relative z-10 w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-[#8b949e]" />
              ) : theme === "dark" ? (
                <Sun className="relative z-10 w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-500" style={{ color: "#feaf00" }} />
              ) : (
                <Moon className="relative z-10 w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-[#8b949e] group-hover:scale-110 transition-transform" />
              )}
            </button>

            {/* ── Notifications (recent portfolio messages) ── */}
            <div className="relative" ref={notificationsRef}>
              <button onClick={handleBellClick} className={iconBtn}>
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: "linear-gradient(135deg, #004d5910, #ff670010)" }} />
                <Bell className="relative z-10 w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-[#8b949e] group-hover:scale-110 transition-transform" />

                {unreadCount > 0 && (
                  <>
                    <span
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1 shadow-lg animate-pulse"
                      style={{ background: "linear-gradient(135deg, #ff6437, #ff6700)" }}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                    <span className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full animate-ping opacity-75" style={{ background: "#ff6437" }} />
                  </>
                )}
              </button>

              {showNotifications && (
                <div className={`${dropdownClass} sm:w-80 animate-slide-down`}>
                  <div
                    className="px-4 py-3 border-b border-gray-100 dark:border-[#30363d] flex items-center justify-between"
                    style={{ background: "linear-gradient(135deg, #004d5908, #ff670008)" }}
                  >
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
                      <Mail className="w-4 h-4" style={{ color: "#ff6700" }} />
                      {isArabic ? "رسائل البورتفوليو" : "Portfolio Messages"}
                    </h3>
                  </div>

                  {recentMessages && recentMessages.length > 0 ? (
                    <>
                      <div className="max-h-80 overflow-y-auto">
                        {recentMessages.slice(0, 5).map((m) => (
                          <Link
                            key={m._id}
                            href="/guest/messages"
                            onClick={() => setShowNotifications(false)}
                            className="flex items-start gap-3 p-3 border-b border-gray-50 dark:border-[#21262d] hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors"
                          >
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-xs"
                              style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
                              {(m.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-[#e6edf3] truncate">{m.name}</p>
                              <p className="text-xs text-gray-500 dark:text-[#8b949e] truncate">{m.message}</p>
                              <p className="text-[10px] text-gray-400 dark:text-[#6e7681] mt-0.5">{formatTimeAgo(m.createdAt)}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                      <Link
                        href="/guest/messages"
                        onClick={() => setShowNotifications(false)}
                        className="block text-center text-xs font-bold py-2.5 hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors"
                        style={{ color: "#ff6700" }}
                      >
                        {isArabic ? "عرض كل الرسائل" : "View all messages"}
                      </Link>
                    </>
                  ) : (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-full flex items-center justify-center mb-4">
                        <Bell className="w-8 h-8 text-gray-400 dark:text-[#6e7681]" />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                        {isArabic ? "لا توجد رسائل جديدة" : "No new messages"}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── User Menu ── */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1 sm:gap-2 p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] transition-all group flex-shrink-0"
              >
                <div className="relative">
                  {user?.image ? (
                    <img
                      src={user.image}
                      alt={getFirstName()}
                      className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-full object-cover ring-2 ring-white dark:ring-[#161b22] shadow-lg group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        if (!img.dataset.fallback) {
                          img.src = DEFAULT_AVATAR;
                          img.dataset.fallback = "true";
                        }
                      }}
                    />
                  ) : (
                    <div
                      className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm ring-2 ring-white dark:ring-[#161b22] shadow-lg group-hover:scale-105 transition-transform"
                      style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}
                    >
                      {getUserInitial()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#161b22]" />
                </div>
                <span className="hidden lg:block text-xs xl:text-sm font-medium text-gray-700 dark:text-[#e6edf3] group-hover:text-[#ff6700] transition-colors max-w-[100px] truncate">
                  {getFirstName()}
                </span>
                <ChevronDown className={`hidden lg:block w-3 h-3 text-gray-400 group-hover:text-[#ff6700] transition-all duration-300 ${showUserMenu ? "rotate-180" : ""}`} />
              </button>

              {showUserMenu && (
                <div className={`${dropdownClass} w-64 sm:w-72 animate-slide-down`}>
                  <div className="p-4 border-b border-gray-100 dark:border-[#30363d]" style={{ background: "linear-gradient(135deg, #004d5908, #ff670008)" }}>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ring-2 ring-white dark:ring-[#161b22] shadow-lg"
                        style={{ background: "linear-gradient(135deg, #004d59, #ff6700)", boxShadow: "0 4px 14px #ff670030" }}
                      >
                        {getUserInitial()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-[#e6edf3] truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-[#8b949e] truncate mt-0.5">{user?.email}</p>
                        <span
                          className="inline-block text-[10px] font-bold text-white px-2 py-0.5 rounded-full mt-1 shadow-sm"
                          style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}
                        >
                          {isArabic ? "زائر" : "Guest"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      onClick={() => { setShowUserMenu(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group/item relative overflow-hidden"
                    >
                      <LogOut className="relative z-10 w-4 h-4 group-hover/item:-translate-x-1 transition-transform" />
                      <span className="relative z-10">{isArabic ? "تسجيل الخروج" : "Logout"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25%       { transform: rotate(15deg); }
          75%       { transform: rotate(-15deg); }
        }
        @keyframes slideDown {
          0%   { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-wave       { animation: wave 2s ease-in-out infinite; display: inline-block; }
        .animate-slide-down { animation: slideDown 0.2s ease-out; }
      `}</style>
    </header>
  );
}