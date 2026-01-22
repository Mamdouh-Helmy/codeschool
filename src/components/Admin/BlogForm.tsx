"use client";
import { useState, useEffect } from "react";
import {
  Calendar,
  FileText,
  Image,
  Tag,
  User,
  Upload,
  X,
  Save,
  Rocket,
  Plus,
  Trash2,
  Eye,
  Clock,
  Mail,
  Shield,
  Languages,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import RichTextEditor from "../Blog/RichTextEditor";

interface Props {
  initial?: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function BlogForm({ initial, onClose, onSaved }: Props) {
  const { t } = useI18n();

  // دالة لتحويل التاريخ من ISO إلى تنسيق date
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const [form, setForm] = useState(() => ({
    // البيانات بالعربية
    title_ar: initial?.title_ar || "",
    body_ar: initial?.body_ar || "",
    excerpt_ar: initial?.excerpt_ar || "",
    imageAlt_ar: initial?.imageAlt_ar || "",
    category_ar: initial?.category_ar || "",

    // البيانات بالإنجليزية
    title_en: initial?.title_en || "",
    body_en: initial?.body_en || "",
    excerpt_en: initial?.excerpt_en || "",
    imageAlt_en: initial?.imageAlt_en || "",
    category_en: initial?.category_en || "",

    // البيانات المشتركة
    image: initial?.image || "",
    publishDate: formatDateForInput(initial?.publishDate),
    author: {
      name_ar: initial?.author?.name_ar || "",
      name_en: initial?.author?.name_en || "",
      email: initial?.author?.email || "",
      avatar: initial?.author?.avatar || "/images/default-avatar.jpg",
      role: initial?.author?.role || "Author",
    },
    tags_ar: initial?.tags_ar || [],
    tags_en: initial?.tags_en || [],
    featured: initial?.featured || false,
    status: initial?.status || "draft",
  }));

  const [tagsAr, setTagsAr] = useState<string[]>(initial?.tags_ar || []);
  const [tagsEn, setTagsEn] = useState<string[]>(initial?.tags_en || []);
  const [newTagInputAr, setNewTagInputAr] = useState("");
  const [newTagInputEn, setNewTagInputEn] = useState("");
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [authorAvatarPreview, setAuthorAvatarPreview] = useState("");
  const [activeLanguage, setActiveLanguage] = useState<"ar" | "en">("ar");

  // ✅ دالة محسنة لتحويل الملف إلى Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (reader.result) {
          resolve(reader.result as string);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  // ✅ دالة محسنة لتنظيف رابط الصورة
  const cleanImageUrl = (url: string): string => {
    if (!url || typeof url !== 'string') return '';
    
    let cleaned = url.trim();
    
    // إزالة أي / زائدة في النهاية
    if (cleaned.endsWith('/')) {
      cleaned = cleaned.slice(0, -1);
    }
    
    // إذا كان الرابط يحتوي فقط على /uploads/ بدون اسم ملف
    if (cleaned === '/uploads/' || cleaned === '/uploads') {
      return '';
    }
    
    return cleaned;
  };

  // معاينة الصور
  useEffect(() => {
    if (form.image) {
      setImagePreview(form.image);
    }
    if (form.author.avatar) {
      setAuthorAvatarPreview(form.author.avatar);
    }
  }, [form.image, form.author.avatar]);

  const onChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onChangeAuthor = (field: string, value: any) => {
    setForm((prev) => ({
      ...prev,
      author: { ...prev.author, [field]: value }
    }));
  };

  // إضافة tag جديد للعربية
  const addTagAr = () => {
    const tag = newTagInputAr.trim();
    if (tag && !tagsAr.includes(tag)) {
      const updatedTags = [...tagsAr, tag];
      setTagsAr(updatedTags);
      setNewTagInputAr("");
      onChange("tags_ar", updatedTags);
    }
  };

  // إضافة tag جديد للإنجليزية
  const addTagEn = () => {
    const tag = newTagInputEn.trim();
    if (tag && !tagsEn.includes(tag)) {
      const updatedTags = [...tagsEn, tag];
      setTagsEn(updatedTags);
      setNewTagInputEn("");
      onChange("tags_en", updatedTags);
    }
  };

  // حذف tag عربي
  const removeTagAr = (index: number) => {
    const updatedTags = tagsAr.filter((_, i) => i !== index);
    setTagsAr(updatedTags);
    onChange("tags_ar", updatedTags);
  };

  // حذف tag إنجليزي
  const removeTagEn = (index: number) => {
    const updatedTags = tagsEn.filter((_, i) => i !== index);
    setTagsEn(updatedTags);
    onChange("tags_en", updatedTags);
  };

  // إدخال بالزر Enter للـ tags
  const handleTagKeyPress = (e: React.KeyboardEvent, language: "ar" | "en") => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (language === "ar") {
        addTagAr();
      } else {
        addTagEn();
      }
    }
  };

  // ✅ معالجة رفع صورة المقال - تستخدم Base64 مباشرة
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("نوع الملف غير مدعوم. يرجى استخدام صورة (JPEG, PNG, WebP)");
      return;
    }

    // التحقق من الحجم (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("حجم الملف كبير جداً. الحد الأقصى 5MB");
      return;
    }

    const previousLoading = loading;
    setLoading(true);
    
    try {
      // ✅ تحويل الملف إلى Base64 مباشرة
      const base64Image = await fileToBase64(file);
      
      // ✅ تنظيف الصورة إذا كانت URL
      const cleanedImage = cleanImageUrl(base64Image);
      
      // ✅ حفظ Base64 في الحالة
      onChange("image", cleanedImage);
      
      // عرض معاينة محلية
      const localPreview = URL.createObjectURL(file);
      setImagePreview(localPreview);

      // تنظيف المعاينة المحلية بعد ثانية
      setTimeout(() => {
        URL.revokeObjectURL(localPreview);
      }, 1000);

      console.log("✅ Image converted to Base64 successfully");

    } catch (error: any) {
      console.error("Upload error:", error);
      alert(`خطأ في تحويل الصورة: ${error.message}`);
      setImagePreview("");
    } finally {
      setLoading(previousLoading);
    }
  };

  // ✅ معالجة رفع صورة المؤلف - تستخدم Base64 مباشرة
  const handleAuthorAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("نوع الملف غير مدعوم. يرجى استخدام صورة (JPEG, PNG, WebP)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("حجم الملف كبير جداً. الحد الأقصى 2MB");
      return;
    }

    const previousLoading = loading;
    setLoading(true);
    
    try {
      // ✅ تحويل الملف إلى Base64 مباشرة
      const base64Image = await fileToBase64(file);
      
      // ✅ تنظيف الصورة
      const cleanedAvatar = cleanImageUrl(base64Image);
      
      // ✅ حفظ Base64 في الحالة
      onChangeAuthor("avatar", cleanedAvatar || "/images/default-avatar.jpg");
      
      // عرض معاينة محلية
      const localPreview = URL.createObjectURL(file);
      setAuthorAvatarPreview(localPreview);

      setTimeout(() => {
        URL.revokeObjectURL(localPreview);
      }, 1000);

      console.log("✅ Author avatar converted to Base64 successfully");

    } catch (error: any) {
      console.error("Upload error:", error);
      alert(`خطأ في تحويل الصورة: ${error.message}`);
      setAuthorAvatarPreview("");
    } finally {
      setLoading(previousLoading);
    }
  };

  // توليد excerpt تلقائياً من النص
  const generateExcerpt = (body: string) => {
    const plain = body.replace(/<[^>]*>/g, "");
    return plain.length > 150 ? plain.substring(0, 150) + "..." : plain;
  };

  // عند تغيير النص، توليد excerpt تلقائياً
  const handleBodyChange = (value: string, language: "ar" | "en") => {
    const field = language === "ar" ? "body_ar" : "body_en";
    const excerptField = language === "ar" ? "excerpt_ar" : "excerpt_en";

    onChange(field, value);

    // توليد excerpt تلقائي إذا لم يتم توفيره
    const currentExcerpt = language === "ar" ? form.excerpt_ar : form.excerpt_en;
    if (!currentExcerpt || currentExcerpt === generateExcerpt(language === "ar" ? form.body_ar : form.body_en)) {
      onChange(excerptField, generateExcerpt(value));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ تنظيف روابط الصور قبل الإرسال
      const cleanedForm = {
        ...form,
        image: cleanImageUrl(form.image),
        author: {
          ...form.author,
          avatar: cleanImageUrl(form.author.avatar) || "/images/default-avatar.jpg"
        },
        tags_ar: tagsAr,
        tags_en: tagsEn,
        publishDate: form.publishDate
          ? new Date(form.publishDate).toISOString()
          : new Date().toISOString(),
      };

      console.log("📤 Submitting blog data:", {
        title_ar: cleanedForm.title_ar,
        title_en: cleanedForm.title_en,
        image: cleanedForm.image ? "Base64 image (truncated)" : "No image",
        authorAvatar: cleanedForm.author.avatar ? "Base64 avatar (truncated)" : "Default avatar",
        tags_ar: cleanedForm.tags_ar.length,
        tags_en: cleanedForm.tags_en.length
      });

      // إضافة تحقق من البيانات المطلوبة
      if (!cleanedForm.title_ar && !cleanedForm.title_en) {
        alert("الرجاء إدخال عنوان المقال بالعربية أو الإنجليزية");
        setLoading(false);
        return;
      }

      if (!cleanedForm.body_ar && !cleanedForm.body_en) {
        alert("الرجاء إدخال محتوى المقال بالعربية أو الإنجليزية");
        setLoading(false);
        return;
      }

      // ✅ إرسال البيانات مباشرة
      const method = initial?._id ? "PUT" : "POST";
      const url = initial?._id
        ? `/api/blog/${encodeURIComponent(initial._id)}`
        : "/api/blog";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanedForm),
      });

      if (!res.ok) {
        let errorMessage = `HTTP error! status: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
          if (errorData.errors) {
            errorMessage += `\n${errorData.errors.join("\n")}`;
          }
        } catch {
          const text = await res.text();
          if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
      }

      const result = await res.json();

      if (result.success) {
        alert(result.message || "تم حفظ المقال بنجاح!");
        onSaved();
        onClose();
      } else {
        throw new Error(result.message || "Operation failed");
      }
    } catch (err: any) {
      console.error("Error submitting blog:", err);
      alert(`خطأ: ${err.message || "حدث خطأ غير معروف"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Language Selector */}
      <div className="bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Languages className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t('blogForm.language') || "Language Selection"}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t('blogForm.languageDescription') || "Select the language you want to edit"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveLanguage("ar")}
            className={`flex-1 px-4 py-3 rounded-lg border transition-all duration-200 font-medium ${activeLanguage === "ar"
                ? "bg-primary text-white border-primary"
                : "bg-white dark:bg-dark_input border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white"
              }`}
          >
            العربية
          </button>
          <button
            type="button"
            onClick={() => setActiveLanguage("en")}
            className={`flex-1 px-4 py-3 rounded-lg border transition-all duration-200 font-medium ${activeLanguage === "en"
                ? "bg-primary text-white border-primary"
                : "bg-white dark:bg-dark_input border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white"
              }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Basic Information */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t('blogForm.basicInfo') || "Blog Information"} - {activeLanguage === "ar" ? "العربية" : "English"}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t('blogForm.basicInfoDescription') || "Basic details about the blog post"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <FileText className="w-3 h-3 text-primary" />
            {t('blogForm.title') || "Title"} * - {activeLanguage === "ar" ? "العربية" : "English"}
          </label>
          <input
            type="text"
            value={activeLanguage === "ar" ? form.title_ar : form.title_en}
            onChange={(e) => onChange(activeLanguage === "ar" ? "title_ar" : "title_en", e.target.value)}
            placeholder={
              activeLanguage === "ar"
                ? (t('blogForm.titlePlaceholder') || "أدخل عنوان المقال")
                : (t('blogForm.titlePlaceholder') || "Enter blog post title")
            }
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            required
            dir={activeLanguage === "ar" ? "rtl" : "ltr"}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <FileText className="w-3 h-3 text-primary" />
            {t('blogForm.excerpt') || "Excerpt"} - {activeLanguage === "ar" ? "العربية" : "English"}
          </label>
          <textarea
            value={activeLanguage === "ar" ? form.excerpt_ar : form.excerpt_en}
            onChange={(e) => onChange(activeLanguage === "ar" ? "excerpt_ar" : "excerpt_en", e.target.value)}
            rows={2}
            placeholder={
              activeLanguage === "ar"
                ? (t('blogForm.excerptPlaceholder') || "وصف مختصر للمقال (يتم توليده تلقائياً من المحتوى)")
                : (t('blogForm.excerptPlaceholder') || "Brief description of the blog post (auto-generated from content)")
            }
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 resize-none transition-all duration-200"
            dir={activeLanguage === "ar" ? "rtl" : "ltr"}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <FileText className="w-3 h-3 text-primary" />
            {t('blogForm.category') || "Category"} - {activeLanguage === "ar" ? "العربية" : "English"}
          </label>
          <input
            type="text"
            value={activeLanguage === "ar" ? form.category_ar : form.category_en}
            onChange={(e) => onChange(activeLanguage === "ar" ? "category_ar" : "category_en", e.target.value)}
            placeholder={
              activeLanguage === "ar"
                ? "مثل: تكنولوجيا، أعمال، تصميم"
                : "e.g., Technology, Business, Design"
            }
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            dir={activeLanguage === "ar" ? "rtl" : "ltr"}
          />
        </div>
      </div>

      {/* Author Information */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-Aquamarine/10 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-Aquamarine" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t('blogForm.authorInfo') || "Author Information"} - {activeLanguage === "ar" ? "العربية" : "English"}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t('blogForm.authorInfoDescription') || "Details about the author of this blog post"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <User className="w-3 h-3 text-Aquamarine" />
            {t('blogForm.authorName') || "Author Name"} * - {activeLanguage === "ar" ? "العربية" : "English"}
          </label>
          <input
            type="text"
            value={activeLanguage === "ar" ? form.author.name_ar : form.author.name_en}
            onChange={(e) => onChangeAuthor(activeLanguage === "ar" ? "name_ar" : "name_en", e.target.value)}
            placeholder={
              activeLanguage === "ar"
                ? "اسم المؤلف"
                : "Author name"
            }
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            required
            dir={activeLanguage === "ar" ? "rtl" : "ltr"}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Mail className="w-3 h-3 text-Aquamarine" />
              {t('blogForm.authorEmail') || "Author Email"}
            </label>
            <input
              type="email"
              value={form.author.email}
              onChange={(e) => onChangeAuthor("email", e.target.value)}
              placeholder="author@example.com"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Shield className="w-3 h-3 text-Aquamarine" />
              {t('blogForm.authorRole') || "Author Role"}
            </label>
            <select
              value={form.author.role}
              onChange={(e) => onChangeAuthor("role", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            >
              <option value="Author">{t('blogForm.authorRoles.author') || "Author"}</option>
              <option value="Editor">{t('blogForm.authorRoles.editor') || "Editor"}</option>
              <option value="Contributor">{t('blogForm.authorRoles.contributor') || "Contributor"}</option>
              <option value="Admin">{t('blogForm.authorRoles.admin') || "Admin"}</option>
              <option value="Guest">{t('blogForm.authorRoles.guest') || "Guest Writer"}</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
            {t('blogForm.authorAvatar') || "Author Avatar"}
          </label>
          <div className="flex gap-3 items-start">
            <div className="flex-1">
              <input
                type="text"
                value={form.author.avatar}
                onChange={(e) => onChangeAuthor("avatar", e.target.value)}
                placeholder={t('blogForm.avatarPlaceholder') || "Avatar URL or upload file"}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              />
              <div className="mt-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-Aquamarine/10 text-Aquamarine rounded-lg text-12 cursor-pointer hover:bg-Aquamarine/20 transition-colors">
                  <Upload className="w-3 h-3" />
                  {t('blogForm.uploadAvatar') || "Upload Avatar"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAuthorAvatarUpload}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
                {authorAvatarPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeAuthor("avatar", "/images/default-avatar.jpg");
                      setAuthorAvatarPreview("");
                    }}
                    className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-12 cursor-pointer hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    {t('blogForm.remove') || "Remove"}
                  </button>
                )}
              </div>
            </div>

            {authorAvatarPreview && (
              <div className="w-16 h-16 border border-PowderBlueBorder rounded-full overflow-hidden">
                <img
                  src={authorAvatarPreview}
                  alt="Author Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-LightYellow/10 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-LightYellow" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t('blogForm.content') || "Content"} - {activeLanguage === "ar" ? "العربية" : "English"}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t('blogForm.contentDescription') || "Main content of the blog post (HTML/Markdown supported)"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
            {t('blogForm.bodyContent') || "Body Content"} * - {activeLanguage === "ar" ? "العربية" : "English"}
          </label>
          <RichTextEditor
            value={activeLanguage === "ar" ? form.body_ar : form.body_en}
            onChange={(value) => handleBodyChange(value, activeLanguage)}
            placeholder={
              activeLanguage === "ar"
                ? (t('blogForm.bodyPlaceholder') || "اكتب محتوى المقال هنا... يدعم HTML و Markdown.")
                : (t('blogForm.bodyPlaceholder') || "Write your blog post content here... HTML and Markdown are supported.")
            }
          />
        </div>
      </div>

      {/* Media */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-ElectricAqua/10 rounded-lg flex items-center justify-center">
            <Image className="w-4 h-4 text-ElectricAqua" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t('blogForm.media') || "Media"}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t('blogForm.mediaDescription') || "Featured image for the blog post"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
            {t('blogForm.featuredImage') || "Featured Image"}
          </label>

          <div className="flex gap-4 items-start">
            <div className="flex-1 space-y-3">
              {/* ✅ رسالة توضيحية للصورة */}
              {form.image && form.image.includes('base64') && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">✅ الصورة جاهزة للإرسال (Base64)</span>
                  </div>
                  <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                    سيتم حفظ الصورة كبيانات مباشرة في قاعدة البيانات
                  </div>
                </div>
              )}

              {/* زر الرفع */}
              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-lg text-13 font-medium cursor-pointer hover:bg-primary/20 transition-colors border border-primary/20">
                  <Upload className="w-4 h-4" />
                  {form.image ? (t('blogForm.changeImage') || "Change Image") : (t('blogForm.uploadImage') || "Upload Image")}
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
                
                <div className="text-11 text-SlateBlueText dark:text-darktext mt-2">
                  {t('blogForm.imageRequirements') || "الحد الأقصى: 5MB • JPEG, PNG, WebP"}
                </div>
              </div>

              {loading && (
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  {t('blogForm.uploading') || "جاري تحويل الصورة..."}
                </div>
              )}

              {form.image && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("image", "");
                    setImagePreview("");
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-12 font-medium hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  {t('blogForm.removeImage') || "حذف الصورة"}
                </button>
              )}
            </div>

            {/* معاينة الصورة */}
            {imagePreview && (
              <div className="w-24 h-24 border-2 border-dashed border-PowderBlueBorder dark:border-dark_border rounded-lg overflow-hidden bg-gray-50 dark:bg-dark_input flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
            {t('blogForm.imageAlt') || "Image Alt Text"} - {activeLanguage === "ar" ? "العربية" : "English"}
          </label>
          <input
            type="text"
            value={activeLanguage === "ar" ? form.imageAlt_ar : form.imageAlt_en}
            onChange={(e) => onChange(activeLanguage === "ar" ? "imageAlt_ar" : "imageAlt_en", e.target.value)}
            placeholder={
              activeLanguage === "ar"
                ? "وصف الصورة لإمكانية الوصول"
                : "Description of the image for accessibility"
            }
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            dir={activeLanguage === "ar" ? "rtl" : "ltr"}
          />
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Tag className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t('blogForm.tags') || "Tags"} - {activeLanguage === "ar" ? "العربية" : "English"}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t('blogForm.tagsDescription') || "Add tags for better categorization and search"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={activeLanguage === "ar" ? newTagInputAr : newTagInputEn}
                onChange={(e) => activeLanguage === "ar" ? setNewTagInputAr(e.target.value) : setNewTagInputEn(e.target.value)}
                onKeyPress={(e) => handleTagKeyPress(e, activeLanguage)}
                placeholder={
                  activeLanguage === "ar"
                    ? "أدخل وسم (مثل: React، JavaScript، تطوير الويب)"
                    : "Enter a tag (e.g., React, JavaScript, Web Development)"
                }
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                dir={activeLanguage === "ar" ? "rtl" : "ltr"}
              />
            </div>
            <button
              type="button"
              onClick={activeLanguage === "ar" ? addTagAr : addTagEn}
              disabled={activeLanguage === "ar" ? !newTagInputAr.trim() : !newTagInputEn.trim()}
              className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-13 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('common.add') || "Add"}
            </button>
          </div>

          {(activeLanguage === "ar" ? tagsAr : tagsEn).length > 0 && (
            <div className="space-y-2">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                {t('blogForm.addedTags') || "Added Tags"}:
              </label>
              <div className="flex flex-wrap gap-2">
                {(activeLanguage === "ar" ? tagsAr : tagsEn).map((tag, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white px-3 py-2 rounded-lg text-13"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => activeLanguage === "ar" ? removeTagAr(index) : removeTagEn(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-11 text-SlateBlueText dark:text-darktext">
            {t('blogForm.tagsHint') || "Press Enter or click Add to include multiple tags"}
          </p>
        </div>
      </div>

      {/* Schedule & Settings */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t('blogForm.scheduleSettings') || "Schedule & Settings"}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t('blogForm.scheduleDescription') || "Publishing options and post settings"}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Calendar className="w-3 h-3 text-primary" />
              {t('blogForm.publishDate') || "Publish Date"}
            </label>
            <input
              type="date"
              value={form.publishDate}
              onChange={(e) => onChange("publishDate", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Eye className="w-3 h-3 text-primary" />
              {t('blogForm.status') || "Status"}
            </label>
            <select
              value={form.status}
              onChange={(e) => onChange("status", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            >
              <option value="draft">{t('blogForm.status.draft') || "Draft"}</option>
              <option value="published">{t('blogForm.status.published') || "Published"}</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
          <label className="flex items-center space-x-3 p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-IcyBreeze dark:hover:bg-dark_input transition-all duration-200 cursor-pointer group">
            <div className="w-8 h-8 bg-Aquamarine/10 rounded flex items-center justify-center group-hover:bg-Aquamarine/20 transition-colors">
              <Eye className="w-3 h-3 text-Aquamarine" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => onChange("featured", e.target.checked)}
                  className="w-4 h-4 text-Aquamarine focus:ring-Aquamarine border-PowderBlueBorder rounded"
                />
                <span className="text-13 font-medium text-MidnightNavyText dark:text-white">
                  {t('blogForm.featuredPost') || "Featured Post"}
                </span>
              </div>
              <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">
                {t('blogForm.featuredDescription') || "Highlight this post as featured on the blog homepage"}
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
              {t('blogForm.updatePost') || "Update Post"}
            </>
          ) : (
            <>
              <Rocket className="w-3 h-3" />
              {t('blog.createPost') || "Create Post"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}