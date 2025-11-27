"use client";
import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import {
  Image,
  X,
  Save,
  Upload,
  Globe,
  FileText,
  User,
  Percent,
  Users,
  GraduationCap,
  Eye,
  FileEdit
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

interface SectionImageHeroFormProps {
  initial?: any;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  sectionName: string;
  language: string;
  imageUrl: string;
  secondImageUrl: string;
  imageAlt: string;
  secondImageAlt: string;
  heroTitle: string;
  heroDescription: string;
  instructor1: string;
  instructor1Role: string;
  instructor2: string;
  instructor2Role: string;
  welcomeTitle: string;
  welcomeSubtitle1: string;
  welcomeSubtitle2: string;
  welcomeFeature1: string;
  welcomeFeature2: string;
  welcomeFeature3: string;
  welcomeFeature4: string;
  welcomeFeature5: string;
  welcomeFeature6: string;
  discount: number;
  happyParents: string;
  graduates: string;
  isActive: boolean;
  displayOrder: number;
}

interface SectionOption {
  value: string;
  label: string;
}

interface LanguageOption {
  value: string;
  label: string;
}

const SectionImageHeroForm: React.FC<SectionImageHeroFormProps> = ({ initial, onClose, onSaved }) => {
  const { t } = useI18n();
  const [form, setForm] = useState<FormData>({
    sectionName: initial?.sectionName || "hero-section",
    language: initial?.language || "ar",
    imageUrl: initial?.imageUrl || "",
    secondImageUrl: initial?.secondImageUrl || "",
    imageAlt: initial?.imageAlt || "",
    secondImageAlt: initial?.secondImageAlt || "",
    heroTitle: initial?.heroTitle || "",
    instructor1: initial?.instructor1 || "",
    instructor1Role: initial?.instructor1Role || "",
    heroDescription: initial?.heroDescription || "",
    instructor2: initial?.instructor2 || "",
    instructor2Role: initial?.instructor2Role || "",
    welcomeTitle: initial?.welcomeTitle || "",
    welcomeSubtitle1: initial?.welcomeSubtitle1 || "",
    welcomeSubtitle2: initial?.welcomeSubtitle2 || "",
    welcomeFeature1: initial?.welcomeFeature1 || "",
    welcomeFeature2: initial?.welcomeFeature2 || "",
    welcomeFeature3: initial?.welcomeFeature3 || "",
    welcomeFeature4: initial?.welcomeFeature4 || "",
    welcomeFeature5: initial?.welcomeFeature5 || "",
    welcomeFeature6: initial?.welcomeFeature6 || "",
    discount: initial?.discount || 30,
    happyParents: initial?.happyParents || "250",
    graduates: initial?.graduates || "130",
    isActive: initial?.isActive ?? true,
    displayOrder: initial?.displayOrder || 0,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [secondImagePreview, setSecondImagePreview] = useState<string>("");

  useEffect(() => {
    if (form.imageUrl) setImagePreview(form.imageUrl);
    if (form.secondImageUrl) setSecondImagePreview(form.secondImageUrl);
  }, [form.imageUrl, form.secondImageUrl]);

  const onChange = (field: keyof FormData, value: any): void => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, isSecondImage: boolean = false): void => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (isSecondImage) {
          setSecondImagePreview(result);
          onChange("secondImageUrl", result);
        } else {
          setImagePreview(result);
          onChange("imageUrl", result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = { ...form };

      const method = initial?._id ? "PUT" : "POST";
      const url = initial?._id
        ? `/api/section-images-hero/${initial._id}`
        : "/api/section-images-hero";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSaved();
        onClose();
      } else {
        const errorData = await res.json();
        alert(`Failed to save: ${errorData.message}`);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("An error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  const sectionOptions: SectionOption[] = [
    { value: "hero-section", label: t('sectionNames.hero-section') || "Hero Section" },
    { value: "welcome-popup", label: t('sectionNames.welcome-popup') || "Welcome Popup" },
  ];

  const languageOptions: LanguageOption[] = [
    { value: "ar", label: "العربية" },
    { value: "en", label: "English" },
  ];

  return (
    <form onSubmit={submit} className="space-y-6 ">
      {/* Basic Information */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t('sectionImages.basicInfo') || "Basic Information"}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t('sectionImages.basicInfoDescription') || "Basic details about the section image"}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t('sectionImages.sectionName') || "Section Name"} *
            </label>
            <select
              value={form.sectionName}
              onChange={(e) => onChange("sectionName", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
              required
            >
              <option value="">{t('sectionImages.chooseSection') || "Choose a section..."}</option>
              {sectionOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t('common.language') || "Language"} *
            </label>
            <select
              value={form.language}
              onChange={(e) => onChange("language", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
              required
            >
              {languageOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
            {t('sectionImages.displayOrder') || "Display Order"}
          </label>
          <input
            type="number"
            value={form.displayOrder}
            onChange={(e) => onChange("displayOrder", parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            min="0"
          />
          <p className="text-11 text-SlateBlueText dark:text-darktext">
            {t('sectionImages.displayOrderHint') || "Lower numbers appear first"}
          </p>
        </div>
      </div>

      {/* Image Upload Section */}
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
              {t('sectionImages.imageUploadDescription') || "Upload or provide links for section images"}
            </p>
          </div>
        </div>

        {/* Main Image */}
        <div className="space-y-3">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
            {t('sectionImages.imageUrl') || "Main Image URL"} *
          </label>
          <div className="flex gap-4 items-start">
            <div className="flex-1 space-y-2">
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => onChange("imageUrl", e.target.value)}
                placeholder={t('sectionImages.imageUrlPlaceholder') || "https://example.com/image.jpg"}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
                required
              />
              <div>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-12 cursor-pointer hover:bg-primary/20 transition-colors">
                  <Upload className="w-3 h-3" />
                  {t('sectionImages.uploadImage') || "Upload Image"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, false)}
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

        {/* Second Image */}
        <div className="space-y-3">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
            {t('sectionImages.secondImageUrl') || "Second Image URL"}
          </label>
          <div className="flex gap-4 items-start">
            <div className="flex-1 space-y-2">
              <input
                type="url"
                value={form.secondImageUrl}
                onChange={(e) => onChange("secondImageUrl", e.target.value)}
                placeholder={t('sectionImages.imageUrlPlaceholder') || "https://example.com/image2.jpg"}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
              />
              <div>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-12 cursor-pointer hover:bg-primary/20 transition-colors">
                  <Upload className="w-3 h-3" />
                  {t('sectionImages.uploadImage') || "Upload Image"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, true)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            {secondImagePreview && (
              <div className="w-20 h-20 border border-PowderBlueBorder rounded-lg overflow-hidden">
                <img
                  src={secondImagePreview}
                  alt="Second Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {/* Image Alt Texts */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t('sectionImages.imageAlt') || "Main Image Alt Text"}
            </label>
            <input
              type="text"
              value={form.imageAlt}
              onChange={(e) => onChange("imageAlt", e.target.value)}
              placeholder={t('sectionImages.imageAltPlaceholder') || "Descriptive text for accessibility"}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t('sectionImages.secondImageAlt') || "Second Image Alt Text"}
            </label>
            <input
              type="text"
              value={form.secondImageAlt}
              onChange={(e) => onChange("secondImageAlt", e.target.value)}
              placeholder={t('sectionImages.imageAltPlaceholder') || "Descriptive text for accessibility"}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Hero Section Data */}
      {form.sectionName === "hero-section" && (
        <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-ElectricAqua/10 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-ElectricAqua" />
            </div>
            <div>
              <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                {t('heroSection.title') || "Hero Section Data"}
              </h3>
              <p className="text-12 text-SlateBlueText dark:text-darktext">
                {t('heroSection.description') || "Information for the hero section"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t('heroSection.heroTitle') || "Hero Title"}
            </label>
            <input
              type="text"
              value={form.heroTitle}
              onChange={(e) => onChange("heroTitle", e.target.value)}
              placeholder={t('heroSection.heroTitlePlaceholder') || "Hero section title"}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            />
          </div>


          {/* Hero Description - الحقل الجديد */}
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <FileEdit className="w-3 h-3" />
              {t('heroSection.heroDescription') || "Hero Description"}
            </label>
            <textarea
              value={form.heroDescription}
              onChange={(e) => onChange("heroDescription", e.target.value)}
              placeholder={t('heroSection.heroDescriptionPlaceholder') || "Detailed description for the hero section..."}
              rows={4}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white resize-none"
            />
            <p className="text-11 text-SlateBlueText dark:text-darktext">
              {t('heroSection.heroDescriptionHint') || "This description will be shown in the hero section with a 'Read More' option"}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                {t('heroSection.instructor1') || "Instructor 1 Name"}
              </label>
              <input
                type="text"
                value={form.instructor1}
                onChange={(e) => onChange("instructor1", e.target.value)}
                placeholder={t('heroSection.instructorPlaceholder') || "Instructor name"}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                {t('heroSection.instructor1Role') || "Instructor 1 Role"}
              </label>
              <input
                type="text"
                value={form.instructor1Role}
                onChange={(e) => onChange("instructor1Role", e.target.value)}
                placeholder={t('heroSection.instructorRolePlaceholder') || "Instructor role"}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                {t('heroSection.instructor2') || "Instructor 2 Name"}
              </label>
              <input
                type="text"
                value={form.instructor2}
                onChange={(e) => onChange("instructor2", e.target.value)}
                placeholder={t('heroSection.instructorPlaceholder') || "Instructor name"}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                {t('heroSection.instructor2Role') || "Instructor 2 Role"}
              </label>
              <input
                type="text"
                value={form.instructor2Role}
                onChange={(e) => onChange("instructor2Role", e.target.value)}
                placeholder={t('heroSection.instructorRolePlaceholder') || "Instructor role"}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Welcome Popup Data */}
      {form.sectionName === "welcome-popup" && (
        <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-LightYellow/10 rounded-lg flex items-center justify-center">
              <Eye className="w-4 h-4 text-LightYellow" />
            </div>
            <div>
              <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                {t('welcomePopup.title') || "Welcome Popup Data"}
              </h3>
              <p className="text-12 text-SlateBlueText dark:text-darktext">
                {t('welcomePopup.description') || "Information for the welcome popup"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t('welcomePopup.welcomeTitle') || "Welcome Title"}
            </label>
            <input
              type="text"
              value={form.welcomeTitle}
              onChange={(e) => onChange("welcomeTitle", e.target.value)}
              placeholder={t('welcomePopup.welcomeTitlePlaceholder') || "Welcome popup title"}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                {t('welcomePopup.subtitle1') || "Subtitle 1"}
              </label>
              <input
                type="text"
                value={form.welcomeSubtitle1}
                onChange={(e) => onChange("welcomeSubtitle1", e.target.value)}
                placeholder={t('welcomePopup.subtitlePlaceholder') || "First subtitle"}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                {t('welcomePopup.subtitle2') || "Subtitle 2"}
              </label>
              <input
                type="text"
                value={form.welcomeSubtitle2}
                onChange={(e) => onChange("welcomeSubtitle2", e.target.value)}
                placeholder={t('welcomePopup.subtitlePlaceholder') || "Second subtitle"}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
              />
            </div>
          </div>

          {/* Welcome Features */}
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map(num => (
              <div key={num} className="space-y-2">
                <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                  {t(`welcomePopup.feature${num}`) || `Feature ${num}`}
                </label>
                <input
                  type="text"
                  value={form[`welcomeFeature${num}` as keyof FormData]}
                  onChange={(e) => onChange(`welcomeFeature${num}` as keyof FormData, e.target.value)}
                  placeholder={t('welcomePopup.featurePlaceholder') || `Feature ${num}`}
                  className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Numbers & Statistics */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Percent className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t('statistics.title') || "Numbers & Statistics"}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t('statistics.description') || "Important numbers for displays"}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Percent className="w-3 h-3" />
              {t('statistics.discount') || "Discount (%)"}
            </label>
            <input
              type="number"
              value={form.discount}
              onChange={(e) => onChange("discount", parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
              min="0"
              max="100"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Users className="w-3 h-3" />
              {t('statistics.happyParents') || "Happy Parents"}
            </label>
            <input
              type="text"
              value={form.happyParents}
              onChange={(e) => onChange("happyParents", e.target.value)}
              placeholder={t('statistics.happyParentsPlaceholder') || "250"}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <GraduationCap className="w-3 h-3" />
              {t('statistics.graduates') || "Graduates"}
            </label>
            <input
              type="text"
              value={form.graduates}
              onChange={(e) => onChange("graduates", e.target.value)}
              placeholder={t('statistics.graduatesPlaceholder') || "130"}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-Aquamarine/10 rounded-lg flex items-center justify-center">
            <Save className="w-4 h-4 text-Aquamarine" />
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

        <label className="flex items-center space-x-3 p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-IcyBreeze dark:hover:bg-dark_input transition-all duration-200 cursor-pointer">
          <div className="w-8 h-8 bg-Aquamarine/10 rounded flex items-center justify-center">
            <Eye className="w-3 h-3 text-Aquamarine" />
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
              <Save className="w-3 h-3" />
              {t('sectionImages.createImage') || "Create Image"}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default SectionImageHeroForm;