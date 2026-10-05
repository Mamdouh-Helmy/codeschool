"use client";
import React, { useEffect, useRef, useState } from "react";
import Slider from "react-slick";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import LeadersModal from "../LeadersModal";
import ProjectModal from "../ProjectModal";
import { useI18n } from "@/i18n/I18nProvider";

export type Project = {
  _id: string;
  title: string;
  description?: string;
  image?: string;
  video?: string;
  portfolioLink?: string;
  student?: { id?: string; name?: string; email?: string };
  createdAt?: string;
  featured?: boolean;
};

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ================= Helpers ================= */

const MAX_SLIDES = 8;
const AUTO_SLIDE_MS = 6000;
const YOUTUBE_ID_REGEX =
  /(?:youtu\.be\/|youtube\.com\/(?:shorts\/|embed\/|watch\?v=))([\w-]{11})/;

const getYouTubeId = (url?: string) => url?.match(YOUTUBE_ID_REGEX)?.[1] ?? null;

// iOS مبيعرضش أول فريم من غير الـ fragment ده
const withFirstFrame = (url: string) =>
  url.includes("#") ? url : `${url}#t=0.001`;

// صورة المشروع، أو thumbnail اليوتيوب لو مفيش صورة
const getPoster = ({ image, video }: Pick<Project, "image" | "video">) => {
  if (image) return image;
  const id = getYouTubeId(video);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : undefined;
};

const triggerConfig = (trigger: Element | null, start: string) => ({
  trigger,
  start,
  end: "bottom 20%",
  toggleActions: "play none none reverse",
});

/* ================= Sub components ================= */

const PlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

// فيديو صامت بيشتغل لوحده، وبيتوقف لما paused = true
const AutoPlayVideo = ({
  src,
  poster,
  paused,
  className,
}: {
  src: string;
  poster?: string;
  paused: boolean;
  className?: string;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // لازم يتحط يدوي: React مبيحطش attribute الـ muted وiOS محتاجه للـ autoplay
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.defaultMuted = true;
    video.muted = true;
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) video.pause();
    else video.play().catch(() => {});
  }, [paused, src]);

  return (
    <video
      ref={videoRef}
      src={withFirstFrame(src)}
      poster={poster}
      className={className}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
    />
  );
};

const MeetButton = ({
  label,
  onClick,
  buttonRef,
  fullOnMobile,
}: {
  label: string;
  onClick: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
  fullOnMobile?: boolean;
}) => (
  <button
    ref={buttonRef}
    onClick={onClick}
    className={`group relative inline-flex transform items-center justify-center gap-3 overflow-hidden rounded-2xl bg-primary px-8 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-2xl active:scale-95 ${
      fullOnMobile ? "w-full sm:w-auto" : ""
    }`}
  >
    <span className="relative z-10">{label}</span>
    <div className="absolute inset-0 origin-left scale-x-0 transform bg-gradient-to-r from-primary to-secondary transition-transform duration-300 group-hover:scale-x-100" />
  </button>
);

const Thumbnail = ({
  project,
  active,
  onClick,
}: {
  project: Project;
  active: boolean;
  onClick: () => void;
}) => {
  const poster = getPoster(project);

  return (
    <div className="thumbnail-item">
      <div
        data-thumb={project._id}
        onClick={onClick}
        className={`transform cursor-pointer overflow-hidden rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
          active
            ? "scale-105 border-primary shadow-lg ring-2 ring-primary/50"
            : "border-transparent hover:border-primary/30"
        }`}
      >
        {poster ? (
          <img
            src={poster}
            alt={project.title}
            className="h-20 w-full transform rounded-lg object-cover transition-transform duration-300 hover:scale-110"
          />
        ) : (
          <div className="group flex h-20 w-full items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700">
            <PlayIcon className="h-8 w-8 text-gray-400 transition-colors duration-300 group-hover:text-primary" />
          </div>
        )}
      </div>
    </div>
  );
};

// ميديا الكارت الرئيسي. يوتيوب بيظهر كصورة، والتشغيل الفعلي في المودال
const CardMedia = ({
  project,
  paused,
}: {
  project: Project;
  paused: boolean;
}) => {
  const poster = getPoster(project);
  const mediaClass = "h-64 w-full rounded-2xl object-cover sm:h-80";
  const isYouTube = !!getYouTubeId(project.video);

  if (project.video && !isYouTube) {
    return (
      <AutoPlayVideo
        src={project.video}
        poster={poster}
        paused={paused}
        className={mediaClass}
      />
    );
  }

  if (poster) {
    return (
      <img
        src={poster}
        alt={project.title}
        className={`${mediaClass} md:transform md:transition-transform md:duration-500 md:hover:scale-110`}
      />
    );
  }

  return (
    <div className="flex h-64 w-full items-center justify-center text-sm text-gray-500">
      No media
    </div>
  );
};

/* ================= Main ================= */

const YoungStars = () => {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadersOpen, setLeadersOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  // آخر فيديو المستخدم داس عليه: الـ slideshow بيفضل واقف عليه
  const [videoPressedId, setVideoPressedId] = useState<string | null>(null);

  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const slides = projects.slice(0, MAX_SLIDES);
  const count = slides.length;
  const activeProject = slides[currentIndex];
  const activeId = activeProject?._id;

  const modalOpen = !!selectedProject || leadersOpen;
  const slideshowPaused =
    modalOpen || (!!activeId && videoPressedId === activeId);

  const goTo = (index: number, manual = false) => {
    if (!count) return;
    setCurrentIndex(((index % count) + count) % count);
    if (manual) setVideoPressedId(null);
  };

  const openProject = (project: Project) => {
    if (project.video) setVideoPressedId(project._id);
    setSelectedProject(project);
  };

  /* ----- Fetch ----- */
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/projects?limit=50");
        const data = await res.json();
        if (data?.success && Array.isArray(data.data)) {
          setProjects(data.data.filter((p: Project) => p.featured === true));
        }
      } catch (err) {
        console.error("Failed to load projects:", err);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  /* ----- Auto slide (موبايل فقط) ----- */
  useEffect(() => {
    if (count < 2 || slideshowPaused) return;

    const interval = setInterval(() => {
      if (window.innerWidth < 768) {
        setCurrentIndex((prev) => (prev + 1) % count);
      }
    }, AUTO_SLIDE_MS);

    return () => clearInterval(interval);
  }, [count, slideshowPaused]);

  /* ----- GSAP: ظهور الـ section ----- */
  useEffect(() => {
    if (loading || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      const isDesktop = window.innerWidth >= 1024;

      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 50, rotationX: -45 },
        {
          opacity: 1, y: 0, rotationX: 0, duration: 1.2, ease: "power3.out",
          scrollTrigger: triggerConfig(titleRef.current, "top 80%"),
        }
      );

      gsap.fromTo(
        descriptionRef.current,
        { opacity: 0, x: -30 },
        {
          opacity: 1, x: 0, duration: 1, delay: 0.3, ease: "back.out(1.7)",
          scrollTrigger: triggerConfig(descriptionRef.current, "top 85%"),
        }
      );

      gsap.fromTo(
        buttonRef.current,
        { opacity: 0, scale: 0.8, rotationY: 90 },
        {
          opacity: 1, scale: 1, rotationY: 0, duration: 0.8, delay: 0.6, ease: "elastic.out(1, 0.8)",
          scrollTrigger: triggerConfig(buttonRef.current, "top 90%"),
        }
      );

      // على الموبايل fade من تحت، لأن x:100 كان بيعمل scroll أفقي
      gsap.fromTo(
        sliderRef.current,
        isDesktop ? { opacity: 0, x: 100, rotationY: 15 } : { opacity: 0, y: 40 },
        {
          opacity: 1, x: 0, y: 0, rotationY: 0, duration: 1.2, ease: "power3.out",
          scrollTrigger: triggerConfig(sliderRef.current, "top 85%"),
        }
      );

      if (window.innerWidth >= 768 && thumbnailsRef.current) {
        gsap.fromTo(
          thumbnailsRef.current,
          { opacity: 0, y: 40 },
          {
            opacity: 1, y: 0, duration: 1, delay: 0.8, ease: "bounce.out",
            scrollTrigger: triggerConfig(thumbnailsRef.current, "top 95%"),
          }
        );

        gsap.fromTo(
          thumbnailsRef.current.querySelectorAll(".thumbnail-item"),
          { opacity: 0, scale: 0.5, rotation: -180 },
          {
            opacity: 1, scale: 1, rotation: 0, duration: 0.6, stagger: 0.1, ease: "back.out(1.7)",
            scrollTrigger: triggerConfig(thumbnailsRef.current, "top 85%"),
          }
        );
      }

      gsap.fromTo(
        sectionRef.current,
        { backgroundPosition: "100% 0%" },
        {
          backgroundPosition: "0% 100%", duration: 2, ease: "sine.inOut",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [loading, count]);

  /* ----- GSAP: عند تغيير المشروع النشط ----- */
  useEffect(() => {
    if (!sliderRef.current || !activeId) return;
    const isMobile = window.innerWidth < 768;

    gsap.fromTo(
      sliderRef.current,
      isMobile ? { opacity: 0.4 } : { scale: 0.95, rotationX: -10 },
      isMobile
        ? { opacity: 1, duration: 0.4, ease: "power1.out" }
        : { scale: 1, rotationX: 0, duration: 0.6, ease: "back.out(1.7)" }
    );
  }, [activeId]);

  /* ----- Handlers ----- */
  const handleThumbnailClick = (index: number) => {
    const el = document.querySelector(`[data-thumb="${slides[index]._id}"]`);
    if (el) {
      gsap.fromTo(el, { scale: 1 }, { scale: 0.9, duration: 0.1, yoyo: true, repeat: 1 });
    }
    goTo(index, true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;

    const isRtl = document.documentElement.dir === "rtl";
    const forward = isRtl ? dx > 0 : dx < 0;
    goTo(currentIndex + (forward ? 1 : -1), true);
  };

  /* ----- Slick settings ----- */
  const settingsMain = {
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    fade: false,
    infinite: false,
    swipe: false, // السوايب مخصص فوق
  };

  const settingsThumbs = {
    slidesToShow: 4,
    slidesToScroll: 1,
    dots: false,
    centerMode: false,
    focusOnSelect: true,
    infinite: false,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 3 } },
      { breakpoint: 768, settings: { slidesToShow: 2 } },
      { breakpoint: 480, settings: { slidesToShow: 1 } },
    ],
  };

  /* ----- Render ----- */
  const renderSlider = () => {
    if (loading) {
      return (
        <div className="py-20 text-center text-SlateBlueText">
          <div className="animate-pulse">Loading...</div>
        </div>
      );
    }

    if (!activeProject) {
      return <div className="py-8 text-center text-SlateBlueText">No projects yet.</div>;
    }

    return (
      <>
        <Slider {...settingsMain} key={activeId} className="pb-3">
          <div>
            <div
              className="relative cursor-pointer overflow-hidden rounded-2xl border border-PowderBlueBorder bg-white shadow-lg dark:border-dark_border dark:bg-darkmode md:transform md:transition-transform md:duration-300 md:hover:scale-105"
              onClick={() => openProject(activeProject)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <CardMedia project={activeProject} paused={modalOpen} />

              {/* كابشن + عداد + أيقونة فيديو (موبايل فقط) */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-4 pb-4 pt-12 text-start md:hidden">
                {activeProject.student?.name && (
                  <p className="text-xs font-medium text-white/80">
                    {activeProject.student.name}
                  </p>
                )}
                <p className="line-clamp-1 text-base font-semibold text-white">
                  {activeProject.title}
                </p>
              </div>

              <span className="pointer-events-none absolute start-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium tabular-nums text-white backdrop-blur-sm md:hidden">
                {currentIndex + 1} / {count}
              </span>

              {activeProject.video && (
                <span className="pointer-events-none absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white text-neutral-900 md:hidden">
                  <PlayIcon className="h-4 w-4 translate-x-px" />
                </span>
              )}
            </div>
          </div>
        </Slider>

        {/* Thumbnails: شاشات كبيرة */}
        <div ref={thumbnailsRef} className="hidden md:block">
          <Slider {...settingsThumbs} className="thumb mt-4">
            {slides.map((project, index) => (
              <Thumbnail
                key={`thumb-${project._id}`}
                project={project}
                active={index === currentIndex}
                onClick={() => handleThumbnailClick(index)}
              />
            ))}
          </Slider>
        </div>

        {/* Dots: موبايل */}
        <div className="mt-4 flex items-center justify-center gap-2 md:hidden">
          {slides.map((project, index) => (
            <button
              key={`dot-${project._id}`}
              onClick={() => goTo(index, true)}
              aria-label={`Go to slide ${index + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "w-6 bg-primary"
                  : "w-2 bg-gray-300 dark:bg-gray-600"
              }`}
            />
          ))}
        </div>
      </>
    );
  };

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-white/20 dark:bg-darkmode"
    >
      <div className="container mx-auto px-4 py-10 lg:py-16">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16 xl:gap-24">
          {/* Text: فوق السلايدر على الموبايل */}
          <div className="order-1 w-full text-center lg:order-2 lg:text-start">
            <h2
              ref={titleRef}
              className="text-3xl font-bold leading-tight text-MidnightNavyText dark:text-white sm:text-4xl lg:text-5xl"
            >
              {t("youngStars.title")}
              <span className="block bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent lg:transform lg:transition-transform lg:duration-300 lg:hover:scale-105">
                {t("youngStars.highlighted")}
              </span>
            </h2>

            <p
              ref={descriptionRef}
              className="mx-auto max-w-2xl pb-6 pt-4 text-base font-normal leading-relaxed text-SlateBlueText dark:text-gray-300 sm:text-lg lg:mx-0 lg:pb-12 lg:pt-8 lg:text-xl"
            >
              {t("youngStars.description")}
            </p>

            <div className="hidden gap-4 lg:flex">
              <MeetButton
                buttonRef={buttonRef}
                label={t("youngStars.meetMoreLeaders")}
                onClick={() => setLeadersOpen(true)}
              />
            </div>
          </div>

          {/* Slider */}
          <div ref={sliderRef} className="relative order-2 w-full lg:order-1">
            {renderSlider()}

            <div className="mt-6 flex justify-center lg:hidden">
              <MeetButton
                label={t("youngStars.meetMoreLeaders")}
                onClick={() => setLeadersOpen(true)}
                fullOnMobile
              />
            </div>
          </div>
        </div>
      </div>

      <LeadersModal
        open={leadersOpen}
        onClose={() => setLeadersOpen(false)}
        projects={projects}
        onSelect={(project: Project) => {
          openProject(project);
          setLeadersOpen(false);
        }}
      />

      <ProjectModal
        open={!!selectedProject}
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </section>
  );
};

export default YoungStars;