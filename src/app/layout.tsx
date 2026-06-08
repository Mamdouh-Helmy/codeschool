import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";

import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import NextTopLoader from "nextjs-toploader";

import { AuthDialogProvider } from "./context/AuthDialogContext";
import { LocaleProvider } from "./context/LocaleContext";
import { I18nProvider } from "@/i18n/I18nProvider";

import SessionProviderComp from "@/components/nextauth/SessionProvider";
import SiteWrapper from "./SiteWrapper";
import ScrollToTop from "@/components/ScrollToTop";
import Aoscompo from "@/utils/aos";
import WelcomePopupManager from "@/components/Common/WelcomePopupManager";

import "./globals.css";
import "./portfolio-forms.css";

// ── Font ──────────────────────────────────────────────────────────────────────
const dmsans = DM_Sans({ subsets: ["latin"] });

// ── Metadata ──────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "CodeSchool",
  description: "منصة تعليمية لتعليم البرمجة للأطفال والمبتدئين",
};

// ── Layout ────────────────────────────────────────────────────────────────────
export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const initialLocale = (
    cookieStore.get("app_locale")?.value === "ar" ? "ar" : "en"
  ) as "ar" | "en";

  const session = await getServerSession();

  return (
    <html
      lang={initialLocale}
      dir={initialLocale === "ar" ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <body className={dmsans.className}>
        <AuthDialogProvider>
          <SessionProviderComp session={session}>
            <LocaleProvider initialLocale={initialLocale}>
              <I18nProvider>
                <ThemeProvider
                  attribute="class"
                  enableSystem
                  defaultTheme="system"
                >
                  <Aoscompo>
                    <NextTopLoader />

                    <Toaster
                      position="top-center"
                      containerStyle={{ zIndex: 99999 }}
                      toastOptions={{
                        className:
                          "bg-white dark:bg-darkmode text-MidnightNavyText dark:text-white rounded-14 shadow-round-box border-none outline-none p-3 max-w-404",
                        style: { maxWidth: "25rem", zIndex: 99999 },
                        success: {
                          className:
                            "bg-primary text-white rounded-14 shadow-sm p-3 max-w-404",
                        },
                        error: {
                          className:
                            "bg-red-600 text-white rounded-14 shadow-sm p-3 max-w-404",
                        },
                        duration: 4000,
                      }}
                    />

                    <SiteWrapper>{children}</SiteWrapper>

                    <WelcomePopupManager />
                  </Aoscompo>

                  <ScrollToTop />
                </ThemeProvider>
              </I18nProvider>
            </LocaleProvider>
          </SessionProviderComp>
        </AuthDialogProvider>
      </body>
    </html>
  );
}