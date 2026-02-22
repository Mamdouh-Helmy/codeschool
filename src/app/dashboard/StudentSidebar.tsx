"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  Calendar,
  BookOpen,
  Settings,
  ChevronLeft,
  GraduationCap,
  LogOut,
} from "lucide-react";

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

// ============ Component ============
export default function StudentSidebar({ 
  user = null, 
  onLogout = () => {} 
}: StudentSidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const navigationItems: NavigationItem[] = [
    {
      name: "Dashboard",
      nameAr: "لوحة التحكم",
      href: "/dashboard/student",
      icon: LayoutDashboard,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      name: "Courses",
      nameAr: "الدورات",
      href: "/dashboard/courses",
      icon: BookOpen,
      gradient: "from-purple-400 to-pink-400",
    },
    {
      name: "Schedule",
      nameAr: "الجدول",
      href: "/dashboard/schedule",
      icon: Calendar,
      gradient: "from-pink-400 to-rose-400",
    },
    {
      name: "Documents",
      nameAr: "المستندات",
      href: "/dashboard/documents",
      icon: FileText,
      gradient: "from-green-400 to-emerald-400",
    },
    {
      name: "Messages",
      nameAr: "الرسائل",
      href: "/dashboard/messages",
      icon: MessageSquare,
      gradient: "from-blue-400 to-indigo-400",
      badge: 3,
    },
    {
      name: "Settings",
      nameAr: "الإعدادات",
      href: "/dashboard/settings",
      icon: Settings,
      gradient: "from-gray-400 to-slate-400",
    },
  ];

  const isActive = (href: string): boolean => pathname === href;

  const getUserInitial = (): string => {
    if (user?.name && typeof user.name === 'string' && user.name.length > 0) {
      return user.name.charAt(0).toUpperCase();
    }
    return "S";
  };

  const getUserName = (): string => {
    if (user?.name && typeof user.name === 'string') {
      return user.name;
    }
    return "Student";
  };

  const getUserEmail = (): string => {
    if (user?.email && typeof user.email === 'string') {
      return user.email;
    }
    return "student@example.com";
  };

  return (
    <aside
      className={`
        h-full bg-white dark:bg-secondary
        border-l border-gray-200 dark:border-dark_border
        transition-all duration-300 ease-in-out
        ${isCollapsed ? "w-20" : "w-64"}
        flex flex-col flex-shrink-0
        sticky top-0
      `}
    >
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200 dark:border-dark_border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                Code School
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Learning Platform
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Items */}
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
                  ${
                    active
                      ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg`
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-darklight"
                  }
                  ${isCollapsed ? "justify-center" : ""}
                `}
              >
                {/* Icon Container */}
                <div
                  className={`
                  w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                  transition-all duration-200
                  ${
                    active
                      ? "bg-white/20"
                      : "bg-gray-100 dark:bg-darklight group-hover:scale-110"
                  }
                `}
                >
                  <Icon
                    className={`
                    w-5 h-5 transition-colors duration-200
                    ${active ? "text-white" : "text-gray-600 dark:text-gray-300"}
                  `}
                  />
                </div>

                {/* Text & Badge */}
                {!isCollapsed && (
                  <>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="font-medium text-sm">{item.name}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`
                          px-2 py-0.5 text-xs font-bold rounded-full
                          ${
                            active
                              ? "bg-white/30 text-white"
                              : "bg-primary text-white"
                          }
                        `}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>

                    {/* Arrow for active state */}
                    {active && (
                      <ChevronLeft className="w-4 h-4 text-white animate-pulse" />
                    )}
                  </>
                )}

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <>
                    <div
                      className="
                      absolute right-full ml-2 px-3 py-2 bg-gray-900 dark:bg-darklight
                      text-white dark:text-gray-200 text-sm rounded-lg
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible
                      transition-all duration-200 whitespace-nowrap
                      shadow-xl z-50
                    "
                    >
                      {item.name}
                      <div className="absolute left-full top-1/2 -translate-y-1/2 border-8 border-transparent border-l-gray-900 dark:border-l-darklight"></div>
                    </div>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-gray-200 dark:border-dark_border p-4">
        <div
          className={`
          flex items-center gap-3 p-3 rounded-xl
          bg-gradient-to-br from-gray-50 to-gray-100 
          dark:from-darklight dark:to-dark_input
          ${isCollapsed ? "justify-center" : ""}
        `}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-white dark:ring-secondary shadow-lg">
              {getUserInitial()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-secondary"></div>
          </div>

          {/* User Info */}
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {getUserName()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {getUserEmail()}
              </p>
            </div>
          )}

          {/* Logout Button */}
          {!isCollapsed && (
            <button
              onClick={onLogout}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Logout"
              aria-label="Logout"
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
            bg-gray-100 dark:bg-darklight
            hover:bg-gray-200 dark:hover:bg-dark_input
            text-gray-600 dark:text-gray-400
            transition-colors flex items-center justify-center gap-2
          "
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform duration-300 ${
              isCollapsed ? "rotate-180" : ""
            }`}
          />
          {!isCollapsed && (
            <span className="text-xs font-medium">Collapse</span>
          )}
        </button>
      </div>
    </aside>
  );
}