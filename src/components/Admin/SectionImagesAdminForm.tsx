"use client";
import { useState, useEffect } from "react";
import {
  Image,
  Upload,
  Save,
  X,
  Eye,
  EyeOff,
  Layout,
  Type,
  FileText,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

interface Props {
  initial?: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function SectionImagesAdminForm({ initial, onClose, onSaved }: Props) {
  const { t } = useI18n();

  const [form, setForm] = useState(() => ({
    sectionName: initial?.sectionName || "",
    imageUrl: initial?.imageUrl || "",
    imageAlt: initial?.imageAlt || "",
    description: initial?.description || "",
    displayOrder: initial?.displayOrder || 0,
    isActive: initial?.isActive ?? true,
  }));

  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState("");

  // Available sections
  const sections = [
    { value: "ticket-section", label: "Ticket Section" },
    { value: "event-ticket", label: "Event Ticket" },
    { value: "hero-section", label: "Hero Section" },
    { value: "about-section", label: "About Section" },
    { value: "contact-section", label: "Contact Section" },
  ];

  useEffect(() => {
    if (form.imageUrl) {
      setImagePreview(form.imageUrl);
    }
  }, [form.imageUrl]);

  const onChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        onChange("imageUrl", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...form,
      };

      const method = initial?._id ? "PUT" : "POST";
      const url = "/api/section-images";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initial?._id ? { id: initial._id, ...payload } : payload),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        onSaved();
        onClose();
      } else {
        alert(`Failed to save image: ${result.message}`);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("An error occurred while saving the image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Layout className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t('sectionImages.basicInfo') || "Image Information"}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t('sectionImages.basicInfoDescription') || "Basic details about the section image"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Layout className="w-3 h-3 text-primary" />
              {t('sectionImages.sectionName') || "Section Name"} *
            </label>
            <select
              value={form.sectionName}
              onChange={(e) => onChange("sectionName", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              required
            >
              <option value="">{t('sectionImages.chooseSection') || "Choose a section..."}</option>
              {sections.map((section) => (
                <option key={section.value} value={section.value}>
                  {section.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Type className="w-3 h-3 text-primary" />
              {t('sectionImages.imageAlt') || "Image Alt Text"} *
            </label>
            <input
              type="text"
              value={form.imageAlt}
              onChange={(e) => onChange("imageAlt", e.target.value)}
              placeholder={t('sectionImages.imageAltPlaceholder') || "Descriptive text for accessibility"}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <FileText className="w-3 h-3 text-primary" />
              {t('sectionImages.description') || "Description"}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => onChange("description", e.target.value)}
              rows={2}
              placeholder={t('sectionImages.descriptionPlaceholder') || "Optional description about this image..."}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 resize-none transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Layout className="w-3 h-3 text-primary" />
              {t('sectionImages.displayOrder') || "Display Order"}
            </label>
            <input
              type="number"
              value={form.displayOrder}
              onChange={(e) => onChange("displayOrder", parseInt(e.target.value) || 0)}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
            <p className="text-11 text-SlateBlueText dark:text-darktext">
              {t('sectionImages.displayOrderHint') || "Lower numbers appear first"}
            </p>
          </div>
        </div>
      </div>

      {/* Image Upload */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-Aquamarine/10 rounded-lg flex items-center justify-center">
            <Image className="w-4 h-4 text-Aquamarine" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t('sectionImages.imageUpload') || "Image Upload"}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t('sectionImages.imageUploadDescription') || "Upload or provide URL for the section image"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
                {t('sectionImages.imageUrl') || "Image URL"} *
              </label>
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => onChange("imageUrl", e.target.value)}
                placeholder={t('sectionImages.imageUrlPlaceholder') || "https://example.com/image.jpg"}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                required
              />
              <div className="mt-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-12 cursor-pointer hover:bg-primary/20 transition-colors">
                  <Upload className="w-3 h-3" />
                  {t('sectionImages.uploadImage') || "Upload Image"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            
            {imagePreview && (
              <div className="w-20 h-20 border border-PowderBlueBorder rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Save className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t('sectionImages.settings') || "Settings"}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t('sectionImages.settingsDescription') || "Image visibility and status"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center space-x-3 p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-IcyBreeze dark:hover:bg-dark_input transition-all duration-200 cursor-pointer group">
            <div className="w-8 h-8 bg-Aquamarine/10 rounded flex items-center justify-center group-hover:bg-Aquamarine/20 transition-colors">
              {form.isActive ? <Eye className="w-3 h-3 text-Aquamarine" /> : <EyeOff className="w-3 h-3 text-Aquamarine" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => onChange("isActive", e.target.checked)}
                  className="w-4 h-4 text-Aquamarine focus:ring-Aquamarine border-PowderBlueBorder rounded"
                />
                <span className="text-13 font-medium text-MidnightNavyText dark:text-white">
                  {t('sectionImages.activeImage') || "Active Image"}
                </span>
              </div>
              <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">
                {t('sectionImages.activeDescription') || "Make this image visible in the specified section"}
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 hover:bg-IcyBreeze dark:hover:bg-darklight hover:shadow-md flex items-center justify-center gap-2"
        >
          <X className="w-3 h-3" />
          {t('common.cancel') || "Cancel"}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {t('common.saving') || "Saving..."}
            </>
          ) : initial ? (
            <>
              <Save className="w-3 h-3" />
              {t('sectionImages.updateImage') || "Update Image"}
            </>
          ) : (
            <>
              <Image className="w-3 h-3" />
              {t('sectionImages.createImage') || "Create Image"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}