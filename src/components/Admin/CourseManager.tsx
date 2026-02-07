"use client";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import RichTextEditor from "@/components/Blog/RichTextEditor";
import {
    Save,
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    X,
    BookOpen,
    Copy,
    Edit,
    Eye,
    ArrowRight,
    ArrowLeft,
    Check,
    Calendar,
    Users,
    Target,
    Presentation,
    FileText,
    Globe,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

interface Lesson {
    title: string;
    description?: string;
    order: number;
    sessionNumber: number;
    duration?: string;
}

interface Session {
    sessionNumber: number;
    presentationUrl?: string;
}

interface Module {
    title: string;
    description?: string;
    order: number;
    lessons: Lesson[];
    sessions: Session[];
    projects: string[];
    blogBodyAr?: string;  // ✅ FLAT STRUCTURE
    blogBodyEn?: string;  // ✅ FLAT STRUCTURE
    blogCreatedAt?: Date;
    blogUpdatedAt?: Date;
    totalSessions: number;
}

interface Course {
    _id?: string;
    title: string;
    description?: string;
    slug?: string;
    curriculum: Module[];
    level: "beginner" | "intermediate" | "advanced";
    grade?: string;
    subject?: string;
    duration?: string;
    isActive: boolean;
    featured: boolean;
    thumbnail?: string;
    createdBy?: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
    createdAt?: string;
    updatedAt?: string;
}

interface CourseManagerProps {
    onSelect?: (courseId: string) => void;
    selectedId?: string;
}

// Step indicator component
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
    const steps = [
        { num: 1, label: "Basic Info" },
        { num: 2, label: "Curriculum" },
        { num: 3, label: "Review" },
        { num: 4, label: "Complete" }
    ];

    return (
        <div className="w-full overflow-x-auto pb-2">
            <div className="flex items-center justify-center gap-1 sm:gap-2 min-w-max px-4">
                {steps.map((step, idx) => (
                    <React.Fragment key={step.num}>
                        <div className="flex flex-col items-center">
                            <div
                                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all ${step.num < currentStep
                                    ? "bg-green-500 text-white shadow-lg"
                                    : step.num === currentStep
                                        ? "bg-primary text-white ring-2 sm:ring-4 ring-primary/20 shadow-lg"
                                        : "bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                                    }`}
                            >
                                {step.num < currentStep ? <Check className="w-5 h-5 sm:w-6 sm:h-6" /> : step.num}
                            </div>
                            <span className={`text-[10px] sm:text-xs mt-1 sm:mt-2 font-semibold transition-colors whitespace-nowrap ${step.num === currentStep
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
                                className={`w-8 sm:w-12 md:w-16 h-0.5 sm:h-1 rounded-full transition-all mb-4 sm:mb-6 ${step.num < currentStep
                                    ? "bg-green-500"
                                    : "bg-gray-200 dark:bg-gray-700"
                                    }`}
                            />
                        )}
                    </React.Fragment>
                ))}
            </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-darklight rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
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
                <div className="p-4 sm:p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default function CourseManager({
    onSelect,
    selectedId,
}: CourseManagerProps) {
    const { t } = useI18n();
    const { user, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState<Course[]>([]);
    const [expandedCourses, setExpandedCourses] = useState<Set<number>>(new Set());
    const [showForm, setShowForm] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);

    const [form, setForm] = useState<Course>({
        title: "",
        description: "",
        level: "beginner",
        curriculum: [],
        grade: "",
        subject: "",
        duration: "",
        isActive: true,
        featured: false,
        thumbnail: "",
    });

    // Multi-step state
    const [currentStep, setCurrentStep] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentModuleIndex, setCurrentModuleIndex] = useState<number | null>(null);
    const [tempModule, setTempModule] = useState<Module | null>(null);
    const [moduleStep, setModuleStep] = useState(1);

    // State لإدارة المشاريع في المودول
    const [newModuleProject, setNewModuleProject] = useState("");

    // State لتخزين بيانات الجلسات المؤقتة (مع Presentation)
    const [sessionLessonsData, setSessionLessonsData] = useState<{
        [key: number]: {
            title: string;
            description: string;
            presentationUrl: string;
        }
    }>({
        1: { title: "", description: "", presentationUrl: "" },
        2: { title: "", description: "", presentationUrl: "" },
        3: { title: "", description: "", presentationUrl: "" },
    });

    // Load all courses
    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/courses", { cache: "no-store" });
            const json = await res.json();
            if (json.success) {
                setCourses(json.data);
            }
        } catch (err) {
            console.error("Error loading courses:", err);
            toast.error("Failed to load courses");
        } finally {
            setLoading(false);
        }
    };

    // Functions لإدارة المشاريع في المودول
    const addModuleProject = () => {
        if (!tempModule) return;
        if (!newModuleProject.trim()) {
            toast.error("Please enter a project name");
            return;
        }

        setTempModule({
            ...tempModule,
            projects: [...tempModule.projects, newModuleProject.trim()]
        });
        setNewModuleProject("");
        toast.success("Project added to module");
    };

    const removeModuleProject = (index: number) => {
        if (!tempModule) return;
        const updatedProjects = tempModule.projects.filter((_, i) => i !== index);
        setTempModule({ ...tempModule, projects: updatedProjects });
        toast.success("Project removed from module");
    };

    const toggleCourse = (index: number) => {
        setExpandedCourses((prev) => {
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

    const getLevelBadgeColor = (level: string): string => {
        const colors = {
            beginner: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
            intermediate: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
            advanced: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
        };
        return colors[level as keyof typeof colors] || colors.beginner;
    };

    const openModuleModal = (moduleIndex?: number) => {
        if (moduleIndex !== undefined) {
            // Edit existing module
            setCurrentModuleIndex(moduleIndex);
            const existingModule = form.curriculum[moduleIndex];

            setTempModule({
                ...existingModule,
                blogBodyAr: existingModule.blogBodyAr || "",
                blogBodyEn: existingModule.blogBodyEn || "",
            });

            // استرجاع بيانات الجلسات من الدروس والـ sessions الموجودة
            const newSessionData: any = {
                1: { title: "", description: "", presentationUrl: "" },
                2: { title: "", description: "", presentationUrl: "" },
                3: { title: "", description: "", presentationUrl: "" },
            };

            if (existingModule.lessons && Array.isArray(existingModule.lessons)) {
                existingModule.lessons.forEach(lesson => {
                    if (lesson.sessionNumber >= 1 && lesson.sessionNumber <= 3) {
                        newSessionData[lesson.sessionNumber] = {
                            title: lesson.title,
                            description: lesson.description || "",
                            presentationUrl: newSessionData[lesson.sessionNumber].presentationUrl
                        };
                    }
                });
            }

            if (existingModule.sessions && Array.isArray(existingModule.sessions)) {
                existingModule.sessions.forEach(session => {
                    if (session.sessionNumber >= 1 && session.sessionNumber <= 3) {
                        newSessionData[session.sessionNumber].presentationUrl = session.presentationUrl || "";
                    }
                });
            }

            setSessionLessonsData(newSessionData);
        } else {
            // Create new module
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
                        duration: "45 mins",
                    })),
                sessions: [
                    {
                        sessionNumber: 1,
                        presentationUrl: "",
                    },
                    {
                        sessionNumber: 2,
                        presentationUrl: "",
                    },
                    {
                        sessionNumber: 3,
                        presentationUrl: "",
                    },
                ],
                projects: [],
                blogBodyAr: "",
                blogBodyEn: "",
                blogCreatedAt: new Date(),
                blogUpdatedAt: new Date(),
                totalSessions: 3,
            });

            // إعادة تعيين بيانات الجلسات
            setSessionLessonsData({
                1: { title: "", description: "", presentationUrl: "" },
                2: { title: "", description: "", presentationUrl: "" },
                3: { title: "", description: "", presentationUrl: "" },
            });
        }
        setModuleStep(1);
        setIsModalOpen(true);
        setNewModuleProject("");
    };

    const saveModule = () => {
        if (!tempModule) return;

        if (!tempModule.title.trim()) {
            toast.error("Module title is required");
            return;
        }

        // التحقق من أن جميع الجلسات لها عنوان
        for (let i = 1; i <= 3; i++) {
            if (!sessionLessonsData[i].title.trim()) {
                toast.error(`Session ${i} lessons title is required`);
                return;
            }
        }

        // تحديث الدروس بناءً على بيانات الجلسات
        const updatedLessons = tempModule.lessons.map(lesson => ({
            ...lesson,
            title: sessionLessonsData[lesson.sessionNumber].title,
            description: sessionLessonsData[lesson.sessionNumber].description,
        }));

        // تحديث الـ sessions بناءً على presentation URLs
        const updatedSessions = tempModule.sessions.map(session => ({
            sessionNumber: session.sessionNumber,
            presentationUrl: sessionLessonsData[session.sessionNumber].presentationUrl,
        }));

        // ✅ FIXED: Use flat blog structure
        const updatedModule = {
            ...tempModule,
            lessons: updatedLessons,
            sessions: updatedSessions,
            blogBodyAr: tempModule.blogBodyAr || "",
            blogBodyEn: tempModule.blogBodyEn || "",
            blogUpdatedAt: new Date(),
        };

        console.log("💾 Saving module with blog data:", {
            title: updatedModule.title,
            blogBodyAr: updatedModule.blogBodyAr?.substring(0, 100),
            blogBodyEn: updatedModule.blogBodyEn?.substring(0, 100),
        });

        if (currentModuleIndex !== null) {
            // Update existing module
            const updated = [...form.curriculum];
            updated[currentModuleIndex] = updatedModule;
            setForm({ ...form, curriculum: updated });
            toast.success("Module updated successfully");
        } else {
            // Add new module
            setForm({ ...form, curriculum: [...form.curriculum, updatedModule] });
            toast.success("Module added successfully");
        }

        setIsModalOpen(false);
        setTempModule(null);
        setCurrentModuleIndex(null);
        setModuleStep(1);
        setNewModuleProject("");
        setSessionLessonsData({
            1: { title: "", description: "", presentationUrl: "" },
            2: { title: "", description: "", presentationUrl: "" },
            3: { title: "", description: "", presentationUrl: "" },
        });
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

    const updateSessionLessonsData = (sessionNumber: number, field: 'title' | 'description' | 'presentationUrl', value: string) => {
        setSessionLessonsData(prev => ({
            ...prev,
            [sessionNumber]: {
                ...prev[sessionNumber],
                [field]: value
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.id) {
            toast.error("Please login to create course");
            return;
        }

        if (!form.title.trim()) {
            toast.error("Title is required");
            return;
        }

        setLoading(true);
        try {
            const method = editingCourse?._id ? "PUT" : "POST";
            const url = editingCourse?._id
                ? `/api/courses/${editingCourse._id}`
                : "/api/courses";

            // ✅ FIXED: Send data with flat blog structure
            const payload = {
                title: form.title,
                description: form.description || "",
                level: form.level,
                curriculum: form.curriculum.map(module => ({
                    title: module.title,
                    description: module.description || "",
                    order: module.order,
                    totalSessions: 3,
                    lessons: module.lessons.map(lesson => ({
                        title: lesson.title,
                        description: lesson.description || "",
                        order: lesson.order,
                        sessionNumber: calculateSessionNumber(lesson.order),
                        duration: lesson.duration || "45 mins",
                    })),
                    sessions: module.sessions || [
                        { sessionNumber: 1, presentationUrl: "" },
                        { sessionNumber: 2, presentationUrl: "" },
                        { sessionNumber: 3, presentationUrl: "" }
                    ],
                    projects: module.projects || [],
                    // ✅ Send blog as nested object (API will flatten it)
                    blog: {
                        bodyAr: module.blogBodyAr || "",
                        bodyEn: module.blogBodyEn || "",
                        createdAt: module.blogCreatedAt || new Date(),
                        updatedAt: new Date(),
                    }
                })),
                grade: form.grade,
                subject: form.subject,
                duration: form.duration,
                isActive: form.isActive,
                featured: form.featured,
                thumbnail: form.thumbnail,
                createdBy: editingCourse?.createdBy || {
                    id: user.id,
                    name: user.name || "Admin",
                    email: user.email || "",
                    role: user.role || "admin",
                },
            };

            console.log("📤 Full payload to send:", JSON.stringify(payload, null, 2));

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            if (!res.ok) {
                console.error("❌ API Error Response:", json);
                toast.error(json.error || json.message || "Failed to save course");
                return;
            }

            console.log("✅ API Success Response:", json);

            toast.success(
                method === "POST"
                    ? "Course created successfully"
                    : "Course updated successfully"
            );

            await loadCourses();
            setShowForm(false);
            setEditingCourse(null);
            setCurrentStep(1);
            setForm({
                title: "",
                description: "",
                level: "beginner",
                curriculum: [],
                grade: "",
                subject: "",
                duration: "",
                isActive: true,
                featured: false,
                thumbnail: "",
            });
        } catch (err) {
            console.error("❌ Error saving course:", err);
            toast.error("Failed to save course");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this course?")) return;

        try {
            const res = await fetch(`/api/courses/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("Course deleted successfully");
                await loadCourses();
            } else {
                toast.error("Failed to delete course");
            }
        } catch (err) {
            console.error("Error deleting course:", err);
            toast.error("Error deleting course");
        }
    };

    const handleEdit = (course: Course) => {
        setEditingCourse(course);
        setForm({
            title: course.title,
            description: course.description || "",
            level: course.level,
            curriculum: course.curriculum || [],
            grade: course.grade || "",
            subject: course.subject || "",
            duration: course.duration || "",
            isActive: course.isActive !== false,
            featured: course.featured || false,
            thumbnail: course.thumbnail || "",
        });
        setShowForm(true);
    };

    const handleDuplicate = (course: Course) => {
        setForm({
            title: `${course.title} (Copy)`,
            description: course.description || "",
            level: course.level,
            curriculum: course.curriculum || [],
            grade: course.grade || "",
            subject: course.subject || "",
            duration: course.duration || "",
            isActive: true,
            featured: false,
            thumbnail: course.thumbnail || "",
        });
        setEditingCourse(null);
        setShowForm(true);
    };

    const handleSelect = (course: Course) => {
        if (onSelect && course._id) {
            onSelect(course._id);
        }
    };

    const getModuleStepLabel = (step: number): string => {
        if (step === 1) return "Basic Info";
        if (step === 2) return "Session 1";
        if (step === 3) return "Session 2";
        if (step === 4) return "Session 3";
        if (step === 5) return "Blog Content";
        return "";
    };

    if (authLoading) {
        return (
            <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // ========== COURSE FORM VIEW ==========
    if (showForm) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-darkmode dark:via-darklight dark:to-darkmode py-8 px-4">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="bg-white dark:bg-darklight rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-MidnightNavyText dark:text-white">
                                    {editingCourse ? "Edit Course" : "Create New Course"}
                                </h2>
                                <p className="text-xs sm:text-sm text-SlateBlueText dark:text-darktext mt-1">
                                    Build your course step by step
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingCourse(null);
                                    setCurrentStep(1);
                                    setForm({
                                        title: "",
                                        description: "",
                                        level: "beginner",
                                        curriculum: [],
                                        grade: "",
                                        subject: "",
                                        duration: "",
                                        isActive: true,
                                        featured: false,
                                        thumbnail: "",
                                    });
                                }}
                                className="px-4 py-2 border border-gray-300 dark:border-dark_border rounded-xl text-sm sm:text-base text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-dark_input transition-colors w-full sm:w-auto"
                            >
                                Cancel
                            </button>
                        </div>
                        <StepIndicator currentStep={currentStep} totalSteps={4} />
                    </div>

                    {/* Step 1: Basic Info */}
                    {currentStep === 1 && (
                        <div className="bg-white dark:bg-darklight rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
                            <h3 className="text-lg sm:text-xl font-bold text-MidnightNavyText dark:text-white mb-4 sm:mb-6">
                                Course Basic Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                                        Course Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        placeholder="e.g., Web Development Fundamentals"
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 border-gray-200 dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm sm:text-base"
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
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 border-gray-200 dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm sm:text-base"
                                    >
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
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
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 border-gray-200 dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm sm:text-base"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                                        Grade
                                    </label>
                                    <input
                                        type="text"
                                        value={form.grade}
                                        onChange={(e) => setForm({ ...form, grade: e.target.value })}
                                        placeholder="e.g., Grade 10"
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 border-gray-200 dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm sm:text-base"
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
                                        placeholder="e.g., Computer Science"
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 border-gray-200 dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm sm:text-base"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={form.description || ""}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Describe the course overview, goals, and what students will learn..."
                                        rows={5}
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 border-gray-200 dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm sm:text-base resize-none"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                        Provide a brief overview of the course content and learning objectives
                                    </p>
                                </div>

                                <div className="md:col-span-2 flex gap-4">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={form.isActive}
                                            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                            className="w-4 h-4 rounded"
                                        />
                                        <span className="text-sm">Active</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={form.featured}
                                            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                                            className="w-4 h-4 rounded"
                                        />
                                        <span className="text-sm">Featured</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end mt-6 sm:mt-8">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!form.title.trim()) {
                                            toast.error("Please enter a course title");
                                            return;
                                        }
                                        setCurrentStep(2);
                                    }}
                                    className="bg-primary hover:bg-primary/90 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base w-full sm:w-auto justify-center"
                                >
                                    Next: Manage Curriculum
                                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Curriculum Management */}
                    {currentStep >= 2 && (
                        <div className="space-y-4 sm:space-y-6">
                            <div className="bg-white dark:bg-darklight rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-bold text-MidnightNavyText dark:text-white">
                                            Course Curriculum
                                        </h3>
                                        <p className="text-xs sm:text-sm text-SlateBlueText dark:text-darktext mt-1">
                                            {form.curriculum.length} module{form.curriculum.length !== 1 ? 's' : ''} added
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openModuleModal()}
                                        className="bg-primary/10 hover:bg-primary/20 text-primary px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-sm sm:text-base w-full sm:w-auto"
                                    >
                                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                                        Add Module
                                    </button>
                                </div>

                                {form.curriculum.length === 0 ? (
                                    <div className="text-center py-8 sm:py-12 border-2 border-dashed border-gray-300 dark:border-dark_border rounded-xl bg-gray-50/50 dark:bg-dark_input/50">
                                        <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3" />
                                        <h4 className="text-base sm:text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                            No modules yet
                                        </h4>
                                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 mb-4 px-4">
                                            Start building your course by adding your first module
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => openModuleModal()}
                                            className="bg-primary hover:bg-primary/90 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold inline-flex items-center gap-2 transition-all text-sm sm:text-base"
                                        >
                                            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                                            Add Your First Module
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                        {form.curriculum.map((module, index) => (
                                            <div
                                                key={index}
                                                className="border-2 border-gray-200 dark:border-dark_border rounded-xl p-4 sm:p-6 bg-gradient-to-br from-white to-gray-50/50 dark:from-darklight dark:to-dark_input/50 hover:shadow-md transition-all"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                                                            <span className="bg-primary/10 text-primary px-2.5 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-bold flex-shrink-0">
                                                                Module {index + 1}
                                                            </span>
                                                            <h4 className="text-base sm:text-lg font-bold text-MidnightNavyText dark:text-white break-words">
                                                                {module.title || "Untitled Module"}
                                                            </h4>
                                                        </div>
                                                        {module.description && (
                                                            <p className="text-xs sm:text-sm text-SlateBlueText dark:text-darktext line-clamp-2 mb-2">
                                                                {module.description}
                                                            </p>
                                                        )}
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {module.projects && module.projects.length > 0 && (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {module.projects.map((project, idx) => (
                                                                        <span key={idx} className="bg-primary/5 text-primary px-2 py-0.5 rounded text-xs flex items-center gap-1">
                                                                            <Target className="w-3 h-3" />
                                                                            {project}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {(module.blogBodyAr || module.blogBodyEn) && (
                                                                <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                                                                    <FileText className="w-3 h-3" />
                                                                    Blog Available
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
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

                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-3 sm:pt-4 border-t border-gray-200 dark:border-dark_border">
                                                    {module.lessons && module.lessons.map((lesson, lessonIndex) => (
                                                        <div
                                                            key={lessonIndex}
                                                            className="text-xs p-2 bg-white dark:bg-dark_input rounded-lg border border-gray-200 dark:border-dark_border"
                                                        >
                                                            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold mr-1 sm:mr-2 ${getSessionBadgeColor(lesson.sessionNumber)}`}>
                                                                S{lesson.sessionNumber}-L{lesson.order}
                                                            </span>
                                                            <span className="text-gray-700 dark:text-gray-300 text-[10px] sm:text-xs break-words">
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
                            <div className="flex flex-col sm:flex-row justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(1)}
                                    className="border-2 border-gray-300 dark:border-dark_border text-gray-700 dark:text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-dark_input transition-all text-sm sm:text-base order-2 sm:order-1"
                                >
                                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                                    Back to Basic Info
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }}
                                    disabled={loading || form.curriculum.length === 0}
                                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed text-sm sm:text-base order-1 sm:order-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                                            {editingCourse ? "Update Course" : "Create Course"}
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
                        setNewModuleProject("");
                        setSessionLessonsData({
                            1: { title: "", description: "", presentationUrl: "" },
                            2: { title: "", description: "", presentationUrl: "" },
                            3: { title: "", description: "", presentationUrl: "" },
                        });
                    }}
                    title={`Module ${currentModuleIndex !== null ? currentModuleIndex + 1 : form.curriculum.length + 1}: ${tempModule?.title || "Untitled"}`}
                >
                    {tempModule && (
                        <div className="space-y-6">
                            {/* Module Step Indicator */}
                            <div className="pb-4 sm:pb-6 border-b border-gray-200 dark:border-dark_border overflow-x-auto">
                                <div className="flex items-center justify-center gap-1 sm:gap-2 min-w-max px-2">
                                    {[1, 2, 3, 4, 5].map((step, idx) => (
                                        <React.Fragment key={step}>
                                            <div className="flex flex-col items-center">
                                                <div
                                                    className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-semibold text-xs transition-all ${step < moduleStep
                                                        ? "bg-green-500 text-white"
                                                        : step === moduleStep
                                                            ? "bg-primary text-white ring-2 sm:ring-4 ring-primary/20"
                                                            : "bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                                                        }`}
                                                >
                                                    {step < moduleStep ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : step}
                                                </div>
                                                <span className={`text-[9px] sm:text-[10px] mt-1 font-medium transition-colors whitespace-nowrap ${step === moduleStep
                                                    ? "text-primary dark:text-primary"
                                                    : "text-gray-600 dark:text-gray-400"
                                                    }`}>
                                                    {getModuleStepLabel(step)}
                                                </span>
                                            </div>
                                            {idx < 4 && (
                                                <div
                                                    className={`w-4 sm:w-6 md:w-8 h-0.5 rounded-full transition-all mb-3 sm:mb-4 ${step < moduleStep
                                                        ? "bg-green-500"
                                                        : "bg-gray-200 dark:bg-gray-700"
                                                        }`}
                                                />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>

                            {/* Module Step 1: Basic Info + Projects */}
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
                                            placeholder="e.g., Introduction to Web Development"
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

                                    {/* Module Projects Section */}
                                    <div>
                                        <label className="block text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                                            Module Projects
                                        </label>
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newModuleProject}
                                                    onChange={(e) => setNewModuleProject(e.target.value)}
                                                    placeholder="Enter project name..."
                                                    className="flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 border-gray-200 dark:border-dark_border bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm sm:text-base"
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            addModuleProject();
                                                        }
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={addModuleProject}
                                                    className="bg-primary hover:bg-primary/90 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold flex items-center gap-2 transition-all"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    Add
                                                </button>
                                            </div>

                                            {tempModule.projects.length > 0 && (
                                                <div className="border-2 border-gray-200 dark:border-dark_border rounded-xl p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-semibold text-MidnightNavyText dark:text-white">
                                                            Added Projects ({tempModule.projects.length})
                                                        </span>
                                                        {tempModule.projects.length > 0 && (
                                                            <span className="text-xs text-gray-500">
                                                                Click on a project to remove it
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {tempModule.projects.map((project, index) => (
                                                            <div
                                                                key={index}
                                                                onClick={() => removeModuleProject(index)}
                                                                className="group cursor-pointer bg-primary/10 hover:bg-primary/20 text-primary px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center gap-2 transition-all hover:scale-105"
                                                            >
                                                                <Target className="w-3 h-3 sm:w-4 sm:h-4" />
                                                                <span className="text-xs sm:text-sm font-medium">{project}</span>
                                                                <X className="w-3 h-3 sm:w-4 sm:h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
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
                                            className="bg-primary hover:bg-primary/90 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-sm sm:text-base w-full sm:w-auto"
                                        >
                                            Next: Session 1
                                            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Module Steps 2-4: Individual Sessions */}
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
                                                            Configure lessons for Session {sessionNum}
                                                        </span>
                                                    </h4>

                                                    <div className="space-y-4 bg-white dark:bg-dark_input rounded-lg p-4 border-2 border-gray-200 dark:border-dark_border">
                                                        <div>
                                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                                                                📚 Lessons Title (for both Lesson {sessionNum * 2 - 1} & Lesson {sessionNum * 2})
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={sessionLessonsData[sessionNum].title}
                                                                onChange={(e) => updateSessionLessonsData(sessionNum, 'title', e.target.value)}
                                                                placeholder={`Enter title for Session ${sessionNum} lessons`}
                                                                className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 dark:border-dark_border bg-white dark:bg-dark_input text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                                                                📝 Lessons Description (for both Lesson {sessionNum * 2 - 1} & Lesson {sessionNum * 2})
                                                            </label>
                                                            <textarea
                                                                value={sessionLessonsData[sessionNum].description}
                                                                onChange={(e) => updateSessionLessonsData(sessionNum, 'description', e.target.value)}
                                                                placeholder={`Enter description for Session ${sessionNum} lessons`}
                                                                rows={3}
                                                                className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 dark:border-dark_border bg-white dark:bg-dark_input text-sm resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                                                <Presentation className="w-4 h-4" />
                                                                Presentation URL (Optional)
                                                            </label>
                                                            <input
                                                                type="url"
                                                                value={sessionLessonsData[sessionNum].presentationUrl}
                                                                onChange={(e) => updateSessionLessonsData(sessionNum, 'presentationUrl', e.target.value)}
                                                                placeholder="https://..."
                                                                className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-300 dark:border-dark_border bg-white dark:bg-dark_input text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                            />
                                                        </div>

                                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-4">
                                                            <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                                                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                                <span>
                                                                    This title and description will be used for <strong>both Lesson {sessionNum * 2 - 1}</strong> and <strong>Lesson {sessionNum * 2}</strong> in Session {sessionNum}.
                                                                </span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (moduleStep === 2) {
                                                                setModuleStep(1);
                                                            } else {
                                                                setModuleStep(moduleStep - 1);
                                                            }
                                                        }}
                                                        className="border-2 border-gray-300 dark:border-dark_border text-gray-700 dark:text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-dark_input transition-all text-sm sm:text-base order-2 sm:order-1"
                                                    >
                                                        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                                                        Back
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!sessionLessonsData[sessionNum].title.trim()) {
                                                                toast.error(`Please enter a title for Session ${sessionNum} lessons`);
                                                                return;
                                                            }
                                                            setModuleStep(moduleStep + 1);
                                                        }}
                                                        className="bg-primary hover:bg-primary/90 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-sm sm:text-base order-1 sm:order-2"
                                                    >
                                                        {moduleStep === 4 ? 'Next: Blog Content' : `Next: Session ${sessionNum + 1}`}
                                                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    </button>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Module Step 5: Blog Content */}
                            {moduleStep === 5 && (
                                <div className="space-y-6">
                                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                        <h4 className="text-lg font-bold text-MidnightNavyText dark:text-white flex items-center gap-2 mb-2">
                                            <FileText className="w-5 h-5 text-primary" />
                                            Module Blog Content
                                        </h4>
                                        <p className="text-sm text-SlateBlueText dark:text-darktext">
                                            Add optional blog content in both Arabic and English for this module. This content will be available to students as supplementary learning material.
                                        </p>
                                    </div>

                                    {/* Arabic Blog Content */}
                                    <div>
                                        <label className="block text-sm font-bold text-MidnightNavyText dark:text-white mb-3 flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-primary" />
                                            Arabic Blog Content (محتوى المدونة بالعربية)
                                        </label>
                                        <div className="border-2 border-gray-200 dark:border-dark_border rounded-xl overflow-hidden">
                                            <RichTextEditor
                                                value={tempModule.blogBodyAr || ""}
                                                onChange={(value) => {
                                                    if (!tempModule) return;
                                                    console.log("📝 Updating Arabic blog:", value.substring(0, 100));
                                                    setTempModule({
                                                        ...tempModule,
                                                        blogBodyAr: value,
                                                        blogUpdatedAt: new Date(),
                                                    });
                                                }}
                                                placeholder="أدخل محتوى المدونة باللغة العربية... يمكنك استخدام التنسيق الغني، الصور، الجداول، والمزيد"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                            Use the rich text editor to format your content with headings, lists, images, and more
                                        </p>
                                    </div>

                                    {/* English Blog Content */}
                                    <div>
                                        <label className="block text-sm font-bold text-MidnightNavyText dark:text-white mb-3 flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-primary" />
                                            English Blog Content
                                        </label>
                                        <div className="border-2 border-gray-200 dark:border-dark_border rounded-xl overflow-hidden">
                                            <RichTextEditor
                                                value={tempModule.blogBodyEn || ""}
                                                onChange={(value) => {
                                                    if (!tempModule) return;
                                                    console.log("📝 Updating English blog:", value.substring(0, 100));
                                                    setTempModule({
                                                        ...tempModule,
                                                        blogBodyEn: value,
                                                        blogUpdatedAt: new Date(),
                                                    });
                                                }}
                                                placeholder="Enter blog content in English... You can use rich formatting, images, tables, and more"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                            استخدم المحرر النصي لتنسيق المحتوى بالعناوين، القوائم، الصور، والمزيد
                                        </p>
                                    </div>

                                    {/* Info Box */}
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                        <p className="text-sm text-yellow-800 dark:text-yellow-300 flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                            <span>
                                                <strong>Note:</strong> Blog content is optional. You can leave it empty and add it later by editing the module. At least one language version is recommended for better student experience.
                                            </span>
                                        </p>
                                    </div>

                                    {/* Navigation */}
                                    <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setModuleStep(4)}
                                            className="border-2 border-gray-300 dark:border-dark_border text-gray-700 dark:text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-dark_input transition-all text-sm sm:text-base order-2 sm:order-1"
                                        >
                                            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                                            Back to Session 3
                                        </button>

                                        <button
                                            type="button"
                                            onClick={saveModule}
                                            className="bg-green-600 hover:bg-green-700 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base order-1 sm:order-2"
                                        >
                                            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                                            {currentModuleIndex !== null ? "Update Module" : "Save Module"}
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

    // ========== COURSE LIST VIEW ==========
    return (
        <div className="space-y-4 sm:space-y-6 px-2 sm:px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-MidnightNavyText dark:text-white flex items-center gap-2 sm:gap-3">
                        <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                        Course Management
                    </h2>
                    <p className="text-xs sm:text-sm text-SlateBlueText dark:text-darktext mt-1">
                        Create and manage courses with built-in curriculum
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="bg-primary hover:bg-primary/90 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all text-sm sm:text-base w-full sm:w-auto"
                >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    Create New Course
                </button>
            </div>

            {/* Courses List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center items-center p-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : courses.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-dark_border rounded-2xl bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-darkmode dark:to-darklight">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-3">
                            No courses yet
                        </h3>
                        <p className="text-sm text-SlateBlueText dark:text-darktext mb-6">
                            Create your first course to get started
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowForm(true)}
                            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            Create Your First Course
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {courses.map((course, index) => (
                            <div
                                key={course._id || index}
                                className="border-2 border-gray-200 dark:border-dark_border rounded-xl overflow-hidden hover:shadow-lg transition-all bg-white dark:bg-darklight"
                            >
                                <div
                                    className="p-4 bg-gradient-to-r from-gray-50 to-white dark:from-dark_input dark:to-darklight flex items-center justify-between cursor-pointer hover:from-gray-100 hover:to-gray-50 dark:hover:from-dark_input/80 dark:hover:to-darklight/80 transition-all"
                                    onClick={() => toggleCourse(index)}
                                >
                                    <div className="flex-1 flex items-center gap-4">
                                        {expandedCourses.has(index) ? (
                                            <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-SlateBlueText dark:text-darktext flex-shrink-0" />
                                        )}
                                        <div>
                                            <h4 className="font-semibold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                                {course.title}
                                                {course.featured && (
                                                    <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-1 rounded-lg font-semibold">
                                                        Featured
                                                    </span>
                                                )}
                                                {selectedId === course._id && (
                                                    <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-lg font-semibold">
                                                        Selected
                                                    </span>
                                                )}
                                            </h4>
                                            <p className="text-xs text-SlateBlueText dark:text-darktext mt-1">
                                                <span className={`px-2 py-0.5 rounded text-xs ${getLevelBadgeColor(course.level)}`}>
                                                    {course.level}
                                                </span>
                                                <span className="mx-2">•</span>
                                                {course.curriculum?.length || 0} modules
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {onSelect && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelect(course);
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
                                                handleEdit(course);
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
                                                handleDuplicate(course);
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
                                                if (course._id) handleDelete(course._id);
                                            }}
                                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {expandedCourses.has(index) && (
                                    <div className="p-6 border-t-2 border-gray-100 dark:border-dark_border bg-gradient-to-br from-gray-50/50 to-white dark:from-darkmode/50 dark:to-darklight">
                                        {course.description && (
                                            <div className="mb-4">
                                                <h5 className="font-semibold text-MidnightNavyText dark:text-white mb-2">Description:</h5>
                                                <p className="text-sm text-SlateBlueText dark:text-darktext whitespace-pre-wrap">
                                                    {course.description}
                                                </p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Level</p>
                                                <p className="font-semibold text-blue-900 dark:text-blue-200 capitalize">{course.level}</p>
                                            </div>
                                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                                <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">Modules</p>
                                                <p className="font-semibold text-purple-900 dark:text-purple-200">{course.curriculum?.length || 0} modules</p>
                                            </div>
                                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                                <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-1">Status</p>
                                                <p className={`font-semibold ${course.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                                    {course.isActive ? 'Active' : 'Inactive'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h5 className="font-semibold text-MidnightNavyText dark:text-white flex items-center gap-2">
                                                <BookOpen className="w-4 h-4 text-primary" />
                                                Curriculum ({course.curriculum?.length || 0} modules)
                                            </h5>
                                            {course.curriculum?.map((module, moduleIndex) => (
                                                <div key={moduleIndex} className="p-4 border-2 border-gray-200 dark:border-dark_border rounded-xl bg-white dark:bg-darklight">
                                                    <h6 className="font-semibold text-MidnightNavyText dark:text-white mb-3 flex items-center gap-2">
                                                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm">
                                                            Module {moduleIndex + 1}
                                                        </span>
                                                        {module.title}
                                                    </h6>

                                                    {module.description && (
                                                        <p className="text-sm text-SlateBlueText dark:text-darktext mb-3">
                                                            {module.description}
                                                        </p>
                                                    )}

                                                    {module.projects && module.projects.length > 0 && (
                                                        <div className="mb-3 p-3 bg-gray-50 dark:bg-dark_input rounded-lg">
                                                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                                                                <Target className="w-3 h-3" />
                                                                Module Projects:
                                                            </p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {module.projects.map((project, projectIdx) => (
                                                                    <span key={projectIdx} className="bg-primary/10 text-primary px-2 py-1 rounded text-xs flex items-center gap-1">
                                                                        <Target className="w-3 h-3" />
                                                                        {project}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {(module.blogBodyAr || module.blogBodyEn) && (
                                                        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-1">
                                                                <FileText className="w-3 h-3" />
                                                                Blog Content Available:
                                                            </p>
                                                            <div className="flex gap-2">
                                                                {module.blogBodyAr && (
                                                                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded text-xs flex items-center gap-1">
                                                                        <Globe className="w-3 h-3" />
                                                                        Arabic ({module.blogBodyAr.length} chars)
                                                                    </span>
                                                                )}
                                                                {module.blogBodyEn && (
                                                                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded text-xs flex items-center gap-1">
                                                                        <Globe className="w-3 h-3" />
                                                                        English ({module.blogBodyEn.length} chars)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {module.sessions && module.sessions.length > 0 && (
                                                        <div className="mb-3 p-3 bg-gray-50 dark:bg-dark_input rounded-lg">
                                                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                                                📊 Session Presentations:
                                                            </p>
                                                            <div className="space-y-1">
                                                                {module.sessions.map((session, sessionIdx) => (
                                                                    session.presentationUrl && (
                                                                        <div key={sessionIdx} className="text-xs flex items-center gap-2">
                                                                            <Presentation className="w-3 h-3 text-primary" />
                                                                            <span className="font-medium">Session {session.sessionNumber}:</span>
                                                                            <a
                                                                                href={session.presentationUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-primary hover:underline truncate max-w-xs"
                                                                            >
                                                                                {session.presentationUrl}
                                                                            </a>
                                                                        </div>
                                                                    )
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

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