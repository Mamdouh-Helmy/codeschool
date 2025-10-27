// RecentEnrollmentsTable.tsx
"use client";
import { useI18n } from "@/i18n/I18nProvider";

type EnrollmentStatus = "active" | "pending" | "trial";

export type EnrollmentRecord = {
  id: string;
  name: string;
  email: string;
  course: string;
  progress: number;
  enrolledOn: string;
  status: EnrollmentStatus;
};

type RecentEnrollmentsTableProps = {
  records: EnrollmentRecord[];
};

const statusConfig: Record<EnrollmentStatus, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  pending: {
    label: "Pending",
    className: "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-300",
  },
  trial: {
    label: "Trial",
    className: "bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300",
  },
};

const RecentEnrollmentsTable = ({ records }: RecentEnrollmentsTableProps) => {
  const { t } = useI18n();

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-dark_border dark:bg-darklight">
      <header className="border-b border-slate-200 px-4 sm:px-6 py-4 dark:border-dark_border">
        <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white">
          {t('dashboard.latestEnrollments') || 'Latest enrollments'}
        </h3>
        <p className="text-sm text-slate-500 dark:text-darktext">
          {t('dashboard.enrollmentsDescription') || 'Track the newest learners joining your programs this quarter.'}
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-dark_border">
          <thead className="bg-slate-50 dark:bg-darkmode">
            <tr>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-darktext">
                {t('dashboard.learner') || 'Learner'}
              </th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-darktext">
                {t('dashboard.course') || 'Course'}
              </th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-darktext">
                {t('dashboard.progress') || 'Progress'}
              </th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-darktext">
                {t('dashboard.enrolledOn') || 'Enrolled on'}
              </th>
              <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-darktext">
                {t('dashboard.status') || 'Status'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white dark:divide-dark_border dark:bg-darklight">
            {records.map((record) => {
              const status = statusConfig[record.status];
              return (
                <tr key={record.id} className="text-sm text-slate-600 dark:text-darktext">
                  <td className="whitespace-nowrap px-3 sm:px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-MidnightNavyText dark:text-white">{record.name}</span>
                      <span className="text-xs text-slate-400">{record.email}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 sm:px-6 py-4">
                    <span className="font-medium text-slate-600 dark:text-white">{record.course}</span>
                  </td>
                  <td className="px-3 sm:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-darkmode">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${record.progress}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs font-medium text-slate-500 dark:text-darktext">
                        {record.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 sm:px-6 py-4 text-slate-500 dark:text-darktext">
                    {record.enrolledOn}
                  </td>
                  <td className="whitespace-nowrap px-3 sm:px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default RecentEnrollmentsTable;