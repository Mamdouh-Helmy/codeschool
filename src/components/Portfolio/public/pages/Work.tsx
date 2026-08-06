"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { BsArrowUpRight, BsGithub } from "react-icons/bs";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "../ui/tooltip";
import WorkSliderBtns from "../WorkSliderBtns";
import type { PortfolioData } from "@/types/portfolio";

const Work = ({ portfolio }: { portfolio: PortfolioData }) => {
  const projects = portfolio.projects.length > 0 ? portfolio.projects : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const project = projects[activeIndex] || projects[0];

  if (!project) {
    return (
      <section className="min-h-[80vh] flex items-center justify-center">
        <p className="text-white/60 text-xl">No projects yet.</p>
      </section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: { delay: 2.4, duration: 0.4, ease: "easeIn" },
      }}
      className="min-h-[80vh] flex flex-col justify-center py-12 xl:px-0"
      dir="ltr"
    >
      <div className="container mx-auto" dir="ltr">
        <div className="flex flex-col xl:flex-row xl:gap-[30px]">
          <div className="w-full xl:w-[50%] xl:h-[460px] flex flex-col xl:justify-between order-2 xl:order-none">
            <div className="flex flex-col gap-[30px] h-[50%]">
              <div className="text-8xl leading-none font-extrabold text-transparent text-outline">
                {String(activeIndex + 1).padStart(2, "0")}
              </div>
              <h2 className="text-[42px] font-bold leading-none text-white capitalize">
                {project.category} project
              </h2>
              <p className="text-white/60">{project.description}</p>
              <ul className="flex gap-4 flex-wrap">
                {project.technologies.map((tech, index) => (
                  <li key={index} className="text-xl text-accent">
                    {tech}
                    {index !== project.technologies.length - 1 && ","}
                  </li>
                ))}
              </ul>
              <div className="border border-white/20"></div>
              <div className="flex items-center gap-4">
                {project.demoUrl && (
                  <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger className="w-[70px] h-[70px] rounded-full bg-white/5 flex justify-center items-center group">
                          <BsArrowUpRight className="text-white text-3xl group-hover:text-accent" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Live project</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </a>
                )}
                {project.githubUrl && (
                  <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger className="w-[70px] h-[70px] rounded-full bg-white/5 flex justify-center items-center group">
                          <BsGithub className="text-white text-3xl group-hover:text-accent" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Github repository</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="w-full xl:w-[50%]">
            <Swiper
              spaceBetween={30}
              slidesPerView={1}
              className="xl:h-[520px] mb-12"
              onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
            >
              {projects.map((p, index) => (
                <SwiperSlide key={p.id || index} className="w-full">
                  <div className="h-[460px] relative group flex justify-center items-center bg-pink-50/20">
                    <div className="absolute top-0 bottom-0 w-full h-full bg-black/10 z-10"></div>
                    <div className="relative w-full h-full">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="w-full h-full object-cover "
                        />
                      ) : (
                        <div className="w-full h-full rounded-xl bg-gradient-to-br from-accent/20 via-secondary to-primary flex items-center justify-center">
                          <span className="text-6xl font-extrabold text-white/40">{p.title}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </SwiperSlide>
              ))}
              <WorkSliderBtns
                containerStyles="flex gap-2 absolute right-0 bottom-[calc(50%_-_22px)] xl:bottom-0 z-20 w-full justify-between xl:w-max xl:justify-none"
                btnStyles="bg-accent hover:bg-accent-hover text-white text-[22px] w-[44px] h-[44px] flex justify-center items-center transition-all"
              />
            </Swiper>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default Work;