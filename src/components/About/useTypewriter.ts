"use client";

import { useEffect, useState } from "react";

/** بيكتب النص حرف حرف. enabled=false بيفضّيه، وتغيير restartKey بيعيد الكتابة من الأول */
export function useTypewriter(text: string, enabled: boolean, restartKey = 0, speedMs = 55) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!enabled) {
      setTyped("");
      return undefined;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(text);
      return undefined;
    }

    const chars = Array.from(text);
    let count = 0;
    setTyped("");

    const id = window.setInterval(() => {
      count += 1;
      setTyped(chars.slice(0, count).join(""));
      if (count >= chars.length) window.clearInterval(id);
    }, speedMs);

    return () => window.clearInterval(id);
  }, [text, enabled, restartKey, speedMs]);

  return typed;
}