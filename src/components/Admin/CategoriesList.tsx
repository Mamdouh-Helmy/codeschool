// components/Admin/CategoriesList.tsx
'use client';
import { Edit, Trash2, Users } from 'lucide-react';
import { useLocale } from '@/app/context/LocaleContext';

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

interface CategoriesListProps {
    categories: AgeCategory[];
    onEdit: (category: AgeCategory) => void;
    onDelete: (id: string) => void;
    t: (key: string) => string;
}

const CategoriesList = ({ categories, onEdit, onDelete, t }: CategoriesListProps) => {
    const { locale } = useLocale();

    const getAgeRangeDisplay = (ageRange: AgeRange): string => {
        return locale === 'ar' ? ageRange.ar : ageRange.en;
    };

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
                            <h3 className="font-bold text-MidnightNavyText dark:text-white text-lg">
                                {getAgeRangeDisplay(category.age_range)}
                            </h3>
                            <p className="text-sm text-SlateBlueText dark:text-darktext">
                                {locale === 'ar' ? category.name_ar : category.name_en}
                            </p>
                        </div>
                    </div>

                    {/* Description */}
                    <p className="text-SlateBlueText dark:text-darktext text-sm mb-4 line-clamp-2">
                        {locale === 'ar' ? category.description_ar : category.description_en}
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
                            onClick={() => onDelete(category._id!)}
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

export default CategoriesList;