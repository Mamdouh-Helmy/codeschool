"use client";

import { Fragment } from "react";
import CBlock from "./CBlock";
import SectionHat from "./SectionHat";
import { useAbout } from "./useAbout";

const AboutStory = () => {
  const { content: { story } } = useAbout();

  return (
    <section className="bg-white py-24 dark:bg-darkmode lg:py-32">
      <div className="container">
        <SectionHat title={story.title} tone="teal" />

        <p
          className="max-w-4xl text-2xl font-semibold leading-[1.8] text-secondary dark:text-white sm:text-3xl lg:text-4xl lg:leading-[1.7]"
          data-aos="fade-up"
        >
          {story.segments.map((segment, index) =>
            segment.mark ? (
              <mark key={index} className="about-mark">
                {segment.text}
              </mark>
            ) : (
              <Fragment key={index}>{segment.text}</Fragment>
            )
          )}
        </p>

        <div className="mt-20 grid gap-10 md:grid-cols-2">
          <div data-aos="fade-up">
            <CBlock tone="primary" title={story.mission.title}>
              {story.mission.text}
            </CBlock>
          </div>
          <div data-aos="fade-up" data-aos-delay="120">
            <CBlock tone="teal" title={story.vision.title}>
              {story.vision.text}
            </CBlock>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutStory;