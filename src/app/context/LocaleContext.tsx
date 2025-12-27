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

// ✅ Debounce function لمنع التحديث المتكرر
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export function LocaleProvider({ children, initialLocale = "en" as SupportedLocale }: { children: React.ReactNode; initialLocale?: SupportedLocale }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale);
  const [isInitialized, setIsInitialized] = useState(false);

  // ✅ hydrate من localStorage مرة واحدة فقط
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as SupportedLocale | null;
      if (saved === "en" || saved === "ar") {
        setLocaleState(saved);
      }
    } catch (error) {
      console.error("Error reading locale from localStorage:", error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // ✅ Debounced function لتحديث التخزين
  const persistLocale = useCallback(
    debounce((l: SupportedLocale) => {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, l);
      } catch (error) {
        console.error("Error saving locale to localStorage:", error);
      }
      
      try {
        document.cookie = `${LOCALE_COOKIE_KEY}=${l}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      } catch (error) {
        console.error("Error saving locale to cookie:", error);
      }
      
      // ✅ تحديث attributes مرة واحدة
      const dir = l === "ar" ? "rtl" : "ltr";
      document.documentElement.setAttribute("dir", dir);
      document.documentElement.setAttribute("lang", l);
    }, 300), // 300ms debounce
    []
  );

  // ✅ تحديث التخزين عند تغيير locale
  useEffect(() => {
    if (isInitialized) {
      persistLocale(locale);
    }
  }, [locale, isInitialized, persistLocale]);

  const setLocale = useCallback((l: SupportedLocale) => {
    setLocaleState(l);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => (prev === "en" ? "ar" : "en"));
  }, []);

  const dir = locale === "ar" ? "rtl" : "ltr";

  // ✅ Memoized formatters
  const formatDate = useMemo(
    () => (date: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", options).format(new Date(date)),
    [locale]
  );

  const formatNumber = useMemo(
    () => (num: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", options).format(num),
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