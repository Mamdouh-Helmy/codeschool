"use client";
// src/app/components/interviewShared.jsx
// مشترك بين صفحة الجلسات وصفحة التقييم: ألوان النتائج + الطيارة الورق + أنيميشن الطيران.

import React from "react";
import { SealCheck, SealQuestion, ArrowsClockwise, Target, Brain, ListChecks, ChatsCircle } from "./icons";

// ─── ألوان النتائج — كل نتيجة لونها مختلف تمامًا عشان تبان من أول نظرة ──────
//   مقبول = أخضر · يحتاج مراجعة = كهرماني · مقابلة إضافية = أحمر/مرجاني
export const INTERVIEW_DECISIONS = {
  pass: {
    ar: "مقبول", en: "Accepted",
    descAr: "الطالب مناسب ويُقبل مباشرة", descEn: "Great fit — accepted right away",
    icon: SealCheck, c1: "#059669", c2: "#14b8a6",
  },
  review: {
    ar: "يحتاج مراجعة", en: "Needs Review",
    descAr: "مستواه جيد لكن محتاج قرار تاني", descEn: "Promising — needs another look",
    icon: SealQuestion, c1: "#f59e0b", c2: "#f67d00",
  },
  repeat: {
    ar: "يحتاج مقابلة إضافية", en: "Needs Another Interview",
    descAr: "محتاج مقابلة تانية قبل القرار", descEn: "Needs one more interview first",
    icon: ArrowsClockwise, c1: "#e11d48", c2: "#ff6437",
  },
};
export const dGrad = (c) => `linear-gradient(135deg, ${c.c1}, ${c.c2})`;

export const INTERVIEW_RATING_ROWS = [
  { key: "commitment",    ar: "الالتزام والتركيز", en: "Commitment & Focus", icon: Target },
  { key: "understanding", ar: "مستوى الاستيعاب",   en: "Understanding Level", icon: Brain },
  { key: "taskExecution", ar: "تنفيذ المهام",      en: "Task Execution",      icon: ListChecks },
  { key: "participation", ar: "المشاركة",          en: "Participation",       icon: ChatsCircle },
];
export const RATING_WORDS = {
  ar: ["", "ضعيف", "مقبول", "جيد", "جيد جدًا", "ممتاز"],
  en: ["", "Weak", "Fair", "Good", "Very good", "Excellent"],
};

// ─── الطيارة الورق (SVG بتبص يمين) ───────────────────────────────────────────
export function PaperPlane({ className = "", style }) {
  return (
    <svg viewBox="0 0 128 64" className={className} style={style} fill="none" aria-hidden="true">
      <polygon points="6,8 124,32 50,32" fill="#ffffff" />
      <polygon points="6,8 50,32 24,32" fill="#e4f1f3" />
      <polygon points="6,56 124,32 50,32" fill="#c9e2e6" />
      <polygon points="50,32 124,32 30,47" fill="#8fbfc6" />
      <path d="M50 32 L124 32" stroke="#feaf00" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function FlightStyles() {
  return (
    <style>{`
      @keyframes ppFly {
        0%   { offset-distance: 0%;   opacity: 0; }
        5%   { opacity: 1; }
        100% { offset-distance: 100%; opacity: 1; }
      }
      @keyframes ppDraw { to { stroke-dashoffset: 0; } }
      @keyframes ppGrow { from { transform: scale(.25) rotate(-8deg); } to { transform: scale(1) rotate(0); } }
      @keyframes ppBank { from { transform: rotate(-7deg); } to { transform: rotate(7deg); } }
      @keyframes ppFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      .animate-shimmer { animation: shimmer 2s infinite; }
    `}</style>
  );
}

// الطيارة بتطير على منحنى (offset-path) ومعاها أثر مرسوم بنفس التوقيت بالظبط.
export function PaperPlaneFlight({ w, h, startX, startY, delay = 0.6, duration = 1.25, size = 150 }) {
  const d =
    `M ${startX} ${startY} ` +
    `C ${startX - 0.25 * w} ${startY - 0.05 * h}, ${0.1 * w} ${0.9 * h}, ${0.45 * w} ${0.62 * h} ` +
    `S ${0.8 * w} ${0.1 * h}, ${1.12 * w} ${-0.1 * h}`;
  const ease = "cubic-bezier(.45,.05,.3,1)";

  return (
    <>
      <svg className="absolute inset-0 pointer-events-none" width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
        <path d={d} pathLength="1" stroke="rgba(255,255,255,.16)" strokeWidth="12" strokeLinecap="round"
          style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: `ppDraw ${duration}s ${delay}s ${ease} forwards` }} />
        <path d={d} pathLength="1" stroke="#feaf00" strokeWidth="2" strokeLinecap="round"
          style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: `ppDraw ${duration}s ${delay}s ${ease} forwards` }} />
      </svg>

      <div
        className="absolute pointer-events-none"
        style={{
          left: 0, top: 0, width: size,
          offsetPath: `path("${d}")`, offsetRotate: "auto", offsetAnchor: "50% 50%",
          offsetDistance: "0%", opacity: 0,
          animation: `ppFly ${duration}s ${delay}s ${ease} forwards`,
        }}
      >
        <div style={{
          animation: `ppGrow .45s ${delay}s both cubic-bezier(.2,.9,.3,1.2), ppBank .6s ${delay}s ease-in-out infinite alternate`,
          filter: "drop-shadow(0 14px 18px rgba(0,0,0,.35))",
        }}>
          <PaperPlane className="w-full h-auto" />
        </div>
      </div>
    </>
  );
}