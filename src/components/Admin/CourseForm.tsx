"use client";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Save,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  X,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

interface Lesson {
  title: string;
  description?: string;
  order: number;
  sessionNumber: number; // 1, 2, or 3
}

interface Module {
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
  projects: string[];
  totalSessions: number; // Always 3
}

interface Course {
  _id?: string;
  title: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
  curriculum: Module[];
  projects: string[];
  instructors: string[];
  price: number;
  isActive: boolean;
  featured: boolean;
  thumbnail?: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface CourseFormProps {
  initial?: Course | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function CourseForm({
  initial,
  onClose,
  onSaved,
}: CourseFormProps) {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedModules, setExpandedModules] = useState<Set<number>>(
    new Set([0])
  );
  const [instructorsList, setInstructorsList] = useState<any[]>([]);
  const [instructorsLoading, setInstructorsLoading] = useState(true);
  const [newProjectInputs, setNewProjectInputs] = useState<Record<number, string>>({});

  const [form, setForm] = useState<Course>({
    title: "",
    description: "",
    level: "beginner",
    curriculum: [],
    projects: [],
    instructors: [],
    price: 0,
    isActive: true,
    featured: false,
    thumbnail: "",
    ...initial,
  });

  useEffect(() => {
    if (initial) {
      setForm(initial);
      setExpandedModules(new Set([0]));
    }
  }, [initial]);

  useEffect(() => {
    const fetchInstructors = async () => {
      try {
        setInstructorsLoading(true);
        const res = await fetch("/api/instructor", { cache: "no-store" });
        const json = await res.json();

        if (json.success) {
          setInstructorsList(json.data);
        }
      } catch (err) {
        console.error("Error fetching instructors:", err);
      } finally {
        setInstructorsLoading(false);
      }
    };

    fetchInstructors();
  }, []);

  const toggleModule = (index: number) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Helper function to calculate sessionNumber from lesson order
  const calculateSessionNumber = (lessonOrder: number): number => {
    return Math.ceil(lessonOrder / 2);
  };

  // Helper function to get session color
  const getSessionColor = (sessionNumber: number): string => {
    const colors = {
      1: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      2: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      3: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    };
    return colors[sessionNumber as keyof typeof colors] || colors[1];
  };

  const addModule = () => {
    const newModule: Module = {
      title: "",
      description: "",
      order: form.curriculum.length + 1,
      lessons: Array(6)
        .fill(null)
        .map((_, i) => ({
          title: "",
          description: "",
          order: i + 1,
          sessionNumber: calculateSessionNumber(i + 1),
        })),
      projects: [],
      totalSessions: 3,
    };
    setForm((prev) => ({
      ...prev,
      curriculum: [...prev.curriculum, newModule],
    }));
    setExpandedModules((prev) => new Set(prev).add(form.curriculum.length));
  };

  const removeModule = (moduleIndex: number) => {
    setForm((prev) => ({
      ...prev,
      curriculum: prev.curriculum.filter((_, i) => i !== moduleIndex),
    }));
  };

  const updateModule = (
    moduleIndex: number,
    field: "title" | "description" | "order",
    value: string | number
  ) => {
    setForm((prev) => {
      const updated = [...prev.curriculum];
      updated[moduleIndex] = {
        ...updated[moduleIndex],
        [field]: value,
      };
      return { ...prev, curriculum: updated };
    });
  };

  const updateLesson = (
    moduleIndex: number,
    lessonIndex: number,
    field: "title" | "description" | "order",
    value: string | number
  ) => {
    setForm((prev) => {
      const updated = [...prev.curriculum];
      const currentLesson = updated[moduleIndex].lessons[lessonIndex];
      const newOrder = field === "order" ? Number(value) : currentLesson.order;
      
      updated[moduleIndex].lessons[lessonIndex] = {
        ...currentLesson,
        [field]: value,
        sessionNumber: calculateSessionNumber(newOrder),
      };
      return { ...prev, curriculum: updated };
    });
  };

  const addProjectToModule = (moduleIndex: number) => {
    const projectText = newProjectInputs[moduleIndex]?.trim();
    if (!projectText) {
      toast.error(t("courses.projectEmpty") || "Project name cannot be empty");
      return;
    }

    setForm((prev) => {
      const updated = [...prev.curriculum];
      updated[moduleIndex] = {
        ...updated[moduleIndex],
        projects: [...(updated[moduleIndex].projects || []), projectText],
      };
      return { ...prev, curriculum: updated };
    });

    setNewProjectInputs((prev) => ({ ...prev, [moduleIndex]: "" }));
  };

  const removeProjectFromModule = (moduleIndex: number, projectIndex: number) => {
    setForm((prev) => {
      const updated = [...prev.curriculum];
      updated[moduleIndex] = {
        ...updated[moduleIndex],
        projects: updated[moduleIndex].projects.filter((_, i) => i !== projectIndex),
      };
      return { ...prev, curriculum: updated };
    });
  };

  const toggleInstructor = (instructorId: string) => {
    setForm((prev) => {
      const currentInstructors = prev.instructors || [];
      if (currentInstructors.includes(instructorId)) {
        return {
          ...prev,
          instructors: currentInstructors.filter((id) => id !== instructorId),
        };
      } else {
        return {
          ...prev,
          instructors: [...currentInstructors, instructorId],
        };
      }
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.title.trim()) {
      newErrors.title = t("courses.titleRequired") || "Title is required";
    }

    if (!form.description.trim()) {
      newErrors.description =
        t("courses.descriptionRequired") || "Description is required";
    }

    if (form.curriculum.length > 0) {
      form.curriculum.forEach((module, mIdx) => {
        if (!module.title.trim()) {
          newErrors[`module_${mIdx}_title`] =
            t("courses.moduleTitleRequired") || "Module title is required";
        }

        if (module.lessons.length !== 6) {
          newErrors[`module_${mIdx}_lessons`] =
            t("courses.exact6Lessons") ||
            "Each module must have exactly 6 lessons (3 sessions)";
        }

        module.lessons.forEach((lesson, lIdx) => {
          if (!lesson.title.trim()) {
            newErrors[`module_${mIdx}_lesson_${lIdx}_title`] =
              t("courses.lessonTitleRequired") || "Lesson title is required";
          }

          // Verify sessionNumber matches lesson order
          const expectedSession = calculateSessionNumber(lesson.order);
          if (lesson.sessionNumber !== expectedSession) {
            newErrors[`module_${mIdx}_lesson_${lIdx}_session`] =
              `Session number mismatch: Lesson ${lesson.order} should be in Session ${expectedSession}`;
          }
        });
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error(
        t("courses.loginRequired") || "Please login to create a course"
      );
      return;
    }

    if (!validateForm()) {
      toast.error(
        t("courses.validationFailed") || "Please fix validation errors"
      );
      return;
    }

    setLoading(true);
    try {
      const method = initial?._id ? "PUT" : "POST";
      const url = initial?._id
        ? `/api/courses/${initial._id}`
        : "/api/courses";

      const payload = {
        title: form.title,
        description: form.description,
        level: form.level,
        curriculum: form.curriculum.map(module => ({
          ...module,
          totalSessions: 3,
          lessons: module.lessons.map(lesson => ({
            ...lesson,
            sessionNumber: calculateSessionNumber(lesson.order)
          }))
        })),
        projects: form.projects,
        instructors: form.instructors,
        price: form.price,
        isActive: form.isActive,
        featured: form.featured,
        thumbnail: form.thumbnail,
        createdBy: initial?.createdBy || {
          id: user.id,
          name: user.name || "Admin",
          email: user.email || "",
          role: user.role || "admin",
        },
      };

      console.log("📤 Sending request:", { method, url, payload });

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      console.log("📥 Response:", { status: res.status, json });

      if (!res.ok) {
        if (json.details && Array.isArray(json.details)) {
          toast.error(json.details[0]);
          console.error("Validation errors:", json.details);
        } else {
          toast.error(json.error || json.message || "Failed to save course");
        }
        return;
      }

      toast.success(
        method === "POST"
          ? t("courses.createdSuccess") || "Course created successfully"
          : t("courses.updatedSuccess") || "Course updated successfully"
      );
      onSaved();
      onClose();
    } catch (err) {
      console.error("❌ Error saving course:", err);
      toast.error(t("courses.saveFailed") || "Failed to save course");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {user && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <span className="font-semibold">{user.name}</span>
            {" - "}
            <span className="text-xs">{user.email}</span>
          </p>
        </div>
      )}

      {/* Basic Info Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white flex items-center gap-2">
          <span className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">
            1
          </span>
          {t("courses.basicInfo") || "Basic Information"}
        </h3>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
            {t("courses.title") || "Course Title"}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => {
              setForm({ ...form, title: e.target.value });
              if (errors.title) setErrors({ ...errors, title: "" });
            }}
            placeholder="e.g., Web Development Fundamentals"
            className={`w-full px-4 py-2 rounded-lg border transition-colors bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
              errors.title
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                : "border-PowderBlueBorder dark:border-dark_border focus:border-primary focus:ring-primary/20"
            } focus:outline-none focus:ring-4`}
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.title}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
            {t("courses.description") || "Description"}
            <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => {
              setForm({ ...form, description: e.target.value });
              if (errors.description) setErrors({ ...errors, description: "" });
            }}
            placeholder="Describe what students will learn..."
            rows={3}
            className={`w-full px-4 py-2 rounded-lg border transition-colors bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
              errors.description
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                : "border-PowderBlueBorder dark:border-dark_border focus:border-primary focus:ring-primary/20"
            } focus:outline-none focus:ring-4 resize-none`}
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.description}
            </p>
          )}
        </div>

        {/* Level and Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
              {t("courses.level") || "Level"}
            </label>
            <select
              value={form.level}
              onChange={(e) =>
                setForm({
                  ...form,
                  level: e.target.value as
                    | "beginner"
                    | "intermediate"
                    | "advanced",
                })
              }
              className="w-full px-4 py-2 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary"
            >
              <option value="beginner">
                {t("courses.beginner") || "Beginner"}
              </option>
              <option value="intermediate">
                {t("courses.intermediate") || "Intermediate"}
              </option>
              <option value="advanced">
                {t("courses.advanced") || "Advanced"}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
              {t("courses.price") || "Price ($)"}
            </label>
            <input
              type="number"
              value={form.price}
              onChange={(e) =>
                setForm({ ...form, price: parseFloat(e.target.value) || 0 })
              }
              placeholder="0"
              min="0"
              step="0.01"
              className="w-full px-4 py-2 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Flags */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm({ ...form, isActive: e.target.checked })
              }
              className="w-4 h-4 rounded border-PowderBlueBorder accent-primary"
            />
            <span className="text-sm text-MidnightNavyText dark:text-white">
              {t("courses.active") || "Active"}
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) =>
                setForm({ ...form, featured: e.target.checked })
              }
              className="w-4 h-4 rounded border-PowderBlueBorder accent-primary"
            />
            <span className="text-sm text-MidnightNavyText dark:text-white">
              {t("courses.featured") || "Featured"}
            </span>
          </label>
        </div>
      </div>

      {/* Curriculum Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">
              2
            </span>
            {t("courses.curriculum") || "Curriculum"}
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
              {form.curriculum.length} {t("courses.modules") || "modules"}
            </span>
          </h3>
          <button
            type="button"
            onClick={addModule}
            className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {t("courses.addModule") || "Add Module"}
          </button>
        </div>

        {/* Sessions System Info */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-900/50 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                {t("courses.sessionsSystemTitle") || "📚 Sessions System (3 Sessions for 6 Lessons)"}
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className={`p-2 rounded ${getSessionColor(1)}`}>
                  <div className="font-bold">Session 1</div>
                  <div>Lessons 1 & 2</div>
                </div>
                <div className={`p-2 rounded ${getSessionColor(2)}`}>
                  <div className="font-bold">Session 2</div>
                  <div>Lessons 3 & 4</div>
                </div>
                <div className={`p-2 rounded ${getSessionColor(3)}`}>
                  <div className="font-bold">Session 3</div>
                  <div>Lessons 5 & 6</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {form.curriculum.length === 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {t("courses.curriculumOptional") ||
                "Curriculum is optional. Add modules with lessons to structure your course content. Each module must have exactly 6 lessons organized in 3 sessions."}
            </p>
          </div>
        )}

        {/* Modules List */}
        <div className="space-y-3">
          {form.curriculum.map((module, moduleIndex) => {
            const isExpanded = expandedModules.has(moduleIndex);
            const moduleTitleError = errors[`module_${moduleIndex}_title`];
            const moduleLessonsError = errors[`module_${moduleIndex}_lessons`];

            return (
              <div
                key={moduleIndex}
                className="border border-PowderBlueBorder dark:border-dark_border rounded-lg overflow-hidden"
              >
                {/* Module Header */}
                <div
                  className="p-4 bg-gray-50 dark:bg-dark_input flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-dark_input/80 transition-colors"
                  onClick={() => toggleModule(moduleIndex)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-primary" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-SlateBlueText dark:text-darktext" />
                      )}
                      <div>
                        <h4 className="font-semibold text-MidnightNavyText dark:text-white">
                          {module.title ||
                            `${t("courses.module") || "Module"} ${
                              moduleIndex + 1
                            }`}
                        </h4>
                        <p className="text-xs text-SlateBlueText dark:text-darktext">
                          {module.lessons.length}{" "}
                          {t("courses.lessons") || "lessons"} • 3 {t("courses.sessions") || "sessions"}
                          {module.projects && module.projects.length > 0 && (
                            <span className="ml-2">
                              • {module.projects.length}{" "}
                              {t("courses.projects") || "projects"}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeModule(moduleIndex);
                    }}
                    className="p-2 text-SlateBlueText dark:text-darktext hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Module Content */}
                {isExpanded && (
                  <div className="p-4 space-y-4 border-t border-PowderBlueBorder dark:border-dark_border">
                    {/* Module Title */}
                    <div>
                      <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-1">
                        {t("courses.moduleTitle") || "Module Title"}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={module.title}
                        onChange={(e) =>
                          updateModule(moduleIndex, "title", e.target.value)
                        }
                        placeholder="e.g., HTML Basics"
                        className={`w-full px-3 py-2 rounded-lg border transition-colors bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white text-sm ${
                          moduleTitleError
                            ? "border-red-500 focus:ring-red-500/20"
                            : "border-PowderBlueBorder dark:border-dark_border focus:ring-primary/20"
                        } focus:outline-none focus:ring-4 focus:border-primary`}
                      />
                      {moduleTitleError && (
                        <p className="text-red-500 text-xs mt-1">
                          {moduleTitleError}
                        </p>
                      )}
                    </div>

                    {/* Module Description */}
                    <div>
                      <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-1">
                        {t("courses.description") || "Description"}
                      </label>
                      <textarea
                        value={module.description || ""}
                        onChange={(e) =>
                          updateModule(
                            moduleIndex,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Optional module description"
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary resize-none"
                      />
                    </div>

                    {/* Module Projects Section */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white">
                        {t("courses.moduleProjects") || "Module Projects"}
                      </label>
                      
                      {/* Projects List */}
                      {module.projects && module.projects.length > 0 && (
                        <div className="space-y-2 mb-2">
                          {module.projects.map((project, projectIndex) => (
                            <div
                              key={projectIndex}
                              className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg"
                            >
                              <span className="flex-1 text-sm text-MidnightNavyText dark:text-white">
                                {projectIndex + 1}. {project}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  removeProjectFromModule(moduleIndex, projectIndex)
                                }
                                className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Project Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newProjectInputs[moduleIndex] || ""}
                          onChange={(e) =>
                            setNewProjectInputs((prev) => ({
                              ...prev,
                              [moduleIndex]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addProjectToModule(moduleIndex);
                            }
                          }}
                          placeholder={t("courses.addProjectPlaceholder") || "Add a project for this module..."}
                          className="flex-1 px-3 py-2 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => addProjectToModule(moduleIndex)}
                          className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          {t("common.add") || "Add"}
                        </button>
                      </div>
                    </div>

                    {moduleLessonsError && (
                      <p className="text-red-500 text-xs flex items-center gap-1 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        <AlertCircle className="w-3 h-3" />
                        {moduleLessonsError}
                      </p>
                    )}

                    {/* Lessons Section */}
                    <div className="space-y-3 bg-gray-50 dark:bg-dark_input p-3 rounded-lg">
                      <p className="text-xs font-semibold text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                        {t("courses.lessons") || "Lessons"} ({module.lessons.length}/6)
                      </p>

                      {module.lessons.map((lesson, lessonIndex) => {
                        const lessonTitleError = errors[`module_${moduleIndex}_lesson_${lessonIndex}_title`];
                        const sessionNum = lesson.sessionNumber;

                        return (
                          <div
                            key={lessonIndex}
                            className="bg-white dark:bg-dark_border rounded p-3 space-y-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-semibold">
                                {lessonIndex + 1}
                              </span>
                              <input
                                type="text"
                                value={lesson.title}
                                onChange={(e) =>
                                  updateLesson(
                                    moduleIndex,
                                    lessonIndex,
                                    "title",
                                    e.target.value
                                  )
                                }
                                placeholder={`Lesson ${lessonIndex + 1} title`}
                                className={`flex-1 px-2 py-1 rounded border text-sm bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white ${
                                  lessonTitleError
                                    ? "border-red-500 focus:ring-red-500/20"
                                    : "border-PowderBlueBorder dark:border-dark_border focus:ring-primary/20"
                                } focus:outline-none focus:ring-4 focus:border-primary`}
                              />
                              <div className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${getSessionColor(sessionNum)}`}>
                                S{sessionNum}
                              </div>
                            </div>

                            {lessonTitleError && (
                              <p className="text-red-500 text-xs ml-8">
                                {lessonTitleError}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Instructors Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white flex items-center gap-2">
          <span className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">
            3
          </span>
          {t("courses.instructors") || "Instructors"}
        </h3>

        {instructorsLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-SlateBlueText dark:text-darktext">
              {t("common.loading") || "Loading instructors..."}
            </span>
          </div>
        ) : instructorsList.length === 0 ? (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {t("courses.noInstructors") || "No instructors available"}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {instructorsList.map((instructor) => (
              <label
                key={instructor._id}
                className="flex items-center gap-3 p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-IcyBreeze dark:hover:bg-dark_input transition-all cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={form.instructors.includes(instructor._id)}
                  onChange={() => toggleInstructor(instructor._id)}
                  className="w-4 h-4 text-primary focus:ring-primary border-PowderBlueBorder rounded"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-MidnightNavyText dark:text-white">
                    {instructor.name}
                  </p>
                  <p className="text-xs text-SlateBlueText dark:text-darktext">
                    {instructor.email}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}

        {form.instructors.length > 0 && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-xs font-medium text-primary">
              ✅ {form.instructors.length} {t("courses.instructorsSelected") || "instructor(s) selected"}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 rounded-lg border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-dark_input transition-colors font-semibold"
        >
          {t("common.cancel") || "Cancel"}
        </button>

        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              {t("common.saving") || "Saving..."}
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {t("common.save") || "Save Course"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}