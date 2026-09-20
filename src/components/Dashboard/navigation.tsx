// components/Dashboard/navigation.tsx
"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useI18n } from "@/i18n/I18nProvider";

export type DashboardNavItem = {
  label: string;
  href: string;
  icon: string;
  badge?: ReactNode;
};

export type CategoryItem = {
  id: string;
  label: string;
  icon: string;
  items: DashboardNavItem[];
};

/** Shared link used by the desktop panel and the mobile drawer. */
export const NavLink = ({
  item,
  active,
  onNavigate,
}: {
  item: DashboardNavItem;
  active: boolean;
  onNavigate?: () => void;
}) => (
  <Link
    href={item.href}
    onClick={onNavigate}
    aria-current={active ? "page" : undefined}
    className={`group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      active
        ? "bg-primary/10 text-primary"
        : "text-SlateBlueText hover:bg-slate-100 hover:text-primary dark:text-darktext dark:hover:bg-darkmode"
    }`}
  >
    <span className="flex min-w-0 items-center gap-3">
      <Icon icon={item.icon} className="h-5 w-5 shrink-0" />
      <span className="truncate">{item.label}</span>
    </span>
    {item.badge}
  </Link>
);

/**
 * Admin navigation — 7 isolated domains (PRD v2.0 §5).
 * `isNew` (last arg) = page introduced by V2 → shows the "New" badge.
 */
export const useAdminNavigation = () => {
  const { t } = useI18n();

  return useMemo(() => {
    const tr = (key: string, fallback: string) => t(key) || fallback;

    const item = (
      key: string,
      fallback: string,
      href: string,
      icon: string,
      isNew = false
    ): DashboardNavItem => ({
      label: tr(key, fallback),
      href,
      icon,
      badge: isNew ? (
        <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
          {tr("common.new", "New")}
        </span>
      ) : undefined,
    });

    const home = item("dashboard.overview", "Overview", "/admin", "ion:speedometer-outline");

    const categories: CategoryItem[] = [
      {
        id: "cms",
        label: tr("dashboard.catCms", "Website & CMS"),
        icon: "ion:globe-outline",
        items: [
          item("dashboard.webinars", "Webinars", "/admin/webinars", "ion:videocam-outline"),
          item("dashboard.events", "Events", "/admin/events", "ion:calendar-outline"),
          item("dashboard.blogs", "Blogs", "/admin/blogs", "ion:newspaper-outline"),
          item("dashboard.sectionImages", "Section Images", "/admin/sectionImages", "ion:images-outline"),
          item("dashboard.sectionImagesHero", "Hero Images", "/admin/sectionImagesHero", "ion:image-outline"),
          item("dashboard.sectionGuestPopup", "Guest Popup", "/admin/sectionGuestPopup", "ion:sparkles-outline"),
          item("dashboard.testimonials", "Testimonials", "/admin/Testimonials", "ion:chatbubbles-outline"),
          item("dashboard.projects", "Projects Showcase", "/admin/projects", "ion:briefcase-outline"),
        ],
      },
      {
        id: "academic",
        label: tr("dashboard.catAcademic", "Academic Operations"),
        icon: "ion:school-outline",
        items: [
          item("dashboard.groups", "Groups", "/admin/groups", "ion:people-outline"),
          item("dashboard.courses", "Courses", "/admin/courses", "ion:book-outline"),
          item("nav.curriculum", "Curriculum", "/admin/curriculum", "ion:library-outline"),
          item("dashboard.Schedules", "Schedules", "/admin/schedules", "ion:time-outline"),
          item("dashboard.rescheduleRequests", "Reschedule Requests", "/admin/reschedule-requests", "ion:swap-horizontal-outline"),
          item("nav.meetingLink", "Meeting Link", "/admin/meetingLinkAdmin", "ion:link-outline"),
          item("dashboard.certificates", "Certificates", "/admin/certificates", "ion:ribbon-outline"),
        ],
      },
      {
        id: "ops",
        label: tr("dashboard.catOps", "Operations & Comms"),
        icon: "ion:pulse-outline",
        items: [
          item("dashboard.suspensionAlerts", "Pending Suspension Alerts", "/admin/billing-alerts", "ion:alert-circle-outline"),
          item("dashboard.contacts", "Contacts", "/admin/ContactsPage", "ion:chatbubble-ellipses-outline"),
          item("dashboard.whatsappTemplates", "WhatsApp Templates", "/admin/whatsapp-templates", "ion:logo-whatsapp"),
          item("dashboard.portfolioBroadcast", "Portfolio Broadcast", "/admin/portfolio-broadcast", "ion:megaphone-outline"),
          item("dashboard.portfolioInactivity", "Portfolio Reminders", "/admin/portfolio-inactivity", "ion:notifications-outline"),
        ],
      },
      {
        id: "users",
        label: tr("dashboard.catUsers", "Users Management"),
        icon: "ion:people-circle-outline",
        items: [
          item("dashboard.allUsers", "All Users", "/admin/users", "ion:people-circle-outline"),
          item("dashboard.students", "Students & Parents", "/admin/allStudents", "ion:school-outline"),
          item("dashboard.instructors", "Instructors", "/admin/InstructorsPage", "ion:person-circle-outline"),
          item("dashboard.Admin", "Admins & Staff", "/admin/AdminPage", "ion:shield-checkmark-outline"),
          item("dashboard.Marketing", "Marketing Team", "/admin/MarketingPage", "ion:megaphone-outline"),
          item("dashboard.guests", "Guests", "/admin/guests", "ion:person-outline"),
        ],
      },
      {
        id: "finance",
        label: tr("dashboard.catFinance", "Finance & Billing"),
        icon: "ion:wallet-outline",
        items: [
         
          item("nav.subscriptions", "Subscriptions", "/admin/subscriptions", "ion:card-outline"),
          item("nav.pricing", "Pricing", "/admin/pricing", "ion:cash-outline"),
          item("dashboard.packagePlans", "Hour Packages", "/admin/package-plans", "ion:pricetags-outline"),
          item("dashboard.financialReports", "Financial Reports", "/admin/overview", "ion:bar-chart-outline"),
          item("dashboard.instructorRates", "Instructor Rates", "/admin/instructor-rates", "ion:stopwatch-outline"),
          item("dashboard.payroll", "Teacher Payroll Ledgers", "/admin/payroll", "ion:documents-outline"),
        ],
      },
      {
        id: "marketing",
        label: tr("dashboard.catMarketing", "Marketing & Growth"),
        icon: "ion:trending-up-outline",
        items: [
          item("nav.referralSources", "Referral Sources", "/admin/referral-sources", "ion:git-branch-outline"),
          item("nav.newsletter", "Newsletter", "/admin/newsletter", "ion:mail-outline"),
          item("nav.blogSubscribers", "Blog Subscribers", "/admin/blogSubscribers", "ion:mail-unread-outline"),
        ],
      },
      {
        id: "system",
        label: tr("dashboard.catSystem", "System Settings"),
        icon: "ion:settings-outline",
        items: [
          item("nav.settings", "General Settings", "/admin/settings", "ion:settings-outline"),
          item("nav.homepage", "Back to Website", "/", "ion:home-outline"),
        ],
      },
    ];

    return { home, categories };
  }, [t]);
};