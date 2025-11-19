// components/Admin/CurriculumAdmin.tsx
'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FileText, Users, Plus, Package, Blocks, Code } from 'lucide-react';
import Modal from './Modal';
import AgeCategoryForm from './AgeCategoryForm';
import CurriculumStageForm from './CurriculumStageForm';
import StagesList from './StagesList';
import CategoriesList from './CategoriesList';
import { useI18n } from '@/i18n/I18nProvider';

// الأنترفيسات الأساسية فقط
interface AgeRange {
    en: string;
    ar: string;
}

interface AgeCategory {
    _id?: string;
    age_range: AgeRange;
    name_en: string;
    name_ar: string;
    description_en: string;
    description_ar: string;
    order: number;
    icon: string;
}

interface CurriculumStage {
    _id?: string;
    age_range: AgeRange | string;
    title_en: string;
    title_ar: string;
    platform: string;
    language_type: string | { en: string; ar: string };
    duration: string;
    lessons_count: number;
    projects_count: number;
    description_en: string;
    description_ar: string;
    order_index: number;
    age_category_id?: string;
    media_url?: string;
}

const CurriculumAdmin = () => {
    const { t } = useI18n();

    const [categories, setCategories] = useState<AgeCategory[]>([]);
    const [stages, setStages] = useState<CurriculumStage[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [open, setOpen] = useState<boolean>(false);
    const [editing, setEditing] = useState<AgeCategory | CurriculumStage | null>(null);
    const [activeTab, setActiveTab] = useState<'stages' | 'categories'>('stages');

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
        setOpen(false);
        setEditing(null);
    };

    const handleClose = () => {
        setOpen(false);
        setEditing(null);
    };

    const onDelete = async (id: string, type: 'curriculum' | 'categories') => {
        const deleteConfirm = t('common.deleteConfirm') || 'Are you sure you want to delete this item?';
        
        if (!confirm(deleteConfirm)) return;

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
                toast.success(t('common.deletedSuccess') || 'Item deleted successfully');
            } else {
                toast.error(t('common.deleteFailed') || 'Failed to delete item');
            }
        } catch (err) {
            console.error('Error deleting item:', err);
            toast.error(t('common.deleteError') || 'Error deleting item');
        }
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
                onClose={handleClose}
            >
                {activeTab === 'categories' ? (
                    <AgeCategoryForm
                        initial={editing as AgeCategory}
                        onClose={handleClose}
                        onSaved={onSaved}
                        t={t}
                    />
                ) : (
                    <CurriculumStageForm
                        initial={editing as CurriculumStage}
                        categories={categories}
                        onClose={handleClose}
                        onSaved={onSaved}
                        t={t}
                    />
                )}
            </Modal>
        </div>
    );
};

export default CurriculumAdmin;