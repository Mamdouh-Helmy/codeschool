// components/Dashboard/TopBar.tsx
"use client";

import { Icon } from "@iconify/react";
import ThemeToggler from "@/components/Layout/Header/ThemeToggler";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

type TopBarProps = {
  onMenuClick: () => void;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    image?: string | null;
  } | null;
};

const TopBar = ({ onMenuClick, user: serverUser }: TopBarProps) => {
  const { data: session } = useSession();
  // if server passed user use it, otherwise fallback to session
  const [user, setUser] = useState<{
    name?: string;
    role?: string;
    image?: string | null;
  } | null>(
    serverUser
      ? {
          name: serverUser.name,
          role: serverUser.role,
          image: serverUser.image ?? null,
        }
      : null
  );

  useEffect(() => {
    if (serverUser) {
      setUser({
        name: serverUser.name,
        role: serverUser.role,
        image: serverUser.image ?? null,
      });
    } else if (session?.user) {
      setUser({
        name: session.user.name as string,
        role: (session as any).user?.role || "user",
        image: session.user.image || null,
      });
    }
  }, [serverUser, session]);

  const displayName = user?.name || "User";
  const role = user?.role || "guest";

  const initials = displayName
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    try {
      if (typeof window !== "undefined") {
        await fetch("/api/auth/logout", {
          method: "POST",
        });

        localStorage.removeItem("token");
      }
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      console.error("Error during sign out:", err);
      try {
        await signOut({ callbackUrl: "/" });
      } catch {}
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-dark_border dark:bg-darklight/80">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary lg:hidden dark:border-dark_border dark:text-darktext dark:hover:bg-darkmode"
            aria-label="Open navigation"
          >
            <Icon icon="ion:menu" className="h-6 w-6" />
          </button>
          <div className="hidden max-w-md flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm sm:flex dark:border-dark_border dark:bg-darkmode">
            <Icon icon="ion:search" className="h-5 w-5 text-slate-400" />
            <input
              type="search"
              placeholder="Search reports, users, or events"
              className="w-full border-none bg-transparent text-sm text-slate-600 outline-none dark:text-white"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-dark_border dark:bg-darkmode">
            <Icon icon="ion:calendar" className="h-5 w-5 text-primary" />
            <span className="hidden text-slate-600 dark:text-white sm:inline">
              Schedule review
            </span>
          </div>
          <ThemeToggler />
          <button
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary dark:border-dark_border dark:text-darktext dark:hover:bg-darkmode"
            aria-label="View notifications"
          >
            <Icon icon="ion:notifications-outline" className="h-5 w-5" />
            <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </button>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-dark_border dark:bg-darkmode">
            {user?.image ? (
              <img
                src={user.image || ""}
                alt="avatar"
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initials}
              </div>
            )}
            <div className="hidden text-left text-xs sm:block">
              <p className="font-medium text-slate-700 dark:text-white">
                {displayName}
              </p>
              <p className="text-slate-400">{role}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="ml-2 text-xs text-red-500 hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
