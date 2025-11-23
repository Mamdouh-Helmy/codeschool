'use client';
import { memo, useCallback, useRef } from 'react';
import { Clock, BookOpen, Code, Rocket } from 'lucide-react';
import PlatformIcon from './PlatformIcon';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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

interface StageCardProps {
    stage: CurriculumStage;
    index: number;
    totalStages: number;
    locale: string;
    t: (key: string) => string;
    onStageClick: (stage: CurriculumStage) => void;
}

const StageCard = memo(({ stage, index, totalStages, locale, t, onStageClick }: StageCardProps) => {
    const cardRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        if (cardRef.current) {
            gsap.fromTo(cardRef.current, 
                {
                    opacity: 0,
                    y: 50,
                    scale: 0.9
                },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.8,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: cardRef.current,
                        start: "top 80%",
                        end: "bottom 20%",
                        toggleActions: "play none none reverse"
                    }
                }
            );
        }
    }, { scope: cardRef });

    const getLanguageType = useCallback(() => {
        return typeof stage.language_type === 'object'
            ? (locale === 'ar' ? (stage.language_type as LanguageType).ar : (stage.language_type as LanguageType).en)
            : stage.language_type;
    }, [stage.language_type, locale]);

    const isBlockLanguage = useCallback(() => {
        return stage.language_type === 'Block' ||
            (typeof stage.language_type === 'object' && (stage.language_type as LanguageType).en === 'Block');
    }, [stage.language_type]);

    const handleClick = useCallback(() => {
        console.log('Card clicked:', stage.title_en || stage.title_ar);
        onStageClick(stage);
    }, [onStageClick, stage]);

    return (
        <div
            ref={cardRef}
            data-stage-id={stage._id}
            className={`stage-item timeline-node relative flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
                } transition-all duration-500 ease-out`}
        >
            {/* Content Card */}
            <div className={`md:w-[45%] w-[100%] ${index % 2 === 0 ? 'pr-8' : 'pl-8'}`}>
                <div
                    onClick={handleClick}
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

            {/* Timeline Node */}
            <div className="absolute hidden md:flex left-1/2 transform -translate-x-1/2 w-16 h-16 bg-white dark:bg-darkmode border-3 border-primary rounded-full items-center justify-center z-10 shadow-lg transition-all duration-300 hover:scale-105">
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

            {/* Connecting Line */}
            {index < totalStages - 1 && (
                <div className="timeline-connector absolute left-1/2 top-full transform -translate-x-1/2 w-1 h-20 bg-gradient-to-b from-primary to-Aquamarine rounded-full" />
            )}
        </div>
    );
});

StageCard.displayName = 'StageCard';

export default StageCard;