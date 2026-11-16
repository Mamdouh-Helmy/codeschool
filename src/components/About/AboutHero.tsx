"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
import Block, { blockClass, type Tone } from "./Block";
import HeroBackdrop from "./HeroBackdrop";
import HeroMascot from "./HeroMascot";
import { useAbout } from "./useAbout";
import { useScriptRunner } from "./useScriptRunner";

const LINE_TONES: Tone[] = ["teal", "primary", "amber"];
const STEP_MS = 800;
const AUTO_RUN_DELAY_MS = 1400;

const AboutHero = () => {
  const { content: { hero } } = useAbout();
  const { step, done, running, run } = useScriptRunner(hero.lines.length + 1, STEP_MS);

  // السكريبت بيشتغل لوحده أول ما الصفحة تفتح
  useEffect(() => {
    const id = window.setTimeout(run, AUTO_RUN_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [run]);

  return (
    <section className="about-dots relative flex min-h-screen flex-col justify-center overflow-hidden bg-IcyBreeze dark:bg-darkmode">
      <HeroBackdrop />

      {/* pb-20 = ارتفاع الأرضية، فالشخصية بتقف على حافتها */}
      <div className="container relative grid items-center gap-6 pb-20 pt-28 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <div className="pb-4 lg:pb-8">
          <div className="flex flex-col items-start pb-3">
            <Block
              tone="deep"
              hat
              index={0}
              active={step === 0}
              className="about-display flex items-center gap-2 px-6 pb-3 pt-5 text-base font-bold"
            >
              <Icon icon="mdi:play-circle" className="text-xl text-amber-brand" />
              {hero.hat}
            </Block>

            {hero.lines.map((line, i) => (
              <Block
                key={line}
                tone={LINE_TONES[i % LINE_TONES.length]}
                index={i + 1}
                active={step === i + 1}
                className="about-display px-5 py-2 text-3xl font-extrabold leading-snug sm:text-4xl lg:text-5xl"
              >
                {line}
              </Block>
            ))}
          </div>

          <p
            className="mb-6 mt-6 max-w-xl text-base leading-7 text-gray-600 dark:text-darkmuted lg:text-lg"
            data-aos="fade-up"
            data-aos-delay="300"
          >
            {hero.subtitle}
          </p>

          <div className="flex flex-wrap items-center gap-5" data-aos="fade-up" data-aos-delay="400">
            <Link
              href={hero.primaryCta.href}
              className={`${blockClass("primary")} about-display inline-flex items-center gap-2 px-7 py-3 text-lg font-bold hover:-translate-y-1`}
            >
              {hero.primaryCta.label}
              <Icon icon="mdi:arrow-right" className="rtl:rotate-180" />
            </Link>

            <button
              type="button"
              onClick={run}
              disabled={running}
              className="inline-flex items-center gap-2 rounded-full border-2 border-secondary px-5 py-3 font-bold text-secondary transition hover:bg-secondary hover:text-white disabled:opacity-50 dark:border-white/40 dark:text-white dark:hover:bg-white dark:hover:text-secondary"
            >
              <Icon icon={done ? "mdi:replay" : "mdi:play"} />
              {done ? hero.replay : hero.run}
            </button>
          </div>
        </div>

        <div className="self-end" data-aos="fade-up" data-aos-delay="200">
          <HeroMascot bubble={hero.bubble} running={running} done={done} />
        </div>
      </div>
    </section>
  );
};

export default AboutHero;