// components/Portfolio/public/pages/Photo.tsx
"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const DEFAULT_PHOTO = "/images/default-avatar.jpg";

interface PhotoProps {
  src?: string;
}

const Photo = ({ src }: PhotoProps) => {
  const imageSrc = src && src.trim().length > 0 ? src : DEFAULT_PHOTO;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          transition: { delay: 2, duration: 0.4, ease: "easeIn" },
        }}
        className="relative w-[240px] h-[240px] xl:w-[400px] xl:h-[400px]"
      >
        {/* image */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            transition: { delay: 2.4, duration: 0.4, ease: "easeInOut" },
          }}
          className="absolute inset-0 overflow-hidden rounded-full"
        >
          <Image
            src={imageSrc}
            priority
            quality={100}
            fill
            sizes="(min-width: 1280px) 400px, 240px"
            alt=""
            className="object-cover rounded-full"
          />
        </motion.div>

        {/* circle — text-accent + stroke="currentColor" بدل الـ hex الثابت
            عشان يورث لون الـ accent بتاعك (أورانج) تلقائيًا */}
        <motion.svg
          className="pointer-events-none absolute left-1/2 top-1/2 h-[242px] w-[242px] -translate-x-1/2 -translate-y-1/2 text-accent xl:h-[415px] xl:w-[415px]"
          fill="transparent"
          viewBox="0 0 506 506"
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.circle
            cx="253"
            cy="253"
            r="250"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ strokeDasharray: "24 10 0 0" }}
            animate={{
              strokeDasharray: ["15 120 25 25", "16 25 92 72", "4 250 22 22"],
              rotate: [120, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
        </motion.svg>
      </motion.div>
    </div>
  );
};

export default Photo;