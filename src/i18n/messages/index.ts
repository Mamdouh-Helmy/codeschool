// src/i18n/messages/index.ts
import ar from "./ar";
import en from "./en";

export type Locale = "ar" | "en";
export type Messages = Record<string, string>;

const messages: Record<Locale, Messages> = { ar, en };

export default messages;

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

export function getTranslation(
  locale: Locale,
  key: string,
  fallback?: string
): string {
  const dict = messages[locale] || messages.en;
  return dict[key] ?? fallback ?? key;
}

export function formatMessage(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`
  );
}

/**
 * أسماء أيام الأسبوع باللغة المطلوبة
 */
export function getWeekdays(locale: Locale): string[] {
  const keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  const dict = messages[locale] ?? messages.en;

  const fallbacks: Record<Locale, string[]> = {
    ar: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
    en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  };

  return keys.map((k, i) => {
    const v = dict[`calendar.weekdays.${k}`];
    return v || fallbacks[locale]?.[i] || k;
  });
}

/**
 * أسماء أيام الأسبوع مختصرة
 */
export function getWeekdaysShort(locale: Locale): string[] {
  const keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  const dict = messages[locale] ?? messages.en;

  const fallbacks: Record<Locale, string[]> = {
    ar: ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"],
    en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  };

  return keys.map((k, i) => {
    const v = dict[`calendar.weekdaysShort.${k}`];
    return v || fallbacks[locale]?.[i] || k;
  });
}

/**
 * أسماء الشهور باللغة المطلوبة
 * @param short لو true ترجع مختصرة
 */
export function getMonths(locale: Locale, short = false): string[] {
  const keys = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ] as const;

  const dict = messages[locale] ?? messages.en;
  const prefix = short ? "calendar.monthsShort" : "calendar.months";

  const fallbacks: Record<Locale, string[]> = {
    ar: short
      ? ["ينا", "فبر", "مار", "أبر", "ماي", "يون", "يول", "أغس", "سبت", "أكت", "نوف", "ديس"]
      : ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
    en: short
      ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  };

  return keys.map((k, i) => {
    const v = dict[`${prefix}.${k}`];
    return v || fallbacks[locale]?.[i] || k;
  });
}