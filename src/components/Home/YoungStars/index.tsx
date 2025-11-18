"use client";
import React, { useEffect, useState } from "react";
import Slider from "react-slick";

import LeadersModal from "../LeadersModal";
import ProjectModal from "../ProjectModal";
import { useI18n } from "@/i18n/I18nProvider";

type Project = {
  _id: string;
  title: string;
  description?: string;
  image?: string;
  video?: string;
  portfolioLink?: string;
  student?: { id?: string; name?: string; email?: string };
  createdAt?: string;
};

const YoungStars = () => {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [leadersOpen, setLeadersOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const thumbnails = projects.slice(0, 8);

  // ===== Fetch Projects =====
  // ===== Fetch Projects =====
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/projects?limit=50");
        const data = await res.json();

        if (data?.success && Array.isArray(data.data)) {

          // 🔥 فلترة المشاريع المميزة فقط
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


  // ===== Slick Settings =====
  const settingsMain = {
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    fade: false,
    infinite: false,
  };

  const settingsThumbs = {
    slidesToShow: 4, // عدد العناصر المرئية
    slidesToScroll: 1,
    dots: false,
    centerMode: false, // أو true مع centerPadding: "0px"
    focusOnSelect: true,
    infinite: false,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 3 } },
      { breakpoint: 768, settings: { slidesToShow: 2 } },
      { breakpoint: 480, settings: { slidesToShow: 1 } },
    ],
  };


  const handleThumbnailClick = (projectId: string) => {
    setActiveId(projectId);
  };

  const activeProject = thumbnails.find((p) => p._id === activeId);

  return (
    <section className="bg-white/20 dark:bg-darklight relative overflow-hidden">
      <div className="container mx-auto px-4 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 grid-cols-1 items-center gap-12 lg:gap-16 xl:gap-24">
          {/* ===== Main Slider ===== */}
          <div className="w-full relative" data-aos="fade-right" data-aos-delay="200" data-aos-duration="1000">
            {loading ? (
              <div className="py-20 text-center text-SlateBlueText">Loading...</div>
            ) : !activeProject ? (
              <div className="py-8 text-center text-SlateBlueText">No projects yet.</div>
            ) : (
              <Slider {...settingsMain} key={activeId} className="pb-3">
                <div>
                  <div
                    className="rounded-2xl overflow-hidden shadow-lg bg-white dark:bg-darkmode border border-PowderBlueBorder dark:border-dark_border cursor-pointer"
                    onClick={() => setSelectedProject(activeProject)}
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
                        className="w-full h-80 object-cover rounded-2xl"
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
            <Slider {...settingsThumbs} className="thumb mt-4">
              {thumbnails.map((p) => (
                <div key={`thumb-${p._id}`}>
                  <div
                    className={`rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-300 ${p._id === activeId ? "border-primary shadow-lg scale-105" : "border-transparent"
                      }`}
                    onClick={() => handleThumbnailClick(p._id)}
                  >
                    {p.image ? (
                      <img src={p.image} alt={p.title} className="w-full h-20 object-cover rounded-lg" />
                    ) : p.video ? (
                      <div className="w-full h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
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

          {/* ===== Right Section ===== */}
          <div className="lg:pt-0 pt-8 w-full" data-aos="fade-left" data-aos-delay="200" data-aos-duration="1000">
            <h2 className="text-4xl lg:text-5xl font-bold text-MidnightNavyText dark:text-white leading-tight">
              {t("youngStars.title")}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70 block">
                {t("youngStars.highlighted")}
              </span>
            </h2>

            <p className="text-xl font-normal text-SlateBlueText dark:text-gray-300 max-w-2xl lg:pt-8 pt-6 lg:pb-12 pb-8 leading-relaxed">
              {t("youngStars.description")}
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => setLeadersOpen(true)}
                className="relative inline-flex items-center gap-3 bg-primary text-white font-semibold px-8 py-4 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                <span>{t("youngStars.meetMoreLeaders")}</span>
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
        onSelect={(p) => {
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
