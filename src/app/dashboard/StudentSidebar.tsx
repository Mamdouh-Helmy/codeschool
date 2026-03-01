"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/app/context/LocaleContext";
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  Calendar,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LogOut,
  Home,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

interface User {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  studentId?: string;
  [key: string]: any;
}

interface NavigationItem {
  name: string;
  nameAr: string;
  href: string;
  icon: React.ElementType;
  gradient: string;
  badge?: number;
}

interface StudentSidebarProps {
  user?: User | null;
  onLogout?: () => void;
}

export default function StudentSidebar({
  user = null,
  onLogout = () => {},
}: StudentSidebarProps): React.JSX.Element {
  const { t } = useI18n();
  const { locale } = useLocale();
  const isRTL = locale === "ar";
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const navigationItems: NavigationItem[] = [
    {
      name: t("sidebar.home"),
      nameAr: "الرئيسية",
      href: "/",
      icon: Home,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      name: t("sidebar.dashboard"),
      nameAr: "لوحة التحكم",
      href: "/dashboard",
      icon: LayoutDashboard,
      gradient: "from-primary to-purple-600",
    },
    {
      name: t("sidebar.courses"),
      nameAr: "الدورات",
      href: "/dashboard/courses",
      icon: BookOpen,
      gradient: "from-purple-500 to-pink-500",
    },
    {
      name: t("sidebar.schedule"),
      nameAr: "الجدول",
      href: "/dashboard/schedule",
      icon: Calendar,
      gradient: "from-pink-500 to-rose-500",
    },
    {
      name: t("sidebar.documents"),
      nameAr: "المستندات",
      href: "/dashboard/documents",
      icon: FileText,
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      name: t("sidebar.messages"),
      nameAr: "الرسائل",
      href: "/dashboard/messages",
      icon: MessageSquare,
      gradient: "from-primary to-cyan-500",
      badge: 3,
    },
    {
      name: t("sidebar.settings"),
      nameAr: "الإعدادات",
      href: "/dashboard/settings",
      icon: Settings,
      gradient: "from-slate-500 to-gray-600",
    },
  ];

  const isActive = (href: string): boolean => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const getUserInitial = (): string => {
    if (user?.name && typeof user.name === "string" && user.name.length > 0) {
      return user.name.charAt(0).toUpperCase();
    }
    return isRTL ? "ط" : "S";
  };

  const getUserName = (): string => {
    if (user?.name && typeof user.name === "string") return user.name;
    return isRTL ? "طالب" : "Student";
  };

  const getUserEmail = (): string => {
    if (user?.email && typeof user.email === "string") return user.email;
    return "student@example.com";
  };

  // Helper function for collapse button text
  const getCollapseButtonText = () => {
    if (isCollapsed) {
      return isRTL ? "توسيع" : "Expand";
    }
    return isRTL ? "طي" : "Collapse";
  };

  // Helper function for aria-label
  const getCollapseAriaLabel = () => {
    if (isCollapsed) {
      return isRTL ? "توسيع القائمة الجانبية" : "Expand sidebar";
    }
    return isRTL ? "طي القائمة الجانبية" : "Collapse sidebar";
  };

  return (
    <aside
      dir={isRTL ? "rtl" : "ltr"}
      className={`
        h-full flex flex-col flex-shrink-0 sticky top-0
        transition-all duration-300 ease-in-out
        ${isCollapsed ? "w-20" : "w-64"}

        /* ── Light ── */
        bg-white border-l border-gray-200

        /* ── GitHub Dark ── */
        dark:bg-[#161b22] dark:border-[#30363d]
      `}
    >
      {/* ── Logo ── */}
      <div className="p-6 border-b border-gray-200 dark:border-[#30363d]">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900 dark:text-[#e6edf3]">
                Code School
              </span>
              <span className="text-xs text-gray-500 dark:text-[#8b949e]">
                {isRTL ? "منصة تعليمية" : "Learning Platform"}
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-6 px-3">
        <div className="space-y-1">
          {navigationItems.map((item: NavigationItem) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  group relative flex items-center gap-3 px-3 py-3 rounded-xl
                  transition-all duration-200
                  ${isCollapsed ? "justify-center" : ""}
                  ${
                    active
                      ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg`
                      : `text-gray-600 dark:text-[#8b949e]
                         hover:bg-gray-100 dark:hover:bg-[#21262d]
                         hover:text-gray-900 dark:hover:text-[#e6edf3]`
                  }
                `}
                aria-current={active ? "page" : undefined}
              >
                {/* Icon */}
                <div
                  className={`
                    w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                    transition-all duration-200
                    ${
                      active
                        ? "bg-white/20"
                        : "bg-gray-100 dark:bg-[#21262d] group-hover:scale-110"
                    }
                  `}
                >
                  <Icon
                    className={`w-5 h-5 transition-colors duration-200 ${
                      active ? "text-white" : "text-gray-600 dark:text-[#8b949e]"
                    }`}
                  />
                </div>

                {/* Label + Badge */}
                {!isCollapsed && (
                  <>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {isRTL ? item.nameAr : item.name}
                      </span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                            active
                              ? "bg-white/30 text-white"
                              : "bg-primary text-white"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {active && (
                      <>
                        {isRTL ? (
                          <ChevronRight className="w-4 h-4 text-white animate-pulse" />
                        ) : (
                          <ChevronLeft className="w-4 h-4 text-white animate-pulse" />
                        )}
                      </>
                    )}
                  </>
                )}

                {/* Collapsed tooltip */}
                {isCollapsed && (
                  <div
                    className={`
                      absolute ${isRTL ? 'left-full' : 'right-full'} 
                      ${isRTL ? 'ml-2' : 'mr-2'} px-3 py-2
                      bg-[#161b22] border border-[#30363d]
                      text-[#e6edf3] text-sm rounded-lg
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible
                      transition-all duration-200 whitespace-nowrap shadow-xl z-50
                    `}
                  >
                    {isRTL ? item.nameAr : item.name}
                    <div className={`absolute top-1/2 -translate-y-1/2 ${
                      isRTL ? 'right-full' : 'left-full'
                    } border-8 border-transparent ${
                      isRTL ? 'border-r-[#30363d]' : 'border-l-[#30363d]'
                    }`} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── User Profile ── */}
      <div className="border-t border-gray-200 dark:border-[#30363d] p-4">
        <div
          className={`
            flex items-center gap-3 p-3 rounded-xl
            bg-gray-50 dark:bg-[#1c2128]
            border border-transparent dark:border-[#30363d]
            ${isCollapsed ? "justify-center" : ""}
          `}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-white dark:ring-[#161b22] shadow-lg">
              {getUserInitial()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#161b22]" />
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-[#e6edf3] truncate">
                {getUserName()}
              </p>
              <p className="text-xs text-gray-500 dark:text-[#8b949e] truncate">
                {getUserEmail()}
              </p>
            </div>
          )}

          {!isCollapsed && (
            <button
              onClick={onLogout}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 dark:text-[#8b949e] hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title={isRTL ? "تسجيل الخروج" : "Logout"}
              aria-label={isRTL ? "تسجيل الخروج" : "Logout"}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="
            mt-3 w-full p-2 rounded-lg
            bg-gray-100 dark:bg-[#21262d]
            hover:bg-gray-200 dark:hover:bg-[#30363d]
            text-gray-600 dark:text-[#8b949e]
            transition-colors flex items-center justify-center gap-2
            border border-transparent dark:border-[#30363d]
          "
          aria-label={getCollapseAriaLabel()}
        >
          {isRTL ? (
            <ChevronRight
              className={`w-4 h-4 transition-transform duration-300 ${
                isCollapsed ? "" : "rotate-180"
              }`}
            />
          ) : (
            <ChevronLeft
              className={`w-4 h-4 transition-transform duration-300 ${
                isCollapsed ? "rotate-180" : ""
              }`}
            />
          )}
          {!isCollapsed && (
            <span className="text-xs font-medium">
              {getCollapseButtonText()}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}