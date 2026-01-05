// components/Admin/CourseForm.tsx
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth"; // استخدم custom hook
import {
    BookOpen,
    Image,
    DollarSign,
    Users,
    X,
    Save,
    Plus,
    Trash2,
    ChevronDown,
    Star,
    Upload,
    List,
    Briefcase,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

interface Props {
    initial?: any;
    onClose: () => void;
    onSaved: () => void;
}

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
}

interface CurriculumItem {
    title: string;
    description: string;
    order: number;
}

export default function CourseForm({ initial, onClose, onSaved }: Props) {
    const { t } = useI18n();
    const { user, loading: authLoading } = useAuth(); // استخدم custom hook

    const [form, setForm] = useState(() => ({
        title: initial?.title || "",
        description: initial?.description || "",
        level: initial?.level || "beginner",
        price: initial?.price || 0,
        thumbnail: initial?.thumbnail || "",
        isActive: initial?.isActive ?? true,
        featured: initial?.featured || false,
    }));

    const [curriculum, setCurriculum] = useState<CurriculumItem[]>(
        initial?.curriculum || []
    );
    const [projects, setProjects] = useState<string[]>(initial?.projects || []);
    const [instructors, setInstructors] = useState<string[]>(
        initial?.instructors?.map((i: any) => i._id || i) || []
    );

    const [newCurriculumItem, setNewCurriculumItem] = useState({
        title: "",
        description: "",
    });
    const [newProject, setNewProject] = useState("");
    const [loading, setLoading] = useState(false);
    const [thumbnailPreview, setThumbnailPreview] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setUsersLoading(true);
                const res = await fetch("/api/instructor", { cache: "no-store" });
                const json = await res.json();

                if (json.success) {
                    setUsers(json.data);
                }
            } catch (err) {
                console.error("Error fetching users:", err);
            } finally {
                setUsersLoading(false);
            }
        };

        fetchUsers();
    }, []);

    useEffect(() => {
        if (form.thumbnail) {
            setThumbnailPreview(form.thumbnail);
        }
    }, [form.thumbnail]);

    const onChange = (field: string, value: any) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const addCurriculumItem = () => {
        if (newCurriculumItem.title.trim()) {
            const item: CurriculumItem = {
                ...newCurriculumItem,
                order: curriculum.length + 1,
            };
            setCurriculum([...curriculum, item]);
            setNewCurriculumItem({ title: "", description: "" });
        }
    };

    const removeCurriculumItem = (index: number) => {
        const updated = curriculum.filter((_, i) => i !== index);
        const reordered = updated.map((item, idx) => ({ ...item, order: idx + 1 }));
        setCurriculum(reordered);
    };

    const addProject = () => {
        const project = newProject.trim();
        if (project && !projects.includes(project)) {
            setProjects([...projects, project]);
            setNewProject("");
        }
    };

    const removeProject = (index: number) => {
        setProjects(projects.filter((_, i) => i !== index));
    };

    const toggleInstructor = (userId: string) => {
        if (instructors.includes(userId)) {
            setInstructors(instructors.filter((id) => id !== userId));
        } else {
            setInstructors([...instructors, userId]);
        }
    };

    const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setThumbnailPreview(result);
                onChange("thumbnail", result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addProject();
        }
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // التحقق من وجود بيانات المستخدم
            if (!user?.id) {
                alert(t("courses.loginRequired") || "Please login to create a course");
                setLoading(false);
                return;
            }

            const payload = {
                ...form,
                curriculum,
                projects,
                instructors,
                createdBy: initial?.createdBy || {
                    id: user.id, // استخدام الـ id الحقيقي من user
                    name: user.name || "Admin",
                    email: user.email || "",
                    role: user.role || "admin",
                },
            };

            const method = initial?._id ? "PUT" : "POST";
            const url = initial?._id
                ? `/api/courses/${initial._id}`
                : "/api/courses";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                onSaved();
                onClose();
            } else {
                const errorData = await res.json();
                alert(`Failed to save course: ${errorData.error || errorData.message}`);
            }
        } catch (err) {
            console.error("Error:", err);
            alert("An error occurred while saving the course.");
        } finally {
            setLoading(false);
        }
    };

    // عرض loading أثناء التحقق من المستخدم
    if (authLoading) {
        return (
            <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }
    
    return (
        <form onSubmit={submit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                            {t("courses.basicInfo") || "Course Information"}
                        </h3>
                        <p className="text-12 text-SlateBlueText dark:text-darktext">
                            {t("courses.basicInfoDescription") ||
                                "Basic details about the course"}
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
                            <BookOpen className="w-3 h-3 text-primary" />
                            {t("courses.title") || "Course Title"} *
                        </label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => onChange("title", e.target.value)}
                            placeholder={
                                t("courses.titlePlaceholder") || "e.g., Web Development"
                            }
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
                            <ChevronDown className="w-3 h-3 text-primary" />
                            {t("courses.level") || "Level"} *
                        </label>
                        <div className="relative">
                            <select
                                value={form.level}
                                onChange={(e) => onChange("level", e.target.value)}
                                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200 appearance-none pr-10"
                                required
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
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                <ChevronDown className="w-4 h-4 text-SlateBlueText dark:text-darktext" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
                        <BookOpen className="w-3 h-3 text-primary" />
                        {t("courses.description") || "Description"} *
                    </label>
                    <textarea
                        value={form.description}
                        onChange={(e) => onChange("description", e.target.value)}
                        rows={3}
                        placeholder={
                            t("courses.descriptionPlaceholder") ||
                            "Describe the course content, what students will learn..."
                        }
                        className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 resize-none transition-all duration-200"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
                        <DollarSign className="w-3 h-3 text-primary" />
                        {t("courses.price") || "Price"} *
                    </label>
                    <input
                        type="number"
                        value={form.price}
                        onChange={(e) => onChange("price", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                        required
                    />
                </div>
            </div>

            {/* Thumbnail */}
            <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-Aquamarine/10 rounded-lg flex items-center justify-center">
                        <Image className="w-4 h-4 text-Aquamarine" />
                    </div>
                    <div>
                        <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                            {t("courses.thumbnail") || "Course Thumbnail"}
                        </h3>
                        <p className="text-12 text-SlateBlueText dark:text-darktext">
                            {t("courses.thumbnailDescription") || "Upload course thumbnail"}
                        </p>
                    </div>
                </div>

                <div className="flex gap-4 items-start">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={form.thumbnail}
                            onChange={(e) => onChange("thumbnail", e.target.value)}
                            placeholder={
                                t("courses.thumbnailPlaceholder") || "Image URL or upload file"
                            }
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                        />
                        <div className="mt-2">
                            <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-12 cursor-pointer hover:bg-primary/20 transition-colors">
                                <Upload className="w-3 h-3" />
                                {t("courses.uploadThumbnail") || "Upload Thumbnail"}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleThumbnailUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>

                    {thumbnailPreview && (
                        <div className="w-20 h-20 border border-PowderBlueBorder rounded-lg overflow-hidden">
                            <img
                                src={thumbnailPreview}
                                alt="Preview"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Curriculum */}
            <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-ElectricAqua/10 rounded-lg flex items-center justify-center">
                        <List className="w-4 h-4 text-ElectricAqua" />
                    </div>
                    <div>
                        <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                            {t("courses.curriculum") || "Curriculum"}
                        </h3>
                        <p className="text-12 text-SlateBlueText dark:text-darktext">
                            {t("courses.curriculumDescription") || "Add course lessons"}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="space-y-2">
                        <input
                            type="text"
                            value={newCurriculumItem.title}
                            onChange={(e) =>
                                setNewCurriculumItem({
                                    ...newCurriculumItem,
                                    title: e.target.value,
                                })
                            }
                            placeholder={
                                t("courses.lessonTitlePlaceholder") || "Lesson title"
                            }
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                        />
                        <textarea
                            value={newCurriculumItem.description}
                            onChange={(e) =>
                                setNewCurriculumItem({
                                    ...newCurriculumItem,
                                    description: e.target.value,
                                })
                            }
                            placeholder={
                                t("courses.lessonDescriptionPlaceholder") || "Lesson description"
                            }
                            rows={2}
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 resize-none transition-all duration-200"
                        />
                        <button
                            type="button"
                            onClick={addCurriculumItem}
                            disabled={!newCurriculumItem.title.trim()}
                            className="w-full px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-13 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            {t("courses.addLesson") || "Add Lesson"}
                        </button>
                    </div>

                    {curriculum.length > 0 && (
                        <div className="space-y-2">
                            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                                {t("courses.addedLessons") || "Added Lessons"}:
                            </label>
                            <div className="space-y-2">
                                {curriculum.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-2 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white p-3 rounded-lg"
                                    >
                                        <div className="flex-1">
                                            <p className="font-semibold text-13">
                                                {index + 1}. {item.title}
                                            </p>
                                            {item.description && (
                                                <p className="text-12 text-SlateBlueText dark:text-darktext mt-1">
                                                    {item.description}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeCurriculumItem(index)}
                                            className="text-red-500 hover:text-red-700 transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Projects */}
            <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-Aquamarine/10 rounded-lg flex items-center justify-center">
                        <Briefcase className="w-4 h-4 text-Aquamarine" />
                    </div>
                    <div>
                        <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                            {t("courses.projects") || "Projects"}
                        </h3>
                        <p className="text-12 text-SlateBlueText dark:text-darktext">
                            {t("courses.projectsDescription") || "Add course projects"}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={newProject}
                                onChange={(e) => setNewProject(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder={
                                    t("courses.projectPlaceholder") || "Enter project name"
                                }
                                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={addProject}
                            disabled={!newProject.trim()}
                            className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-13 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            {t("common.add") || "Add"}
                        </button>
                    </div>

                    {projects.length > 0 && (
                        <div className="space-y-2">
                            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                                {t("courses.addedProjects") || "Added Projects"}:
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {projects.map((project, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white px-3 py-2 rounded-lg text-13"
                                    >
                                        <span>{project}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeProject(index)}
                                            className="text-red-500 hover:text-red-700 transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <p className="text-11 text-SlateBlueText dark:text-darktext">
                        {t("courses.projectsHint") ||
                            "Press Enter or click Add to include multiple projects"}
                    </p>
                </div>
            </div>

            {/* Instructors */}
            <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                            {t("courses.instructors") || "Instructors"}
                        </h3>
                        <p className="text-12 text-SlateBlueText dark:text-darktext">
                            {t("courses.instructorsDescription") ||
                                "Select course instructors"}
                        </p>
                    </div>
                </div>

                {usersLoading ? (
                    <p className="text-13 text-SlateBlueText dark:text-darktext">
                        {t("courses.loadingInstructors") || "Loading instructors..."}
                    </p>
                ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {users.length === 0 ? (
                            <p className="text-13 text-SlateBlueText dark:text-darktext">
                                {t("courses.noInstructors") || "No instructors available"}
                            </p>
                        ) : (
                            users.map((user) => (
                                <label
                                    key={user._id}
                                    className="flex items-center gap-3 p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-IcyBreeze dark:hover:bg-dark_input transition-all duration-200 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={instructors.includes(user._id)}
                                        onChange={() => toggleInstructor(user._id)}
                                        className="w-4 h-4 text-primary focus:ring-primary border-PowderBlueBorder rounded"
                                    />
                                    <div className="flex-1">
                                        <p className="text-13 font-medium text-MidnightNavyText dark:text-white">
                                            {user.name}
                                        </p>
                                        <p className="text-11 text-SlateBlueText dark:text-darktext">
                                            {user.email}
                                        </p>
                                    </div>
                                </label>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Settings */}
            <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Save className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                            {t("courses.settings") || "Settings"}
                        </h3>
                        <p className="text-12 text-SlateBlueText dark:text-darktext">
                            {t("courses.settingsDescription") ||
                                "Course visibility and status"}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="flex items-center space-x-3 p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-IcyBreeze dark:hover:bg-dark_input transition-all duration-200 cursor-pointer group">
                        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <Star className="w-3 h-3 text-primary" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={form.featured}
                                    onChange={(e) => onChange("featured", e.target.checked)}
                                    className="w-4 h-4 text-primary focus:ring-primary border-PowderBlueBorder rounded"
                                />
                                <span className="text-13 font-medium text-MidnightNavyText dark:text-white">
                                    {t("courses.featuredCourse") || "Featured Course"}
                                </span>
                            </div>
                            <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">
                                {t("courses.featuredDescription") ||
                                    "Highlight this course as featured"}
                            </p>
                        </div>
                    </label>

                    <label className="flex items-center space-x-3 p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-IcyBreeze dark:hover:bg-dark_input transition-all duration-200 cursor-pointer group">
                        <div className="w-8 h-8 bg-Aquamarine/10 rounded flex items-center justify-center group-hover:bg-Aquamarine/20 transition-colors">
                            <Save className="w-3 h-3 text-Aquamarine" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) => onChange("isActive", e.target.checked)}
                                    className="w-4 h-4 text-Aquamarine focus:ring-Aquamarine border-PowderBlueBorder rounded"
                                />
                                <span className="text-13 font-medium text-MidnightNavyText dark:text-white">
                                    {t("courses.activeCourse") || "Active Course"}
                                </span>
                            </div>
                            <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">
                                {t("courses.activeDescription") ||
                                    "Make this course visible to students"}
                            </p>
                        </div>
                    </label>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 hover:bg-IcyBreeze dark:hover:bg-darklight hover:shadow-md flex items-center justify-center gap-2"
                >
                    <X className="w-3 h-3" />
                    {t("common.cancel") || "Cancel"}
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            {t("common.saving") || "Saving..."}
                        </>
                    ) : initial ? (
                        <>
                            <Save className="w-3 h-3" />
                            {t("courses.updateCourse") || "Update Course"}
                        </>
                    ) : (
                        <>
                            <Plus className="w-3 h-3" />
                            {t("courses.createCourse") || "Create Course"}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}