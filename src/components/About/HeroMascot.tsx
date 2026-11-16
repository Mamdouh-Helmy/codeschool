"use client";

import { useEffect, useRef, useState } from "react";
import Mascot, { type MascotMood } from "./Mascot";
import MascotOrbit from "./MascotOrbit";
import SpeechBubble from "./SpeechBubble";
import { useTypewriter } from "./useTypewriter";
import "./stage.css";

interface HeroMascotProps {
  bubble: string;
  running: boolean;
  done: boolean;
}

const LOOK_RANGE_X = 400;
const LOOK_RANGE_Y = 300;

const clamp = (value: number) => Math.min(Math.max(value, -1), 1);

const HeroMascot: React.FC<HeroMascotProps> = ({ bubble, running, done }) => {
  const mascotRef = useRef<HTMLButtonElement>(null);
  const [hopKey, setHopKey] = useState(0);
  const [talkKey, setTalkKey] = useState(0);

  const hasSpoken = done || talkKey > 0;
  const mood: MascotMood = running ? "busy" : hasSpoken ? "happy" : "idle";
  const typed = useTypewriter(bubble, !running && hasSpoken, talkKey);

  // بتنط أول ما السكريبت يخلص
  useEffect(() => {
    if (done) setHopKey((key) => key + 1);
  }, [done]);

  // العينين والراس بيتابعوا الماوس في أي مكان في الصفحة
  useEffect(() => {
    const element = mascotRef.current;
    if (!element) return undefined;

    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - (rect.left + rect.width / 2)) / LOOK_RANGE_X;
      const y = (event.clientY - (rect.top + rect.height * 0.35)) / LOOK_RANGE_Y;
      element.style.setProperty("--look-x", clamp(x).toFixed(3));
      element.style.setProperty("--look-y", clamp(y).toFixed(3));
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const handlePoke = () => {
    setHopKey((key) => key + 1);
    setTalkKey((key) => key + 1);
  };

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-col items-center">
      <MascotOrbit />

      <SpeechBubble text={bubble} typed={typed} thinking={running} visible={running || hasSpoken} />

      {/* translate-y بينزّل الرجلين شوية جوه الأرضية عشان تبان واقفة عليها */}
      <button
        ref={mascotRef}
        type="button"
        onClick={handlePoke}
        aria-label={bubble}
        className="relative z-10 w-[min(60%,18rem)] translate-y-5 cursor-pointer rounded-3xl outline-offset-4 focus-visible:outline focus-visible:outline-4 focus-visible:outline-amber-brand"
      >
        <Mascot mood={mood} hopKey={hopKey} />
      </button>
    </div>
  );
};

export default HeroMascot;