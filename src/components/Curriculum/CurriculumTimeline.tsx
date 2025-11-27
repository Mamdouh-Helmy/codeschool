'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { useLocale } from '@/app/context/LocaleContext';
import AgeModal from './AgeModal';
import StageCard from './StageCard';
import StageModal from './StageModal';
import TimelineAnimation from './TimelineAnimation';
import { Rocket, Code, Sparkles } from 'lucide-react';
import { compareSync } from 'bcryptjs';

// الأنواع
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
    language_type: LanguageType | string;
    duration: string;
    lessons_count: number;
    projects_count: number;
    description_en: string;
    description_ar: string;
    order_index: number;
    age_category_id?: string;
    media_url?: string;
    difficulty_level?: string;
}

const CurriculumTimeline = () => {
    const { t } = useI18n();
    const { locale } = useLocale();
    const [selectedAge, setSelectedAge] = useState<AgeCategory | null>(null);
    const [stages, setStages] = useState<CurriculumStage[]>([]);
    const [categories, setCategories] = useState<AgeCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStage, setSelectedStage] = useState<CurriculumStage | null>(null);
    const [showStageModal, setShowStageModal] = useState(false);
    const timelineRef = useRef<HTMLDivElement>(null);

    // دالات fetch محسنة
    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch('/api/categories');
            const data = await res.json();
            if (data.success) {
                setCategories(data.data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStages = useCallback(async (ageCategory: AgeCategory) => {
        setLoading(true);
        try {
            const ageRange = typeof ageCategory.age_range === 'object'
                ? (locale === 'ar' ? ageCategory.age_range.ar : ageCategory.age_range.en)
                : ageCategory.age_range;

            const res = await fetch(`/api/curriculum?age=${encodeURIComponent(ageRange)}`);
            const data = await res.json();
            if (data.success) {
                setStages(data.data);
            }
        } catch (error) {
            console.error('Error fetching stages:', error);
        } finally {
            setLoading(false);
        }
    }, [locale]);

    useEffect(() => {
        fetchCategories();

        const savedAge = sessionStorage.getItem('selectedAgeData');
        if (savedAge) {
            try {
                setSelectedAge(JSON.parse(savedAge));
            } catch (error) {
                console.error('Error parsing saved age data:', error);
            }
        }
    }, [fetchCategories]);

    useEffect(() => {
        if (selectedAge) {
            fetchStages(selectedAge);
        }
    }, [selectedAge, fetchStages]);

    const handleStageClick = useCallback((stage: CurriculumStage) => {
        // console.log('Stage clicked:', stage); 
        setSelectedStage(stage);
        setShowStageModal(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setShowStageModal(false);
        setSelectedStage(null);
    }, []);

    const handleEnroll = useCallback(async (stage: CurriculumStage) => {
        try {
            // استخراج البيانات المطلوبة من الـ stage
            const ageRange = typeof stage.age_range === 'object'
                ? (locale === 'ar' ? stage.age_range.ar : stage.age_range.en)
                : stage.age_range;

            const languageType = typeof stage.language_type === 'object'
                ? (locale === 'ar' ? stage.language_type.ar : stage.language_type.en)
                : stage.language_type;

            const stageTitle = locale === 'ar' ? stage.title_ar : stage.title_en;

            const res = await fetch('/api/enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stageId: stage._id,
                    stageTitle: stageTitle,
                    ageRange: ageRange,
                    platform: stage.platform,
                    languageType: languageType,
                    duration: stage.duration,
                    studentName: 'طالب جديد', 
                    phoneNumber: 'سيتم تقديمه عبر الواتساب',
                    message: `أرغب في التسجيل في مرحلة ${stageTitle} للفئة العمرية ${ageRange}`
                }),
            });

            const data = await res.json();

            if (data.success) {
                // فتح الواتساب في نافذة جديدة
                window.open(data.data.whatsappUrl, '_blank', 'noopener,noreferrer');

                // رسالة نجاح للمستخدم
                // alert(t('curriculum.enrollmentSuccess') || 'تم فتح الواتساب، يرجى إكمال عملية التسجيل مع المسؤول');
            } else {
                // alert(t('curriculum.enrollmentError') || 'حدث خطأ أثناء التسجيل');
            }
        } catch (error) {
            console.error('Error enrolling:', error);
            // alert(t('curriculum.enrollmentError') || 'حدث خطأ أثناء التسجيل');
        }
    }, [t, locale]);

    const changeAgeGroup = useCallback(() => {
        sessionStorage.removeItem('ageSelected');
        sessionStorage.removeItem('selectedAge');
        sessionStorage.removeItem('selectedAgeData');
        setSelectedAge(null);
        setStages([]);
        setShowStageModal(false);
        setSelectedStage(null);
    }, []);

    const getDisplayAgeRange = useCallback((ageRange: AgeRange | string) => {
        if (typeof ageRange === 'object') {
            return locale === 'ar' ? ageRange.ar : ageRange.en;
        }
        return ageRange;
    }, [locale]);

    if (loading && !selectedAge) {
        return (
            <section className="min-h-screen bg-gradient-to-br from-white to-IcyBreeze dark:from-darkmode dark:to-dark_input py-16">
                <div className="container mx-auto px-4">
                    <div className="flex justify-center items-center h-48">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="min-h-screen bg-gradient-to-br from-white to-IcyBreeze dark:from-darkmode dark:to-dark_input py-16 mt-10">
            {/* Age Selection Modal */}
            {!selectedAge && (
                <AgeModal
                    onAgeSelect={setSelectedAge}
                    categories={categories}
                />
            )}

            {/* Main Timeline */}
            {selectedAge && stages.length > 0 && (
                <div className="container mx-auto px-4">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-3 bg-white dark:bg-darkmode rounded-xl px-4 py-2 shadow-md border border-PowderBlueBorder dark:border-dark_border mb-4">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <span className="text-sm text-SlateBlueText dark:text-darktext">
                                {t('curriculum.selectedAge') || "Age Group"}:
                            </span>
                            <span className="font-bold text-primary text-sm">
                                {getDisplayAgeRange(selectedAge.age_range)}
                            </span>
                            <button
                                onClick={changeAgeGroup}
                                className="text-xs bg-IcyBreeze dark:bg-dark_input text-SlateBlueText dark:text-darktext px-2 py-1 rounded-full hover:bg-primary hover:text-white transition-colors"
                            >
                                {t('common.change') || "Change"}
                            </button>
                        </div>

                        <h1 className="text-3xl font-bold text-MidnightNavyText dark:text-white mb-4 bg-gradient-to-r from-primary to-ElectricAqua bg-clip-text text-transparent">
                            {t('curriculum.learningJourney') || "Coding Learning Journey"}
                        </h1>
                        <p className="text-lg text-SlateBlueText dark:text-darktext max-w-2xl mx-auto leading-relaxed">
                            {t('curriculum.pathDescription') || "Follow this step-by-step journey to master coding skills."}
                        </p>
                    </div>

                    {/* Timeline with Animation */}
                    <div className="relative" ref={timelineRef}>
                        <TimelineAnimation stagesCount={stages.length} />

                        {/* Stages */}
                        <div className="space-y-16">
                            {stages.map((stage, index) => (
                                <StageCard
                                    key={stage._id || index}
                                    stage={stage}
                                    index={index}
                                    totalStages={stages.length}
                                    locale={locale}
                                    t={t}
                                    onStageClick={handleStageClick}
                                />
                            ))}
                        </div>

                        {/* Completion Celebration */}
                        <div className="relative left-[50%] translate-x-[-50%] text-center mt-12">
                            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-primary to-ElectricAqua text-white px-6 py-3 rounded-xl shadow-lg">
                                <Rocket className="w-5 h-5" />
                                <span className="text-sm font-semibold">
                                    {t('curriculum.journeyComplete') || "Complete all stages to become a coding master!"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading State for Stages */}
            {selectedAge && loading && (
                <div className="container mx-auto px-4 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-3"></div>
                    <p className="text-sm text-SlateBlueText dark:text-darktext">
                        {t('curriculum.loadingStages') || "Loading learning stages..."}
                    </p>
                </div>
            )}

            {/* No Stages Available */}
            {selectedAge && !loading && stages.length === 0 && (
                <div className="container mx-auto px-4 text-center">
                    <div className="bg-white dark:bg-darkmode rounded-2xl p-8 shadow-lg border border-PowderBlueBorder dark:border-dark_border max-w-md mx-auto">
                        <Code className="w-12 h-12 text-SlateBlueText dark:text-darktext mx-auto mb-3" />
                        <h3 className="text-xl font-bold text-MidnightNavyText dark:text-white mb-3">
                            {t('curriculum.noStagesTitle') || "No Learning Stages Available"}
                        </h3>
                        <p className="text-SlateBlueText dark:text-darktext mb-4 text-sm">
                            {t('curriculum.noStagesDescription') || "We're currently preparing the learning path for this age group."}
                        </p>
                        <button
                            onClick={changeAgeGroup}
                            className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-semibold transition-colors text-sm"
                        >
                            {t('curriculum.tryDifferentAge') || "Try Different Age Group"}
                        </button>
                    </div>
                </div>
            )}

            {/* Stage Details Modal */}
            {showStageModal && selectedStage && (
                <StageModal
                    stage={selectedStage}
                    onClose={handleCloseModal}
                    onEnroll={handleEnroll}
                    t={t}
                    locale={locale}
                />
            )}
        </section>
    );
};

export default CurriculumTimeline;