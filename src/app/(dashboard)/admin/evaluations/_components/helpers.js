/* ═════════════ Constants ═════════════ */

export const CRITERIA = [
    { key: "understanding", label: "الفهم" },
    { key: "commitment", label: "الالتزام" },
    { key: "attendance", label: "الحضور" },
    { key: "participation", label: "المشاركة" },
];

export const DECISIONS = {
    pass: { label: "اجتاز", chip: "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20", hex: "#10b981" },
    review: { label: "مراجعة", chip: "bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20", hex: "#f59e0b" },
    repeat: { label: "إعادة", chip: "bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20", hex: "#f43f5e" },
};

export const CATEGORIES = {
    star_student: { label: "طالب متميز", chip: "bg-yellow-50 text-yellow-700 ring-yellow-600/15 dark:bg-yellow-500/10 dark:text-yellow-300 dark:ring-yellow-400/20" },
    ready_for_next_level: { label: "جاهز للمستوى التالي", chip: "bg-teal-50 text-teal-700 ring-teal-600/15 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-400/20" },
    needs_support: { label: "يحتاج دعم", chip: "bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20" },
    at_risk: { label: "معرض للخطر", chip: "bg-orange-50 text-orange-700 ring-orange-600/15 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/20" },
    needs_repeat: { label: "يحتاج إعادة", chip: "bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20" },
};

export const WEAK_LABEL = {
    understanding: "الفهم",
    practice: "الممارسة",
    attendance: "الحضور",
    participation: "المشاركة",
    homework: "الواجبات",
    projects: "المشاريع",
};

export const STRENGTH_LABEL = {
    fast_learner: "سريع التعلم",
    hard_worker: "مجتهد",
    team_player: "روح الفريق",
    creative: "مبدع",
    problem_solver: "يحل المشاكل",
    consistent: "منتظم",
};

export const NEXT_STEP_LABEL = {
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

export const GOOD_CHIP = "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20";
export const WARN_CHIP = "bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20";
export const INFO_CHIP = "bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20";
export const NEUTRAL_CHIP = "bg-gray-100 text-gray-600 ring-gray-500/10 dark:bg-white/10 dark:text-gray-300 dark:ring-white/10";

export const noScroll = "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";
export const card = "rounded-2xl border border-gray-200/80 dark:border-dark_border bg-white dark:bg-darklight";
export const soft = "bg-gray-50 dark:bg-white/[0.04]";
export const muted = "text-gray-500 dark:text-darkmuted";
export const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";
export const inputCls =
    "w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-dark_border rounded-xl bg-white dark:bg-dark_input text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition";

/* ═════════════ Helpers ═════════════ */

export function formatDate(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

export function initials(name = "") {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "؟";
    if (parts.length === 1) return parts[0].slice(0, 2);
    return parts[0][0] + parts[1][0];
}

export const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
export const fix1 = (n) => (Math.round(n * 10) / 10).toFixed(1);

export function scoreTone(score) {
    if (score >= 4) return { text: "text-emerald-600 dark:text-emerald-400", hex: "#10b981", label: "ممتاز" };
    if (score >= 3) return { text: "text-amber-600 dark:text-amber-400", hex: "#f59e0b", label: "جيد" };
    return { text: "text-rose-600 dark:text-rose-400", hex: "#f43f5e", label: "يحتاج دعم" };
}

export const studentName = (e) => e.studentId?.personalInfo?.fullName || "طالب";
export const groupName = (e) => e.groupId?.name || e.groupId?.code || "—";
export const sessionTitle = (e) =>
    e.sessionId?.title || (e.sessionId?.sessionNumber ? `السيشن ${e.sessionId.sessionNumber}` : "—");
export const instructorName = (e) => e.instructorId?.name || e.instructorId?.email || "—";
export const overallOf = (e) => {
    const stored = Number(e.calculatedStats?.overallScore);
    if (stored > 0) return stored;
    const vals = ["understanding", "commitment", "attendance", "participation"]
        .map((k) => Number(e.criteria?.[k]))
        .filter((n) => Number.isFinite(n) && n > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
};
export const evalDate = (e) => e.metadata?.evaluatedAt || e.createdAt;

export function exportCsv(rows) {
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

/** بيبني تقرير طالب من قائمة تقييماته */
export function buildStudentReport(rawList) {
    const list = [...(rawList || [])].sort((a, b) => new Date(evalDate(a)) - new Date(evalDate(b)));
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
}