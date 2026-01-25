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
  existingLanguages?: string[];
}

interface FormData {
  language: string;
  imageUrl: string;
  secondImageUrl: string;
  imageAlt: string;
  secondImageAlt: string;
  
  // Hero Arabic
  heroTitleAr: string;
  heroDescriptionAr: string;
  instructor1Ar: string;
  instructor1RoleAr: string;
  instructor2Ar: string;
  instructor2RoleAr: string;
  
  // Hero English
  heroTitleEn: string;
  heroDescriptionEn: string;
  instructor1En: string;
  instructor1RoleEn: string;
  instructor2En: string;
  instructor2RoleEn: string;
  
  // Welcome Arabic
  welcomeTitleAr: string;
  welcomeSubtitle1Ar: string;
  welcomeSubtitle2Ar: string;
  welcomeFeature1Ar: string;
  welcomeFeature2Ar: string;
  welcomeFeature3Ar: string;
  welcomeFeature4Ar: string;
  welcomeFeature5Ar: string;
  welcomeFeature6Ar: string;
  
  // Welcome English
  welcomeTitleEn: string;
  welcomeSubtitle1En: string;
  welcomeSubtitle2En: string;
  welcomeFeature1En: string;
  welcomeFeature2En: string;
  welcomeFeature3En: string;
  welcomeFeature4En: string;
  welcomeFeature5En: string;
  welcomeFeature6En: string;
  
  // Numbers
  discount: number;
  happyParents: string;
  graduates: string;
  
  isActive: boolean;
  displayOrder: number;
}

type FormField = keyof FormData;

const SectionImageHeroForm: React.FC<SectionImageHeroFormProps> = ({ 
  initial, 
  onClose, 
  onSaved,
  existingLanguages = [] 
}) => {
  const { t } = useI18n();
  const [form, setForm] = useState<FormData>({
    language: initial?.language || "ar",
    imageUrl: initial?.imageUrl || "",
    secondImageUrl: initial?.secondImageUrl || "",
    imageAlt: initial?.imageAlt || "",
    secondImageAlt: initial?.secondImageAlt || "",
    
    // Hero Arabic
    heroTitleAr: initial?.heroTitleAr || "",
    heroDescriptionAr: initial?.heroDescriptionAr || "",
    instructor1Ar: initial?.instructor1Ar || "",
    instructor1RoleAr: initial?.instructor1RoleAr || "",
    instructor2Ar: initial?.instructor2Ar || "",
    instructor2RoleAr: initial?.instructor2RoleAr || "",
    
    // Hero English
    heroTitleEn: initial?.heroTitleEn || "",
    heroDescriptionEn: initial?.heroDescriptionEn || "",
    instructor1En: initial?.instructor1En || "",
    instructor1RoleEn: initial?.instructor1RoleEn || "",
    instructor2En: initial?.instructor2En || "",
    instructor2RoleEn: initial?.instructor2RoleEn || "",
    
    // Welcome Arabic
    welcomeTitleAr: initial?.welcomeTitleAr || "",
    welcomeSubtitle1Ar: initial?.welcomeSubtitle1Ar || "",
    welcomeSubtitle2Ar: initial?.welcomeSubtitle2Ar || "",
    welcomeFeature1Ar: initial?.welcomeFeature1Ar || "",
    welcomeFeature2Ar: initial?.welcomeFeature2Ar || "",
    welcomeFeature3Ar: initial?.welcomeFeature3Ar || "",
    welcomeFeature4Ar: initial?.welcomeFeature4Ar || "",
    welcomeFeature5Ar: initial?.welcomeFeature5Ar || "",
    welcomeFeature6Ar: initial?.welcomeFeature6Ar || "",
    
    // Welcome English
    welcomeTitleEn: initial?.welcomeTitleEn || "",
    welcomeSubtitle1En: initial?.welcomeSubtitle1En || "",
    welcomeSubtitle2En: initial?.welcomeSubtitle2En || "",
    welcomeFeature1En: initial?.welcomeFeature1En || "",
    welcomeFeature2En: initial?.welcomeFeature2En || "",
    welcomeFeature3En: initial?.welcomeFeature3En || "",
    welcomeFeature4En: initial?.welcomeFeature4En || "",
    welcomeFeature5En: initial?.welcomeFeature5En || "",
    welcomeFeature6En: initial?.welcomeFeature6En || "",
    
    // Numbers
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

  const onChange = (field: FormField, value: any): void => {
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

      // منع إنشاء سجل بلغة موجودة مسبقاً (في حالة الإنشاء فقط)
      if (!initial && existingLanguages.includes(payload.language)) {
        alert(`يوجد بالفعل سجل للغة ${payload.language}. يمكنك تعديله بدلاً من إنشاء جديد.`);
        setLoading(false);
        return;
      }

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

  const languageOptions = [
    { value: "ar", label: "العربية" },
    { value: "en", label: "English" },
  ].filter(option => 
    // في حالة التعديل، نعرض كل اللغات
    // في حالة الإنشاء، نعرض فقط اللغات غير الموجودة
    initial ? true : !existingLanguages.includes(option.value)
  );

  const getWelcomeFeatureValue = (num: number, lang: string): string => {
    const fieldName = `welcomeFeature${num}${lang === 'ar' ? 'Ar' : 'En'}` as keyof FormData;
    return form[fieldName] as string;
  };

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
              {t('sectionImages.basicInfoDescription') || "Basic details about the image"}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t('common.language') || "Language"} *
            </label>
            <select
              value={form.language}
              onChange={(e) => onChange("language", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
              required
              disabled={!!initial} // لا يمكن تغيير اللغة عند التعديل
            >
              <option value="">{t('sectionImages.chooseLanguage') || "Choose language..."}</option>
              {languageOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {initial && (
              <p className="text-11 text-SlateBlueText dark:text-darktext mt-1">
                لا يمكن تغيير اللغة عند التعديل
              </p>
            )}
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
              {t('sectionImages.imageUploadDescription') || "Upload or provide links for images"}
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

      {/* Hero Section Data - العربية */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-ElectricAqua/10 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-ElectricAqua" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              بيانات قسم الهيرو - العربية
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              معلومات قسم الهيرو باللغة العربية
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
            عنوان الهيرو (عربي)
          </label>
          <input
            type="text"
            value={form.heroTitleAr}
            onChange={(e) => onChange("heroTitleAr", e.target.value)}
            placeholder="عنوان قسم الهيرو بالعربية"
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <FileEdit className="w-3 h-3" />
            وصف الهيرو (عربي)
          </label>
          <textarea
            value={form.heroDescriptionAr}
            onChange={(e) => onChange("heroDescriptionAr", e.target.value)}
            placeholder="وصف قسم الهيرو بالعربية..."
            rows={3}
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white resize-none"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              المدرب الأول (عربي)
            </label>
            <input
              type="text"
              value={form.instructor1Ar}
              onChange={(e) => onChange("instructor1Ar", e.target.value)}
              placeholder="اسم المدرب بالعربية"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              دور المدرب الأول (عربي)
            </label>
            <input
              type="text"
              value={form.instructor1RoleAr}
              onChange={(e) => onChange("instructor1RoleAr", e.target.value)}
              placeholder="دور المدرب بالعربية"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              المدرب الثاني (عربي)
            </label>
            <input
              type="text"
              value={form.instructor2Ar}
              onChange={(e) => onChange("instructor2Ar", e.target.value)}
              placeholder="اسم المدرب بالعربية"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              دور المدرب الثاني (عربي)
            </label>
            <input
              type="text"
              value={form.instructor2RoleAr}
              onChange={(e) => onChange("instructor2RoleAr", e.target.value)}
              placeholder="دور المدرب بالعربية"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Hero Section Data - English */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-LightYellow/10 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-LightYellow" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              Hero Section Data - English
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              Hero section information in English
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
            Hero Title (English)
          </label>
          <input
            type="text"
            value={form.heroTitleEn}
            onChange={(e) => onChange("heroTitleEn", e.target.value)}
            placeholder="Hero section title in English"
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <FileEdit className="w-3 h-3" />
            Hero Description (English)
          </label>
          <textarea
            value={form.heroDescriptionEn}
            onChange={(e) => onChange("heroDescriptionEn", e.target.value)}
            placeholder="Hero section description in English..."
            rows={3}
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white resize-none"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              Instructor 1 (English)
            </label>
            <input
              type="text"
              value={form.instructor1En}
              onChange={(e) => onChange("instructor1En", e.target.value)}
              placeholder="Instructor name in English"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              Instructor 1 Role (English)
            </label>
            <input
              type="text"
              value={form.instructor1RoleEn}
              onChange={(e) => onChange("instructor1RoleEn", e.target.value)}
              placeholder="Instructor role in English"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              Instructor 2 (English)
            </label>
            <input
              type="text"
              value={form.instructor2En}
              onChange={(e) => onChange("instructor2En", e.target.value)}
              placeholder="Instructor name in English"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              Instructor 2 Role (English)
            </label>
            <input
              type="text"
              value={form.instructor2RoleEn}
              onChange={(e) => onChange("instructor2RoleEn", e.target.value)}
              placeholder="Instructor role in English"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Welcome Popup Data - العربية */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-ElectricAqua/10 rounded-lg flex items-center justify-center">
            <Eye className="w-4 h-4 text-ElectricAqua" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              بيانات نافذة الترحيب - العربية
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              معلومات نافذة الترحيب باللغة العربية
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
            عنوان الترحيب (عربي)
          </label>
          <input
            type="text"
            value={form.welcomeTitleAr}
            onChange={(e) => onChange("welcomeTitleAr", e.target.value)}
            placeholder="عنوان نافذة الترحيب بالعربية"
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              العنوان الفرعي 1 (عربي)
            </label>
            <input
              type="text"
              value={form.welcomeSubtitle1Ar}
              onChange={(e) => onChange("welcomeSubtitle1Ar", e.target.value)}
              placeholder="العنوان الفرعي الأول بالعربية"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              العنوان الفرعي 2 (عربي)
            </label>
            <input
              type="text"
              value={form.welcomeSubtitle2Ar}
              onChange={(e) => onChange("welcomeSubtitle2Ar", e.target.value)}
              placeholder="العنوان الفرعي الثاني بالعربية"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            />
          </div>
        </div>

        {/* Welcome Features Arabic */}
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map(num => (
            <div key={num} className="space-y-2">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                الميزة {num} (عربي)
              </label>
              <input
                type="text"
                value={getWelcomeFeatureValue(num, 'ar')}
                onChange={(e) => onChange(`welcomeFeature${num}Ar` as FormField, e.target.value)}
                placeholder={`الميزة ${num} بالعربية`}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Welcome Popup Data - English */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-LightYellow/10 rounded-lg flex items-center justify-center">
            <Eye className="w-4 h-4 text-LightYellow" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              Welcome Popup Data - English
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              Welcome popup information in English
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
            Welcome Title (English)
          </label>
          <input
            type="text"
            value={form.welcomeTitleEn}
            onChange={(e) => onChange("welcomeTitleEn", e.target.value)}
            placeholder="Welcome popup title in English"
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              Subtitle 1 (English)
            </label>
            <input
              type="text"
              value={form.welcomeSubtitle1En}
              onChange={(e) => onChange("welcomeSubtitle1En", e.target.value)}
              placeholder="First subtitle in English"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              Subtitle 2 (English)
            </label>
            <input
              type="text"
              value={form.welcomeSubtitle2En}
              onChange={(e) => onChange("welcomeSubtitle2En", e.target.value)}
              placeholder="Second subtitle in English"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            />
          </div>
        </div>

        {/* Welcome Features English */}
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map(num => (
            <div key={num} className="space-y-2">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                Feature {num} (English)
              </label>
              <input
                type="text"
                value={getWelcomeFeatureValue(num, 'en')}
                onChange={(e) => onChange(`welcomeFeature${num}En` as FormField, e.target.value)}
                placeholder={`Feature ${num} in English`}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
              />
            </div>
          ))}
        </div>
      </div>

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