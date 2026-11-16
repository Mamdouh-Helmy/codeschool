"use client";

import Block, { type Tone } from "./Block";
import { useAbout } from "./useAbout";

const TONES: Tone[] = ["teal", "primary", "amber", "deep"];

const AboutJourney = () => {
  const { content: { journey } } = useAbout();

  return (
    <section className="bg-IcyBreeze py-24 dark:bg-darkmode lg:py-32">
      <div className="container">
        <div className="flex flex-col items-start pb-3" data-aos="fade-up">
          <Block
            tone="primary"
            hat
            className="about-display px-8 pb-4 pt-6 text-3xl font-extrabold sm:text-4xl"
          >
            {journey.title}
          </Block>

          {journey.items.map((item, index) => (
            <Block
              key={item.year}
              tone={TONES[index % TONES.length]}
              className="w-full max-w-2xl px-6 py-6 sm:flex sm:items-center sm:gap-8"
            >
              <span className="about-display block min-w-24 text-3xl font-extrabold sm:text-4xl">
                {item.year}
              </span>
              <span className="mt-1 block sm:mt-0">
                <strong className="about-display block text-xl">{item.title}</strong>
                <span className="opacity-90">{item.text}</span>
              </span>
            </Block>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutJourney;