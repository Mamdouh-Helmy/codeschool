// components/hero/Stats.tsx
"use client";

import CountUp from "react-countup";
import type { StatItem } from "@/types/portfolio";

interface StatsProps {
  stats?: StatItem[];
}

const Stats = ({ stats = [] }: StatsProps) => {
  const visibleStats = stats.filter((item) => item.num !== 0);

  if (!visibleStats.length) return null;

  return (
    <section className="pt-4 pb-12 xl:pt-0 xl:pb-0">
      <div className="container mx-auto">
        <div className="flex flex-wrap gap-x-12 gap-y-6 justify-center xl:justify-start max-w-[80vw] mx-auto xl:max-w-none">
          {visibleStats.map((item) => (
            <div
              className="flex gap-4 items-center"
              key={item.id}
            >
              <CountUp
                end={item.num}
                duration={5}
                delay={2}
                className="text-3xl xl:text-5xl font-extrabold text-secondary dark:text-white"
              />
              <p
                className={`${
                  item.text.length < 15 ? "max-w-[90px]" : "max-w-[130px]"
                } leading-snug text-sm text-secondary/80 dark:text-white/80`}
              >
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;