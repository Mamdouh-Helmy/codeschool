// components/Portfolio/public/CertificatesGallery.tsx
"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Building2,
  Calendar,
  ExternalLink,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
} from "lucide-react";
import { Certificate } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

/* ─────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────── */
function formatDate(d: string | Date | null): string {
  if (!d) return "";
  return new Date(d as string).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });
}

const ACCENT_PALETTE = [
  { ring: "#a855f7", glow: "rgba(168,85,247,.3)"  },
  { ring: "#3b82f6", glow: "rgba(59,130,246,.3)"  },
  { ring: "#10b981", glow: "rgba(16,185,129,.3)"  },
  { ring: "#f59e0b", glow: "rgba(245,158,11,.3)"  },
  { ring: "#ef4444", glow: "rgba(239,68,68,.3)"   },
  { ring: "#06b6d4", glow: "rgba(6,182,212,.3)"   },
];
const ac = (i: number) => ACCENT_PALETTE[i % ACCENT_PALETTE.length];

/* ─────────────────────────────────────────────────────────────────
   Full-screen image zoom modal
───────────────────────────────────────────────────────────────── */
function ImageZoom({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        key="zoom"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-6"
        style={{ background: "rgba(0,0,0,.92)", backdropFilter: "blur(12px)" }}
        onClick={onClose}
      >
        <motion.img
          src={src}
          alt={alt}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 26 }}
          className="max-w-full max-h-full rounded-xl object-contain"
          style={{ maxWidth: "90vw", maxHeight: "88vh", boxShadow: "0 0 80px rgba(0,0,0,.8)" }}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-white transition-all hover:scale-110"
          style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)" }}
        >
          <X size={18} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Single Slide
───────────────────────────────────────────────────────────────── */
function CertSlide({
  cert,
  index,
  isActive,
  onZoom,
}: {
  cert: Certificate;
  index: number;
  isActive: boolean;
  onZoom: () => void;
}) {
  const color = ac(index);

  return (
    <motion.div
      animate={{ opacity: isActive ? 1 : 0.35, scale: isActive ? 1 : 0.93 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative flex-shrink-0 w-full rounded-2xl overflow-hidden"
      style={{
        background: "#0d1117",
        border: `1px solid ${isActive ? color.ring + "66" : "rgba(255,255,255,.06)"}`,
        boxShadow: isActive ? `0 0 60px ${color.glow}, 0 20px 60px rgba(0,0,0,.6)` : "none",
        transition: "border-color .4s, box-shadow .4s",
      }}
    >
      {/* Top accent line */}
      <div
        className="h-[3px] w-full"
        style={{
          background: isActive
            ? `linear-gradient(90deg, ${color.ring}, ${color.ring}44, transparent)`
            : "transparent",
          transition: "background .4s",
        }}
      />

      <div className="flex flex-col md:flex-row">
        {/* ── LEFT: Image (dominant) ── */}
        <div className="relative md:w-[55%] w-full" style={{ minHeight: "280px" }}>
          {cert.image?.url ? (
            <>
              <img
                src={cert.image.url}
                alt={cert.image.alt || cert.title}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: "top center" }}
              />
              {/* Very subtle bottom fade into content area on mobile */}
              <div
                className="absolute inset-0 md:hidden"
                style={{ background: "linear-gradient(to bottom, transparent 55%, #0d1117 100%)" }}
              />
              {/* Right fade on desktop */}
              <div
                className="absolute inset-0 hidden md:block"
                style={{ background: "linear-gradient(to right, transparent 60%, #0d1117 100%)" }}
              />

              {/* Zoom button */}
              {isActive && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={onZoom}
                  className="absolute top-4 right-4 p-2 rounded-full text-white transition-all hover:scale-110 z-10"
                  style={{ background: "rgba(0,0,0,.5)", border: "1px solid rgba(255,255,255,.2)", backdropFilter: "blur(4px)" }}
                  title="Zoom image"
                >
                  <ZoomIn size={15} />
                </motion.button>
              )}
            </>
          ) : (
            /* Placeholder */
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, #090d14, ${color.ring}18)` }}
            >
              <div
                className="absolute inset-0 opacity-[.06]"
                style={{
                  backgroundImage: `linear-gradient(${color.ring} 1px, transparent 1px), linear-gradient(90deg, ${color.ring} 1px, transparent 1px)`,
                  backgroundSize: "28px 28px",
                }}
              />
              <div
                className="absolute w-36 h-36 rounded-full blur-3xl opacity-25"
                style={{ background: color.ring }}
              />
              <Award size={56} style={{ color: color.ring, opacity: 0.4, position: "relative" }} />
            </div>
          )}
        </div>

        {/* ── RIGHT: Info ── */}
        <div className="md:w-[45%] w-full p-7 flex flex-col justify-between gap-5 relative z-10">
          {/* Badge */}
          <div>
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full mb-4 tracking-wide uppercase"
              style={{
                background: `${color.ring}1a`,
                color: color.ring,
                border: `1px solid ${color.ring}44`,
              }}
            >
              <Shield size={10} />
              Verified
            </span>

            <h3 className="text-xl font-black text-white leading-tight mb-3">
              {cert.title}
            </h3>

            {cert.issuer && (
              <p
                className="flex items-center gap-2 text-sm font-semibold mb-3"
                style={{ color: color.ring }}
              >
                <Building2 size={13} />
                {cert.issuer}
              </p>
            )}

            {cert.description && (
              <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">
                {cert.description}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 flex-wrap">
            {cert.issueDate && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500 px-3 py-1.5 rounded-full"
                style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
              >
                <Calendar size={11} />
                {formatDate(cert.issueDate)}
              </span>
            )}
            {cert.credentialUrl && (
              <a
                href={cert.credentialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full transition-all hover:opacity-80 hover:scale-105"
                style={{ background: color.ring, color: "#fff" }}
              >
                <ExternalLink size={12} />
                Verify Credential
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Dot indicator
───────────────────────────────────────────────────────────────── */
function Dots({ total, active, onDotClick }: { total: number; active: number; onDotClick: (i: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      {Array.from({ length: total }).map((_, i) => {
        const color = ac(i);
        return (
          <button
            key={i}
            onClick={() => onDotClick(i)}
            className="rounded-full transition-all duration-300 hover:scale-125"
            style={{
              width: i === active ? "24px" : "8px",
              height: "8px",
              background: i === active ? color.ring : "rgba(255,255,255,.15)",
            }}
          />
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Main Export
───────────────────────────────────────────────────────────────── */
interface CertificatesGalleryProps {
  certificates: Certificate[];
}

export default function CertificatesGallery({ certificates = [] }: CertificatesGalleryProps) {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  if (!certificates.length) return null;

  const prev = useCallback(() => setActive((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setActive((i) => Math.min(certificates.length - 1, i + 1)), [certificates.length]);

  /* keyboard */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next]);

  /* scroll track to active */
  useEffect(() => {
    if (!trackRef.current) return;
    const slide = trackRef.current.children[active] as HTMLElement;
    if (!slide) return;
    trackRef.current.scrollTo({ left: slide.offsetLeft - 16, behavior: "smooth" });
  }, [active]);

  const currentColor = ac(active);
  const hasPrev = active > 0;
  const hasNext = active < certificates.length - 1;

  return (
    <>
      <section
        className="relative py-24 overflow-hidden"
        style={{ background: "#060910" }}
        id="certificates"
      >
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-[.08]"
            style={{ background: `radial-gradient(circle, ${currentColor.ring}, transparent)`, transition: "background 0.6s" }} />
          <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-[.06]"
            style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }} />
          <div className="absolute inset-0 opacity-[.02]"
            style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        </div>

        <div className="container mx-auto px-4 relative">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="text-center mb-14"
          >
            <div
              className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
              style={{ background: "rgba(168,85,247,.12)", border: "1px solid rgba(168,85,247,.3)", color: "#a855f7" }}
            >
              <Shield size={12} />
              {t("portfolio.certificates.sectionBadge") || "Credentials & Achievements"}
            </div>
            <h2 className="text-4xl font-black text-white mb-4 tracking-tight">
              {t("portfolio.certificates.sectionTitle") || "Certificates"}
            </h2>
            <p className="text-gray-400 max-w-lg mx-auto text-base leading-relaxed">
              {t("portfolio.certificates.sectionDesc") ||
                "Verified credentials that reflect continuous learning and professional growth."}
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-purple-500/50" />
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-purple-500/50" />
            </div>
          </motion.div>

          {/* Slider */}
          <div className="relative max-w-4xl mx-auto">
            {/* Prev button */}
            <button
              onClick={prev}
              disabled={!hasPrev}
              className="absolute -left-5 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full transition-all hover:scale-110 disabled:opacity-20 disabled:cursor-not-allowed"
              style={{
                background: hasPrev ? currentColor.ring : "rgba(255,255,255,.06)",
                color: "#fff",
                boxShadow: hasPrev ? `0 0 20px ${currentColor.glow}` : "none",
                border: "none",
              }}
            >
              <ChevronLeft size={18} />
            </button>

            {/* Track */}
            <div
              ref={trackRef}
              className="overflow-hidden rounded-2xl"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <CertSlide
                    cert={certificates[active]}
                    index={active}
                    isActive={true}
                    onZoom={() => {
                      const url = certificates[active].image?.url;
                      if (url) setZoomSrc(url);
                    }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Next button */}
            <button
              onClick={next}
              disabled={!hasNext}
              className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full transition-all hover:scale-110 disabled:opacity-20 disabled:cursor-not-allowed"
              style={{
                background: hasNext ? currentColor.ring : "rgba(255,255,255,.06)",
                color: "#fff",
                boxShadow: hasNext ? `0 0 20px ${currentColor.glow}` : "none",
                border: "none",
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Dots */}
          <Dots total={certificates.length} active={active} onDotClick={setActive} />

          {/* Counter */}
          <div className="mt-6 text-center">
            <span className="text-xs text-gray-600">
              {active + 1} / {certificates.length}
            </span>
          </div>

          {/* Thumbnails strip */}
          {certificates.length > 1 && (
            <div className="mt-10 flex gap-3 justify-center flex-wrap">
              {certificates.map((cert, i) => {
                const color = ac(i);
                const isAct = i === active;
                return (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className="relative rounded-xl overflow-hidden transition-all duration-300 flex-shrink-0"
                    style={{
                      width: "72px",
                      height: "52px",
                      border: isAct ? `2px solid ${color.ring}` : "2px solid rgba(255,255,255,.08)",
                      boxShadow: isAct ? `0 0 16px ${color.glow}` : "none",
                      transform: isAct ? "scale(1.08)" : "scale(1)",
                    }}
                  >
                    {cert.image?.url ? (
                      <img
                        src={cert.image.url}
                        alt={cert.image.alt || cert.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: `${color.ring}18` }}
                      >
                        <Award size={18} style={{ color: color.ring, opacity: 0.6 }} />
                      </div>
                    )}
                    {/* Active overlay */}
                    {isAct && (
                      <div className="absolute inset-0" style={{ background: `${color.ring}22` }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Full-screen zoom */}
      {zoomSrc && (
        <ImageZoom
          src={zoomSrc}
          alt="Certificate"
          onClose={() => setZoomSrc(null)}
        />
      )}
    </>
  );
}