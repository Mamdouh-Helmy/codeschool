"use client";

import SectionHat from "./SectionHat";
import { useAbout } from "./useAbout";
import { useCountUp } from "./useCountUp";

interface StatMonitorProps {
  value: number;
  suffix: string;
  label: string;
  numberLocale: string;
}

/** شاشة متغيّر زي اللي بتظهر على الستيج */
const StatMonitor: React.FC<StatMonitorProps> = ({ value, suffix, label, numberLocale }) => {
  const { ref, value: current } = useCountUp(value);

  return (
    <div
      ref={ref}
      className="flex flex-col items-start gap-4 rounded-2xl border-2 border-secondary bg-white p-6 dark:border-white/20 dark:bg-darklight"
    >
      <span className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-darkmuted">
        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
        {label}
      </span>
      <span className="about-display rounded-xl bg-primary px-5 py-1 text-5xl font-extrabold text-white sm:text-6xl">
        {current.toLocaleString(numberLocale)}
        {suffix}
      </span>
    </div>
  );
};

const AboutStats = () => {
  const { locale, content: { stats } } = useAbout();
  const numberLocale = locale === "ar" ? "ar-EG" : "en-US";

  return (
    <section className="about-dots bg-IcyBreeze py-24 dark:bg-darkmode lg:py-32">
      <div className="container">
        <SectionHat title={stats.title} tone="primary" />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" data-aos="fade-up">
          {stats.items.map((stat) => (
            <StatMonitor key={stat.label} {...stat} numberLocale={numberLocale} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutStats;