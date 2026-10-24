"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
    ClipboardCheck,
    Loader2,
    Inbox,
    Search,
    Star,
    TrendingUp,
    TrendingDown,
    Minus,
    ShieldAlert,
    Download,
    Sparkles,
    ThumbsUp,
    AlertCircle,
    LayoutGrid,
    List,
    Flame,
    MessageSquareText,
    UserRound,
    X,
    ChevronRight,
    ChevronLeft,
    ChevronDown,
    Lightbulb,
    Layers,
    Users,
    PieChart,
    BarChart3,
    Gauge,
    History,
} from "lucide-react";
import toast from "react-hot-toast";

/* ═════════════ Constants ═════════════ */

const CRITERIA = [
    { key: "understanding", label: "الفهم" },
    { key: "commitment", label: "الالتزام" },
    { key: "attendance", label: "الحضور" },
    { key: "participation", label: "المشاركة" },
];

const DECISIONS = {
    pass: { label: "اجتاز", chip: "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20", hex: "#10b981" },
    review: { label: "مراجعة", chip: "bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20", hex: "#f59e0b" },
    repeat: { label: "إعادة", chip: "bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20", hex: "#f43f5e" },
};

const CATEGORIES = {
    star_student: { label: "طالب متميز", chip: "bg-yellow-50 text-yellow-700 ring-yellow-600/15 dark:bg-yellow-500/10 dark:text-yellow-300 dark:ring-yellow-400/20" },
    ready_for_next_level: { label: "جاهز للمستوى التالي", chip: "bg-teal-50 text-teal-700 ring-teal-600/15 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-400/20" },
    needs_support: { label: "يحتاج دعم", chip: "bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20" },
    at_risk: { label: "معرض للخطر", chip: "bg-orange-50 text-orange-700 ring-orange-600/15 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/20" },
    needs_repeat: { label: "يحتاج إعادة", chip: "bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20" },
};

const WEAK_LABEL = {
    understanding: "الفهم",
    practice: "الممارسة",
    attendance: "الحضور",
    participation: "المشاركة",
    homework: "الواجبات",
    projects: "المشاريع",
};

const STRENGTH_LABEL = {
    fast_learner: "سريع التعلم",
    hard_worker: "مجتهد",
    team_player: "روح الفريق",
    creative: "مبدع",
    problem_solver: "يحل المشاكل",
    consistent: "منتظم",
};

const NEXT_STEP_LABEL = {
    enroll_next_level: "التسجيل في المستوى التالي",
    support_sessions: "جلسات دعم",
    repeat_course: "إعادة الكورس",
    mentorship: "إرشاد فردي",
    project_review: "مراجعة المشاريع",
    intensive_support: "دعم مكثف",
    extra_practice: "ممارسة إضافية",
    referral_program: "برنامج الإحالات",
    feedback_session: "جلسة تغذية راجعة",
    one_on_one_coaching: "تدريب فردي",
};

const GOOD_CHIP = "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20";
const WARN_CHIP = "bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20";
const INFO_CHIP = "bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20";
const NEUTRAL_CHIP = "bg-gray-100 text-gray-600 ring-gray-500/10 dark:bg-white/10 dark:text-gray-300 dark:ring-white/10";

const card = "rounded-2xl border border-gray-200/80 dark:border-dark_border bg-white dark:bg-darklight";
const soft = "bg-gray-50 dark:bg-white/[0.04]";
const muted = "text-gray-500 dark:text-darkmuted";
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";
const inputCls =
    "w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-dark_border rounded-xl bg-white dark:bg-dark_input text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition";

/* ═════════════ Helpers ═════════════ */

function formatDate(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

function initials(name = "") {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "؟";
    if (parts.length === 1) return parts[0].slice(0, 2);
    return parts[0][0] + parts[1][0];
}

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const fix1 = (n) => (Math.round(n * 10) / 10).toFixed(1);

function scoreTone(score) {
    if (score >= 4) return { text: "text-emerald-600 dark:text-emerald-400", hex: "#10b981", label: "ممتاز" };
    if (score >= 3) return { text: "text-amber-600 dark:text-amber-400", hex: "#f59e0b", label: "جيد" };
    return { text: "text-rose-600 dark:text-rose-400", hex: "#f43f5e", label: "يحتاج دعم" };
}

const studentName = (e) => e.studentId?.personalInfo?.fullName || "طالب";
const groupName = (e) => e.groupId?.name || e.groupId?.code || "—";
const sessionTitle = (e) =>
    e.sessionId?.title || (e.sessionId?.sessionNumber ? `السيشن ${e.sessionId.sessionNumber}` : "—");
const instructorName = (e) => e.instructorId?.name || e.instructorId?.email || "—";
const overallOf = (e) => {
    const stored = Number(e.calculatedStats?.overallScore);
    if (stored > 0) return stored;
    // لو الدرجة العامة مش متخزنة: احسبها من متوسط المعايير الأربعة
    const vals = ["understanding", "commitment", "attendance", "participation"]
        .map((k) => Number(e.criteria?.[k]))
        .filter((n) => Number.isFinite(n) && n > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
};
const evalDate = (e) => e.metadata?.evaluatedAt || e.createdAt;

function exportCsv(rows) {
    const head = ["الطالب", "رقم القيد", "الجروب", "السيشن", "الفهم", "الالتزام", "الحضور", "المشاركة", "المعدل", "القرار", "التصنيف", "المدرس", "التاريخ", "الملاحظات"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`;
    const lines = rows.map((e) =>
        [
            studentName(e),
            e.studentId?.enrollmentNumber,
            groupName(e),
            sessionTitle(e),
            e.criteria?.understanding,
            e.criteria?.commitment,
            e.criteria?.attendance,
            e.criteria?.participation,
            overallOf(e),
            DECISIONS[e.finalDecision]?.label,
            CATEGORIES[e.marketing?.studentCategory]?.label,
            instructorName(e),
            formatDate(evalDate(e)),
            e.notes,
        ]
            .map(esc)
            .join(","),
    );
    const csv = "\uFEFF" + [head.map(esc).join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `student-evaluations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/* ═════════════ Visual primitives (SVG, no dependencies) ═════════════ */

function ScoreRing({ score, size = 56, stroke = 5, showMax = false, onDark = false }) {
    const tone = scoreTone(score);
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const dash = (Math.min(score, 5) / 5) * c;
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    strokeWidth={stroke}
                    className={onDark ? "stroke-white/15" : "stroke-gray-100 dark:stroke-white/10"}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={tone.hex}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${c - dash}`}
                    style={{ transition: "stroke-dasharray 700ms cubic-bezier(.4,0,.2,1)" }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <span className={`font-black tabular-nums ${onDark ? "text-white" : "text-gray-900 dark:text-white"}`} style={{ fontSize: size * 0.3 }}>
                    {fix1(score)}
                </span>
                {showMax && <span className={`mt-0.5 ${onDark ? "text-white/60" : "text-gray-500 dark:text-darkmuted"}`} style={{ fontSize: size * 0.14 }}>من 5</span>}
            </div>
        </div>
    );
}

function Sparkline({ values, width = 88, height = 28 }) {
    if (values.length < 2) return <span className={`text-[10px] ${muted}`}>تقييم واحد</span>;
    const pad = 3;
    const xs = values.map((_, i) => pad + (i / (values.length - 1)) * (width - pad * 2));
    const ys = values.map((v) => height - pad - ((Math.min(Math.max(v, 1), 5) - 1) / 4) * (height - pad * 2));
    const up = values[values.length - 1] >= values[0];
    const color = up ? "#10b981" : "#f43f5e";
    const pts = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3" fill={color} />
        </svg>
    );
}

function Trend({ value, compact = false }) {
    if (Math.abs(value) < 0.05)
        return (
            <span className={`inline-flex items-center gap-1 text-xs font-bold ${muted}`}>
                <Minus className="w-3.5 h-3.5" /> {!compact && "ثابت"}
            </span>
        );
    const up = value > 0;
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-bold tabular-nums ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {up ? "+" : ""}
            {fix1(value)}
        </span>
    );
}

function CriteriaBars({ values }) {
    return (
        <div className="space-y-3.5 w-full">
            {CRITERIA.map((c) => {
                const v = values[c.key] || 0;
                const tone = scoreTone(v);
                return (
                    <div key={c.key}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-gray-700 dark:text-gray-200 font-medium">{c.label}</span>
                            <span className={`font-bold tabular-nums ${tone.text}`}>{fix1(v)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(v / 5) * 100}%`, backgroundColor: tone.hex }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function Donut({ data, size = 124, stroke = 15 }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    let offset = 0;
    return (
        <div className="flex items-center gap-5 w-full">
            <div className="relative shrink-0" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-gray-100 dark:stroke-white/10" />
                    {total > 0 &&
                        data.map((d) => {
                            if (!d.value) return null;
                            const len = (d.value / total) * c;
                            const seg = Math.max(len - 3, 0);
                            const node = (
                                <circle
                                    key={d.label}
                                    cx={size / 2}
                                    cy={size / 2}
                                    r={r}
                                    fill="none"
                                    stroke={d.color}
                                    strokeWidth={stroke}
                                    strokeDasharray={`${seg} ${c - seg}`}
                                    strokeDashoffset={-offset}
                                    strokeLinecap="round"
                                />
                            );
                            offset += len;
                            return node;
                        })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                    <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{total}</span>
                    <span className={`text-[10px] mt-1 ${muted}`}>تقييم</span>
                </div>
            </div>
            <ul className="flex-1 space-y-2.5 min-w-0">
                {data.map((d) => (
                    <li key={d.label} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-gray-700 dark:text-gray-200 flex-1 truncate">{d.label}</span>
                        <span className="font-bold text-gray-900 dark:text-white tabular-nums">{d.value}</span>
                        <span className={`w-9 text-left tabular-nums ${muted}`}>{total ? Math.round((d.value / total) * 100) : 0}%</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function TrendChart({ points }) {
    const W = 640;
    const H = 220;
    const padL = 30;
    const padR = 16;
    const padT = 22;
    const padB = 30;
    if (points.length < 2) return null;

    const x = (i) => padL + (i / (points.length - 1)) * (W - padL - padR);
    const y = (v) => padT + (1 - (v - 1) / 4) * (H - padT - padB);
    const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
    const area = `${x(0)},${H - padB} ${line} ${x(points.length - 1)},${H - padB}`;
    const showEvery = points.length > 8 ? Math.ceil(points.length / 8) : 1;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto text-secondary dark:text-amber-brand">
            <defs>
                <linearGradient id="trendFillBrand" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
            </defs>
            {[1, 2, 3, 4, 5].map((v) => (
                <g key={v}>
                    <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className="stroke-gray-100 dark:stroke-white/10" strokeDasharray="4 4" />
                    <text x={padL - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: 10 }}>{v}</text>
                </g>
            ))}
            <polygon points={area} fill="url(#trendFillBrand)" />
            <polyline points={line} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) => (
                <g key={i}>
                    <circle cx={x(i)} cy={y(p.value)} r="6" fill={scoreTone(p.value).hex} strokeWidth="3" className="stroke-white dark:stroke-darklight" />
                    <text x={x(i)} y={y(p.value) - 13} textAnchor="middle" className="fill-gray-700 dark:fill-gray-200" style={{ fontSize: 10, fontWeight: 700 }}>
                        {fix1(p.value)}
                    </text>
                    {i % showEvery === 0 && (
                        <text x={x(i)} y={H - 10} textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: 10 }}>
                            {p.label}
                        </text>
                    )}
                </g>
            ))}
        </svg>
    );
}

/** هيرو الصفحة: كل طالب عمود، مرتبين من الأعلى للأقل (فوق خلفية تيل غامقة ثابتة في الـ light والـ dark) */
function Skyline({ rows, onOpen }) {
    if (!rows.length) return null;
    const sorted = [...rows].sort((a, b) => b.overall - a.overall);
    const H = 150;
    return (
        <div>
            <div className="relative" style={{ height: H }}>
                {[5, 4, 3, 2, 1].map((v) => (
                    <div key={v} className="absolute inset-x-0 flex items-center gap-2 pointer-events-none" style={{ bottom: `${(v / 5) * 100}%`, transform: "translateY(50%)" }}>
                        <span className="text-[9px] text-white/40 w-3 tabular-nums">{v}</span>
                        <span className="flex-1 border-t border-dashed border-white/10" />
                    </div>
                ))}
                <div className="absolute inset-0 pr-5 flex items-end gap-1 overflow-x-auto">
                    {sorted.map((s) => {
                        const tone = scoreTone(s.overall);
                        return (
                            <button
                                key={s.id}
                                onClick={() => onOpen(s.id)}
                                title={`${s.name} — ${fix1(s.overall)}`}
                                aria-label={`${s.name}: ${fix1(s.overall)}`}
                                className={`group relative flex-1 min-w-[7px] max-w-[48px] rounded-t-md transition-all duration-200 hover:brightness-125 hover:-translate-y-1 ${focusRing}`}
                                style={{
                                    height: `${Math.max((s.overall / 5) * 100, 4)}%`,
                                    background: `linear-gradient(to top, ${tone.hex}33, ${tone.hex})`,
                                }}
                            >
                                <span className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black/85 px-2 py-1 text-[10px] font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    {s.name} • {fix1(s.overall)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-white/45">
                <span>الأعلى درجة</span>
                <span>كل عمود = طالب (اضغط لفتح التقرير)</span>
                <span>الأقل درجة</span>
            </div>
        </div>
    );
}

/* ═════════════ Small components ═════════════ */

function Chip({ children, className = "" }) {
    return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset ${className}`}>
            {children}
        </span>
    );
}

function Avatar({ name, color, size = "md" }) {
    const cls = size === "lg" ? "w-14 h-14 text-lg" : size === "sm" ? "w-9 h-9 text-xs" : "w-11 h-11 text-sm";
    return (
        <div
            className={`${cls} rounded-full flex items-center justify-center font-bold text-white shrink-0 shadow-sm`}
            style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}
        >
            {initials(name)}
        </div>
    );
}

function CriteriaPills({ criteria, large = false }) {
    return (
        <div className="flex items-center gap-1.5">
            {CRITERIA.map((c) => {
                const v = criteria?.[c.key] || 0;
                const tone = scoreTone(v);
                return (
                    <div
                        key={c.key}
                        title={c.label}
                        className={`flex flex-col items-center justify-center rounded-xl ${soft} ${large ? "w-16 py-2.5" : "w-11 py-1.5"}`}
                    >
                        <span className={`${large ? "text-lg" : "text-sm"} font-black tabular-nums leading-none ${tone.text}`}>{v}</span>
                        <span className={`${large ? "text-[11px] mt-1.5" : "text-[9px] mt-1"} leading-none ${muted}`}>{c.label}</span>
                    </div>
                );
            })}
        </div>
    );
}

function HeroStat({ icon: Icon, label, value, unit, sub }) {
    return (
        <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-amber-brand" />
            </span>
            <div className="min-w-0">
                <p className="text-[11px] text-white/60 truncate">{label}</p>
                <p className="text-xl font-black text-white tabular-nums leading-tight">
                    {value}
                    {unit && <span className="text-xs font-medium text-white/60 mr-1">{unit}</span>}
                </p>
                {sub && <p className="text-[10px] text-white/50 truncate">{sub}</p>}
            </div>
        </div>
    );
}

function Panel({ title, icon: Icon, children, className = "" }) {
    return (
        <div className={`${card} p-5 flex flex-col ${className}`}>
            <div className="flex items-center gap-2 mb-4">
                <Icon className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
            </div>
            <div className="flex-1 flex items-center">{children}</div>
        </div>
    );
}

function SectionHeading({ id, icon: Icon, title, hint }) {
    return (
        <div id={id} className="scroll-mt-16 flex items-center gap-2.5 mb-3">
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-secondary dark:text-white">{title}</h3>
            {hint && <span className={`text-xs ${muted}`}>{hint}</span>}
        </div>
    );
}

/* ═════════════ Report dialog (master–detail) ═════════════ */

function SessionRow({ e, open, onToggle }) {
    const dec = DECISIONS[e.finalDecision];
    const cat = CATEGORIES[e.marketing?.studentCategory];
    const ai = e.marketing?.aiAnalysis;
    const score = overallOf(e);
    const tone = scoreTone(score);

    return (
        <div id={`eval-${e._id}`} className={`rounded-2xl border transition-colors ${open ? "border-primary/40 bg-primary/[0.03] dark:bg-primary/[0.06]" : "border-gray-200 dark:border-dark_border"}`}>
            <button
                onClick={onToggle}
                aria-expanded={open}
                className={`w-full flex items-center gap-3 px-4 py-3 text-right rounded-2xl ${focusRing}`}
            >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dec?.hex || "#9ca3af" }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{sessionTitle(e)}</p>
                    <p className={`text-[11px] truncate ${muted}`}>{groupName(e)} • {formatDate(evalDate(e))}</p>
                </div>
                {dec && <span className="hidden sm:inline-flex"><Chip className={dec.chip}>{dec.label}</Chip></span>}
                <span className={`text-lg font-black tabular-nums w-10 text-center ${tone.text}`}>{fix1(score)}</span>
                <ChevronDown className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="px-4 pb-4 space-y-4 border-t border-gray-200/70 dark:border-dark_border pt-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        {dec && <span className="sm:hidden"><Chip className={dec.chip}>{dec.label}</Chip></span>}
                        {cat && <Chip className={cat.chip}>{cat.label}</Chip>}
                        <span className={`text-[11px] inline-flex items-center gap-1 ${muted}`}>
                            <UserRound className="w-3 h-3" /> {instructorName(e)}
                        </span>
                    </div>

                    <CriteriaPills criteria={e.criteria} large />

                    {e.notes ? (
                        <div className={`rounded-xl ${soft} p-4`}>
                            <p className={`text-[11px] mb-1.5 flex items-center gap-1 ${muted}`}>
                                <MessageSquareText className="w-3 h-3" /> ملاحظات المدرس
                            </p>
                            <p className="text-sm leading-7 text-gray-800 dark:text-gray-100 whitespace-pre-line">{e.notes}</p>
                        </div>
                    ) : (
                        <p className={`text-xs ${muted}`}>مفيش ملاحظات مكتوبة على التقييم ده.</p>
                    )}

                    {(e.strengths?.length > 0 || e.weakPoints?.length > 0) && (
                        <div className="flex flex-wrap gap-1.5">
                            {e.strengths?.map((k) => <Chip key={`s-${k}`} className={GOOD_CHIP}>{STRENGTH_LABEL[k] || k}</Chip>)}
                            {e.weakPoints?.map((k) => <Chip key={`w-${k}`} className={WARN_CHIP}>{WEAK_LABEL[k] || k}</Chip>)}
                        </div>
                    )}

                    {e.marketing?.nextSteps?.length > 0 && (
                        <div>
                            <p className={`text-xs mb-1.5 ${muted}`}>الخطوات المقترحة</p>
                            <div className="flex flex-wrap gap-1.5">
                                {e.marketing.nextSteps.map((k) => <Chip key={k} className={INFO_CHIP}>{NEXT_STEP_LABEL[k] || k}</Chip>)}
                            </div>
                        </div>
                    )}

                    {ai?.summary && (
                        <div className="rounded-xl border border-amber-brand/30 bg-amber-brand/[0.06] p-3.5">
                            <p className="text-[11px] mb-1 font-semibold text-[#946600] dark:text-amber-brand flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> ملخص التحليل
                            </p>
                            <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-100">{ai.summary}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ReportDialog({ report, rows, focusEvalId, onClose, onSelect, onPrev, onNext, position }) {
    const [mounted, setMounted] = useState(false);
    const [show, setShow] = useState(false);
    const [openId, setOpenId] = useState(focusEvalId || report.newest._id);
    const scroller = useRef(null);

    const studentId = report.head.studentId?._id;

    useEffect(() => {
        setMounted(true);
        const id = requestAnimationFrame(() => setShow(true));
        return () => cancelAnimationFrame(id);
    }, []);

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (ev) => {
            if (ev.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [onClose]);

    // لما الطالب أو التقييم المركّز يتغير: ارجع لأول التقرير أو انزل على التقييم المطلوب
    useEffect(() => {
        setOpenId(focusEvalId || report.newest._id);
        if (focusEvalId) {
            const t = setTimeout(() => {
                document.getElementById(`eval-${focusEvalId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 250);
            return () => clearTimeout(t);
        }
        scroller.current?.scrollTo({ top: 0 });
    }, [studentId, focusEvalId, report.newest._id]);

    // خلّي الطالب الحالي ظاهر في القائمة الجانبية
    useEffect(() => {
        document.getElementById(`rail-${studentId}`)?.scrollIntoView({ block: "nearest" });
    }, [studentId]);

    if (!mounted) return null;

    const newest = report.newest;
    const newestCat = CATEGORIES[newest.marketing?.studentCategory];
    const groups = Array.from(new Set(report.list.map(groupName).filter((g) => g !== "—")));
    const tone = scoreTone(report.overall);

    const trendPoints = report.list.map((e, i) => ({
        value: overallOf(e),
        label: e.sessionId?.sessionNumber ? `س${e.sessionId.sessionNumber}` : `#${i + 1}`,
    }));

    const trendWord =
        report.list.length < 2 ? "" : report.trend > 0.05 ? "ومستواه في تحسن مستمر." : report.trend < -0.05 ? "ومستواه في تراجع ومحتاج متابعة." : "ومستواه ثابت.";

    const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

    const navBtn = `w-9 h-9 rounded-xl border border-gray-200 dark:border-dark_border text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-darkhover flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition ${focusRing}`;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-5"
            style={{ height: "100dvh" }}
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label="تقرير الطالب"
        >
            <div
                className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${show ? "opacity-100" : "opacity-0"}`}
                onClick={onClose}
                aria-hidden="true"
            />

            <div
                className={`relative w-full max-w-6xl h-[94dvh] sm:h-[90dvh] flex overflow-hidden rounded-3xl bg-white dark:bg-darklight shadow-2xl border border-gray-200 dark:border-dark_border transition-all duration-500 ${
                    show ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"
                }`}
            >
                {/* ── Rail: قائمة الطلبة ── */}
                <aside className="hidden lg:flex w-72 shrink-0 flex-col border-l border-gray-200 dark:border-dark_border bg-gray-50 dark:bg-darkmode">
                    <div className="px-4 py-4 border-b border-gray-200 dark:border-dark_border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            <h3 className="text-sm font-bold text-secondary dark:text-white">الطلبة</h3>
                        </div>
                        <span className={`text-xs tabular-nums ${muted}`}>{rows.length}</span>
                    </div>
                    <ul className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-1">
                        {rows.map((s) => {
                            const on = s.id === studentId;
                            const t = scoreTone(s.overall);
                            return (
                                <li key={s.id}>
                                    <button
                                        id={`rail-${s.id}`}
                                        onClick={() => onSelect(s.id)}
                                        aria-current={on}
                                        className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-right transition-colors border-r-[3px] ${focusRing} ${
                                            on
                                                ? "bg-white dark:bg-darklight shadow-sm border-primary"
                                                : "border-transparent hover:bg-white/70 dark:hover:bg-darkhover"
                                        }`}
                                    >
                                        <Avatar name={s.name} color={t.hex} size="sm" />
                                        <div className="min-w-0 flex-1">
                                            <p className={`text-[13px] truncate ${on ? "font-bold text-gray-900 dark:text-white" : "font-medium text-gray-700 dark:text-gray-200"}`}>{s.name}</p>
                                            <p className={`text-[10px] truncate ${muted}`}>{s.group}</p>
                                        </div>
                                        <span className={`text-sm font-black tabular-nums ${t.text}`}>{fix1(s.overall)}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </aside>

                {/* ── Main ── */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <span className="h-1 shrink-0" style={{ background: `linear-gradient(to left, ${tone.hex}, #feaf00)` }} aria-hidden="true" />

                    {/* identity */}
                    <header className="shrink-0 px-5 sm:px-7 py-4 flex items-center gap-4 border-b border-gray-200 dark:border-dark_border">
                        <Avatar name={studentName(report.head)} color={tone.hex} size="lg" />
                        <div className="min-w-0 flex-1">
                            <h2 className="!text-xl sm:!text-2xl !leading-tight font-black text-secondary dark:text-white truncate">{studentName(report.head)}</h2>
                            <p className={`text-xs mt-0.5 ${muted}`} dir="ltr">{report.head.studentId?.enrollmentNumber}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {newestCat && <Chip className={newestCat.chip}>{newestCat.label}</Chip>}
                                {groups.slice(0, 3).map((g) => (
                                    <Chip key={g} className={NEUTRAL_CHIP}>
                                        <Layers className="w-3 h-3" />
                                        {g}
                                    </Chip>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={onPrev} disabled={!onPrev} aria-label="الطالب السابق" className={navBtn}>
                                <ChevronRight className="w-5 h-5" />
                            </button>
                            <span className={`text-xs tabular-nums px-1 hidden sm:inline ${muted}`}>{position}</span>
                            <button onClick={onNext} disabled={!onNext} aria-label="الطالب التالي" className={navBtn}>
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button onClick={onClose} aria-label="إغلاق" className={`${navBtn} mr-1 bg-gray-100 dark:bg-dark_input`}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </header>

                    {/* scrollable report */}
                    <div ref={scroller} className="flex-1 overflow-y-auto overscroll-contain">
                        {/* sticky section nav */}
                        <nav className="sticky top-0 z-10 flex gap-1.5 overflow-x-auto px-5 sm:px-7 py-2.5 bg-white/90 dark:bg-darklight/90 backdrop-blur border-b border-gray-200/70 dark:border-dark_border" aria-label="أقسام التقرير">
                            {[
                                { id: "rp-summary", label: "الملخص", icon: Gauge },
                                { id: "rp-criteria", label: "المعايير", icon: Star },
                                ...(report.list.length > 1 ? [{ id: "rp-trend", label: "التطور", icon: TrendingUp }] : []),
                                { id: "rp-notes", label: "نقاط القوة والضعف", icon: Lightbulb },
                                { id: "rp-sessions", label: `السيشنات (${report.list.length})`, icon: History },
                            ].map((n) => (
                                <button
                                    key={n.id}
                                    onClick={() => jump(n.id)}
                                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-gray-100 dark:bg-dark_input text-gray-600 dark:text-gray-300 hover:bg-primary/10 hover:text-primary transition-colors ${focusRing}`}
                                >
                                    <n.icon className="w-3.5 h-3.5" />
                                    {n.label}
                                </button>
                            ))}
                        </nav>

                        <div className="p-4 sm:p-5 space-y-4">
                            {/* summary + criteria */}
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <section className={`${card} p-4 md:col-span-3`}>
                                    <SectionHeading id="rp-summary" icon={Gauge} title="الملخص" />
                                    <div className="flex items-center gap-4">
                                        <ScoreRing score={report.overall} size={96} stroke={9} showMax />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm leading-7 text-gray-700 dark:text-gray-200">
                                                متوسط الطالب <b className={tone.text}>{fix1(report.overall)} من 5</b> ({tone.label}) عبر {report.list.length} تقييم. {trendWord}
                                            </p>
                                            <dl className="mt-3 grid grid-cols-3 gap-2">
                                                {[
                                                    { v: report.list.length, l: "تقييم" },
                                                    { v: `${report.passRate}%`, l: "اجتياز" },
                                                    { v: report.list.length > 1 ? `${report.trend > 0 ? "+" : ""}${fix1(report.trend)}` : "—", l: "التطور" },
                                                ].map((x) => (
                                                    <div key={x.l} className={`rounded-xl ${soft} px-2 py-2 text-center`}>
                                                        <dd className="text-base font-black tabular-nums text-gray-900 dark:text-white leading-none">{x.v}</dd>
                                                        <dt className={`text-[10px] mt-1 ${muted}`}>{x.l}</dt>
                                                    </div>
                                                ))}
                                            </dl>
                                        </div>
                                    </div>
                                    <p className={`text-[11px] mt-3 ${muted}`}>آخر تقييم: {formatDate(evalDate(newest))} • {instructorName(newest)}</p>
                                </section>

                                <section className={`${card} p-4 md:col-span-2`}>
                                    <SectionHeading id="rp-criteria" icon={Star} title="المعايير" hint="المتوسط" />
                                    <CriteriaBars values={report.criteriaAvg} />
                                </section>
                            </div>

                            {/* trend */}
                            {report.list.length > 1 && (
                                <section className={`${card} p-4`}>
                                    <div className="flex items-start justify-between">
                                        <SectionHeading id="rp-trend" icon={TrendingUp} title="تطور المعدل" hint="عبر السيشنات" />
                                        <Trend value={report.trend} />
                                    </div>
                                    <div className="max-h-52 flex justify-center">
                                        <TrendChart points={trendPoints} />
                                    </div>
                                </section>
                            )}

                            {/* strengths / weak */}
                            <section className={`${card} p-4`}>
                                <SectionHeading id="rp-notes" icon={Lightbulb} title="نقاط القوة والضعف" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/[0.05] p-3.5">
                                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5" /> نقاط القوة
                                        </p>
                                        {report.strengths.length ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {report.strengths.map((s) => (
                                                    <Chip key={s.key} className={GOOD_CHIP}>{s.label}{s.n > 1 && ` ×${s.n}`}</Chip>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className={`text-xs ${muted}`}>لسه مفيش نقاط قوة مرصودة.</p>
                                        )}
                                    </div>
                                    <div className="rounded-xl border border-amber-200/70 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/[0.05] p-3.5">
                                        <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                                            <AlertCircle className="w-3.5 h-3.5" /> نقاط تحتاج تحسين
                                        </p>
                                        {report.weak.length ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {report.weak.map((s) => (
                                                    <Chip key={s.key} className={WARN_CHIP}>{s.label}{s.n > 1 && ` ×${s.n}`}</Chip>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className={`text-xs ${muted}`}>مفيش نقاط ضعف مرصودة.</p>
                                        )}
                                    </div>
                                </div>
                                {newest.marketing?.nextSteps?.length > 0 && (
                                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                        <span className={`text-xs ${muted}`}>الخطوات المقترحة:</span>
                                        {newest.marketing.nextSteps.map((k) => (
                                            <Chip key={k} className={INFO_CHIP}>{NEXT_STEP_LABEL[k] || k}</Chip>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* sessions accordion */}
                            <section className={`${card} p-4`}>
                                <SectionHeading id="rp-sessions" icon={History} title="سجل السيشنات" hint="الأحدث أولاً — اضغط على أي سيشن لعرض التفاصيل" />
                                <div className="space-y-2">
                                    {[...report.list].reverse().map((e) => (
                                        <SessionRow key={e._id} e={e} open={openId === e._id} onToggle={() => setOpenId(openId === e._id ? null : e._id)} />
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}

/* ═════════════ Page ═════════════ */

export default function StudentEvaluationsPage() {
    const [evaluations, setEvaluations] = useState([]);
    const [loading, setLoading] = useState(true);

    const [view, setView] = useState("students"); // students | evaluations
    const [search, setSearch] = useState("");
    const [decision, setDecision] = useState("all");
    const [groupId, setGroupId] = useState("all");
    const [sort, setSort] = useState("recent");

    const [selectedStudent, setSelectedStudent] = useState(null); // { id, focusEvalId }

    const fetchEvaluations = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/student-evaluations");
            const data = await res.json();
            if (data.success) setEvaluations(data.data || []);
            else toast.error(data.message || "تعذر تحميل التقييمات");
        } catch (err) {
            toast.error(err.message || "تعذر تحميل التقييمات");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvaluations();
    }, [fetchEvaluations]);

    const groupOptions = useMemo(() => {
        const map = new Map();
        evaluations.forEach((e) => {
            const id = e.groupId?._id;
            if (id && !map.has(id)) map.set(id, groupName(e));
        });
        return Array.from(map, ([id, name]) => ({ id, name }));
    }, [evaluations]);

    const baseFiltered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return evaluations.filter((e) => {
            if (!e.studentId) return false;
            if (groupId !== "all" && e.groupId?._id !== groupId) return false;
            if (q) {
                const hay = `${studentName(e)} ${e.studentId?.enrollmentNumber || ""}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [evaluations, search, groupId]);

    const decisionCounts = useMemo(() => {
        const c = { all: baseFiltered.length, pass: 0, review: 0, repeat: 0 };
        baseFiltered.forEach((e) => {
            if (c[e.finalDecision] !== undefined) c[e.finalDecision]++;
        });
        return c;
    }, [baseFiltered]);

    const filtered = useMemo(() => {
        let list = decision === "all" ? baseFiltered : baseFiltered.filter((e) => e.finalDecision === decision);
        if (sort === "high") list = [...list].sort((a, b) => overallOf(b) - overallOf(a));
        else if (sort === "low") list = [...list].sort((a, b) => overallOf(a) - overallOf(b));
        return list;
    }, [baseFiltered, decision, sort]);

    const stats = useMemo(() => {
        const total = filtered.length;
        const passed = filtered.filter((e) => e.finalDecision === "pass").length;
        const criteriaAvg = {};
        CRITERIA.forEach((c) => (criteriaAvg[c.key] = avg(filtered.map((e) => e.criteria?.[c.key] || 0))));

        return {
            total,
            overall: avg(filtered.map(overallOf)),
            passRate: total ? Math.round((passed / total) * 100) : 0,
            stars: filtered.filter((e) => e.marketing?.studentCategory === "star_student").length,
            students: new Set(filtered.map((e) => e.studentId?._id)).size,
            criteriaAvg,
            decisionSplit: Object.entries(DECISIONS).map(([k, v]) => ({
                label: v.label,
                value: filtered.filter((e) => e.finalDecision === k).length,
                color: v.hex,
            })),
        };
    }, [filtered]);

    const studentRows = useMemo(() => {
        const map = new Map();
        filtered.forEach((e) => {
            const id = e.studentId._id;
            if (!map.has(id)) map.set(id, []);
            map.get(id).push(e);
        });

        const rows = Array.from(map, ([id, list]) => {
            const sorted = [...list].sort((a, b) => new Date(evalDate(a)) - new Date(evalDate(b)));
            const last = sorted[sorted.length - 1];
            return {
                id,
                name: studentName(list[0]),
                enrollment: list[0].studentId?.enrollmentNumber,
                group: groupName(last),
                count: list.length,
                overall: avg(list.map(overallOf)),
                series: sorted.map(overallOf),
                trend: sorted.length > 1 ? overallOf(last) - overallOf(sorted[0]) : 0,
                last,
                criteria: CRITERIA.reduce((acc, c) => {
                    acc[c.key] = avg(list.map((e) => e.criteria?.[c.key] || 0));
                    return acc;
                }, {}),
                passRate: Math.round((list.filter((e) => e.finalDecision === "pass").length / list.length) * 100),
            };
        });

        if (sort === "low") rows.sort((a, b) => a.overall - b.overall);
        else if (sort === "high") rows.sort((a, b) => b.overall - a.overall);
        else rows.sort((a, b) => new Date(evalDate(b.last)) - new Date(evalDate(a.last)));
        return rows;
    }, [filtered, sort]);

    const attention = useMemo(() => {
        return studentRows
            .filter(
                (s) =>
                    ["at_risk", "needs_repeat"].includes(s.last.marketing?.studentCategory) ||
                    s.overall < 3 ||
                    s.trend <= -1,
            )
            .sort((a, b) => a.overall - b.overall)
            .slice(0, 5);
    }, [studentRows]);

    /* تقرير الطالب المختار (من كل التقييمات مش المفلترة) */
    const report = useMemo(() => {
        if (!selectedStudent) return null;
        const list = evaluations
            .filter((e) => e.studentId?._id === selectedStudent.id)
            .sort((a, b) => new Date(evalDate(a)) - new Date(evalDate(b)));
        if (list.length === 0) return null;

        const criteriaAvg = {};
        CRITERIA.forEach((c) => (criteriaAvg[c.key] = avg(list.map((e) => e.criteria?.[c.key] || 0))));

        const count = (field, labels) => {
            const m = {};
            list.forEach((e) => (e[field] || []).forEach((k) => (m[k] = (m[k] || 0) + 1)));
            return Object.entries(m)
                .sort((a, b) => b[1] - a[1])
                .map(([k, n]) => ({ key: k, label: labels[k] || k, n }));
        };

        const newest = list[list.length - 1];
        return {
            head: list[0],
            newest,
            list,
            overall: avg(list.map(overallOf)),
            criteriaAvg,
            passRate: Math.round((list.filter((e) => e.finalDecision === "pass").length / list.length) * 100),
            trend: list.length > 1 ? overallOf(newest) - overallOf(list[0]) : 0,
            strengths: count("strengths", STRENGTH_LABEL),
            weak: count("weakPoints", WEAK_LABEL),
        };
    }, [selectedStudent, evaluations]);

    /* التنقل بين الطلبة داخل التقرير */
    const studentIds = useMemo(() => studentRows.map((s) => s.id), [studentRows]);
    const currentIndex = selectedStudent ? studentIds.indexOf(selectedStudent.id) : -1;

    const openStudent = (studentId, focusEvalId = null) => setSelectedStudent({ id: studentId, focusEvalId });
    const closeStudent = useCallback(() => setSelectedStudent(null), []);
    const goTo = (idx) => {
        if (idx >= 0 && idx < studentIds.length) setSelectedStudent({ id: studentIds[idx], focusEvalId: null });
    };

    const hasData = !loading && filtered.length > 0;
    const overallTone = scoreTone(stats.overall);

    return (
        <div className="space-y-6">
            {/* ───────── Header ───────── */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="!text-2xl !leading-snug font-bold text-secondary dark:text-white">تقييمات الطلبة</h1>
                        <p className={`text-sm mt-0.5 ${muted}`}>شوف أداء كل طالب في كل سيشن، وافتح تقريره الكامل بضغطة.</p>
                    </div>
                </div>
                <button
                    onClick={() => (filtered.length ? exportCsv(filtered) : toast.error("مفيش بيانات للتصدير"))}
                    className={`px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-accent-hover shadow-brand-sm inline-flex items-center gap-2 transition-colors ${focusRing}`}
                >
                    <Download className="w-4 h-4" />
                    تصدير CSV
                </button>
            </div>

            {/* ───────── Hero: skyline ───────── */}
            {hasData && (
                <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-secondary via-[#00424d] to-teal-dark p-5 sm:p-6 shadow-brand-lg" aria-label="ملخص الأداء">
                    <div className="absolute -left-16 -top-16 w-64 h-64 rounded-full bg-amber-brand/10 blur-3xl pointer-events-none" aria-hidden="true" />
                    <div className="absolute -right-10 -bottom-20 w-56 h-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" aria-hidden="true" />

                    <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-5 pb-6 mb-6 border-b border-white/10">
                        <div className="flex items-center gap-4">
                            <ScoreRing score={stats.overall} size={62} stroke={6} onDark />
                            <div>
                                <p className="text-[11px] text-white/60">متوسط التقييم العام</p>
                                <p className="text-sm font-bold text-white">{overallTone.label}</p>
                                <p className="text-[10px] text-white/50">{stats.total} تقييم</p>
                            </div>
                        </div>
                        <HeroStat icon={Users} label="عدد الطلبة" value={stats.students} />
                        <HeroStat icon={ThumbsUp} label="نسبة الاجتياز" value={stats.passRate} unit="%" />
                        <HeroStat icon={ShieldAlert} label="يحتاجون تدخل" value={attention.length} sub={`${stats.stars} طالب متميز`} />
                    </div>

                    <div className="relative">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="w-4 h-4 text-amber-brand" />
                            <h2 className="text-sm font-bold text-white">مستوى الطلبة</h2>
                            <span className="text-xs text-white/50">المعدل العام لكل طالب</span>
                        </div>
                        <Skyline rows={studentRows} onOpen={(id) => openStudent(id)} />
                    </div>
                </section>
            )}

            {/* ───────── Toolbar ───────── */}
            <div className={`${card} p-3 sm:p-4 space-y-3`}>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم الطالب أو رقم القيد..." className={`${inputCls} pr-10`} />
                    </div>
                    <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={`${inputCls} !w-auto min-w-[150px]`}>
                        <option value="all">كل الجروبات</option>
                        {groupOptions.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                    <select value={sort} onChange={(e) => setSort(e.target.value)} className={`${inputCls} !w-auto min-w-[140px]`}>
                        <option value="recent">الأحدث</option>
                        <option value="high">الأعلى درجة</option>
                        <option value="low">الأقل درجة</option>
                    </select>

                    <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-dark_input" role="tablist">
                        {[
                            { id: "students", label: "الطلبة", icon: LayoutGrid },
                            { id: "evaluations", label: "التقييمات", icon: List },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={view === tab.id}
                                onClick={() => setView(tab.id)}
                                className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 ${focusRing} ${
                                    view === tab.id
                                        ? "bg-white dark:bg-darklight text-primary shadow-sm"
                                        : "text-gray-500 dark:text-darkmuted hover:text-gray-800 dark:hover:text-white"
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {[{ id: "all", label: "الكل", hex: "#004d59" }, ...Object.entries(DECISIONS).map(([id, v]) => ({ id, label: v.label, hex: v.hex }))].map((d) => {
                        const on = decision === d.id;
                        return (
                            <button
                                key={d.id}
                                onClick={() => setDecision(d.id)}
                                aria-pressed={on}
                                className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all ${focusRing} ${
                                    on
                                        ? "text-white border-transparent shadow-sm"
                                        : "border-gray-200 dark:border-dark_border text-gray-600 dark:text-darkmuted hover:bg-gray-50 dark:hover:bg-darkhover"
                                }`}
                                style={on ? { backgroundColor: d.hex } : undefined}
                            >
                                {!on && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.hex }} />}
                                {d.label}
                                <span className={`tabular-nums px-1.5 rounded-full text-[10px] ${on ? "bg-white/25" : "bg-gray-100 dark:bg-white/10"}`}>
                                    {decisionCounts[d.id]}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ───────── Insights ───────── */}
            {hasData && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <Panel title="توزيع القرارات" icon={PieChart} className="lg:col-span-4">
                        <Donut data={stats.decisionSplit} />
                    </Panel>
                    <Panel title="متوسط المعايير" icon={Star} className="lg:col-span-4">
                        <CriteriaBars values={stats.criteriaAvg} />
                    </Panel>
                    <div className={`${card} p-5 lg:col-span-4`}>
                        <div className="flex items-center gap-2 mb-3">
                            <Flame className="w-4 h-4 text-rose-500" />
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">يحتاجون تدخل</h3>
                        </div>
                        {attention.length === 0 ? (
                            <p className={`text-xs ${muted}`}>كل الطلبة في مستوى مطمئن.</p>
                        ) : (
                            <ul className="space-y-1">
                                {attention.map((s) => (
                                    <li key={s.id}>
                                        <button
                                            onClick={() => openStudent(s.id)}
                                            className={`w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-right hover:bg-gray-50 dark:hover:bg-darkhover transition-colors ${focusRing}`}
                                        >
                                            <ScoreRing score={s.overall} size={38} stroke={4} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{s.name}</p>
                                                <p className={`text-[11px] truncate ${muted}`}>{s.group}</p>
                                            </div>
                                            <Trend value={s.trend} compact />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {/* ───────── Main content ───────── */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-300 dark:border-dark_border p-14 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <Inbox className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-secondary dark:text-white mb-1">مفيش تقييمات مطابقة</h3>
                    <p className={`text-sm ${muted}`}>جرب تغيّر الفلاتر أو البحث.</p>
                </div>
            ) : view === "students" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {studentRows.map((s) => {
                        const tone = scoreTone(s.overall);
                        const lastDec = DECISIONS[s.last.finalDecision];
                        const cat = CATEGORIES[s.last.marketing?.studentCategory];
                        return (
                            <button
                                key={s.id}
                                onClick={() => openStudent(s.id)}
                                className={`${card} group relative text-right p-5 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 transition-all overflow-hidden ${focusRing}`}
                            >
                                <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: tone.hex }} aria-hidden="true" />

                                <div className="flex items-center gap-3.5">
                                    <Avatar name={s.name} color={tone.hex} />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-gray-900 dark:text-white truncate">{s.name}</p>
                                        <p className={`text-xs ${muted}`} dir="ltr">{s.enrollment}</p>
                                        <p className={`text-[11px] mt-0.5 truncate ${muted}`}>{s.group}</p>
                                    </div>
                                    <ScoreRing score={s.overall} size={54} stroke={5} />
                                </div>

                                <div className="mt-4 grid grid-cols-4 gap-2">
                                    {CRITERIA.map((c) => {
                                        const v = s.criteria[c.key] || 0;
                                        const t = scoreTone(v);
                                        return (
                                            <div key={c.key} title={c.label}>
                                                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                                                    <div className="h-full rounded-full" style={{ width: `${(v / 5) * 100}%`, backgroundColor: t.hex }} />
                                                </div>
                                                <p className={`mt-1.5 text-[10px] text-center ${muted}`}>
                                                    {c.label} <span className={`font-bold tabular-nums ${t.text}`}>{fix1(v)}</span>
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className={`mt-4 flex items-center justify-between rounded-xl ${soft} px-3 py-2`}>
                                    <div>
                                        <p className={`text-[10px] ${muted}`}>{s.count} تقييم • اجتياز {s.passRate}%</p>
                                        <div className="mt-0.5"><Trend value={s.trend} /></div>
                                    </div>
                                    <Sparkline values={s.series} />
                                </div>

                                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                                    {lastDec && <Chip className={lastDec.chip}>آخر قرار: {lastDec.label}</Chip>}
                                    {cat && <Chip className={cat.chip}>{cat.label}</Chip>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-2.5">
                    {filtered.map((e) => {
                        const dec = DECISIONS[e.finalDecision];
                        const name = studentName(e);
                        return (
                            <button
                                key={e._id}
                                onClick={() => openStudent(e.studentId._id, e._id)}
                                className={`${card} relative w-full text-right grid gap-3 md:gap-5 md:grid-cols-[auto_minmax(0,1.2fr)_auto_auto] items-center pr-6 pl-4 py-3.5 hover:shadow-md hover:border-primary/40 transition-all overflow-hidden ${focusRing}`}
                            >
                                <span className="absolute top-0 bottom-0 right-0 w-1" style={{ backgroundColor: dec?.hex }} aria-hidden="true" />

                                <div className="hidden md:block"><Avatar name={name} color={dec?.hex || "#004d59"} size="sm" /></div>

                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{name}</p>
                                    <p className={`text-xs mt-0.5 truncate ${muted}`}>{groupName(e)} • {sessionTitle(e)}</p>
                                    <p className={`text-[11px] mt-0.5 ${muted}`}>{formatDate(evalDate(e))} • {instructorName(e)}</p>
                                </div>

                                <CriteriaPills criteria={e.criteria} />

                                <div className="flex items-center gap-3 md:justify-end">
                                    {dec && <Chip className={dec.chip}>{dec.label}</Chip>}
                                    <ScoreRing score={overallOf(e)} size={46} stroke={5} />
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ───────── Student report (master–detail dialog) ───────── */}
            {selectedStudent && report && (
                <ReportDialog
                    report={report}
                    rows={studentRows}
                    focusEvalId={selectedStudent.focusEvalId}
                    onClose={closeStudent}
                    onSelect={(id) => openStudent(id)}
                    onPrev={currentIndex > 0 ? () => goTo(currentIndex - 1) : null}
                    onNext={currentIndex >= 0 && currentIndex < studentIds.length - 1 ? () => goTo(currentIndex + 1) : null}
                    position={currentIndex >= 0 ? `${currentIndex + 1} / ${studentIds.length}` : ""}
                />
            )}
        </div>
    );
}