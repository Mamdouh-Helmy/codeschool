"use client";
import React, { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const ROTATE_MS = 5000;
// خليها true لو عايز صورة صغيرة جنب كل صف في القايمة (التصميم الأصلي من غيرها)
const SHOW_LIST_THUMBS = false;

type Story = { title: string; url: string; thumb?: string };

type Meta = {
  short: "YT" | "FB" | "IG";
  label: string;
  embed: string;
  thumb: string | null;
};

// الفيديو مش بيتحمّل غير لما المستخدم يدوس Play (click-to-play)،
// ودا اللي بيخلينا نوقف الـ slideshow بشكل مضمون وقت التشغيل.
const getMeta = (url: string, customThumb?: string): Meta => {
  const id =
    url.split("/shorts/")[1]?.split("?")[0] ??
    url.split("v=")[1]?.split("&")[0] ??
    url.split("youtu.be/")[1]?.split("?")[0] ??
    "";
    if (url.includes("facebook.com")) {
    const id = url.split("/reel/")[1]?.split(/[?/]/)[0] ?? "";
    return {
      short: "FB",
      label: "Facebook Reels",
      embed: `https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Freel%2F${id}&show_text=0&autoplay=true&width=360&height=640`,
      thumb: customThumb ?? null, // فيسبوك مفيهوش thumbnail تلقائي
    };
  }
  if (url.includes("instagram.com")) {
    const id = url.split("/reel/")[1]?.split(/[?/]/)[0] ?? "";
    return {
      short: "IG",
      label: "Instagram Reels",
      embed: `https://www.instagram.com/reel/${id}/embed`,
      thumb: customThumb ?? null,
    };
  }
  return {
    short: "YT",
    label: url.includes("/shorts/") ? "YouTube Shorts" : "YouTube",
    embed: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1`,
    thumb: customThumb ?? `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
  };
};

const Thumb = ({
  src,
  className = "",
}: {
  src: string | null;
  className?: string;
}) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span
        className={`${className} bg-gradient-to-br from-secondary to-brand-deep`}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${className} object-cover`}
    />
  );
};

const Highlight = () => {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const stats = [
    { number: "2500+", label: t("highlight.stats.parents") },
    { number: "890+", label: t("highlight.stats.coders") },
    { number: "3214+", label: t("highlight.stats.participants") },
    { number: "16+", label: t("highlight.stats.partnerships") },
  ];

  const stories: Story[] = [
    {
      title: t("highlight.slides.graduation"),
      url: "https://youtube.com/shorts/5N1bYifaCws?si=iy3qO9nS0WXymkM2",
    },
    {
      title: t("highlight.slides.studentProjects") || "مشاريع الطلاب",
      url: "https://youtube.com/shorts/Xl6WWxK8HWY?si=vhUt4IfSGuMIVz_j",
    },
    {
      title: t("highlight.slides.showcase"),
      url: "https://www.facebook.com/reel/1241224360842408",
      thumb: "/images/highlight/showcase.jpg",
    },
    {
      title: t("highlight.slides.competition"),
      url: "https://www.facebook.com/reel/846940067682949",
      thumb: "/images/highlight/competition.jpg",
    },
  ];

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const rotating = !playing && !reducedMotion;

  // الـ slideshow: بيتحرك لوحده بس لو مفيش فيديو شغال ومفيش hover/focus
  useEffect(() => {
    if (!rotating || hovering) return;
    const id = setTimeout(
      () => setActive((a) => (a + 1) % stories.length),
      ROTATE_MS
    );
    return () => clearTimeout(id);
  }, [active, rotating, hovering, stories.length]);

  const select = (i: number) => {
    setActive(i);
    setPlaying(false); // اختيار فيديو تاني بيقفل اللي شغال
  };

  const current = stories[active];
  const meta = getMeta(current.url, current.thumb);

  return (
    <section className="bg-IcyBreeze dark:bg-darkmode py-16 lg:py-24 overflow-hidden">
      <style>{`@keyframes hl-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>

      <div className="container">
        <div
          className="grid gap-12 lg:gap-x-12 lg:grid-cols-[minmax(0,34rem)_minmax(0,28rem)_minmax(0,18rem)] lg:justify-between items-start max-w-[100rem] mx-auto"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onFocus={() => setHovering(true)}
          onBlur={() => setHovering(false)}
        >
          {/* 1) النص + الأرقام */}
          <div>
            <h2 className="text-4xl lg:text-5xl font-bold leading-tight text-brand-deep dark:text-white">
              {t("highlight.title.main")} {t("highlight.title.highlighted")}
            </h2>

            <p className="mt-5 text-lg leading-relaxed text-secondary dark:text-gray-300 max-w-md">
              {t("highlight.description")}
            </p>

            <dl className="mt-12 grid grid-cols-2 border-t border-secondary/15 dark:border-dark_border">
              {stats.map((s, i) => (
                <div
                  key={i}
                  className={`px-8 py-7 ${
                    i < 2
                      ? "border-b border-secondary/15 dark:border-dark_border"
                      : ""
                  } ${
                    i % 2 === 0
                      ? "border-e border-secondary/15 dark:border-dark_border"
                      : ""
                  }`}
                >
                  <dd className="text-4xl font-bold tabular-nums text-primary">
                    {s.number}
                  </dd>
                  <dt className="mt-1 text-sm text-secondary/70 dark:text-gray-400">
                    {s.label}
                  </dt>
                </div>
              ))}
            </dl>
          </div>

          {/* 2) الـ stage */}
          <div className="relative mx-auto w-full max-w-[28rem] mb-3 lg:mb-6">
            <div
              aria-hidden
              className="absolute inset-0 translate-x-3 translate-y-3 lg:translate-x-6 lg:translate-y-6 rounded-[1.75rem] bg-primary"
            />
            <div className="relative aspect-[3/4] overflow-hidden rounded-[1.75rem] bg-brand-deep">
              {playing ? (
                <iframe
                  key={current.url}
                  className="absolute inset-0 h-full w-full"
                  src={meta.embed}
                  title={current.title}
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  aria-label={current.title}
                  className="group absolute inset-0 h-full w-full text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
                >
                  <Thumb
                    src={meta.thumb}
                    className="absolute inset-0 h-full w-full"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-brand-deep/90 via-brand-deep/10 to-transparent" />

                  <span className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white shadow-brand-md transition-transform duration-200 group-hover:scale-105">
                    <Play className="h-8 w-8 fill-current ms-1 rtl:-scale-x-100" />
                  </span>

                  <span className="absolute inset-x-0 bottom-0 p-8">
                    <span className="block text-2xl font-bold leading-snug text-white">
                      {current.title}
                    </span>
                    <span className="mt-3 flex items-center gap-2 text-sm font-medium text-primary">
                      <span className="flex h-4 w-5 items-center justify-center rounded-[4px] bg-primary">
                        <Play className="h-2 w-2 fill-white text-white" />
                      </span>
                      {meta.label}
                    </span>
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* 3) قايمة القصص */}
          <ul className="flex flex-col lg:self-center">
            {stories.map((story, i) => {
              const isActive = i === active;
              const m = getMeta(story.url, story.thumb);
              return (
                <li
                  key={i}
                  className={`border-b border-secondary/15 dark:border-dark_border ${
                    i === 0 ? "border-t" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => select(i)}
                    aria-current={isActive}
                    className={`relative flex w-full items-center gap-4 px-6 py-6 text-start transition-colors ${
                      isActive
                        ? "bg-brand-deep text-white"
                        : "text-secondary dark:text-gray-300 hover:bg-secondary/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        isActive ? "text-white/70" : "text-secondary/60"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    {SHOW_LIST_THUMBS && (
                      <Thumb
                        src={m.thumb}
                        className="h-16 w-9 shrink-0 rounded-md"
                      />
                    )}

                    <span className="flex-1 text-base font-semibold leading-snug">
                      {story.title}
                    </span>

                    <span
                      className={`text-[11px] font-medium ${
                        isActive ? "text-white/60" : "text-secondary/50"
                      }`}
                    >
                      {m.short}
                    </span>

                    {isActive && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
                        <span
                          key={`${active}-${hovering}`}
                          className="block h-full origin-left rtl:origin-right bg-primary"
                          style={
                            rotating
                              ? {
                                  animation: `hl-fill ${ROTATE_MS}ms linear forwards`,
                                  animationPlayState: hovering
                                    ? "paused"
                                    : "running",
                                }
                              : { transform: "scaleX(1)" }
                          }
                        />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default Highlight;