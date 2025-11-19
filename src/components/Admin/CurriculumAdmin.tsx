// components/Curriculum/CurriculumAdmin.jsx
'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
    FileText,
    Calendar,
    Users,
    Plus,
    Edit,
    Trash2,
    Star,
    Zap,
    Package,
    TrendingUp,
    CheckCircle,
    Clock,
    BookOpen,
    Code,
    Blocks,
    Rocket,
} from 'lucide-react';
import Modal from './Modal';
import AgeCategoryForm from './AgeCategoryForm';
import CurriculumStageForm from './CurriculumStageForm';
import { useI18n } from '@/i18n/I18nProvider';
import { useLocale } from '@/app/context/LocaleContext';

const CurriculumAdmin = () => {
    const { t } = useI18n();

    const [categories, setCategories] = useState([]);
    const [stages, setStages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [activeTab, setActiveTab] = useState('stages');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [categoriesRes, stagesRes] = await Promise.all([
                fetch('/api/categories'),
                fetch('/api/curriculum/all')
            ]);

            const categoriesData = await categoriesRes.json();
            const stagesData = await stagesRes.json();

            if (categoriesData.success) setCategories(categoriesData.data);
            if (stagesData.success) setStages(stagesData.data);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const onSaved = async () => {
        await loadData();
        toast.success('Data saved successfully');
    };

    const onDelete = async (id, type) => {
        const deleteConfirm = t('common.deleteConfirm') || 'Are you sure you want to delete this item?';
        const deleteWarning = t('common.deleteWarning') || 'This action cannot be undone.';
        const cancelText = t('common.cancel') || 'Cancel';
        const deleteText = t('common.delete') || 'Delete';
        const deletedSuccess = t('common.deletedSuccess') || 'Item deleted successfully';
        const deleteFailed = t('common.deleteFailed') || 'Failed to delete item';
        const deleteError = t('common.deleteError') || 'Error deleting item';

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
                                    const res = await fetch(`/api/${type}/${encodeURIComponent(id)}`, {
                                        method: 'DELETE',
                                    });
                                    if (res.ok) {
                                        if (type === 'curriculum') {
                                            setStages(prev => prev.filter(item => item._id !== id));
                                        } else {
                                            setCategories(prev => prev.filter(item => item._id !== id));
                                        }
                                        toast.success(deletedSuccess);
                                    } else {
                                        toast.error(deleteFailed);
                                    }
                                } catch (err) {
                                    console.error('Error deleting item:', err);
                                    toast.error(deleteError);
                                }
                            }}
                        >
                            {deleteText}
                        </button>
                    </div>
                </div>
            ),
            { duration: Infinity, position: 'top-center' }
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
                            {t('curriculum.management') || "Curriculum Timeline Management"}
                        </h1>
                        <p className="text-sm text-SlateBlueText dark:text-darktext max-w-2xl">
                            {t('curriculum.managementDescription') || "Manage age categories and learning stages for the curriculum timeline"}
                        </p>
                    </div>
                    <div className="flex gap-3 mt-4 lg:mt-0">
                        <button
                            onClick={() => {
                                setEditing(null);
                                setActiveTab('categories');
                                setOpen(true);
                            }}
                            className="bg-ElectricAqua hover:bg-ElectricAqua/90 text-white px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
                        >
                            <Users className="w-4 h-4" />
                            {t('curriculum.addCategory') || "Add Category"}
                        </button>
                        <button
                            onClick={() => {
                                setEditing(null);
                                setActiveTab('stages');
                                setOpen(true);
                            }}
                            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            {t('curriculum.addStage') || "Add Stage"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 space-x-1 bg-white dark:bg-darkmode rounded-xl p-2 border border-PowderBlueBorder dark:border-dark_border">
                <button
                    onClick={() => setActiveTab('stages')}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 ${activeTab === 'stages'
                        ? 'bg-primary text-white shadow-md'
                        : 'text-SlateBlueText dark:text-darktext hover:bg-IcyBreeze dark:hover:bg-dark_input'
                        }`}
                >
                    {t('curriculum.learningStages') || "Learning Stages"} ({stages.length})
                </button>
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 ${activeTab === 'categories'
                        ? 'bg-ElectricAqua text-white shadow-md'
                        : 'text-SlateBlueText dark:text-darktext hover:bg-IcyBreeze dark:hover:bg-dark_input'
                        }`}
                >
                    {t('curriculum.ageCategories') || "Age Categories"} ({categories.length})
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                                {t('curriculum.totalStages') || "Total Stages"}
                            </p>
                            <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                                {stages.length}
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
                                {t('curriculum.ageCategories') || "Age Categories"}
                            </p>
                            <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                                {categories.length}
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-ElectricAqua/10 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-ElectricAqua" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                                {t('curriculum.blockCoding') || "Block Coding"}
                            </p>
                            <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                                {stages.filter(s => s.language_type === 'Block').length}
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-Aquamarine/10 rounded-lg flex items-center justify-center">
                            <Blocks className="w-5 h-5 text-Aquamarine" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                                {t('curriculum.textCoding') || "Text Coding"}
                            </p>
                            <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                                {stages.filter(s => s.language_type === 'Text').length}
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-LightYellow/10 rounded-lg flex items-center justify-center">
                            <Code className="w-5 h-5 text-LightYellow" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'stages' ? (
                <StagesList
                    stages={stages}
                    categories={categories}
                    onEdit={(stage) => {
                        setEditing(stage);
                        setActiveTab('stages');
                        setOpen(true);
                    }}
                    onDelete={(id) => onDelete(id, 'curriculum')}
                    t={t}
                />
            ) : (
                <CategoriesList
                    categories={categories}
                    onEdit={(category) => {
                        setEditing(category);
                        setActiveTab('categories');
                        setOpen(true);
                    }}
                    onDelete={(id) => onDelete(id, 'categories')}
                    t={t}
                />
            )}

            {/* Modal */}
            <Modal
                open={open}
                title={
                    editing
                        ? `${t(activeTab === 'stages' ? 'curriculum.editStage' : 'curriculum.editCategory') || (activeTab === 'stages' ? 'Edit Stage' : 'Edit Category')}`
                        : `${t(activeTab === 'stages' ? 'curriculum.createStage' : 'curriculum.createCategory') || (activeTab === 'stages' ? 'Add New Stage' : 'Add New Category')}`
                }
                onClose={() => {
                    setOpen(false);
                    setEditing(null);
                }}
            >
                {activeTab === 'categories' ? (
                    <AgeCategoryForm
                        initial={editing}
                        onClose={() => {
                            setOpen(false);
                            setEditing(null);
                        }}
                        onSaved={onSaved}
                        t={t}
                    />
                ) : (
                    <CurriculumStageForm
                        initial={editing}
                        categories={categories}
                        onClose={() => {
                            setOpen(false);
                            setEditing(null);
                        }}
                        onSaved={onSaved}
                        t={t}
                    />
                )}
            </Modal>
        </div>
    );
};

// Stages List Component
const StagesList = ({ stages, categories, onEdit, onDelete, t }) => {
    const { locale } = useLocale(); // Add this line to get the current locale

    const getPlatformIcon = (platform) => {
        const platformIcons = {
            'Code.org': <Code className="w-4 h-4" />,
            'Scratch': <Blocks className="w-4 h-4" />,
            'Replit': <Rocket className="w-4 h-4" />,
            'default': <Code className="w-4 h-4" />
        };
        return platformIcons[platform] || platformIcons.default;
    };

    const getCategoryName = (ageRange) => {
        // Handle ageRange whether it's a string or object
        if (typeof ageRange === 'object') {
            return locale === 'ar' ? ageRange.ar : ageRange.en;
        }
        return ageRange;
    };

    return (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {stages.map((stage) => (
                <div
                    key={stage._id}
                    className="relative bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border p-6 transition-all duration-300 hover:shadow-md"
                >
                    {/* Stage Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                {getPlatformIcon(stage.platform)}
                            </div>
                            <div>
                                <h3 className="font-bold text-MidnightNavyText dark:text-white text-lg">
                                    {locale === 'ar' ? stage.title_ar : stage.title_en}
                                </h3>
                                <p className="text-sm text-SlateBlueText dark:text-darktext">
                                    {getCategoryName(stage.age_range)}
                                </p>
                            </div>
                        </div>

                        {/* Language Type Badge */}
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${stage.language_type === 'Block'
                            ? 'bg-Aquamarine/20 text-Salem'
                            : 'bg-ElectricAqua/20 text-RegalBlue'
                            }`}>
                            {typeof stage.language_type === 'object'
                                ? (locale === 'ar' ? stage.language_type.ar : stage.language_type.en)
                                : stage.language_type
                            }
                        </span>
                    </div>

                    {/* Stage Details */}
                    <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-SlateBlueText dark:text-darktext">
                                {t('curriculum.platform') || "Platform"}:
                            </span>
                            <span className="font-semibold text-MidnightNavyText dark:text-white">
                                {stage.platform}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-SlateBlueText dark:text-darktext">
                                {t('curriculum.duration') || "Duration"}:
                            </span>
                            <span className="font-semibold text-MidnightNavyText dark:text-white">
                                {stage.duration}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-SlateBlueText dark:text-darktext">
                                {t('curriculum.displayOrder') || "Order"}:
                            </span>
                            <span className="font-semibold text-MidnightNavyText dark:text-white">
                                {stage.order_index}
                            </span>
                        </div>
                    </div>

                    {/* Description */}
                    <p className="text-SlateBlueText dark:text-darktext text-sm mb-4 line-clamp-2">
                        {locale === 'ar' ? stage.description_ar : stage.description_en}
                    </p>

                    {/* Lessons & Projects */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="text-center p-2 bg-primary/5 rounded-lg">
                            <BookOpen className="w-4 h-4 text-primary mx-auto mb-1" />
                            <div className="text-sm font-bold text-MidnightNavyText dark:text-white">
                                {stage.lessons_count}
                            </div>
                            <div className="text-xs text-SlateBlueText dark:text-darktext">
                                {t('curriculum.lessons') || "Lessons"}
                            </div>
                        </div>
                        <div className="text-center p-2 bg-Aquamarine/5 rounded-lg">
                            <Code className="w-4 h-4 text-Aquamarine mx-auto mb-1" />
                            <div className="text-sm font-bold text-MidnightNavyText dark:text-white">
                                {stage.projects_count}
                            </div>
                            <div className="text-xs text-SlateBlueText dark:text-darktext">
                                {t('curriculum.projects') || "Projects"}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit(stage)}
                            className="flex-1 bg-primary hover:bg-primary/90 text-white py-2 px-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                            <Edit className="w-3 h-3" />
                            {t('common.edit') || "Edit"}
                        </button>
                        <button
                            onClick={() => onDelete(stage._id)}
                            className="px-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            ))}

            {stages.length === 0 && (
                <div className="col-span-full text-center py-16 bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-3">
                        {t('curriculum.noStages') || "No stages yet"}
                    </h3>
                    <p className="text-sm text-SlateBlueText dark:text-darktext mb-6 max-w-md mx-auto">
                        {t('curriculum.noStagesDescription') || "Create your first learning stage to build the curriculum timeline."}
                    </p>
                </div>
            )}
        </div>
    );
};
// Categories List Component
// Categories List Component - معدل
const CategoriesList = ({ categories, onEdit, onDelete, t }) => {
    const { locale } = useLocale();

    return (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
                <div
                    key={category._id}
                    className="relative bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border p-6 transition-all duration-300 hover:shadow-md"
                >
                    {/* Category Header */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-ElectricAqua/10 rounded-full flex items-center justify-center">
                            <span className="text-2xl">{category.icon}</span>
                        </div>
                        <div>
                            {/* إصلاح هنا: عرض age_range بالشكل الصحيح */}
                            <h3 className="font-bold text-MidnightNavyText dark:text-white text-lg">
                                {locale === 'ar' ? (category.age_range?.ar || category.age_range) : (category.age_range?.en || category.age_range)}
                            </h3>
                            <p className="text-sm text-SlateBlueText dark:text-darktext">
                                {locale === 'ar' ? (category.name_ar) : (category.name_en)}
                            </p>
                            {/* عرض النسخة العربية من age_range */}
                            <p className="text-xs text-SlateBlueText dark:text-darktext mt-1">
                                {locale === 'ar' ? (category.age_range?.ar || '') : (category.age_range?.en || '')}
                            </p>
                        </div>
                    </div>

                    {/* Description */}
                    <p className="text-SlateBlueText dark:text-darktext text-sm mb-4 line-clamp-2">
                        {locale === 'ar' ? (category.description_ar) : (category.description_en)}
                    </p>

                    {/* Order */}
                    <div className="flex items-center gap-3 text-sm mb-4">
                        <span className="text-SlateBlueText dark:text-darktext">
                            {t('curriculum.displayOrder') || "Display Order"}:
                        </span>
                        <span className="font-semibold text-MidnightNavyText dark:text-white">
                            {category.order}
                        </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit(category)}
                            className="flex-1 bg-ElectricAqua hover:bg-ElectricAqua/90 text-white py-2 px-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                            <Edit className="w-3 h-3" />
                            {t('common.edit') || "Edit"}
                        </button>
                        <button
                            onClick={() => onDelete(category._id)}
                            className="px-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            ))}

            {categories.length === 0 && (
                <div className="col-span-full text-center py-16 bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border">
                    <div className="w-16 h-16 bg-ElectricAqua/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-ElectricAqua" />
                    </div>
                    <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-3">
                        {t('curriculum.noCategories') || "No categories yet"}
                    </h3>
                    <p className="text-sm text-SlateBlueText dark:text-darktext mb-6 max-w-md mx-auto">
                        {t('curriculum.noCategoriesDescription') || "Create your first age category to organize learning paths."}
                    </p>
                </div>
            )}
        </div>
    );
};

export default CurriculumAdmin;