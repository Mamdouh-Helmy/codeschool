"use client";
import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Upload, Plus, Edit, Trash2, Eye, EyeOff, Clock,
  Search, SlidersHorizontal, ArrowUpDown,
  LayoutGrid, List, ChevronLeft, ChevronRight,
  Image as ImageIcon, CheckCircle2, PauseCircle,
} from "lucide-react";
import Modal from "./Modal";
import SectionImagesAdminForm from "./SectionImagesAdminForm";
import { useI18n } from "@/i18n/I18nProvider";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface SectionImage {
  _id: string;
  sectionName: "ticket-section" | "event-ticket";
  imageUrl: string;
  imageAlt: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StatsData {
  total: number;
  active: number;
  inactive: number;
  recentCount: number;
  changes: Record<string, string>;
  sparklines: Record<string, number[]>;
}

type StatusFilter = "all" | "active" | "inactive";
type ViewMode = "grid" | "list";

const PAGE_SIZE = 12;

// ─────────────────────────────────────────────
// Sparkline
// ─────────────────────────────────────────────
function Sparkline({ data, color, fill }: { data: number[]; color: string; fill: string }) {
  const W = 160, H = 32;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => [
    i * (W / (data.length - 1)),
    H - ((v - min) / range) * (H - 4) - 2,
  ]);
  const line = "M" + pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L");
  const area =
    `M${pts[0][0]},${H}L` +
    pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L") +
    `L${pts[pts.length - 1][0]},${H}Z`;
  const gid = `sg${color.replace("#", "")}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-8">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="1" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatDate(iso: string, t: (k: string) => string): string {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return t("common.today") || "Today";
  if (diff === 1) return t("common.yesterday") || "Yesterday";
  if (diff < 7) return `${diff} ${t("common.daysAgo") || "days ago"}`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function badgeClass(change: string): string {
  return change.startsWith("-")
    ? "bg-red-100 text-red-600"
    : "bg-green-100 text-green-700";
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function SectionImagesAdmin() {
  const { t } = useI18n();

  const [images, setImages] = useState<SectionImage[]>([]);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SectionImage | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // ── Fetch ──
  const loadImages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/section-images?activeOnly=false", { cache: "no-store" });
      const json = await res.json();
      if (json.success) setImages(json.data);
      else toast.error(t("sectionImages.failedToLoad") || "Failed to load images");
    } catch {
      toast.error(t("sectionImages.failedToLoad") || "Failed to load images");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch("/api/section-images/stats", { cache: "no-store" });
      const json = await res.json();
      if (json.success) setStatsData(json.data);
    } catch {
      console.error("Failed to load stats");
    }
  };

  useEffect(() => {
    loadImages();
    loadStats();
  }, []);

  // ── CRUD ──
  const onSaved = async () => {
    await Promise.all([loadImages(), loadStats()]);
    toast.success(t("sectionImages.savedSuccess") || "Saved successfully");
  };

  const toggleStatus = async (id: string, current: boolean) => {
    try {
      const res = await fetch("/api/section-images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !current }),
      });
      const json = await res.json();
      if (json.success) {
        setImages(prev => prev.map(img => img._id === id ? { ...img, isActive: !current } : img));
        loadStats();
        toast.success(t("sectionImages.statusUpdated") || "Status updated");
      } else {
        toast.error(json.message || "Failed to update status");
      }
    } catch {
      toast.error(t("sectionImages.statusUpdateFailed") || "Failed to update status");
    }
  };

  const onDelete = (id: string) => {
    toast(
      ti => (
        <div className="w-80 bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-round-box">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold shrink-0">!</div>
            <div>
              <p className="text-14 font-semibold text-MidnightNavyText dark:text-white">
                {t("sectionImages.deleteConfirm") || "Delete this image?"}
              </p>
              <p className="text-13 mt-1 text-SlateBlueText dark:text-darktext">
                {t("sectionImages.deleteWarning") || "This action cannot be undone."}
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => toast.dismiss(ti.id)}
              className="px-3 py-1.5 text-13 rounded-lg bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white border border-PeriwinkleBorder/50"
            >
              {t("common.cancel") || "Cancel"}
            </button>
            <button
              onClick={async () => {
                toast.dismiss(ti.id);
                try {
                  const res = await fetch(`/api/section-images?id=${encodeURIComponent(id)}`, { method: "DELETE" });
                  if (res.ok) {
                    setImages(prev => prev.filter(p => p._id !== id));
                    loadStats();
                    toast.success(t("sectionImages.deletedSuccess") || "Image deleted");
                  } else {
                    toast.error(t("sectionImages.deleteFailed") || "Delete failed");
                  }
                } catch {
                  toast.error(t("sectionImages.deleteError") || "Error deleting image");
                }
              }}
              className="px-3 py-1.5 text-13 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {t("common.delete") || "Delete"}
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: "top-center" }
    );
  };

  // ── Derived state ──
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return images.filter(img => {
      const matchQ =
        !q ||
        img.sectionName.toLowerCase().includes(q) ||
        img.imageAlt.toLowerCase().includes(q) ||
        img.description.toLowerCase().includes(q);
      const matchS =
        statusFilter === "all" ||
        (statusFilter === "active" && img.isActive) ||
        (statusFilter === "inactive" && !img.isActive);
      return matchQ && matchS;
    });
  }, [images, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Stat cards config (driven by backend data) ──
  const statCards = statsData
    ? [
      {
        label: t("sectionImages.totalImages") || "Total Assets",
        value: statsData.total,
        valueColor: "text-secondary dark:text-white",
        badge: statsData.changes.total,
        badgeClass: badgeClass(statsData.changes.total),
        suffix: t("sectionImages.vsLastMonth") || "vs last month",
        icon: <ImageIcon className="w-4 h-4" />,
        iconClass: "bg-secondary/10 text-secondary",
        spark: statsData.sparklines.total,
        sparkColor: "#004d59",
        sparkFill: "#e8f5f8",
      },
      {
        label: t("sectionImages.activeImages") || "Active",
        value: statsData.active,
        valueColor: "text-secondary dark:text-white",
        badge: statsData.changes.active,
        badgeClass: badgeClass(statsData.changes.active),
        suffix: t("sectionImages.vsLastMonth") || "vs last month",
        icon: <CheckCircle2 className="w-4 h-4" />,
        iconClass: "bg-green-100 text-green-700",
        spark: statsData.sparklines.active,
        sparkColor: "#1a7a4a",
        sparkFill: "#e6f4ea",
      },
      {
        label: t("sectionImages.inactiveImages") || "Inactive",
        value: statsData.inactive,
        valueColor: "text-primary",
        badge: statsData.changes.inactive,
        badgeClass: badgeClass(statsData.changes.inactive),
        suffix: t("sectionImages.vsLastMonth") || "vs last month",
        icon: <PauseCircle className="w-4 h-4" />,
        iconClass: "bg-primary/10 text-primary",
        spark: statsData.sparklines.inactive,
        sparkColor: "#ff6700",
        sparkFill: "#fff0e6",
      },
      {
        label: t("sectionImages.recentlyAdded") || "Recently Added",
        value: statsData.recentCount,
        valueColor: "text-Dandelion",
        badge: statsData.changes.recent,
        badgeClass: statsData.changes.recent.startsWith("-")
          ? "bg-red-100 text-red-600"
          : "bg-yellow-100 text-yellow-700",
        suffix: t("sectionImages.thisWeek") || "this week",
        icon: <Clock className="w-4 h-4" />,
        iconClass: "bg-yellow-100 text-yellow-700",
        spark: statsData.sparklines.recent,
        sparkColor: "#e8a000",
        sparkFill: "#fff8e0",
      },
    ]
    : [];

  // ─────────────────────────────────────────────
  // Loading skeleton
  // ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center p-16">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-32 font-bold text-MidnightNavyText dark:text-white tracking-tight">
              {t("sectionImages.management") || "Section Images"}
            </h1>
            <span className="flex items-center gap-1.5 bg-white dark:bg-darklight border border-PowderBlueBorder dark:border-dark_border rounded-full px-3 py-1 text-12 font-semibold text-MidnightNavyText dark:text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-14 text-SlateBlueText dark:text-darktext">
            {statsData?.total ?? images.length}{" "}
            {t("sectionImages.totalAssetsDesc") || "total assets across"}{" "}
            {Math.min(statsData?.total ?? images.length, 18)}{" "}
            {t("sectionImages.siteSections") || "site sections"}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button className="flex items-center gap-2 bg-white dark:bg-darklight border border-PowderBlueBorder dark:border-dark_border rounded-lg px-4 py-2.5 text-14 font-medium text-MidnightNavyText dark:text-white hover:bg-PaleCyan dark:hover:bg-dark_input transition-colors">
            <Upload className="w-4 h-4" />
            {t("common.export") || "Export"}
          </button>
          <button
            onClick={() => { setEditing(null); setOpen(true); }}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white rounded-lg px-5 py-2.5 text-14 font-semibold transition-opacity shadow-brand-sm"
          >
            <Plus className="w-4 h-4" />
            {t("sectionImages.addNew") || "Add Image"}
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white dark:bg-darklight border border-PowderBlueBorder dark:border-dark_border rounded-xl p-5 relative overflow-hidden">
            <div className={`absolute top-4 end-4 w-8 h-8 rounded-lg flex items-center justify-center ${s.iconClass}`}>
              {s.icon}
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-SlateBlueText dark:text-darktext mb-1.5">
              {s.label}
            </p>
            <p className={`text-[30px] font-bold leading-none tracking-tight mb-2 ${s.valueColor}`}>
              {s.value}
            </p>
            <Sparkline data={s.spark} color={s.sparkColor} fill={s.sparkFill} />
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${s.badgeClass}`}>
                {s.badge}
              </span>
              <span className="text-[11px] text-SlateBlueText dark:text-darktext">{s.suffix}</span>
            </div>
          </div>
        ))}

        {/* Skeleton while stats load */}
        {!statsData && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-darklight border border-PowderBlueBorder dark:border-dark_border rounded-xl p-5 animate-pulse">
            <div className="h-3 w-20 bg-PowderBlueBorder dark:bg-dark_border rounded mb-3" />
            <div className="h-8 w-12 bg-PowderBlueBorder dark:bg-dark_border rounded mb-4" />
            <div className="h-8 w-full bg-PowderBlueBorder dark:bg-dark_border rounded" />
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="flex items-center gap-2 bg-white dark:bg-darklight border border-PowderBlueBorder dark:border-dark_border rounded-lg px-3 flex-1 max-w-xs">
          <Search className="w-4 h-4 text-SlateBlueText dark:text-darktext shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
            placeholder={t("sectionImages.searchPlaceholder") || "Search images..."}
            className="flex-1 bg-transparent outline-none text-14 text-MidnightNavyText dark:text-white placeholder:text-SlateBlueText/50 dark:placeholder:text-darktext py-2.5"
          />
          <kbd className="hidden sm:inline-flex items-center bg-PaleCyan dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border rounded px-1 py-0.5 text-[10px] font-mono text-SlateBlueText dark:text-darktext">
            ⌘K
          </kbd>
        </div>

        <button className="flex items-center gap-2 bg-white dark:bg-darklight border border-PowderBlueBorder dark:border-dark_border rounded-lg px-3.5 py-2.5 text-13 font-medium text-MidnightNavyText dark:text-white hover:bg-PaleCyan dark:hover:bg-dark_input transition-colors">
          <SlidersHorizontal className="w-4 h-4 text-SlateBlueText dark:text-darktext" />
          {t("common.filter") || "Filter"}
        </button>
        <button className="flex items-center gap-2 bg-white dark:bg-darklight border border-PowderBlueBorder dark:border-dark_border rounded-lg px-3.5 py-2.5 text-13 font-medium text-MidnightNavyText dark:text-white hover:bg-PaleCyan dark:hover:bg-dark_input transition-colors">
          <ArrowUpDown className="w-4 h-4 text-SlateBlueText dark:text-darktext" />
          {t("common.sort") || "Sort"}
        </button>

        {/* Status filter pills */}
        <div className="flex gap-1 bg-white dark:bg-darklight border border-PowderBlueBorder dark:border-dark_border rounded-lg p-1">
          {(["all", "active", "inactive"] as StatusFilter[]).map(f => (
            <button
              key={f}
              onClick={() => { setStatusFilter(f); setPage(1); }}
              className={`px-3 py-1 rounded text-13 font-medium transition-colors capitalize ${statusFilter === f
                  ? "bg-secondary text-white"
                  : "text-SlateBlueText dark:text-darktext hover:bg-PaleCyan dark:hover:bg-dark_input"
                }`}
            >
              {t(`sectionImages.${f}`) || f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="sm:ms-auto flex items-center gap-3">
          {/* View toggle */}
          <div className="flex border border-PowderBlueBorder dark:border-dark_border rounded-lg overflow-hidden bg-white dark:bg-darklight">
            {(["grid", "list"] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                aria-label={`${v} view`}
                className={`w-9 h-9 flex items-center justify-center transition-colors ${viewMode === v
                    ? "bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white"
                    : "text-SlateBlueText dark:text-darktext hover:bg-PaleCyan/50"
                  }`}
              >
                {v === "grid" ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
              </button>
            ))}
          </div>

          <span className="text-13 text-SlateBlueText dark:text-darktext whitespace-nowrap">
            {t("common.showing") || "Showing"}{" "}
            <strong className="text-MidnightNavyText dark:text-white">{paginated.length}</strong>{" "}
            {t("common.of") || "of"}{" "}
            <strong className="text-MidnightNavyText dark:text-white">{filtered.length}</strong>
          </span>
        </div>
      </div>

      {/* ── Empty State ── */}
      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-darklight rounded-xl border border-PowderBlueBorder dark:border-dark_border">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-16 font-bold text-MidnightNavyText dark:text-white mb-2">
            {searchTerm || statusFilter !== "all"
              ? t("sectionImages.noResults") || "No images found"
              : t("sectionImages.noImages") || "No images yet"}
          </h3>
          <p className="text-14 text-SlateBlueText dark:text-darktext mb-5 max-w-xs mx-auto">
            {searchTerm || statusFilter !== "all"
              ? t("sectionImages.tryDifferentSearch") || "Try adjusting your search or filters."
              : t("sectionImages.createFirst") || "Add your first section image to get started."}
          </p>
          {searchTerm || statusFilter !== "all" ? (
            <button
              onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}
              className="bg-primary text-white px-6 py-2.5 rounded-lg text-14 font-semibold mx-auto flex items-center gap-2"
            >
              {t("sectionImages.clearFilters") || "Clear Filters"}
            </button>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="bg-primary text-white px-6 py-2.5 rounded-lg text-14 font-semibold mx-auto flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("sectionImages.createFirstButton") || "Add Image"}
            </button>
          )}
        </div>
      )}

      {/* ── Grid View ── */}
      {filtered.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginated.map(img => (
            <div
              key={img._id}
              className="bg-white dark:bg-darklight border border-PowderBlueBorder dark:border-dark_border rounded-xl overflow-hidden group cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-brand-sm hover:border-LightBlueBorder/40"
              onMouseEnter={() => setHoveredId(img._id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Thumbnail */}
              <div className="relative h-36 bg-PowderBlueBorder dark:bg-dark_input overflow-hidden">
                <img
                  src={img.imageUrl}
                  alt={img.imageAlt}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />

                {/* Status badge */}
                {img.isActive ? (
                  <span className="absolute top-2.5 end-2.5 bg-white text-secondary text-[11px] font-semibold px-2.5 py-1 rounded-full">
                    {t("sectionImages.status.active") || "Active"}
                  </span>
                ) : (
                  <span className="absolute top-2.5 end-2.5 bg-primary text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
                    {t("sectionImages.status.inactive") || "Inactive"}
                  </span>
                )}

                {/* Hover actions */}
                <div className={`absolute inset-0 bg-black/45 flex items-center justify-center gap-2.5 transition-opacity duration-200 ${hoveredId === img._id ? "opacity-100" : "opacity-0"}`}>
                  {[
                    { icon: <Edit className="w-4 h-4" />, label: "edit", fn: () => { setEditing(img); setOpen(true); } },
                    { icon: img.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />, label: "toggle", fn: () => toggleStatus(img._id, img.isActive) },
                    { icon: <Trash2 className="w-4 h-4" />, label: "delete", fn: () => onDelete(img._id) },
                  ].map(a => (
                    <button
                      key={a.label}
                      aria-label={a.label}
                      onClick={e => { e.stopPropagation(); a.fn(); }}
                      className="w-9 h-9 rounded-lg bg-white/15 hover:bg-white/30 border border-white/30 text-white flex items-center justify-center transition-colors"
                    >
                      {a.icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div className="p-3.5">
                <div className="flex items-baseline justify-between mb-0.5 gap-2">
                  <span className="text-14 font-bold text-MidnightNavyText dark:text-white truncate">
                    {img.sectionName}
                  </span>
                  <span className="text-[11px] text-SlateBlueText dark:text-darktext shrink-0">
                    {img.isActive
                      ? t("sectionImages.status.active") || "Active"
                      : t("sectionImages.status.inactive") || "Inactive"}
                  </span>
                </div>
                <p className="text-12 text-SlateBlueText dark:text-darktext truncate mb-2">
                  {img.description || img.imageAlt}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] text-SlateBlueText/70 dark:text-darktext">
                    {t("common.added") || "Added"} {formatDate(img.createdAt, t)}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(img._id); }}
                    className="text-SlateBlueText/40 hover:text-red-500 dark:text-darktext text-lg leading-none tracking-widest px-1 transition-colors"
                    aria-label="more options"
                  >
                    ···
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── List View ── */}
      {filtered.length > 0 && viewMode === "list" && (
        <div className="bg-white dark:bg-darklight border border-PowderBlueBorder dark:border-dark_border rounded-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-PowderBlueBorder dark:border-dark_border bg-PaleCyan/40 dark:bg-dark_input/40">
                {[
                  t("sectionImages.table.image") || "Image / Section",
                  t("sectionImages.table.alt") || "Alt text",
                  t("sectionImages.table.status") || "Status",
                  t("sectionImages.table.added") || "Added",
                  "",
                ].map((h, i) => (
                  <th key={i} className="text-start px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-SlateBlueText dark:text-darktext">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(img => (
                <tr
                  key={img._id}
                  className="border-b border-PowderBlueBorder dark:border-dark_border last:border-0 hover:bg-PaleCyan/20 dark:hover:bg-dark_input/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-lg overflow-hidden border border-PowderBlueBorder dark:border-dark_border shrink-0 bg-PowderBlueBorder dark:bg-dark_input">
                        <img
                          src={img.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                      <div>
                        <p className="text-13 font-semibold text-MidnightNavyText dark:text-white">{img.sectionName}</p>
                        <p className="text-12 text-SlateBlueText dark:text-darktext truncate max-w-[160px]">{img.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-12 text-SlateBlueText dark:text-darktext max-w-[160px] truncate">
                    {img.imageAlt}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${img.isActive ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                      <span className="w-1 h-1 rounded-full bg-current" />
                      {img.isActive
                        ? t("sectionImages.status.active") || "Active"
                        : t("sectionImages.status.inactive") || "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-12 text-SlateBlueText dark:text-darktext">
                    {formatDate(img.createdAt, t)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {[
                        { icon: <Edit className="w-3.5 h-3.5" />, label: "edit", fn: () => { setEditing(img); setOpen(true); }, cls: "" },
                        { icon: img.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />, label: "toggle", fn: () => toggleStatus(img._id, img.isActive), cls: "" },
                        { icon: <Trash2 className="w-3.5 h-3.5" />, label: "delete", fn: () => onDelete(img._id), cls: "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" },
                      ].map(a => (
                        <button
                          key={a.label}
                          aria-label={a.label}
                          onClick={a.fn}
                          className={`w-7 h-7 rounded border border-PowderBlueBorder dark:border-dark_border flex items-center justify-center text-SlateBlueText dark:text-darktext transition-colors hover:bg-PaleCyan dark:hover:bg-dark_input ${a.cls}`}
                        >
                          {a.icon}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-13 text-SlateBlueText dark:text-darktext">
            {t("common.showing") || "Showing"}{" "}
            <strong className="text-MidnightNavyText dark:text-white">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}
            </strong>{" "}
            {t("common.of") || "of"}{" "}
            <strong className="text-MidnightNavyText dark:text-white">{filtered.length}</strong>{" "}
            {t("sectionImages.images") || "images"}
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
              className="w-8 h-8 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darklight flex items-center justify-center text-SlateBlueText dark:text-darktext disabled:opacity-40 hover:bg-PaleCyan dark:hover:bg-dark_input transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg border text-13 font-medium transition-colors ${page === n
                    ? "bg-secondary border-secondary text-white"
                    : "border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darklight text-MidnightNavyText dark:text-white hover:bg-PaleCyan dark:hover:bg-dark_input"
                  }`}
              >
                {n}
              </button>
            ))}

            {totalPages > 5 && (
              <>
                <span className="text-SlateBlueText dark:text-darktext text-13 px-1">…</span>
                <button
                  onClick={() => setPage(totalPages)}
                  className="w-8 h-8 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darklight text-13 font-medium text-MidnightNavyText dark:text-white hover:bg-PaleCyan dark:hover:bg-dark_input transition-colors"
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
              className="w-8 h-8 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darklight flex items-center justify-center text-SlateBlueText dark:text-darktext disabled:opacity-40 hover:bg-PaleCyan dark:hover:bg-dark_input transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        size="full"         // ← هنا صح
        noPadding           // ← هنا صح
      >
        <SectionImagesAdminForm
          initial={editing}
          onClose={() => { setOpen(false); setEditing(null); }}
          onSaved={onSaved}
        />
      </Modal>
    </div>
  );
}