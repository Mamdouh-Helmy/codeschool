"use client";

import { useEffect, useRef, useState } from "react";
import Mascot, { type MascotMood } from "./Mascot";
import StageBackdrop from "./StageBackdrop";
import { useTypewriter } from "./useTypewriter";
import "./stage.css";

interface HeroStageProps {
  bubble: string;
  running: boolean;
  done: boolean;
}

const clamp = (value: number) => Math.min(Math.max(value, -1), 1);

const TypingDots = () => (
  <span aria-hidden className="flex h-7 items-center gap-1.5 px-2">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="stage-dot h-2.5 w-2.5 rounded-full bg-primary"
        style={{ animationDelay: `${i * 150}ms` }}
      />
    ))}
  </span>
);

const HeroStage: React.FC<HeroStageProps> = ({ bubble, running, done }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const [hopKey, setHopKey] = useState(0);
  const [talkKey, setTalkKey] = useState(0);

  const hasSpoken = done || talkKey > 0;
  const mood: MascotMood = running ? "busy" : hasSpoken ? "happy" : "idle";
  const typed = useTypewriter(bubble, !running && hasSpoken, talkKey);

  // بتنط أول ما السكريبت يخلص
  useEffect(() => {
    if (done) setHopKey((key) => key + 1);
  }, [done]);

  // العينين بتتابع الماوس في أي مكان في الصفحة
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const onMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2);
      const y = (event.clientY - (rect.top + rect.height * 0.62)) / (window.innerHeight / 2);
      stage.style.setProperty("--look-x", clamp(x).toFixed(3));
      stage.style.setProperty("--look-y", clamp(y).toFixed(3));
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const handlePoke = () => {
    setHopKey((key) => key + 1);
    setTalkKey((key) => key + 1);
  };

  return (
    <div
      ref={stageRef}
      className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-3xl border-4 border-secondary bg-white dark:border-white/20 dark:bg-darklight"
    >
      <StageBackdrop />

      <div
        role="status"
        className={`about-display absolute left-1/2 top-[18%] -translate-x-1/2 whitespace-nowrap rounded-2xl border-2 border-secondary bg-white px-5 py-2 text-lg font-bold text-secondary transition duration-300 ${
          running || hasSpoken ? "scale-100 opacity-100" : "scale-75 opacity-0"
        }`}
      >
        {running ? (
          <TypingDots />
        ) : (
          <>
            <span className="sr-only">{bubble}</span>
            {/* النص الكامل مخفي بيحجز المقاس، فالفقاعة مبتتهزش وإحنا بنكتب */}
            <span aria-hidden className="grid">
              <span className="invisible col-start-1 row-start-1">{bubble}</span>
              <span className="col-start-1 row-start-1">{typed}</span>
            </span>
          </>
        )}
        <span
          aria-hidden
          className="absolute -bottom-[9px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-secondary bg-white"
        />
      </div>

      <button
        type="button"
        onClick={handlePoke}
        aria-label={bubble}
        className="absolute bottom-[10%] left-1/2 w-2/5 -translate-x-1/2 cursor-pointer rounded-3xl outline-offset-4 focus-visible:outline focus-visible:outline-4 focus-visible:outline-amber-brand"
      >
        <Mascot mood={mood} hopKey={hopKey} />
      </button>
    </div>
  );
};

export default HeroStage;