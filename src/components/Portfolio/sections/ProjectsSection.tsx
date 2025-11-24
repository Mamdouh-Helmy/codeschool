"use client";
import { useState } from "react";
import { Plus, Trash2, Edit3, ExternalLink, Github, Calendar, Image } from "lucide-react";
import { PortfolioFormData, Project, ProjectImage } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

interface ProjectsSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

export default function ProjectsSection({ data, onChange }: ProjectsSectionProps) {
  const { t } = useI18n();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newProject, setNewProject] = useState<Project>({
    title: "",
    description: "",
    technologies: [],
    demoUrl: "",
    githubUrl: "",
    images: [],
    featured: false,
    startDate: "",
    endDate: "",
    status: "completed"
  });
  const [newTech, setNewTech] = useState<string>("");

  const addProject = (): void => {
    if (!newProject.title.trim()) return;
    const updatedProjects = [...(data.projects || []), { ...newProject }];
    onChange({ projects: updatedProjects });
    setNewProject({
      title: "",
      description: "",
      technologies: [],
      demoUrl: "",
      githubUrl: "",
      images: [],
      featured: false,
      startDate: "",
      endDate: "",
      status: "completed"
    });
  };

  const updateProject = (index: number, field: keyof Project, value: any): void => {
    const updatedProjects = [...(data.projects || [])];
    updatedProjects[index] = { ...updatedProjects[index], [field]: value };
    onChange({ projects: updatedProjects });
  };

  const removeProject = (index: number): void => {
    const updatedProjects = (data.projects || []).filter((_, i) => i !== index);
    onChange({ projects: updatedProjects });
  };

  const addTechnology = (): void => {
    if (!newTech.trim()) return;
    setNewProject(prev => ({
      ...prev,
      technologies: [...prev.technologies, newTech.trim()]
    }));
    setNewTech("");
  };

  const removeTechnology = (techIndex: number): void => {
    setNewProject(prev => ({
      ...prev,
      technologies: prev.technologies.filter((_, i) => i !== techIndex)
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index?: number): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const newImage: ProjectImage = {
        url: result,
        alt: file.name
      };

      if (index !== undefined) {
        const updatedProjects = [...(data.projects || [])];
        updatedProjects[index] = {
          ...updatedProjects[index],
          images: [...updatedProjects[index].images, newImage]
        };
        onChange({ projects: updatedProjects });
      } else {
        setNewProject(prev => ({
          ...prev,
          images: [...prev.images, newImage]
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (projectIndex: number, imageIndex: number): void => {
    const updatedProjects = [...(data.projects || [])];
    updatedProjects[projectIndex] = {
      ...updatedProjects[projectIndex],
      images: updatedProjects[projectIndex].images.filter((_, i) => i !== imageIndex)
    };
    onChange({ projects: updatedProjects });
  };

  const techSuggestions = ["React", "Next.js", "TypeScript", "Node.js", "Python", "MongoDB", "Tailwind CSS"];

  return (
    <div className="space-y-6">
      {/* Add New Project */}
      <div className="bg-gray-50 dark:bg-dark_input rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          {t("portfolio.projects.addNew")}
        </h3>
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("portfolio.projects.title")}
              </label>
              <input
                type="text"
                value={newProject.title}
                onChange={(e) => setNewProject(prev => ({ ...prev, title: e.target.value }))}
                placeholder={t("portfolio.projects.titlePlaceholder")}
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkmode dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("portfolio.projects.status")}
              </label>
              <select
                value={newProject.status}
                onChange={(e) => setNewProject(prev => ({ 
                  ...prev, 
                  status: e.target.value as "completed" | "in-progress" | "planned" 
                }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkmode dark:text-white"
              >
                <option value="completed">{t("portfolio.projects.status.completed")}</option>
                <option value="in-progress">{t("portfolio.projects.status.inProgress")}</option>
                <option value="planned">{t("portfolio.projects.status.planned")}</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("portfolio.projects.description")}
            </label>
            <textarea
              value={newProject.description}
              onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder={t("portfolio.projects.descriptionPlaceholder")}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkmode dark:text-white resize-none"
            />
          </div>

          {/* Technologies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("portfolio.projects.technologies")}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTech}
                onChange={(e) => setNewTech(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTechnology())}
                placeholder={`${t("portfolio.projects.addTechnology")} (${t("common.pressEnter")})`}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkmode dark:text-white"
                list="tech-suggestions"
              />
              <datalist id="tech-suggestions">
                {techSuggestions.map(tech => (
                  <option key={tech} value={tech} />
                ))}
              </datalist>
              <button
                onClick={addTechnology}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {t("common.add")}
              </button>
            </div>
            {newProject.technologies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {newProject.technologies.map((tech, index) => (
                  <span key={index} className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                    {tech}
                    <button
                      onClick={() => removeTechnology(index)}
                      className="text-primary hover:text-primary/70"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Github className="w-4 h-4" />
                {t("portfolio.projects.githubUrl")}
              </label>
              <input
                type="url"
                value={newProject.githubUrl}
                onChange={(e) => setNewProject(prev => ({ ...prev, githubUrl: e.target.value }))}
                placeholder="https://github.com/username/repo"
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkmode dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                {t("portfolio.projects.demoUrl")}
              </label>
              <input
                type="url"
                value={newProject.demoUrl}
                onChange={(e) => setNewProject(prev => ({ ...prev, demoUrl: e.target.value }))}
                placeholder="https://your-project.com"
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkmode dark:text-white"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t("portfolio.projects.startDate")}
              </label>
              <input
                type="date"
                value={newProject.startDate as string}
                onChange={(e) => setNewProject(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkmode dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t("portfolio.projects.endDate")}
              </label>
              <input
                type="date"
                value={newProject.endDate as string}
                onChange={(e) => setNewProject(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkmode dark:text-white"
              />
            </div>
          </div>

          {/* Featured Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="featured"
              checked={newProject.featured}
              onChange={(e) => setNewProject(prev => ({ ...prev, featured: e.target.checked }))}
              className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label htmlFor="featured" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("portfolio.projects.featured")}
            </label>
          </div>

          {/* Add Project Button */}
          <button
            onClick={addProject}
            disabled={!newProject.title.trim()}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("portfolio.projects.addNew")}
          </button>
        </div>
      </div>

      {/* Projects List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("portfolio.projects.yourProjects")} ({data.projects?.length || 0})
        </h3>
        {(!data.projects || data.projects.length === 0) ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark_input rounded-lg">
            <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t("portfolio.projects.noProjects")}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {data.projects.map((project, index) => (
              <div key={index} className="bg-white dark:bg-darkmode border border-gray-200 dark:border-dark_border rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      {project.title}
                      {project.featured && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded text-xs font-medium">
                          {t("portfolio.common.featured")}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        project.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        project.status === 'in-progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {t(`portfolio.projects.status.${project.status}`)}
                      </span>
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                      {project.description}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                      className="p-2 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeProject(index)}
                      className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Project Details */}
                <div className="space-y-3">
                  {/* Technologies */}
                  {project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.technologies.slice(0, 3).map((tech, techIndex) => (
                        <span key={techIndex} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                          {tech}
                        </span>
                      ))}
                      {project.technologies.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-dark_input text-gray-600 dark:text-gray-400 rounded text-xs">
                          +{project.technologies.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Links */}
                  <div className="flex gap-4 text-sm">
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                      >
                        <Github className="w-4 h-4" />
                        GitHub
                      </a>
                    )}
                    {project.demoUrl && (
                      <a
                        href={project.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {t("portfolio.projects.demo")}
                      </a>
                    )}
                  </div>

                  {/* Images */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t("portfolio.projects.projectImages")}
                    </label>
                    <div className="flex gap-2 mb-2">
                      <label className="cursor-pointer px-4 py-2 bg-gray-100 dark:bg-dark_input text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        {t("portfolio.projects.addImage")}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, index)}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {project.images.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto">
                        {project.images.map((image, imgIndex) => (
                          <div key={imgIndex} className="relative">
                            <img
                              src={image.url}
                              alt={image.alt}
                              className="w-20 h-20 object-cover rounded border border-gray-200 dark:border-dark_border"
                            />
                            <button
                              onClick={() => removeImage(index, imgIndex)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}