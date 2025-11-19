'use client';
import { useState, useCallback, memo, lazy, Suspense } from 'react';
import { X } from 'lucide-react';

// Lazy load modal components
const OverviewTab = lazy(() => import('./OverviewTab'));
const CurriculumTab = lazy(() => import('./CurriculumTab'));
const SkillsTab = lazy(() => import('./SkillsTab'));
const TimelineTab = lazy(() => import('./TimelineTab'));
const SidebarSection = lazy(() => import('./SidebarSection'));

// Loading component
const TabLoading = () => (
  <div className="flex justify-center items-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const StageModal = memo(({ stage, onClose, onEnroll, t, locale }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  const tabs = {
    overview: {
      title: locale === 'ar' ? 'نظرة عامة' : 'Overview',
      icon: '📋',
      component: OverviewTab
    },
    curriculum: {
      title: locale === 'ar' ? 'المنهج الدراسي' : 'Curriculum',
      icon: '📚',
      component: CurriculumTab
    },
    skills: {
      title: locale === 'ar' ? 'المهارات المكتسبة' : 'Skills',
      icon: '🎯',
      component: SkillsTab
    },
    timeline: {
      title: locale === 'ar' ? 'خطة التعلم' : 'Timeline',
      icon: '⏱️',
      component: TimelineTab
    }
  };

  const ActiveTabComponent = tabs[activeTab]?.component;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
      isClosing ? 'bg-black/0 backdrop-blur-0' : 'bg-black/60 backdrop-blur-sm'
    }`}>
      <div className={`relative bg-white dark:bg-darkmode rounded-2xl shadow-xl max-w-6xl w-full mx-auto border border-PowderBlueBorder dark:border-dark_border transform transition-all duration-200 max-h-[95vh] overflow-hidden flex flex-col ${
        isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
      }`}>
        
        {/* Header */}
        <div className="relative p-6 border-b border-PowderBlueBorder/50 dark:border-dark_border bg-gradient-to-r from-primary to-ElectricAqua text-white rounded-t-2xl">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold mb-1 truncate">
                  {locale === 'ar' ? stage.title_ar : stage.title_en}
                </h3>
                <p className="text-white/90 text-sm truncate">
                  {stage.platform} • {typeof stage.language_type === 'object'
                    ? (locale === 'ar' ? stage.language_type.ar : stage.language_type.en)
                    : stage.language_type} • {stage.duration}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-all duration-150 hover:scale-105 flex-shrink-0 ml-4"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="grid lg:grid-cols-4 gap-6">
              
              {/* Main Content */}
              <div className="lg:col-span-3">
                {stage.media_url && (
                  <MediaSection 
                    stage={stage} 
                    locale={locale} 
                    imageLoaded={imageLoaded}
                    setImageLoaded={setImageLoaded}
                  />
                )}

                {/* Learning Journey Tabs */}
                <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border overflow-hidden">
                  {/* Tabs Header */}
                  <div className="flex border-b border-PowderBlueBorder dark:border-dark_border">
                    {Object.entries(tabs).map(([key, tab]) => (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-150 flex items-center justify-center gap-2 ${
                          activeTab === key
                            ? 'bg-primary text-white'
                            : 'text-SlateBlueText dark:text-darktext hover:bg-IcyBreeze dark:hover:bg-dark_input'
                          }`}
                      >
                        <span>{tab.icon}</span>
                        {tab.title}
                      </button>
                    ))}
                  </div>

                  {/* Tabs Content */}
                  <div className="p-4 min-h-[300px]">
                    <Suspense fallback={<TabLoading />}>
                      {ActiveTabComponent && (
                        <ActiveTabComponent 
                          stage={stage} 
                          locale={locale} 
                          t={t}
                        />
                      )}
                    </Suspense>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                <Suspense fallback={<TabLoading />}>
                  <SidebarSection 
                    stage={stage} 
                    onEnroll={onEnroll} 
                    t={t} 
                    locale={locale}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// Media Section Component
const MediaSection = memo(({ stage, locale, imageLoaded, setImageLoaded }) => (
  <div className="mb-6 rounded-xl overflow-hidden shadow-lg">
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
          className={`w-full h-64 object-cover rounded-xl transition-opacity duration-200 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
        />
        {!imageLoaded && (
          <div className="absolute inset-0 bg-IcyBreeze dark:bg-dark_input rounded-xl animate-pulse" />
        )}
      </div>
    )}
  </div>
));

MediaSection.displayName = 'MediaSection';
StageModal.displayName = 'StageModal';

export default StageModal;