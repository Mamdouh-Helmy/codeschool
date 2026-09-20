// components/Dashboard/ActivityTimeline.tsx
"use client";
import { Icon } from "@iconify/react";

export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  tone: "success" | "info" | "warning" | "error";
};

const toneMap: Record<ActivityItem["tone"], { bg: string; ring: string; text: string }> = {
  success: { bg: "bg-emerald-500", ring: "ring-emerald-500/20", text: "text-emerald-600" },
  info: { bg: "bg-[#004d59]", ring: "ring-[#004d59]/20", text: "text-[#004d59] dark:text-[#00a3b8]" },
  warning: { bg: "bg-[#feaf00]", ring: "ring-[#feaf00]/25", text: "text-[#a67c00]" },
  error: { bg: "bg-red-500", ring: "ring-red-500/20", text: "text-red-600" },
};

const ActivityTimeline = ({
  items,
  locale = "en",
}: {
  items: ActivityItem[];
  locale?: "ar" | "en";
}) => {
  return (
    <section className="relative flex h-full min-h-[400px] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-dark_border dark:bg-darklight">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#004d59]/10 text-[#004d59] dark:text-[#00a3b8]">
            <Icon icon="ion:pulse-outline" className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-MidnightNavyText dark:text-white">
              {locale === "ar" ? "الأنشطة المباشرة" : "Live Activity"}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-darktext">
              {locale === "ar" ? "أحدث الأحداث" : "Recent events"}
            </p>
          </div>
        </div>

        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          LIVE
        </span>
      </header>

      <div className="relative mt-4 flex-1 overflow-y-auto pe-1">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[13px] text-slate-400 dark:text-darktext">
            {locale === "ar" ? "لا يوجد نشاط حديث" : "No recent activity"}
          </div>
        ) : (
          <ul className="relative space-y-3.5">
            <div className="absolute bottom-2 start-[15px] top-2 w-px bg-gradient-to-b from-slate-200 via-slate-100 to-transparent dark:from-dark_border dark:via-dark_border" />

            {items.map((item) => {
              const tone = toneMap[item.tone];
              return (
                <li key={item.id} className="relative flex gap-3">
                  <span
                    className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ${tone.bg} ${tone.ring}`}
                  >
                    <Icon icon={item.icon} className="h-3.5 w-3.5 text-white" />
                  </span>

                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[13px] font-bold leading-snug text-MidnightNavyText dark:text-white">
                      {item.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500 dark:text-darktext">
                      {item.description}
                    </p>
                    <p className={`mt-0.5 text-[10px] font-bold uppercase tracking-wider ${tone.text}`}>
                      {item.timestamp}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

export default ActivityTimeline;