'use client';
import { memo } from 'react';
import { FaBrain, FaLightbulb, FaUsers, FaChartLine } from 'react-icons/fa';

const SkillsTab = memo(({ stage, locale, t }) => {
  const skills = [
    {
      skill: locale === 'ar' ? 'التفكير المنطقي' : 'Logical Thinking',
      progress: 95,
      icon: <FaBrain className="w-4 h-4" />
    },
    {
      skill: locale === 'ar' ? 'حل المشكلات' : 'Problem Solving',
      progress: 90,
      icon: <FaLightbulb className="w-4 h-4" />
    },
    {
      skill: locale === 'ar' ? 'الإبداع والتعبير' : 'Creativity & Expression',
      progress: 85,
      icon: <FaChartLine className="w-4 h-4" />
    },
    {
      skill: locale === 'ar' ? 'العمل الجماعي' : 'Team Collaboration',
      progress: 75,
      icon: <FaUsers className="w-4 h-4" />
    }
  ];

  return (
    <div className="space-y-4">
      {skills.map((skill, index) => (
        <div key={index} className="bg-white dark:bg-darkmode rounded-lg p-4 border border-PowderBlueBorder dark:border-dark_border">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-primary">
              {skill.icon}
            </div>
            <div className="flex-1">
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
                  className="bg-gradient-to-r from-primary to-Aquamarine h-2 rounded-full transition-all duration-500"
                  style={{ width: `${skill.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

SkillsTab.displayName = 'SkillsTab';

export default SkillsTab;