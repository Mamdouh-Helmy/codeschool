'use client';
import { memo } from 'react';
import { FaStar, FaClock, FaCode, FaLaptop } from 'react-icons/fa';

const OverviewTab = memo(({ stage, locale, t }) => {
  const overviewItems = [
    {
      title: locale === 'ar' ? 'المستوى' : 'Level',
      value: stage.difficulty_level || 'Beginner',
      color: stage.difficulty_level === 'Beginner'
        ? 'text-green-600'
        : stage.difficulty_level === 'Intermediate'
          ? 'text-yellow-600'
          : 'text-red-600',
      icon: <FaStar className="w-4 h-4" />
    },
    {
      title: locale === 'ar' ? 'المدة' : 'Duration',
      value: stage.duration,
      color: 'text-blue-600',
      icon: <FaClock className="w-4 h-4" />
    },
    {
      title: locale === 'ar' ? 'نوع البرمجة' : 'Programming Type',
      value: typeof stage.language_type === 'object'
        ? (locale === 'ar' ? stage.language_type.ar : stage.language_type.en)
        : stage.language_type,
      color: 'text-purple-600',
      icon: <FaCode className="w-4 h-4" />
    },
    {
      title: locale === 'ar' ? 'المنصة' : 'Platform',
      value: stage.platform,
      color: 'text-indigo-600',
      icon: <FaLaptop className="w-4 h-4" />
    }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {overviewItems.map((item, index) => (
          <div key={index} className="bg-IcyBreeze dark:bg-dark_input rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className={item.color}>
                {item.icon}
              </div>
              <p className="text-sm text-SlateBlueText dark:text-darktext">
                {item.title}
              </p>
            </div>
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
});

OverviewTab.displayName = 'OverviewTab';

export default OverviewTab;