'use client';
import { memo } from 'react';
import { FaBook, FaProjectDiagram, FaPuzzlePiece, FaGraduationCap } from 'react-icons/fa';

const CurriculumTab = memo(({ stage, locale, t }) => {
  const curriculumItems = [
    {
      title: locale === 'ar' ? 'الدروس' : 'Lessons',
      count: stage.lessons_count,
      description: locale === 'ar' ? 'درس تفاعلي' : 'Interactive Lessons',
      icon: <FaBook className="w-5 h-5" />,
      color: 'text-primary'
    },
    {
      title: locale === 'ar' ? 'المشاريع' : 'Projects',
      count: stage.projects_count,
      description: locale === 'ar' ? 'مشروع عملي' : 'Hands-on Projects',
      icon: <FaProjectDiagram className="w-5 h-5" />,
      color: 'text-Aquamarine'
    },
    {
      title: locale === 'ar' ? 'التحديات' : 'Challenges',
      count: Math.floor(stage.lessons_count * 1.5),
      description: locale === 'ar' ? 'تحدي برمجي' : 'Coding Challenges',
      icon: <FaPuzzlePiece className="w-5 h-5" />,
      color: 'text-ElectricAqua'
    },
    {
      title: locale === 'ar' ? 'الاختبارات' : 'Quizzes',
      count: Math.floor(stage.lessons_count / 2),
      description: locale === 'ar' ? 'اختبار تقييمي' : 'Assessment Quizzes',
      icon: <FaGraduationCap className="w-5 h-5" />,
      color: 'text-purple-500'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {curriculumItems.map((item, index) => (
          <div key={index} className="bg-gradient-to-br from-primary/5 to-ElectricAqua/5 rounded-lg p-4 text-center border border-PowderBlueBorder/30">
            <div className={`${item.color} mb-2`}>
              {item.icon}
            </div>
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
});

CurriculumTab.displayName = 'CurriculumTab';

export default CurriculumTab;