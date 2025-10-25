"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FileText,
  Image,
  Video,
  Link,
  User,
  Plus,
  Edit,
  Trash2,
  Globe,
  Star,
  Zap,
  Package,
  TrendingUp,
  CheckCircle,
  Eye,
  Play,
  Calendar,
  Clock,
  Edit3,
} from "lucide-react";
import Modal from "./Modal";
import ProjectForm from "./ProjectForm";

interface Project {
  _id: string;
  title: string;
  description: string;
  image: string;
  video: string;
  portfolioLink: string;
  student: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  technologies: string[];
  featured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ProjectsAdmin() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  // دالة لتنسيق التاريخ بشكل احترافي
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // إذا كان التاريخ ضمن 7 أيام مضت، نعرضه بشكل نسبي
    if (diffDays < 7) {
      if (diffDays === 0) {
        return "Today";
      } else if (diffDays === 1) {
        return "Yesterday";
      } else {
        return `${diffDays} days ago`;
      }
    }

    // إذا كان أقدم من أسبوع، نعرض التاريخ الكامل
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // دالة للعرض التفصيلي للتاريخ
  const formatDetailedDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      full: date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setProjects(json.data);
      }
    } catch (err) {
      console.error("Error loading projects:", err);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const onSaved = async () => {
    await loadProjects();
    toast.success("Project saved successfully");
  };

  const onEdit = (project: Project) => {
    setEditing(project);
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    toast(
      (t) => (
        <div className="w-404 max-w-full bg-white dark:bg-darkmode text-MidnightNavyText dark:text-white rounded-14 shadow-round-box border-none outline-none dark:border-dark_border p-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600 font-bold">
              !
            </div>
            <div className="flex-1">
              <p className="text-16 font-semibold">
                Are you sure you want to delete this project?
              </p>
              <p className="text-14 mt-1 text-slate-500 dark:text-darktext">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              className="px-3 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded-14 text-15 hover:opacity-90 border border-PeriwinkleBorder/50"
              onClick={() => toast.dismiss(t.id)}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1 bg-red-600 text-white rounded-14 text-15 hover:bg-red-700 shadow-sm"
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  const res = await fetch(
                    `/api/projects/${encodeURIComponent(id)}`,
                    {
                      method: "DELETE",
                    }
                  );
                  if (res.ok) {
                    setProjects((prev) => prev.filter((p) => p._id !== id));
                    toast.success("Project deleted successfully");
                  } else {
                    toast.error("Failed to delete the project");
                  }
                } catch (err) {
                  console.error("Error deleting project:", err);
                  toast.error("Error deleting project");
                }
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: "top-center" }
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm p-6 border border-PowderBlueBorder dark:border-dark_border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-MidnightNavyText dark:text-white flex items-center gap-3">
              <FileText className="w-7 h-7 text-primary" />
              YoungStars Projects Management
            </h1>
            <p className="text-sm text-SlateBlueText dark:text-darktext max-w-2xl">
              Manage student projects for the YoungStars section. Showcase
              amazing work with images, videos, and portfolio links.
            </p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="mt-4 lg:mt-0 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Project
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                Total Projects
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {projects.length}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                Active Projects
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {projects.filter((p) => p.isActive).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-ElectricAqua/10 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-ElectricAqua" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                Featured Projects
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {projects.filter((p) => p.featured).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-Aquamarine/10 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-Aquamarine" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                With Videos
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {projects.filter((p) => p.video).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-LightYellow/10 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-LightYellow" />
            </div>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <div
            key={project._id}
            className={`relative rounded-xl border p-6 transition-all duration-300 hover:shadow-md ${
              project.featured
                ? "border-primary bg-gradient-to-br from-primary/5 to-primary/10"
                : "border-PowderBlueBorder bg-white dark:bg-darkmode dark:border-dark_border"
            }`}
          >
            {/* Featured Badge */}
            {project.featured && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-white px-4 py-1 rounded-full text-xs font-semibold shadow-md flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Featured
                </span>
              </div>
            )}

            {/* Status Badge */}
            <div className="absolute top-4 right-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                  project.isActive
                    ? "bg-Aquamarine/20 text-Salem dark:bg-Aquamarine/30"
                    : "bg-SlateBlueText/20 text-SlateBlueText dark:bg-darktext/30"
                }`}
              >
                <CheckCircle className="w-3 h-3" />
                {project.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            {/* Project Image */}
            {project.image && (
              <div className="mb-4 rounded-lg overflow-hidden h-40 bg-gray-100 dark:bg-dark_input">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Project Header */}
            <div className="mb-4">
              <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-2 line-clamp-2">
                {project.title}
              </h3>
              <p className="text-sm text-SlateBlueText dark:text-darktext line-clamp-2">
                {project.description}
              </p>
            </div>

            {/* Student Info with Enhanced Date Display */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-IcyBreeze dark:bg-dark_input rounded-lg">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-3 h-3 text-primary" />
              </div>
              <div className="flex-1">
                <div className=" items-center justify-between">
                  <p className="text-sm font-medium text-MidnightNavyText dark:text-white">
                    {project.student?.name || "Student"}
                  </p>
                </div>

                <div className=" items-center justify-between mt-1">
                  <p className="text-xs mb-1 text-SlateBlueText dark:text-darktext">
                    {project.student?.email}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-SlateBlueText dark:text-darktext">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {project.updatedAt
                        ? formatDetailedDate(project.updatedAt).date
                        : formatDetailedDate(project.createdAt).date}
                    </span>
                    <Clock className="w-3 h-3 ml-1" />

                    <span>
                      {project.updatedAt
                        ? formatDetailedDate(project.updatedAt).time
                        : formatDetailedDate(project.createdAt).time}
                    </span>
                  </div>
                  {project.updatedAt !== project.createdAt && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-Aquamarine dark:text-Aquamarine">
                      <Edit3 className="w-3 h-3" />
                      <span>Last edited {formatDate(project.updatedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Technologies */}
            {project.technologies && project.technologies.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {project.technologies.slice(0, 4).map((tech, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded text-xs"
                    >
                      {tech}
                    </span>
                  ))}
                  {project.technologies.length > 4 && (
                    <span className="px-2 py-1 bg-PaleCyan dark:bg-dark_input text-SlateBlueText dark:text-darktext rounded text-xs">
                      +{project.technologies.length - 4}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Media Indicators */}
            <div className="flex items-center gap-4 text-xs text-SlateBlueText dark:text-darktext mb-4">
              {project.image && (
                <div className="flex items-center gap-1">
                  <Image className="w-3 h-3" />
                  <span>Image</span>
                </div>
              )}
              {project.video && (
                <div className="flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  <span>Video</span>
                </div>
              )}
              {project.portfolioLink && (
                <div className="flex items-center gap-1">
                  <Link className="w-3 h-3" />
                  <span>Portfolio</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {/* Edit */}
                <button
                  onClick={() => onEdit(project)}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-2 px-3 rounded-lg font-semibold text-sm transition-transform transition-shadow duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary/30 flex items-center justify-center gap-2 group"
                >
                  <Edit className="w-3 h-3 transition-transform duration-300 group-hover:-translate-y-0.5" />
                  Edit
                </button>

                {/* Delete */}
                <button
                  onClick={() => onDelete(project._id)}
                  className="bg-SlateBlueText/10 hover:bg-SlateBlueText/20 dark:bg-darktext/20 dark:hover:bg-darktext/30 text-SlateBlueText dark:text-darktext py-2 px-3 rounded-lg font-semibold text-xs transition-transform transition-colors transition-shadow duration-300 hover:scale-105 active:scale-100 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-SlateBlueText/20 flex items-center justify-center gap-2 group"
                >
                  <Trash2 className="w-3 h-3 transition-transform duration-300 group-hover:rotate-12" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-3">
            No projects yet
          </h3>
          <p className="text-sm text-SlateBlueText dark:text-darktext mb-6 max-w-md mx-auto">
            Create your first student project to showcase amazing work in the
            YoungStars section.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Create Your First Project
          </button>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={open}
        title={editing ? "Edit Project" : "Create New Project"}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
      >
        <ProjectForm
          initial={editing}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          onSaved={onSaved}
        />
      </Modal>
    </div>
  );
}
