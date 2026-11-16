"use client";

import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
import Block, { blockClass } from "./Block";
import { useAbout } from "./useAbout";

const AboutCta = () => {
  const { content: { cta } } = useAbout();

  return (
    <section className="relative overflow-hidden bg-secondary py-28 dark:bg-darklight">
      <div aria-hidden className="about-dots-light absolute inset-0" />

      <div className="container relative" data-aos="fade-up">
        <div className="flex flex-col items-start pb-3">
          <Block tone="amber" hat className="about-display px-6 pb-3 pt-5 text-base font-bold">
            {cta.hat}
          </Block>

          <Link
            href={cta.href}
            className={`${blockClass("primary")} about-display inline-flex items-center gap-4 px-8 py-7 text-4xl font-extrabold hover:-translate-y-1 sm:text-6xl`}
          >
            {cta.title}
            <Icon icon="mdi:play" className="rtl:rotate-180" />
          </Link>
        </div>

        <p className="mt-10 max-w-xl text-lg leading-8 text-white/80">{cta.text}</p>
      </div>
    </section>
  );
};

export default AboutCta;