// في components/Admin/StagesList.tsx
'use client';
import { Edit, Trash2, BookOpen, Code, Blocks, Rocket } from 'lucide-react';
import { useLocale } from '@/app/context/LocaleContext';

interface AgeRange {
    en: string;
    ar: string;
}

interface LanguageType {
    value: string;
    en: string;
    ar: string;
}

interface CurriculumStage {
    _id?: string;
    age_range: AgeRange | string;
    title_en: string;
    title_ar: string;
    platform: string;
    language_type: LanguageType | string; // تأكد أن هذا يتوافق مع CurriculumAdmin
    duration: string;
    lessons_count: number;
    projects_count: number;
    description_en: string;
    description_ar: string;
    order_index: number;
    media_url?: string;
}

interface StagesListProps {
    stages: CurriculumStage[];
    onEdit: (stage: CurriculumStage) => void;
    onDelete: (id: string) => void;
    t: (key: string) => string;
}

const StagesList = ({ stages, onEdit, onDelete, t }: StagesListProps) => {
    const { locale } = useLocale();

    const getPlatformIcon = (platform: string) => {
        const platformIcons = {
            'Code.org': <Code className="w-4 h-4" />,
            'Scratch': <Blocks className="w-4 h-4" />,
            'Replit': <Rocket className="w-4 h-4" />,
            'default': <Code className="w-4 h-4" />
        };
        return platformIcons[platform as keyof typeof platformIcons] || platformIcons.default;
    };

    const getCategoryName = (ageRange: AgeRange | string): string => {
        if (typeof ageRange === 'object') {
            return locale === 'ar' ? ageRange.ar : ageRange.en;
        }
        return ageRange;
    };

    const getLanguageType = (languageType: LanguageType | string): string => {
        if (typeof languageType === 'object') {
            return locale === 'ar' ? languageType.ar : languageType.en;
        }
        return languageType;
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
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getLanguageType(stage.language_type) === 'Block'
                            ? 'bg-Aquamarine/20 text-Salem'
                            : 'bg-ElectricAqua/20 text-RegalBlue'
                            }`}>
                            {getLanguageType(stage.language_type)}
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
                            onClick={() => onDelete(stage._id!)}
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
                        <BookOpen className="w-8 h-8 text-primary" />
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

export default StagesList;