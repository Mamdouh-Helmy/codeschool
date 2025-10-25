"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type SupportedLocale = "en" | "ar";

type LocaleContextValue = {
  locale: SupportedLocale;
  dir: "ltr" | "rtl";
  toggleLocale: () => void;
  setLocale: (l: SupportedLocale) => void;
  formatDate: (date: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

const LOCALE_STORAGE_KEY = "app_locale";
const LOCALE_COOKIE_KEY = "app_locale";

export function LocaleProvider({ children, initialLocale = "en" as SupportedLocale }: { children: React.ReactNode; initialLocale?: SupportedLocale }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale);

  useEffect(() => {
    // hydrate from localStorage if present
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as SupportedLocale | null;
      if (saved === "en" || saved === "ar") {
        setLocaleState(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    // persist to localStorage and cookie
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {}
    try {
      document.cookie = `${LOCALE_COOKIE_KEY}=${locale}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    } catch {}
    // apply dir attribute at runtime as well
    const dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", locale);
  }, [locale]);

  const setLocale = useCallback((l: SupportedLocale) => setLocaleState(l), []);

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => (prev === "en" ? "ar" : "en"));
  }, []);

  const dir = locale === "ar" ? "rtl" : "ltr";

  const formatDate = useCallback(
    (date: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", options).format(new Date(date)),
    [locale]
  );

  const formatNumber = useCallback(
    (num: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", options).format(num),
    [locale]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, dir, toggleLocale, setLocale, formatDate, formatNumber }),
    [locale, dir, toggleLocale, setLocale, formatDate, formatNumber]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}


