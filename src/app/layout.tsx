import { DM_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import ScrollToTop from "@/components/ScrollToTop";
import Aoscompo from "@/utils/aos";
import SessionProviderComp from "@/components/nextauth/SessionProvider";
import { AuthDialogProvider } from "./context/AuthDialogContext";
import NextTopLoader from "nextjs-toploader";
import SiteWrapper from "./SiteWrapper";
import WelcomePopupManager from "@/components/Common/WelcomePopupManager";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { LocaleProvider } from "./context/LocaleContext";
import { I18nProvider } from "@/i18n/I18nProvider";
import { Toaster } from "react-hot-toast";

const dmsans = DM_Sans({ subsets: ["latin"] });

// ❗ بدون لغة
async function getHeroDescription() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/hero-description`, {
      cache: "no-store",
    });

    const data = await res.json();
    return data.heroDescription || "";
  } catch (error) {
    console.error("Failed to load hero description:", error);
    return "";
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const initialLocale =
    (cookieStore.get("app_locale")?.value === "ar" ? "ar" : "en") as
      | "en"
      | "ar";

  const dir = initialLocale === "ar" ? "rtl" : "ltr";

  // ⭐ جلب heroDescription بدون لغة
  const heroDescription = await getHeroDescription();

  return (
    <html lang={initialLocale} dir={dir} suppressHydrationWarning>
      <head>
        <meta name="description" content={heroDescription} />
      </head>

      <body className={dmsans.className}>
        <AuthDialogProvider>
          <SessionProviderComp session={null}>
            <LocaleProvider initialLocale={initialLocale}>
              <I18nProvider>
                <ThemeProvider
                  attribute="class"
                  enableSystem={true}
                  defaultTheme="system"
                >
                  <Aoscompo>
                    <NextTopLoader />

                    <SiteWrapper heroDescription={heroDescription}>
                      <Toaster
                        containerStyle={{ zIndex: 9999 }}
                        toastOptions={{
                          className:
                            "bg-white dark:bg-darkmode text-MidnightNavyText dark:text-white rounded-14 shadow-round-box border-none outline-none p-3 max-w-404",
                          style: { maxWidth: "25rem" },
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

                      {children}
                    </SiteWrapper>

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
