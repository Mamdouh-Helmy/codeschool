"use client";

import {
  FaHtml5, FaCss3, FaJs, FaReact, FaFigma, FaNodeJs,
} from "react-icons/fa";
import { SiTailwindcss, SiNextdotjs, SiTypescript } from "react-icons/si";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "../ui/tooltip";
import { ScrollArea } from "../ui/scroll-area";
import { motion } from "framer-motion";
import type { PortfolioData } from "@/types/portfolio";

// ✅ المفاتيح دلوقتي مطابقة لقيم skill.icon الفعلية المخزنة في الداتابيز
// (حروف صغيرة، أسماء مختصرة زي "react", "typescript", "nodejs"...)
const iconMap: Record<string, React.ReactNode> = {
  html: <FaHtml5 />,
  html5: <FaHtml5 />,
  css: <FaCss3 />,
  css3: <FaCss3 />,
  javascript: <FaJs />,
  js: <FaJs />,
  react: <FaReact />,
  nextjs: <SiNextdotjs />,
  "next.js": <SiNextdotjs />,
  tailwind: <SiTailwindcss />,
  tailwindcss: <SiTailwindcss />,
  nodejs: <FaNodeJs />,
  "node.js": <FaNodeJs />,
  node: <FaNodeJs />,
  figma: <FaFigma />,
  typescript: <SiTypescript />,
  ts: <SiTypescript />,
};

const Resume = ({ portfolio }: { portfolio: PortfolioData }) => {
  // ✅ سنين الخبرة بتيجي من stats.yearsOfExperience المحسوبة في fetchPortfolio.ts
  // بدل ما تتحسب غلط من عدد الوظائف في experience array
  const yearsOfExperience =
    portfolio.stats?.find((s) => s.id === "years")?.num ?? 0;

  const aboutInfo = [
    { fieldName: "Name", fieldValue: portfolio.ownerName },
    ...(portfolio.contactInfo?.phone ? [{ fieldName: "Phone", fieldValue: portfolio.contactInfo.phone }] : []),
    { fieldName: "Experience", fieldValue: `${yearsOfExperience}+ Years` },
    ...(portfolio.contactInfo?.email ? [{ fieldName: "Email", fieldValue: portfolio.contactInfo.email }] : []),
    { fieldName: "Freelance", fieldValue: "Available" },
    ...(portfolio.contactInfo?.location ? [{ fieldName: "Address", fieldValue: portfolio.contactInfo.location }] : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: { delay: 2.4, duration: 0.4, ease: "easeIn" },
      }}
      className="min-h-[80vh] flex items-center justify-center py-12 xl:py-0"
      dir="ltr"
    >
      <div className="container mx-auto" dir="ltr">
        <Tabs
          defaultValue="experience"
          className="flex flex-col xl:flex-row gap-[60px]"
        >
          <TabsList className="flex flex-col w-full max-w-[380px] mx-auto xl:mx-0 gap-6">
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="about">About me</TabsTrigger>
          </TabsList>

          <div className="min-h-[70vh] w-full">
            {/* experience */}
            <TabsContent value="experience" className="w-full">
              <div className="flex flex-col gap-[30px] text-center xl:text-left">
                <h3 className="text-4xl font-bold">My experience</h3>
                <p className="max-w-[600px] text-white/60 mx-auto xl:mx-0">
                  A track record of building modern web applications across agencies, startups, and freelance work.
                </p>
                <ScrollArea className="h-[400px]">
                  <ul className="grid grid-cols-1 lg:grid-cols-2 gap-[30px]">
                    {portfolio.experience.map((item, index) => (
                      <li
                        key={item.id || index}
                        className="bg-[#232329] h-[184px] py-6 px-10 rounded-xl flex flex-col justify-center items-center lg:items-start gap-1"
                      >
                        <span className="text-accent">{item.duration}</span>
                        <h3 className="text-xl max-w-[260px] min-h-[60px] text-center lg:text-left">
                          {item.position}
                        </h3>
                        <div className="flex items-center gap-3">
                          <span className="w-[6px] h-[6px] rounded-full bg-accent"></span>
                          <p className="text-white/60">{item.company}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            </TabsContent>

            {/* education */}
            <TabsContent value="education" className="w-full">
              <div className="flex flex-col gap-[30px] text-center xl:text-left">
                <h3 className="text-4xl font-bold">My education</h3>
                <p className="max-w-[600px] text-white/60 mx-auto xl:mx-0">
                  Formal education and continuous learning in software development and design.
                </p>
                <ScrollArea className="h-[400px]">
                  <ul className="grid grid-cols-1 lg:grid-cols-2 gap-[30px]">
                    {portfolio.education.map((item, index) => (
                      <li
                        key={item.id || index}
                        className="bg-[#232329] h-[184px] py-6 px-10 rounded-xl flex flex-col justify-center items-center lg:items-start gap-1"
                      >
                        <span className="text-accent">{item.duration}</span>
                        <h3 className="text-xl max-w-[260px] min-h-[60px] text-center lg:text-left">
                          {item.degree}
                        </h3>
                        <div className="flex items-center gap-3">
                          <span className="w-[6px] h-[6px] rounded-full bg-accent"></span>
                          <p className="text-white/60">{item.institution}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            </TabsContent>

            {/* skills */}
            <TabsContent value="skills" className="w-full h-full">
              <div className="flex flex-col gap-[30px]">
                <div className="flex flex-col gap-[30px] text-center xl:text-left">
                  <h3 className="text-4xl font-bold">My skills</h3>
                  <p className="max-w-[600px] text-white/60 mx-auto xl:mx-0">
                    Technologies and tools I use to bring ideas to life.
                  </p>
                </div>
                <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 xl:gap-[30px]">
                  {portfolio.skills.map((skill, index) => (
                    <li key={skill.id || index}>
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger className="w-full h-[150px] bg-[#232329] rounded-xl flex justify-center items-center group">
                            <div className="text-6xl group-hover:text-accent transition-all duration-300">
                              {iconMap[skill.icon?.toLowerCase()] ?? (
                                <span className="text-2xl font-bold text-white/70">{skill.name}</span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="capitalize">{skill.name} — {skill.level}%</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>

            {/* about */}
            <TabsContent value="about" className="w-full text-center xl:text-left">
              <div className="flex flex-col gap-[30px]">
                <h3 className="text-4xl font-bold">About me</h3>
                <p className="max-w-[600px] text-white/60 mx-auto xl:mx-0">
                  {portfolio.description}
                </p>
                <ul className="grid grid-cols-1 xl:grid-cols-2 gap-y-6 max-w-[620px] mx-auto xl:mx-0">
                  {aboutInfo.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-center xl:justify-start gap-4"
                    >
                      <span className="text-white/60">{item.fieldName}</span>
                      <span className="text-xl">{item.fieldValue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </motion.div>
  );
};

export default Resume;