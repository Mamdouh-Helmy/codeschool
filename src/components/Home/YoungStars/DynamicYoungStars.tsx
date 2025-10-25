"use client";
import { useState } from "react";
import Image from "next/image";
import { useProjects } from "@/hooks/useApiData";
import ProjectModal from "@/components/Common/ProjectModal";
import { Project } from "@/lib/types";

const DynamicYoungStars = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: projectsData, loading, error, source } = useProjects({ isActive: true });

  // Use API data or fallback
  const projects = (projectsData as any)?.data || [];

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
  };

  const getProjectIcon = (projectType: string) => {
    switch (projectType) {
      case 'video':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        );
      case 'image':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'text':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'portfolio':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
    }
  };

  const getProjectThumbnail = (project: Project) => {
    switch (project.projectType) {
      case 'video':
        return project.content.videoThumbnail || "/images/projects/default-video-thumb.jpg";
      case 'image':
        return project.content.imageUrl || "/images/projects/default.jpg";
      case 'text':
        return "/images/projects/text-thumb.jpg";
      case 'portfolio':
        return "/images/projects/portfolio-thumb.jpg";
      default:
        return "/images/projects/default.jpg";
    }
  };

  if (loading) {
    return (
      <section className="bg-LightSkyBlue dark:bg-darklight py-20">
        <div className="container">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading student projects...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-LightSkyBlue dark:bg-darklight py-20">
        <div className="container">
          {/* Fallback notice */}
          {source === "fallback" && (
            <div className="rounded-xl border border-yellow-500/40 bg-yellow-50 px-4 py-3 text-sm text-yellow-700 dark:border-yellow-500/40 dark:bg-yellow-500/10 dark:text-yellow-200 mb-8">
              ⚠️ Displaying cached student projects. Some content may be outdated.
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-16">
            <h2 
              data-aos="fade-up" 
              data-aos-delay="200" 
              data-aos-duration="1000"
              className="text-4xl md:text-5xl font-bold text-MidnightNavyText dark:text-white mb-4"
            >
              Young Stars Showcase
            </h2>
            <p 
              data-aos="fade-up" 
              data-aos-delay="300" 
              data-aos-duration="1000"
              className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto"
            >
              Discover amazing projects created by our talented students. From mobile apps to web applications, 
              certificates to personal reflections - see what our young developers are building!
            </p>
          </div>

          {/* Projects Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project: Project, index: number) => (
              <div
                key={project.id}
                data-aos="fade-up"
                data-aos-delay={`${index * 100 + 400}`}
                data-aos-duration="1000"
                className="bg-white dark:bg-darkmode rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer group"
                onClick={() => handleProjectClick(project)}
              >
                {/* Project Thumbnail */}
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={getProjectThumbnail(project)}
                    alt={project.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Project Type Overlay */}
                  <div className="absolute top-4 left-4 bg-primary text-white p-2 rounded-lg">
                    {getProjectIcon(project.projectType)}
                  </div>

                  {/* Category Badge */}
                  <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-medium">
                    {project.category}
                  </div>

                  {/* Play Button for Videos */}
                  {project.projectType === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors duration-200">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <svg className="w-6 h-6 text-primary ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* Project Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-MidnightNavyText dark:text-white mb-2 group-hover:text-primary transition-colors duration-200">
                    {project.title}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                    {project.description}
                  </p>

                  {/* Student Info */}
                  <div className="flex items-center space-x-3 mb-4">
                    <Image
                      src={project.studentImage || "/images/students/default.jpg"}
                      alt={project.studentName}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {project.studentName}
                    </span>
                  </div>

                  {/* Technologies */}
                  <div className="flex flex-wrap gap-1">
                    {project.technologies.slice(0, 3).map((tech, techIndex) => (
                      <span
                        key={techIndex}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded"
                      >
                        {tech}
                      </span>
                    ))}
                    {project.technologies.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded">
                        +{project.technologies.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {projects.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                No projects yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Student projects will appear here once they're submitted.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Project Modal */}
      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          isOpen={isModalOpen}
          onClose={closeModal}
          isOwner={false} // This would be determined by authentication
        />
      )}
    </>
  );
};

export default DynamicYoungStars;
