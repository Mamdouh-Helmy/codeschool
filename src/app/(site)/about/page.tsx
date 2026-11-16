// src/app/(site)/about/page.tsx
import type { Metadata } from "next";
import { Baloo_Bhaijaan_2 } from "next/font/google";
import AboutHero from "@/components/About/AboutHero";
import AboutStory from "@/components/About/AboutStory";
import AboutStats from "@/components/About/AboutStats";
import AboutPrinciples from "@/components/About/AboutPrinciples";
import AboutJourney from "@/components/About/AboutJourney";
import AboutCta from "@/components/About/AboutCta";
import "@/components/About/about.css";

const display = Baloo_Bhaijaan_2({
  subsets: ["arabic", "latin"],
  weight: ["600", "800"],
  variable: "--font-about-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "About | CodeSchool",
  description: "تعرّف على قصة CodeSchool ورسالتنا في تعليم البرمجة للأطفال والمبتدئين",
};

export default function AboutPage() {
  return (
    <main className={display.variable}>
      <AboutHero />
      <AboutStory />
      <AboutStats />
      <AboutPrinciples />
      <AboutJourney />
      <AboutCta />
    </main>
  );
}