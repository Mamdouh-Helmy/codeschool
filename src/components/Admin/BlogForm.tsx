// components/BlogForm.tsx
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
      avatar: initial?.author?.avatar || "",
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

  // معالجة رفع صورة المقال
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        onChange("image", result);
      };
      reader.readAsDataURL(file);
    }
  };

  // معالجة رفع صورة المؤلف
  const handleAuthorAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setAuthorAvatarPreview(result);
        onChangeAuthor("avatar", result);
      };
      reader.readAsDataURL(file);
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
      // التأكد من أن tags_ar و tags_en موجودين في form
      const payload = {
        ...form,
        tags_ar: tagsAr,
        tags_en: tagsEn,
        publishDate: form.publishDate
          ? new Date(form.publishDate).toISOString()
          : new Date().toISOString(),
      };

      console.log("Submitting payload:", payload);

      // إضافة تحقق من البيانات المطلوبة
      if (!form.title_ar && !form.title_en) {
        alert("الرجاء إدخال عنوان المقال بالعربية أو الإنجليزية");
        setLoading(false);
        return;
      }

      if (!form.body_ar && !form.body_en) {
        alert("الرجاء إدخال محتوى المقال بالعربية أو الإنجليزية");
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        alert("Authentication required. Please log in.");
        setLoading(false);
        return;
      }

      const method = initial?._id ? "PUT" : "POST";
      const url = initial?._id
        ? `/api/blog/${encodeURIComponent(initial._id)}`
        : "/api/blog";

      // إضافة timeout للطلب
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 ثانية

      try {
        const res = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          let errorMessage = `HTTP error! status: ${res.status}`;
          try {
            const errorData = await res.json();
            errorMessage = errorData.message || errorMessage;
            if (errorData.errors) {
              errorMessage += `\n${errorData.errors.join("\n")}`;
            }
          } catch {
            // إذا فشل تحليل JSON، نحاول قراءة النص
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
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          throw new Error("Request timeout. Please check your connection and try again.");
        }
        throw fetchError;
      }
    } catch (err: any) {
      console.error("Error:", err);

      // عرض رسالة خطأ مناسبة
      let errorMessage = err.message || "An error occurred";

      if (errorMessage.includes("Failed to fetch")) {
        errorMessage = "Connection failed. Please check your internet connection.";
      } else if (errorMessage.includes("timeout")) {
        errorMessage = "Request timeout. Server might be busy, please try again.";
      } else if (errorMessage.includes("Database")) {
        errorMessage = "Database connection error. Please try again later.";
      }

      alert(`Error: ${errorMessage}`);
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
                  />
                </label>
                {authorAvatarPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeAuthor("avatar", "");
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
            <div className="flex-1">
              <input
                type="text"
                value={form.image}
                onChange={(e) => onChange("image", e.target.value)}
                placeholder={t('blogForm.imagePlaceholder') || "Image URL or upload file"}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              />
              <div className="mt-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-12 cursor-pointer hover:bg-primary/20 transition-colors">
                  <Upload className="w-3 h-3" />
                  {t('blogForm.uploadImage') || "Upload Image"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("image", "");
                      setImagePreview("");
                    }}
                    className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-12 cursor-pointer hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    {t('blogForm.remove') || "Remove"}
                  </button>
                )}
              </div>
            </div>

            {imagePreview && (
              <div className="w-20 h-20 border border-PowderBlueBorder rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Blog Preview"
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