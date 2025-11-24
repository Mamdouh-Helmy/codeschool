// components/Portfolio/public/SkillsShowcase.tsx
"use client";
import { Code, Star } from "lucide-react";
import { Skill } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";
import { ThemeStyles } from "@/utils/portfolioThemes";

interface SkillsShowcaseProps {
  skills: Skill[];
  themeStyles?: ThemeStyles;
}

export default function SkillsShowcase({ skills, themeStyles }: SkillsShowcaseProps) {
  const { t } = useI18n();

  // دالة مساعدة للحصول على ألوان النص بشكل آمن
  const getTextColor = (type: 'primary' | 'secondary' | 'muted' | 'white' = 'primary'): string => {
    if (!themeStyles) {
      return type === 'primary' ? 'text-gray-900' : 
             type === 'secondary' ? 'text-gray-700' : 
             type === 'muted' ? 'text-gray-500' : 'text-white';
    }
    return themeStyles.text?.[type] || 
      (type === 'primary' ? 'text-gray-900' : 
       type === 'secondary' ? 'text-gray-700' : 
       type === 'muted' ? 'text-gray-500' : 'text-white');
  };

  const getCardStyle = (): string => {
    if (themeStyles?.card) {
      return themeStyles.card;
    }
    return "bg-white rounded-lg border border-gray-200";
  };

  const getSkillItemStyle = (): string => {
    if (themeStyles?.background.secondary) {
      return themeStyles.background.secondary;
    }
    return "bg-gray-50";
  };

  const getIconContainerStyle = (): string => {
    // استخدام لون الـ skillFill للخلفية
    if (themeStyles?.skillFill) {
      const baseColor = themeStyles.skillFill;
      if (baseColor.includes('blue')) return 'bg-blue-100';
      if (baseColor.includes('green')) return 'bg-green-100';
      if (baseColor.includes('gray')) return 'bg-gray-100';
    }
    if (themeStyles?.background.secondary) {
      return `${themeStyles.background.secondary} bg-opacity-50`;
    }
    return "bg-blue-100";
  };

  const getIconColor = (): string => {
    // استخدام لون الـ skillFill للأيقونة
    if (themeStyles?.skillFill) {
      const baseColor = themeStyles.skillFill;
      if (baseColor.includes('blue')) return 'text-blue-600';
      if (baseColor.includes('green')) return 'text-green-600';
      if (baseColor.includes('gray')) return 'text-gray-600';
    }
    if (themeStyles?.text.primary) {
      return themeStyles.text.primary;
    }
    return "text-blue-600";
  };

  const getStarColor = (): string => {
    // استخدام لون الـ skillFill للنجمة
    if (themeStyles?.skillFill) {
      const baseColor = themeStyles.skillFill;
      if (baseColor.includes('blue')) return 'text-blue-600';
      if (baseColor.includes('green')) return 'text-green-600';
      if (baseColor.includes('gray')) return 'text-gray-600';
    }
    return "text-blue-600";
  };

  const getSkillIconStyle = (): string => {
    // استخدام لون الـ skillFill لأيقونات المهارات
    if (themeStyles?.skillFill) {
      const baseColor = themeStyles.skillFill;
      if (baseColor.includes('blue')) return 'bg-blue-100 text-blue-600';
      if (baseColor.includes('green')) return 'bg-green-100 text-green-600';
      if (baseColor.includes('gray')) return 'bg-gray-100 text-gray-600';
    }
    return "bg-blue-100 text-blue-600";
  };

  const categorizedSkills = skills.reduce((acc, skill) => {
    const category = skill.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  const getSkillLevelColor = (level: number): string => {
    if (level >= 90) return "bg-green-500";
    if (level >= 70) return "bg-blue-500";
    if (level >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getSkillLevelText = (level: number): string => {
    if (level >= 90) return t("portfolio.common.expert");
    if (level >= 70) return t("portfolio.common.advanced");
    if (level >= 50) return t("portfolio.common.intermediate");
    return t("portfolio.common.beginner");
  };

  const getSkillBarBackground = (): string => {
    if (themeStyles?.skillBar) {
      return themeStyles.skillBar;
    }
    return "bg-gray-200";
  };

  const getSkillBarFill = (level: number): string => {
    if (themeStyles?.skillFill) {
      return themeStyles.skillFill;
    }
    return getSkillLevelColor(level);
  };

  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-8">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getIconContainerStyle()}`}>
          <Code className={`w-6 h-6 ${getIconColor()}`} />
        </div>
        <div>
          <span className={`text-2xl font-bold ${getTextColor('primary')}`}>
            {t("portfolio.public.skillsExpertise")}
          </span>
          <p className={getTextColor('secondary')}>
            {t("portfolio.public.technicalSkills")}
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {Object.entries(categorizedSkills).map(([category, categorySkills]) => (
          <div key={category} className={`p-6 ${getCardStyle()}`}>
            <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${getTextColor('primary')}`}>
              <Star className={`w-4 h-4 ${getStarColor()}`} />
              {category}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categorySkills.map((skill, index) => (
                <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${getSkillItemStyle()}`}>
                  <div className="flex items-center gap-3">
                    {skill.icon && (
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${getSkillIconStyle()}`}>
                        <span className="text-xs font-semibold">
                          {skill.icon}
                        </span>
                      </div>
                    )}
                    <div>
                      <h4 className={`font-medium ${getTextColor('primary')}`}>{skill.name}</h4>
                      <p className={`text-xs ${getTextColor('secondary')}`}>
                        {getSkillLevelText(skill.level)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${getTextColor('primary')}`}>
                      {skill.level}%
                    </span>
                    <div className={`w-16 h-2 rounded-full overflow-hidden ${getSkillBarBackground()}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${getSkillBarFill(skill.level)}`}
                        style={{ width: `${skill.level}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}