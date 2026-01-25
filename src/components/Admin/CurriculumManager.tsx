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
    BookOpen,
    Download,
    Upload,
    Copy,
    Edit,
    Eye,
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

interface Curriculum {
    _id?: string;
    title: string;
    description?: string;
    slug?: string;
    modules: Module[];
    level: "beginner" | "intermediate" | "advanced";
    grade?: string;
    subject?: string;
    duration?: string;
    createdBy?: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
    createdAt?: string;
    updatedAt?: string;
}

interface CurriculumManagerProps {
    onSelect?: (curriculumId: string) => void;
    selectedId?: string;
    disableForm?: boolean; // إضافة prop جديد
}

export default function CurriculumManager({
    onSelect,
    selectedId,
    disableForm = false, // القيمة الافتراضية
}: CurriculumManagerProps) {
    const { t } = useI18n();
    const { user, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(false);
    const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
    const [expandedCurriculums, setExpandedCurriculums] = useState<Set<number>>(
        new Set()
    );
    const [showForm, setShowForm] = useState(false);
    const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(
        null
    );
    const [form, setForm] = useState<Curriculum>({
        title: "",
        description: "",
        level: "beginner",
        modules: [],
        grade: "",
        subject: "",
        duration: "",
    });

    // Load all curriculums
    useEffect(() => {
        loadCurriculums();
    }, []);

    const loadCurriculums = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/curriculum-course", { cache: "no-store" });
            const json = await res.json();
            if (json.success) {
                setCurriculums(json.data);
            }
        } catch (err) {
            console.error("Error loading curriculums:", err);
            toast.error(t("curriculum.failedToLoad") || "Failed to load curriculums");
        } finally {
            setLoading(false);
        }
    };

    const toggleCurriculum = (index: number) => {
        setExpandedCurriculums((prev) => {
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
            order: form.modules.length + 1,
            lessons: Array(6)
                .fill(null)
                .map((_, i) => ({
                    title: "",
                    description: "",
                    order: i + 1,
                    sessionNumber: calculateSessionNumber(i + 1),
                })),
            sessions: [
                {
                    sessionNumber: 1,
                    objectives: [],
                    outline: [],
                    projects: [],
                },
                {
                    sessionNumber: 2,
                    objectives: [],
                    outline: [],
                    projects: [],
                },
                {
                    sessionNumber: 3,
                    objectives: [],
                    outline: [],
                    projects: [],
                },
            ],
            projects: [],
            totalSessions: 3,
        };
        setForm((prev) => ({
            ...prev,
            modules: [...prev.modules, newModule],
        }));
    };

    const removeModule = (moduleIndex: number) => {
        setForm((prev) => ({
            ...prev,
            modules: prev.modules.filter((_, i) => i !== moduleIndex),
        }));
    };

    const updateModule = (
        moduleIndex: number,
        field: "title" | "description" | "order",
        value: string | number
    ) => {
        setForm((prev) => {
            const updated = [...prev.modules];
            updated[moduleIndex] = {
                ...updated[moduleIndex],
                [field]: value,
            };
            return { ...prev, modules: updated };
        });
    };

    const updateLesson = (
        moduleIndex: number,
        lessonIndex: number,
        field: "title" | "description",
        value: string
    ) => {
        setForm((prev) => {
            const updated = [...prev.modules];
            const currentLesson = updated[moduleIndex].lessons[lessonIndex];

            updated[moduleIndex].lessons[lessonIndex] = {
                ...currentLesson,
                [field]: value,
            };
            return { ...prev, modules: updated };
        });
    };

    const updateSession = (
        moduleIndex: number,
        sessionIndex: number,
        field: "objectives" | "outline" | "presentationUrl" | "projects",
        value: any
    ) => {
        setForm((prev) => {
            const updated = [...prev.modules];
            const currentSession = updated[moduleIndex].sessions[sessionIndex];

            if (field === "objectives" || field === "outline" || field === "projects") {
                // Handle array fields (split by newline)
                const items = typeof value === 'string'
                    ? value.split('\n').filter(item => item.trim() !== '')
                    : Array.isArray(value) ? value : [];

                updated[moduleIndex].sessions[sessionIndex] = {
                    ...currentSession,
                    [field]: items,
                };
            } else {
                // Handle string fields
                updated[moduleIndex].sessions[sessionIndex] = {
                    ...currentSession,
                    [field]: value,
                };
            }

            return { ...prev, modules: updated };
        });
    };

    const addProjectToModule = (moduleIndex: number, projectName: string) => {
        if (!projectName.trim()) {
            toast.error(t("curriculum.projectEmpty") || "Project name cannot be empty");
            return;
        }

        setForm((prev) => {
            const updated = [...prev.modules];
            updated[moduleIndex] = {
                ...updated[moduleIndex],
                projects: [...(updated[moduleIndex].projects || []), projectName.trim()],
            };
            return { ...prev, modules: updated };
        });
    };

    const removeProjectFromModule = (moduleIndex: number, projectIndex: number) => {
        setForm((prev) => {
            const updated = [...prev.modules];
            updated[moduleIndex] = {
                ...updated[moduleIndex],
                projects: updated[moduleIndex].projects.filter((_, i) => i !== projectIndex),
            };
            return { ...prev, modules: updated };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.id) {
            toast.error(t("curriculum.loginRequired") || "Please login to create curriculum");
            return;
        }

        if (!form.title.trim()) {
            toast.error(t("curriculum.titleRequired") || "Title is required");
            return;
        }

        setLoading(true);
        try {
            const method = editingCurriculum?._id ? "PUT" : "POST";
            const url = editingCurriculum?._id
                ? `/api/curriculum-course/${editingCurriculum._id}`
                : "/api/curriculum-course";

            const payload = {
                title: form.title,
                description: form.description,
                level: form.level,
                modules: form.modules.map(module => ({
                    ...module,
                    totalSessions: 3,
                    lessons: module.lessons.map(lesson => ({
                        ...lesson,
                        sessionNumber: calculateSessionNumber(lesson.order)
                    }))
                })),
                grade: form.grade,
                subject: form.subject,
                duration: form.duration,
                createdBy: editingCurriculum?.createdBy || {
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
                toast.error(json.error || json.message || "Failed to save curriculum");
                return;
            }

            toast.success(
                method === "POST"
                    ? t("curriculum.createdSuccess") || "Curriculum created successfully"
                    : t("curriculum.updatedSuccess") || "Curriculum updated successfully"
            );

            await loadCurriculums();
            setShowForm(false);
            setEditingCurriculum(null);
            setForm({
                title: "",
                description: "",
                level: "beginner",
                modules: [],
                grade: "",
                subject: "",
                duration: "",
            });
        } catch (err) {
            console.error("❌ Error saving curriculum:", err);
            toast.error(t("curriculum.saveFailed") || "Failed to save curriculum");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this curriculum?")) return;

        try {
            const res = await fetch(`/api/curriculum-course/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success(t("curriculum.deletedSuccess") || "Curriculum deleted successfully");
                await loadCurriculums();
            } else {
                toast.error(t("curriculum.deleteFailed") || "Failed to delete curriculum");
            }
        } catch (err) {
            console.error("Error deleting curriculum:", err);
            toast.error(t("curriculum.deleteError") || "Error deleting curriculum");
        }
    };

    const handleEdit = (curriculum: Curriculum) => {
        setEditingCurriculum(curriculum);
        setForm({
            title: curriculum.title,
            description: curriculum.description || "",
            level: curriculum.level,
            modules: curriculum.modules || [],
            grade: curriculum.grade || "",
            subject: curriculum.subject || "",
            duration: curriculum.duration || "",
        });
        setShowForm(true);
    };

    const handleDuplicate = (curriculum: Curriculum) => {
        setForm({
            title: `${curriculum.title} (Copy)`,
            description: curriculum.description || "",
            level: curriculum.level,
            modules: curriculum.modules || [],
            grade: curriculum.grade || "",
            subject: curriculum.subject || "",
            duration: curriculum.duration || "",
        });
        setEditingCurriculum(null);
        setShowForm(true);
    };

    const handleSelect = (curriculum: Curriculum) => {
        if (onSelect && curriculum._id) {
            onSelect(curriculum._id);
        }
    };

    if (authLoading) {
        return (
            <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (showForm) {
        // حل مشكلة النموذج داخل نموذج
        const FormComponent = disableForm ? 'div' : 'form';
        const formProps = disableForm ? {} : { onSubmit: handleSubmit };

        return (
            <div className="space-y-6 px-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-MidnightNavyText dark:text-white">
                        {editingCurriculum ? t("curriculum.editCurriculum") || "Edit Curriculum" : t("curriculum.createCurriculum") || "Create New Curriculum"}
                    </h2>
                    <button
                        type="button"
                        onClick={() => {
                            setShowForm(false);
                            setEditingCurriculum(null);
                            setForm({
                                title: "",
                                description: "",
                                level: "beginner",
                                modules: [],
                                grade: "",
                                subject: "",
                                duration: "",
                            });
                        }}
                        className="px-4 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-dark_input"
                    >
                        {t("common.cancel") || "Cancel"}
                    </button>
                </div>

                <FormComponent {...formProps} className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                                {t("curriculum.title") || "Curriculum Title"} *
                            </label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder="e.g., Game Design I - Grade 2"
                                className="w-full px-4 py-2 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                                {t("curriculum.level") || "Level"}
                            </label>
                            <select
                                value={form.level}
                                onChange={(e) => setForm({ ...form, level: e.target.value as any })}
                                className="w-full px-4 py-2 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
                            >
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                                {t("curriculum.grade") || "Grade"}
                            </label>
                            <input
                                type="text"
                                value={form.grade}
                                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                                placeholder="e.g., Grade 2"
                                className="w-full px-4 py-2 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                                {t("curriculum.subject") || "Subject"}
                            </label>
                            <input
                                type="text"
                                value={form.subject}
                                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                placeholder="e.g., Coding, Math, Science"
                                className="w-full px-4 py-2 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                                {t("curriculum.description") || "Description"}
                            </label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Curriculum description..."
                                rows={2}
                                className="w-full px-4 py-2 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Modules Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white">
                                {t("curriculum.modules") || "Modules"} ({form.modules.length})
                            </h3>
                            <button
                                type="button"
                                onClick={addModule}
                                className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20"
                            >
                                <Plus className="w-4 h-4" />
                                {t("curriculum.addModule") || "Add Module"}
                            </button>
                        </div>

                        {form.modules.map((module, moduleIndex) => (
                            <div key={moduleIndex} className="border border-PowderBlueBorder dark:border-dark_border rounded-lg p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-MidnightNavyText dark:text-white">
                                        Module {moduleIndex + 1}: {module.title || "Untitled"}
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => removeModule(moduleIndex)}
                                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                                        Module Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={module.title}
                                        onChange={(e) => updateModule(moduleIndex, "title", e.target.value)}
                                        placeholder="e.g., Introduction to Game Design"
                                        className="w-full px-3 py-2 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                                        Module Description
                                    </label>
                                    <textarea
                                        value={module.description || ""}
                                        onChange={(e) => updateModule(moduleIndex, "description", e.target.value)}
                                        placeholder="Module description..."
                                        rows={2}
                                        className="w-full px-3 py-2 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
                                    />
                                </div>

                                {/* Lessons */}
                                <div className="space-y-3">
                                    <h5 className="font-semibold text-MidnightNavyText dark:text-white">
                                        Lessons (6 lessons, 3 sessions)
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {module.lessons.map((lesson, lessonIndex) => (
                                            <div key={lessonIndex} className="border border-PowderBlueBorder dark:border-dark_border rounded p-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getSessionColor(lesson.sessionNumber)}`}>
                                                        S{lesson.sessionNumber} - L{lesson.order}
                                                    </span>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={lesson.title}
                                                    onChange={(e) => updateLesson(moduleIndex, lessonIndex, "title", e.target.value)}
                                                    placeholder={`Lesson ${lesson.order} title`}
                                                    className="w-full px-2 py-1 rounded border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white text-sm mb-2"
                                                />
                                                <textarea
                                                    value={lesson.description || ""}
                                                    onChange={(e) => updateLesson(moduleIndex, lessonIndex, "description", e.target.value)}
                                                    placeholder="Lesson description..."
                                                    rows={2}
                                                    className="w-full px-2 py-1 rounded border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white text-sm"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Sessions Details */}
                                <div className="space-y-4">
                                    <h5 className="font-semibold text-MidnightNavyText dark:text-white">
                                        Sessions Details
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {module.sessions.map((session, sessionIndex) => (
                                            <div key={sessionIndex} className={`border rounded-lg p-4 ${getSessionColor(session.sessionNumber)}`}>
                                                <h6 className="font-bold mb-3">Session {session.sessionNumber}</h6>

                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-xs font-semibold mb-1">Objectives</label>
                                                        <textarea
                                                            value={session.objectives?.join('\n') || ''}
                                                            onChange={(e) => updateSession(moduleIndex, sessionIndex, "objectives", e.target.value)}
                                                            placeholder="One objective per line"
                                                            rows={3}
                                                            className="w-full px-2 py-1 rounded border border-gray-300 bg-white/50 text-sm"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-semibold mb-1">Outline</label>
                                                        <textarea
                                                            value={session.outline?.join('\n') || ''}
                                                            onChange={(e) => updateSession(moduleIndex, sessionIndex, "outline", e.target.value)}
                                                            placeholder="One item per line"
                                                            rows={3}
                                                            className="w-full px-2 py-1 rounded border border-gray-300 bg-white/50 text-sm"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-semibold mb-1">Presentation URL</label>
                                                        <input
                                                            type="url"
                                                            value={session.presentationUrl || ''}
                                                            onChange={(e) => updateSession(moduleIndex, sessionIndex, "presentationUrl", e.target.value)}
                                                            placeholder="https://..."
                                                            className="w-full px-2 py-1 rounded border border-gray-300 bg-white/50 text-sm"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-semibold mb-1">Projects</label>
                                                        <textarea
                                                            value={session.projects?.join('\n') || ''}
                                                            onChange={(e) => updateSession(moduleIndex, sessionIndex, "projects", e.target.value)}
                                                            placeholder="One project per line"
                                                            rows={2}
                                                            className="w-full px-2 py-1 rounded border border-gray-300 bg-white/50 text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Module Projects */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white">
                                        Module Projects
                                    </label>
                                    <div className="space-y-2">
                                        {module.projects.map((project, projectIndex) => (
                                            <div key={projectIndex} className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
                                                <span className="flex-1 text-sm">{project}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeProjectFromModule(moduleIndex, projectIndex)}
                                                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            id={`project-input-${moduleIndex}`}
                                            placeholder="Add a project..."
                                            className="flex-1 px-3 py-2 rounded-lg border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-dark_input"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const input = e.target as HTMLInputElement;
                                                    addProjectToModule(moduleIndex, input.value);
                                                    input.value = '';
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const input = document.getElementById(`project-input-${moduleIndex}`) as HTMLInputElement;
                                                addProjectToModule(moduleIndex, input.value);
                                                input.value = '';
                                            }}
                                            className="px-3 py-2 bg-primary text-white rounded-lg"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
                        <button
                            type="button"
                            onClick={() => {
                                setShowForm(false);
                                setEditingCurriculum(null);
                            }}
                            className="flex-1 px-4 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type={disableForm ? "button" : "submit"}
                            onClick={disableForm ? (e) => {
                                e.preventDefault();
                                handleSubmit(e);
                            } : undefined}
                            disabled={loading}
                            className="flex-1 bg-primary text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    {editingCurriculum ? "Update Curriculum" : "Create Curriculum"}
                                </>
                            )}
                        </button>
                    </div>
                </FormComponent>
            </div>
        );
    }

    return (
        <div className="space-y-6 px-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-MidnightNavyText dark:text-white flex items-center gap-3">
                        <BookOpen className="w-7 h-7 text-primary" />
                        Curriculum Management
                    </h2>
                    <p className="text-sm text-SlateBlueText dark:text-darktext">
                        Create and manage curriculum templates for courses
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create New Curriculum
                </button>
            </div>

            {/* Curriculums List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center items-center p-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : curriculums.length === 0 ? (
                    <div className="text-center py-16 border border-PowderBlueBorder dark:border-dark_border rounded-xl">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-3">
                            No curriculums yet
                        </h3>
                        <p className="text-sm text-SlateBlueText dark:text-darktext mb-6">
                            Create your first curriculum template
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowForm(true)}
                            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto"
                        >
                            <Plus className="w-4 h-4" />
                            Create Your First Curriculum
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {curriculums.map((curriculum, index) => (
                            <div
                                key={curriculum._id || index}
                                className="border border-PowderBlueBorder dark:border-dark_border rounded-lg overflow-hidden"
                            >
                                <div
                                    className="p-4 bg-gray-50 dark:bg-dark_input flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-dark_input/80"
                                    onClick={() => toggleCurriculum(index)}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            {expandedCurriculums.has(index) ? (
                                                <ChevronUp className="w-5 h-5 text-primary" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-SlateBlueText dark:text-darktext" />
                                            )}
                                            <div>
                                                <h4 className="font-semibold text-MidnightNavyText dark:text-white">
                                                    {curriculum.title}
                                                    {selectedId === curriculum._id && (
                                                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                                            Selected
                                                        </span>
                                                    )}
                                                </h4>
                                                <p className="text-xs text-SlateBlueText dark:text-darktext">
                                                    {curriculum.level} • {curriculum.grade} • {curriculum.modules?.length || 0} modules
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {onSelect && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelect(curriculum);
                                                }}
                                                className="px-3 py-1 bg-primary text-white text-sm rounded-lg hover:bg-primary/90"
                                            >
                                                Select
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEdit(curriculum);
                                            }}
                                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDuplicate(curriculum);
                                            }}
                                            className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (curriculum._id) handleDelete(curriculum._id);
                                            }}
                                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {expandedCurriculums.has(index) && (
                                    <div className="p-4 border-t border-PowderBlueBorder dark:border-dark_border">
                                        <p className="text-sm text-SlateBlueText dark:text-darktext mb-4">
                                            {curriculum.description}
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Level</p>
                                                <p className="font-semibold">{curriculum.level}</p>
                                            </div>
                                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                                <p className="text-xs font-semibold text-green-700 dark:text-green-300">Grade</p>
                                                <p className="font-semibold">{curriculum.grade || "Not specified"}</p>
                                            </div>
                                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                                <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">Subject</p>
                                                <p className="font-semibold">{curriculum.subject || "Not specified"}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h5 className="font-semibold text-MidnightNavyText dark:text-white">
                                                Modules ({curriculum.modules?.length || 0})
                                            </h5>
                                            {curriculum.modules?.map((module, moduleIndex) => (
                                                <div key={moduleIndex} className="p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg">
                                                    <h6 className="font-semibold text-MidnightNavyText dark:text-white mb-2">
                                                        {module.title}
                                                    </h6>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                        {module.lessons?.map((lesson, lessonIndex) => (
                                                            <div key={lessonIndex} className="text-xs p-2 bg-gray-50 dark:bg-dark_input rounded">
                                                                <span className={`px-2 py-1 rounded mr-2 ${getSessionColor(lesson.sessionNumber)}`}>
                                                                    S{lesson.sessionNumber}
                                                                </span>
                                                                {lesson.title}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}