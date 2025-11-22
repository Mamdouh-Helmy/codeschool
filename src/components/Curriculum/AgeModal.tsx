'use client';
import { useState, useEffect, useCallback, memo } from 'react';
import { X, ChevronDown, Users, Sparkles } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useLocale } from '@/app/context/LocaleContext';

// أضف هذه الـ interfaces في الأعلى
interface AgeRange {
  en: string;
  ar: string;
}

interface AgeCategory {
  _id?: string;
  age_range: AgeRange;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  order: number;
  icon: string;
}

interface AgeCategoryCardProps {
  category: AgeCategory;
  index: number;
  isSelected: boolean;
  onSelect: (category: AgeCategory) => void;
  locale: string;
  animateIn: boolean;
}

interface AgeModalProps {
  onAgeSelect: (category: AgeCategory) => void;
  categories?: AgeCategory[];
}

// الآن عدل تعريف المكون ليستخدم الـ interfaces
const AgeCategoryCard = memo(({ category, index, isSelected, onSelect, locale, animateIn }: AgeCategoryCardProps) => {
  const getDisplayAgeRange = useCallback((ageRange: AgeRange | string) => {
    if (typeof ageRange === 'object') {
      return locale === 'ar' ? ageRange.ar : ageRange.en;
    }
    return ageRange;
  }, [locale]);

  const getCategoryIcon = useCallback((index: number) => {
    const icons = ['👶', '🧒', '👦', '👧', '🧑', '👨', '👩'];
    return icons[index] || '🌟';
  }, []);

  const displayAgeRange = getDisplayAgeRange(category.age_range);

  return (
    <button
      onClick={() => onSelect(category)}
      className={`group p-4 text-left border rounded-xl transition-all duration-300 transform hover:scale-102 relative overflow-hidden ${
        isSelected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darkmode hover:border-primary/30'
      } ${
        animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ 
        transitionDelay: `${index * 50}ms`,
      }}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getCategoryIcon(index)}</span>
            <div className="text-left min-w-0 flex-1">
              <h4 className={`font-bold text-base transition-colors truncate ${
                isSelected
                  ? 'text-primary'
                  : 'text-MidnightNavyText dark:text-white group-hover:text-primary'
              }`}>
                {displayAgeRange}
              </h4>
              <p className="text-xs text-SlateBlueText dark:text-darktext mt-0.5 truncate">
                {locale === 'ar' ? category.name_ar : category.name_en}
              </p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 transition-all duration-200 flex-shrink-0 ${
            isSelected
              ? 'text-primary rotate-180'
              : 'text-SlateBlueText dark:text-darktext group-hover:text-primary group-hover:rotate-180'
          }`} />
        </div>
        
        <p className="text-xs text-SlateBlueText dark:text-darktext line-clamp-2 leading-relaxed">
          {locale === 'ar' ? category.description_ar : category.description_en}
        </p>
      </div>
    </button>
  );
});

AgeCategoryCard.displayName = 'AgeCategoryCard';

const AgeModal = ({ onAgeSelect, categories = [] }: AgeModalProps) => {
  const { t } = useI18n();
  const { locale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAge, setSelectedAge] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const hasSelectedAge = sessionStorage.getItem('ageSelected');
    if (!hasSelectedAge && categories.length > 0) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        setTimeout(() => setAnimateIn(true), 50);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [categories]);

  const handleClose = useCallback(() => {
    setAnimateIn(false);
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300);
  }, []);

  const handleAgeSelect = useCallback((category: AgeCategory) => {
    const getDisplayAgeRange = (ageRange: AgeRange | string) => {
      if (typeof ageRange === 'object') {
        return locale === 'ar' ? ageRange.ar : ageRange.en;
      }
      return ageRange;
    };

    const selectedAgeString = getDisplayAgeRange(category.age_range);
    setSelectedAge(selectedAgeString);
    
    sessionStorage.setItem('ageSelected', 'true');
    sessionStorage.setItem('selectedAge', selectedAgeString);
    sessionStorage.setItem('selectedAgeData', JSON.stringify(category));
    
    setAnimateIn(false);
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      onAgeSelect(category);
    }, 300);
  }, [locale, onAgeSelect]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
      isClosing ? 'bg-black/0' : 'bg-black/60'
    }`}>
      {/* Modal Container */}
      <div className={`relative bg-white dark:bg-darkmode rounded-2xl shadow-xl max-w-2xl w-full mx-auto border border-PowderBlueBorder dark:border-dark_border transform transition-all duration-300 ${
        animateIn ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 -translate-y-4'
      }`}>
        
        {/* Header */}
        <div className="relative p-6 border-b border-PowderBlueBorder/50 dark:border-dark_border bg-gradient-to-r from-primary to-ElectricAqua text-white rounded-t-2xl">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">
                    {t('curriculum.selectAge') || "Select Learning Path"}
                  </h3>
                  <p className="text-white/90 text-sm">
                    {t('curriculum.chooseAgeGroup') || "Choose the perfect starting point"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-105"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-SlateBlueText dark:text-darktext text-sm max-w-md mx-auto leading-relaxed">
              {t('curriculum.selectAgeDescription') || "Select your child's age group to view the appropriate learning path"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories.map((category, index) => {
              const getDisplayAgeRange = (ageRange: AgeRange | string) => {
                if (typeof ageRange === 'object') {
                  return locale === 'ar' ? ageRange.ar : ageRange.en;
                }
                return ageRange;
              };
              const displayAgeRange = getDisplayAgeRange(category.age_range);
              const isSelected = selectedAge === displayAgeRange;
              
              return (
                <AgeCategoryCard
                  key={category._id}
                  category={category}
                  index={index}
                  isSelected={isSelected}
                  onSelect={handleAgeSelect}
                  locale={locale}
                  animateIn={animateIn}
                />
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 bg-IcyBreeze dark:bg-dark_input px-3 py-1.5 rounded-full">
              <Sparkles className="w-3 h-3 text-primary" />
              <p className="text-xs text-SlateBlueText dark:text-darktext">
                {t('curriculum.ageModalHint') || "You can change this selection later"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgeModal;