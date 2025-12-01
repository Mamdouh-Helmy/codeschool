// components/Portfolio/public/ProjectsGallery.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import colorSharp2 from "../../../../public/images/portfolio/img/color-sharp2.png";
import projectImage from "../../../../public/images/portfolio/img/project-img1.png";
import "animate.css";
import Image from "next/image";
import { Tabs, Tab, TabsHeader, TabsBody, TabPanel } from "@material-tailwind/react";
import { Project } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ProjectCard component
const ProjectCard = ({ 
  project, 
  themeStyles 
}: { 
  project: any; 
  themeStyles?: any;
}) => {
  const [imageError, setImageError] = useState(false);

  const getImageSrc = () => {
    if (imageError) {
      return "/images/default-project.jpg";
    }
    
    if (project.images && project.images.length > 0 && project.images[0]?.url) {
      return project.images[0].url;
    }
    
    return projectImage.src;
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="h-full"
    >
      <a
        href={project.link || project.demoUrl || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full group"
      >
        <div className="relative h-full rounded-xl overflow-hidden shadow-lg transition-all duration-300 border border-gray-800 group-hover:border-purple-500">
          <div className="relative h-64 overflow-hidden">
            <Image
              src={getImageSrc()}
              alt={project.title || project.name || "Project"}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={() => {
                console.log("Image failed to load:", project.title);
                setImageError(true);
              }}
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
              <h3 className="text-xl font-bold text-white mb-2">
                {project.title || project.name}
              </h3>
              <p className="text-gray-300 mb-4">
                {project.description}
              </p>
              
              {project.technologies && project.technologies.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-auto">
                  {project.technologies.slice(0, 4).map((tech: string, index: number) => (
                    <span 
                      key={index}
                      className="text-xs px-2 py-1 bg-purple-900/50 text-purple-200 rounded-full"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
              
              <div className="mt-4 flex items-center text-purple-300 group-hover:text-white transition-colors">
                <span>View Project</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </a>
    </motion.div>
  );
};

interface ProjectsGalleryProps {
  projects: Project[];
  themeStyles?: any;
  portfolio?: {
    projectsTitle?: string;
    projectsSubtitle?: string;
    projectsDesc?: string;
  };
}

export default function ProjectsGallery({ 
  projects = [], 
  themeStyles, 
  portfolio 
}: ProjectsGalleryProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("all");
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  
  console.log("🎯 Projects data:", projects);
  
  const safePortfolio = portfolio || {
    projectsTitle: t("portfolio.public.projectsTitle") || "Our Projects",
    projectsSubtitle: t("portfolio.public.projectsSubtitle") || "Featured Work",
    projectsDesc: t("portfolio.public.projectsDesc") || "Explore our collection of recent projects"
  };

  const categories = [
    { id: "all", name: "All Projects", projects: projects },
    { id: "web", name: "Web Development", projects: projects.filter(p => 
      p.technologies?.some((t: string) => ["React", "Next.js", "Vue", "Angular", "JavaScript", "TypeScript", "HTML", "CSS"].includes(t))
    )},
    { id: "mobile", name: "Mobile Apps", projects: projects.filter(p => 
      p.technologies?.some((t: string) => ["Flutter", "React Native", "iOS", "Android", "Swift", "Kotlin"].includes(t))
    )},
    { id: "backend", name: "Backend", projects: projects.filter(p => 
      p.technologies?.some((t: string) => ["Node.js", "Python", "Java", "PHP", "Ruby", "Go"].includes(t))
    )},
    { id: "design", name: "UI/UX Design", projects: projects.filter(p => 
      p.technologies?.some((t: string) => ["Figma", "Adobe XD", "Sketch", "Photoshop"].includes(t))
    )},
    { id: "database", name: "Database", projects: projects.filter(p => 
      p.technologies?.some((t: string) => ["MongoDB", "MySQL", "PostgreSQL", "Firebase"].includes(t))
    )},
    { id: "cloud", name: "Cloud & DevOps", projects: projects.filter(p => 
      p.technologies?.some((t: string) => ["AWS", "Docker", "Kubernetes", "CI/CD"].includes(t))
    )}
  ];

  const filteredProjects = activeTab === "all" 
    ? projects 
    : categories.find(cat => cat.id === activeTab)?.projects || [];

  // التحقق مما إذا كان يمكن التمرير
  const checkScrollButtons = () => {
    if (!tabsContainerRef.current) return;
    
    const container = tabsContainerRef.current;
    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth
    );
  };

  // التمرير إلى اليسار
  const scrollLeft = () => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({
        left: -200,
        behavior: 'smooth'
      });
    }
  };

  // التمرير إلى اليمين
  const scrollRight = () => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({
        left: 200,
        behavior: 'smooth'
      });
    }
  };

  // Initialize scroll buttons and add event listener
  useEffect(() => {
    checkScrollButtons();
    
    const handleResize = () => checkScrollButtons();
    window.addEventListener('resize', handleResize);
    
    const container = tabsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (container) {
        container.removeEventListener('scroll', checkScrollButtons);
      }
    };
  }, []);

  return (
    <section className="project bg-black py-20 relative" id="projects">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="animate__animated animate__fadeIn">
            <h2 className="text-4xl font-bold text-center text-white mb-4">
              {safePortfolio.projectsTitle}
            </h2>
            <h3 className="text-xl text-purple-400 mb-6">
              {safePortfolio.projectsSubtitle}
            </h3>
            <p className="text-lg text-gray-400 mx-auto max-w-2xl">
              {safePortfolio.projectsDesc}
            </p>
          </div>
        </div>

        {projects.length > 0 ? (
          <>
            {/* Custom Tabs with Horizontal Scroll */}
            <div className="mb-16">
              {/* Tabs Header with Scroll */}
              <div className="relative mb-12">
                

                {/* Tabs Container with Visible Scrollbar */}
                <div className="flex-1 mx-12">
                  <div 
                    ref={tabsContainerRef}
                    className="flex gap-4 overflow-x-auto scroll-smooth py-4 pb-6 px-2 hide-scrollbar"
                    style={{
                      scrollBehavior: 'smooth',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setActiveTab(category.id)}
                        className={`flex-shrink-0 px-6 py-3 rounded-full font-semibold transition-all whitespace-nowrap ${
                          activeTab === category.id
                            ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20 transform scale-105"
                            : "text-gray-300 hover:text-white border border-gray-700 hover:border-purple-400 hover:bg-gray-800/50"
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

              
              </div>

              {/* Projects Content */}
              <div className="overflow-visible">
                {/* All Projects */}
                {activeTab === "all" && (
                  <div className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {filteredProjects.length > 0 ? (
                        filteredProjects.map((project, index) => (
                          <ProjectCard
                            key={project._id || `project-${index}`}
                            project={project}
                            themeStyles={themeStyles}
                          />
                        ))
                      ) : (
                        <div className="col-span-full p-6 rounded-lg text-xl text-white font-bold bg-purple-900/50 text-center">
                          No projects found
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Category Projects */}
                {activeTab !== "all" && categories.find(cat => cat.id === activeTab) && (
                  <div className="p-0">
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold text-white mb-2">
                        {categories.find(cat => cat.id === activeTab)?.name}
                      </h3>
                      <p className="text-gray-400">
                        Projects showcasing our {categories.find(cat => cat.id === activeTab)?.name.toLowerCase()} expertise
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {filteredProjects.length > 0 ? (
                        filteredProjects.map((project, index) => (
                          <ProjectCard
                            key={project._id || `project-${index}`}
                            project={project}
                            themeStyles={themeStyles}
                          />
                        ))
                      ) : (
                        <div className="col-span-full p-6 rounded-lg text-xl text-white font-bold bg-purple-900/50 text-center">
                          No projects found in this category
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Image
              className="absolute top-20 right-0 w-1/3 max-w-md z-[-4] opacity-30"
              src={colorSharp2}
              alt="background-shape"
              priority
            />
          </>
        ) : (
          <div className="text-center py-12">
            <div className="p-6 rounded-lg text-xl text-white font-bold bg-purple-900/50">
              {t("portfolio.public.noProjects") || "No projects available"}
            </div>
          </div>
        )}
      </div>

     
    </section>
  );
}