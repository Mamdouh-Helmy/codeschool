// components/Curriculum/AgeCategoryForm.jsx
'use client';
import { useState, useEffect } from 'react';
import {
    FileText,
    Users,
    X,
    Save,
    Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';

const AgeCategoryForm = ({ initial, onClose, onSaved, t }) => {
    const [form, setForm] = useState(() => ({
        age_range: initial?.age_range || { en: '', ar: '' },
        name_en: initial?.name_en || '',
        name_ar: initial?.name_ar || '',
        description_en: initial?.description_en || '',
        description_ar: initial?.description_ar || '',
        order: initial?.order || 1,
        icon: initial?.icon || '👶',
    }));

    const [loading, setLoading] = useState(false);

    // كل الفئات العمرية المحددة في الموديل باللغتين
    const ageRanges = [
        { 
            en: '6-8 years', 
            ar: '6-8 سنوات' 
        },
        { 
            en: '8-10 years', 
            ar: '8-10 سنوات' 
        },
        { 
            en: '10-12 years', 
            ar: '10-12 سنوات' 
        },
        { 
            en: '12-14 years', 
            ar: '12-14 سنوات' 
        },
        { 
            en: '14-16 years', 
            ar: '14-16 سنوات' 
        },
        { 
            en: '16-18 years', 
            ar: '16-18 سنوات' 
        },
        { 
            en: '18+ years', 
            ar: '18+ سنة' 
        }
    ];

    const icons = ['👶', '👦', '👧', '🧒', '🧑', '👨', '👩', '🚀', '💻', '🎮', '📚', '🎓'];

    const onChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleAgeRangeChange = (selectedRange) => {
        setForm(prev => ({ 
            ...prev, 
            age_range: selectedRange 
        }));
    };

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // التحقق من أن age_range تحتوي على القيم المطلوبة
            if (!form.age_range.en || !form.age_range.ar) {
                toast.error('Please select a valid age range');
                setLoading(false);
                return;
            }

            const payload = {
                age_range: {
                    en: form.age_range.en,
                    ar: form.age_range.ar
                },
                name_en: form.name_en,
                name_ar: form.name_ar,
                description_en: form.description_en,
                description_ar: form.description_ar,
                order: parseInt(form.order),
                icon: form.icon,
            };

            const method = initial?._id ? 'PUT' : 'POST';
            const url = initial?._id
                ? `/api/categories/${initial._id}`
                : `/api/categories`;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const responseText = await res.text();

            if (!res.ok) {
                let errorMessage = `HTTP error! status: ${res.status}`;
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.message || errorMessage;

                    // معالجة خاصة لخطأ التكرار
                    if (res.status === 409) {
                        toast.error(`This age range already exists. Please choose a different one or edit the existing category.`);
                        return;
                    }
                } catch {
                    // إذا فشل تحليل JSON، نستخدم الرسالة الافتراضية
                }
                throw new Error(errorMessage);
            }

            const result = JSON.parse(responseText);

            if (result.success) {
                // toast.success(result.message || 'Category saved successfully');
                onSaved();
                onClose();
            } else {
                throw new Error(result.message || 'Operation failed');
            }
        } catch (err) {
            console.error('Error saving category:', err);
            toast.error(err.message || 'An error occurred while saving.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            {/* Age Range */}
            <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                            {t('curriculum.ageGroup') || "Age Group"}
                        </h3>
                        <p className="text-12 text-SlateBlueText dark:text-darktext">
                            {t('curriculum.categoryInfo') || "Category information"}
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                            {t('curriculum.ageGroup') || "Age Range"} *
                        </label>
                        <select
                            value={form.age_range.en}
                            onChange={(e) => {
                                const selected = ageRanges.find(range => range.en === e.target.value);
                                if (selected) {
                                    handleAgeRangeChange(selected);
                                }
                            }}
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                            required
                        >
                            <option value="">{t('curriculum.selectAgeRange') || "Select Age Range"}</option>
                            {ageRanges.map(range => (
                                <option key={range.en} value={range.en}>
                                    {range.en} / {range.ar}
                                </option>
                            ))}
                        </select>
                        {form.age_range.en && (
                            <div className="mt-2 p-2 bg-IcyBreeze dark:bg-dark_input rounded-lg">
                                <div className="text-12 text-SlateBlueText dark:text-darktext">
                                    <strong>English:</strong> {form.age_range.en}
                                </div>
                                <div className="text-12 text-SlateBlueText dark:text-darktext">
                                    <strong>Arabic:</strong> {form.age_range.ar}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                            {t('curriculum.displayOrder') || "Display Order"} *
                        </label>
                        <input
                            type="number"
                            value={form.order}
                            onChange={(e) => onChange('order', e.target.value)}
                            min="1"
                            max="10"
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                            required
                        />
                    </div>
                </div>

                {/* Icon Selector */}
                <div className="space-y-2">
                    <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                        {t('curriculum.icon') || "Icon"}
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                        {icons.map(icon => (
                            <button
                                type="button"
                                key={icon}
                                onClick={() => onChange('icon', icon)}
                                className={`p-2 text-2xl rounded-lg border transition-all duration-200 ${form.icon === icon
                                    ? 'border-primary bg-primary/10'
                                    : 'border-PowderBlueBorder dark:border-dark_border hover:border-primary'
                                    }`}
                            >
                                {icon}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                            {t('curriculum.basicInfo') || "Basic Information"}
                        </h3>
                        <p className="text-12 text-SlateBlueText dark:text-darktext">
                            {t('curriculum.categoryDetailsDesc') || 'Category details'}
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                            {t('curriculum.englishTitle') || "English Title"} *
                        </label>
                        <input
                            type="text"
                            value={form.name_en}
                            onChange={(e) => onChange('name_en', e.target.value)}
                            placeholder={t('curriculum.categoryNameEn') || "Category name in English"}
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                            {t('curriculum.arabicTitle') || "Arabic Title"} *
                        </label>
                        <input
                            type="text"
                            value={form.name_ar}
                            onChange={(e) => onChange('name_ar', e.target.value)}
                            placeholder={t('curriculum.categoryNameAr') || "Category name in Arabic"}
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                            required
                        />
                    </div>
                </div>

                {/* Descriptions */}
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                            {t('curriculum.englishDescription') || "English Description"} *
                        </label>
                        <textarea
                            value={form.description_en}
                            onChange={(e) => onChange('description_en', e.target.value)}
                            rows={3}
                            placeholder={t('curriculum.categoryDescriptionEn') || "Category description in English"}
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 resize-none transition-all duration-200"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                            {t('curriculum.arabicDescription') || "Arabic Description"} *
                        </label>
                        <textarea
                            value={form.description_ar}
                            onChange={(e) => onChange('description_ar', e.target.value)}
                            rows={3}
                            placeholder={t('curriculum.categoryDescriptionAr') || "Category description in Arabic"}
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 resize-none transition-all duration-200"
                            required
                        />
                    </div>
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
                    {t('common.cancel') || "Cancel"}
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            {t('common.saving') || "Saving..."}
                        </>
                    ) : initial ? (
                        <>
                            <Save className="w-3 h-3" />
                            {t('curriculum.updateCategory') || "Update Category"}
                        </>
                    ) : (
                        <>
                            <Plus className="w-3 h-3" />
                            {t('curriculum.createCategory') || "Create Category"}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

export default AgeCategoryForm;