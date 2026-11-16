"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Play, ExternalLink, Code, User } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { gsap } from "gsap";

/* ───────── Helpers ───────── */
const isCld = (u: string) => u.includes("res.cloudinary.com") && u.includes("/upload/");
const cld = (u: string, t: string) => u.replace("/upload/", `/upload/${t}/`);

const getImageInfo = (img?: string | null) => {
  if (!img) return { src: null as string | null, isGif: false, isData: false };
  const trimmed = String(img).trim();
  const isDataUri = /^data:image\/[a-zA-Z]+;base64,/.test(trimmed);
  const isHttp = /^https?:\/\//i.test(trimmed);
  const isLocal = /^\//.test(trimmed);
  const base64Regex = /^[A-Za-z0-9+/=\s]+$/;
  const looksLikeBase64 =
    !isDataUri && !isHttp && !isLocal && trimmed.length > 100 &&
    base64Regex.test(trimmed.replace(/\s+/g, ""));

  if (isDataUri) {
    return { src: trimmed, isGif: /^data:image\/gif/i.test(trimmed), isData: true };
  }
  if (looksLikeBase64) {
    return { src: `data:image/png;base64,${trimmed.replace(/\s+/g, "")}`, isGif: false, isData: true };
  }
  const assumed = isHttp || isLocal ? trimmed : `/${trimmed}`;
  return { src: assumed, isGif: /\.gif(\?|#|$)/i.test(assumed), isData: false };
};

/* ───────── Lazy media: صورة مصغّرة / GIF → فيديو ───────── */
function ProjectMedia({
  src, alt, isGif, isData, width, height,
}: {
  src: string; alt: string; isGif: boolean; isData: boolean; width: number; height: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cloud = isCld(src);
  const cls = "w-full h-full object-cover transition-all duration-300 group-hover:scale-110";

  // GIF على Cloudinary → mp4/webm (نفس الرابط بامتداد مختلف)
  if (isGif && cloud) {
    const base = cld(src, "q_auto,w_600,c_limit");
    const to = (ext: string) => base.replace(/\.gif(\?.*)?$/i, `.${ext}`);
    return (
      <div ref={ref} className="w-full h-full">
        {visible ? (
          <video
            autoPlay muted loop playsInline preload="metadata"
            poster={to("jpg")}
            className={cls}
          >
            <source src={to("webm")} type="video/webm" />
            <source src={to("mp4")} type="video/mp4" />
          </video>
        ) : (
          <img src={to("jpg")} alt={alt} loading="lazy" decoding="async" width={width} height={height} className={cls} />
        )}
      </div>
    );
  }

  // صورة Cloudinary عادية → WebP/AVIF بعرض 600
  if (cloud) {
    return (
      <div ref={ref} className="w-full h-full">
        <img
          src={cld(src, "f_auto,q_auto,w_600,c_limit")}
          alt={alt} loading="lazy" decoding="async"
          width={width} height={height} className={cls}
        />
      </div>
    );
  }

  // ملف محلي عادي (مش GIF) → next/image
  if (src.startsWith("/") && !isGif && !isData) {
    return (
      <div ref={ref} className="w-full h-full">
        <Image src={src} alt={alt} width={width} height={height} sizes="300px" className={cls} />
      </div>
    );
  }

  // أي حاجة تانية (data URI / رابط خارجي / GIF محلي)
  return (
    <div ref={ref} className="w-full h-full">
      <img src={src} alt={alt} loading="lazy" decoding="async" width={width} height={height} className={cls} />
    </div>
  );
}

/* ───────── Component ───────── */
const Projects = ({ showTitle = true }) => {
  const pathname = usePathname();
  const { t } = useI18n();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const marqueeRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const projectsRef = useRef<HTMLDivElement[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/projects?limit=10");
        const data = await res.json();
        if (data.success) {
          const filtered = data.data.filter(
            (p: any) => p.student?.role === "student" && p.isActive === true
          );
          setProjects(filtered);
        } else {
          console.error("API Error:", data.message);
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // GSAP Animations
  useEffect(() => {
    if (loading || projects.length === 0) return;

    const ctx = gsap.context(() => {
      if (showTitle && titleRef.current) {
        gsap.fromTo(
          titleRef.current,
          { opacity: 0, y: -50, rotationX: -45 },
          { opacity: 1, y: 0, rotationX: 0, duration: 1.2, ease: "power3.out" }
        );
      }

      if (buttonRef.current) {
        gsap.fromTo(
          buttonRef.current,
          { opacity: 0, scale: 0.8, rotationY: 90 },
          { opacity: 1, scale: 1, rotationY: 0, duration: 0.8, delay: 0.6, ease: "elastic.out(1, 0.8)" }
        );
      }

      if (marqueeRef.current) {
        const marqueeContent = marqueeRef.current;
        const contentWidth = marqueeContent.scrollWidth / 2;

        gsap.to(marqueeContent, {
          x: -contentWidth,
          duration: 40,
          ease: "none",
          repeat: -1,
        });

        marqueeContent.addEventListener("mouseenter", () => {
          gsap.to(marqueeContent, { timeScale: 0 });
        });
        marqueeContent.addEventListener("mouseleave", () => {
          gsap.to(marqueeContent, { timeScale: 1 });
        });
      }

      projectsRef.current.forEach((card, index) => {
        if (card) {
          gsap.fromTo(
            card,
            { opacity: 0, y: 60, rotationY: 15, scale: 0.8 },
            {
              opacity: 1,
              y: 0,
              rotationY: 0,
              scale: 1,
              duration: 0.8,
              delay: index * 0.1,
              ease: "back.out(1.7)",
              scrollTrigger: {
                trigger: card,
                start: "top 85%",
                toggleActions: "play none none reverse",
              },
            }
          );
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [loading, projects, showTitle]);

  const handleButtonClick = () => {
    const button = buttonRef.current;
    if (button) {
      const ripple = document.createElement("span");
      ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 103, 0, 0.6);
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
      `;

      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = rect.width / 2;
      const y = rect.height / 2;

      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x - size / 2}px`;
      ripple.style.top = `${y - size / 2}px`;

      button.appendChild(ripple);

      gsap.to(button, {
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: "power2.inOut",
        onComplete: () => {
          setShowPopup(true);
          setTimeout(() => {
            if (button.contains(ripple)) {
              button.removeChild(ripple);
            }
          }, 600);
        },
      });
    }
  };

  useEffect(() => {
    if (showPopup && modalRef.current && modalContentRef.current) {
      gsap.set(modalRef.current, { opacity: 0, display: "flex" });
      gsap.set(modalContentRef.current, { opacity: 0, scale: 0.8, y: 50, rotationX: 10 });

      const timeline = gsap.timeline();
      timeline
        .to(modalRef.current, { opacity: 1, duration: 0.4, ease: "power2.out" })
        .to(modalContentRef.current, {
          opacity: 1,
          scale: 1,
          y: 0,
          rotationX: 0,
          duration: 0.6,
          ease: "back.out(1.7)",
          onComplete: () => {
            const gridItems = modalContentRef.current?.querySelectorAll(".grid > div");
            if (gridItems) {
              gsap.fromTo(
                gridItems,
                { opacity: 0, y: 30, scale: 0.8 },
                { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1, ease: "back.out(1.7)" }
              );
            }
          },
        });
    }
  }, [showPopup]);

  const handlePopupClose = () => {
    if (modalRef.current && modalContentRef.current) {
      const timeline = gsap.timeline();
      timeline
        .to(modalContentRef.current, {
          opacity: 0, scale: 0.8, y: 50, rotationX: 10, duration: 0.4, ease: "power2.in",
        })
        .to(modalRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => setShowPopup(false),
        });
    }
  };

  const openProjectDetails = (project: any) => setSelectedProject(project);

  const closeProjectDetails = () => {
    gsap.to(".modal-content", {
      opacity: 0,
      scale: 0.7,
      y: 50,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => setSelectedProject(null),
    });
  };

  if (loading)
    return (
      <div className="text-center py-20 text-gray-500 dark:text-gray-300">
        {t("common.loading")}
      </div>
    );

  const repeatedProjects = [...projects, ...projects];

  const addToRefs = (el: HTMLDivElement | null) => {
    if (el && !projectsRef.current.includes(el)) {
      projectsRef.current.push(el);
    }
  };

  const renderMedia = (img: any, alt: string, w: number, h: number, iconSize: string) => {
    const { src, isGif, isData } = getImageInfo(img);
    if (!src) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
          <Code className={`${iconSize} text-primary/40`} />
        </div>
      );
    }
    return <ProjectMedia src={src} alt={alt} isGif={isGif} isData={isData} width={w} height={h} />;
  };

  return (
    <section
      ref={sectionRef}
      className={`dark:bg-darkmode relative overflow-hidden ${pathname === "/" ? "" : ""}`}
      dir="ltr"
    >
      <style jsx>{`
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>

      {showTitle && (
        <h2 ref={titleRef} className="text-center mb-6">
          {t("projects.title")}
        </h2>
      )}

      <div className="relative w-full overflow-hidden py-8 marquee-container">
        <div ref={marqueeRef} className="flex gap-6 marquee-content">
          {repeatedProjects.map((project: any, index: number) => (
            <div
              key={`${project._id}-${index}`}
              ref={addToRefs}
              className={`flex-shrink-0 max-w-[300px] group overflow-hidden cursor-pointer ${index % 2 === 1 ? "mt-28" : ""}`}
              onClick={() => openProjectDetails(project)}
            >
              <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm border border-PowderBlueBorder dark:border-dark_border overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30 transform hover:scale-105">
                <div className="relative overflow-hidden bg-gray-100 dark:bg-dark_input">
                  <div className="w-full h-48 relative">
                    {renderMedia(project?.image, project.title, 400, 192, "w-12 h-12")}
                    {project.video && (
                      <div className="absolute top-3 right-3 bg-black/70 text-white rounded-full p-2 transform transition-transform duration-300 group-hover:scale-110">
                        <Play className="w-4 h-4" />
                      </div>
                    )}
                    {project.portfolioLink && (
                      <div className="absolute top-3 left-3 bg-black/70 text-white rounded-full p-2 transform transition-transform duration-300 group-hover:scale-110">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-MidnightNavyText dark:text-white text-lg mb-2 line-clamp-2">
                    {project.title}
                  </h3>
                  <p className="text-SlateBlueText dark:text-darktext text-sm mb-3 line-clamp-2">
                    {project.description}
                  </p>
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {project.technologies.slice(0, 3).map((tech: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded text-xs transform transition-transform duration-300 hover:scale-105"
                        >
                          {tech}
                        </span>
                      ))}
                      {project.technologies.length > 3 && (
                        <span className="px-2 py-1 bg-PaleCyan dark:bg-dark_input text-SlateBlueText dark:text-darktext rounded text-xs">
                          +{project.technologies.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white dark:from-darkmode to-transparent z-10"></div>
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white dark:from-darkmode to-transparent z-10"></div>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          ref={buttonRef}
          onClick={handleButtonClick}
          className="relative inline-flex items-center gap-3 bg-primary text-white font-semibold px-8 py-4 rounded-2xl shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 active:scale-95 group overflow-hidden"
          style={{ position: "relative" }}
        >
          <span className="relative z-10 flex items-center gap-2">
            {t("projects.exploreMore")}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
        </button>
      </div>

      {showPopup && (
        <div
          ref={modalRef}
          className="fixed inset-0 bg-gradient-to-br from-secondary/60 to-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          style={{ opacity: 0, display: "none" }}
        >
          <div
            ref={modalContentRef}
            className="bg-white dark:bg-darkmode max-w-6xl w-full mx-auto p-6 rounded-xl relative shadow-lg max-h-[90vh] overflow-hidden flex flex-col"
            style={{ opacity: 0, transform: "scale(0.8) translateY(50px) rotateX(10deg)" }}
          >
            <button
              onClick={handlePopupClose}
              className="absolute top-4 right-4 z-10 bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all transform hover:scale-110"
              aria-label={t("common.close")}
            >
              ✕
            </button>
            <h3 className="text-2xl font-bold text-center mb-6 text-MidnightNavyText dark:text-white">
              {t("projects.allProjects")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2 flex-1">
              {projects.map((project: any) => (
                <div
                  key={project._id}
                  className="group overflow-hidden cursor-pointer"
                  onClick={() => openProjectDetails(project)}
                >
                  <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm border border-PowderBlueBorder dark:border-dark_border overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30 h-full transform hover:scale-105">
                    <div className="relative overflow-hidden bg-gray-100 dark:bg-dark_input">
                      <div className="w-full h-40 relative">
                        {renderMedia(project?.image, project.title, 400, 160, "w-10 h-10")}
                        <div className="absolute top-2 right-2 flex gap-1">
                          {project.video && (
                            <div className="bg-black/70 text-white rounded-full p-1 transform transition-transform duration-300 group-hover:scale-110">
                              <Play className="w-3 h-3" />
                            </div>
                          )}
                          {project.portfolioLink && (
                            <div className="bg-black/70 text-white rounded-full p-1 transform transition-transform duration-300 group-hover:scale-110">
                              <ExternalLink className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-bold text-MidnightNavyText dark:text-white text-base mb-2 line-clamp-2">
                        {project.title}
                      </h4>
                      <p className="text-SlateBlueText dark:text-darktext text-sm mb-3 line-clamp-2">
                        {project.description}
                      </p>
                      {project.technologies && project.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {project.technologies.slice(0, 2).map((tech: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded text-xs transform transition-transform duration-300 hover:scale-105"
                            >
                              {tech}
                            </span>
                          ))}
                          {project.technologies.length > 2 && (
                            <span className="px-2 py-1 bg-PaleCyan dark:bg-dark_input text-SlateBlueText dark:text-darktext rounded text-xs">
                              +{project.technologies.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-gradient-to-br from-secondary/60 to-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 modal-overlay">
          <div className="bg-white dark:bg-darkmode max-w-4xl w-full mx-auto rounded-xl relative shadow-lg max-h-[90vh] overflow-hidden flex flex-col modal-content">
            <button
              onClick={closeProjectDetails}
              className="absolute top-4 right-4 z-10 bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all transform hover:scale-110"
              aria-label={t("common.close")}
            >
              ✕
            </button>
            <div className="relative h-64 bg-gray-100 dark:bg-dark_input group">
              {renderMedia(selectedProject.image, selectedProject.title, 800, 256, "w-16 h-16")}
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <h3 className="text-2xl font-bold text-MidnightNavyText dark:text-white mb-4">
                {selectedProject.title}
              </h3>
              <p className="text-SlateBlueText dark:text-darktext mb-6 leading-relaxed">
                {selectedProject.description}
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-IcyBreeze dark:bg-dark_input rounded-lg p-4 flex flex-col h-full">
                  <h4 className="font-semibold text-MidnightNavyText dark:text-white mb-2">
                    {t("projects.technologiesUsed")}
                  </h4>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {selectedProject.technologies?.map((tech: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded-lg text-sm font-medium transform transition-transform duration-300 hover:scale-105"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-4 flex flex-col h-full">
                  <div className="bg-IcyBreeze dark:bg-dark_input rounded-lg p-4 flex-1">
                    <span className="mb-2 block text-SlateBlueText dark:text-darktext">
                      {t("projects.student")}
                    </span>
                    <div className="flex items-center gap-3 mb-3">
                      <User className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-MidnightNavyText dark:text-white font-medium">
                          {selectedProject.student?.name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
                {selectedProject.video && (
                  <a
                    href={selectedProject.video}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 transform hover:scale-105"
                  >
                    <Play className="w-4 h-4" />
                    {t("projects.watchDemo")}
                  </a>
                )}
                {selectedProject.portfolioLink && (
                  <a
                    href={selectedProject.portfolioLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-secondary hover:bg-secondary/90 text-white py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 transform hover:scale-105"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {t("projects.viewPortfolio")}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Projects;