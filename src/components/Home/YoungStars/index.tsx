"use client";
import React, { useEffect, useState, useRef } from "react";
import Slider from "react-slick";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import LeadersModal from "../LeadersModal";
import ProjectModal from "../ProjectModal";
import { useI18n } from "@/i18n/I18nProvider";

// تعريف نوع Project موحد
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

// تسجيل plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const YoungStars = () => {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [leadersOpen, setLeadersOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Refs للأنيميشن
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  const thumbnails = projects.slice(0, 8);

  // ===== Fetch Projects =====
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/projects?limit=50");
        const data = await res.json();

        if (data?.success && Array.isArray(data.data)) {
          const featuredProjects = data.data.filter(
            (p: Project) => p.featured === true 
          );

          setProjects(featuredProjects);

          if (featuredProjects.length > 0) {
            setActiveId(featuredProjects[0]._id);
          }
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

  // ===== GSAP Animations =====
  useEffect(() => {
    if (loading || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      // أنيميشن للعنوان
      gsap.fromTo(titleRef.current, 
        { 
          opacity: 0, 
          y: 50,
          rotationX: -45 
        },
        { 
          opacity: 1, 
          y: 0,
          rotationX: 0,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: titleRef.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          }
        }
      );

      // أنيميشن للوصف
      gsap.fromTo(descriptionRef.current,
        {
          opacity: 0,
          x: -30
        },
        {
          opacity: 1,
          x: 0,
          duration: 1,
          delay: 0.3,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: descriptionRef.current,
            start: "top 85%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          }
        }
      );

      // أنيميشن للزر
      gsap.fromTo(buttonRef.current,
        {
          opacity: 0,
          scale: 0.8,
          rotationY: 90
        },
        {
          opacity: 1,
          scale: 1,
          rotationY: 0,
          duration: 0.8,
          delay: 0.6,
          ease: "elastic.out(1, 0.8)",
          scrollTrigger: {
            trigger: buttonRef.current,
            start: "top 90%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          }
        }
      );

      // أنيميشن للسلايدر الرئيسي
      gsap.fromTo(sliderRef.current,
        {
          opacity: 0,
          x: 100,
          rotationY: 15
        },
        {
          opacity: 1,
          x: 0,
          rotationY: 0,
          duration: 1.4,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sliderRef.current,
            start: "top 75%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          }
        }
      );

      // أنيميشن للثمبنيلز
      gsap.fromTo(thumbnailsRef.current,
        {
          opacity: 0,
          y: 40
        },
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
            toggleActions: "play none none reverse"
          }
        }
      );

      // أنيميشن للعناصر الداخلية في الثمبنيلز
      if (thumbnailsRef.current) {
        const thumbnailItems = thumbnailsRef.current.querySelectorAll(".thumbnail-item");
        gsap.fromTo(thumbnailItems,
          {
            opacity: 0,
            scale: 0.5,
            rotation: -180
          },
          {
            opacity: 1,
            scale: 1,
            rotation: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: "back.out(1.7)",
            scrollTrigger: {
              trigger: thumbnailsRef.current,
              start: "top 85%",
              end: "bottom 20%",
              toggleActions: "play none none reverse"
            }
          }
        );
      }

      // أنيميشن للخلفية
      gsap.fromTo(sectionRef.current,
        {
          backgroundPosition: "100% 0%"
        },
        {
          backgroundPosition: "0% 100%",
          duration: 2,
          ease: "sine.inOut",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1
          }
        }
      );

    }, sectionRef);

    return () => ctx.revert();
  }, [loading, projects.length]);

  // أنيميشن عند تغيير المشروع النشط
  useEffect(() => {
    if (!sliderRef.current || !activeId) return;

    gsap.fromTo(sliderRef.current,
      {
        scale: 0.95,
        rotationX: -10
      },
      {
        scale: 1,
        rotationX: 0,
        duration: 0.6,
        ease: "back.out(1.7)"
      }
    );
  }, [activeId]);

  // ===== Slick Settings =====
  const settingsMain = {
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    fade: false,
    infinite: false,
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
      { breakpoint: 480, settings: { slidesToShow: 2 } },
    ],
  };

  const handleThumbnailClick = (projectId: string) => {
    // أنيميشن عند النقر على الثمبنيل
    const clickedThumb = document.querySelector(`[data-thumb="${projectId}"]`);
    if (clickedThumb) {
      gsap.fromTo(clickedThumb,
        {
          scale: 1
        },
        {
          scale: 0.9,
          duration: 0.1,
          yoyo: true,
          repeat: 1
        }
      );
    }
    
    setActiveId(projectId);
  };

  const activeProject = thumbnails.find((p) => p._id === activeId);

  return (
    <section 
      ref={sectionRef}
      className="bg-white/20 dark:bg-darkmode relative overflow-hidden"
      
    >
      <div className="container mx-auto px-4 py-8 lg:py-16">
        <div className="grid lg:grid-cols-2 grid-cols-1 items-center gap-12 lg:gap-16 xl:gap-24">
          {/* ===== Main Slider ===== */}
          <div ref={sliderRef} className="w-full relative">
            {loading ? (
              <div className="py-20 text-center text-SlateBlueText">
                <div className="animate-pulse">Loading...</div>
              </div>
            ) : !activeProject ? (
              <div className="py-8 text-center text-SlateBlueText">No projects yet.</div>
            ) : (
              <Slider {...settingsMain} key={activeId} className="pb-3">
                <div>
                  <div
                    className="rounded-2xl overflow-hidden shadow-lg bg-white dark:bg-darkmode border border-PowderBlueBorder dark:border-dark_border cursor-pointer transform transition-transform duration-300 hover:scale-105"
                    onClick={() => {
                      setSelectedProject(activeProject);
                      // أنيميشن عند النقر
                      gsap.fromTo(".project-modal",
                        { scale: 0.8, opacity: 0 },
                        { scale: 1, opacity: 1, duration: 0.5 }
                      );
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
                            allow="autoplay; encrypted-media"
                            allowFullScreen
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
                        />
                      )
                    ) : activeProject.image ? (
                      <img
                        src={activeProject.image}
                        alt={activeProject.title}
                        className="w-full h-80 object-cover rounded-2xl transform transition-transform duration-500 hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-64 flex items-center justify-center text-sm text-gray-500">
                        No media
                      </div>
                    )}
                  </div>
                </div>
              </Slider>
            )}

            {/* ===== Thumbnail Slider ===== */}
            <div ref={thumbnailsRef}>
              <Slider {...settingsThumbs} className="thumb mt-4">
                {thumbnails.map((p) => (
                  <div key={`thumb-${p._id}`} className="thumbnail-item">
                    <div
                      data-thumb={p._id}
                      className={`rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-300 transform hover:scale-105 ${
                        p._id === activeId 
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
                        />
                      ) : p.video ? (
                        <div className="w-full h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center group">
                          <svg className="w-8 h-8 text-gray-400 group-hover:text-primary transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-full h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-xs text-gray-500">
                          No thumbnail
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </Slider>
            </div>
          </div>

          {/* ===== Right Section ===== */}
          <div className="lg:pt-0 pt-8 w-full">
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
                  setLeadersOpen(true);
                  // أنيميشن عند فتح المودال
                  gsap.fromTo(".leaders-modal",
                    { y: 100, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.5 }
                  );
                }}
                className="relative inline-flex items-center gap-3 bg-primary text-white font-semibold px-8 py-4 rounded-2xl shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 active:scale-95 group overflow-hidden"
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