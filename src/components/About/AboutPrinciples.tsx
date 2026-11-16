"use client";

import type { Tone } from "./Block";
import CBlock from "./CBlock";
import SectionHat from "./SectionHat";
import { useAbout } from "./useAbout";

const TONES: Tone[] = ["primary", "teal", "amber", "deep"];

const AboutPrinciples = () => {
  const { content: { principles } } = useAbout();

  return (
    <section className="bg-white py-24 dark:bg-darkmode lg:py-32">
      <div className="container">
        <SectionHat title={principles.title} tone="amber" />

        <div className="grid gap-10 md:grid-cols-2">
          {principles.items.map((item, index) => (
            <div key={item.title} data-aos="fade-up" data-aos-delay={(index % 2) * 120}>
              <CBlock
                tone={TONES[index % TONES.length]}
                title={
                  <>
                    <span className="me-3 font-mono text-base opacity-70">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item.title}
                  </>
                }
              >
                {item.text}
              </CBlock>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutPrinciples;