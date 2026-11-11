"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    ClipboardCheck, Loader2, Inbox, Search, Star, ThumbsUp, LayoutGrid, List, Flame,
    ShieldAlert, Download, PieChart, BarChart3, Users,
} from "lucide-react";
import toast from "react-hot-toast";

import {
    CRITERIA, DECISIONS, CATEGORIES,
    card, soft, muted, focusRing, inputCls,
    formatDate, fix1, scoreTone,
    studentName, groupName, sessionTitle, instructorName, overallOf, evalDate,
    avg, exportCsv, buildStudentReport,
} from "./_components/helpers";

import {
    ScoreRing, Sparkline, Trend, CriteriaBars, Donut, Skyline,
    Chip, Avatar, CriteriaPills, HeroStat, Panel,
    ReportDialog,
} from "./_components/ReportDialog";

/* ═════════════ Page ═════════════ */

export default function StudentEvaluationsPage() {
    const [evaluations, setEvaluations] = useState([]);
    const [loading, setLoading] = useState(true);

    const [view, setView] = useState("students");
    const [search, setSearch] = useState("");
    const [decision, setDecision] = useState("all");
    const [groupId, setGroupId] = useState("all");
    const [sort, setSort] = useState("recent");

    const [selectedStudent, setSelectedStudent] = useState(null);

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

    useEffect(() => { fetchEvaluations(); }, [fetchEvaluations]);

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
        const LOW_CATS = ["at_risk", "needs_repeat"];
        return studentRows
            .map((s) => {
                const reasons = [];
                const cat = s.last.marketing?.studentCategory;
                if (LOW_CATS.includes(cat)) reasons.push(CATEGORIES[cat].label);
                if (s.last.finalDecision && s.last.finalDecision !== "pass") reasons.push(`آخر قرار: ${DECISIONS[s.last.finalDecision]?.label}`);
                if (s.overall > 0 && s.overall < 3) reasons.push("معدل منخفض");
                if (s.count > 1 && s.trend <= -0.5) reasons.push("تراجع في المستوى");
                CRITERIA.forEach((c) => {
                    const v = Number(s.last.criteria?.[c.key]);
                    if (v > 0 && v <= 2) reasons.push(`${c.label} ضعيف`);
                });
                return { ...s, reasons };
            })
            .filter((s) => s.reasons.length > 0)
            .sort((a, b) => b.reasons.length - a.reasons.length || a.overall - b.overall)
            .slice(0, 5);
    }, [studentRows]);

    const watchList = useMemo(
        () => [...studentRows].filter((s) => s.overall > 0).sort((a, b) => a.overall - b.overall).slice(0, 3),
        [studentRows],
    );

    const attentionRow = (s) => (
        <li key={s.id}>
            <button onClick={() => openStudent(s.id)}
                className={`w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-right hover:bg-gray-50 dark:hover:bg-darkhover transition-colors ${focusRing}`}>
                <ScoreRing score={s.overall} size={38} stroke={4} />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{s.name}</p>
                    <p className={`text-[11px] truncate ${muted}`}>{s.group}</p>
                    {s.reasons?.length > 0 && (
                        <p className="text-[10px] truncate text-rose-600 dark:text-rose-400">{s.reasons.slice(0, 2).join(" • ")}</p>
                    )}
                </div>
                <Trend value={s.trend} compact />
            </button>
        </li>
    );

    const report = useMemo(() => {
        if (!selectedStudent) return null;
        return buildStudentReport(evaluations.filter((e) => e.studentId?._id === selectedStudent.id));
    }, [selectedStudent, evaluations]);

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
                <button onClick={() => (filtered.length ? exportCsv(filtered) : toast.error("مفيش بيانات للتصدير"))}
                    className={`px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-accent-hover shadow-brand-sm inline-flex items-center gap-2 transition-colors ${focusRing}`}>
                    <Download className="w-4 h-4" />تصدير CSV
                </button>
            </div>

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

            <div className={`${card} p-3 sm:p-4 space-y-3`}>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم الطالب أو رقم القيد..." className={`${inputCls} pr-10`} />
                    </div>
                    <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={`${inputCls} !w-auto min-w-[150px]`}>
                        <option value="all">كل الجروبات</option>
                        {groupOptions.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
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
                            <button key={tab.id} role="tab" aria-selected={view === tab.id} onClick={() => setView(tab.id)}
                                className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 ${focusRing} ${view === tab.id ? "bg-white dark:bg-darklight text-primary shadow-sm" : "text-gray-500 dark:text-darkmuted hover:text-gray-800 dark:hover:text-white"}`}>
                                <tab.icon className="w-4 h-4" />{tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {[{ id: "all", label: "الكل", hex: "#004d59" }, ...Object.entries(DECISIONS).map(([id, v]) => ({ id, label: v.label, hex: v.hex }))].map((d) => {
                        const on = decision === d.id;
                        return (
                            <button key={d.id} onClick={() => setDecision(d.id)} aria-pressed={on}
                                className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all ${focusRing} ${on ? "text-white border-transparent shadow-sm" : "border-gray-200 dark:border-dark_border text-gray-600 dark:text-darkmuted hover:bg-gray-50 dark:hover:bg-darkhover"}`}
                                style={on ? { backgroundColor: d.hex } : undefined}>
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
                            {attention.length > 0 && (
                                <span className="mr-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                                    {attention.length}
                                </span>
                            )}
                        </div>
                        {attention.length > 0 ? (
                            <ul className="space-y-1">{attention.map(attentionRow)}</ul>
                        ) : (
                            <div>
                                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-3">
                                    <ThumbsUp className="w-4 h-4 shrink-0" />مفيش طلبة في خطر حالياً
                                </div>
                                {watchList.length > 0 && (
                                    <>
                                        <p className={`text-[11px] mb-1.5 ${muted}`}>الأقل درجة (للمتابعة)</p>
                                        <ul className="space-y-1">{watchList.map(attentionRow)}</ul>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                            <button key={s.id} onClick={() => openStudent(s.id)}
                                className={`${card} group relative text-right p-5 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 transition-all overflow-hidden ${focusRing}`}>
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
                            <button key={e._id} onClick={() => openStudent(e.studentId._id, e._id)}
                                className={`${card} relative w-full text-right grid gap-3 md:gap-5 md:grid-cols-[auto_minmax(0,1.2fr)_auto_auto] items-center pr-6 pl-4 py-3.5 hover:shadow-md hover:border-primary/40 transition-all overflow-hidden ${focusRing}`}>
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