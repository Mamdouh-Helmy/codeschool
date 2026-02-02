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
    ArrowRight,
    ArrowLeft,
    Check,
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
    disableForm?: boolean;
}

// Step indicator component
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
    const steps = [
        { num: 1, label: "Basic Info" },
        { num: 2, label: "Modules" },
        { num: 3, label: "Review" },
        { num: 4, label: "Complete" }
    ];

    return (
        <div className="flex items-center justify-center gap-2">
            {steps.map((step, idx) => (
                <React.Fragment key={step.num}>
                    <div className="flex flex-col items-center">
                        <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                                step.num < currentStep
                                    ? "bg-green-500 text-white shadow-lg"
                                    : step.num === currentStep
                                    ? "bg-primary text-white ring-4 ring-primary/20 shadow-lg"
                                    : "bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                            }`}
                        >
                            {step.num < currentStep ? <Check className="w-6 h-6" /> : step.num}
                        </div>
                        <span className={`text-xs mt-2 font-semibold transition-colors ${
                            step.num === currentStep 
                                ? "text-primary dark:text-primary" 
                                : step.num < currentStep
                                ? "text-green-600 dark:text-green-400"
                                : "text-gray-500 dark:text-gray-500"
                        }`}>
                            {step.label}
                        </span>
                    </div>
                    {idx < steps.length - 1 && (
                        <div
                            className={`w-16 h-1 rounded-full transition-all mb-6 ${
                                step.num < currentStep
                                    ? "bg-green-500"
                                    : "bg-gray-200 dark:bg-gray-700"
                            }`}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

// Modal Component
const Modal = ({ 
    isOpen, 
    onClose, 
    children, 
    title 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    children: React.ReactNode;
    title: string;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-darklight rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-darklight border-b border-gray-200 dark:border-dark_border p-6 flex items-center justify-between rounded-t-2xl">
                    <h3 className="text-xl font-bold text-MidnightNavyText dark:text-white">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark_input rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default function CurriculumManager({
    onSelect,
    selectedId,
    disableForm = false,
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

    // Multi-step state
    const [currentStep, setCurrentStep] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentModuleIndex, setCurrentModuleIndex] = useState<number | null>(null);
    const [tempModule, setTempModule] = useState<Module | null>(null);
    const [moduleStep, setModuleStep] = useState(1); // 1: Info, 2: Lessons, 3: Sessions

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
            // Edit existing module
            setCurrentModuleIndex(moduleIndex);
            setTempModule({ ...form.modules[moduleIndex] });
        } else {
            // Create new module
            setCurrentModuleIndex(null);
            setTempModule({
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
            // Update existing module
            const updated = [...form.modules];
            updated[currentModuleIndex] = tempModule;
            setForm({ ...form, modules: updated });
            toast.success("Module updated successfully");
        } else {
            // Add new module
            setForm({ ...form, modules: [...form.modules, tempModule] });
            toast.success("Module added successfully");
        }

        setIsModalOpen(false);
        setTempModule(null);
        setCurrentModuleIndex(null);
    };

    const removeModule = (moduleIndex: number) => {
        if (!confirm("Are you sure you want to delete this module?")) return;
        setForm((prev) => ({
            ...prev,
            modules: prev.modules.filter((_, i) => i !== moduleIndex),
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
        updated[lessonIndex] = {
            ...updated[lessonIndex],
            [field]: value,
        };
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
            const items = typeof value === 'string'
                ? value.split('\n').filter(item => item.trim() !== '')
                : Array.isArray(value) ? value : [];
            updated[sessionIndex] = {
                ...updated[sessionIndex],
                [field]: items,
            };
        } else {
            updated[sessionIndex] = {
                ...updated[sessionIndex],
                [field]: value,
            };
        }

        setTempModule({ ...tempModule, sessions: updated });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.id) {
            toast.error("Please login to create curriculum");
            return;
        }

        if (!form.title.trim()) {
            toast.error("Title is required");
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
                    ? "Curriculum created successfully"
                    : "Curriculum updated successfully"
            );

            await loadCurriculums();
            setShowForm(false);
            setEditingCurriculum(null);
            setCurrentStep(1);
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
            toast.error("Failed to save curriculum");
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
                toast.success("Curriculum deleted successfully");
                await loadCurriculums();
            } else {
                toast.error("Failed to delete curriculum");
            }
        } catch (err) {
            console.error("Error deleting curriculum:", err);
            toast.error("Error deleting curriculum");
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

    // ========== CURRICULUM FORM VIEW ==========
    if (showForm) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-darkmode dark:via-darklight dark:to-darkmode py-8 px-4">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="bg-white dark:bg-darklight rounded-2xl shadow-lg p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-MidnightNavyText dark:text-white">
                                    {editingCurriculum ? "Edit Curriculum" : "Create New Curriculum"}
                                </h2>
                                <p className="text-sm text-SlateBlueText dark:text-darktext mt-1">
                                    Build your curriculum step by step
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingCurriculum(null);
                                    setCurrentStep(1);
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
                                className="px-4 py-2 border border-gray-300 dark:border-dark_border rounded-xl text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-dark_input transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                        <StepIndicator currentStep={currentStep} totalSteps={4} />
                    </div>

                    {/* Step 1: Basic Info */}
                    {currentStep === 1 && (
                        <div className="bg-white dark:bg-darklight rounded-2xl shadow-lg p-8">
                            <h3 className="text-xl font-bold text-MidnightNavyText dark:text-white mb-6">
                                Curriculum Basic Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                                        Curriculum Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        placeholder="e.g., Game Design I - Grade 2"
                                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                                        Level *
                                    </label>
                                    <select
                                        value={form.level}
                                        onChange={(e) => setForm({ ...form, level: e.target.value as any })}
                                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    >
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                                        Grade
                                    </label>
                                    <input
                                        type="text"
                                        value={form.grade}
                                        onChange={(e) => setForm({ ...form, grade: e.target.value })}
                                        placeholder="e.g., Grade 2"
                                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                                        Subject
                                    </label>
                                    <input
                                        type="text"
                                        value={form.subject}
                                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                        placeholder="e.g., Coding, Math, Science"
                                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                                        Duration
                                    </label>
                                    <input
                                        type="text"
                                        value={form.duration}
                                        onChange={(e) => setForm({ ...form, duration: e.target.value })}
                                        placeholder="e.g., 12 weeks, 6 months"
                                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Describe the curriculum overview, goals, and what students will learn..."
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end mt-8">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!form.title.trim()) {
                                            toast.error("Please enter a curriculum title");
                                            return;
                                        }
                                        setCurrentStep(2);
                                    }}
                                    className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl"
                                >
                                    Next: Manage Modules
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2, 3, 4: Modules Management */}
                    {currentStep >= 2 && (
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-darklight rounded-2xl shadow-lg p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-MidnightNavyText dark:text-white">
                                            Curriculum Modules
                                        </h3>
                                        <p className="text-sm text-SlateBlueText dark:text-darktext mt-1">
                                            {form.modules.length} module{form.modules.length !== 1 ? 's' : ''} added
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openModuleModal()}
                                        className="bg-primary/10 hover:bg-primary/20 text-primary px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Add Module
                                    </button>
                                </div>

                                {form.modules.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-dark_border rounded-xl bg-gray-50/50 dark:bg-dark_input/50">
                                        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                        <h4 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                            No modules yet
                                        </h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                                            Start building your curriculum by adding your first module
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => openModuleModal()}
                                            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 transition-all"
                                        >
                                            <Plus className="w-5 h-5" />
                                            Add Your First Module
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {form.modules.map((module, index) => (
                                            <div
                                                key={index}
                                                className="border-2 border-gray-200 dark:border-dark_border rounded-xl p-6 bg-gradient-to-br from-white to-gray-50/50 dark:from-darklight dark:to-dark_input/50 hover:shadow-md transition-all"
                                            >
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm font-bold">
                                                                Module {index + 1}
                                                            </span>
                                                            <h4 className="text-lg font-bold text-MidnightNavyText dark:text-white">
                                                                {module.title || "Untitled Module"}
                                                            </h4>
                                                        </div>
                                                        {module.description && (
                                                            <p className="text-sm text-SlateBlueText dark:text-darktext">
                                                                {module.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => openModuleModal(index)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                            title="Edit module"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeModule(index)}
                                                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            title="Delete module"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-4 border-t border-gray-200 dark:border-dark_border">
                                                    {module.lessons.map((lesson, lessonIndex) => (
                                                        <div
                                                            key={lessonIndex}
                                                            className="text-xs p-2 bg-white dark:bg-dark_input rounded-lg border border-gray-200 dark:border-dark_border"
                                                        >
                                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold mr-2 ${getSessionBadgeColor(lesson.sessionNumber)}`}>
                                                                S{lesson.sessionNumber}-L{lesson.order}
                                                            </span>
                                                            <span className="text-gray-700 dark:text-gray-300">
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

                            {/* Navigation Buttons */}
                            <div className="flex justify-between">
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(1)}
                                    className="border-2 border-gray-300 dark:border-dark_border text-gray-700 dark:text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-dark_input transition-all"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                    Back to Basic Info
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }}
                                    disabled={loading || form.modules.length === 0}
                                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            {editingCurriculum ? "Update Curriculum" : "Create Curriculum"}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
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
                    title={`Module ${currentModuleIndex !== null ? currentModuleIndex + 1 : form.modules.length + 1}: ${tempModule?.title || "Untitled"}`}
                >
                    {tempModule && (
                        <div className="space-y-6">
                            {/* Module Step Indicator */}
                            <div className="flex items-center justify-center gap-2 pb-6 border-b border-gray-200 dark:border-dark_border">
                                {[
                                    { num: 1, label: "Basic Info" },
                                    { num: 2, label: "Module" },
                                    { num: 3, label: "Lessons" },
                                    { num: 4, label: "Sessions" }
                                ].map((step, idx) => (
                                    <React.Fragment key={step.num}>
                                        <div className="flex flex-col items-center">
                                            <div
                                                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                                                    step.num < moduleStep
                                                        ? "bg-green-500 text-white"
                                                        : step.num === moduleStep
                                                        ? "bg-primary text-white ring-4 ring-primary/20"
                                                        : "bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                                                }`}
                                            >
                                                {step.num < moduleStep ? <Check className="w-5 h-5" /> : step.num}
                                            </div>
                                            <span className={`text-xs mt-1 font-medium transition-colors ${
                                                step.num === moduleStep 
                                                    ? "text-primary dark:text-primary" 
                                                    : "text-gray-600 dark:text-gray-400"
                                            }`}>
                                                {step.label}
                                            </span>
                                        </div>
                                        {idx < 3 && (
                                            <div
                                                className={`w-12 h-1 rounded-full transition-all ${
                                                    step.num < moduleStep
                                                        ? "bg-green-500"
                                                        : "bg-gray-200 dark:bg-gray-700"
                                                }`}
                                            />
                                        )}
                                    </React.Fragment>
                                ))}
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
                                            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all"
                                        >
                                            Next: Add Lessons
                                            <ArrowRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Module Step 2: Lessons */}
                            {moduleStep === 2 && (
                                <div className="space-y-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                                        <p className="text-sm text-blue-800 dark:text-blue-300">
                                            <strong>Structure:</strong> 6 lessons organized into 3 sessions (2 lessons per session)
                                        </p>
                                    </div>

                                    {[1, 2, 3].map((sessionNum) => (
                                        <div key={sessionNum} className={`border-2 rounded-xl p-4 ${getSessionColor(sessionNum)}`}>
                                            <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                                                <span className={`px-3 py-1 rounded-lg text-sm ${getSessionBadgeColor(sessionNum)}`}>
                                                    Session {sessionNum}
                                                </span>
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {tempModule.lessons
                                                    .filter(l => l.sessionNumber === sessionNum)
                                                    .map((lesson, idx) => {
                                                        const lessonIndex = tempModule.lessons.findIndex(
                                                            l => l.order === lesson.order
                                                        );
                                                        return (
                                                            <div key={idx} className="bg-white dark:bg-dark_input rounded-lg p-3 border border-gray-200 dark:border-dark_border">
                                                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                                    Lesson {lesson.order}
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={lesson.title}
                                                                    onChange={(e) => updateTempLesson(lessonIndex, "title", e.target.value)}
                                                                    placeholder={`Lesson ${lesson.order} title`}
                                                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark_border bg-white dark:bg-dark_input text-sm mb-2 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                                                />
                                                                <textarea
                                                                    value={lesson.description || ""}
                                                                    onChange={(e) => updateTempLesson(lessonIndex, "description", e.target.value)}
                                                                    placeholder="Lesson description..."
                                                                    rows={2}
                                                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark_border bg-white dark:bg-dark_input text-sm resize-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex justify-between pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setModuleStep(1)}
                                            className="border-2 border-gray-300 dark:border-dark_border text-gray-700 dark:text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-dark_input transition-all"
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setModuleStep(3)}
                                            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all"
                                        >
                                            Next: Add Sessions Details
                                            <ArrowRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Module Step 3: Sessions Details */}
                            {moduleStep === 3 && (
                                <div className="space-y-4">
                                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 mb-4">
                                        <p className="text-sm text-purple-800 dark:text-purple-300">
                                            Define objectives, outline, and resources for each session
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {tempModule.sessions.map((session, sessionIndex) => (
                                            <div key={sessionIndex} className={`border-2 rounded-xl p-4 ${getSessionColor(session.sessionNumber)}`}>
                                                <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                                    <span className={`px-3 py-1 rounded-lg text-sm ${getSessionBadgeColor(session.sessionNumber)}`}>
                                                        Session {session.sessionNumber}
                                                    </span>
                                                </h4>
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                            Session Objectives
                                                        </label>
                                                        <textarea
                                                            value={session.objectives?.join('\n') || ''}
                                                            onChange={(e) => updateTempSession(sessionIndex, "objectives", e.target.value)}
                                                            placeholder="Enter one objective per line..."
                                                            rows={3}
                                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark_border bg-white/80 dark:bg-dark_input text-sm resize-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                            Session Outline
                                                        </label>
                                                        <textarea
                                                            value={session.outline?.join('\n') || ''}
                                                            onChange={(e) => updateTempSession(sessionIndex, "outline", e.target.value)}
                                                            placeholder="Enter one outline item per line..."
                                                            rows={3}
                                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark_border bg-white/80 dark:bg-dark_input text-sm resize-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                            Presentation URL (Optional)
                                                        </label>
                                                        <input
                                                            type="url"
                                                            value={session.presentationUrl || ''}
                                                            onChange={(e) => updateTempSession(sessionIndex, "presentationUrl", e.target.value)}
                                                            placeholder="https://..."
                                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark_border bg-white/80 dark:bg-dark_input text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                            Session Projects
                                                        </label>
                                                        <textarea
                                                            value={session.projects?.join('\n') || ''}
                                                            onChange={(e) => updateTempSession(sessionIndex, "projects", e.target.value)}
                                                            placeholder="Enter one project per line..."
                                                            rows={2}
                                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark_border bg-white/80 dark:bg-dark_input text-sm resize-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-between pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setModuleStep(2)}
                                            className="border-2 border-gray-300 dark:border-dark_border text-gray-700 dark:text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-dark_input transition-all"
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={saveModule}
                                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl"
                                        >
                                            <Check className="w-5 h-5" />
                                            {currentModuleIndex !== null ? "Update Module" : "Add Module"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Modal>
            </div>
        );
    }

    // ========== CURRICULUM LIST VIEW ==========
    return (
        <div className="space-y-6 px-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-MidnightNavyText dark:text-white flex items-center gap-3">
                        <BookOpen className="w-7 h-7 text-primary" />
                        Curriculum Management
                    </h2>
                    <p className="text-sm text-SlateBlueText dark:text-darktext mt-1">
                        Create and manage curriculum templates for courses
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                    <Plus className="w-5 h-5" />
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
                    <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-dark_border rounded-2xl bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-darkmode dark:to-darklight">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-3">
                            No curriculums yet
                        </h3>
                        <p className="text-sm text-SlateBlueText dark:text-darktext mb-6">
                            Create your first curriculum template to get started
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowForm(true)}
                            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            Create Your First Curriculum
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {curriculums.map((curriculum, index) => (
                            <div
                                key={curriculum._id || index}
                                className="border-2 border-gray-200 dark:border-dark_border rounded-xl overflow-hidden hover:shadow-lg transition-all bg-white dark:bg-darklight"
                            >
                                <div
                                    className="p-4 bg-gradient-to-r from-gray-50 to-white dark:from-dark_input dark:to-darklight flex items-center justify-between cursor-pointer hover:from-gray-100 hover:to-gray-50 dark:hover:from-dark_input/80 dark:hover:to-darklight/80 transition-all"
                                    onClick={() => toggleCurriculum(index)}
                                >
                                    <div className="flex-1 flex items-center gap-4">
                                        {expandedCurriculums.has(index) ? (
                                            <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-SlateBlueText dark:text-darktext flex-shrink-0" />
                                        )}
                                        <div>
                                            <h4 className="font-semibold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                                {curriculum.title}
                                                {selectedId === curriculum._id && (
                                                    <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-lg font-semibold">
                                                        Selected
                                                    </span>
                                                )}
                                            </h4>
                                            <p className="text-xs text-SlateBlueText dark:text-darktext mt-1">
                                                {curriculum.level} • {curriculum.grade || "No grade"} • {curriculum.modules?.length || 0} modules
                                            </p>
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
                                                className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors font-semibold"
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
                                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDuplicate(curriculum);
                                            }}
                                            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                            title="Duplicate"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (curriculum._id) handleDelete(curriculum._id);
                                            }}
                                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {expandedCurriculums.has(index) && (
                                    <div className="p-6 border-t-2 border-gray-100 dark:border-dark_border bg-gradient-to-br from-gray-50/50 to-white dark:from-darkmode/50 dark:to-darklight">
                                        {curriculum.description && (
                                            <p className="text-sm text-SlateBlueText dark:text-darktext mb-4">
                                                {curriculum.description}
                                            </p>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Level</p>
                                                <p className="font-semibold text-blue-900 dark:text-blue-200 capitalize">{curriculum.level}</p>
                                            </div>
                                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                                <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">Grade</p>
                                                <p className="font-semibold text-green-900 dark:text-green-200">{curriculum.grade || "Not specified"}</p>
                                            </div>
                                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                                <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">Subject</p>
                                                <p className="font-semibold text-purple-900 dark:text-purple-200">{curriculum.subject || "Not specified"}</p>
                                            </div>
                                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                                <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-1">Duration</p>
                                                <p className="font-semibold text-orange-900 dark:text-orange-200">{curriculum.duration || "Not specified"}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h5 className="font-semibold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                                <BookOpen className="w-4 h-4 text-primary" />
                                                Modules ({curriculum.modules?.length || 0})
                                            </h5>
                                            {curriculum.modules?.map((module, moduleIndex) => (
                                                <div key={moduleIndex} className="p-4 border-2 border-gray-200 dark:border-dark_border rounded-xl bg-white dark:bg-darklight">
                                                    <h6 className="font-semibold text-MidnightNavyText dark:text-white mb-3 flex items-center gap-2">
                                                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm">
                                                            Module {moduleIndex + 1}
                                                        </span>
                                                        {module.title}
                                                    </h6>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                        {module.lessons?.map((lesson, lessonIndex) => (
                                                            <div key={lessonIndex} className="text-xs p-2 bg-gray-50 dark:bg-dark_input rounded-lg border border-gray-200 dark:border-dark_border">
                                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold mr-2 ${getSessionBadgeColor(lesson.sessionNumber)}`}>
                                                                    S{lesson.sessionNumber}-L{lesson.order}
                                                                </span>
                                                                <span className="text-gray-700 dark:text-gray-300">
                                                                    {lesson.title || `Lesson ${lesson.order}`}
                                                                </span>
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