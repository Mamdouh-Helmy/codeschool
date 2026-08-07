"use client";

import { BsArrowDownRight } from "react-icons/bs";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePortfolio } from "../../../../../context/PortfolioContext";
import type { PortfolioData } from "@/types/portfolio";

const Services = ({ portfolio }: { portfolio: PortfolioData }) => {
  const { basePath } = usePortfolio();
  const services = portfolio.services.length > 0 ? portfolio.services : [];

  return (
    <section className="min-h-[80vh] flex flex-col justify-center py-12 xl:py-0" dir="ltr">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            transition: { delay: 2.4, duration: 0.4, ease: "easeIn" },
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-[60px]"
        >
          {services.map((service, index) => (
            <div
              key={service.id || index}
              className="flex-1 flex flex-col justify-center gap-6 group"
            >
              <div className="w-full flex justify-between items-center">
                <div className="text-5xl font-extrabold text-outline transition-all duration-500">
                  {service.num}
                </div>
                <Link
                  href={service.href ? `${basePath}${service.href}` : `${basePath}/contact`}
                  className="w-[70px] h-[70px] rounded-full bg-secondary/10 dark:bg-white group-hover:bg-accent transition-all duration-500 flex justify-center items-center hover:-rotate-45"
                >
                  <BsArrowDownRight className="text-secondary dark:text-darkmid text-3xl" />
                </Link>
              </div>
              <h2 className="text-[42px] font-bold leading-none text-secondary dark:text-white group-hover:text-accent transition-all duration-500">
                {service.title}
              </h2>
              <p className="text-secondary/60 dark:text-white/60">{service.description}</p>
              <div className="border-b border-secondary/20 dark:border-white/20 w-full"></div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Services;