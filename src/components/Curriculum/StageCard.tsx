'use client';
import { memo, useCallback } from 'react';
import { FaClock, FaBook, FaProjectDiagram, FaRocket } from 'react-icons/fa';
import { 
  FaCode, 
  FaPython,
  FaJs,
  FaHtml5,
  FaUnity
} from 'react-icons/fa';
import { 
  SiScratch, 
  SiReplit 
} from 'react-icons/si';

// Memoized Platform Icon Component
const PlatformIcon = memo(({ platform }) => {
  const platformIcons = {
    'Code.org': <FaCode className="w-5 h-5" />,
    'Scratch': <SiScratch className="w-5 h-5" />,
    'Replit': <SiReplit className="w-5 h-5" />,
    'Python': <FaPython className="w-5 h-5" />,
    'JavaScript': <FaJs className="w-5 h-5" />,
    'HTML/CSS': <FaHtml5 className="w-5 h-5" />,
    'Unity': <FaUnity className="w-5 h-5" />,
    'default': <FaCode className="w-5 h-5" />
  };
  return platformIcons[platform] || platformIcons.default;
});

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
        } transition-all duration-300 ease-out`}
    >
      {/* Content Card */}
      <div className={`w-[45%] ${index % 2 === 0 ? 'pr-8' : 'pl-8'}`}>
        <div
          onClick={() => onStageClick(stage)}
          className="group cursor-pointer bg-white dark:bg-darkmode rounded-2xl shadow-lg border border-PowderBlueBorder/30 dark:border-dark_border p-6 hover:shadow-xl hover:border-primary/20 transition-all duration-200 transform hover:-translate-y-1 relative overflow-hidden"
        >
          {/* Stage Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-ElectricAqua rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
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
              <FaClock className="w-3 h-3 text-primary flex-shrink-0" />
              <span className="font-medium truncate">{stage.duration}</span>
            </div>
            <div className="flex items-center gap-2 text-SlateBlueText dark:text-darktext bg-IcyBreeze dark:bg-dark_input p-2 rounded-lg text-xs">
              <FaBook className="w-3 h-3 text-Aquamarine flex-shrink-0" />
              <span className="font-medium">{stage.lessons_count} {t('curriculum.lessons') || "L"}</span>
            </div>
            <div className="flex items-center gap-2 text-SlateBlueText dark:text-darktext bg-IcyBreeze dark:bg-dark_input p-2 rounded-lg text-xs">
              <FaProjectDiagram className="w-3 h-3 text-ElectricAqua flex-shrink-0" />
              <span className="font-medium">{stage.projects_count} {t('curriculum.projects') || "P"}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-IcyBreeze dark:bg-dark_input rounded-full h-2 mb-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary to-Aquamarine h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((index + 1) / totalStages) * 100}%` }}
            />
          </div>

          {/* Click Hint */}
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="bg-primary text-white px-2 py-1 rounded-full text-xs font-medium">
              {t('curriculum.clickForDetails') || "Details"}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Node */}
      <div className={`absolute left-1/2 transform -translate-x-1/2 w-16 h-16 bg-white dark:bg-darkmode border-3 border-primary rounded-full flex items-center justify-center z-10 shadow-lg transition-all duration-200 hover:scale-105 ${isVisible ? 'scale-100' : 'scale-0'
        }`}>
        {index === totalStages - 1 ? (
          <div className="relative">
            <FaRocket className="w-6 h-6 text-primary" />
          </div>
        ) : (
          <span className="text-lg font-bold text-primary">
            {index + 1}
          </span>
        )}
      </div>

      {/* Connecting Line */}
      {index < totalStages - 1 && (
        <div className="absolute left-1/2 top-full transform -translate-x-1/2 w-1 h-20 bg-gradient-to-b from-primary to-Aquamarine rounded-full" />
      )}
    </div>
  );
});

PlatformIcon.displayName = 'PlatformIcon';
StageCard.displayName = 'StageCard';

export default StageCard;