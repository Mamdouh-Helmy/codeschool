'use client';
import { memo } from 'react';
import { FaCalendarAlt, FaCheckCircle } from 'react-icons/fa';

const TimelineTab = memo(({ stage, locale, t }) => {
  const weeks = [
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
  ];

  return (
    <div className="space-y-4">
      {weeks.map((week, index) => (
        <div key={index} className="bg-white dark:bg-darkmode rounded-lg p-4 border border-PowderBlueBorder dark:border-dark_border">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary to-ElectricAqua rounded-full flex items-center justify-center text-white font-bold text-sm">
              <FaCalendarAlt className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-MidnightNavyText dark:text-white text-sm mb-2">
                الأسبوع {week.week}: {week.title}
              </h4>
              <ul className="text-xs text-SlateBlueText dark:text-darktext space-y-1">
                {week.topics.map((topic, topicIndex) => (
                  <li key={topicIndex} className="flex items-center gap-2">
                    <FaCheckCircle className="w-3 h-3 text-primary" />
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
});

TimelineTab.displayName = 'TimelineTab';

export default TimelineTab;