// components/admin/MakeupLinksPicker.jsx
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Link2, AlertCircle, CheckCircle, Loader2, AlertTriangle, Info,
  RefreshCw, ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";

const cardCls =
  "rounded-2xl border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darklight shadow-sm";

export default function MakeupLinksPicker({
  schedule,
  selectedLinks,
  setSelectedLinks,
  forceActivate,
  setForceActivate,
  releaseReserved,
  setReleaseReserved,
  isAr = true,
}) {
  const t = (ar, en) => (isAr ? ar : en);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // ✅ بناء scheduleKey كـ string فقط — مش محتاجين الـ object نفسه
  const scheduleKey = useMemo(() => {
    if (!schedule?.daysOfWeek?.length || !schedule?.timeFrom || !schedule?.timeTo) {
      return "";
    }
    return `${schedule.daysOfWeek.join(",")}|${schedule.timeFrom}|${schedule.timeTo}`;
  }, [
    // ✅ بنستخدم primitive values في الـ deps بدل الـ object نفسه
    schedule?.daysOfWeek?.join(","),
    schedule?.timeFrom,
    schedule?.timeTo,
  ]);

  // ✅ Ref لمنع الـ fetch المتكرر — لو نفس الـ scheduleKey اتفحص قبل كده، متعملش fetch تاني
  const lastFetchedKeyRef = useRef(null);

  // ✅ fetchAvailableLinks — معتمد على scheduleKey (string) بس
  const fetchAvailableLinks = useCallback(async () => {
    if (!scheduleKey) return;

    // ✅ لو نفس الـ scheduleKey اتفحص قبل كده → متعملش fetch تاني
    if (lastFetchedKeyRef.current === scheduleKey && data) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [days, timeFrom, timeTo] = scheduleKey.split("|");
      const params = new URLSearchParams({
        action: "available-links",
        days,
        timeFrom,
        timeTo,
      });

      const res = await fetch(`/api/admin/makeup-session?${params}`, {
        cache: "no-store",
      });
      const json = await res.json();

      if (json.success) {
        setData(json.data);
        lastFetchedKeyRef.current = scheduleKey;
      } else {
        setError(json.error || t("فشل تحميل اللينكات", "Failed to load links"));
        toast.error(json.error || t("فشل تحميل اللينكات", "Failed to load links"));
      }
    } catch (err) {
      console.error("❌ MakeupLinksPicker fetch error:", err);
      setError(err.message);
      toast.error(t("خطأ في الاتصال", "Connection error"));
    } finally {
      setLoading(false);
    }
  }, [scheduleKey, data]); // ✅ بس scheduleKey (string) و data — مش الـ object

  useEffect(() => {
    fetchAvailableLinks();
  }, [fetchAvailableLinks]);

  // ✅ دلوقتي الـ fetch مش هيتكرر لأنه:
  // - scheduleKey مش بيتغير لو القيم نفسها
  // - lastFetchedKeyRef بيمنع الـ fetch المتكرر

  const toggleLink = (id) => {
    const idStr = id?.toString();
    setSelectedLinks((prev) =>
      prev.includes(idStr) ? prev.filter((x) => x !== idStr) : [...prev, idStr],
    );
  };

  const {
    availableLinks = [],
    reservedLinks = [],
    hasNoLinks = false,
    hasAvailableLinks = false,
    totalLinks = 0,
  } = data || {};

  const canProceed = forceActivate || selectedLinks.length > 0;

  // ═════════════════════════════════════════════════════════════════════
  // Loading
  // ═════════════════════════════════════════════════════════════════════
  if (loading && !data) {
    return (
      <div className={`${cardCls} p-8`}>
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="text-sm text-SlateBlueText dark:text-darktext">
            {t("جاري فحص اللينكات المتاحة...", "Checking available links...")}
          </p>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // Error state
  // ═════════════════════════════════════════════════════════════════════
  if (error) {
    return (
      <div className={`${cardCls} p-6`}>
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-900/20">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
              {t("فشل تحميل اللينكات", "Failed to load links")}
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 break-words">{error}</p>
            <button
              type="button"
              onClick={() => {
                lastFetchedKeyRef.current = null;
                fetchAvailableLinks();
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition"
            >
              <RefreshCw className="w-3 h-3" />
              {t("إعادة المحاولة", "Retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // Main render
  // ═════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] to-orange-deep/[0.04] dark:from-primary/15 dark:to-orange-deep/10 p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-orange-deep flex items-center justify-center">
            <Link2 className="w-3.5 h-3.5 text-white" />
          </span>
          <h4 className="text-sm font-bold text-MidnightNavyText dark:text-white">
            {t("اختيار لينك الحصة التعويضية", "Select Make-up Session Link")}
          </h4>
        </div>
        <p className="text-xs text-SlateBlueText dark:text-darktext ps-9">
          {t(
            "اختار لينك واحد على الأقل للجدول ده. اللينكات المعروضة اتفحصت ومش متعارضة مع جروبات تانية.",
            "Choose at least one link for this schedule. Displayed links have been checked and don't conflict with other groups.",
          )}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darklight p-3 text-center">
          <p className="text-[10px] text-SlateBlueText dark:text-darktext">{t("إجمالي اللينكات", "Total Links")}</p>
          <p className="text-lg font-bold text-MidnightNavyText dark:text-white tabular-nums">{totalLinks}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-center">
          <p className="text-[10px] text-emerald-700 dark:text-emerald-400">{t("متاحة", "Available")}</p>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{availableLinks.length}</p>
        </div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-center">
          <p className="text-[10px] text-amber-700 dark:text-amber-400">{t("متعارضة", "Reserved")}</p>
          <p className="text-lg font-bold text-amber-700 dark:text-amber-400 tabular-nums">{reservedLinks.length}</p>
        </div>
      </div>

      {/* No links */}
      {hasNoLinks && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-900/20">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 text-xs text-rose-800 dark:text-rose-300">
            <p className="font-bold">{t("مفيش أي لينك في النظام", "No links available in the system")}</p>
            <p className="mt-1">
              {t(
                "تقدر تضيف لينكات من صفحة إدارة اللينكات الأول، أو تختار \"إنشاء من غير لينك\" من تحت.",
                "You can add links from the links management page first, or choose \"Create without link\" below.",
              )}
            </p>
          </div>
        </div>
      )}

      {/* All reserved */}
      {!hasNoLinks && !hasAvailableLinks && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 text-xs text-amber-800 dark:text-amber-300">
            <p className="font-bold">{t("كل اللينكات متعارضة مع الجدول", "All links conflict with the schedule")}</p>
            <p className="mt-1">
              {t(
                "الجدول ده (اليوم والوقت) متعارض مع حجوزات موجودة. جرّب تعمل حجز جديد من صفحة اللينكات، أو إنشاء من غير لينك.",
                "This schedule (day + time) conflicts with existing reservations. Try booking a new link from the links page, or create without a link.",
              )}
            </p>
          </div>
        </div>
      )}

      {/* Available links */}
      {availableLinks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-MidnightNavyText dark:text-white">
              {t("لينكات متاحة", "Available Links")}
            </h3>
            <span className="text-xs text-SlateBlueText dark:text-darktext">({availableLinks.length})</span>
          </div>
          <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pe-1">
            {availableLinks.map((link) => {
              const idStr = (link._id || link.id)?.toString();
              const isSelected = selectedLinks.includes(idStr);
              return (
                <label
                  key={idStr}
                  className={`group flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                    isSelected
                      ? "border-primary/50 bg-gradient-to-br from-primary/[0.06] to-orange-deep/[0.04] dark:from-primary/15 dark:to-orange-deep/10 ring-1 ring-primary/20"
                      : "border-PowderBlueBorder dark:border-dark_border hover:border-primary/30 hover:bg-gray-50 dark:hover:bg-dark_input"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleLink(idStr)}
                    className="mt-1 h-4 w-4 rounded text-primary focus:ring-primary flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-MidnightNavyText dark:text-white">{link.name}</p>
                      {link.platform && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          {link.platform}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-SlateBlueText dark:text-darktext truncate">{link.link}</p>
                  </div>
                  {link.link && (
                    <a
                      href={link.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-700 transition"
                      title={t("فتح اللينك", "Open link")}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Reserved links */}
      {reservedLinks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-MidnightNavyText dark:text-white">
              {t("لينكات متعارضة", "Reserved Links")}
            </h3>
            <span className="text-xs text-SlateBlueText dark:text-darktext">({reservedLinks.length})</span>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pe-1">
            {reservedLinks.map((link) => (
              <div
                key={link._id || link.id}
                className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3"
              >
                <p className="text-sm font-medium text-MidnightNavyText dark:text-white">{link.name}</p>
                <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                  {t("متعارض في:", "Conflicts at:")} {(link.reservedDays || []).join(", ")}
                  {link.reservedTime ? ` · ${link.reservedTime}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced options */}
      <div className="space-y-2.5 rounded-2xl border border-PowderBlueBorder dark:border-dark_border bg-gray-50/60 dark:bg-dark_input/40 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <p className="text-xs font-bold text-SlateBlueText dark:text-darktext">
            {t("خيارات متقدمة", "Advanced Options")}
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={releaseReserved}
            onChange={(e) => setReleaseReserved(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded text-primary focus:ring-primary flex-shrink-0"
          />
          <div className="text-xs text-MidnightNavyText dark:text-slate-200">
            <p className="font-medium">{t("فك الحجز عن اللينكات المتعارضة تلقائيًا", "Auto-release conflicting reservations")}</p>
            <p className="text-[11px] text-SlateBlueText dark:text-darktext mt-0.5">
              {t("هيتم فك حجز اللينكات المتعارضة (على مسؤوليتك).", "Conflicting links will have their reservations released (at your own risk).")}
            </p>
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={forceActivate}
            onChange={(e) => setForceActivate(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded text-primary focus:ring-primary flex-shrink-0"
          />
          <div className="text-xs text-MidnightNavyText dark:text-slate-200">
            <p className="font-medium">{t("إنشاء الحصة من غير لينك", "Create session without a link")}</p>
            <p className="text-[11px] text-SlateBlueText dark:text-darktext mt-0.5">
              {t("مفيد لو مفيش لينكات متاحة حاليًا. تقدر تضيف لينك بعدين من صفحة الجروبات.", "Useful if no links are available now. You can assign a link later from the groups page.")}
            </p>
          </div>
        </label>
      </div>

      {/* Footer notes */}
      {selectedLinks.length > 0 && !forceActivate && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 p-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <p className="text-xs text-emerald-800 dark:text-emerald-300">
            {t(`تم اختيار ${selectedLinks.length} لينك. اضغط "التالي" للمتابعة.`, `${selectedLinks.length} link(s) selected. Click "Next" to continue.`)}
          </p>
        </div>
      )}

      {forceActivate && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            {t("الحصة هتتعمل من غير لينك. اضغط \"التالي\" للمتابعة.", "The session will be created without a link. Click \"Next\" to continue.")}
          </p>
        </div>
      )}
    </div>
  );
}