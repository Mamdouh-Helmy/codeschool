"use client";

import React, { createContext, useContext, useMemo, useCallback } from "react";
import { useLocale } from "@/app/context/LocaleContext";
import en from "./messages/en";
import ar from "./messages/ar";

type Messages = Record<string, string>;

const bundles: Record<"en" | "ar", Messages> = { en, ar };

type I18nContextValue = {
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

// ✅ escape كل الـ special characters في regex
// (زي `{`, `}`, `(`, `)`, `.`, `*`, `+`, `?`, `[`, `]`, `\`, `^`, `$`, `|`)
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ✅ نبني الـ regex من template literal بأمان
function buildVarRegex(key: string): RegExp | null {
  // لو الـ key فاضي أو مش string → نرجع null (نتخطاه)
  if (!key || typeof key !== "string" || key.trim() === "") {
    return null;
  }

  try {
    // بنلف الـ key بـ { } كـ literal (مش كـ regex quantifier)
    const pattern = `\\{${escapeRegex(key)}\\}`;
    return new RegExp(pattern, "g");
  } catch (err) {
    console.warn(`⚠️ Could not build regex for var key "${key}":`, err);
    return null;
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  const messages = bundles[locale] || bundles.en;

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      // ✅ لو الـ key مش موجود أو مش string → نرجع فاضي بدل ما نكسر
      if (!key || typeof key !== "string") {
        return "";
      }

      let str = messages[key] ?? key;

      if (vars && typeof vars === "object") {
        for (const k of Object.keys(vars)) {
          const regex = buildVarRegex(k);
          if (!regex) continue; // تخطى المفاتيح الفاضية أو اللي فيها مشاكل

          const value = vars[k];
          str = str.replace(
            regex,
            value !== undefined && value !== null ? String(value) : "",
          );
        }
      }

      return str;
    },
    [messages],
  );

  const value = useMemo(() => ({ t }), [t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}