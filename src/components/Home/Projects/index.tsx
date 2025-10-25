"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Play, ExternalLink, Code, User, Calendar } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import "@/app/globals.css";

const Projects = ({ showTitle = true }) => {
  const pathname = usePathname();
  const { t } = useI18n();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/projects?featured=true&limit=10");
        const data = await res.json();
        if (data.success) {
          const filtered = data.data.filter(
            (p: any) => p.student?.role === "student"
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const openProjectDetails = (project: any) => {
    setSelectedProject(project);
  };

  const closeProjectDetails = () => {
    setSelectedProject(null);
  };

  if (loading)
    return (
      <div className="text-center py-20 text-gray-500 dark:text-gray-300">
        {t("common.loading")}
      </div>
    );

  const repeatedProjects = projects;

  return (
    <section
      className={`dark:bg-darkmode relative overflow-hidden ${
        pathname === "/" ? "" : ""
      }`}
    >
      {showTitle && (
        <h2 className="text-center mb-6">
          {t("projects.title")}
        </h2>
      )}

      {/* شريط المشاريع المتحرك */}
      <div className="relative w-full overflow-hidden group">
        <div className="animate-marquee flex gap-8 px-7 group-hover:[animation-play-state:paused]">
          {repeatedProjects.map((project: any, index: number) => (
            <div
              key={`${project._id}-${index}`}
              className={`max-w-[300px] flex-shrink-0 group overflow-hidden cursor-pointer ${
                index % 2 === 1 ? "mt-28" : ""
              }`}
              onClick={() => openProjectDetails(project)}
            >
              <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm border border-PowderBlueBorder dark:border-dark_border overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30">
                <div className="relative overflow-hidden bg-gray-100 dark:bg-dark_input">
                  <div className="w-full h-48 relative">
                    {project.image ? (
                      project.image.endsWith(".gif") ||
                      project.image.startsWith("data:image") ? (
                        <img
                          src={project.image}
                          alt={project.title}
                          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <Image
                          src={
                            project.image.startsWith("/")
                              ? project.image
                              : `/${project.image}`
                          }
                          alt={project.title}
                          width={400}
                          height={192}
                          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                        />
                      )
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/10 to-Aquamarine/10 flex items-center justify-center">
                        <Code className="w-12 h-12 text-primary/40" />
                      </div>
                    )}
                    {project.video && (
                      <div className="absolute top-3 right-3 bg-black/70 text-white rounded-full p-2">
                        <Play className="w-4 h-4" />
                      </div>
                    )}
                    {project.portfolioLink && (
                      <div className="absolute top-3 left-3 bg-black/70 text-white rounded-full p-2">
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
                      {project.technologies
                        .slice(0, 3)
                        .map((tech: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded text-xs"
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
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={() => setShowPopup(true)}
          className="btn_outline btn-2 group hover-outline-slide-down"
        >
          <span className="!flex !items-center gap-14">
            {t("projects.exploreMore")}
          </span>
        </button>
      </div>

      {/* Popup Modal - All Projects */}
      {showPopup && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-darkmode max-w-6xl w-full mx-auto p-6 rounded-xl relative shadow-lg animate-[fadeZoomIn_0.4s_ease-out_forwards] max-h-[90vh] overflow-hidden flex flex-col">
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-4 right-4 z-10 bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
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
                  <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm border border-PowderBlueBorder dark:border-dark_border overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30 h-full">
                    {/* Project Image */}
                    <div className="relative overflow-hidden bg-gray-100 dark:bg-dark_input">
                      <div className="w-full h-40 relative">
                        {project.image ? (
                          project.image.endsWith(".gif") ||
                          project.image.startsWith("data:image") ? (
                            <img
                              src={project.image}
                              alt={project.title}
                              className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <Image
                              src={
                                project.image.startsWith("/")
                                  ? project.image
                                  : `/${project.image}`
                              }
                              alt={project.title}
                              width={400}
                              height={160}
                              className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                            />
                          )
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-Aquamarine/10 flex items-center justify-center">
                            <Code className="w-10 h-10 text-primary/40" />
                          </div>
                        )}

                        {/* Indicators */}
                        <div className="absolute top-2 right-2 flex gap-1">
                          {project.video && (
                            <div className="bg-black/70 text-white rounded-full p-1">
                              <Play className="w-3 h-3" />
                            </div>
                          )}
                          {project.portfolioLink && (
                            <div className="bg-black/70 text-white rounded-full p-1">
                              <ExternalLink className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Project Content */}
                    <div className="p-4">
                      <h4 className="font-bold text-MidnightNavyText dark:text-white text-base mb-2 line-clamp-2">
                        {project.title}
                      </h4>

                      <p className="text-SlateBlueText dark:text-darktext text-sm mb-3 line-clamp-2">
                        {project.description}
                      </p>

                      {/* Technologies */}
                      {project.technologies &&
                        project.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {project.technologies
                              .slice(0, 2)
                              .map((tech: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded text-xs"
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
        <div className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-darkmode max-w-4xl w-full mx-auto rounded-xl relative shadow-lg animate-[fadeZoomIn_0.4s_ease-out_forwards] max-h-[90vh] overflow-hidden flex flex-col">
            <button
              onClick={closeProjectDetails}
              className="absolute top-4 right-4 z-10 bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
              aria-label={t("common.close")}
            >
              ✕
            </button>

            {/* Project Image/Video */}
            <div className="relative h-64 bg-gray-100 dark:bg-dark_input">
              {selectedProject.image ? (
                selectedProject.image.endsWith(".gif") ||
                selectedProject.image.startsWith("data:image") ? (
                  <img
                    src={selectedProject.image}
                    alt={selectedProject.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={
                      selectedProject.image.startsWith("/")
                        ? selectedProject.image
                        : `/${selectedProject.image}`
                    }
                    alt={selectedProject.title}
                    width={800}
                    height={256}
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/10 to-Aquamarine/10 flex items-center justify-center">
                  <Code className="w-16 h-16 text-primary/40" />
                </div>
              )}
            </div>

            {/* Project Details */}
            <div className="p-6 overflow-y-auto flex-1">
              <h3 className="text-2xl font-bold text-MidnightNavyText dark:text-white mb-4">
                {selectedProject.title}
              </h3>

              <p className="text-SlateBlueText dark:text-darktext mb-6 leading-relaxed">
                {selectedProject.description}
              </p>

              {/* Technologies & Info Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Technologies */}
                <div className="bg-IcyBreeze dark:bg-dark_input rounded-lg p-4 flex flex-col h-full">
                  <h4 className="font-semibold text-MidnightNavyText dark:text-white mb-2">
                    {t("projects.technologiesUsed")}
                  </h4>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {selectedProject.technologies?.map(
                      (tech: string, idx: number) => (
                        <span
                          key={idx}
                          className="bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded-lg text-sm font-medium"
                        >
                          {tech}
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Project & Student Info */}
                <div className="space-y-4 flex flex-col h-full">
                  {/* Student Info */}
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

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
                {selectedProject.video && (
                  <a
                    href={selectedProject.video}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
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
                    className="flex-1 bg-secondary hover:bg-secondary/90 text-white py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
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