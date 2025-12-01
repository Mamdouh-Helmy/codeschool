// components/Portfolio/public/SkillsShowcase.tsx
"use client";
import colorSharp from "../../../../public/images/portfolio/img/color-sharp.png";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { Skill } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

interface SkillsShowcaseProps {
  portfolio?: {
    skillsTitle?: string;
    skillsSubtitle?: string;
    skillsDesc?: string;
    skills?: Skill[];
  };
}

export const SkillsShowcase = ({ portfolio }: SkillsShowcaseProps) => {
  const { t } = useI18n();
  console.log("SkillsShowcase portfolio:", portfolio);
  // Default values if portfolio is undefined
  const safePortfolio = portfolio || {
    skillsTitle: t("portfolio.public.skillsTitle") || "My Skills",
    skillsSubtitle: t("portfolio.public.skillsSubtitle") || "Technical Proficiencies",
    skillsDesc: t("portfolio.public.skillsDesc") || "Here are the technologies and skills I've mastered",
    skills: []
  };

  // Extract skills safely
  const skills = safePortfolio.skills || [];

  return (
    <section
      className="relative py-20 bg-black bg-left bg-no-repeat"
      style={{ backgroundImage: `url(${colorSharp.src})` }}
      id="skills"
    >
      <div className="container mx-auto px-4">
        <div className="bg-[#151515] rounded-3xl text-center p-8 md:p-16 lg:px-20 lg:py-16" dir="ltr">
          {/* Header Section */}
          <div className="mb-12">
            <h2 className="text-4xl font-bold text-white mb-2">
              {safePortfolio.skillsTitle}
            </h2>
            <h3 className="text-xl text-purple-400 mb-4">
              {safePortfolio.skillsSubtitle}
            </h3>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              {safePortfolio.skillsDesc}
            </p>
          </div>

          {/* Skills Slider */}
          <div className="relative">
            <Swiper
              slidesPerView={1}
              spaceBetween={30}
              loop={true}
              autoplay={{
                delay: 2500,
                disableOnInteraction: false,
              }}
              pagination={{
                clickable: true,
                dynamicBullets: true,
              }}
              breakpoints={{
                640: {
                  slidesPerView: 2,
                },
                1024: {
                  slidesPerView: 3,
                },
                1280: {
                  slidesPerView: 4,
                },
              }}
              modules={[Autoplay, Pagination]}
              className="w-full py-8"
            >
              {skills.length > 0 ? (
                skills.map((skill: Skill, index: number) => (
                  <SwiperSlide key={ `skill-${index}`}>
                    <div className="flex flex-col items-center p-6 group">
                      {/* Skill Meter */}
                      <div className="relative w-40 h-40 mb-6 flex justify-center items-center">
                        {/* Circular Background */}
                        <svg className="absolute w-full h-full" viewBox="0 0 100 100">
                          <circle
                            className="text-gray-800"
                            strokeWidth="8"
                            stroke="currentColor"
                            fill="transparent"
                            r="40"
                            cx="50"
                            cy="50"
                          />
                          <circle
                            className="text-purple-600 group-hover:text-purple-400 transition-colors duration-300"
                            strokeWidth="8"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="40"
                            cx="50"
                            cy="50"
                            strokeDasharray={`${2 * Math.PI * 40}`}
                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - (skill.level || 0) / 100)}`}
                            transform="rotate(-90 50 50)"
                          />
                        </svg>
                        {/* Percentage Text */}
                        <span className="text-3xl font-bold text-white">
                          {skill.level || 0}%
                        </span>
                      </div>
                      {/* Skill Name */}
                      <h4 className="text-xl font-semibold text-white group-hover:text-purple-400 transition-colors duration-300">
                        {skill.name}
                      </h4>
                      {/* Skill Category (if exists) */}
                      {skill.category && (
                        <p className="text-sm text-gray-400 mt-1">
                          {skill.category}
                        </p>
                      )}
                    </div>
                  </SwiperSlide>
                ))
              ) : (
                <div className="col-span-full p-6 rounded-lg text-xl text-white font-bold bg-purple-900/50">
                  {t("portfolio.public.noSkills") || "No skills available"}
                </div>
              )}
            </Swiper>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SkillsShowcase;