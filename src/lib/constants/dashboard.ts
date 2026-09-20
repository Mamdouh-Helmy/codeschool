// lib/constants/dashboard.ts
export const FLOW_COLORS = {
  lifecycle: {
    enrolled: "#004d59",
    assigned_to_group: "#007a8a",
    has_active_package: "#ff6700",
    attended_session: "#10b981",
  },
  billing: {
    pending: "#feaf00",
    escrow: "#8b5cf6",
    suspended: "#ef4444",
    paid: "#10b981",
  },
  credit: {
    zero: "#ef4444",
    critical: "#feaf00",
    low: "#ff6700",
    good: "#10b981",
  },
} as const;

export const METRIC_ACCENTS = {
  primary: {
    ring: "ring-[#ff6700]/15",
    bg: "bg-[#ff6700]/8",
    text: "text-[#ff6700]",
    bar: "from-[#ff6700] to-[#ff6437]",
  },
  secondary: {
    ring: "ring-[#004d59]/15",
    bg: "bg-[#004d59]/8",
    text: "text-[#004d59] dark:text-[#00a3b8]",
    bar: "from-[#004d59] to-[#007a8a]",
  },
  emerald: {
    ring: "ring-emerald-500/15",
    bg: "bg-emerald-500/8",
    text: "text-emerald-600",
    bar: "from-emerald-500 to-teal-500",
  },
  amber: {
    ring: "ring-[#feaf00]/15",
    bg: "bg-[#feaf00]/8",
    text: "text-[#a67c00] dark:text-[#feaf00]",
    bar: "from-[#feaf00] to-[#ff6700]",
  },
} as const;

export const SPACING = {
  sectionGap: "space-y-3",
  gridGap: "gap-3",
  cardPadding: "p-5",
  cardMinHeight: "min-h-[400px]",
  kpiMinHeight: "min-h-[140px]",
} as const;

export const CARD_BASE =
  "relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all dark:border-dark_border dark:bg-darklight";

export const CARD_HOVER =
  "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md";