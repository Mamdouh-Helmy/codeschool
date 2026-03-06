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
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface InstructorUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
}

interface InstructorHeaderProps {
  user: InstructorUser;
  notifications?: any[];
  onMenuClick?: () => void;
  sidebarOpen?: boolean;
  onRefresh?: () => void;
}

export default function InstructorHeader({
  user,
  notifications = [],
  onMenuClick,
  sidebarOpen = false,
  onRefresh,
}: InstructorHeaderProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { locale, toggleLocale } = useLocale();
  const isArabic = locale === "ar";

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (showMobileSearch && searchRef.current) searchRef.current.focus();
  }, [showMobileSearch]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("token");
      router.push("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const getUserInitial = () =>
    user?.name?.length > 0 ? user.name.charAt(0).toUpperCase() : (isArabic ? "م" : "I");

  const getFirstName = () => (user?.name || (isArabic ? "مدرس" : "Instructor")).split(" ")[0];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return isArabic ? "صباح الخير" : "Good Morning";
    if (hour < 18) return isArabic ? "مساء الخير" : "Good Afternoon";
    return isArabic ? "مساء الخير" : "Good Evening";
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/instructor/search?q=${encodeURIComponent(searchQuery)}`);
      setShowMobileSearch(false);
    }
  };

  const dropdownClass = `
    absolute mt-2 z-50 overflow-hidden rounded-xl shadow-2xl
    bg-white dark:bg-[#161b22]
    border border-gray-200 dark:border-[#30363d]
    transform transition-all duration-200
    ${isArabic ? "left-0 origin-top-left" : "right-0 origin-top-right"}
    w-[calc(100vw-2rem)] sm:w-auto max-w-[360px]
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

          {/* Left: menu + greeting */}
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
                <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  {isArabic ? `أهلاً، ${getFirstName()}!` : `Hello, ${getFirstName()}!`}
                </span>
                <span className="text-2xl animate-wave">👨‍🏫</span>
              </h1>
              <p className="text-xs xl:text-sm text-gray-500 dark:text-[#8b949e] mt-1 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-yellow-400" />
                {isArabic ? "لوحة تحكم المدرس - رحلتك التعليمية" : "Instructor Dashboard — Your teaching journey"}
              </p>
            </div>
          </div>

          {/* Center: mobile title */}
          <div className="lg:hidden text-center flex-1 min-w-0 px-2">
            <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-primary/10 to-purple-600/10 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
              <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-400" />
              <span className="text-[10px] sm:text-xs font-medium text-primary truncate">
                {getGreeting()}
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mt-0.5 truncate">
              {isArabic ? `أهلاً ${getFirstName()}!` : `Hi ${getFirstName()}!`}
            </h1>
          </div>

          {/* Right: action buttons */}
          <div className={`flex items-center gap-1 sm:gap-2 order-3 flex-shrink-0`}>
            {/* Desktop search */}
            <div className="relative hidden xl:block group">
              <form onSubmit={handleSearchSubmit}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isArabic ? "البحث..." : "Search..."}
                  className={`w-56 2xl:w-72 px-4 ${isArabic ? "pr-10" : "pl-10"} py-2 text-sm rounded-xl
                    bg-gray-100 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d]
                    text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 dark:placeholder:text-[#6e7681]
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                    transition-all`}
                />
                <Search
                  className={`absolute ${isArabic ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`}
                />
              </form>
            </div>

            {/* Mobile search toggle */}
            <button
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="xl:hidden relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] transition-all flex items-center justify-center group flex-shrink-0"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-purple-600/0 group-hover:from-primary/10 group-hover:to-purple-600/10 rounded-xl transition-all duration-300" />
              <Search className="relative z-10 w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-[#8b949e] group-hover:scale-110 transition-transform" />
            </button>

            {/* Refresh */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] transition-all flex items-center justify-center group flex-shrink-0"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-purple-600/0 group-hover:from-primary/10 group-hover:to-purple-600/10 rounded-xl transition-all duration-300" />
                <svg
                  className="relative z-10 w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-[#8b949e] group-hover:rotate-180 transition-transform duration-500"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}

            {/* Language */}
            <button
              onClick={toggleLocale}
              className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] transition-all flex items-center justify-center text-xs sm:text-sm font-medium text-gray-700 dark:text-[#8b949e] group flex-shrink-0"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-purple-600/0 group-hover:from-primary/10 group-hover:to-purple-600/10 rounded-xl transition-all duration-300" />
              <span className="relative z-10">{isArabic ? "EN" : "عربي"}</span>
            </button>

            {/* Theme */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] transition-all flex items-center justify-center group flex-shrink-0"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-purple-600/0 group-hover:from-primary/10 group-hover:to-purple-600/10 rounded-xl transition-all duration-300" />
              {theme === "dark" ? (
                <Sun className="relative z-10 w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 group-hover:rotate-90 transition-transform duration-500" />
              ) : (
                <Moon className="relative z-10 w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-[#8b949e] group-hover:scale-110 transition-transform" />
              )}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] transition-all flex items-center justify-center group flex-shrink-0"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-purple-600/0 group-hover:from-primary/10 group-hover:to-purple-600/10 rounded-xl transition-all duration-300" />
                <Bell className="relative z-10 w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-[#8b949e] group-hover:scale-110 transition-transform" />
                {notifications.length > 0 && (
                  <>
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-r from-primary to-purple-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1 shadow-lg shadow-primary/40 animate-pulse">
                      {notifications.length > 9 ? "9+" : notifications.length}
                    </span>
                    <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-primary rounded-full animate-ping opacity-75" />
                  </>
                )}
              </button>

              {showNotifications && (
                <div className={`${dropdownClass} sm:w-80 animate-slide-down`}>
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-[#30363d] bg-gradient-to-r from-primary/5 to-purple-600/5">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" />
                      {isArabic ? "الإشعارات" : "Notifications"}
                    </h3>
                  </div>
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-full flex items-center justify-center mb-4">
                      <Bell className="w-8 h-8 text-gray-400 dark:text-[#6e7681]" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                      {isArabic ? "لا توجد إشعارات جديدة" : "No new notifications"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1 sm:gap-2 p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] transition-all group flex-shrink-0"
              >
                <div className="relative">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm ring-2 ring-white dark:ring-[#161b22] shadow-lg group-hover:scale-105 transition-transform">
                    {getUserInitial()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#161b22]" />
                </div>
                <span className="hidden lg:block text-xs xl:text-sm font-medium text-gray-700 dark:text-[#e6edf3] group-hover:text-primary transition-colors max-w-[100px] truncate">
                  {getFirstName()}
                </span>
                <ChevronDown
                  className={`hidden lg:block w-3 h-3 text-gray-400 group-hover:text-primary transition-all duration-300 ${showUserMenu ? "rotate-180" : ""}`}
                />
              </button>

              {showUserMenu && (
                <div className={`${dropdownClass} w-64 sm:w-72 animate-slide-down`}>
                  <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#1c2128] dark:to-[#21262d] border-b border-gray-100 dark:border-[#30363d]">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-lg ring-2 ring-white dark:ring-[#1c2128] shadow-lg shadow-primary/30">
                        {getUserInitial()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-[#e6edf3] truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-[#8b949e] truncate mt-0.5">
                          {user.email}
                        </p>
                        <span className="inline-block text-[10px] font-medium bg-gradient-to-r from-primary to-purple-600 text-white px-2 py-0.5 rounded-full mt-1 shadow-sm">
                          {isArabic ? "مدرس" : "Instructor"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      onClick={() => { setShowUserMenu(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group/item relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 to-red-500/0 group-hover/item:from-red-500/5 group-hover/item:to-red-500/5 transition-all duration-300" />
                      <LogOut className="relative z-10 w-4 h-4 group-hover/item:-translate-x-1 transition-transform" />
                      <span className="relative z-10">{isArabic ? "تسجيل الخروج" : "Logout"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search expandable */}
        <div
          className={`xl:hidden overflow-hidden transition-all duration-300 ${
            showMobileSearch ? "max-h-20 opacity-100 mt-3" : "max-h-0 opacity-0"
          }`}
        >
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isArabic ? "البحث..." : "Search..."}
              className={`w-full px-4 ${isArabic ? "pr-10" : "pl-10"} py-2.5 text-sm rounded-xl
                bg-gray-100 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d]
                text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all`}
            />
            <Search
              className={`absolute ${isArabic ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`}
            />
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes wave { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(15deg); } 75% { transform: rotate(-15deg); } }
        @keyframes slideDown { 0% { opacity: 0; transform: translateY(-10px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-wave { animation: wave 2s ease-in-out infinite; display: inline-block; }
        .animate-slide-down { animation: slideDown 0.2s ease-out; }
      `}</style>
    </header>
  );
}