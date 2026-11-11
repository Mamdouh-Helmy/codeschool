"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
    Star, TrendingUp, TrendingDown, Minus, Sparkles, AlertCircle, MessageSquareText,
    UserRound, X, ChevronRight, ChevronLeft, ChevronDown, Lightbulb, Layers, Users,
    Gauge, History,
} from "lucide-react";

import {
    CRITERIA, DECISIONS, CATEGORIES, WEAK_LABEL, STRENGTH_LABEL, NEXT_STEP_LABEL,
    GOOD_CHIP, WARN_CHIP, INFO_CHIP, NEUTRAL_CHIP,
    noScroll, card, soft, muted, focusRing,
    formatDate, initials, fix1, scoreTone,
    studentName, groupName, sessionTitle, instructorName, overallOf, evalDate,
} from "./helpers";

/* ═════════════ Visual primitives ═════════════ */

export function ScoreRing({ score, size = 56, stroke = 5, showMax = false, onDark = false }) {
    const tone = scoreTone(score);
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const dash = (Math.min(score, 5) / 5) * c;
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
                    className={onDark ? "stroke-white/15" : "stroke-gray-100 dark:stroke-white/10"} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone.hex} strokeWidth={stroke}
                    strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`}
                    style={{ transition: "stroke-dasharray 700ms cubic-bezier(.4,0,.2,1)" }} />
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

export function Sparkline({ values, width = 88, height = 28 }) {
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

export function Trend({ value, compact = false }) {
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
            {up ? "+" : ""}{fix1(value)}
        </span>
    );
}

export function CriteriaBars({ values }) {
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

export function Donut({ data, size = 124, stroke = 15 }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    let offset = 0;
    return (
        <div className="flex items-center gap-5 w-full">
            <div className="relative shrink-0" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-gray-100 dark:stroke-white/10" />
                    {total > 0 && data.map((d) => {
                        if (!d.value) return null;
                        const len = (d.value / total) * c;
                        const seg = Math.max(len - 3, 0);
                        const node = (
                            <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color}
                                strokeWidth={stroke} strokeDasharray={`${seg} ${c - seg}`} strokeDashoffset={-offset} strokeLinecap="round" />
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

export function TrendChart({ points }) {
    const W = 640, H = 220, padL = 30, padR = 16, padT = 22, padB = 30;
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
                        <text x={x(i)} y={H - 10} textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: 10 }}>{p.label}</text>
                    )}
                </g>
            ))}
        </svg>
    );
}

export function Skyline({ rows, onOpen }) {
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
                <div className={`absolute inset-0 pr-5 flex items-end gap-1 overflow-x-auto ${noScroll}`}>
                    {sorted.map((s) => {
                        const tone = scoreTone(s.overall);
                        return (
                            <button key={s.id} onClick={() => onOpen(s.id)} title={`${s.name} — ${fix1(s.overall)}`} aria-label={`${s.name}: ${fix1(s.overall)}`}
                                className={`group relative flex-1 min-w-[7px] max-w-[48px] rounded-t-md transition-all duration-200 hover:brightness-125 hover:-translate-y-1 ${focusRing}`}
                                style={{ height: `${Math.max((s.overall / 5) * 100, 4)}%`, background: `linear-gradient(to top, ${tone.hex}33, ${tone.hex})` }}>
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

export function Chip({ children, className = "" }) {
    return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset ${className}`}>
            {children}
        </span>
    );
}

export function Avatar({ name, color, size = "md" }) {
    const cls = size === "lg" ? "w-14 h-14 text-lg" : size === "sm" ? "w-9 h-9 text-xs" : "w-11 h-11 text-sm";
    return (
        <div className={`${cls} rounded-full flex items-center justify-center font-bold text-white shrink-0 shadow-sm`}
            style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}>
            {initials(name)}
        </div>
    );
}

export function CriteriaPills({ criteria, large = false }) {
    return (
        <div className="flex items-center gap-1.5">
            {CRITERIA.map((c) => {
                const v = criteria?.[c.key] || 0;
                const tone = scoreTone(v);
                return (
                    <div key={c.key} title={c.label}
                        className={`flex flex-col items-center justify-center rounded-xl ${soft} ${large ? "w-16 py-2.5" : "w-11 py-1.5"}`}>
                        <span className={`${large ? "text-lg" : "text-sm"} font-black tabular-nums leading-none ${tone.text}`}>{v}</span>
                        <span className={`${large ? "text-[11px] mt-1.5" : "text-[9px] mt-1"} leading-none ${muted}`}>{c.label}</span>
                    </div>
                );
            })}
        </div>
    );
}

export function HeroStat({ icon: Icon, label, value, unit, sub }) {
    return (
        <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-amber-brand" />
            </span>
            <div className="min-w-0">
                <p className="text-[11px] text-white/60 truncate">{label}</p>
                <p className="text-xl font-black text-white tabular-nums leading-tight">
                    {value}{unit && <span className="text-xs font-medium text-white/60 mr-1">{unit}</span>}
                </p>
                {sub && <p className="text-[10px] text-white/50 truncate">{sub}</p>}
            </div>
        </div>
    );
}

export function Panel({ title, icon: Icon, children, className = "" }) {
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

export function SectionHeading({ id, icon: Icon, title, hint }) {
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

/* ═════════════ SessionRow ═════════════ */

function SessionRow({ e, open, onToggle }) {
    const dec = DECISIONS[e.finalDecision];
    const cat = CATEGORIES[e.marketing?.studentCategory];
    const ai = e.marketing?.aiAnalysis;
    const score = overallOf(e);
    const tone = scoreTone(score);

    return (
        <div id={`eval-${e._id}`} className={`rounded-2xl border transition-colors ${open ? "border-primary/40 bg-primary/[0.03] dark:bg-primary/[0.06]" : "border-gray-200 dark:border-dark_border"}`}>
            <button onClick={onToggle} aria-expanded={open} className={`w-full flex items-center gap-3 px-4 py-3 text-right rounded-2xl ${focusRing}`}>
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

/* ═════════════ ReportDialog ═════════════ */

export function ReportDialog({ report, rows, focusEvalId, onClose, onSelect, onPrev, onNext, position, hideRail = false }) {
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
        const onKey = (ev) => { if (ev.key === "Escape") onClose?.(); };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [onClose]);

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

    const trendWord = report.list.length < 2 ? "" : report.trend > 0.05 ? "ومستواه في تحسن مستمر." : report.trend < -0.05 ? "ومستواه في تراجع ومحتاج متابعة." : "ومستواه ثابت.";

    const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    const navBtn = `w-9 h-9 rounded-xl border border-gray-200 dark:border-dark_border text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-darkhover flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition ${focusRing}`;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-5" style={{ height: "100dvh" }} dir="rtl" role="dialog" aria-modal="true" aria-label="تقرير الطالب">
            <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${show ? "opacity-100" : "opacity-0"}`} onClick={onClose} aria-hidden="true" />

            <div className={`relative w-full max-w-6xl h-[94dvh] sm:h-[90dvh] flex overflow-hidden rounded-3xl bg-white dark:bg-darklight shadow-2xl border border-gray-200 dark:border-dark_border transition-all duration-500 ${show ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"}`}>
                {/* Rail */}
                <aside className={`${hideRail ? "hidden" : "hidden lg:flex"} w-72 shrink-0 flex-col border-l border-gray-200 dark:border-dark_border bg-gray-50 dark:bg-darkmode`}>
                    <div className="px-4 py-4 border-b border-gray-200 dark:border-dark_border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            <h3 className="text-sm font-bold text-secondary dark:text-white">الطلبة</h3>
                        </div>
                        <span className={`text-xs tabular-nums ${muted}`}>{rows.length}</span>
                    </div>
                    <ul className={`flex-1 overflow-y-auto overscroll-contain p-2 space-y-1 ${noScroll}`}>
                        {rows.map((s) => {
                            const on = s.id === studentId;
                            const t = scoreTone(s.overall);
                            return (
                                <li key={s.id}>
                                    <button id={`rail-${s.id}`} onClick={() => onSelect(s.id)} aria-current={on}
                                        className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-right transition-colors border-r-[3px] ${focusRing} ${on ? "bg-white dark:bg-darklight shadow-sm border-primary" : "border-transparent hover:bg-white/70 dark:hover:bg-darkhover"}`}>
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

                {/* Main */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <span className="h-1 shrink-0" style={{ background: `linear-gradient(to left, ${tone.hex}, #feaf00)` }} aria-hidden="true" />

                    <header className="shrink-0 px-5 sm:px-7 py-4 flex items-center gap-4 border-b border-gray-200 dark:border-dark_border">
                        <Avatar name={studentName(report.head)} color={tone.hex} size="lg" />
                        <div className="min-w-0 flex-1">
                            <h2 className="!text-xl sm:!text-2xl !leading-tight font-black text-secondary dark:text-white truncate">{studentName(report.head)}</h2>
                            <p className={`text-xs mt-0.5 ${muted}`} dir="ltr">{report.head.studentId?.enrollmentNumber}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {newestCat && <Chip className={newestCat.chip}>{newestCat.label}</Chip>}
                                {groups.slice(0, 3).map((g) => (
                                    <Chip key={g} className={NEUTRAL_CHIP}>
                                        <Layers className="w-3 h-3" />{g}
                                    </Chip>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={onPrev} disabled={!onPrev} aria-label="الطالب السابق" className={navBtn}><ChevronRight className="w-5 h-5" /></button>
                            <span className={`text-xs tabular-nums px-1 hidden sm:inline ${muted}`}>{position}</span>
                            <button onClick={onNext} disabled={!onNext} aria-label="الطالب التالي" className={navBtn}><ChevronLeft className="w-5 h-5" /></button>
                            <button onClick={onClose} aria-label="إغلاق" className={`${navBtn} mr-1 bg-gray-100 dark:bg-dark_input`}><X className="w-5 h-5" /></button>
                        </div>
                    </header>

                    <div ref={scroller} className={`flex-1 overflow-y-auto overscroll-contain ${noScroll}`}>
                        <nav className={`sticky top-0 z-10 flex gap-1.5 overflow-x-auto px-5 sm:px-7 py-2.5 bg-white/90 dark:bg-darklight/90 backdrop-blur border-b border-gray-200/70 dark:border-dark_border ${noScroll}`} aria-label="أقسام التقرير">
                            {[
                                { id: "rp-summary", label: "الملخص", icon: Gauge },
                                { id: "rp-criteria", label: "المعايير", icon: Star },
                                ...(report.list.length > 1 ? [{ id: "rp-trend", label: "التطور", icon: TrendingUp }] : []),
                                { id: "rp-notes", label: "نقاط القوة والضعف", icon: Lightbulb },
                                { id: "rp-sessions", label: `السيشنات (${report.list.length})`, icon: History },
                            ].map((n) => (
                                <button key={n.id} onClick={() => jump(n.id)}
                                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-gray-100 dark:bg-dark_input text-gray-600 dark:text-gray-300 hover:bg-primary/10 hover:text-primary transition-colors ${focusRing}`}>
                                    <n.icon className="w-3.5 h-3.5" />{n.label}
                                </button>
                            ))}
                        </nav>

                        <div className="p-4 sm:p-5 space-y-4">
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

                            {report.list.length > 1 && (
                                <section className={`${card} p-4`}>
                                    <div className="flex items-start justify-between">
                                        <SectionHeading id="rp-trend" icon={TrendingUp} title="تطور المعدل" hint="عبر السيشنات" />
                                        <Trend value={report.trend} />
                                    </div>
                                    <div className="max-h-52 flex justify-center"><TrendChart points={trendPoints} /></div>
                                </section>
                            )}

                            <section className={`${card} p-4`}>
                                <SectionHeading id="rp-notes" icon={Lightbulb} title="نقاط القوة والضعف" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/[0.05] p-3.5">
                                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5" /> نقاط القوة
                                        </p>
                                        {report.strengths.length ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {report.strengths.map((s) => <Chip key={s.key} className={GOOD_CHIP}>{s.label}{s.n > 1 && ` ×${s.n}`}</Chip>)}
                                            </div>
                                        ) : (<p className={`text-xs ${muted}`}>لسه مفيش نقاط قوة مرصودة.</p>)}
                                    </div>
                                    <div className="rounded-xl border border-amber-200/70 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/[0.05] p-3.5">
                                        <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                                            <AlertCircle className="w-3.5 h-3.5" /> نقاط تحتاج تحسين
                                        </p>
                                        {report.weak.length ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {report.weak.map((s) => <Chip key={s.key} className={WARN_CHIP}>{s.label}{s.n > 1 && ` ×${s.n}`}</Chip>)}
                                            </div>
                                        ) : (<p className={`text-xs ${muted}`}>مفيش نقاط ضعف مرصودة.</p>)}
                                    </div>
                                </div>
                                {newest.marketing?.nextSteps?.length > 0 && (
                                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                        <span className={`text-xs ${muted}`}>الخطوات المقترحة:</span>
                                        {newest.marketing.nextSteps.map((k) => <Chip key={k} className={INFO_CHIP}>{NEXT_STEP_LABEL[k] || k}</Chip>)}
                                    </div>
                                )}
                            </section>

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

export default ReportDialog;