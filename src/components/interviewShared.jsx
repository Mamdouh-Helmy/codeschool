"use client";
// src/app/components/interviewShared.jsx
// مشترك بين صفحات المدرس: ألوان النتائج + الطيارة الورق + أنيميشن الطيران + PaperPlaneLoader.

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

// ─── الطيارة الورق ───────────────────────────────────────────────────────────
// أوجه الطيّة: جناح علوي (أفتح) · ظل الطيّة الخلفية · جناح سفلي · كيل (أغمق) · خط الطيّة.
// palette="white" للخلفيات الغامقة/الجرادينت · palette="brand" للخلفيات الفاتحة.
const PLANE_PALETTES = {
  white: { top: "#ffffff", shade: "#e4f1f3", side: "#c9e2e6", keel: "#8fbfc6", crease: "#feaf00" },
  brand: { top: "#ff8a3d", shade: "#ff6700", side: "#0e7c8c", keel: "#004d59", crease: "#feaf00" },
};

export function PaperPlane({ className = "", style, palette = "white" }) {
  const p = PLANE_PALETTES[palette] || PLANE_PALETTES.white;
  return (
    <svg viewBox="0 0 128 64" className={className} style={style} fill="none" aria-hidden="true"
      shapeRendering="geometricPrecision" strokeLinejoin="round">
      <polygon points="124,30 12,58 48,32" fill={p.side} />
      <polygon points="6,6 48,32 24,27" fill={p.shade} />
      <polygon points="124,30 6,6 48,32" fill={p.top} />
      <polygon points="124,30 48,32 30,46" fill={p.keel} />
      <path d="M124 30 L48 32" stroke={p.crease} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// ─── Loader: طيارة ورق بتعدّي بقوس ومعاها أثر (بديل أي spinner دايري) ─────────
const LOADER_CSS = `
@keyframes ppLoadFly {
  0%   { transform: translate(-120%, 40%) rotate(10deg) scale(.6); opacity: 0; }
  20%  { opacity: 1; }
  50%  { transform: translate(0, -30%) rotate(-8deg) scale(1); opacity: 1; }
  80%  { opacity: 1; }
  100% { transform: translate(120%, 40%) rotate(10deg) scale(.6); opacity: 0; }
}
@keyframes ppLoadTrail {
  0%   { transform: scaleX(0); transform-origin: left; opacity: 0; }
  50%  { transform: scaleX(1); transform-origin: left; opacity: .9; }
  51%  { transform-origin: right; }
  100% { transform: scaleX(0); transform-origin: right; opacity: 0; }
}
@keyframes ppLoadLabel { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
.pp-loader { position: relative; display: inline-block; }
.pp-loader--inline { overflow: hidden; vertical-align: middle; }
.pp-loader__plane {
  position: absolute; left: 50%; top: 50%;
  width: var(--pp-w); margin-left: calc(var(--pp-w) / -2); margin-top: calc(var(--pp-w) / -4);
  animation: ppLoadFly 1.6s cubic-bezier(.45,.05,.3,1) infinite;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,.25));
}
.pp-loader__trail {
  position: absolute; left: 10%; right: 10%; bottom: 16%; height: 2px; border-radius: 2px;
  background: linear-gradient(90deg, transparent, var(--pp-trail), transparent);
  animation: ppLoadTrail 1.6s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .pp-loader__plane, .pp-loader__trail { animation: none; }
  .pp-loader__plane { opacity: 1; }
}`;

/**
 * size   : عرض الطيارة بالبكسل
 * tone   : "brand" للخلفيات الفاتحة · "light" للأزرار/الجرادينت
 * inline : نسخة صغيرة للأزرار (بتتقص جوه نافذة صغيرة، من غير أثر ولا label)
 * label  : نص تحت الطيارة (للنسخة الكاملة بس)
 */
export function PaperPlaneLoader({ size = 44, tone = "brand", label, inline = false, className = "" }) {
  const light = tone === "light";
  const box = {
    width: size * 2.4,
    height: inline ? size : size * 1.3,
    "--pp-w": `${size}px`,
    "--pp-trail": light ? "rgba(255,255,255,.85)" : "#ff6700",
  };

  const scene = (
    <span dir="ltr" aria-hidden="true" className={`pp-loader ${inline ? "pp-loader--inline" : ""}`} style={box}>
      {!inline && <span className="pp-loader__trail" />}
      <span className="pp-loader__plane">
        <PaperPlane palette={light ? "white" : "brand"} className="w-full h-auto block" />
      </span>
    </span>
  );

  if (inline) {
    return (
      <span role="status" aria-label={label || "Loading"} className={`inline-flex ${className}`}>
        <style>{LOADER_CSS}</style>
        {scene}
      </span>
    );
  }

  return (
    <span role="status" aria-live="polite" className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <style>{LOADER_CSS}</style>
      {scene}
      {label && (
        <span className={`text-xs font-black ${light ? "text-white/80" : "text-gray-500 dark:text-[#8b949e]"}`}
          style={{ animation: "ppLoadLabel 1.6s ease-in-out infinite" }}>
          {label}
        </span>
      )}
    </span>
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