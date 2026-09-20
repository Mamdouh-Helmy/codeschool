// components/Dashboard/shared/DateRangePicker.tsx
"use client";

import { Icon } from "@iconify/react";
import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";
import { getWeekdays, getMonths } from "@/i18n/messages";

type DateRange = { from: Date | null; to: Date | null };

type Props = {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  placeholder?: string;
  className?: string;
};

const DateRangePicker = ({ value, onChange, placeholder, className = "" }: Props) => {
  const { locale: rawLocale } = useLocale();
  const locale = (rawLocale as "ar" | "en") || "en";
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(value || { from: null, to: null });
  const [viewMonth, setViewMonth] = useState<Date>(new Date());
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setRange(value);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const weekdays = getWeekdays(locale);
  const months = getMonths(locale);
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: Array<{ date: Date; inMonth: boolean }> = [];
  for (let i = firstDay - 1; i >= 0; i--) days.push({ date: new Date(year, month, -i), inMonth: false });
  for (let i = 1; i <= daysInMonth; i++) days.push({ date: new Date(year, month, i), inMonth: true });
  while (days.length < 42) {
    const last = days[days.length - 1].date;
    days.push({
      date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
      inMonth: false,
    });
  }

  const isSameDay = (a: Date | null, b: Date | null) =>
    !!a && !!b && a.toDateString() === b.toDateString();
  const isInRange = (d: Date) => range.from && range.to && d >= range.from && d <= range.to;

  const handleDayClick = (date: Date) => {
    if (!range.from || (range.from && range.to)) {
      const next = { from: date, to: null };
      setRange(next);
      onChange?.(next);
    } else if (range.from && !range.to) {
      const next = date < range.from
        ? { from: date, to: range.from }
        : { from: range.from, to: date };
      setRange(next);
      onChange?.(next);
      setOpen(false);
    }
  };

  const formatDisplay = () => {
    if (!range.from && !range.to) return placeholder || t("calendar.selectRange");
    const fmt = (d: Date) =>
      d.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
        month: "short",
        day: "numeric",
      });
    if (range.from && range.to) return `${fmt(range.from)} → ${fmt(range.to)}`;
    if (range.from) return `${fmt(range.from)} → ...`;
    return placeholder || t("calendar.selectRange");
  };

  const clearRange = () => {
    const next = { from: null, to: null };
    setRange(next);
    onChange?.(next);
  };

  const isRtl = locale === "ar";

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] shadow-sm transition-all hover:border-slate-300 focus:border-[#ff6700] focus:outline-none focus:ring-2 focus:ring-[#ff6700]/15 dark:border-dark_border dark:bg-darkmode"
      >
        <div className="flex items-center gap-1.5 truncate">
          <Icon icon="ion:calendar-outline" className="h-3.5 w-3.5 shrink-0 text-[#ff6700]" />
          <span className={`truncate ${range.from ? "text-slate-700 dark:text-white" : "text-slate-400 dark:text-darktext"}`}>
            {formatDisplay()}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {range.from && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                clearRange();
              }}
              className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <Icon icon="ion:close" className="h-3 w-3" />
            </span>
          )}
          <Icon
            icon="ion:chevron-down"
            className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div
          className={`absolute top-full z-50 mt-1.5 w-[288px] rounded-xl border border-slate-200 bg-white p-2.5 shadow-xl dark:border-dark_border dark:bg-darklight ${
            isRtl ? "right-0" : "left-0"
          }`}
        >
          {/* Month nav */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-darkmode"
            >
              <Icon icon={isRtl ? "ion:chevron-forward" : "ion:chevron-back"} className="h-4 w-4" />
            </button>
            <span className="text-[13px] font-bold text-MidnightNavyText dark:text-white">
              {months[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month + 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-darkmode"
            >
              <Icon icon={isRtl ? "ion:chevron-back" : "ion:chevron-forward"} className="h-4 w-4" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {weekdays.map((day) => (
              <span
                key={day}
                className="py-1 text-[10px] font-bold uppercase text-slate-400 dark:text-darktext"
              >
                {day.slice(0, 3)}
              </span>
            ))}
          </div>

          {/* Days */}
          <div className="mt-0.5 grid grid-cols-7 gap-0.5">
            {days.map(({ date, inMonth }, idx) => {
              const isFrom = isSameDay(date, range.from);
              const isTo = isSameDay(date, range.to);
              const inRange = isInRange(date);
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDayClick(date)}
                  className={`
                    flex h-8 items-center justify-center rounded-lg text-[11px] font-bold transition-all
                    ${
                      isFrom || isTo
                        ? "bg-[#ff6700] text-white shadow-sm"
                        : inRange
                          ? "bg-[#ff6700]/15 text-[#ff6700]"
                          : inMonth
                            ? "text-slate-700 hover:bg-slate-100 dark:text-white dark:hover:bg-darkmode"
                            : "text-slate-300 dark:text-darktext/40"
                    }
                    ${isToday && !isFrom && !isTo && !inRange ? "ring-1 ring-[#ff6700]/40" : ""}
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-dark_border">
            <button
              type="button"
              onClick={clearRange}
              className="text-[11px] font-bold text-slate-500 hover:text-[#ff6700]"
            >
              {t("calendar.clear")}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] font-bold text-[#ff6700] hover:underline"
            >
              {t("calendar.done")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;