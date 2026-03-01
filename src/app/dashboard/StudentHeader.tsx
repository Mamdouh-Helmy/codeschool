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
    User,
    Settings,
    HelpCircle,
    BookOpen,
    Calendar,
    MessageSquare,
    Sparkles,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

interface StudentUser {
    _id: string;
    name: string;
    email: string;
    role: string;
    studentId?: string;
    image?: string | null;
}

interface StudentHeaderProps {
    user: StudentUser;
    notifications?: any[];
    onMenuClick?: () => void;
    sidebarOpen?: boolean;
    onRefresh?: () => void;
}

export default function StudentHeader({
    user,
    notifications = [],
    onMenuClick,
    sidebarOpen = false,
    onRefresh,
}: StudentHeaderProps) {
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const { locale, toggleLocale } = useLocale();
    const { t } = useI18n();

    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isScrolled, setIsScrolled] = useState(false);

    const isArabic = locale === "ar";

    const notificationsRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                notificationsRef.current &&
                !notificationsRef.current.contains(event.target as Node)
            ) {
                setShowNotifications(false);
            }
            if (
                userMenuRef.current &&
                !userMenuRef.current.contains(event.target as Node)
            ) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus search on mobile when opened
    useEffect(() => {
        if (showMobileSearch && searchRef.current) {
            searchRef.current.focus();
        }
    }, [showMobileSearch]);

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
            });

            localStorage.removeItem("token");
            router.push("/");
        } catch (error) {
            console.error("Sign out error:", error);
        }
    };

    const getUserInitial = () =>
        user?.name?.length > 0 ? user.name.charAt(0).toUpperCase() : (isArabic ? "ط" : "S");
    
    const getUserName = () => user?.name || (isArabic ? "طالب" : "Student");
    
    const getFirstName = () => getUserName().split(" ")[0];

    // Get greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return isArabic ? "صباح الخير" : "Good Morning";
        if (hour < 18) return isArabic ? "مساء الخير" : "Good Afternoon";
        return isArabic ? "مساء الخير" : "Good Evening";
    };

    // Handle search submit
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
            setShowMobileSearch(false);
        }
    };

    /* ── Shared dark-mode dropdown styles ── */
    const dropdownClass = `
        absolute mt-2 z-50 overflow-hidden rounded-xl shadow-2xl
        bg-white dark:bg-[#161b22]
        border border-gray-200 dark:border-[#30363d]
        transform transition-all duration-200 origin-top-right
        ${isArabic ? "left-0" : "right-0"}
    `;

    return (
        <header
            dir={isArabic ? "rtl" : "ltr"}
            className={`sticky top-0 z-40 transition-all duration-300 ${
                isScrolled
                    ? "bg-white/95 dark:bg-[#161b22]/95 backdrop-blur-md shadow-lg dark:shadow-black/40"
                    : "bg-white dark:bg-[#161b22] shadow-sm dark:shadow-black/40"
            } border-b border-gray-200 dark:border-[#30363d]`}
        >
            <div className="px-4 sm:px-6 lg:px-8 py-3 lg:py-4">
                <div className="flex items-center justify-between gap-4">

                    {/* ── Left section with greeting ── */}
                    <div className={`flex items-center gap-3 lg:gap-4 ${isArabic ? "order-3" : "order-1"}`}>
                        {/* Mobile menu button with animation */}
                        <button
                            onClick={onMenuClick}
                            className="lg:hidden relative w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] transition-all duration-200 group"
                            aria-label={isArabic ? "فتح القائمة" : "Toggle sidebar"}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-purple-600/0 group-hover:from-primary/10 group-hover:to-purple-600/10 rounded-xl transition-all duration-300" />
                            {sidebarOpen ? (
                                <X className="relative z-10 w-5 h-5 mx-auto text-gray-600 dark:text-[#8b949e] group-hover:scale-110 transition-transform" />
                            ) : (
                                <Menu className="relative z-10 w-5 h-5 mx-auto text-gray-600 dark:text-[#8b949e] group-hover:scale-110 transition-transform" />
                            )}
                        </button>

                        {/* Desktop greeting with enhanced design */}
                        <div className="hidden lg:block">
                            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
                                <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                                    {isArabic
                                        ? `أهلاً بك، ${getFirstName()}!`
                                        : `Welcome back, ${getFirstName()}!`}
                                </span>
                                <span className="text-3xl animate-wave">👋</span>
                            </h1>
                            <p className="text-sm lg:text-base text-gray-500 dark:text-[#8b949e] mt-1 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-yellow-400" />
                                {isArabic
                                    ? "إليك ما يحدث في رحلتك التعليمية اليوم"
                                    : "Here's what's happening with your learning journey today"}
                            </p>
                        </div>
                    </div>

                    {/* Mobile title with improved design */}
                    <div className="lg:hidden text-center flex-1">
                        <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-primary/10 to-purple-600/10 px-3 py-1 rounded-full">
                            <Sparkles className="w-3 h-3 text-yellow-400" />
                            <span className="text-xs font-medium text-primary">
                                {getGreeting()}
                            </span>
                        </div>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mt-1 truncate">
                            {isArabic
                                ? `أهلاً ${getFirstName()}!`
                                : `Hi ${getFirstName()}!`}
                        </h1>
                    </div>

                    {/* ── Action buttons in same level ── */}
                    <div className={`flex items-center gap-2 lg:gap-3 order-3`}>
                        {/* Desktop search with animation */}
                        <div className="relative hidden lg:block group">
                            <form onSubmit={handleSearchSubmit}>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={isArabic ? "البحث عن دورات..." : "Search courses..."}
                                    className={`w-64 xl:w-80 outline-none px-4 ${
                                        isArabic ? "pr-10" : "pl-10"
                                    } py-2.5 text-sm rounded-xl transition-all duration-300 bg-gray-100 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 dark:placeholder:text-[#6e7681] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary dark:focus:border-[#58a6ff] group-hover:border-primary/50`}
                                />
                                <Search
                                    className={`absolute ${
                                        isArabic ? "right-3" : "left-3"
                                    } top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6e7681] transition-colors group-hover:text-primary`}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        className={`absolute ${
                                            isArabic ? "left-3" : "right-3"
                                        } top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#21262d] transition-colors`}
                                    >
                                        <X className="w-3 h-3 text-gray-400" />
                                    </button>
                                )}
                            </form>
                        </div>

                        {/* Mobile search toggle with animation */}
                        <button
                            onClick={() => setShowMobileSearch(!showMobileSearch)}
                            className="lg:hidden relative w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] transition-all duration-200 group"
                            aria-label={isArabic ? "بحث" : "Search"}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-purple-600/0 group-hover:from-primary/10 group-hover:to-purple-600/10 rounded-xl transition-all duration-300" />
                            <Search className="relative z-10 w-5 h-5 mx-auto text-gray-600 dark:text-[#8b949e] group-hover:scale-110 transition-transform" />
                        </button>

                        {/* Refresh button (optional) */}
                        {onRefresh && (
                            <button
                                onClick={onRefresh}
                                className="relative w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] transition-all duration-200 group"
                                aria-label={isArabic ? "تحديث" : "Refresh"}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-purple-600/0 group-hover:from-primary/10 group-hover:to-purple-600/10 rounded-xl transition-all duration-300" />
                                <svg
                                    className="relative z-10 w-5 h-5 mx-auto text-gray-600 dark:text-[#8b949e] group-hover:rotate-180 transition-transform duration-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                            </button>
                        )}

                        {/* Language toggle with improved design */}
                        <button
                            onClick={toggleLocale}
                            className="relative w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] transition-all duration-200 group"
                            aria-label={isArabic ? "English" : "العربية"}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-purple-600/0 group-hover:from-primary/10 group-hover:to-purple-600/10 rounded-xl transition-all duration-300" />
                            <span className="relative z-10 flex items-center justify-center w-full h-full text-sm font-medium text-gray-700 dark:text-[#8b949e]">
                                {isArabic ? "EN" : "عربي"}
                            </span>
                        </button>

                        {/* Theme toggle with animation */}
                        <button
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="relative w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] transition-all duration-200 group"
                            aria-label={isArabic ? "تغيير المظهر" : "Toggle theme"}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-purple-600/0 group-hover:from-primary/10 group-hover:to-purple-600/10 rounded-xl transition-all duration-300" />
                            {theme === "dark" ? (
                                <Sun className="relative z-10 w-5 h-5 mx-auto text-yellow-400 group-hover:rotate-90 transition-transform duration-500" />
                            ) : (
                                <Moon className="relative z-10 w-5 h-5 mx-auto text-gray-700 dark:text-[#8b949e] group-hover:scale-110 transition-transform" />
                            )}
                        </button>

                        {/* ── Notifications ── */}
                        <div className="relative" ref={notificationsRef}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] transition-all duration-200 group"
                                aria-label={isArabic ? "الإشعارات" : "Notifications"}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-purple-600/0 group-hover:from-primary/10 group-hover:to-purple-600/10 rounded-xl transition-all duration-300" />
                                <Bell className="relative z-10 w-5 h-5 mx-auto text-gray-600 dark:text-[#8b949e] group-hover:scale-110 transition-transform" />
                                {notifications.length > 0 && (
                                    <>
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-primary to-purple-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg shadow-primary/40 animate-pulse">
                                            {notifications.length}
                                        </span>
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full animate-ping opacity-75" />
                                    </>
                                )}
                            </button>

                            {showNotifications && (
                                <div className={`${dropdownClass} w-80 sm:w-96 animate-slide-down`}>
                                    {/* Header with gradient */}
                                    <div className="px-4 py-3 border-b border-gray-100 dark:border-[#30363d] bg-gradient-to-r from-primary/5 to-purple-600/5">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
                                                <Bell className="w-4 h-4 text-primary" />
                                                {isArabic ? "الإشعارات" : "Notifications"}
                                            </h3>
                                            {notifications.length > 0 && (
                                                <span className="text-xs bg-gradient-to-r from-primary to-purple-600 text-white px-2 py-1 rounded-full font-medium shadow-sm">
                                                    {notifications.length} {isArabic ? "جديد" : "new"}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                        {notifications.length > 0 ? (
                                            notifications.slice(0, 5).map((note, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => setShowNotifications(false)}
                                                    className="px-4 py-3 flex items-start gap-3 cursor-pointer border-b border-gray-50 dark:border-[#21262d] last:border-0 hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-all duration-200 group/item relative overflow-hidden"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-purple-600/0 group-hover/item:from-primary/5 group-hover/item:to-purple-600/5 transition-all duration-300" />
                                                    
                                                    <div className="relative z-10 w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-purple-600/10 flex items-center justify-center flex-shrink-0 group-hover/item:scale-110 transition-transform">
                                                        <Bell className="w-5 h-5 text-primary" />
                                                    </div>
                                                    
                                                    <div className="relative z-10 flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-[#e6edf3] line-clamp-2 group-hover/item:text-primary transition-colors">
                                                            {note.title}
                                                        </p>
                                                        {note.message && (
                                                            <p className="text-xs text-gray-500 dark:text-[#8b949e] mt-0.5 line-clamp-1">
                                                                {note.message}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-gray-400 dark:text-[#6e7681] mt-1">
                                                            {note.time}
                                                        </p>
                                                    </div>
                                                    
                                                    {!note.isRead && (
                                                        <span className="relative z-10 w-2 h-2 bg-primary rounded-full animate-pulse" />
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center">
                                                <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-full flex items-center justify-center mb-4">
                                                    <Bell className="w-8 h-8 text-gray-400 dark:text-[#6e7681]" />
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-[#8b949e]">
                                                    {isArabic ? "لا توجد إشعارات جديدة" : "No new notifications"}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {notifications.length > 0 && (
                                        <Link
                                            href="/dashboard/notifications"
                                            onClick={() => setShowNotifications(false)}
                                            className="block px-4 py-3 text-center text-sm font-medium text-primary hover:text-primary/80 border-t border-gray-100 dark:border-[#30363d] hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-all duration-200 group relative overflow-hidden"
                                        >
                                            <span className="relative z-10 flex items-center justify-center gap-1">
                                                {isArabic ? "عرض كل الإشعارات" : "View all notifications"}
                                                {isArabic ? (
                                                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                )}
                                            </span>
                                            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-purple-600/0 group-hover:from-primary/5 group-hover:to-purple-600/5 transition-all duration-300" />
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── User Menu ── */}
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#21262d] transition-all duration-200 group"
                                aria-label={isArabic ? "قائمة المستخدم" : "User menu"}
                            >
                                <div className="relative">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-white dark:ring-[#161b22] shadow-lg group-hover:scale-105 transition-transform">
                                        {getUserInitial()}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#161b22]" />
                                </div>
                                <span className="hidden lg:block text-sm font-medium text-gray-700 dark:text-[#e6edf3] group-hover:text-primary transition-colors">
                                    {getFirstName()}
                                </span>
                                <ChevronDown
                                    className={`hidden lg:block w-4 h-4 text-gray-400 dark:text-[#8b949e] transition-all duration-300 group-hover:text-primary ${
                                        showUserMenu ? "rotate-180" : ""
                                    }`}
                                />
                            </button>

                            {showUserMenu && (
                                <div className={`${dropdownClass} w-72 animate-slide-down`}>
                                    {/* User info header with gradient */}
                                    <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#1c2128] dark:to-[#21262d] border-b border-gray-100 dark:border-[#30363d]">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-xl ring-2 ring-white dark:ring-[#1c2128] shadow-lg shadow-primary/30">
                                                    {getUserInitial()}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-[#1c2128]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 dark:text-[#e6edf3] truncate text-lg">
                                                    {user.name}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-[#8b949e] truncate mt-0.5">
                                                    {user.email}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="inline-block text-[10px] font-medium bg-gradient-to-r from-primary to-purple-600 text-white px-2 py-0.5 rounded-full capitalize shadow-sm">
                                                        {isArabic
                                                            ? user.role === "student"
                                                                ? "طالب"
                                                                : user.role
                                                            : user.role}
                                                    </span>
                                                    {user.studentId && (
                                                        <span className="text-[10px] text-gray-400 dark:text-[#6e7681]">
                                                            ID: {user.studentId}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Menu items */}
                                    <div className="p-2">
                                        <Link
                                            href="/dashboard/profile"
                                            onClick={() => setShowUserMenu(false)}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-[#8b949e] hover:bg-gray-50 dark:hover:bg-[#1c2128] hover:text-primary dark:hover:text-primary transition-all duration-200 group/item"
                                        >
                                            <User className="w-4 h-4 group-hover/item:scale-110 transition-transform" />
                                            <span>{isArabic ? "الملف الشخصي" : "Profile"}</span>
                                        </Link>

                                        <Link
                                            href="/dashboard/settings"
                                            onClick={() => setShowUserMenu(false)}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-[#8b949e] hover:bg-gray-50 dark:hover:bg-[#1c2128] hover:text-primary dark:hover:text-primary transition-all duration-200 group/item"
                                        >
                                            <Settings className="w-4 h-4 group-hover/item:rotate-90 transition-transform duration-500" />
                                            <span>{isArabic ? "الإعدادات" : "Settings"}</span>
                                        </Link>

                                        <Link
                                            href="/dashboard/help"
                                            onClick={() => setShowUserMenu(false)}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-[#8b949e] hover:bg-gray-50 dark:hover:bg-[#1c2128] hover:text-primary dark:hover:text-primary transition-all duration-200 group/item"
                                        >
                                            <HelpCircle className="w-4 h-4 group-hover/item:scale-110 transition-transform" />
                                            <span>{isArabic ? "المساعدة" : "Help"}</span>
                                        </Link>

                                        <div className="my-2 border-t border-gray-100 dark:border-[#30363d]" />

                                        <button
                                            onClick={() => {
                                                setShowUserMenu(false);
                                                handleLogout();
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200 group/item relative overflow-hidden"
                                        >
                                            <LogOut className="w-4 h-4 group-hover/item:-translate-x-1 transition-transform" />
                                            <span>{isArabic ? "تسجيل الخروج" : "Logout"}</span>
                                            <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 to-red-500/0 group-hover/item:from-red-500/5 group-hover/item:to-red-500/5 transition-all duration-300" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile Search with animation */}
                <div
                    className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
                        showMobileSearch ? "max-h-20 opacity-100 mt-4" : "max-h-0 opacity-0"
                    }`}
                >
                    <form onSubmit={handleSearchSubmit} className="relative group">
                        <input
                            ref={searchRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isArabic ? "البحث عن دورات..." : "Search courses..."}
                            className={`w-full px-4 ${
                                isArabic ? "pr-10" : "pl-10"
                            } py-3 text-sm rounded-xl bg-gray-100 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 dark:placeholder:text-[#6e7681] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary dark:focus:border-[#58a6ff] transition-all duration-300 group-hover:border-primary/50`}
                        />
                        <Search
                            className={`absolute ${
                                isArabic ? "right-3" : "left-3"
                            } top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6e7681] transition-colors group-hover:text-primary`}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className={`absolute ${
                                    isArabic ? "left-3" : "right-3"
                                } top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-[#21262d] transition-colors`}
                            >
                                <X className="w-3 h-3 text-gray-400" />
                            </button>
                        )}
                    </form>
                </div>
            </div>

            {/* Add custom styles */}
            <style jsx>{`
                @keyframes wave {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(15deg); }
                    75% { transform: rotate(-15deg); }
                }
                
                @keyframes slideDown {
                    0% { opacity: 0; transform: translateY(-10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                
                .animate-wave {
                    animation: wave 2s ease-in-out infinite;
                    display: inline-block;
                }
                
                .animate-slide-down {
                    animation: slideDown 0.2s ease-out;
                }
                
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e0;
                    border-radius: 3px;
                }
                
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #30363d;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #a0aec0;
                }
                
                .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #3d444d;
                }
            `}</style>
        </header>
    );
}