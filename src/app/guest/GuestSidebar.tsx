"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/app/context/LocaleContext";
import {
  Home,
  LayoutDashboard,
  UserCircle,
  Edit3,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const DEFAULT_AVATAR = "/images/default-avatar.jpg";

interface User {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  image?: string | null;
  [key: string]: any;
}

interface NavigationItem {
  name: string;
  nameAr: string;
  href: string;
  icon: React.ElementType;
  activeGradient: string;
  badge?: number;
  exact?: boolean;
}

interface GuestSidebarProps {
  user?: User | null;
  onLogout?: () => void;
  /** لو مبعوتين من الأب هيستخدمهم، وإلا هيجيبهم بنفسه */
  portfolioId?: string | null;
  messagesCount?: number;
}

export default function GuestSidebar({
  user = null,
  onLogout = () => {},
  portfolioId: portfolioIdProp = null,
  messagesCount: messagesCountProp,
}: GuestSidebarProps): React.JSX.Element {
  const { t } = useI18n();
  const { locale } = useLocale();
  const isRTL = locale === "ar";
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const [portfolioId, setPortfolioId] = useState<string | null>(portfolioIdProp);
  const [messagesCount, setMessagesCount] = useState<number>(messagesCountProp || 0);

  // ✅ لو الأب مبعتش portfolioId، السايدبار بيجيبه بنفسه (بنفس أسلوب Header.tsx)
  useEffect(() => {
    if (portfolioIdProp) {
      setPortfolioId(portfolioIdProp);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/portfolio", { credentials: "include" });
        const data = await res.json();
        const portfolioObj =
          data.portfolio ?? data.data ?? (Array.isArray(data.portfolios) ? data.portfolios[0] : null);
        const id = portfolioObj?._id ?? portfolioObj?.id ?? null;
        if (!cancelled) setPortfolioId(id);
      } catch {
        if (!cancelled) setPortfolioId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [portfolioIdProp]);

  // ✅ لو الأب مبعتش عدد الرسائل، السايدبار بيجيبه بنفسه
  useEffect(() => {
    if (messagesCountProp !== undefined) {
      setMessagesCount(messagesCountProp);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/guest/messages?limit=1", { credentials: "include" });
        const data = await res.json();
        if (!cancelled) setMessagesCount(data?.pagination?.total || 0);
      } catch {
        if (!cancelled) setMessagesCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [messagesCountProp]);

  const navigationItems: NavigationItem[] = [
    {
      name: "Home",
      nameAr: "الرئيسية",
      href: "/",
      icon: Home,
      activeGradient: "linear-gradient(135deg, #004d59, #ff6437)",
      exact: true,
    },
    {
      name: "Dashboard",
      nameAr: "لوحة التحكم",
      href: "/guest",
      icon: LayoutDashboard,
      activeGradient: "linear-gradient(135deg, #004d59, #ff6700)",
      exact: true,
    },
    {
      name: "My Portfolio",
      nameAr: "بورتفليو",
      href: portfolioId ? `/portfolio/${portfolioId}` : "/portfolio/builder",
      icon: UserCircle,
      activeGradient: "linear-gradient(135deg, #ff6700, #f67d00)",
    },
    {
      name: "Edit Portfolio",
      nameAr: "تعديل البورتفليو",
      href: "/portfolio/builder",
      icon: Edit3,
      activeGradient: "linear-gradient(135deg, #004d59, #feaf00)",
    },
    {
      name: "Messages",
      nameAr: "الرسائل",
      href: "/guest/messages",
      icon: MessageSquare,
      activeGradient: "linear-gradient(135deg, #ff6437, #ff6700)",
      badge: messagesCount,
    },
  ];

  const isActive = (item: NavigationItem): boolean => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  const getUserInitial = (): string => {
    if (user?.name && user.name.length > 0) return user.name.charAt(0).toUpperCase();
    return isRTL ? "ز" : "G";
  };

  const getUserName = (): string => user?.name || (isRTL ? "زائر" : "Guest");

  return (
    <aside
      dir={isRTL ? "rtl" : "ltr"}
      className={`
        h-full flex flex-col flex-shrink-0 sticky top-0
        transition-all duration-300 ease-in-out
        ${isCollapsed ? "w-20" : "w-64"}
        bg-white border-l border-gray-200
        dark:bg-[#161b22] dark:border-[#30363d]
      `}
    >
      {/* ── Logo ── */}
      <div className="p-6 border-b border-gray-200 dark:border-[#30363d]">
        <Link href="/" className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
            style={{
              background: "linear-gradient(135deg, #004d59, #ff6700)",
              boxShadow: "0 4px 14px #ff670030",
            }}
          >
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span
                className="text-lg font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #004d59, #ff6700)" }}
              >
                Code School
              </span>
              <span className="text-xs text-gray-500 dark:text-[#8b949e]">
                {isRTL ? "بوابة الزائر" : "Guest Portal"}
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
            const active = isActive(item);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group relative flex items-center gap-3 px-3 py-3 rounded-xl
                  transition-all duration-200
                  ${isCollapsed ? "justify-center" : ""}
                  ${
                    active
                      ? "text-white shadow-lg"
                      : `text-gray-600 dark:text-[#8b949e]
                         hover:bg-gray-100 dark:hover:bg-[#21262d]
                         hover:text-gray-900 dark:hover:text-[#e6edf3]`
                  }
                `}
                style={active ? { background: item.activeGradient } : {}}
                aria-current={active ? "page" : undefined}
              >
                <div
                  className={`
                    w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                    transition-all duration-200
                    ${active ? "bg-white/20" : "bg-gray-100 dark:bg-[#21262d] group-hover:scale-110"}
                  `}
                >
                  <Icon
                    className={`w-5 h-5 transition-colors duration-200 ${
                      active ? "text-white" : "text-gray-600 dark:text-[#8b949e]"
                    }`}
                  />
                </div>

                {!isCollapsed && (
                  <>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {isRTL ? item.nameAr : item.name}
                      </span>
                      {!!item.badge && item.badge > 0 && (
                        <span
                          className="px-2 py-0.5 text-xs font-bold rounded-full text-white"
                          style={
                            active
                              ? { background: "rgba(255,255,255,0.3)" }
                              : { background: "linear-gradient(135deg, #ff6700, #f67d00)" }
                          }
                        >
                          {item.badge > 99 ? "99+" : item.badge}
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
                      absolute ${isRTL ? "left-full ml-2" : "right-full mr-2"} px-3 py-2
                      bg-[#161b22] border border-[#30363d]
                      text-[#e6edf3] text-sm rounded-lg
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible
                      transition-all duration-200 whitespace-nowrap shadow-xl z-50
                    `}
                  >
                    {isRTL ? item.nameAr : item.name}
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 ${
                        isRTL ? "right-full" : "left-full"
                      } border-8 border-transparent ${
                        isRTL ? "border-r-[#30363d]" : "border-l-[#30363d]"
                      }`}
                    />
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
            border
            ${isCollapsed ? "justify-center" : ""}
          `}
          style={{
            background: "linear-gradient(135deg, #004d5908, #ff670008)",
            borderColor: "#004d5920",
          }}
        >
          <div className="relative flex-shrink-0">
            {user?.image ? (
              <img
                src={user.image}
                alt={getUserName()}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-[#161b22] shadow-lg"
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
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ring-2 ring-white dark:ring-[#161b22] shadow-lg"
                style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}
              >
                {getUserInitial()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#161b22]" />
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-[#e6edf3] truncate">
                {getUserName()}
              </p>
              <p className="text-xs font-bold" style={{ color: "#ff6700" }}>
                {isRTL ? "زائر" : "Guest"}
              </p>
            </div>
          )}

          {!isCollapsed && (
            <button
              onClick={onLogout}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 dark:text-[#8b949e] hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title={isRTL ? "تسجيل الخروج" : "Logout"}
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
            transition-all duration-200 flex items-center justify-center gap-2
            border border-transparent dark:border-[#30363d]
            group
          "
        >
          {isRTL ? (
            <ChevronRight
              className={`w-4 h-4 transition-transform duration-300 group-hover:text-[#ff6700] ${isCollapsed ? "" : "rotate-180"}`}
            />
          ) : (
            <ChevronLeft
              className={`w-4 h-4 transition-transform duration-300 group-hover:text-[#ff6700] ${isCollapsed ? "rotate-180" : ""}`}
            />
          )}
          {!isCollapsed && (
            <span className="text-xs font-medium group-hover:text-[#ff6700] transition-colors">
              {isCollapsed ? (isRTL ? "توسيع" : "Expand") : (isRTL ? "طي" : "Collapse")}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}