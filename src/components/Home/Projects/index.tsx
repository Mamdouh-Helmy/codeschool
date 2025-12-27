"use client";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Play, ExternalLink, Code, User } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// تسجيل GSAP plugins مرة واحدة فقط
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

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
  const modalRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  
  // Refs لمنع التكرار والمشاكل
  const hasInitialized = useRef(false);
  const marqueeTween = useRef<gsap.core.Tween | null>(null);
  const scrollTriggers = useRef<ScrollTrigger[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isAnimating = useRef(false);

  // ✅ تحسين fetchProjects مع caching و abort
  useEffect(() => {
    // إلغاء أي طلب سابق
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const fetchProjects = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/projects?limit=10", {
          signal,
          cache: 'force-cache',
          headers: {
            'Cache-Control': 'max-age=300'
          }
        });
        
        if (signal.aborted) return;
        
        const data = await res.json();
        if (data.success) {
          const filtered = data.data.filter(
            (p: any) => p.student?.role === "student" && p.isActive === true
          );
          setProjects(filtered);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Failed to fetch projects:", err);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };
    
    fetchProjects();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ✅ تحسين GSAP Animations - يتم مرة واحدة فقط
  useEffect(() => {
    if (loading || hasInitialized.current) return;
    
    hasInitialized.current = true;
    
    const ctx = gsap.context(() => {
      // تنظيف أي ScrollTriggers سابقة
      scrollTriggers.current.forEach(st => st.kill());
      scrollTriggers.current = [];

      // Title animation (فقط إذا كان showTitle صحيح)
      if (showTitle && titleRef.current) {
        const titleAnim = gsap.fromTo(titleRef.current,
          {
            opacity: 0,
            y: -50,
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
              toggleActions: "play none none none",
              once: true
            }
          }
        );
        
        if (titleAnim.scrollTrigger) {
          scrollTriggers.current.push(titleAnim.scrollTrigger);
        }
      }

      // Button animation
      if (buttonRef.current) {
        const buttonAnim = gsap.fromTo(buttonRef.current,
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
              toggleActions: "play none none none",
              once: true
            }
          }
        );
        
        if (buttonAnim.scrollTrigger) {
          scrollTriggers.current.push(buttonAnim.scrollTrigger);
        }
      }

      // ✅ Marquee animation مع تحسينات
      if (marqueeRef.current && projects.length > 0) {
        const marqueeContent = marqueeRef.current;
        
        // إيقاف أي animation سابقة
        if (marqueeTween.current) {
          marqueeTween.current.kill();
        }
        
        // حساب العرض بشكل صحيح
        const firstChild = marqueeContent.children[0] as HTMLElement;
        const itemWidth = firstChild?.offsetWidth || 300;
        const gap = 24; // gap-6 = 24px
        const contentWidth = (itemWidth + gap) * projects.length;
        
        marqueeTween.current = gsap.to(marqueeContent, {
          x: `-=${contentWidth / 2}`,
          duration: 50,
          ease: "none",
          repeat: -1,
          modifiers: {
            x: gsap.utils.unitize(x => parseFloat(x) % (contentWidth / 2))
          }
        });

        // Pause/Resume on hover
        const pauseAnimation = () => {
          if (marqueeTween.current) {
            marqueeTween.current.pause();
          }
        };
        
        const resumeAnimation = () => {
          if (marqueeTween.current) {
            marqueeTween.current.resume();
          }
        };
        
        marqueeContent.addEventListener('mouseenter', pauseAnimation);
        marqueeContent.addEventListener('mouseleave', resumeAnimation);
        
        // تنظيف event listeners عند unmount
        return () => {
          marqueeContent.removeEventListener('mouseenter', pauseAnimation);
          marqueeContent.removeEventListener('mouseleave', resumeAnimation);
        };
      }

      // Project cards animation
      const projectCards = document.querySelectorAll('.project-card');
      projectCards.forEach((card, index) => {
        const cardAnim = gsap.fromTo(card,
          {
            opacity: 0,
            y: 60,
            rotationY: 15,
            scale: 0.8
          },
          {
            opacity: 1,
            y: 0,
            rotationY: 0,
            scale: 1,
            duration: 0.8,
            delay: index * 0.05,
            ease: "back.out(1.7)",
            scrollTrigger: {
              trigger: card,
              start: "top 90%",
              toggleActions: "play none none none",
              once: true
            }
          }
        );
        
        if (cardAnim.scrollTrigger) {
          scrollTriggers.current.push(cardAnim.scrollTrigger);
        }
      });

    }, sectionRef);

    return () => {
      ctx.revert();
      
      // تنظيف الـ marquee animation
      if (marqueeTween.current) {
        marqueeTween.current.kill();
        marqueeTween.current = null;
      }
      
      // تنظيف الـ scroll triggers
      scrollTriggers.current.forEach(st => st.kill());
      scrollTriggers.current = [];
      
      hasInitialized.current = false;
    };
  }, [loading, projects, showTitle]);

  // ✅ تحسين modal open/close animations
  useEffect(() => {
    if (!modalRef.current || !modalContentRef.current) return;

    if (showPopup) {
      // إيقاف أي animation جارية
      gsap.killTweensOf([modalRef.current, modalContentRef.current]);
      
      gsap.set(modalRef.current, { 
        opacity: 0, 
        display: 'flex',
        pointerEvents: 'none'
      });
      
      gsap.set(modalContentRef.current, { 
        opacity: 0, 
        scale: 0.8, 
        y: 50,
        rotationX: 10 
      });

      const timeline = gsap.timeline({
        onStart: () => {
          modalRef.current!.style.pointerEvents = 'auto';
        }
      });
      
      timeline
        .to(modalRef.current, {
          opacity: 1,
          duration: 0.3,
          ease: "power2.out"
        })
        .to(modalContentRef.current, {
          opacity: 1,
          scale: 1,
          y: 0,
          rotationX: 0,
          duration: 0.5,
          ease: "back.out(1.7)"
        }, "-=0.2");

      // Animate grid items
      const gridItems = modalContentRef.current?.querySelectorAll('.grid > div');
      if (gridItems && gridItems.length > 0) {
        gsap.fromTo(gridItems,
          {
            opacity: 0,
            y: 30,
            scale: 0.8
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.4,
            stagger: 0.08,
            ease: "back.out(1.7)",
            delay: 0.2
          }
        );
      }
    }
  }, [showPopup]);

  // ✅ handleButtonClick مع debounce
  const handleButtonClick = useCallback(() => {
    if (isAnimating.current) return;
    
    isAnimating.current = true;
    const button = buttonRef.current;
    
    if (button) {
      // Ripple effect باستخدام GSAP
      const ripple = document.createElement('span');
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      
      gsap.set(ripple, {
        position: 'absolute',
        borderRadius: '50%',
        background: 'rgba(140, 82, 255, 0.6)',
        width: size,
        height: size,
        left: '50%',
        top: '50%',
        x: '-50%',
        y: '-50%',
        scale: 0,
        pointerEvents: 'none'
      });
      
      button.appendChild(ripple);

      const timeline = gsap.timeline({
        onComplete: () => {
          setShowPopup(true);
          if (button.contains(ripple)) {
            button.removeChild(ripple);
          }
          isAnimating.current = false;
        }
      });

      timeline
        .to(ripple, {
          scale: 1,
          opacity: 0,
          duration: 0.6,
          ease: "power2.out"
        })
        .to(button, {
          scale: 0.95,
          duration: 0.1,
          yoyo: true,
          repeat: 1,
          ease: "power2.inOut"
        }, 0);
    } else {
      setShowPopup(true);
      isAnimating.current = false;
    }
  }, []);

  const handlePopupClose = useCallback(() => {
    if (!modalRef.current || !modalContentRef.current || isAnimating.current) return;
    
    isAnimating.current = true;
    
    const timeline = gsap.timeline({
      onComplete: () => {
        modalRef.current!.style.pointerEvents = 'none';
        setShowPopup(false);
        isAnimating.current = false;
      }
    });

    timeline
      .to(modalContentRef.current, {
        opacity: 0,
        scale: 0.8,
        y: 50,
        rotationX: 10,
        duration: 0.3,
        ease: "power2.in"
      })
      .to(modalRef.current, {
        opacity: 0,
        duration: 0.2,
        ease: "power2.in"
      }, "-=0.1");
  }, []);

  // ✅ useMemo للقيم المكلفة
  const getImageInfo = useCallback((img?: string | null) => {
    if (!img) return { src: null, useImgTag: false, isGif: false };
    
    const trimmed = String(img).trim();
    const isDataUri = /^data:image\/[a-zA-Z]+;base64,/.test(trimmed);
    const isHttp = /^https?:\/\//i.test(trimmed);
    const isLocal = /^\//.test(trimmed);
    const isGifExtension = /\.gif(\?|#|$)/i.test(trimmed) || /\.gif$/i.test(trimmed);
    const base64Regex = /^[A-Za-z0-9+/=\s]+$/;
    const looksLikeBase64 =
      !isDataUri &&
      !isHttp &&
      !isLocal &&
      trimmed.length > 100 &&
      base64Regex.test(trimmed.replace(/\s+/g, ""));

    if (isDataUri) {
      const isGif = /^data:image\/gif/i.test(trimmed);
      return { src: trimmed, useImgTag: true, isGif };
    }
    if (looksLikeBase64) {
      const dataUri = `data:image/png;base64,${trimmed.replace(/\s+/g, "")}`;
      return { src: dataUri, useImgTag: true, isGif: false };
    }
    if (isHttp) {
      const isGif = /\.gif(\?|#|$)/i.test(trimmed);
      return { src: trimmed, useImgTag: true, isGif };
    }
    if (isLocal) {
      const isGif = /\.gif(\?|#|$)/i.test(trimmed);
      return { src: trimmed, useImgTag: isGif, isGif };
    }
    
    const assumed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    const isGif = /\.gif(\?|#|$)/i.test(assumed);
    return { src: assumed, useImgTag: isGif, isGif };
  }, []);

  // ✅ repeatedProjects باستخدام useMemo
  const repeatedProjects = useMemo(() => {
    if (projects.length === 0) return [];
    return [...projects, ...projects.slice(0, Math.min(projects.length, 5))];
  }, [projects]);

  const openProjectDetails = useCallback((project: any) => {
    if (isAnimating.current) return;
    setSelectedProject(project);
  }, []);

  const closeProjectDetails = useCallback(() => {
    if (isAnimating.current) return;
    
    isAnimating.current = true;
    const modalContent = document.querySelector('.modal-content');
    
    if (modalContent) {
      gsap.to(modalContent, {
        opacity: 0,
        scale: 0.7,
        y: 50,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          setSelectedProject(null);
          isAnimating.current = false;
        }
      });
    } else {
      setSelectedProject(null);
      isAnimating.current = false;
    }
  }, []);

  // ✅ تنظيف كامل عند unmount
  useEffect(() => {
    return () => {
      // تنظيف fetch controller
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // تنظيف GSAP animations
      if (marqueeTween.current) {
        marqueeTween.current.kill();
      }
      
      scrollTriggers.current.forEach(trigger => trigger.kill());
      scrollTriggers.current = [];
      
      // تنظيف الـ refs
      hasInitialized.current = false;
      isAnimating.current = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-500 dark:text-gray-300">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  return (
    <section ref={sectionRef} className="dark:bg-darkmode relative overflow-hidden" dir="ltr">
      {showTitle && (
        <h2 ref={titleRef} className="text-center mb-6">
          {t("projects.title")}
        </h2>
      )}

      <div className="relative w-full overflow-hidden py-8">
        <div ref={marqueeRef} className="flex gap-6">
          {repeatedProjects.map((project: any, index: number) => {
            const { src, useImgTag } = getImageInfo(project?.image);
            return (
              <div
                key={`${project._id}-${index}`}
                className={`project-card flex-shrink-0 max-w-[300px] flex-shrink-0 group overflow-hidden cursor-pointer ${index % 2 === 1 ? "mt-28" : ""}`}
                onClick={() => openProjectDetails(project)}
              >
                <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm border border-PowderBlueBorder dark:border-dark_border overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30 transform hover:scale-105">
                  <div className="relative overflow-hidden bg-gray-100 dark:bg-dark_input">
                    <div className="w-full h-48 relative">
                      {src ? (
                        useImgTag ? (
                          <img
                            src={src}
                            alt={project.title}
                            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <Image
                            src={src}
                            alt={project.title}
                            width={400}
                            height={192}
                            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
                            loading="lazy"
                            decoding="async"
                          />
                        )
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-Aquamarine/10 flex items-center justify-center">
                          <Code className="w-12 h-12 text-primary/40" />
                        </div>
                      )}
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
            );
          })}
        </div>

        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white dark:from-darkmode to-transparent z-10"></div>
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white dark:from-darkmode to-transparent z-10"></div>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          ref={buttonRef}
          onClick={handleButtonClick}
          className="btn_outline btn-2 group hover-outline-slide-down transform transition-transform duration-300 hover:scale-105 relative overflow-hidden"
          disabled={isAnimating.current}
        >
          <span className="!flex !items-center gap-14 relative z-10">
            {t("projects.exploreMore")}
          </span>
        </button>
      </div>

      {showPopup && (
        <div 
          ref={modalRef}
          className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          style={{ opacity: 0, display: 'none', pointerEvents: 'none' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handlePopupClose();
            }
          }}
        >
          <div 
            ref={modalContentRef}
            className="bg-white dark:bg-darkmode max-w-6xl w-full mx-auto p-6 rounded-xl relative shadow-lg max-h-[90vh] overflow-hidden flex flex-col"
            style={{ opacity: 0, transform: 'scale(0.8) translateY(50px) rotateX(10deg)' }}
          >
            <button
              onClick={handlePopupClose}
              className="absolute top-4 right-4 z-10 bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all transform hover:scale-110"
              aria-label={t("common.close")}
              disabled={isAnimating.current}
            >
              ✕
            </button>
            <h3 className="text-2xl font-bold text-center mb-6 text-MidnightNavyText dark:text-white">
              {t("projects.allProjects")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2 flex-1">
              {projects.map((project: any) => {
                const { src, useImgTag } = getImageInfo(project?.image);
                return (
                  <div
                    key={project._id}
                    className="group overflow-hidden cursor-pointer"
                    onClick={() => openProjectDetails(project)}
                  >
                    <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm border border-PowderBlueBorder dark:border-dark_border overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30 h-full transform hover:scale-105">
                      <div className="relative overflow-hidden bg-gray-100 dark:bg-dark_input">
                        <div className="w-full h-40 relative">
                          {src ? (
                            useImgTag ? (
                              <img
                                src={src}
                                alt={project.title}
                                className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <Image
                                src={src}
                                alt={project.title}
                                width={400}
                                height={160}
                                className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
                                loading="lazy"
                                decoding="async"
                              />
                            )
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-Aquamarine/10 flex items-center justify-center">
                              <Code className="w-10 h-10 text-primary/40" />
                            </div>
                          )}
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
                );
              })}
            </div>
          </div>
        </div>
      )}

      {selectedProject && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeProjectDetails();
            }
          }}
        >
          <div className="modal-content bg-white dark:bg-darkmode max-w-4xl w-full mx-auto rounded-xl relative shadow-lg max-h-[90vh] overflow-hidden flex flex-col">
            <button
              onClick={closeProjectDetails}
              className="absolute top-4 right-4 z-10 bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all transform hover:scale-110"
              aria-label={t("common.close")}
            >
              ✕
            </button>
            <div className="relative h-64 bg-gray-100 dark:bg-dark_input">
              {(() => {
                const { src, useImgTag } = getImageInfo(selectedProject.image);
                if (!src) {
                  return (
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-Aquamarine/10 flex items-center justify-center">
                      <Code className="w-16 h-16 text-primary/40" />
                    </div>
                  );
                }
                return useImgTag ? (
                  <img
                    src={src}
                    alt={selectedProject.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <Image
                    src={src}
                    alt={selectedProject.title}
                    width={800}
                    height={256}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                );
              })()}
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
                        className="bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded-lg text-sm font-medium transform transition-transform duration-300 hover:scale-105"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-4 flex flex-col h-full">
                  <div className="bg-IcyBreeze dark:bg-dark_input rounded-lg p-4 flex-1">
                    <span className="mb-2 block">{t("projects.student")}</span>
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