"use client";
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Slider from "react-slick";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import LeadersModal from "../LeadersModal";
import ProjectModal from "../ProjectModal";
import { useI18n } from "@/i18n/I18nProvider";

// تسجيل plugin مرة واحدة فقط
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

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

const YoungStars = () => {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [leadersOpen, setLeadersOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Refs للأنيميشن
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  // ✅ Refs لتتبع الحالة السابقة
  const hasFetched = useRef(false);
  const isAnimating = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollTriggerRef = useRef<ScrollTrigger[]>([]);

  // ✅ useMemo للـ thumbnails لمنع إعادة الحساب
  const thumbnails = useMemo(() => {
    return projects.slice(0, 8);
  }, [projects]);

  // ✅ useMemo للسلايدر settings لمنع إعادة الإنشاء
  const settingsMain = useMemo(() => ({
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    fade: false,
    infinite: false,
    autoplay: false,
    speed: 300,
  }), []);

  const settingsThumbs = useMemo(() => ({
    slidesToShow: 4,
    slidesToScroll: 1,
    dots: false,
    centerMode: false,
    focusOnSelect: true,
    infinite: false,
    autoplay: false,
    speed: 300,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 3 } },
      { breakpoint: 768, settings: { slidesToShow: 2 } },
      { breakpoint: 480, settings: { slidesToShow: 1 } },
    ],
  }), []);

  // ✅ تحسين fetchProjects مع caching
  useEffect(() => {
    if (hasFetched.current) return;

    const fetchProjects = async () => {
      try {
        setLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch("/api/projects?limit=50&featured=true", {
          signal: controller.signal,
          cache: 'force-cache',
          headers: {
            'Cache-Control': 'max-age=300' // 5 دقائق cache
          }
        });

        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        if (data?.success && Array.isArray(data.data)) {
          const featuredProjects = data.data.filter(
            (p: Project) => p.featured === true
          );

          setProjects(featuredProjects);

          if (featuredProjects.length > 0) {
            setActiveId(featuredProjects[0]._id);
            setCurrentIndex(0);
          }
        }
      } catch (err) {
        console.error("Failed to load projects:", err);
        // لا نعيد تعيين projects إذا فشل الـ fetch
      } finally {
        setLoading(false);
        hasFetched.current = true;
      }
    };

    fetchProjects();

    return () => {
      // تنظيف عند unmount
      hasFetched.current = false;
    };
  }, []); // ✅ array فارغة - يعمل مرة واحدة فقط

  // ✅ تحسين الـ interval مع cleanup
  useEffect(() => {
    if (thumbnails.length === 0 || !activeId || isAnimating.current) return;

    const isMobile = window.innerWidth < 768;
    if (!isMobile) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // تنظيف أي interval سابق
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (isAnimating.current || thumbnails.length === 0) return;

      isAnimating.current = true;
      const currentIdx = thumbnails.findIndex(p => p._id === activeId);
      const nextIndex = (currentIdx + 1) % thumbnails.length;

      // ✅ استخدام batch update لتقليل re-renders
      setActiveId(thumbnails[nextIndex]._id);
      setCurrentIndex(nextIndex);

      // ✅ إعادة تعيين flag بعد وقت قصير
      setTimeout(() => {
        isAnimating.current = false;
      }, 100);
    }, 6000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isAnimating.current = false;
    };
  }, [thumbnails.length]); // ✅ الاعتماد فقط على length وليس array كاملة

  // ✅ GSAP Animations مع تحسينات
  useEffect(() => {
    if (loading || !sectionRef.current) return;

    // تنظيف أي ScrollTriggers سابقة
    scrollTriggerRef.current.forEach(trigger => trigger.kill());
    scrollTriggerRef.current = [];

    const ctx = gsap.context(() => {
      // ✅ إنشاء أنيميشن مرة واحدة فقط
      const animations = [
        {
          element: titleRef.current,
          from: { opacity: 0, y: 50, rotationX: -45 },
          to: { opacity: 1, y: 0, rotationX: 0, duration: 1.2, ease: "power3.out" }
        },
        {
          element: descriptionRef.current,
          from: { opacity: 0, x: -30 },
          to: { opacity: 1, x: 0, duration: 1, delay: 0.3, ease: "back.out(1.7)" }
        },
        {
          element: buttonRef.current,
          from: { opacity: 0, scale: 0.8, rotationY: 90 },
          to: { opacity: 1, scale: 1, rotationY: 0, duration: 0.8, delay: 0.6, ease: "elastic.out(1, 0.8)" }
        },
        {
          element: sliderRef.current,
          from: { opacity: 0, x: 100, rotationY: 15 },
          to: { opacity: 1, x: 0, rotationY: 0, duration: 1.4, ease: "power3.out" }
        }
      ];

      animations.forEach((anim, index) => {
        if (anim.element) {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: anim.element,
              start: "top 80%",
              end: "bottom 20%",
              toggleActions: "play none none none", // ✅ تغيير من reverse إلى none
              once: true, // ✅ تشغيل مرة واحدة فقط
              id: `animation-${index}`
            }
          });

          tl.fromTo(anim.element, anim.from, anim.to);
          if (tl.scrollTrigger) {
            scrollTriggerRef.current.push(tl.scrollTrigger);
          }

        }
      });

      // ✅ أنيميشن للخلفية (مرة واحدة)
      if (sectionRef.current) {
        const bgAnimation = gsap.fromTo(sectionRef.current,
          { backgroundPosition: "100% 0%" },
          {
            backgroundPosition: "0% 100%",
            duration: 2,
            ease: "sine.inOut",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
              once: true,
              id: "bg-animation"
            }
          }
        );

        if (bgAnimation.scrollTrigger) {
          scrollTriggerRef.current.push(bgAnimation.scrollTrigger);
        }
      }

      // ✅ أنيميشن للثمبنيلز فقط للشاشات الكبيرة
      if (window.innerWidth >= 768 && thumbnailsRef.current && thumbnails.length > 0) {
        const thumbnailAnimation = gsap.fromTo(thumbnailsRef.current,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            delay: 0.8,
            ease: "bounce.out",
            scrollTrigger: {
              trigger: thumbnailsRef.current,
              start: "top 95%",
              end: "bottom 20%",
              toggleActions: "play none none none",
              once: true,
              id: "thumbnails-animation"
            }
          }
        );

        if (thumbnailAnimation.scrollTrigger) {
          scrollTriggerRef.current.push(thumbnailAnimation.scrollTrigger);
        }
      }

    }, sectionRef);

    return () => {
      ctx.revert();
      // تنظيف الـ refs
      scrollTriggerRef.current = [];
    };
  }, [loading]); // ✅ الاعتماد فقط على loading

  // ✅ أنيميشن عند تغيير المشروع النشط (محسنة)
  useEffect(() => {
    if (!sliderRef.current || !activeId || isAnimating.current) return;

    isAnimating.current = true;

    gsap.killTweensOf(sliderRef.current);

    gsap.fromTo(sliderRef.current,
      {
        scale: 0.95,
        rotationX: -10,
        opacity: 0.8
      },
      {
        scale: 1,
        rotationX: 0,
        opacity: 1,
        duration: 0.6,
        ease: "back.out(1.7)",
        onComplete: () => {
          isAnimating.current = false;
        }
      }
    );
  }, [activeId]);

  // ✅ handleThumbnailClick مع debounce
  const handleThumbnailClick = useCallback((projectId: string) => {
    if (isAnimating.current || activeId === projectId) return;

    isAnimating.current = true;

    const clickedThumb = document.querySelector(`[data-thumb="${projectId}"]`);
    if (clickedThumb) {
      gsap.fromTo(clickedThumb,
        { scale: 1 },
        {
          scale: 0.9,
          duration: 0.1,
          yoyo: true,
          repeat: 1,
          onComplete: () => {
            setActiveId(projectId);
            setCurrentIndex(thumbnails.findIndex(p => p._id === projectId));

            setTimeout(() => {
              isAnimating.current = false;
            }, 100);
          }
        }
      );
    } else {
      setActiveId(projectId);
      setCurrentIndex(thumbnails.findIndex(p => p._id === projectId));

      setTimeout(() => {
        isAnimating.current = false;
      }, 100);
    }
  }, [activeId, thumbnails]);

  const handleDotClick = useCallback((index: number) => {
    if (isAnimating.current || currentIndex === index) return;

    isAnimating.current = true;
    setActiveId(thumbnails[index]._id);
    setCurrentIndex(index);

    setTimeout(() => {
      isAnimating.current = false;
    }, 100);
  }, [currentIndex, thumbnails]);

  // ✅ Memoized activeProject
  const activeProject = useMemo(() => {
    return thumbnails.find((p) => p._id === activeId) || thumbnails[0] || null;
  }, [activeId, thumbnails]);

  // ✅ تنظيف كامل عند unmount
  useEffect(() => {
    return () => {
      // تنظيف الـ intervals
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // تنظيف الـ ScrollTriggers
      scrollTriggerRef.current.forEach(trigger => trigger.kill());
      scrollTriggerRef.current = [];

      // تنظيف الـ refs
      isAnimating.current = false;
      hasFetched.current = false;

      // تنظيف GSAP
      gsap.killTweensOf("*");
    };
  }, []);

  // ✅ تحسين render function
  const renderMainSlider = () => {
    if (loading) {
      return (
        <div className="py-20 text-center text-SlateBlueText">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      );
    }

    if (!activeProject) {
      return (
        <div className="py-8 text-center text-SlateBlueText">
          {t("youngStars.noProjects")}
        </div>
      );
    }

    return (
      <>
        <Slider {...settingsMain} key={activeId} className="pb-3">
          <div>
            <div
              className="rounded-2xl overflow-hidden shadow-lg bg-white dark:bg-darkmode border border-PowderBlueBorder dark:border-dark_border cursor-pointer transform transition-transform duration-300 hover:scale-105"
              onClick={() => {
                if (isAnimating.current) return;
                setSelectedProject(activeProject);
              }}
            >
              {activeProject.video ? (
                activeProject.video.includes("youtube.com") || activeProject.video.includes("youtu.be") ? (
                  <div className="relative rounded-2xl overflow-hidden bg-black">
                    <iframe
                      src={activeProject.video
                        .replace("youtube.com/shorts/", "www.youtube.com/embed/")
                        .replace("watch?v=", "embed/")
                        .replace("youtu.be/", "www.youtube.com/embed/")}
                      title={activeProject.title || "Project Video"}
                      className="w-full h-80 rounded-2xl"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <video
                    src={activeProject.video}
                    className="w-full h-80 object-cover rounded-2xl"
                    loop
                    autoPlay
                    playsInline
                    muted
                    preload="metadata"
                  />
                )
              ) : activeProject.image ? (
                <img
                  src={activeProject.image}
                  alt={activeProject.title}
                  className="w-full h-80 object-cover rounded-2xl transform transition-transform duration-500 hover:scale-110"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-64 flex items-center justify-center text-sm text-gray-500">
                  {t("youngStars.noMedia")}
                </div>
              )}
            </div>
          </div>
        </Slider>

        {/* ===== Thumbnail Slider للشاشات الكبيرة ===== */}
        {thumbnails.length > 1 && (
          <div ref={thumbnailsRef} className="hidden md:block">
            <Slider {...settingsThumbs} className="thumb mt-4">
              {thumbnails.map((p) => (
                <div key={`thumb-${p._id}`} className="thumbnail-item">
                  <div
                    data-thumb={p._id}
                    className={`rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-300 transform hover:scale-105 ${p._id === activeId
                        ? "border-primary shadow-lg scale-105 ring-2 ring-primary/50"
                        : "border-transparent hover:border-primary/30"
                      }`}
                    onClick={() => handleThumbnailClick(p._id)}
                  >
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.title}
                        className="w-full h-20 object-cover rounded-lg transform transition-transform duration-300 hover:scale-110"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : p.video ? (
                      <div className="w-full h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center group">
                        <svg className="w-8 h-8 text-gray-400 group-hover:text-primary transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-full h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-xs text-gray-500">
                        {t("youngStars.noThumbnail")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </Slider>
          </div>
        )}

        {/* ===== Dots Navigation للشاشات الصغيرة ===== */}
        {thumbnails.length > 1 && (
          <div className="md:hidden flex justify-center mt-6 gap-3">
            {thumbnails.map((_, index) => (
              <button
                key={`dot-${index}`}
                onClick={() => handleDotClick(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentIndex
                    ? 'bg-primary scale-125'
                    : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                aria-label={`Go to slide ${index + 1}`}
                disabled={isAnimating.current}
              />
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <section
      ref={sectionRef}
      className="bg-white/20 dark:bg-darkmode relative overflow-hidden"
    >
      <div className="container mx-auto px-4 py-8 lg:py-16">
        <div className="grid lg:grid-cols-2 grid-cols-1 items-center gap-12 lg:gap-16 xl:gap-24">
          {/* ===== Main Slider ===== */}
          <div ref={sliderRef} className="w-full relative">
            {renderMainSlider()}
          </div>

          {/* ===== Right Section ===== */}
          <div className="lg:pt-0 pt-6 w-full">
            <h2
              ref={titleRef}
              className="text-4xl lg:text-5xl font-bold text-MidnightNavyText dark:text-white leading-tight"
            >
              {t("youngStars.title")}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70 block transform transition-transform duration-300 hover:scale-105">
                {t("youngStars.highlighted")}
              </span>
            </h2>

            <p
              ref={descriptionRef}
              className="text-xl font-normal text-SlateBlueText dark:text-gray-300 max-w-2xl lg:pt-8 pt-6 lg:pb-12 pb-8 leading-relaxed"
            >
              {t("youngStars.description")}
            </p>

            <div className="flex gap-4">
              <button
                ref={buttonRef}
                onClick={() => {
                  if (isAnimating.current) return;
                  setLeadersOpen(true);
                }}
                className="relative inline-flex items-center gap-3 bg-primary text-white font-semibold px-8 py-4 rounded-2xl shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 active:scale-95 group overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isAnimating.current || projects.length === 0}
              >
                <span className="relative z-10">{t("youngStars.meetMoreLeaders")}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Modals ===== */}
      <LeadersModal
        open={leadersOpen}
        onClose={() => setLeadersOpen(false)}
        projects={projects}
        onSelect={(p: Project) => {
          setSelectedProject(p);
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