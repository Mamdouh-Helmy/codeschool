"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** بيشغّل "سكريبت" خطوة بخطوة: step = رقم البلوك الشغّال حاليًا، و done لما يخلص */
export function useScriptRunner(steps: number, stepMs = 800) {
  const [step, setStep] = useState(-1);
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const run = useCallback(() => {
    window.clearInterval(timer.current);
    setDone(false);
    setStep(0);

    let current = 0;
    timer.current = window.setInterval(() => {
      current += 1;
      if (current >= steps) {
        window.clearInterval(timer.current);
        setStep(-1);
        setDone(true);
        return;
      }
      setStep(current);
    }, stepMs);
  }, [steps, stepMs]);

  useEffect(() => () => window.clearInterval(timer.current), []);

  return { step, done, running: step >= 0, run };
}