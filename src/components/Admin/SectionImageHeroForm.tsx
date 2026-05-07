"use client";
import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import {
  Image, X, Save, Upload, FileText, User,
  Percent, Users, GraduationCap, Eye, FileEdit, Loader2,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import toast from "react-hot-toast";

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
  heroTitleAr: string;
  heroDescriptionAr: string;
  instructor1Ar: string;
  instructor1RoleAr: string;
  instructor2Ar: string;
  instructor2RoleAr: string;
  heroTitleEn: string;
  heroDescriptionEn: string;
  instructor1En: string;
  instructor1RoleEn: string;
  instructor2En: string;
  instructor2RoleEn: string;
  welcomeTitleAr: string;
  welcomeSubtitle1Ar: string;
  welcomeSubtitle2Ar: string;
  welcomeFeature1Ar: string;
  welcomeFeature2Ar: string;
  welcomeFeature3Ar: string;
  welcomeFeature4Ar: string;
  welcomeFeature5Ar: string;
  welcomeFeature6Ar: string;
  welcomeTitleEn: string;
  welcomeSubtitle1En: string;
  welcomeSubtitle2En: string;
  welcomeFeature1En: string;
  welcomeFeature2En: string;
  welcomeFeature3En: string;
  welcomeFeature4En: string;
  welcomeFeature5En: string;
  welcomeFeature6En: string;
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
  existingLanguages = [],
}) => {
  const { t } = useI18n();

  const [form, setForm] = useState<FormData>({
    language:       initial?.language       || "ar",
    imageUrl:       initial?.imageUrl       || "",
    secondImageUrl: initial?.secondImageUrl || "",
    imageAlt:       initial?.imageAlt       || "",
    secondImageAlt: initial?.secondImageAlt || "",

    heroTitleAr:       initial?.heroTitleAr       || "",
    heroDescriptionAr: initial?.heroDescriptionAr || "",
    instructor1Ar:     initial?.instructor1Ar     || "",
    instructor1RoleAr: initial?.instructor1RoleAr || "",
    instructor2Ar:     initial?.instructor2Ar     || "",
    instructor2RoleAr: initial?.instructor2RoleAr || "",

    heroTitleEn:       initial?.heroTitleEn       || "",
    heroDescriptionEn: initial?.heroDescriptionEn || "",
    instructor1En:     initial?.instructor1En     || "",
    instructor1RoleEn: initial?.instructor1RoleEn || "",
    instructor2En:     initial?.instructor2En     || "",
    instructor2RoleEn: initial?.instructor2RoleEn || "",

    welcomeTitleAr:     initial?.welcomeTitleAr     || "",
    welcomeSubtitle1Ar: initial?.welcomeSubtitle1Ar || "",
    welcomeSubtitle2Ar: initial?.welcomeSubtitle2Ar || "",
    welcomeFeature1Ar:  initial?.welcomeFeature1Ar  || "",
    welcomeFeature2Ar:  initial?.welcomeFeature2Ar  || "",
    welcomeFeature3Ar:  initial?.welcomeFeature3Ar  || "",
    welcomeFeature4Ar:  initial?.welcomeFeature4Ar  || "",
    welcomeFeature5Ar:  initial?.welcomeFeature5Ar  || "",
    welcomeFeature6Ar:  initial?.welcomeFeature6Ar  || "",

    welcomeTitleEn:     initial?.welcomeTitleEn     || "",
    welcomeSubtitle1En: initial?.welcomeSubtitle1En || "",
    welcomeSubtitle2En: initial?.welcomeSubtitle2En || "",
    welcomeFeature1En:  initial?.welcomeFeature1En  || "",
    welcomeFeature2En:  initial?.welcomeFeature2En  || "",
    welcomeFeature3En:  initial?.welcomeFeature3En  || "",
    welcomeFeature4En:  initial?.welcomeFeature4En  || "",
    welcomeFeature5En:  initial?.welcomeFeature5En  || "",
    welcomeFeature6En:  initial?.welcomeFeature6En  || "",

    discount:     initial?.discount     ?? 30,
    happyParents: initial?.happyParents || "250",
    graduates:    initial?.graduates    || "130",
    isActive:     initial?.isActive     ?? true,
    displayOrder: initial?.displayOrder ?? 0,
  });

  const [loading, setLoading]                     = useState(false);
  const [uploadingImage, setUploadingImage]       = useState(false);
  const [uploadingSecondImage, setUploadingSecondImage] = useState(false);
  const [imagePreview, setImagePreview]           = useState(initial?.imageUrl || "");
  const [secondImagePreview, setSecondImagePreview] = useState(initial?.secondImageUrl || "");

  // عند فتح فورم التعديل، تأكد إن الـ preview محمّل
  useEffect(() => {
    if (initial?.imageUrl)       setImagePreview(initial.imageUrl);
    if (initial?.secondImageUrl) setSecondImagePreview(initial.secondImageUrl);
  }, [initial]);

  const onChange = (field: FormField, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const uploadImageToCloudinary = async (base64: string, isSecond = false) => {
    const setUploading = isSecond ? setUploadingSecondImage : setUploadingImage;
    setUploading(true);
    const toastId = toast.loading(isSecond ? "جاري رفع الصورة الثانية..." : "جاري رفع الصورة...");
    try {
      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, folder: "section-images-hero" }),
      });
      const data = await res.json();
      if (data.success) {
        if (isSecond) {
          onChange("secondImageUrl", data.imageUrl);
          setSecondImagePreview(data.imageUrl);
        } else {
          onChange("imageUrl", data.imageUrl);
          setImagePreview(data.imageUrl);
        }
        toast.success("تم رفع الصورة بنجاح!", { id: toastId });
      } else {
        throw new Error(data.message || "فشل رفع الصورة");
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء رفع الصورة", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, isSecond = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("حجم الصورة يجب أن يكون أقل من 5 ميجابايت"); return; }
    if (!file.type.startsWith("image/")) { toast.error("يرجى اختيار ملف صورة صحيح"); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result as string;
      isSecond ? setSecondImagePreview(result) : setImagePreview(result);
      await uploadImageToCloudinary(result, isSecond);
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.imageUrl) { toast.error("رابط الصورة الرئيسية مطلوب"); return; }
    if (!form.language) { toast.error("اختر اللغة"); return; }

    setLoading(true);
    try {
      const isEdit  = !!initial?._id;
      const method  = isEdit ? "PUT" : "POST";
      const url     = isEdit
        ? `/api/section-images-hero/${initial._id}`
        : "/api/section-images-hero";

      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(isEdit ? "تم التحديث بنجاح" : "تم الإنشاء بنجاح");
        onSaved();
        onClose();
      } else {
        toast.error(data.message || "فشل في الحفظ");
      }
    } catch {
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  };

  const languageOptions = [
    { value: "ar", label: "العربية" },
    { value: "en", label: "English" },
  ].filter((o) => (initial ? true : !existingLanguages.includes(o.value)));

  const featureVal = (num: number, lang: "ar" | "en") =>
    form[`welcomeFeature${num}${lang === "ar" ? "Ar" : "En"}` as FormField] as string;

  const isBusy = loading || uploadingImage || uploadingSecondImage;

  // ── Image Upload Block ────────────────────────────────────────────────────
  const ImageBlock = ({ isSecond }: { isSecond: boolean }) => {
    const uploading = isSecond ? uploadingSecondImage : uploadingImage;
    const preview   = isSecond ? secondImagePreview   : imagePreview;
    const urlField  = isSecond ? "secondImageUrl"     : "imageUrl";
    const altField  = isSecond ? "secondImageAlt"     : "imageAlt";
    const label     = isSecond ? "الصورة الثانية (اختياري)" : "الصورة الرئيسية *";

    return (
      <div className="space-y-3">
        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">{label}</label>
        <div className="flex gap-4 items-start">
          <div className="flex-1 space-y-2">
            <input
              type="url"
              value={form[urlField] as string}
              onChange={(e) => {
                onChange(urlField as FormField, e.target.value);
                if (!isSecond) setImagePreview(e.target.value);
                else setSecondImagePreview(e.target.value);
              }}
              placeholder="أو أدخل رابط الصورة مباشرة"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
              disabled={uploading}
            />
            <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-12 cursor-pointer transition-colors ${
              uploading ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-primary/10 text-primary hover:bg-primary/20"
            }`}>
              {uploading ? <><Loader2 className="w-3 h-3 animate-spin" />جاري الرفع...</> : <><Upload className="w-3 h-3" />رفع صورة</>}
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, isSecond)} className="hidden" disabled={uploading} />
            </label>
          </div>
          {preview && (
            <div className="w-20 h-20 border border-PowderBlueBorder rounded-lg overflow-hidden relative flex-shrink-0">
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <label className="block text-12 text-SlateBlueText dark:text-darktext">
            {isSecond ? "نص بديل للصورة الثانية" : "نص بديل للصورة الرئيسية"}
          </label>
          <input
            type="text"
            value={form[altField] as string}
            onChange={(e) => onChange(altField as FormField, e.target.value)}
            placeholder="نص وصفي للصورة"
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
          />
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={submit} className="space-y-6">

      {/* ── Basic Info ─────────────────────────────────────────────────────── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">معلومات أساسية</h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">اللغة وترتيب العرض</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">اللغة *</label>
            <select
              value={form.language}
              onChange={(e) => onChange("language", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
              required
              disabled={!!initial}
            >
              <option value="">اختر اللغة...</option>
              {languageOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {initial && (
              <p className="text-11 text-SlateBlueText dark:text-darktext">لا يمكن تغيير اللغة عند التعديل</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">ترتيب العرض</label>
            <input
              type="number"
              value={form.displayOrder}
              onChange={(e) => onChange("displayOrder", parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
              min="0"
            />
            <p className="text-11 text-SlateBlueText dark:text-darktext">الأرقام الأصغر تظهر أولاً</p>
          </div>
        </div>
      </div>

      {/* ── Images ─────────────────────────────────────────────────────────── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-Aquamarine/10 rounded-lg flex items-center justify-center">
            <Image className="w-4 h-4 text-Aquamarine" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">الصور</h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">رفع عبر Cloudinary (حد أقصى 5 ميجابايت)</p>
          </div>
        </div>
        <ImageBlock isSecond={false} />
        <div className="border-t border-PowderBlueBorder dark:border-dark_border pt-4">
          <ImageBlock isSecond={true} />
        </div>
      </div>

      {/* ── Hero Arabic ─────────────────────────────────────────────────────── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-ElectricAqua/10 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-ElectricAqua" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">قسم الهيرو — العربية</h3>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">عنوان الهيرو (عربي)</label>
          <input type="text" value={form.heroTitleAr} onChange={(e) => onChange("heroTitleAr", e.target.value)}
            placeholder="عنوان قسم الهيرو بالعربية"
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white" />
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <FileEdit className="w-3 h-3" /> وصف الهيرو (عربي)
          </label>
          <textarea value={form.heroDescriptionAr} onChange={(e) => onChange("heroDescriptionAr", e.target.value)}
            placeholder="وصف قسم الهيرو بالعربية..." rows={3}
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white resize-none" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {[
            { field: "instructor1Ar",     label: "المدرب الأول (عربي)",        ph: "اسم المدرب" },
            { field: "instructor1RoleAr", label: "دور المدرب الأول (عربي)",    ph: "دور المدرب" },
            { field: "instructor2Ar",     label: "المدرب الثاني (عربي)",       ph: "اسم المدرب" },
            { field: "instructor2RoleAr", label: "دور المدرب الثاني (عربي)",   ph: "دور المدرب" },
          ].map(({ field, label, ph }) => (
            <div key={field} className="space-y-2">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">{label}</label>
              <input type="text" value={form[field as FormField] as string}
                onChange={(e) => onChange(field as FormField, e.target.value)} placeholder={ph}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Hero English ─────────────────────────────────────────────────────── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-LightYellow/10 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-LightYellow" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">Hero Section — English</h3>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">Hero Title (English)</label>
          <input type="text" value={form.heroTitleEn} onChange={(e) => onChange("heroTitleEn", e.target.value)}
            placeholder="Hero section title in English"
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white" />
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <FileEdit className="w-3 h-3" /> Hero Description (English)
          </label>
          <textarea value={form.heroDescriptionEn} onChange={(e) => onChange("heroDescriptionEn", e.target.value)}
            placeholder="Hero section description in English..." rows={3}
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white resize-none" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {[
            { field: "instructor1En",     label: "Instructor 1 (English)",       ph: "Instructor name" },
            { field: "instructor1RoleEn", label: "Instructor 1 Role (English)",  ph: "Instructor role" },
            { field: "instructor2En",     label: "Instructor 2 (English)",       ph: "Instructor name" },
            { field: "instructor2RoleEn", label: "Instructor 2 Role (English)",  ph: "Instructor role" },
          ].map(({ field, label, ph }) => (
            <div key={field} className="space-y-2">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">{label}</label>
              <input type="text" value={form[field as FormField] as string}
                onChange={(e) => onChange(field as FormField, e.target.value)} placeholder={ph}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Welcome Arabic ───────────────────────────────────────────────────── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-ElectricAqua/10 rounded-lg flex items-center justify-center">
            <Eye className="w-4 h-4 text-ElectricAqua" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">نافذة الترحيب — العربية</h3>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">عنوان الترحيب (عربي)</label>
          <input type="text" value={form.welcomeTitleAr} onChange={(e) => onChange("welcomeTitleAr", e.target.value)}
            placeholder="عنوان نافذة الترحيب"
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">العنوان الفرعي 1 (عربي)</label>
            <input type="text" value={form.welcomeSubtitle1Ar} onChange={(e) => onChange("welcomeSubtitle1Ar", e.target.value)}
              placeholder="العنوان الفرعي الأول"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white" />
          </div>
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">العنوان الفرعي 2 (عربي)</label>
            <input type="text" value={form.welcomeSubtitle2Ar} onChange={(e) => onChange("welcomeSubtitle2Ar", e.target.value)}
              placeholder="العنوان الفرعي الثاني"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <div key={num} className="space-y-2">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">الميزة {num} (عربي)</label>
              <input type="text" value={featureVal(num, "ar")}
                onChange={(e) => onChange(`welcomeFeature${num}Ar` as FormField, e.target.value)}
                placeholder={`الميزة ${num} بالعربية`}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Welcome English ──────────────────────────────────────────────────── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-LightYellow/10 rounded-lg flex items-center justify-center">
            <Eye className="w-4 h-4 text-LightYellow" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">Welcome Popup — English</h3>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">Welcome Title (English)</label>
          <input type="text" value={form.welcomeTitleEn} onChange={(e) => onChange("welcomeTitleEn", e.target.value)}
            placeholder="Welcome popup title"
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">Subtitle 1 (English)</label>
            <input type="text" value={form.welcomeSubtitle1En} onChange={(e) => onChange("welcomeSubtitle1En", e.target.value)}
              placeholder="First subtitle"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white" />
          </div>
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">Subtitle 2 (English)</label>
            <input type="text" value={form.welcomeSubtitle2En} onChange={(e) => onChange("welcomeSubtitle2En", e.target.value)}
              placeholder="Second subtitle"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <div key={num} className="space-y-2">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">Feature {num} (English)</label>
              <input type="text" value={featureVal(num, "en")}
                onChange={(e) => onChange(`welcomeFeature${num}En` as FormField, e.target.value)}
                placeholder={`Feature ${num} in English`}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Statistics ──────────────────────────────────────────────────────── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Percent className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">الأرقام والإحصائيات</h3>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Percent className="w-3 h-3" /> نسبة الخصم (%)
            </label>
            <input type="number" value={form.discount}
              onChange={(e) => onChange("discount", parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
              min="0" max="100" />
          </div>
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Users className="w-3 h-3" /> أولياء الأمور السعداء
            </label>
            <input type="text" value={form.happyParents}
              onChange={(e) => onChange("happyParents", e.target.value)} placeholder="250"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white" />
          </div>
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <GraduationCap className="w-3 h-3" /> الخريجون
            </label>
            <input type="text" value={form.graduates}
              onChange={(e) => onChange("graduates", e.target.value)} placeholder="130"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white" />
          </div>
        </div>
      </div>

      {/* ── Settings ─────────────────────────────────────────────────────────── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-Aquamarine/10 rounded-lg flex items-center justify-center">
            <Save className="w-4 h-4 text-Aquamarine" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">الإعدادات</h3>
          </div>
        </div>
        <label className="flex items-center space-x-3 p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-IcyBreeze dark:hover:bg-dark_input transition-all duration-200 cursor-pointer">
          <div className="w-8 h-8 bg-Aquamarine/10 rounded flex items-center justify-center">
            <Eye className="w-3 h-3 text-Aquamarine" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isActive}
                onChange={(e) => onChange("isActive", e.target.checked)}
                className="w-4 h-4 text-Aquamarine focus:ring-Aquamarine border-PowderBlueBorder rounded" />
              <span className="text-13 font-medium text-MidnightNavyText dark:text-white">تفعيل الصورة</span>
            </div>
            <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">
              اجعل هذه الصورة مرئية في القسم المحدد
            </p>
          </div>
        </label>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
        <button type="button" onClick={onClose} disabled={isBusy}
          className="flex-1 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 hover:bg-IcyBreeze dark:hover:bg-darklight hover:shadow-md flex items-center justify-center gap-2">
          <X className="w-3 h-3" /> إلغاء
        </button>
        <button type="submit" disabled={isBusy}
          className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading
            ? <><Loader2 className="w-3 h-3 animate-spin" /> جاري الحفظ...</>
            : initial
            ? <><Save className="w-3 h-3" /> تحديث</>
            : <><Save className="w-3 h-3" /> إنشاء</>}
        </button>
      </div>
    </form>
  );
};

export default SectionImageHeroForm;