"use client";

import { useLocale } from "@/app/context/LocaleContext";
import { ABOUT_CONTENT, type AboutContent, type AboutLocale } from "./aboutContent";

export function useAbout(): { locale: AboutLocale; content: AboutContent } {
  const { locale } = useLocale();
  const safeLocale: AboutLocale = locale === "ar" ? "ar" : "en";
  return { locale: safeLocale, content: ABOUT_CONTENT[safeLocale] };
}