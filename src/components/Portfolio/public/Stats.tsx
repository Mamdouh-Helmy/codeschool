// components/hero/Stats.tsx
"use client";

import CountUp from "react-countup";
import type { StatItem } from "@/types/portfolio";

interface StatsProps {
  stats?: StatItem[];
}

const Stats = ({ stats = [] }: StatsProps) => {
  if (!stats.length) return null;

  return (
    <section className="pt-4 pb-12 xl:pt-0 xl:pb-0">
      <div className="container mx-auto">
        <div className="flex flex-wrap gap-6 max-w-[80vw] mx-auto xl:max-w-none">
          {stats.map((item) => (
            <div
              className="flex-1 flex gap-4 items-center justify-center xl:justify-start"
              key={item.id}
            >
              <CountUp
                end={item.num}
                duration={5}
                delay={2}
                className="text-4xl xl:text-6xl font-extrabold"
              />
              <p
                className={`${
                  item.text.length < 15 ? "max-w-[100px]" : "max-w-[150px]"
                } leading-snug text-white/80`}
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