'use client';
import { memo } from 'react';
import { FaBook, FaProjectDiagram, FaRocket } from 'react-icons/fa';

const SidebarSection = memo(({ stage, onEnroll, t, locale }) => {
  return (
    <>
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
              <FaBook className="w-6 h-6 text-primary mx-auto mb-1" />
              <div className="text-lg font-bold text-MidnightNavyText dark:text-white">
                {stage.lessons_count}
              </div>
              <div className="text-xs text-SlateBlueText dark:text-darktext">
                {t('curriculum.lessons') || "Lessons"}
              </div>
            </div>
            <div className="text-center p-3 bg-Aquamarine/5 rounded-lg">
              <FaProjectDiagram className="w-6 h-6 text-Aquamarine mx-auto mb-1" />
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
        <FaRocket className="w-8 h-8 mx-auto mb-2" />
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
          <FaRocket className="w-4 h-4" />
          {t('curriculum.enrollNow') || "Enroll Now"}
        </button>

        <p className="text-white/70 text-xs mt-2">
          {t('curriculum.freeTrial') || "Free trial available"}
        </p>
      </div>
    </>
  );
});

SidebarSection.displayName = 'SidebarSection';

export default SidebarSection;