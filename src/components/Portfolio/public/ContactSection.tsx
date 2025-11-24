// components/Portfolio/public/ContactSection.tsx
"use client";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { PublicPortfolio } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";
import { ThemeStyles } from "@/utils/portfolioThemes";

interface ContactSectionProps {
  portfolio: PublicPortfolio;
  themeStyles?: ThemeStyles;
}

export default function ContactSection({ portfolio, themeStyles }: ContactSectionProps) {
  const { t } = useI18n();
  const { contactInfo, userId } = portfolio;

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

  // تطبيق السمات المستقلة
  const getHeaderBackground = (): string => {
    if (themeStyles?.header) {
      return themeStyles.header;
    }
    return "portfolio-header portfolio-header-light";
  };

  const getCardStyle = (): string => {
    // استخدام نمط ثابت للكروت يعمل مع جميع السمات
    if (themeStyles?.background.secondary) {
      return `${themeStyles.background.secondary} bg-opacity-20 backdrop-blur-sm border ${themeStyles.border || 'border-gray-200'}`;
    }
    return "bg-white/20 backdrop-blur-sm border border-white/30";
  };

  const getButtonStyle = (): string => {
    // زر CTA يستخدم ألوان من السمة
    if (themeStyles?.background.primary && themeStyles?.text.primary) {
      return `${themeStyles.background.primary} ${themeStyles.text.primary} hover:opacity-90 font-semibold`;
    }
    return "bg-white text-blue-600 hover:bg-blue-50 font-semibold";
  };

  const getIconBackground = (): string => {
    // خلفية الأيقونات تستخدم ألوان من السمة
    if (themeStyles?.background.secondary) {
      return `${themeStyles.background.secondary} bg-opacity-30`;
    }
    return "bg-white/20";
  };

  return (
    <section className="mb-12">
      <div className={`rounded-2xl p-8 ${getHeaderBackground()}`}>
        <div className="text-center mb-8">
          <h2 className={`text-3xl font-bold mb-4 ${getTextColor('white')}`}>
            {t("portfolio.public.letsWork")}
          </h2>
          <p className={`text-lg max-w-2xl mx-auto opacity-90 ${getTextColor('white')}`}>
            {t("portfolio.public.workDescription")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Email */}
          {contactInfo?.email && (
            <a
              href={`mailto:${contactInfo.email}`}
              className={`rounded-xl p-6 text-center hover:scale-105 transition-all duration-300 group ${getCardStyle()}`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform ${getIconBackground()}`}>
                <Mail className={`w-6 h-6 ${getTextColor('white')}`} />
              </div>
              <h3 className={`font-semibold mb-2 ${getTextColor('white')}`}>
                {t("portfolio.public.email")}
              </h3>
              <p className={`text-sm break-all opacity-90 ${getTextColor('white')}`}>
                {contactInfo.email}
              </p>
            </a>
          )}

          {/* Phone */}
          {contactInfo?.phone && (
            <a
              href={`tel:${contactInfo.phone}`}
              className={`rounded-xl p-6 text-center hover:scale-105 transition-all duration-300 group ${getCardStyle()}`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform ${getIconBackground()}`}>
                <Phone className={`w-6 h-6 ${getTextColor('white')}`} />
              </div>
              <h3 className={`font-semibold mb-2 ${getTextColor('white')}`}>
                {t("portfolio.public.phone")}
              </h3>
              <p className={`text-sm opacity-90 ${getTextColor('white')}`}>
                {contactInfo.phone}
              </p>
            </a>
          )}

          {/* Location */}
          {contactInfo?.location && (
            <div className={`rounded-xl p-6 text-center group hover:scale-105 transition-all duration-300 ${getCardStyle()}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform ${getIconBackground()}`}>
                <MapPin className={`w-6 h-6 ${getTextColor('white')}`} />
              </div>
              <h3 className={`font-semibold mb-2 ${getTextColor('white')}`}>
                {t("portfolio.public.location")}
              </h3>
              <p className={`text-sm opacity-90 ${getTextColor('white')}`}>
                {contactInfo.location}
              </p>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <div className="text-center mt-8">
          <a
            href={`mailto:${contactInfo?.email || userId?.email}?subject=Portfolio Inquiry&body=Hello ${userId?.name || 'User'}, I saw your portfolio and would like to connect...`}
            className={`inline-flex items-center gap-2 px-8 py-4 rounded-full transition-all duration-300 hover:scale-105 ${getButtonStyle()}`}
          >
            <Send className="w-5 h-5" />
            {t("portfolio.public.getInTouch")}
          </a>
        </div>
      </div>
    </section>
  );
}