"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useLocale } from "@/app/context/LocaleContext";
import en from "./messages/en";
import ar from "./messages/ar";

type Messages = Record<string, string>;

const bundles: Record<"en" | "ar", Messages> = { en, ar };

type I18nContextValue = {
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  const messages = bundles[locale] || bundles.en;

  const t = (key: string, vars?: Record<string, string | number>) => {
    let str = messages[key] ?? key;
    if (vars) {
      for (const k of Object.keys(vars)) {
        str = str.replace(new RegExp(`{${k}}`, "g"), String(vars[k]));
      }
    }
    return str;
  };

  const value = useMemo(() => ({ t }), [messages, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
