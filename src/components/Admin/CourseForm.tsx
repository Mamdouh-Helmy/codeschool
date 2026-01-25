"use client";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Save,
  Trash2,
  AlertCircle,
  X,
  BookOpen,
  Eye,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import CurriculumManager from "./CurriculumManager";

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

interface Curriculum {
  _id: string;
  title: string;
  description?: string;
  level: "beginner" | "intermediate" | "advanced";
  modules: Module[];
  grade?: string;
  subject?: string;
  createdBy?: {
    name: string;
    email: string;
  };
  createdAt?: string;
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
  const [instructorsList, setInstructorsList] = useState<any[]>([]);
  const [instructorsLoading, setInstructorsLoading] = useState(true);

  // States for curriculum selection
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [curriculumsLoading, setCurriculumsLoading] = useState(true);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>("");
  const [selectedCurriculum, setSelectedCurriculum] = useState<Curriculum | null>(null);
  const [showCurriculumManager, setShowCurriculumManager] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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
      // If initial course has curriculum, try to find matching curriculum
      if (initial.curriculum && initial.curriculum.length > 0) {
        // We'll set this after loading curriculums
      }
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

  useEffect(() => {
    const fetchCurriculums = async () => {
      try {
        setCurriculumsLoading(true);
        const res = await fetch("/api/curriculum-course", { cache: "no-store" });
        const json = await res.json();
        if (json.success) {
          setCurriculums(json.data);

          // If editing and course has curriculum, try to find matching curriculum
          if (initial && initial.curriculum && initial.curriculum.length > 0) {
            // Find curriculum by matching first module title or level
            const matchedCurriculum = json.data.find((c: Curriculum) =>
              c.level === initial.level ||
              (c.modules && c.modules[0]?.title === initial.curriculum[0]?.title)
            );
            if (matchedCurriculum) {
              setSelectedCurriculumId(matchedCurriculum._id);
              setSelectedCurriculum(matchedCurriculum);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching curriculums:", err);
      } finally {
        setCurriculumsLoading(false);
      }
    };

    fetchCurriculums();
  }, [initial]);

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

  // Apply curriculum to course
  const applyCurriculum = (curriculumId: string) => {
    const curriculum = curriculums.find(c => c._id === curriculumId);
    if (!curriculum) return;

    setSelectedCurriculumId(curriculumId);
    setSelectedCurriculum(curriculum);

    // Update course level
    setForm(prev => ({ ...prev, level: curriculum.level }));

    // Map curriculum modules to course modules
    const mappedModules = curriculum.modules.map((module, index) => ({
      title: module.title,
      description: module.description || "",
      order: module.order || index + 1,
      lessons: module.lessons?.map((lesson) => ({
        title: lesson.title,
        description: lesson.description || "",
        order: lesson.order,
        sessionNumber: lesson.sessionNumber || calculateSessionNumber(lesson.order),
      })) || [],
      projects: module.projects || [],
      totalSessions: module.totalSessions || 3,
    }));

    setForm(prev => ({
      ...prev,
      curriculum: mappedModules,
    }));

    toast.success(t("courses.curriculumApplied") || `Curriculum applied: ${curriculum.title}`);
  };

  // Remove applied curriculum
  const removeCurriculum = () => {
    setSelectedCurriculumId("");
    setSelectedCurriculum(null);
    setForm(prev => ({
      ...prev,
      curriculum: [],
      level: "beginner", // Reset to default
    }));
    toast.success(t("courses.curriculumRemoved") || "Curriculum removed");
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

    // Check if curriculum is required
    if (!selectedCurriculumId && form.curriculum.length === 0) {
      newErrors.curriculum = t("courses.curriculumRequired") || "Please select a curriculum";
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
            className={`w-full px-4 py-2 rounded-lg border transition-colors bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${errors.title
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
            className={`w-full px-4 py-2 rounded-lg border transition-colors bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${errors.description
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

      {/* Curriculum Selection Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">
              2
            </span>
            {t("courses.selectCurriculum") || "Select Curriculum Template"}
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
              {form.curriculum.length} {t("courses.modules") || "modules"} {t("common.selected") || "selected"}
            </span>
          </h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                {t("courses.chooseCurriculum") || "Choose Curriculum Template"}
              </label>
              <select
                value={selectedCurriculumId}
                onChange={(e) => applyCurriculum(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary ${errors.curriculum
                    ? "border-red-500"
                    : "border-PowderBlueBorder dark:border-dark_border"
                  }`}
              >
                <option value="">-- {t("courses.selectCurriculumPlaceholder") || "Select a curriculum template"} --</option>
                {curriculumsLoading ? (
                  <option disabled>{t("common.loading") || "Loading curriculums..."}</option>
                ) : curriculums.map((curriculum) => (
                  <option key={curriculum._id} value={curriculum._id}>
                    {curriculum.title} ({curriculum.level}) {curriculum.grade ? `- ${t("courses.grade") || "Grade"} ${curriculum.grade}` : ''}
                  </option>
                ))}
              </select>
              {errors.curriculum && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.curriculum}
                </p>
              )}
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => setShowCurriculumManager(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors w-full justify-center"
              >
                <BookOpen className="w-4 h-4" />
                {t("courses.manageCurriculums") || "Manage Curriculums"}
              </button>

              {selectedCurriculum && (
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-600 rounded-lg hover:bg-blue-500/20 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  {t("common.preview") || "Preview"}
                </button>
              )}
            </div>
          </div>

          {selectedCurriculum && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-semibold text-green-800 dark:text-green-300">
                      {selectedCurriculum.title}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${selectedCurriculum.level === 'beginner' ? 'bg-green-100 text-green-800' :
                        selectedCurriculum.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                      }`}>
                      {selectedCurriculum.level}
                    </span>
                    {selectedCurriculum.grade && (
                      <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                        {t("courses.grade") || "Grade"} {selectedCurriculum.grade}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-1">
                    {selectedCurriculum.description}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {selectedCurriculum.modules?.length || 0} {t("courses.modules") || "modules"} • {selectedCurriculum.modules?.reduce((total, m) => total + (m.lessons?.length || 0), 0) || 0} {t("courses.lessons") || "lessons"}
                  </p>
                  {selectedCurriculum.createdBy && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {t("courses.createdBy") || "Created by"}: {selectedCurriculum.createdBy.name}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={removeCurriculum}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                  title={t("courses.removeCurriculum") || "Remove curriculum"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
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

      {/* Curriculum Manager Modal */}
      {showCurriculumManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-darkmode rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-PowderBlueBorder dark:border-dark_border">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-MidnightNavyText dark:text-white">
                  {t("courses.curriculumManager") || "Curriculum Manager"}
                </h3>
                <button
                  onClick={() => setShowCurriculumManager(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-dark_input rounded-lg"
                  title={t("common.close") || "Close"}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <CurriculumManager
                onSelect={(id) => {
                  applyCurriculum(id);
                  setShowCurriculumManager(false);
                }}
                selectedId={selectedCurriculumId}
                disableForm={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Curriculum Preview Modal */}
      {showPreview && selectedCurriculum && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-darkmode rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-PowderBlueBorder dark:border-dark_border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-MidnightNavyText dark:text-white">
                    {t("courses.curriculumPreview") || "Curriculum Preview"}
                  </h3>
                  <p className="text-sm text-SlateBlueText dark:text-darktext">
                    {selectedCurriculum.title}
                  </p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-dark_input rounded-lg"
                  title={t("common.close") || "Close"}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                    {t("courses.curriculumDetails") || "Curriculum Details"}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        {t("courses.level") || "Level"}
                      </p>
                      <p className="font-medium">{selectedCurriculum.level}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        {t("courses.grade") || "Grade"}
                      </p>
                      <p className="font-medium">{selectedCurriculum.grade || t("courses.notSpecified") || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        {t("courses.subject") || "Subject"}
                      </p>
                      <p className="font-medium">{selectedCurriculum.subject || t("courses.notSpecified") || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        {t("courses.modules") || "Modules"}
                      </p>
                      <p className="font-medium">{selectedCurriculum.modules?.length || 0}</p>
                    </div>
                  </div>
                  {selectedCurriculum.description && (
                    <div className="mt-4">
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        {t("courses.description") || "Description"}
                      </p>
                      <p className="text-sm mt-1">{selectedCurriculum.description}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-MidnightNavyText dark:text-white">
                    {t("courses.modules") || "Modules"} ({selectedCurriculum.modules?.length || 0})
                  </h4>
                  {selectedCurriculum.modules?.map((module, moduleIndex) => (
                    <div key={moduleIndex} className="border border-PowderBlueBorder dark:border-dark_border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h5 className="font-semibold text-MidnightNavyText dark:text-white">
                            {t("courses.module") || "Module"} {moduleIndex + 1}: {module.title}
                          </h5>
                          {module.description && (
                            <p className="text-sm text-SlateBlueText dark:text-darktext mt-1">
                              {module.description}
                            </p>
                          )}
                        </div>
                        <div className="text-sm text-SlateBlueText dark:text-darktext">
                          {module.lessons?.length || 0} {t("courses.lessons") || "lessons"} • 3 {t("courses.sessions") || "sessions"}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h6 className="text-sm font-semibold text-MidnightNavyText dark:text-white">
                          {t("courses.lessons") || "Lessons"}
                        </h6>
                        <div className="grid grid-cols-2 gap-2">
                          {module.lessons?.map((lesson, lessonIndex) => (
                            <div key={lessonIndex} className="p-2 bg-gray-50 dark:bg-dark_input rounded">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${getSessionColor(lesson.sessionNumber)}`}>
                                  {t("courses.sessionShort") || "S"}{lesson.sessionNumber}
                                </span>
                                <span className="text-sm font-medium">{lesson.title}</span>
                              </div>
                              {lesson.description && (
                                <p className="text-xs text-SlateBlueText dark:text-darktext mt-1">
                                  {lesson.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {module.projects && module.projects.length > 0 && (
                        <div className="mt-4">
                          <h6 className="text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                            {t("courses.projects") || "Projects"}
                          </h6>
                          <div className="space-y-1">
                            {module.projects.map((project, projectIndex) => (
                              <div key={projectIndex} className="flex items-center gap-2 p-2 bg-primary/5 rounded">
                                <span className="text-sm">{project}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-PowderBlueBorder dark:border-dark_border">
              <button
                onClick={() => setShowPreview(false)}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                {t("common.closePreview") || "Close Preview"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}