"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    ClipboardCheck,
    Loader2,
    Inbox,
    Search,
    Star,
    TrendingUp,
    TrendingDown,
    Users,
    Award,
    ShieldAlert,
    PieChart,
    BarChart3,
    FileText,
    Download,
    ChevronDown,
    Sparkles,
    ThumbsUp,
    AlertCircle,
    User as UserIcon,
    Layers,
} from "lucide-react";
import toast from "react-hot-toast";
import AdminDrawer from "../../../../components/Admin/AdminDrawer"; // ← عدّل المسار حسب مكان الملف عندك

/* ───────────── Constants ───────────── */

const CRITERIA = [
    { key: "understanding", label: "الفهم" },
    { key: "commitment", label: "الالتزام" },
    { key: "attendance", label: "الحضور" },
    { key: "participation", label: "المشاركة" },
];

const DECISIONS = {
    pass: { label: "اجتاز", badge: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300", hex: "#22c55e" },
    review: { label: "مراجعة", badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", hex: "#f59e0b" },
    repeat: { label: "إعادة", badge: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300", hex: "#ef4444" },
};

const CATEGORIES = {
    star_student: { label: "طالب متميز", badge: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300", hex: "#eab308" },
    ready_for_next_level: { label: "جاهز للمستوى التالي", badge: "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300", hex: "#14b8a6" },
    needs_support: { label: "يحتاج دعم", badge: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300", hex: "#3b82f6" },
    at_risk: { label: "معرض للخطر", badge: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300", hex: "#f97316" },
    needs_repeat: { label: "يحتاج إعادة", badge: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300", hex: "#ef4444" },
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
    team_player: "يعمل بروح الفريق",
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

const inputCls =
    "w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";
const muted = "text-gray-500 dark:text-darkmuted";
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";
const card = "rounded-2xl border border-gray-200 dark:border-dark_border bg-white dark:bg-darklight";

/* ───────────── Helpers ───────────── */

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

// لون الدرجة (من 5)
function scoreTone(score) {
    if (score >= 4) return { text: "text-green-600 dark:text-green-400", bar: "bg-green-500", hex: "#22c55e", soft: "bg-green-50 dark:bg-green-500/10" };
    if (score >= 3) return { text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500", hex: "#f59e0b", soft: "bg-amber-50 dark:bg-amber-500/10" };
    return { text: "text-red-600 dark:text-red-400", bar: "bg-red-500", hex: "#ef4444", soft: "bg-red-50 dark:bg-red-500/10" };
}

const studentName = (e) => e.studentId?.personalInfo?.fullName || "طالب";
const groupName = (e) => e.groupId?.name || e.groupId?.code || "—";
const sessionTitle = (e) =>
    e.sessionId?.title || (e.sessionId?.sessionNumber ? `السيشن ${e.sessionId.sessionNumber}` : "—");
const instructorName = (e) => e.instructorId?.name || e.instructorId?.email || "—";
const overallOf = (e) => Number(e.calculatedStats?.overallScore || 0);

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
            formatDate(e.metadata?.evaluatedAt || e.createdAt),
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

/* ───────────── Chart primitives (SVG, no dependencies) ───────────── */

function DonutChart({ data, size = 132, thickness = 16, unitLabel = "تقييم" }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    const r = (size - thickness) / 2;
    const c = 2 * Math.PI * r;
    let offset = 0;

    return (
        <div className="flex items-center gap-5">
            <div className="relative shrink-0" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} className="stroke-gray-100 dark:stroke-white/5" />
                    {total > 0 &&
                        data.map((d, i) => {
                            const dash = (d.value / total) * c;
                            const seg = (
                                <circle
                                    key={i}
                                    cx={size / 2}
                                    cy={size / 2}
                                    r={r}
                                    fill="none"
                                    stroke={d.color}
                                    strokeWidth={thickness}
                                    strokeDasharray={`${dash} ${c - dash}`}
                                    strokeDashoffset={-offset}
                                    style={{ transition: "stroke-dasharray 500ms ease" }}
                                />
                            );
                            offset += dash;
                            return seg;
                        })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-gray-900 dark:text-white leading-none tabular-nums">{total}</span>
                    <span className={`text-[10px] mt-0.5 ${muted}`}>{unitLabel}</span>
                </div>
            </div>
            <div className="space-y-2.5 min-w-0 flex-1">
                {data.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-gray-700 dark:text-gray-200 truncate">{d.label}</span>
                        <span className="font-bold text-gray-900 dark:text-white tabular-nums mr-auto">{d.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// أعمدة متوسط المعايير الأربعة
function CriteriaBars({ values }) {
    return (
        <div className="space-y-3 w-full">
            {CRITERIA.map((c) => {
                const v = values[c.key] || 0;
                const tone = scoreTone(v);
                return (
                    <div key={c.key}>
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-700 dark:text-gray-200 font-medium">{c.label}</span>
                            <span className={`font-bold tabular-nums ${tone.text}`}>{fix1(v)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                            <div className={`h-full rounded-full ${tone.bar} transition-all duration-500`} style={{ width: `${(v / 5) * 100}%` }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// هيستوجرام توزيع المعدل العام
function ScoreHistogram({ buckets, height = 108 }) {
    const max = Math.max(1, ...buckets.map((b) => b.value));
    return (
        <div className="flex items-end gap-3 w-full" style={{ height }}>
            {buckets.map((b, i) => {
                const h = Math.max(4, (b.value / max) * (height - 28));
                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                        <span className="text-xs font-bold text-gray-900 dark:text-white tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">{b.value}</span>
                        <div className="w-full flex items-end justify-center" style={{ height: height - 28 }}>
                            <div className="w-full max-w-[34px] rounded-t-md transition-all duration-500" style={{ height: h, backgroundColor: b.color }} />
                        </div>
                        <span className={`text-[11px] font-medium ${muted}`}>{b.label}</span>
                    </div>
                );
            })}
        </div>
    );
}

// رادار للمعايير الأربعة
function RadarChart({ values, size = 220 }) {
    const cx = size / 2;
    const cy = size / 2;
    const R = size / 2 - 38;
    const angle = (i) => (-90 + i * 90) * (Math.PI / 180);
    const pt = (i, ratio) => [cx + Math.cos(angle(i)) * R * ratio, cy + Math.sin(angle(i)) * R * ratio];

    const poly = CRITERIA.map((c, i) => pt(i, (values[c.key] || 0) / 5).join(",")).join(" ");

    return (
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[240px] mx-auto">
            {[0.2, 0.4, 0.6, 0.8, 1].map((lvl) => (
                <polygon
                    key={lvl}
                    points={CRITERIA.map((_, i) => pt(i, lvl).join(",")).join(" ")}
                    fill="none"
                    className="stroke-gray-200 dark:stroke-white/10"
                    strokeWidth="1"
                />
            ))}
            {CRITERIA.map((_, i) => {
                const [x, y] = pt(i, 1);
                return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className="stroke-gray-200 dark:stroke-white/10" strokeWidth="1" />;
            })}
            <polygon points={poly} fill="#004d59" fillOpacity="0.22" stroke="#004d59" strokeWidth="2" strokeLinejoin="round" />
            {CRITERIA.map((c, i) => {
                const [x, y] = pt(i, (values[c.key] || 0) / 5);
                return <circle key={c.key} cx={x} cy={y} r="3.5" fill="#feaf00" stroke="#004d59" strokeWidth="1.5" />;
            })}
            {CRITERIA.map((c, i) => {
                const [x, y] = pt(i, 1.2);
                return (
                    <text key={c.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-gray-600 dark:fill-gray-300" style={{ fontSize: 11, fontWeight: 600 }}>
                        {c.label}
                    </text>
                );
            })}
        </svg>
    );
}

// خط تطور المعدل عبر السيشنات
function TrendLine({ points }) {
    const W = 300;
    const H = 90;
    const pad = 12;
    if (points.length < 2) return null;

    const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (W - pad * 2));
    const ys = points.map((p) => H - pad - ((p.value - 1) / 4) * (H - pad * 2));
    const line = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
    const area = `${pad},${H - pad} ${line} ${W - pad},${H - pad}`;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24">
            {[1, 3, 5].map((v) => {
                const y = H - pad - ((v - 1) / 4) * (H - pad * 2);
                return <line key={v} x1={pad} x2={W - pad} y1={y} y2={y} className="stroke-gray-100 dark:stroke-white/10" strokeDasharray="3 3" />;
            })}
            <polygon points={area} fill="#004d59" fillOpacity="0.08" />
            <polyline points={line} fill="none" stroke="#004d59" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) => (
                <circle key={i} cx={xs[i]} cy={ys[i]} r="4" fill={scoreTone(p.value).hex} stroke="white" strokeWidth="1.5" />
            ))}
        </svg>
    );
}

/* ───────────── Small components ───────────── */

function KpiCard({ icon: Icon, label, value, unit, tone, hint }) {
    return (
        <div className={`${card} p-4 flex flex-col gap-3`}>
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone}`}>
                <Icon className="w-5 h-5" />
            </span>
            <div>
                <p className={`text-xs ${muted}`}>{label}</p>
                <p className="mt-0.5 text-xl font-black tabular-nums leading-none text-gray-900 dark:text-white">
                    {value}
                    {unit && <span className={`text-xs font-medium mr-1 ${muted}`}>{unit}</span>}
                </p>
                {hint && <p className={`text-[11px] mt-1.5 ${muted}`}>{hint}</p>}
            </div>
        </div>
    );
}

function ScoreBadge({ score, size = "md" }) {
    const tone = scoreTone(score);
    const cls = size === "lg" ? "w-16 h-16 text-2xl" : "w-11 h-11 text-base";
    return (
        <div className={`${cls} rounded-2xl flex items-center justify-center font-black tabular-nums ${tone.soft} ${tone.text}`}>
            {fix1(score)}
        </div>
    );
}

function Chip({ children, className = "" }) {
    return <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${className}`}>{children}</span>;
}

function MiniCriteria({ criteria }) {
    return (
        <div className="grid grid-cols-4 gap-2">
            {CRITERIA.map((c) => {
                const v = criteria?.[c.key] || 0;
                return (
                    <div key={c.key} title={c.label}>
                        <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className={muted}>{c.label}</span>
                            <span className="font-bold text-gray-800 dark:text-gray-100 tabular-nums">{v}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                            <div className={`h-full rounded-full ${scoreTone(v).bar}`} style={{ width: `${(v / 5) * 100}%` }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ───────────── Page ───────────── */

export default function StudentEvaluationsPage() {
    const [evaluations, setEvaluations] = useState([]);
    const [loading, setLoading] = useState(true);

    const [view, setView] = useState("evaluations"); // evaluations | students
    const [search, setSearch] = useState("");
    const [decision, setDecision] = useState("all");
    const [category, setCategory] = useState("all");
    const [groupId, setGroupId] = useState("all");
    const [sort, setSort] = useState("recent");

    const [selectedStudent, setSelectedStudent] = useState(null); // { id, focusEvalId }
    const [expandedId, setExpandedId] = useState(null);

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

    /* قايمة الجروبات للفلتر */
    const groupOptions = useMemo(() => {
        const map = new Map();
        evaluations.forEach((e) => {
            const id = e.groupId?._id;
            if (id && !map.has(id)) map.set(id, groupName(e));
        });
        return Array.from(map, ([id, name]) => ({ id, name }));
    }, [evaluations]);

    /* الفلترة */
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        let list = evaluations.filter((e) => {
            if (!e.studentId) return false;
            if (decision !== "all" && e.finalDecision !== decision) return false;
            if (category !== "all" && e.marketing?.studentCategory !== category) return false;
            if (groupId !== "all" && e.groupId?._id !== groupId) return false;
            if (q) {
                const hay = `${studentName(e)} ${e.studentId?.enrollmentNumber || ""}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });

        if (sort === "high") list = [...list].sort((a, b) => overallOf(b) - overallOf(a));
        else if (sort === "low") list = [...list].sort((a, b) => overallOf(a) - overallOf(b));
        return list;
    }, [evaluations, search, decision, category, groupId, sort]);

    /* الإحصائيات */
    const stats = useMemo(() => {
        const total = filtered.length;
        const overall = avg(filtered.map(overallOf));
        const passed = filtered.filter((e) => e.finalDecision === "pass").length;
        const atRisk = filtered.filter((e) => ["at_risk", "needs_repeat"].includes(e.marketing?.studentCategory)).length;
        const stars = filtered.filter((e) => e.marketing?.studentCategory === "star_student").length;
        const students = new Set(filtered.map((e) => e.studentId?._id)).size;

        const criteriaAvg = {};
        CRITERIA.forEach((c) => (criteriaAvg[c.key] = avg(filtered.map((e) => e.criteria?.[c.key] || 0))));

        const decisionSplit = Object.entries(DECISIONS).map(([k, v]) => ({
            label: v.label,
            value: filtered.filter((e) => e.finalDecision === k).length,
            color: v.hex,
        }));

        const buckets = [
            { label: "أقل من ٢", value: 0, color: "#ef4444" },
            { label: "٢–٣", value: 0, color: "#f97316" },
            { label: "٣–٤", value: 0, color: "#f59e0b" },
            { label: "٤–٥", value: 0, color: "#22c55e" },
        ];
        filtered.forEach((e) => {
            const s = overallOf(e);
            if (s < 2) buckets[0].value++;
            else if (s < 3) buckets[1].value++;
            else if (s < 4) buckets[2].value++;
            else buckets[3].value++;
        });

        return {
            total,
            overall,
            passRate: total ? Math.round((passed / total) * 100) : 0,
            atRisk,
            stars,
            students,
            criteriaAvg,
            decisionSplit,
            buckets,
        };
    }, [filtered]);

    /* تجميع حسب الطالب */
    const studentRows = useMemo(() => {
        const map = new Map();
        filtered.forEach((e) => {
            const id = e.studentId._id;
            if (!map.has(id)) map.set(id, []);
            map.get(id).push(e);
        });

        const rows = Array.from(map, ([id, list]) => {
            const sorted = [...list].sort(
                (a, b) => new Date(a.metadata?.evaluatedAt || a.createdAt) - new Date(b.metadata?.evaluatedAt || b.createdAt),
            );
            const first = overallOf(sorted[0]);
            const last = sorted[sorted.length - 1];
            return {
                id,
                name: studentName(list[0]),
                enrollment: list[0].studentId?.enrollmentNumber,
                count: list.length,
                overall: avg(list.map(overallOf)),
                trend: sorted.length > 1 ? overallOf(last) - first : 0,
                last,
                passRate: Math.round((list.filter((e) => e.finalDecision === "pass").length / list.length) * 100),
            };
        });

        if (sort === "low") rows.sort((a, b) => a.overall - b.overall);
        else rows.sort((a, b) => b.overall - a.overall);
        return rows;
    }, [filtered, sort]);

    /* تقرير الطالب في الـ Drawer (من كل التقييمات مش المفلترة) */
    const report = useMemo(() => {
        if (!selectedStudent) return null;
        const list = evaluations
            .filter((e) => e.studentId?._id === selectedStudent.id)
            .sort((a, b) => new Date(a.metadata?.evaluatedAt || a.createdAt) - new Date(b.metadata?.evaluatedAt || b.createdAt));
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
            trendPoints: list.map((e) => ({ value: overallOf(e) })),
            strengths: count("strengths", STRENGTH_LABEL),
            weak: count("weakPoints", WEAK_LABEL),
        };
    }, [selectedStudent, evaluations]);

    const openStudent = (studentId, focusEvalId = null) => {
        setSelectedStudent({ id: studentId, focusEvalId });
        setExpandedId(focusEvalId);
    };
    const closeStudent = useCallback(() => setSelectedStudent(null), []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-[#004d59] to-[#003841] p-5 sm:p-6">
                <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-[#feaf00]/10 blur-2xl" aria-hidden="true" />
                <div className="relative flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shadow-lg shrink-0 ring-1 ring-white/10">
                            <ClipboardCheck className="w-6 h-6 text-[#feaf00]" />
                        </div>
                        <div>
                            <h1 className="!text-2xl !leading-snug font-bold text-white">تقييمات الطلبة</h1>
                            <p className="text-sm mt-0.5 text-white/70">
                                تقييمات المدرسين لكل سيشن، وتقارير مفصلة لأداء كل طالب وتطوره.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => (filtered.length ? exportCsv(filtered) : toast.error("مفيش بيانات للتصدير"))}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg bg-white/10 text-white hover:bg-white/20 ring-1 ring-white/15 inline-flex items-center gap-2 transition-colors ${focusRing}`}
                    >
                        <Download className="w-4 h-4" />
                        تصدير CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className={`${card} p-4 space-y-3`}>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="ابحث باسم الطالب أو رقم القيد..."
                            className={`${inputCls} pr-9`}
                        />
                    </div>
                    <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={`${inputCls} !w-auto min-w-[150px]`}>
                        <option value="all">كل الجروبات</option>
                        {groupOptions.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                    <select value={decision} onChange={(e) => setDecision(e.target.value)} className={`${inputCls} !w-auto min-w-[130px]`}>
                        <option value="all">كل القرارات</option>
                        {Object.entries(DECISIONS).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                        ))}
                    </select>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} !w-auto min-w-[150px]`}>
                        <option value="all">كل التصنيفات</option>
                        {Object.entries(CATEGORIES).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                        ))}
                    </select>
                    <select value={sort} onChange={(e) => setSort(e.target.value)} className={`${inputCls} !w-auto min-w-[130px]`}>
                        <option value="recent">الأحدث</option>
                        <option value="high">الأعلى درجة</option>
                        <option value="low">الأقل درجة</option>
                    </select>
                </div>

                <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-dark_input" role="tablist">
                    {[
                        { id: "evaluations", label: "كل التقييمات", icon: Layers },
                        { id: "students", label: "تقارير الطلبة", icon: UserIcon },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            role="tab"
                            aria-selected={view === tab.id}
                            onClick={() => setView(tab.id)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 ${focusRing} ${
                                view === tab.id
                                    ? "bg-white dark:bg-darklight text-[#004d59] dark:text-white shadow-sm"
                                    : "text-gray-500 dark:text-darkmuted hover:text-gray-800 dark:hover:text-white"
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview */}
            {!loading && filtered.length > 0 && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard icon={Star} label="متوسط التقييم العام" value={fix1(stats.overall)} unit="/ 5" tone="bg-[#feaf00]/10 text-[#946600] dark:text-[#feaf00]" hint={`${stats.total} تقييم • ${stats.students} طالب`} />
                        <KpiCard icon={ThumbsUp} label="نسبة الاجتياز" value={`${stats.passRate}%`} tone="bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400" />
                        <KpiCard icon={Award} label="طلبة متميزين" value={stats.stars} tone="bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" />
                        <KpiCard icon={ShieldAlert} label="يحتاجون تدخل" value={stats.atRisk} tone="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400" hint="معرض للخطر / يحتاج إعادة" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className={`${card} p-5 flex flex-col`}>
                            <div className="flex items-center gap-2 mb-4">
                                <PieChart className="w-4 h-4 text-[#004d59] dark:text-white/70" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">توزيع القرارات</h3>
                            </div>
                            <div className="flex-1 flex items-center">
                                <DonutChart data={stats.decisionSplit} />
                            </div>
                        </div>

                        <div className={`${card} p-5 flex flex-col`}>
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="w-4 h-4 text-[#004d59] dark:text-white/70" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">متوسط المعايير</h3>
                            </div>
                            <div className="flex-1 flex items-center">
                                <CriteriaBars values={stats.criteriaAvg} />
                            </div>
                        </div>

                        <div className={`${card} p-5 flex flex-col`}>
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="w-4 h-4 text-[#004d59] dark:text-white/70" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">توزيع المعدل العام</h3>
                            </div>
                            <div className="flex-1 flex items-center">
                                <ScoreHistogram buckets={stats.buckets} />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 dark:border-dark_border p-14 text-center">
                    <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-[#004d59] dark:text-white mb-1">مفيش تقييمات مطابقة</h3>
                    <p className={`text-sm ${muted}`}>جرب تغيّر الفلاتر أو البحث.</p>
                </div>
            ) : view === "evaluations" ? (
                <div className="space-y-3">
                    {filtered.map((e) => {
                        const dec = DECISIONS[e.finalDecision];
                        const cat = CATEGORIES[e.marketing?.studentCategory];
                        const name = studentName(e);
                        const score = overallOf(e);
                        return (
                            <article
                                key={e._id}
                                className={`${card} relative grid gap-3 md:gap-6 md:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1.4fr)_auto_auto] items-center pr-6 pl-5 py-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden`}
                            >
                                <span className="absolute top-0 bottom-0 right-0 w-1" style={{ backgroundColor: dec?.hex }} aria-hidden="true" />

                                <div className="hidden md:flex w-10 h-10 rounded-full items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: dec?.hex || "#004d59" }}>
                                    {initials(name)}
                                </div>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-bold text-gray-900 dark:text-white truncate">{name}</p>
                                        <span className={`text-xs ${muted}`} dir="ltr">{e.studentId?.enrollmentNumber}</span>
                                    </div>
                                    <p className={`text-xs mt-1 truncate ${muted}`}>
                                        {groupName(e)} • {sessionTitle(e)}
                                    </p>
                                    <p className={`text-[11px] mt-0.5 ${muted}`}>
                                        {formatDate(e.metadata?.evaluatedAt || e.createdAt)} • {instructorName(e)}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <MiniCriteria criteria={e.criteria} />
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {dec && <Chip className={dec.badge}>{dec.label}</Chip>}
                                        {cat && <Chip className={cat.badge}>{cat.label}</Chip>}
                                    </div>
                                </div>

                                <ScoreBadge score={score} />

                                <button
                                    onClick={() => openStudent(e.studentId._id, e._id)}
                                    className={`w-full md:w-auto px-4 py-2 text-sm font-semibold rounded-lg bg-[#004d59] text-white hover:bg-[#003b45] dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 inline-flex items-center justify-center gap-1.5 transition-colors ${focusRing}`}
                                >
                                    <FileText className="w-4 h-4" />
                                    التقرير
                                </button>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {studentRows.map((s) => {
                        const tone = scoreTone(s.overall);
                        const lastDec = DECISIONS[s.last.finalDecision];
                        const cat = CATEGORIES[s.last.marketing?.studentCategory];
                        return (
                            <button
                                key={s.id}
                                onClick={() => openStudent(s.id)}
                                className={`${card} text-right p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 ${focusRing}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: tone.hex }}>
                                        {initials(s.name)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-gray-900 dark:text-white truncate">{s.name}</p>
                                        <p className={`text-xs ${muted}`} dir="ltr">{s.enrollment}</p>
                                    </div>
                                    <ScoreBadge score={s.overall} />
                                </div>

                                <div className="h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                                    <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${(s.overall / 5) * 100}%` }} />
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                    <span className={muted}>{s.count} تقييم • اجتياز {s.passRate}%</span>
                                    {s.count > 1 && (
                                        <span className={`inline-flex items-center gap-1 font-bold ${s.trend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                            {s.trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                            {s.trend >= 0 ? "+" : ""}{fix1(s.trend)}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {lastDec && <Chip className={lastDec.badge}>آخر قرار: {lastDec.label}</Chip>}
                                    {cat && <Chip className={cat.badge}>{cat.label}</Chip>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Student report drawer */}
            <AdminDrawer
                isOpen={!!selectedStudent && !!report}
                onClose={closeStudent}
                title="تقرير الطالب"
                subtitle={report ? studentName(report.head) : ""}
                icon={FileText}
                iconClassName="bg-[#004d59] text-[#feaf00]"
                footer={
                    <button
                        onClick={closeStudent}
                        className={`flex-1 px-5 py-2.5 text-sm font-medium border border-gray-300 dark:border-dark_border rounded-lg text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-darkhover ${focusRing}`}
                    >
                        إغلاق
                    </button>
                }
            >
                {report && (
                    <>
                        {/* Summary */}
                        <div className="rounded-xl border border-gray-200 dark:border-dark_border bg-gray-50 dark:bg-darkmode/40 p-4">
                            <div className="flex items-center gap-3">
                                <ScoreBadge score={report.overall} size="lg" />
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-gray-900 dark:text-white truncate">{studentName(report.head)}</p>
                                    <p className={`text-xs ${muted}`} dir="ltr">{report.head.studentId?.enrollmentNumber}</p>
                                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                                        {CATEGORIES[report.newest.marketing?.studentCategory] && (
                                            <Chip className={CATEGORIES[report.newest.marketing.studentCategory].badge}>
                                                {CATEGORIES[report.newest.marketing.studentCategory].label}
                                            </Chip>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                                <div>
                                    <dd className="font-black text-lg text-gray-900 dark:text-white tabular-nums">{report.list.length}</dd>
                                    <dt className={`text-[11px] ${muted}`}>تقييم</dt>
                                </div>
                                <div>
                                    <dd className="font-black text-lg text-gray-900 dark:text-white tabular-nums">{report.passRate}%</dd>
                                    <dt className={`text-[11px] ${muted}`}>اجتياز</dt>
                                </div>
                                <div>
                                    <dd className={`font-black text-lg tabular-nums ${report.trend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                        {report.list.length > 1 ? `${report.trend >= 0 ? "+" : ""}${fix1(report.trend)}` : "—"}
                                    </dd>
                                    <dt className={`text-[11px] ${muted}`}>التطور</dt>
                                </div>
                            </dl>
                        </div>

                        {/* Radar + bars */}
                        <div className={`${card} p-4`}>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">متوسط المعايير</h4>
                            <RadarChart values={report.criteriaAvg} />
                            <div className="mt-3">
                                <CriteriaBars values={report.criteriaAvg} />
                            </div>
                        </div>

                        {/* Trend */}
                        {report.list.length > 1 && (
                            <div className={`${card} p-4`}>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">تطور المعدل عبر السيشنات</h4>
                                <TrendLine points={report.trendPoints} />
                                <div className={`flex justify-between text-[11px] mt-1 ${muted}`}>
                                    <span>{formatDate(report.list[0].metadata?.evaluatedAt || report.list[0].createdAt)}</span>
                                    <span>{formatDate(report.newest.metadata?.evaluatedAt || report.newest.createdAt)}</span>
                                </div>
                            </div>
                        )}

                        {/* Strengths / Weak */}
                        {(report.strengths.length > 0 || report.weak.length > 0) && (
                            <div className="grid grid-cols-1 gap-3">
                                {report.strengths.length > 0 && (
                                    <div className={`${card} p-4`}>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2.5 flex items-center gap-1.5">
                                            <Sparkles className="w-4 h-4 text-green-600" /> نقاط القوة
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {report.strengths.map((s) => (
                                                <Chip key={s.key} className="bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300">
                                                    {s.label}{s.n > 1 && ` ×${s.n}`}
                                                </Chip>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {report.weak.length > 0 && (
                                    <div className={`${card} p-4`}>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2.5 flex items-center gap-1.5">
                                            <AlertCircle className="w-4 h-4 text-amber-600" /> نقاط تحتاج تحسين
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {report.weak.map((s) => (
                                                <Chip key={s.key} className="bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                                    {s.label}{s.n > 1 && ` ×${s.n}`}
                                                </Chip>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Evaluations history */}
                        <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2.5 flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-[#004d59] dark:text-white/70" /> سجل التقييمات
                            </h4>
                            <div className="space-y-2.5">
                                {[...report.list].reverse().map((e) => {
                                    const dec = DECISIONS[e.finalDecision];
                                    const cat = CATEGORIES[e.marketing?.studentCategory];
                                    const open = expandedId === e._id;
                                    const ai = e.marketing?.aiAnalysis;
                                    return (
                                        <div key={e._id} className={`${card} overflow-hidden`}>
                                            <button
                                                onClick={() => setExpandedId(open ? null : e._id)}
                                                className={`w-full flex items-center gap-3 p-3.5 text-right ${focusRing}`}
                                                aria-expanded={open}
                                            >
                                                <ScoreBadge score={overallOf(e)} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{sessionTitle(e)}</p>
                                                    <p className={`text-[11px] mt-0.5 truncate ${muted}`}>
                                                        {groupName(e)} • {formatDate(e.metadata?.evaluatedAt || e.createdAt)}
                                                    </p>
                                                </div>
                                                {dec && <Chip className={dec.badge}>{dec.label}</Chip>}
                                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
                                            </button>

                                            {open && (
                                                <div className="px-3.5 pb-4 pt-1 space-y-3 border-t border-gray-100 dark:border-dark_border">
                                                    <div className="pt-3">
                                                        <MiniCriteria criteria={e.criteria} />
                                                    </div>

                                                    <div className={`text-xs ${muted}`}>
                                                        المدرس: <span className="font-semibold text-gray-800 dark:text-gray-100">{instructorName(e)}</span>
                                                    </div>

                                                    {e.notes ? (
                                                        <div className="rounded-lg bg-gray-50 dark:bg-darkmode/40 p-3">
                                                            <p className={`text-[11px] mb-1 ${muted}`}>ملاحظات المدرس</p>
                                                            <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-line">{e.notes}</p>
                                                        </div>
                                                    ) : (
                                                        <p className={`text-xs ${muted}`}>مفيش ملاحظات مكتوبة.</p>
                                                    )}

                                                    {(e.strengths?.length > 0 || e.weakPoints?.length > 0) && (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {e.strengths?.map((k) => (
                                                                <Chip key={k} className="bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300">{STRENGTH_LABEL[k] || k}</Chip>
                                                            ))}
                                                            {e.weakPoints?.map((k) => (
                                                                <Chip key={k} className="bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">{WEAK_LABEL[k] || k}</Chip>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {cat && (
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={`text-xs ${muted}`}>التصنيف:</span>
                                                            <Chip className={cat.badge}>{cat.label}</Chip>
                                                        </div>
                                                    )}

                                                    {e.marketing?.nextSteps?.length > 0 && (
                                                        <div>
                                                            <p className={`text-xs mb-1.5 ${muted}`}>الخطوات المقترحة</p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {e.marketing.nextSteps.map((k) => (
                                                                    <Chip key={k} className="bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">{NEXT_STEP_LABEL[k] || k}</Chip>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {ai?.summary && (
                                                        <div className="rounded-lg border border-[#feaf00]/30 bg-[#feaf00]/5 p-3">
                                                            <p className="text-[11px] mb-1 font-semibold text-[#946600] dark:text-[#feaf00] flex items-center gap-1">
                                                                <Sparkles className="w-3 h-3" /> ملخص التحليل
                                                            </p>
                                                            <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-100">{ai.summary}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </AdminDrawer>
        </div>
    );
}