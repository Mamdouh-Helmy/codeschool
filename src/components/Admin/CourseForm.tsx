"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Save,
  Plus,
  Trash2,
  AlertCircle,
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  Edit,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

interface Lesson {
  title: string;
  description?: string;
  order: number;
  sessionNumber: number;
}

interface Session {
  sessionNumber: number;
  objectives: string[];
  outline: string[];
  presentationUrl?: string;
  projects: string[];
}

interface Module {
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
  sessions: Session[];
  projects: string[];
  totalSessions: number;
}

interface Course {
  _id?: string;
  title: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
  grade?: string;
  subject?: string;
  duration?: string;
  curriculum: Module[];
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

// Modal Component
const Modal = ({
  isOpen,
  onClose,
  children,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-darklight rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-darklight border-b border-gray-200 dark:border-dark_border p-4 sm:p-6 flex items-center justify-between rounded-t-xl sm:rounded-t-2xl z-10">
          <h3 className="text-lg sm:text-xl font-bold text-MidnightNavyText dark:text-white pr-8">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark_input rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
};

export default function CourseForm({ initial, onClose, onSaved }: CourseFormProps) {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<Course>({
    title: "",
    description: "",
    level: "beginner",
    grade: "",
    subject: "",
    duration: "",
    curriculum: [],
    price: 0,
    isActive: true,
    featured: false,
    thumbnail: "",
    ...initial,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentModuleIndex, setCurrentModuleIndex] = useState<number | null>(null);
  const [tempModule, setTempModule] = useState<Module | null>(null);
  const [moduleStep, setModuleStep] = useState(1);

  const calculateSessionNumber = (lessonOrder: number): number => {
    return Math.ceil(lessonOrder / 2);
  };

  const getSessionColor = (sessionNumber: number): string => {
    const colors = {
      1: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800",
      2: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
      3: "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800",
    };
    return colors[sessionNumber as keyof typeof colors] || colors[1];
  };

  const getSessionBadgeColor = (sessionNumber: number): string => {
    const colors = {
      1: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      2: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      3: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    };
    return colors[sessionNumber as keyof typeof colors] || colors[1];
  };

  const openModuleModal = (moduleIndex?: number) => {
    if (moduleIndex !== undefined) {
      setCurrentModuleIndex(moduleIndex);
      setTempModule({ ...form.curriculum[moduleIndex] });
    } else {
      setCurrentModuleIndex(null);
      setTempModule({
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
        sessions: [
          { sessionNumber: 1, objectives: [], outline: [], projects: [] },
          { sessionNumber: 2, objectives: [], outline: [], projects: [] },
          { sessionNumber: 3, objectives: [], outline: [], projects: [] },
        ],
        projects: [],
        totalSessions: 3,
      });
    }
    setModuleStep(1);
    setIsModalOpen(true);
  };

  const saveModule = () => {
    if (!tempModule) return;

    if (!tempModule.title.trim()) {
      toast.error("Module title is required");
      return;
    }

    if (currentModuleIndex !== null) {
      const updated = [...form.curriculum];
      updated[currentModuleIndex] = tempModule;
      setForm({ ...form, curriculum: updated });
      toast.success("Module updated successfully");
    } else {
      setForm({ ...form, curriculum: [...form.curriculum, tempModule] });
      toast.success("Module added successfully");
    }

    setIsModalOpen(false);
    setTempModule(null);
    setCurrentModuleIndex(null);
    setModuleStep(1);
  };

  const removeModule = (moduleIndex: number) => {
    if (!confirm("Are you sure you want to delete this module?")) return;
    setForm((prev) => ({
      ...prev,
      curriculum: prev.curriculum.filter((_, i) => i !== moduleIndex),
    }));
    toast.success("Module deleted");
  };

  const updateTempModule = (field: keyof Module, value: any) => {
    if (!tempModule) return;
    setTempModule({ ...tempModule, [field]: value });
  };

  const updateTempLesson = (
    lessonIndex: number,
    field: "title" | "description",
    value: string
  ) => {
    if (!tempModule) return;
    const updated = [...tempModule.lessons];
    updated[lessonIndex] = { ...updated[lessonIndex], [field]: value };
    setTempModule({ ...tempModule, lessons: updated });
  };

  const updateTempSession = (
    sessionIndex: number,
    field: "objectives" | "outline" | "presentationUrl" | "projects",
    value: any
  ) => {
    if (!tempModule) return;
    const updated = [...tempModule.sessions];

    if (field === "objectives" || field === "outline" || field === "projects") {
      const items =
        typeof value === "string"
          ? value.split("\n").filter((item) => item.trim() !== "")
          : Array.isArray(value)
          ? value
          : [];
      updated[sessionIndex] = { ...updated[sessionIndex], [field]: items };
    } else {
      updated[sessionIndex] = { ...updated[sessionIndex], [field]: value };
    }

    setTempModule({ ...tempModule, sessions: updated });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!form.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (form.curriculum.length === 0) {
      newErrors.curriculum = "Please add at least one module";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error("Please login to create a course");
      return;
    }

    if (!validateForm()) {
      toast.error("Please fix validation errors");
      return;
    }

    setLoading(true);
    try {
      const method = initial?._id ? "PUT" : "POST";
      const url = initial?._id ? `/api/courses/${initial._id}` : "/api/courses";

      const payload = {
        title: form.title,
        description: form.description,
        level: form.level,
        grade: form.grade,
        subject: form.subject,
        duration: form.duration,
        curriculum: form.curriculum.map((module) => ({
          ...module,
          totalSessions: 3,
          lessons: module.lessons.map((lesson) => ({
            ...lesson,
            sessionNumber: calculateSessionNumber(lesson.order),
          })),
        })),
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

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || json.message || "Failed to save course");
        return;
      }

      toast.success(
        method === "POST"
          ? "Course created successfully"
          : "Course updated successfully"
      );
      onSaved();
      onClose();
    } catch (err) {
      console.error("❌ Error saving course:", err);
      toast.error("Failed to save course");
    } finally {
      setLoading(false);
    }
  };

  const getModuleStepLabel = (step: number): string => {
    if (step === 1) return "Basic Info";
    if (step >= 2 && step <= 4) return `Session ${step - 1} Lessons`;
    if (step >= 5 && step <= 7) return `Session ${step - 4} Details`;
    return "";
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
      {/* Basic Info Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white flex items-center gap-2">
          <span className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">
            1
          </span>
          {t("courses.basicInfo") || "Basic Information"}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div className="md:col-span-2">
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
              placeholder="e.g., Game Design Fundamentals"
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
          <div className="md:col-span-2">
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

          {/* Level */}
          <div>
            <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
              {t("courses.level") || "Level"}
            </label>
            <select
              value={form.level}
              onChange={(e) =>
                setForm({
                  ...form,
                  level: e.target.value as "beginner" | "intermediate" | "advanced",
                })
              }
              className="w-full px-4 py-2 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Grade */}
          <div>
            <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
              {t("courses.grade") || "Grade"}
            </label>
            <input
              type="text"
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
              placeholder="e.g., Grade 2"
              className="w-full px-4 py-2 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
              {t("courses.subject") || "Subject"}
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="e.g., Coding, Math"
              className="w-full px-4 py-2 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
              {t("courses.duration") || "Duration"}
            </label>
            <input
              type="text"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              placeholder="e.g., 12 weeks"
              className="w-full px-4 py-2 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
              {t("courses.price") || "Price ($)"}
            </label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              min="0"
              step="0.01"
              className="w-full px-4 py-2 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Flags */}
          <div className="md:col-span-2 flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
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
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                className="w-4 h-4 rounded border-PowderBlueBorder accent-primary"
              />
              <span className="text-sm text-MidnightNavyText dark:text-white">
                {t("courses.featured") || "Featured"}
              </span>
            </label>
          </div>
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
            onClick={() => openModuleModal()}
            className="bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Module
          </button>
        </div>

        {errors.curriculum && (
          <p className="text-red-500 text-sm flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.curriculum}
          </p>
        )}

        {form.curriculum.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-dark_border rounded-xl bg-gray-50/50 dark:bg-dark_input/50">
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              No modules yet. Start building your curriculum.
            </p>
            <button
              type="button"
              onClick={() => openModuleModal()}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-semibold inline-flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Your First Module
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {form.curriculum.map((module, index) => (
              <div
                key={index}
                className="border-2 border-gray-200 dark:border-dark_border rounded-xl p-4 bg-white dark:bg-darklight hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-lg text-xs font-bold">
                        Module {index + 1}
                      </span>
                      <h4 className="text-base font-bold text-MidnightNavyText dark:text-white">
                        {module.title || "Untitled Module"}
                      </h4>
                    </div>
                    {module.description && (
                      <p className="text-xs text-SlateBlueText dark:text-darktext line-clamp-2">
                        {module.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openModuleModal(index)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeModule(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-3 border-t border-gray-200 dark:border-dark_border">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <div
                      key={lessonIndex}
                      className="text-xs p-2 bg-gray-50 dark:bg-dark_input rounded-lg border border-gray-200 dark:border-dark_border"
                    >
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold mr-1 ${getSessionBadgeColor(
                          lesson.sessionNumber
                        )}`}
                      >
                        S{lesson.sessionNumber}-L{lesson.order}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300 text-[10px]">
                        {lesson.title || `Lesson ${lesson.order}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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

      {/* Module Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTempModule(null);
          setCurrentModuleIndex(null);
          setModuleStep(1);
        }}
        title={`Module ${
          currentModuleIndex !== null ? currentModuleIndex + 1 : form.curriculum.length + 1
        }: ${tempModule?.title || "Untitled"}`}
      >
        {tempModule && (
          <div className="space-y-6">
            {/* Module Step Indicator */}
            <div className="pb-4 border-b border-gray-200 dark:border-dark_border overflow-x-auto">
              <div className="flex items-center justify-center gap-1 sm:gap-2 min-w-max px-2">
                {[1, 2, 3, 4, 5, 6, 7].map((step, idx) => (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-semibold text-xs transition-all ${
                          step < moduleStep
                            ? "bg-green-500 text-white"
                            : step === moduleStep
                            ? "bg-primary text-white ring-2 sm:ring-4 ring-primary/20"
                            : "bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                        }`}
                      >
                        {step < moduleStep ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : step}
                      </div>
                      <span
                        className={`text-[9px] sm:text-[10px] mt-1 font-medium transition-colors whitespace-nowrap ${
                          step === moduleStep
                            ? "text-primary dark:text-primary"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {getModuleStepLabel(step)}
                      </span>
                    </div>
                    {idx < 6 && (
                      <div
                        className={`w-4 sm:w-6 md:w-8 h-0.5 rounded-full transition-all mb-3 sm:mb-4 ${
                          step < moduleStep ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Module Step 1: Basic Info */}
            {moduleStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                    Module Title *
                  </label>
                  <input
                    type="text"
                    value={tempModule.title}
                    onChange={(e) => updateTempModule("title", e.target.value)}
                    placeholder="e.g., Introduction to Game Design"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                    Module Description
                  </label>
                  <textarea
                    value={tempModule.description || ""}
                    onChange={(e) => updateTempModule("description", e.target.value)}
                    placeholder="Describe what students will learn in this module..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (!tempModule.title.trim()) {
                        toast.error("Please enter a module title");
                        return;
                      }
                      setModuleStep(2);
                    }}
                    className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all"
                  >
                    Next: Add Lessons
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Module Steps 2-4: Session Lessons */}
            {moduleStep >= 2 && moduleStep <= 4 && (
              <div className="space-y-4">
                {(() => {
                  const sessionNum = moduleStep - 1;

                  return (
                    <>
                      <div className={`border-2 rounded-xl p-6 ${getSessionColor(sessionNum)}`}>
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-lg text-sm ${getSessionBadgeColor(sessionNum)}`}>
                            Session {sessionNum}
                          </span>
                          <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                            Add 2 lessons for this session
                          </span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {tempModule.lessons
                            .filter((l) => l.sessionNumber === sessionNum)
                            .map((lesson, idx) => {
                              const lessonIndex = tempModule.lessons.findIndex(
                                (l) => l.order === lesson.order
                              );
                              return (
                                <div
                                  key={idx}
                                  className="bg-white dark:bg-dark_input rounded-lg p-4 border-2 border-gray-200 dark:border-dark_border"
                                >
                                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                                    📚 Lesson {lesson.order}
                                  </label>
                                  <input
                                    type="text"
                                    value={lesson.title}
                                    onChange={(e) => updateTempLesson(lessonIndex, "title", e.target.value)}
                                    placeholder={`Lesson ${lesson.order} title`}
                                    className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 dark:border-dark_border bg-white dark:bg-dark_input text-sm mb-3 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                  />
                                  <textarea
                                    value={lesson.description || ""}
                                    onChange={(e) => updateTempLesson(lessonIndex, "description", e.target.value)}
                                    placeholder="Lesson description..."
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 dark:border-dark_border bg-white dark:bg-dark_input text-sm resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                  />
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      <div className="flex justify-between gap-3 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            if (moduleStep === 2) {
                              setModuleStep(1);
                            } else {
                              setModuleStep(moduleStep - 1);
                            }
                          }}
                          className="border-2 border-gray-300 dark:border-dark_border text-gray-700 dark:text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-dark_input transition-all"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Back
                        </button>

                        <button
                          type="button"
                          onClick={() => setModuleStep(moduleStep + 1)}
                          className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all"
                        >
                          {moduleStep === 4 ? "Next: Session 1 Details" : `Next: Session ${sessionNum + 1} Lessons`}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Module Steps 5-7: Session Details */}
            {moduleStep >= 5 && moduleStep <= 7 && (
              <div className="space-y-4">
                {(() => {
                  const sessionIndex = moduleStep - 5;
                  const session = tempModule.sessions[sessionIndex];
                  const sessionNum = session.sessionNumber;

                  return (
                    <>
                      <div className={`border-2 rounded-xl p-6 ${getSessionColor(sessionNum)}`}>
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-lg text-sm ${getSessionBadgeColor(sessionNum)}`}>
                            Session {sessionNum}
                          </span>
                          <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                            Configure session details
                          </span>
                        </h4>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Session Objectives
                            </label>
                            <textarea
                              value={session.objectives?.join("\n") || ""}
                              onChange={(e) => updateTempSession(sessionIndex, "objectives", e.target.value)}
                              placeholder="Enter one objective per line..."
                              rows={3}
                              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-dark_border bg-white dark:bg-dark_input text-sm resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Session Outline
                            </label>
                            <textarea
                              value={session.outline?.join("\n") || ""}
                              onChange={(e) => updateTempSession(sessionIndex, "outline", e.target.value)}
                              placeholder="Enter one outline item per line..."
                              rows={3}
                              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-dark_border bg-white dark:bg-dark_input text-sm resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Presentation URL (Optional)
                            </label>
                            <input
                              type="url"
                              value={session.presentationUrl || ""}
                              onChange={(e) => updateTempSession(sessionIndex, "presentationUrl", e.target.value)}
                              placeholder="https://..."
                              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-dark_border bg-white dark:bg-dark_input text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Session Projects
                            </label>
                            <textarea
                              value={session.projects?.join("\n") || ""}
                              onChange={(e) => updateTempSession(sessionIndex, "projects", e.target.value)}
                              placeholder="Enter one project per line..."
                              rows={2}
                              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-dark_border bg-white dark:bg-dark_input text-sm resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between gap-3 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            if (moduleStep === 5) {
                              setModuleStep(4);
                            } else {
                              setModuleStep(moduleStep - 1);
                            }
                          }}
                          className="border-2 border-gray-300 dark:border-dark_border text-gray-700 dark:text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-dark_input transition-all"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Back
                        </button>

                        {moduleStep < 7 ? (
                          <button
                            type="button"
                            onClick={() => setModuleStep(moduleStep + 1)}
                            className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all"
                          >
                            Next: Session {sessionNum + 1} Details
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={saveModule}
                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl"
                          >
                            <Check className="w-4 h-4" />
                            {currentModuleIndex !== null ? "Update Module" : "Add Module"}
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </Modal>
    </form>
  );
}