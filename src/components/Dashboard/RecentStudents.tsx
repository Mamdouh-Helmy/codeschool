// components/Dashboard/RecentStudents.tsx
"use client";
import { Icon } from "@iconify/react";

type Status = "active" | "pending" | "trial";

export type EnrollmentRecord = {
  id: string;
  name: string;
  email: string;
  course: string;
  progress: number;
  enrolledOn: string;
  status: Status;
};

const statusMeta: Record<Status, { ar: string; en: string; cls: string; dot: string }> = {
  active: {
    ar: "نشط",
    en: "Active",
    cls: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
    dot: "bg-emerald-500",
  },
  pending: {
    ar: "قيد الانتظار",
    en: "Pending",
    cls: "bg-[#feaf00]/15 text-[#a67c00] ring-[#feaf00]/25",
    dot: "bg-[#feaf00]",
  },
  trial: {
    ar: "تجريبي",
    en: "Trial",
    cls: "bg-sky-500/10 text-sky-600 ring-sky-500/20",
    dot: "bg-sky-500",
  },
};

const RecentStudents = ({
  records,
  locale = "en",
}: {
  records: EnrollmentRecord[];
  locale?: "ar" | "en";
}) => {
  return (
    <section className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-dark_border dark:bg-darklight">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff6700]/10 text-[#ff6700]">
            <Icon icon="ion:person-add-outline" className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-MidnightNavyText dark:text-white">
              {locale === "ar" ? "أحدث التسجيلات" : "Recent Enrollments"}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-darktext">
              {locale === "ar" ? "آخر الطلاب المنضمين" : "Latest students"}
            </p>
          </div>
        </div>
      </header>

      {records.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-12 text-[13px] text-slate-400 dark:text-darktext">
          {locale === "ar" ? "لا يوجد تسجيلات بعد" : "No enrollments yet"}
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((r) => {
            const meta = statusMeta[r.status];
            return (
              <li
                key={r.id}
                className="group relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50/30 p-3.5 transition-all hover:border-slate-200 hover:bg-white hover:shadow-md dark:border-dark_border dark:bg-darkmode dark:hover:bg-darklight"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6700] to-[#feaf00] text-[11px] font-bold text-white shadow-sm">
                      {r.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-bold text-MidnightNavyText dark:text-white">
                        {r.name}
                      </p>
                      <p className="truncate text-[10px] text-slate-400 dark:text-darktext">
                        {r.email}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${meta.cls}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    {locale === "ar" ? meta.ar : meta.en}
                  </span>
                </div>

                <div className="mt-2.5 rounded-lg bg-white px-2.5 py-1.5 dark:bg-darklight">
                  <p className="truncate text-[11px] font-semibold text-slate-600 dark:text-darktext">
                    <Icon icon="ion:book-outline" className="me-1 inline h-3 w-3" />
                    {r.course}
                  </p>
                </div>

                <div className="mt-2.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-slate-500 dark:text-darktext">
                      {locale === "ar" ? "التقدم" : "Progress"}
                    </span>
                    <span className="font-bold text-MidnightNavyText dark:text-white">
                      {r.progress}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-darklight">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#ff6700] to-[#feaf00] transition-all duration-700"
                      style={{ width: `${r.progress}%` }}
                    />
                  </div>
                </div>

                <p className="mt-2.5 text-[10px] font-bold text-slate-400 dark:text-darktext">
                  <Icon icon="ion:calendar-outline" className="me-1 inline h-3 w-3" />
                  {r.enrolledOn}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default RecentStudents;