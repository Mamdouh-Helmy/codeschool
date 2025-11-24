"use client";
import { useState, useEffect } from "react";
import { User, Mail, MapPin, Phone } from "lucide-react";
import { PortfolioFormData, ContactInfo } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

interface BasicInfoSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

interface BasicInfoForm {
  title: string;
  description: string;
  contactInfo: ContactInfo;
}

export default function BasicInfoSection({ data, onChange }: BasicInfoSectionProps) {
  const { t } = useI18n();
  const [form, setForm] = useState<BasicInfoForm>({
    title: data?.title || "",
    description: data?.description || "",
    contactInfo: data?.contactInfo || { email: "", phone: "", location: "" }
  });

  useEffect(() => {
    setForm({
      title: data?.title || "",
      description: data?.description || "",
      contactInfo: data?.contactInfo || { email: "", phone: "", location: "" }
    });
  }, [data]);

  const updateField = (field: keyof BasicInfoForm, value: string): void => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    onChange(updated);
  };

  const updateContactInfo = (field: keyof ContactInfo, value: string): void => {
    const updatedContactInfo = { ...form.contactInfo, [field]: value };
    const updated = { ...form, contactInfo: updatedContactInfo };
    setForm(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t("portfolio.basic.title")} *
        </label>
        <input 
          type="text"
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder={t("portfolio.basic.titlePlaceholder")}
          className="w-full px-4 py-3 border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
          required 
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t("portfolio.basic.description")}
        </label>
        <textarea
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
          rows={4}
          placeholder={t("portfolio.basic.descriptionPlaceholder")}
          className="w-full px-4 py-3 border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white resize-none"
          maxLength={500}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {form.description.length}/500 {t("common.characters")}
        </p>
      </div>

      {/* Contact Information */}
      <div className="border-t border-gray-200 dark:border-dark_border pt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          {t("portfolio.basic.contactInfo")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              {t("portfolio.basic.email")}
            </label>
            <input
              type="email"
              value={form.contactInfo.email || ""}
              onChange={(e) => updateContactInfo("email", e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-4 py-3 border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              {t("portfolio.basic.phone")}
            </label>
            <input
              type="tel"
              value={form.contactInfo.phone || ""}
              onChange={(e) => updateContactInfo("phone", e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-3 border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            />
          </div>

          {/* Location */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              {t("portfolio.basic.location")}
            </label>
            <input
              type="text"
              value={form.contactInfo.location || ""}
              onChange={(e) => updateContactInfo("location", e.target.value)}
              placeholder="City, Country"
              className="w-full px-4 py-3 border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}