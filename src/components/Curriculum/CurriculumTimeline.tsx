'use client';
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Play, Code, Blocks, Rocket, ExternalLink, Clock, BookOpen, X, Sparkles, Users } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import AgeModal from './AgeModal';
import { useLocale } from '@/app/context/LocaleContext';

// Memoized Components for better performance
const PlatformIcon = memo(({ platform }) => {
    const platformIcons = {
        'Code.org': <Code className="w-5 h-5" />,
        'Scratch': <Blocks className="w-5 h-5" />,
        'Replit': <Play className="w-5 h-5" />,
        'Python': <Code className="w-5 h-5" />,
        'JavaScript': <Code className="w-5 h-5" />,
        'HTML/CSS': <Code className="w-5 h-5" />,
        'Unity': <Rocket className="w-5 h-5" />,
        'default': <Code className="w-5 h-5" />
    };
    return platformIcons[platform] || platformIcons.default;
});

PlatformIcon.displayName = 'PlatformIcon';

const StageCard = memo(({ stage, index, totalStages, locale, t, onStageClick, isVisible }) => {
    const getLanguageType = useCallback(() => {
        return typeof stage.language_type === 'object'
            ? (locale === 'ar' ? stage.language_type.ar : stage.language_type.en)
            : stage.language_type;
    }, [stage.language_type, locale]);

    const isBlockLanguage = useCallback(() => {
        return stage.language_type === 'Block' ||
            (typeof stage.language_type === 'object' && stage.language_type.en === 'Block');
    }, [stage.language_type]);

    return (
        <div
            data-stage-id={stage._id}
            className={`stage-item relative flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
                } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                } transition-all duration-500 ease-out`}
        >
            {/* Content Card - زيادة العرض وتقريب من الخط */}
            <div className={`w-[45%]  ${index % 2 === 0 ? 'pr-8' : 'pl-8'}`}>
                <div
                    onClick={() => onStageClick(stage)}
                    className="group cursor-pointer bg-white dark:bg-darkmode rounded-2xl shadow-lg border border-PowderBlueBorder/30 dark:border-dark_border p-6 hover:shadow-xl hover:border-primary/20 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden"
                >
                    {/* Stage Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary to-ElectricAqua rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                                <PlatformIcon platform={stage.platform} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-lg text-MidnightNavyText dark:text-white group-hover:text-primary transition-colors truncate">
                                    {locale === 'ar' ? stage.title_ar : stage.title_en}
                                </h3>
                                <p className="text-sm text-SlateBlueText dark:text-darktext mt-1 truncate">
                                    {stage.platform} • {getLanguageType()}
                                </p>
                            </div>
                        </div>

                        {/* Language Type Badge */}
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm flex-shrink-0 ml-3 ${isBlockLanguage()
                            ? 'bg-Aquamarine/20 text-white border border-Aquamarine/20'
                            : 'bg-ElectricAqua/20 text-white border border-ElectricAqua/20'
                            }`}>
                            {getLanguageType()}
                        </span>
                    </div>

                    {/* Stage Details */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="flex items-center gap-2 text-SlateBlueText dark:text-darktext bg-IcyBreeze dark:bg-dark_input p-2 rounded-lg text-xs">
                            <Clock className="w-3 h-3 text-primary flex-shrink-0" />
                            <span className="font-medium truncate">{stage.duration}</span>
                        </div>
                        <div className="flex items-center gap-2 text-SlateBlueText dark:text-darktext bg-IcyBreeze dark:bg-dark_input p-2 rounded-lg text-xs">
                            <BookOpen className="w-3 h-3 text-Aquamarine flex-shrink-0" />
                            <span className="font-medium">{stage.lessons_count} {t('curriculum.lessons') || "L"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-SlateBlueText dark:text-darktext bg-IcyBreeze dark:bg-dark_input p-2 rounded-lg text-xs">
                            <Code className="w-3 h-3 text-ElectricAqua flex-shrink-0" />
                            <span className="font-medium">{stage.projects_count} {t('curriculum.projects') || "P"}</span>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-IcyBreeze dark:bg-dark_input rounded-full h-2 mb-8 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-primary to-Aquamarine h-2 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${((index + 1) / totalStages) * 100}%` }}
                        />
                    </div>

                    {/* Click Hint */}
                    <div className="absolute bottom-4 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-primary text-white px-2 py-1 rounded-full text-xs font-medium">
                            {t('curriculum.clickForDetails') || "Details"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline Node - تقريب من الـ Card */}
            <div className={`absolute left-1/2 transform -translate-x-1/2 w-16 h-16 bg-white dark:bg-darkmode border-3 border-primary rounded-full flex items-center justify-center z-10 shadow-lg transition-all duration-300 hover:scale-105 ${isVisible ? 'scale-100' : 'scale-0'
                }`}>
                {index === totalStages - 1 ? (
                    <div className="relative">
                        <Rocket className="w-6 h-6 text-primary" />
                    </div>
                ) : (
                    <span className="text-lg font-bold text-primary">
                        {index + 1}
                    </span>
                )}
            </div>

            {/* Connecting Line - تقصير المسافة */}
            {index < totalStages - 1 && (
                <div className="absolute left-1/2 top-full transform -translate-x-1/2 w-1 h-20 bg-gradient-to-b from-primary to-Aquamarine rounded-full" />
            )}
        </div>
    );
});

StageCard.displayName = 'StageCard';

const CurriculumTimeline = () => {
    const { t } = useI18n();
    const { locale } = useLocale();
    const [selectedAge, setSelectedAge] = useState(null);
    const [stages, setStages] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStage, setSelectedStage] = useState(null);
    const [showStageModal, setShowStageModal] = useState(false);
    const [visibleStages, setVisibleStages] = useState(new Set());
    const observerRef = useRef(null);

    // Debounced fetch functions
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

    const fetchStages = useCallback(async (ageCategory) => {
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
            setSelectedAge(JSON.parse(savedAge));
        }
    }, [fetchCategories]);

    useEffect(() => {
        if (selectedAge) {
            fetchStages(selectedAge);
        }
    }, [selectedAge, fetchStages]);

    // Optimized Intersection Observer
    useEffect(() => {
        if (stages.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const stageId = entry.target.getAttribute('data-stage-id');
                        setVisibleStages(prev => new Set([...prev, stageId]));
                    }
                });
            },
            {
                threshold: 0.1,
                rootMargin: '50px 0px 50px 0px'
            }
        );

        const stageElements = document.querySelectorAll('.stage-item');
        stageElements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, [stages]);

    const handleStageClick = useCallback((stage) => {
        setSelectedStage(stage);
        setShowStageModal(true);
    }, []);

    const handleEnroll = useCallback(async (stageId) => {
        try {
            const res = await fetch('/api/enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stageId }),
            });

            if (res.ok) {
                alert(t('curriculum.enrollmentSuccess') || 'Enrollment successful!');
                setShowStageModal(false);
            }
        } catch (error) {
            console.error('Error enrolling:', error);
            alert(t('curriculum.enrollmentError') || 'Error during enrollment');
        }
    }, [t]);

    const changeAgeGroup = useCallback(() => {
        sessionStorage.removeItem('ageSelected');
        sessionStorage.removeItem('selectedAge');
        sessionStorage.removeItem('selectedAgeData');
        setSelectedAge(null);
        setStages([]);
    }, []);

    const getDisplayAgeRange = useCallback((ageRange) => {
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

                    {/* Timeline */}
                    <div className="relative">
                        {/* Main Timeline Line - زيادة السماكة */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary via-ElectricAqua to-Aquamarine transform -translate-x-1/2 rounded-full shadow-md" />

                        {/* Stages - تقليل المسافة بين الـ stages */}
                        <div className="space-y-16">
                            {stages.map((stage, index) => (
                                <StageCard
                                    key={stage._id}
                                    stage={stage}
                                    index={index}
                                    totalStages={stages.length}
                                    locale={locale}
                                    t={t}
                                    onStageClick={handleStageClick}
                                    isVisible={visibleStages.has(stage._id)}
                                />
                            ))}
                        </div>

                        {/* Completion Celebration */}
                        <div className=" relative left-[50%] translate-x-[-50%] text-center mt-12">
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
                    onClose={() => setShowStageModal(false)}
                    onEnroll={handleEnroll}
                    t={t}
                    locale={locale}
                />
            )}
        </section>
    );
};

// Optimized StageModal Component - زيادة العرض
const StageModal = memo(({ stage, onClose, onEnroll, t, locale }) => {
    const [isClosing, setIsClosing] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300);
    }, [onClose]);

    // بيانات تفاصيل رحلة التعلم
    const learningJourney = {
        overview: {
            title: locale === 'ar' ? 'نظرة عامة' : 'Overview',
            icon: '📋',
            items: [
                {
                    title: locale === 'ar' ? 'المستوى' : 'Level',
                    value: stage.difficulty_level || 'Beginner',
                    color: stage.difficulty_level === 'Beginner'
                        ? 'text-green-600'
                        : stage.difficulty_level === 'Intermediate'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                },
                {
                    title: locale === 'ar' ? 'المدة' : 'Duration',
                    value: stage.duration,
                    color: 'text-blue-600'
                },
                {
                    title: locale === 'ar' ? 'نوع البرمجة' : 'Programming Type',
                    value: typeof stage.language_type === 'object'
                        ? (locale === 'ar' ? stage.language_type.ar : stage.language_type.en)
                        : stage.language_type,
                    color: 'text-purple-600'
                },
                {
                    title: locale === 'ar' ? 'المنصة' : 'Platform',
                    value: stage.platform,
                    color: 'text-indigo-600'
                }
            ]
        },
        curriculum: {
            title: locale === 'ar' ? 'المنهج الدراسي' : 'Curriculum',
            icon: '📚',
            items: [
                {
                    title: locale === 'ar' ? 'الدروس' : 'Lessons',
                    count: stage.lessons_count,
                    description: locale === 'ar' ? 'درس تفاعلي' : 'Interactive Lessons'
                },
                {
                    title: locale === 'ar' ? 'المشاريع' : 'Projects',
                    count: stage.projects_count,
                    description: locale === 'ar' ? 'مشروع عملي' : 'Hands-on Projects'
                },
                {
                    title: locale === 'ar' ? 'التحديات' : 'Challenges',
                    count: Math.floor(stage.lessons_count * 1.5),
                    description: locale === 'ar' ? 'تحدي برمجي' : 'Coding Challenges'
                },
                {
                    title: locale === 'ar' ? 'الاختبارات' : 'Quizzes',
                    count: Math.floor(stage.lessons_count / 2),
                    description: locale === 'ar' ? 'اختبار تقييمي' : 'Assessment Quizzes'
                }
            ]
        },
        skills: {
            title: locale === 'ar' ? 'المهارات المكتسبة' : 'Skills You\'ll Learn',
            icon: '🎯',
            items: [
                {
                    skill: locale === 'ar' ? 'التفكير المنطقي' : 'Logical Thinking',
                    progress: 95
                },
                {
                    skill: locale === 'ar' ? 'حل المشكلات' : 'Problem Solving',
                    progress: 90
                },
                {
                    skill: locale === 'ar' ? 'الإبداع والتعبير' : 'Creativity & Expression',
                    progress: 85
                },
                {
                    skill: locale === 'ar' ? 'العمل الجماعي' : 'Team Collaboration',
                    progress: 75
                },
                {
                    skill: locale === 'ar' ? 'التفكير الحسابي' : 'Computational Thinking',
                    progress: 92
                }
            ]
        },
        timeline: {
            title: locale === 'ar' ? 'خطة التعلم' : 'Learning Plan',
            icon: '⏱️',
            weeks: [
                {
                    week: 1,
                    title: locale === 'ar' ? 'المقدمة والأساسيات' : 'Introduction & Basics',
                    topics: locale === 'ar'
                        ? ['مقدمة في البرمجة', 'الواجهة الأساسية', 'أول برنامج']
                        : ['Programming Introduction', 'Basic Interface', 'First Program']
                },
                {
                    week: 2,
                    title: locale === 'ar' ? 'المفاهيم الأساسية' : 'Core Concepts',
                    topics: locale === 'ar'
                        ? ['المتغيرات', 'الحلقات', 'الشروط']
                        : ['Variables', 'Loops', 'Conditions']
                },
                {
                    week: 3,
                    title: locale === 'ar' ? 'المشاريع العملية' : 'Practical Projects',
                    topics: locale === 'ar'
                        ? ['مشروع لعبة بسيطة', 'التفاعل مع المستخدم']
                        : ['Simple Game Project', 'User Interaction']
                },
                {
                    week: 4,
                    title: locale === 'ar' ? 'التطوير والتوسع' : 'Development & Expansion',
                    topics: locale === 'ar'
                        ? ['إضافة المؤثرات', 'تحسين الأداء', 'مشروع التخرج']
                        : ['Adding Effects', 'Performance Optimization', 'Graduation Project']
                }
            ]
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {learningJourney.overview.items.map((item, index) => (
                                <div key={index} className="bg-IcyBreeze dark:bg-dark_input rounded-lg p-4 text-center">
                                    <p className="text-sm text-SlateBlueText dark:text-darktext mb-1">
                                        {item.title}
                                    </p>
                                    <p className={`font-semibold ${item.color}`}>
                                        {item.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="bg-white dark:bg-darkmode rounded-lg p-4 border border-PowderBlueBorder dark:border-dark_border">
                            <h4 className="font-semibold text-MidnightNavyText dark:text-white mb-3">
                                {locale === 'ar' ? 'وصف المرحلة' : 'Stage Description'}
                            </h4>
                            <p className="text-SlateBlueText dark:text-darktext text-sm leading-relaxed">
                                {locale === 'ar' ? stage.description_ar : stage.description_en}
                            </p>
                        </div>
                    </div>
                );

            case 'curriculum':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {learningJourney.curriculum.items.map((item, index) => (
                                <div key={index} className="bg-gradient-to-br from-primary/5 to-ElectricAqua/5 rounded-lg p-4 text-center border border-PowderBlueBorder/30">
                                    <div className="text-2xl font-bold text-primary mb-1">
                                        {item.count}
                                    </div>
                                    <p className="font-semibold text-MidnightNavyText dark:text-white text-sm">
                                        {item.title}
                                    </p>
                                    <p className="text-xs text-SlateBlueText dark:text-darktext">
                                        {item.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="bg-IcyBreeze dark:bg-dark_input rounded-lg p-4">
                            <h4 className="font-semibold text-MidnightNavyText dark:text-white mb-2">
                                {locale === 'ar' ? 'محتوى التعلم' : 'Learning Content'}
                            </h4>
                            <ul className="text-sm text-SlateBlueText dark:text-darktext space-y-1">
                                <li>• {locale === 'ar' ? 'فيديوهات تعليمية' : 'Instructional Videos'}</li>
                                <li>• {locale === 'ar' ? 'تمارين تفاعلية' : 'Interactive Exercises'}</li>
                                <li>• {locale === 'ar' ? 'مشاريع عملية' : 'Hands-on Projects'}</li>
                                <li>• {locale === 'ar' ? 'تقييمات دورية' : 'Regular Assessments'}</li>
                            </ul>
                        </div>
                    </div>
                );

            case 'skills':
                return (
                    <div className="space-y-4">
                        {learningJourney.skills.items.map((skill, index) => (
                            <div key={index} className="bg-white dark:bg-darkmode rounded-lg p-4 border border-PowderBlueBorder dark:border-dark_border">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-MidnightNavyText dark:text-white text-sm">
                                        {skill.skill}
                                    </span>
                                    <span className="text-xs text-SlateBlueText dark:text-darktext">
                                        {skill.progress}%
                                    </span>
                                </div>
                                <div className="w-full bg-IcyBreeze dark:bg-dark_input rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-primary to-Aquamarine h-2 rounded-full transition-all duration-1000"
                                        style={{ width: `${skill.progress}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'timeline':
                return (
                    <div className="space-y-4">
                        {learningJourney.timeline.weeks.map((week, index) => (
                            <div key={index} className="bg-white dark:bg-darkmode rounded-lg p-4 border border-PowderBlueBorder dark:border-dark_border">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary to-ElectricAqua rounded-full flex items-center justify-center text-white font-bold text-sm">
                                        {week.week}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-MidnightNavyText dark:text-white text-sm mb-2">
                                            {week.title}
                                        </h4>
                                        <ul className="text-xs text-SlateBlueText dark:text-darktext space-y-1">
                                            {week.topics.map((topic, topicIndex) => (
                                                <li key={topicIndex} className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                                    {topic}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isClosing ? 'bg-black/0 backdrop-blur-0' : 'bg-black/60 backdrop-blur-sm'
            }`}>
            <div className={`relative bg-white dark:bg-darkmode rounded-2xl shadow-xl max-w-6xl w-full mx-auto border border-PowderBlueBorder dark:border-dark_border transform transition-all duration-300 max-h-[95vh] overflow-hidden flex flex-col ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
                }`}>

                {/* Header */}
                <div className="relative p-6 border-b border-PowderBlueBorder/50 dark:border-dark_border bg-gradient-to-r from-primary to-ElectricAqua text-white rounded-t-2xl">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xl font-bold mb-1 truncate">
                                    {locale === 'ar' ? stage.title_ar : stage.title_en}
                                </h3>
                                <p className="text-white/90 text-sm truncate">
                                    {stage.platform} • {typeof stage.language_type === 'object'
                                        ? (locale === 'ar' ? stage.language_type.ar : stage.language_type.en)
                                        : stage.language_type} • {stage.duration}
                                </p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-105 flex-shrink-0 ml-4"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Animated Background */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white to-transparent animate-pulse"></div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-6">
                        <div className="grid lg:grid-cols-4 gap-6">

                            {/* Main Content - زيادة العرض */}
                            <div className="lg:col-span-3">
                                {stage.media_url && (
                                    <div className="mb-6 rounded-xl overflow-hidden shadow-lg">
                                        {stage.media_url.includes('youtube') || stage.media_url.includes('vimeo') ? (
                                            <div className="aspect-video bg-gray-100 dark:bg-dark_input rounded-xl">
                                                <iframe
                                                    src={stage.media_url}
                                                    className="w-full h-full rounded-xl"
                                                    allowFullScreen
                                                    loading="lazy"
                                                />
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <img
                                                    src={stage.media_url}
                                                    alt={locale === 'ar' ? stage.title_ar : stage.title_en}
                                                    className={`w-full h-64 object-cover rounded-xl transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                                                        }`}
                                                    onLoad={() => setImageLoaded(true)}
                                                />
                                                {!imageLoaded && (
                                                    <div className="absolute inset-0 bg-IcyBreeze dark:bg-dark_input rounded-xl animate-pulse" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Learning Journey Tabs */}
                                <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border overflow-hidden">
                                    {/* Tabs Header */}
                                    <div className="flex border-b border-PowderBlueBorder dark:border-dark_border">
                                        {Object.entries(learningJourney).map(([key, tab]) => (
                                            <button
                                                key={key}
                                                onClick={() => setActiveTab(key)}
                                                className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === key
                                                    ? 'bg-primary text-white'
                                                    : 'text-SlateBlueText dark:text-darktext hover:bg-IcyBreeze dark:hover:bg-dark_input'
                                                    }`}
                                            >
                                                <span>{tab.icon}</span>
                                                {tab.title}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tabs Content */}
                                    <div className="p-4">
                                        {renderTabContent()}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-4">
                                {/* Quick Stats */}
                                <div className="bg-white dark:bg-darkmode rounded-xl shadow-md border border-PowderBlueBorder dark:border-dark_border p-4">
                                    <h4 className="font-semibold text-MidnightNavyText dark:text-white mb-3">
                                        {t('curriculum.stageOverview') || "Stage Overview"}
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-IcyBreeze dark:bg-dark_input rounded-lg">
                                            <span className="text-SlateBlueText dark:text-darktext text-sm">
                                                {t('curriculum.difficulty') || "Difficulty"}
                                            </span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${stage.difficulty_level === 'Beginner'
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                : stage.difficulty_level === 'Intermediate'
                                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                }`}>
                                                {stage.difficulty_level || 'Beginner'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="text-center p-3 bg-primary/5 rounded-lg">
                                                <BookOpen className="w-6 h-6 text-primary mx-auto mb-1" />
                                                <div className="text-lg font-bold text-MidnightNavyText dark:text-white">
                                                    {stage.lessons_count}
                                                </div>
                                                <div className="text-xs text-SlateBlueText dark:text-darktext">
                                                    {t('curriculum.lessons') || "Lessons"}
                                                </div>
                                            </div>
                                            <div className="text-center p-3 bg-Aquamarine/5 rounded-lg">
                                                <Code className="w-6 h-6 text-Aquamarine mx-auto mb-1" />
                                                <div className="text-lg font-bold text-MidnightNavyText dark:text-white">
                                                    {stage.projects_count}
                                                </div>
                                                <div className="text-xs text-SlateBlueText dark:text-darktext">
                                                    {t('curriculum.projects') || "Projects"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* CTA Section */}
                                <div className="bg-gradient-to-br from-primary to-ElectricAqua rounded-xl p-4 text-white text-center shadow-lg">
                                    <Rocket className="w-8 h-8 mx-auto mb-2" />
                                    <h4 className="font-bold mb-1">
                                        {t('curriculum.readyToStart') || "Ready to Start?"}
                                    </h4>
                                    <p className="text-white/90 mb-3 text-xs">
                                        {t('curriculum.enrollDescription') || "Begin your coding journey with this stage"}
                                    </p>

                                    <button
                                        onClick={() => onEnroll(stage._id)}
                                        className="w-full bg-white text-primary hover:bg-white/90 py-2 px-4 rounded-lg font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                    >
                                        <Rocket className="w-4 h-4" />
                                        {t('curriculum.enrollNow') || "Enroll Now"}
                                    </button>

                                    <p className="text-white/70 text-xs mt-2">
                                        {t('curriculum.freeTrial') || "Free trial available"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

StageModal.displayName = 'StageModal';

export default CurriculumTimeline;