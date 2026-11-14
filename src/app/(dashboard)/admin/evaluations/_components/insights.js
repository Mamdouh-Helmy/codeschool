// app/(dashboard)/admin/evaluations/_components/insights.js
// محرك التحليل: بياخد تقرير الطالب (من buildStudentReport) ويطلّع مؤشرات + توقع + جمل تحليل + توصيات.
import { CRITERIA, NEXT_STEP_LABEL, WEAK_LABEL, fix1, overallOf, scoreTone, studentName } from "./helpers";

const clamp = (n, a, b) => Math.min(Math.max(n, a), b);

/** انحدار خطي بسيط: y = intercept + slope * x */
export function linreg(values) {
    const n = values.length;
    if (n < 2) return { slope: 0, intercept: values[0] || 0 };
    const mx = (n - 1) / 2;
    const my = values.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    values.forEach((y, x) => {
        num += (x - mx) * (y - my);
        den += (x - mx) ** 2;
    });
    const slope = den ? num / den : 0;
    return { slope, intercept: my - slope * mx };
}

export function stdev(values) {
    if (values.length < 2) return 0;
    const m = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length);
}

const ACTION_BY_CRITERION = {
    understanding: "جلسة شرح إضافية للنقاط اللي لسه مش واضحة عنده",
    commitment: "متابعة أسبوعية للواجبات والتسليمات مع ولي الأمر",
    attendance: "التواصل مع ولي الأمر لمعرفة أسباب الغياب وحلّها بدري",
    participation: "أنشطة تفاعلية صغيرة تشجّعه على المشاركة في السيشن",
};

export const HEALTH_TONE = (h) =>
    h >= 75
        ? { hex: "#10b981", label: "أداء قوي", text: "text-emerald-600 dark:text-emerald-400" }
        : h >= 55
          ? { hex: "#f59e0b", label: "مستقر ويحتاج دفعة", text: "text-amber-600 dark:text-amber-400" }
          : { hex: "#f43f5e", label: "يحتاج تدخل", text: "text-rose-600 dark:text-rose-400" };

export const RISK_META = {
    low: { label: "مستوى الخطر: منخفض", chip: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" },
    mid: { label: "مستوى الخطر: متوسط", chip: "bg-amber-500/15 text-amber-300 ring-amber-400/30" },
    high: { label: "مستوى الخطر: مرتفع", chip: "bg-rose-500/15 text-rose-300 ring-rose-400/30" },
};

export function buildInsights(report) {
    const name = studentName(report.head);
    const series = report.list.map(overallOf);
    const n = series.length;
    const { slope, intercept } = linreg(series);
    const sd = stdev(series);
    const consistency = n < 2 ? 100 : Math.round(100 - clamp(sd / 1.5, 0, 1) * 100);

    const crit = CRITERIA.map((c) => ({ ...c, v: report.criteriaAvg[c.key] || 0 })).sort((a, b) => b.v - a.v);
    const best = crit[0];
    const worst = crit[crit.length - 1];

    const trendPart = n < 2 ? 50 : clamp(50 + slope * 60, 0, 100);
    const health = Math.round(clamp((report.overall / 5) * 60 + report.passRate * 0.25 + trendPart * 0.15, 0, 100));

    const forecast = n >= 2 ? [clamp(intercept + slope * n, 1, 5), clamp(intercept + slope * (n + 1), 1, 5)] : [];

    const risk = health < 50 || report.overall < 2.5 ? "high" : health < 70 || (n > 1 && slope < -0.15) ? "mid" : "low";

    const bestIdx = series.indexOf(Math.max(...series));
    const worstIdx = series.indexOf(Math.min(...series));

    const tone = scoreTone(report.overall);
    const lines = [];

    lines.push({
        tone: tone.label === "يحتاج دعم" ? "warn" : "good",
        text: `${name} متوسطه العام ${fix1(report.overall)} من 5 (${tone.label}) عبر ${n} ${n === 1 ? "تقييم" : "تقييمات"}، ونسبة اجتيازه ${report.passRate}%.`,
    });

    if (best.v - worst.v >= 0.4) {
        lines.push({
            tone: "info",
            text: `أقوى معيار عنده «${best.label}» (${fix1(best.v)})، وأضعفها «${worst.label}» (${fix1(worst.v)}) — الفرق ${fix1(best.v - worst.v)} درجة.`,
        });
    } else {
        lines.push({ tone: "info", text: `معاييره متوازنة تقريباً، من غير فجوة واضحة بين «${best.label}» و«${worst.label}».` });
    }

    if (n >= 2) {
        if (slope > 0.08) {
            lines.push({
                tone: "good",
                text: `الاتجاه صاعد: بيكسب تقريباً ${fix1(slope)} درجة في كل سيشن، والتوقع للسيشن الجاية ${fix1(forecast[0])}.`,
            });
        } else if (slope < -0.08) {
            lines.push({
                tone: "warn",
                text: `في تراجع تدريجي (${fix1(slope)} درجة لكل سيشن)، ولو الوضع كمل هيوصل لحوالي ${fix1(forecast[0])} في السيشن الجاية.`,
            });
        } else {
            lines.push({ tone: "info", text: `مستواه ثابت تقريباً، والتوقع للسيشن الجاية حوالي ${fix1(forecast[0])}.` });
        }
        lines.push({
            tone: consistency >= 75 ? "good" : "warn",
            text:
                consistency >= 75
                    ? `الأداء منتظم (ثبات ${consistency}%) — مفيش قفزات مفاجئة بين السيشنات.`
                    : `الأداء متذبذب (ثبات ${consistency}%) — أفضل سيشن ${fix1(series[bestIdx])} وأضعف سيشن ${fix1(series[worstIdx])}.`,
        });
    }

    const topWeak = report.weak[0];
    if (topWeak) {
        lines.push({
            tone: "warn",
            text: `أكتر نقطة ضعف اتكررت: «${topWeak.label}»${topWeak.n > 1 ? ` (اتسجلت ${topWeak.n} مرات)` : ""}.`,
        });
    }
    const topStrength = report.strengths[0];
    if (topStrength) {
        lines.push({ tone: "good", text: `أبرز ميزة بيتميز بيها: «${topStrength.label}».` });
    }

    const actions = [];
    if (worst.v < 3.6) actions.push({ title: ACTION_BY_CRITERION[worst.key], source: "ai" });
    if (n > 1 && slope < -0.08) actions.push({ title: "جلسة تغذية راجعة سريعة قبل ما الفجوة تكبر", source: "ai" });
    if (consistency < 60) actions.push({ title: "خطة مذاكرة أسبوعية ثابتة لتقليل التذبذب", source: "ai" });
    if (topWeak && WEAK_LABEL[topWeak.key] && actions.length < 3) {
        actions.push({ title: `تدريبات مركّزة على «${topWeak.label}»`, source: "ai" });
    }
    (report.newest.marketing?.nextSteps || []).forEach((k) =>
        actions.push({ title: NEXT_STEP_LABEL[k] || k, source: "instructor" }),
    );
    if (actions.length === 0) actions.push({ title: "كمّل بنفس الأداء — جاهز لتحدّي أصعب", source: "ai" });

    return { health, consistency, slope, forecast, risk, best, worst, bestIdx, worstIdx, lines, actions: actions.slice(0, 6) };
}