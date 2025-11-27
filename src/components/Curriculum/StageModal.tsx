'use client';
import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { X, Rocket, BookOpen, Code, Clock, Sparkles, Users } from 'lucide-react';
import PlatformIcon from './PlatformIcon';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface LanguageType {
    value: string;
    en: string;
    ar: string;
}

interface CurriculumStage {
    _id?: string;
    age_range: any;
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

interface StageModalProps {
    stage: CurriculumStage;
    onClose: () => void;
    onEnroll: (stage: CurriculumStage) => void;
    t: (key: string) => string;
    locale: string;
}

const StageModal = memo(({ stage, onClose, onEnroll, t, locale }: StageModalProps) => {
    const [isClosing, setIsClosing] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const modalRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        if (modalRef.current && contentRef.current) {
            gsap.fromTo(modalRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.3 }
            );

            gsap.fromTo(contentRef.current,
                {
                    opacity: 0,
                    scale: 0.8,
                    y: 50
                },
                {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    duration: 0.5,
                    ease: "back.out(1.7)"
                }
            );
        }
    }, { scope: modalRef });

    const handleClose = useCallback(() => {
        setIsClosing(true);
        if (contentRef.current) {
            gsap.to(contentRef.current, {
                opacity: 0,
                scale: 0.8,
                y: 50,
                duration: 0.3,
                onComplete: onClose
            });
        } else {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [handleClose]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

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
                        ? (locale === 'ar' ? (stage.language_type as LanguageType).ar : (stage.language_type as LanguageType).en)
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            {learningJourney.overview.items.map((item, index) => (
                                <div key={index} className="bg-IcyBreeze dark:bg-dark_input rounded-lg p-3 sm:p-4 text-center">
                                    <p className="text-xs sm:text-sm text-SlateBlueText dark:text-darktext mb-1">
                                        {item.title}
                                    </p>
                                    <p className={`font-semibold text-sm sm:text-base ${item.color}`}>
                                        {item.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="bg-white dark:bg-darkmode rounded-lg p-4 border border-PowderBlueBorder dark:border-dark_border">
                            <h4 className="font-semibold text-MidnightNavyText dark:text-white mb-3 text-sm sm:text-base">
                                {locale === 'ar' ? 'وصف المرحلة' : 'Stage Description'}
                            </h4>
                            <p className="text-SlateBlueText dark:text-darktext text-xs sm:text-sm leading-relaxed">
                                {locale === 'ar' ? stage.description_ar : stage.description_en}
                            </p>
                        </div>
                    </div>
                );

            case 'curriculum':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
                            {learningJourney.curriculum.items.map((item, index) => (
                                <div key={index} className="bg-gradient-to-br from-primary/5 to-ElectricAqua/5 rounded-lg p-3 sm:p-4 text-center border border-PowderBlueBorder/30">
                                    <div className="text-xl sm:text-2xl font-bold text-primary mb-1">
                                        {item.count}
                                    </div>
                                    <p className="font-semibold text-MidnightNavyText dark:text-white text-xs sm:text-sm">
                                        {item.title}
                                    </p>
                                    <p className="text-xs text-SlateBlueText dark:text-darktext">
                                        {item.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="bg-IcyBreeze dark:bg-dark_input rounded-lg p-4">
                            <h4 className="font-semibold text-MidnightNavyText dark:text-white mb-2 text-sm sm:text-base">
                                {locale === 'ar' ? 'محتوى التعلم' : 'Learning Content'}
                            </h4>
                            <ul className="text-xs sm:text-sm text-SlateBlueText dark:text-darktext space-y-1">
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
                    <div className="space-y-3 sm:space-y-4">
                        {learningJourney.skills.items.map((skill, index) => (
                            <div key={index} className="bg-white dark:bg-darkmode rounded-lg p-3 sm:p-4 border border-PowderBlueBorder dark:border-dark_border">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-MidnightNavyText dark:text-white text-xs sm:text-sm">
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
                    <div className="space-y-3 sm:space-y-4">
                        {learningJourney.timeline.weeks.map((week, index) => (
                            <div key={index} className="bg-white dark:bg-darkmode rounded-lg p-3 sm:p-4 border border-PowderBlueBorder dark:border-dark_border">
                                <div className="flex items-start gap-3 sm:gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-ElectricAqua rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                                        {week.week}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-MidnightNavyText dark:text-white text-xs sm:text-sm mb-2">
                                            {week.title}
                                        </h4>
                                        <ul className="text-xs text-SlateBlueText dark:text-darktext space-y-1">
                                            {week.topics.map((topic, topicIndex) => (
                                                <li key={topicIndex} className="flex items-center gap-2 truncate">
                                                    <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0"></div>
                                                    <span className="truncate">{topic}</span>
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

    const getLanguageType = () => {
        return typeof stage.language_type === 'object'
            ? (locale === 'ar' ? (stage.language_type as LanguageType).ar : (stage.language_type as LanguageType).en)
            : stage.language_type;
    };

    return (
        <div
            ref={modalRef}
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
        >
            <div
                ref={contentRef}
                className="relative bg-white dark:bg-darkmode rounded-xl sm:rounded-2xl shadow-xl w-full max-w-6xl mx-auto border border-PowderBlueBorder dark:border-dark_border max-h-[95vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative p-4 sm:p-6 border-b border-PowderBlueBorder/50 dark:border-dark_border bg-gradient-to-r from-primary to-ElectricAqua text-white rounded-t-xl sm:rounded-t-2xl">
                    <div className="relative z-10">
                        <div className="flex items-start sm:items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg sm:text-xl font-bold mb-1 truncate">
                                    {locale === 'ar' ? stage.title_ar : stage.title_en}
                                </h3>
                                <p className="text-white/90 text-xs sm:text-sm truncate">
                                    {stage.platform} • {getLanguageType()} • {stage.duration}
                                </p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-1 sm:p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-105 flex-shrink-0 mt-1 sm:mt-0"
                            >
                                <X className="w-4 h-4 sm:w-5 sm:h-5" />
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
                    <div className="p-3 sm:p-4 lg:p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">

                            {/* Main Content */}
                            <div className="lg:col-span-3 space-y-4 sm:space-y-6">
                                {stage.media_url && (
                                    <div className="rounded-xl overflow-hidden shadow-lg">
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
                                                    className={`w-full h-48 sm:h-64 object-cover rounded-xl transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
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
                                    <div className="flex overflow-x-auto border-b border-PowderBlueBorder dark:border-dark_border">
                                        {Object.entries(learningJourney).map(([key, tab]) => (
                                            <button
                                                key={key}
                                                onClick={() => setActiveTab(key)}
                                                className={`flex-1 min-w-[100px] sm:min-w-0 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 ${activeTab === key
                                                    ? 'bg-primary text-white'
                                                    : 'text-SlateBlueText dark:text-darktext hover:bg-IcyBreeze dark:hover:bg-dark_input'
                                                    }`}
                                            >
                                                <span className="text-xs sm:text-sm">{tab.icon}</span>
                                                <span className="truncate">{tab.title}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tabs Content */}
                                    <div className="p-3 sm:p-4">
                                        {renderTabContent()}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-3 sm:space-y-4">
                                {/* Quick Stats */}
                                <div className="bg-white dark:bg-darkmode rounded-xl shadow-md border border-PowderBlueBorder dark:border-dark_border p-3 sm:p-4">
                                    <h4 className="font-semibold text-MidnightNavyText dark:text-white mb-3 text-sm sm:text-base">
                                        {t('curriculum.stageOverview') || "Stage Overview"}
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-2 sm:p-3 bg-IcyBreeze dark:bg-dark_input rounded-lg">
                                            <span className="text-xs sm:text-sm text-SlateBlueText dark:text-darktext">
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

                                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                            <div className="text-center p-2 sm:p-3 bg-primary/5 rounded-lg">
                                                <BookOpen className="w-4 h-4 sm:w-6 sm:h-6 text-primary mx-auto mb-1" />
                                                <div className="text-base sm:text-lg font-bold text-MidnightNavyText dark:text-white">
                                                    {stage.lessons_count}
                                                </div>
                                                <div className="text-xs text-SlateBlueText dark:text-darktext">
                                                    {t('curriculum.lessons') || "Lessons"}
                                                </div>
                                            </div>
                                            <div className="text-center p-2 sm:p-3 bg-Aquamarine/5 rounded-lg">
                                                <Code className="w-4 h-4 sm:w-6 sm:h-6 text-Aquamarine mx-auto mb-1" />
                                                <div className="text-base sm:text-lg font-bold text-MidnightNavyText dark:text-white">
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
                                <div className="bg-gradient-to-br from-primary to-ElectricAqua rounded-xl p-3 sm:p-4 text-white text-center shadow-lg">
                                    <Rocket className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2" />
                                    <h4 className="font-bold mb-1 text-sm sm:text-base">
                                        {t('curriculum.readyToStart') || "Ready to Start?"}
                                    </h4>
                                    <p className="text-white/90 mb-3 text-xs">
                                        {t('curriculum.enrollDescription') || "Begin your coding journey with this stage"}
                                    </p>

                                    <button
                                        onClick={() => onEnroll(stage)}
                                        className="w-full bg-white text-primary hover:bg-white/90 py-2 px-3 sm:px-4 rounded-lg font-bold text-xs sm:text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                    >
                                        <Rocket className="w-3 h-3 sm:w-4 sm:h-4" />
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

export default StageModal;