// components/Portfolio/public/pages/Home.tsx
"use client";

import { Button } from "../ui/button";
import { FiDownload } from "react-icons/fi";
import Social from "./Social";
import Photo from "./Photo";
import Stats from "./Stats";
import { motion } from "framer-motion";
import type { PortfolioData } from "@/types/portfolio";

const Home = ({ portfolio }: { portfolio: PortfolioData }) => {
  const hasCv = !!portfolio.cvUrl && portfolio.cvUrl.trim().length > 0;

  return (
    <section className="h-full" dir="ltr">
      <div className="container mx-auto h-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            transition: { delay: 2.4, duration: 0.4, ease: "easeIn" },
          }}
          className="flex flex-col xl:flex-row items-center justify-between  xl:pb-10"
        >
          {/* text */}
          <div className="text-center xl:text-left order-2 xl:order-none">
            <span className="text-lg mb-2 block">{portfolio.ownerRole}</span>
            <h1 className="h1 mb-2 md:text-7xl">
              Hello I'm <br />{" "}
              <span className="text-accent block md:text-8xl">{portfolio.ownerName}</span>
            </h1>
            <p className="max-w-[440px] mb-7 text-sm text-white/80">
              {portfolio.description}
            </p>
            {/* btn and socials */}
            <div className="flex flex-col xl:flex-row items-center gap-6">
              {hasCv && (
                <Button
                  variant="outline"
                  size="default"
                  className="uppercase flex items-center gap-2"
                  asChild
                >
                  <a
                    href={portfolio.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                  >
                    <span>Download CV</span>
                    <FiDownload className="text-lg" />
                  </a>
                </Button>
              )}
              <div className="mb-6 xl:mb-0">
                <Social
                  socialLinks={portfolio.socialLinks}
                  containerStyles="flex gap-5"
                  iconStyles="w-8 h-8 border border-accent rounded-full flex justify-center items-center text-accent text-sm hover:bg-accent hover:text-darkmode hover:transition-all duration-500"
                />
              </div>
            </div>
          </div>
          {/* photo */}
          <div className="order-1 xl:order-none mb-8 xl:mb-0">
            <Photo src={portfolio.ownerImage} />
          </div>
        </motion.div>
      </div>
      <Stats stats={portfolio.stats} />
    </section>
  );
};

export default Home;