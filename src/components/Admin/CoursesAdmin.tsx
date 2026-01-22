// components/Admin/CoursesAdmin.tsx
"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
    BookOpen,
    Plus,
    Edit,
    Trash2,
    Users,
    DollarSign,
    Star,
    CheckCircle,
    Calendar,
    Clock,
    Edit3,
    Package,
    Zap,
    BarChart,
} from "lucide-react";
import Modal from "./Modal";
import CourseForm from "./CourseForm";
import { useI18n } from "@/i18n/I18nProvider";

interface Lesson {
    title: string;
    description?: string;
    order: number;
    sessionNumber: number;
}

interface Module {
    title: string;
    description?: string;
    order: number;
    lessons: Lesson[];
    projects: string[];
    totalSessions: number;
}

interface Course {
    _id: string;
    title: string;
    slug: string;
    description: string;
    level: "beginner" | "intermediate" | "advanced";
    curriculum: Module[];
    projects: string[];
    instructors: any[];
    price: number;
    isActive: boolean;
    featured: boolean;
    thumbnail?: string;
    createdBy: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
    createdAt: string;
    updatedAt: string;
}

export default function CoursesAdmin() {
    const { t } = useI18n();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Course | null>(null);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 7) {
            if (diffDays === 0) {
                return t("common.today") || "Today";
            } else if (diffDays === 1) {
                return t("common.yesterday") || "Yesterday";
            } else {
                return `${diffDays} ${t("common.daysAgo") || "days ago"}`;
            }
        }

        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

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

    const getLevelBadge = (level: string) => {
        const badges = {
            beginner: {
                bg: "bg-green-100 dark:bg-green-900/20",
                text: "text-green-700 dark:text-green-400",
                label: t("courses.beginner") || "Beginner",
            },
            intermediate: {
                bg: "bg-yellow-100 dark:bg-yellow-900/20",
                text: "text-yellow-700 dark:text-yellow-400",
                label: t("courses.intermediate") || "Intermediate",
            },
            advanced: {
                bg: "bg-red-100 dark:bg-red-900/20",
                text: "text-red-700 dark:text-red-400",
                label: t("courses.advanced") || "Advanced",
            },
        };
        return badges[level as keyof typeof badges] || badges.beginner;
    };

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
            toast.error(t("courses.failedToLoad") || "Failed to load courses");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCourses();
    }, []);

    const onSaved = async () => {
        await loadCourses();
        toast.success(t("courses.savedSuccess") || "Course saved successfully");
    };

    const onEdit = (course: Course) => {
        setEditing(course);
        setOpen(true);
    };

    const onDelete = async (id: string) => {
        const deleteConfirm =
            t("courses.deleteConfirm") ||
            "Are you sure you want to delete this course?";
        const deleteWarning =
            t("courses.deleteWarning") || "This action cannot be undone.";
        const cancelText = t("common.cancel") || "Cancel";
        const deleteText = t("common.delete") || "Delete";
        const deletedSuccess =
            t("courses.deletedSuccess") || "Course deleted successfully";
        const deleteFailed =
            t("courses.deleteFailed") || "Failed to delete the course";
        const deleteError = t("courses.deleteError") || "Error deleting course";

        toast(
            (toastInstance) => (
                <div className="w-404 max-w-full bg-white dark:bg-darkmode text-MidnightNavyText dark:text-white rounded-14 shadow-round-box border-none outline-none dark:border-dark_border p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600 font-bold">
                            !
                        </div>
                        <div className="flex-1">
                            <p className="text-16 font-semibold">{deleteConfirm}</p>
                            <p className="text-14 mt-1 text-slate-500 dark:text-darktext">
                                {deleteWarning}
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            className="px-3 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded-14 text-15 hover:opacity-90 border border-PeriwinkleBorder/50"
                            onClick={() => toast.dismiss(toastInstance.id)}
                        >
                            {cancelText}
                        </button>
                        <button
                            className="px-3 py-1 bg-red-600 text-white rounded-14 text-15 hover:bg-red-700 shadow-sm"
                            onClick={async () => {
                                toast.dismiss(toastInstance.id);
                                try {
                                    const res = await fetch(
                                        `/api/courses/${encodeURIComponent(id)}`,
                                        {
                                            method: "DELETE",
                                        }
                                    );
                                    if (res.ok) {
                                        setCourses((prev) => prev.filter((c) => c._id !== id));
                                        toast.success(deletedSuccess);
                                    } else {
                                        toast.error(deleteFailed);
                                    }
                                } catch (err) {
                                    console.error("Error deleting course:", err);
                                    toast.error(deleteError);
                                }
                            }}
                        >
                            {deleteText}
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
                            <BookOpen className="w-7 h-7 text-primary" />
                            {t("courses.management") || "Courses Management"}
                        </h1>
                        <p className="text-sm text-SlateBlueText dark:text-darktext max-w-2xl">
                            {t("courses.managementDescription") ||
                                "Manage your courses, curriculum, instructors, and pricing."}
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
                        {t("courses.addNew") || "Add New Course"}
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                                {t("courses.totalCourses") || "Total Courses"}
                            </p>
                            <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                                {courses.length}
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
                                {t("courses.activeCourses") || "Active Courses"}
                            </p>
                            <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                                {courses.filter((c) => c.isActive).length}
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
                                {t("courses.featuredCourses") || "Featured Courses"}
                            </p>
                            <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                                {courses.filter((c) => c.featured).length}
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
                                {t("courses.totalRevenue") || "Total Revenue"}
                            </p>
                            <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                                ${courses.reduce((sum, c) => sum + (c.price || 0), 0)}
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-LightYellow/10 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-LightYellow" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Courses Grid */}
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {courses.map((course) => {
                    const levelBadge = getLevelBadge(course.level);
                    return (
                        <div
                            key={course._id}
                            className={`relative rounded-xl border p-6 transition-all duration-300 hover:shadow-md ${course.featured
                                    ? "border-primary bg-gradient-to-br from-primary/5 to-primary/10"
                                    : "border-PowderBlueBorder bg-white dark:bg-darkmode dark:border-dark_border"
                                }`}
                        >
                            {/* Featured Badge */}
                            {course.featured && (
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                    <span className="bg-primary text-white px-4 py-1 rounded-full text-xs font-semibold shadow-md flex items-center gap-1">
                                        <Star className="w-3 h-3" />
                                        {t("courses.featured") || "Featured"}
                                    </span>
                                </div>
                            )}

                            {/* Status Badge */}
                            <div className="absolute top-4 right-4">
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${course.isActive
                                            ? "bg-Aquamarine/20 text-Salem dark:bg-Aquamarine/30"
                                            : "bg-SlateBlueText/20 text-SlateBlueText dark:bg-darktext/30"
                                        }`}
                                >
                                    <CheckCircle className="w-3 h-3" />
                                    {course.isActive
                                        ? t("courses.status.active") || "Active"
                                        : t("courses.status.inactive") || "Inactive"}
                                </span>
                            </div>

                            {/* Course Image */}
                            {course.thumbnail && (
                                <div className="mb-4 rounded-lg overflow-hidden h-40 bg-gray-100 dark:bg-dark_input">
                                    <img
                                        src={course.thumbnail}
                                        alt={course.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}

                            {/* Course Header */}
                            <div className="mb-4">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white line-clamp-2 flex-1">
                                        {course.title}
                                    </h3>
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${levelBadge.bg} ${levelBadge.text}`}
                                    >
                                        {levelBadge.label}
                                    </span>
                                </div>
                                <p className="text-sm text-SlateBlueText dark:text-darktext line-clamp-2">
                                    {course.description}
                                </p>
                            </div>

                            {/* Course Info */}
                            <div className="space-y-3 mb-4">
                                {/* Price */}
                                <div className="flex items-center gap-2 text-sm">
                                    <DollarSign className="w-4 h-4 text-primary" />
                                    <span className="font-semibold text-MidnightNavyText dark:text-white">
                                        ${course.price}
                                    </span>
                                </div>

                                {/* Curriculum Count */}
                                {course.curriculum && course.curriculum.length > 0 && (
                                    <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                                        <BookOpen className="w-4 h-4" />
                                        <span>
                                            {course.curriculum.length}{" "}
                                            {t("courses.lessons") || "Lessons"}
                                        </span>
                                    </div>
                                )}

                                {/* Instructors */}
                                {course.instructors && course.instructors.length > 0 && (
                                    <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                                        <Users className="w-4 h-4" />
                                        <span>
                                            {course.instructors.length}{" "}
                                            {t("courses.instructors") || "Instructors"}
                                        </span>
                                    </div>
                                )}

                                {/* Projects Count */}
                                {course.projects && course.projects.length > 0 && (
                                    <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                                        <BarChart className="w-4 h-4" />
                                        <span>
                                            {course.projects.length}{" "}
                                            {t("courses.projects") || "Projects"}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Created By Info */}
                            <div className="flex items-center gap-3 mb-4 p-3 bg-IcyBreeze dark:bg-dark_input rounded-lg">
                                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                    <Users className="w-3 h-3 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-MidnightNavyText dark:text-white">
                                        {course.createdBy?.name || t("courses.creator") || "Creator"}
                                    </p>
                                    <p className="text-xs mb-1 text-SlateBlueText dark:text-darktext">
                                        {course.createdBy?.email}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-SlateBlueText dark:text-darktext">
                                        <Calendar className="w-3 h-3" />
                                        <span>
                                            {course.updatedAt
                                                ? formatDetailedDate(course.updatedAt).date
                                                : formatDetailedDate(course.createdAt).date}
                                        </span>
                                        <Clock className="w-3 h-3 ml-1" />
                                        <span>
                                            {course.updatedAt
                                                ? formatDetailedDate(course.updatedAt).time
                                                : formatDetailedDate(course.createdAt).time}
                                        </span>
                                    </div>
                                    {course.updatedAt !== course.createdAt && (
                                        <div className="flex items-center gap-1 mt-2 text-xs text-Aquamarine dark:text-Aquamarine">
                                            <Edit3 className="w-3 h-3" />
                                            <span>
                                                {t("common.lastEdited") || "Last edited"}{" "}
                                                {formatDate(course.updatedAt)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    {/* Edit */}
                                    <button
                                        onClick={() => onEdit(course)}
                                        className="w-full bg-primary hover:bg-primary/90 text-white py-2 px-3 rounded-lg font-semibold text-sm transition-transform transition-shadow duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary/30 flex items-center justify-center gap-2 group"
                                    >
                                        <Edit className="w-3 h-3 transition-transform duration-300 group-hover:-translate-y-0.5" />
                                        {t("common.edit") || "Edit"}
                                    </button>

                                    {/* Delete */}
                                    <button
                                        onClick={() => onDelete(course._id)}
                                        className="bg-SlateBlueText/10 hover:bg-SlateBlueText/20 dark:bg-darktext/20 dark:hover:bg-darktext/30 text-SlateBlueText dark:text-darktext py-2 px-3 rounded-lg font-semibold text-xs transition-transform transition-colors transition-shadow duration-300 hover:scale-105 active:scale-100 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-SlateBlueText/20 flex items-center justify-center gap-2 group"
                                    >
                                        <Trash2 className="w-3 h-3 transition-transform duration-300 group-hover:rotate-12" />
                                        {t("common.delete") || "Delete"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {courses.length === 0 && (
                <div className="text-center py-16 bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-3">
                        {t("courses.noCourses") || "No courses yet"}
                    </h3>
                    <p className="text-sm text-SlateBlueText dark:text-darktext mb-6 max-w-md mx-auto">
                        {t("courses.createFirst") ||
                            "Create your first course to start teaching students."}
                    </p>
                    <button
                        onClick={() => setOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
                    >
                        <Plus className="w-4 h-4" />
                        {t("courses.createFirstButton") || "Create Your First Course"}
                    </button>
                </div>
            )}

            {/* Modal */}
            <Modal
                open={open}
                title={
                    editing
                        ? t("courses.editCourse") || "Edit Course"
                        : t("courses.createCourse") || "Create New Course"
                }
                onClose={() => {
                    setOpen(false);
                    setEditing(null);
                }}
            >
                <CourseForm
                    initial={editing || undefined}
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