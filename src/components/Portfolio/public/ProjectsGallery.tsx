// components/Portfolio/public/ProjectsGallery.tsx
"use client";
import { useState } from "react";
import { ExternalLink, Github, Calendar, FolderGit2 } from "lucide-react";
import { Project } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";
import { ThemeStyles } from "@/utils/portfolioThemes";

interface ProjectsGalleryProps {
  projects: Project[];
  themeStyles?: ThemeStyles;
}

// نقل الدوال خارج المكون الرئيسي لتكون متاحة للجميع
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return "Present";
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return "Present";
  
  return dateObj.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short' 
  });
};

const getStatusColor = (status: string, themeStyles?: ThemeStyles): string => {
  // استخدام ألوان ثابتة مستقلة عن السمات
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800';
    case 'in-progress': return 'bg-blue-100 text-blue-800';
    case 'planned': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Project Card Component
const ProjectCard = ({ 
  project, 
  featured = false, 
  themeStyles 
}: { 
  project: Project; 
  featured?: boolean;
  themeStyles?: ThemeStyles;
}) => {
  const { t } = useI18n();
  const [imageError, setImageError] = useState(false);

  // دالة مساعدة للحصول على ألوان النص بشكل آمن
  const getTextColor = (type: 'primary' | 'secondary' | 'muted' | 'white' = 'primary'): string => {
    if (!themeStyles) {
      return type === 'primary' ? 'text-gray-900' : 
             type === 'secondary' ? 'text-gray-700' : 
             type === 'muted' ? 'text-gray-500' : 'text-white';
    }
    return themeStyles.text?.[type] || 
      (type === 'primary' ? 'text-gray-900' : 
       type === 'secondary' ? 'text-gray-700' : 
       type === 'muted' ? 'text-gray-500' : 'text-white');
  };

  const getCardStyle = (): string => {
    if (themeStyles?.card) {
      return `${themeStyles.card} hover:shadow-lg transition-all duration-300`;
    }
    return "bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-all duration-300";
  };

  const getIconContainerStyle = (): string => {
    // استخدام لون الـ skillFill للخلفية مع شفافية
    if (themeStyles?.skillFill) {
      const baseColor = themeStyles.skillFill;
      if (baseColor.includes('blue')) return 'bg-blue-100';
      if (baseColor.includes('green')) return 'bg-green-100';
      if (baseColor.includes('gray')) return 'bg-gray-100';
    }
    if (themeStyles?.background.secondary) {
      // إذا كان هناك لون ثانوي، استخدمه مع شفافية
      return `${themeStyles.background.secondary} bg-opacity-50`;
    }
    return "bg-blue-100";
  };

  const getIconColor = (): string => {
    // استخدام لون الـ skillFill للأيقونة
    if (themeStyles?.skillFill) {
      const baseColor = themeStyles.skillFill;
      if (baseColor.includes('blue')) return 'text-blue-600';
      if (baseColor.includes('green')) return 'text-green-600';
      if (baseColor.includes('gray')) return 'text-gray-600';
    }
    if (themeStyles?.text.primary) {
      return themeStyles.text.primary;
    }
    return "text-blue-600";
  };

  const getTechBadgeStyle = (): string => {
    if (themeStyles?.skillFill) {
      // استخدام لون الـ skillFill للتقنيات
      const baseColor = themeStyles.skillFill;
      if (baseColor.includes('blue')) return 'bg-blue-100 text-blue-800';
      if (baseColor.includes('green')) return 'bg-green-100 text-green-800';
      if (baseColor.includes('gray')) return 'bg-gray-100 text-gray-800';
    }
    return "bg-blue-100 text-blue-800";
  };

  return (
    <div className={`overflow-hidden transition-all duration-300 ${
      featured ? "lg:col-span-2" : ""
    } ${getCardStyle()}`}>
      {/* Project Image */}
      {project.images && project.images.length > 0 && !imageError ? (
        <div className="h-48 bg-gray-200 overflow-hidden">
          <img
            src={project.images[0].url}
            alt={project.images[0].alt || project.title}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        <div className={`h-48 bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center ${getIconContainerStyle()}`}>
          <FolderGit2 className={`w-12 h-12 opacity-50 ${getIconColor()}`} />
        </div>
      )}

      <div className="p-6">
        {/* Project Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className={`text-lg font-semibold flex-1 ${getTextColor('primary')}`}>
            {project.title}
          </h3>
          
          <div className="flex gap-2 ml-3">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-1 transition-colors ${getTextColor('muted')} hover:${getTextColor('primary')}`}
              >
                <Github className="w-4 h-4" />
              </a>
            )}
            
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-1 transition-colors ${getTextColor('muted')} hover:${getTextColor('primary')}`}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Project Description */}
        <p className={`text-sm mb-4 line-clamp-3 ${getTextColor('secondary')}`}>
          {project.description}
        </p>

        {/* Project Meta */}
        <div className="space-y-3">
          {/* Technologies */}
          {project.technologies && project.technologies.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {project.technologies.slice(0, 3).map((tech, index) => (
                <span
                  key={index}
                  className={`px-2 py-1 rounded text-xs font-medium ${getTechBadgeStyle()}`}
                >
                  {tech}
                </span>
              ))}
              {project.technologies.length > 3 && (
                <span className={`px-2 py-1 rounded text-xs ${
                  themeStyles?.background.secondary || "bg-gray-100"
                } ${
                  getTextColor('muted')
                }`}>
                  +{project.technologies.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Status and Date */}
          <div className={`flex items-center justify-between text-xs ${getTextColor('muted')}`}>
            <span className={`px-2 py-1 rounded-full ${getStatusColor(project.status, themeStyles)}`}>
              {t(`portfolio.projects.status.${project.status}`)}
            </span>
            
            {(project.startDate || project.endDate) && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  {formatDate(project.startDate)} - {formatDate(project.endDate)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ProjectsGallery({ projects, themeStyles }: ProjectsGalleryProps) {
  const { t } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // دالة مساعدة للحصول على ألوان النص بشكل آمن
  const getTextColor = (type: 'primary' | 'secondary' | 'muted' | 'white' = 'primary'): string => {
    if (!themeStyles) {
      return type === 'primary' ? 'text-gray-900' : 
             type === 'secondary' ? 'text-gray-700' : 
             type === 'muted' ? 'text-gray-500' : 'text-white';
    }
    return themeStyles.text?.[type] || 
      (type === 'primary' ? 'text-gray-900' : 
       type === 'secondary' ? 'text-gray-700' : 
       type === 'muted' ? 'text-gray-500' : 'text-white');
  };

  const getIconContainerStyle = (): string => {
    // استخدام لون الـ skillFill للخلفية
    if (themeStyles?.skillFill) {
      const baseColor = themeStyles.skillFill;
      if (baseColor.includes('blue')) return 'bg-blue-100';
      if (baseColor.includes('green')) return 'bg-green-100';
      if (baseColor.includes('gray')) return 'bg-gray-100';
    }
    if (themeStyles?.background.secondary) {
      return `${themeStyles.background.secondary} bg-opacity-50`;
    }
    return "bg-blue-100";
  };

  const getIconColor = (): string => {
    // استخدام لون الـ skillFill للأيقونة
    if (themeStyles?.skillFill) {
      const baseColor = themeStyles.skillFill;
      if (baseColor.includes('blue')) return 'text-blue-600';
      if (baseColor.includes('green')) return 'text-green-600';
      if (baseColor.includes('gray')) return 'text-gray-600';
    }
    if (themeStyles?.text.primary) {
      return themeStyles.text.primary;
    }
    return "text-blue-600";
  };

  const getFilterButtonStyle = (isActive: boolean): string => {
    if (isActive) {
      if (themeStyles?.skillFill) {
        // استخدام لون الـ skillFill للزر النشط
        const baseColor = themeStyles.skillFill;
        if (baseColor.includes('blue')) return 'bg-blue-600 text-white';
        if (baseColor.includes('green')) return 'bg-green-600 text-white';
        if (baseColor.includes('gray')) return 'bg-gray-600 text-white';
      }
      return "bg-blue-600 text-white";
    }
    if (themeStyles?.background.secondary) {
      return `${themeStyles.background.secondary} ${getTextColor('secondary')} hover:opacity-80`;
    }
    return "bg-gray-100 text-gray-700 hover:bg-gray-200";
  };

  const categories = ["all", ...new Set(projects.flatMap(project => project.technologies || []))];
  const featuredProjects = projects.filter(project => project.featured);
  const filteredProjects = selectedCategory === "all" 
    ? projects 
    : projects.filter(project => project.technologies?.includes(selectedCategory));

  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-8">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getIconContainerStyle()}`}>
          <FolderGit2 className={`w-6 h-6 ${getIconColor()}`} />
        </div>
        <div>
          <span className={`text-2xl font-bold ${getTextColor('primary')}`}>
            {t("portfolio.public.projectsShowcase")}
          </span>
          <p className={getTextColor('secondary')}>
            {t("portfolio.public.workAccomplishments")}
          </p>
        </div>
      </div>

      {/* Featured Projects */}
      {featuredProjects.length > 0 && (
        <div className="mb-8">
          <h3 className={`text-xl font-semibold mb-4 ${getTextColor('primary')}`}>
            {t("portfolio.public.featuredProjects")}
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {featuredProjects.map((project, index) => (
              <ProjectCard 
                key={index} 
                project={project} 
                featured 
                themeStyles={themeStyles}
              />
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.slice(0, 8).map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${getFilterButtonStyle(selectedCategory === category)}`}
          >
            {category === "all" ? t("portfolio.public.all") : category}
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project, index) => (
          <ProjectCard 
            key={index} 
            project={project} 
            themeStyles={themeStyles}
          />
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className={`text-center py-12 ${getTextColor('secondary')}`}>
          <FolderGit2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>{t("portfolio.public.noProjectsCategory")}</p>
        </div>
      )}
    </section>
  );
}