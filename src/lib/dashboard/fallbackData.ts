import { formatISO } from "date-fns";
import type { DashboardSnapshot, ScheduleResponse } from "./types";

export const FALLBACK_DASHBOARD_SNAPSHOT: DashboardSnapshot = {
  metrics: [
    {
      label: "Active students",
      value: "1,284",
      icon: "ion:people",
      sublabel: "Across all cohorts",
      trend: {
        value: "+12.5%",
        isPositive: true,
        description: "vs. previous month",
      },
    },
    {
      label: "Course completion",
      value: "87%",
      icon: "ion:book-outline",
      sublabel: "Average across programs",
      trend: {
        value: "+4.2%",
        isPositive: true,
        description: "Higher than industry benchmark",
      },
    },
    {
      label: "Support tickets",
      value: "36",
      icon: "ion:chatbubbles-outline",
      sublabel: "Open this week",
      trend: {
        value: "-18%",
        isPositive: true,
        description: "Resolution time improving",
      },
    },
    {
      label: "Monthly revenue",
      value: "$42.7K",
      icon: "ion:trending-up-outline",
      sublabel: "Subscriptions and upsells",
      trend: {
        value: "+9.8%",
        isPositive: true,
        description: "Recurring vs. new purchases",
      },
    },
  ],
  performance: {
    title: "Learning engagement",
    description: "Monthly completion volume across all active tracks.",
    goalLabel: "Quarterly target",
    goalValue: "8% increase in completion hours",
    points: [
      { label: "Jan", value: 320 },
      { label: "Feb", value: 410 },
      { label: "Mar", value: 460 },
      { label: "Apr", value: 520 },
      { label: "May", value: 610 },
      { label: "Jun", value: 670 },
    ],
  },
  activities: [
    {
      id: "activity-1",
      title: "New workshop published",
      description:
        "Design Team scheduled a Figma prototyping live session for June 21.",
      timestamp: "2 hours ago",
      icon: "ion:color-wand-outline",
      tone: "info",
    },
    {
      id: "activity-2",
      title: "Instructor feedback received",
      description: "Michael Chen rated cohort B with 4.8 satisfaction score.",
      timestamp: "4 hours ago",
      icon: "ion:chatbox-ellipses-outline",
      tone: "success",
    },
    {
      id: "activity-3",
      title: "Enrollment surge",
      description:
        "45 students joined within the past 24 hours thanks to the referral campaign.",
      timestamp: "Yesterday",
      icon: "ion:flash-outline",
      tone: "success",
    },
    {
      id: "activity-4",
      title: "Payment review",
      description: "Finance flagged 3 invoices for manual verification.",
      timestamp: "2 days ago",
      icon: "ion:shield-checkmark-outline",
      tone: "warning",
    },
  ],
  enrollments: [
    {
      id: "enroll-1",
      name: "Melissa Carter",
      email: "melissa.carter@example.com",
      course: "Advanced React Patterns",
      progress: 72,
      enrolledOn: "May 14, 2024",
      status: "active",
    },
    {
      id: "enroll-2",
      name: "Diego Hernández",
      email: "diego.h@example.com",
      course: "Product Design Foundations",
      progress: 38,
      enrolledOn: "May 12, 2024",
      status: "trial",
    },
    {
      id: "enroll-3",
      name: "Aisha Patel",
      email: "aisha.patel@example.com",
      course: "AI for Educators",
      progress: 15,
      enrolledOn: "May 11, 2024",
      status: "pending",
    },
    {
      id: "enroll-4",
      name: "Noah Williams",
      email: "noah.williams@example.com",
      course: "Full-stack Bootcamp",
      progress: 85,
      enrolledOn: "May 09, 2024",
      status: "active",
    },
    {
      id: "enroll-5",
      name: "Sofia Martins",
      email: "sofia.martins@example.com",
      course: "Data Storytelling",
      progress: 52,
      enrolledOn: "May 08, 2024",
      status: "trial",
    },
  ],
  content: {
    stats: [
      {
        label: "Published blog posts",
        value: "86",
        change: "+6 this month",
        isPositive: true,
        icon: "ion:document-text-outline",
      },
      {
        label: "Curriculum updates",
        value: "14",
        change: "-1 week over week",
        isPositive: false,
        icon: "ion:construct-outline",
      },
      {
        label: "Documentation views",
        value: "48K",
        change: "+22% engagement",
        isPositive: true,
        icon: "ion:stats-chart-outline",
      },
    ],
    actions: [
      {
        label: "Plan next content sprint",
        description: "Review backlog",
        href: "/admin/content",
      },
      {
        label: "Approve guest article submissions",
        description: "5 pending",
        href: "/admin/content",
      },
      {
        label: "Sync with marketing calendar",
        description: "Update schedule",
        href: "/admin/events",
      },
    ],
  },
  health: [
    {
      title: "Cohort health",
      value: "94%",
      description: "Learners completing weekly goals on time.",
      accent:
        "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
    },
    {
      title: "Instructor capacity",
      value: "78%",
      description: "Availability across upcoming sessions.",
      accent: "bg-primary/10 text-primary",
    },
    {
      title: "Support satisfaction",
      value: "4.7/5",
      description: "Average rating from resolved tickets.",
      accent:
        "bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-300",
    },
  ],
  updatedAt: formatISO(new Date("2024-05-14T10:00:00Z")),
};

export const FALLBACK_SCHEDULE_RESPONSE: ScheduleResponse = {
  events: [
    { id: "16-jun-2024", day: 16, month: "JUN", year: 2024 },
    { id: "17-jan-2024", day: 17, month: "JAN", year: 2024 },
    { id: "18-feb-2024", day: 18, month: "FEB", year: 2024 },
    { id: "19-apr-2024", day: 19, month: "APR", year: 2024 },
    { id: "20-may-2024", day: 20, month: "MAY", year: 2024 },
    { id: "21-aug-2024", day: 21, month: "AUG", year: 2024 },
    { id: "22-sep-2024", day: 22, month: "SEP", year: 2024 },
    { id: "23-nov-2024", day: 23, month: "NOV", year: 2024 },
    { id: "24-dec-2024", day: 24, month: "DEC", year: 2024 },
  ],
  updatedAt: formatISO(new Date("2024-05-10T08:00:00Z")),
};
