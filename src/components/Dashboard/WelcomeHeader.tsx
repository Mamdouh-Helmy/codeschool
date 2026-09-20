// components/Dashboard/WelcomeHeader.tsx
"use client";
import { Icon } from "@iconify/react";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  userName: string;
  userRole?: string;
  userImage?: string | null;
  stats: {
    totalStudents: number;
    activeGroups: number;
    overdueInvoices: number;
    monthlyRevenue: number;
  };
  locale?: "ar" | "en";
};

const ACCENT_MAP = {
  primary: "text-[#ff6700]",
  emerald: "text-emerald-400",
  amber: "text-[#feaf00]",
  red: "text-red-400",
} as const;

const WelcomeHeader = ({ userName, userRole = "admin", userImage, stats, locale = "en" }: Props) => {
  const { t } = useI18n();
  const initials = userName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const firstName = userName.split(" ")[0];
  const roleLabel = t(`common.${userRole}`) || userRole;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-[#004d59] via-[#00586a] to-[#002a33] p-5 shadow-lg dark:border-dark_border sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#ff6700]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-[#feaf00]/10 blur-3xl" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            {userImage ? (
              <img
                src={userImage}
                alt={userName}
                className="h-14 w-14 rounded-xl border border-white/20 object-cover shadow-md sm:h-16 sm:w-16"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6700] to-[#feaf00] text-lg font-bold text-white shadow-md sm:h-16 sm:w-16 sm:text-xl">
                {initials}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#004d59] bg-emerald-500">
              <Icon icon="ion:checkmark" className="h-2 w-2 text-white" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              {t("dashboard.liveData")}
            </div>
            <h1 className="mt-0.5 text-xl font-bold leading-tight text-white sm:text-2xl">
              {t("dashboard.welcomeBack")}، {firstName} 👋
            </h1>
            <p className="mt-0.5 text-xs font-medium text-white/60">{roleLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <QuickStat
            icon="ion:people-outline"
            label={t("dashboard.totalStudents")}
            value={stats.totalStudents.toLocaleString()}
            accent="primary"
          />
          <QuickStat
            icon="ion:albums-outline"
            label={t("dashboard.activeGroups")}
            value={stats.activeGroups.toLocaleString()}
            accent="emerald"
          />
          <QuickStat
            icon="ion:cash-outline"
            label={t("dashboard.monthlyRevenue")}
            value={`${(stats.monthlyRevenue / 1000).toFixed(1)}k`}
            accent="amber"
          />
          <QuickStat
            icon="ion:alert-circle-outline"
            label={t("dashboard.overdueInvoices")}
            value={String(stats.overdueInvoices)}
            accent={stats.overdueInvoices > 0 ? "red" : "emerald"}
          />
        </div>
      </div>
    </section>
  );
};

const QuickStat = ({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent: keyof typeof ACCENT_MAP;
}) => (
  <div className="flex min-w-0 flex-col gap-0.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 backdrop-blur-sm">
    <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-white/50">
      <Icon icon={icon} className={`h-2.5 w-2.5 ${ACCENT_MAP[accent]}`} />
      <span className="truncate">{label}</span>
    </div>
    <span className={`text-base font-bold ${ACCENT_MAP[accent]}`}>{value}</span>
  </div>
);

export default WelcomeHeader;