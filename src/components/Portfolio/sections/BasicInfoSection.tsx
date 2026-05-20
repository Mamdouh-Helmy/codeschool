"use client";
import { useState, useEffect } from "react";
import { User, Mail, MapPin, Phone, FileText } from "lucide-react";
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

/* ─── Reusable AI-border field wrapper ─────────────────────── */
function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="pf-group">
      <label className="pf-label">
        {icon}
        {label}
      </label>
      <div className="pf-wrap">
        <div className="pf-surface">{children}</div>
      </div>
    </div>
  );
}

export default function BasicInfoSection({ data, onChange }: BasicInfoSectionProps) {
  const { t } = useI18n();

  const [form, setForm] = useState<BasicInfoForm>({
    title:       data?.title || "",
    description: data?.description || "",
    contactInfo: data?.contactInfo || { email: "", phone: "", location: "" },
  });

  useEffect(() => {
    setForm({
      title:       data?.title || "",
      description: data?.description || "",
      contactInfo: data?.contactInfo || { email: "", phone: "", location: "" },
    });
  }, [data]);

  const set = (field: keyof BasicInfoForm, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    onChange(next);
  };

  const setContact = (field: keyof ContactInfo, value: string) => {
    const ci   = { ...form.contactInfo, [field]: value };
    const next = { ...form, contactInfo: ci };
    setForm(next);
    onChange(next);
  };

  const descLen = form.description.length;

  return (
    <div className="space-y-6">

      {/* Title */}
      <Field label={`${t("portfolio.basic.title")} *`} icon={<User size={14} />}>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder={t("portfolio.basic.titlePlaceholder")}
          className="pf-input"
          required
        />
      </Field>

      {/* Description */}
      <div className="pf-group">
        <label className="pf-label">
          <FileText size={14} />
          {t("portfolio.basic.description")}
        </label>
        <div className="pf-wrap">
          <div className="pf-surface">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder={t("portfolio.basic.descriptionPlaceholder")}
              className="pf-textarea"
              maxLength={500}
            />
          </div>
        </div>
        <span className="pf-count" data-warn={descLen > 420 ? "true" : "false"}>
          {descLen}/500 {t("common.characters")}
        </span>
      </div>

      {/* Contact Information */}
      <div className="border-t border-gray-200 dark:border-dark_border pt-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          {t("portfolio.basic.contactInfo")}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <Field label={t("portfolio.basic.email")} icon={<Mail size={14} />}>
            <input
              type="email"
              value={form.contactInfo.email || ""}
              onChange={(e) => setContact("email", e.target.value)}
              placeholder="your.email@example.com"
              className="pf-input"
            />
          </Field>

          <Field label={t("portfolio.basic.phone")} icon={<Phone size={14} />}>
            <input
              type="tel"
              value={form.contactInfo.phone || ""}
              onChange={(e) => setContact("phone", e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="pf-input"
            />
          </Field>

          <div className="md:col-span-2">
            <Field label={t("portfolio.basic.location")} icon={<MapPin size={14} />}>
              <input
                type="text"
                value={form.contactInfo.location || ""}
                onChange={(e) => setContact("location", e.target.value)}
                placeholder="City, Country"
                className="pf-input"
              />
            </Field>
          </div>

        </div>
      </div>
    </div>
  );
}