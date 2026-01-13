"use client";
import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Save,
  X,
  Lock,
  Image as ImageIcon,
  Hash,
  Upload,
  Trash2
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";

export default function InstructorForm({ initial, onClose, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: initial?.name || "",
    username: initial?.username || "",
    phone: initial?.profile?.phone || "",
    image: initial?.image || "",
    password: "",
    passwordConfirm: ""
  });
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(initial?.image || "");
  const [uploadingImage, setUploadingImage] = useState(false);

  const onChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // دالة لرفع الصور إلى السيرفر
  const uploadImageToServer = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    console.log("🔼 Uploading image to server...");

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Upload failed:", errorText);
      throw new Error("فشل في اتصال السيرفر");
    }

    const data = await response.json();
    
    if (!data.success) {
      console.error("❌ Upload failed:", data.message);
      throw new Error(data.message || "فشل رفع الصورة");
    }

    console.log("✅ Image uploaded successfully:", data.url);
    return data.url;
  };

  // معالجة رفع الصورة
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("نوع الملف غير مدعوم. يرجى استخدام صورة (JPEG, PNG, WebP)");
      return;
    }

    // التحقق من الحجم (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الملف كبير جداً. الحد الأقصى 5MB");
      return;
    }

    setUploadingImage(true);
    
    try {
      // عرض معاينة محلية
      const localPreview = URL.createObjectURL(file);
      setImagePreview(localPreview);

      // رفع الملف إلى السيرفر
      const imageUrl = await uploadImageToServer(file);
      
      // حفظ الرابط في الحالة
      onChange("image", imageUrl);
      setImagePreview(imageUrl);

      // تنظيف المعاينة المحلية
      setTimeout(() => {
        URL.revokeObjectURL(localPreview);
      }, 1000);

      toast.success("تم رفع الصورة بنجاح");

    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`خطأ في رفع الصورة: ${error.message}`);
      setImagePreview(initial?.image || "");
      onChange("image", initial?.image || "");
    } finally {
      setUploadingImage(false);
    }
  };

  // تحديث معاينة الصورة عند تغيير الرابط يدوياً
  useEffect(() => {
    if (form.image && form.image !== imagePreview) {
      setImagePreview(form.image);
    }
  }, [form.image]);

  const submit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.name.trim()) {
      toast.error(t("instructorForm.nameRequired"));
      return;
    }

    if (form.password && form.password !== form.passwordConfirm) {
      toast.error(t("instructorForm.passwordMismatch"));
      return;
    }

    if (form.password && form.password.length < 6) {
      toast.error(t("instructorForm.passwordTooShort"));
      return;
    }

    setLoading(true);
    const toastId = toast.loading(t("instructorForm.updating"));

    try {
      const payload = {
        name: form.name.trim(),
        username: form.username.trim(),
        phone: form.phone.trim(),
        image: form.image.trim(),
        ...(form.password && { password: form.password })
      };

      const res = await fetch(`/api/instructor/${initial._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || t("instructorForm.updateFailed"));
      }

      if (result.success) {
        toast.success(t("instructorForm.updatedSuccess"), { id: toastId });
        onSaved();
        onClose();
      } else {
        throw new Error(result.message || t("instructorForm.updateFailed"));
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error(err.message || t("instructorForm.updateError"), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("instructorForm.basicInfo")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("instructorForm.basicInfoDescription")}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <User className="w-3 h-3" />
              {t("instructorForm.name")} *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onChange('name', e.target.value)}
              placeholder={t("instructorForm.namePlaceholder")}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
              required
            />
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Mail className="w-3 h-3" />
              {t("instructorForm.email")}
            </label>
            <input
              type="email"
              value={initial?.email || ""}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              disabled
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("instructorForm.emailReadOnly")}
            </p>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Hash className="w-3 h-3" />
              {t("instructorForm.username")}
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => onChange('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="john_doe"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("instructorForm.usernameHint")}
            </p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Phone className="w-3 h-3" />
              {t("instructorForm.phone")}
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => onChange('phone', e.target.value)}
              placeholder="+201234567890"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            />
          </div>

          {/* Image Section */}
          <div className="space-y-3">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <ImageIcon className="w-3 h-3" />
              {t("instructorForm.imageUrl")}
            </label>

            <div className="flex gap-4 items-start">
              <div className="flex-1 space-y-3">
                {/* رابط الصورة بعد الرفع */}
                {form.image && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">
                        {t("instructorForm.imageUploaded") || "تم رفع الصورة بنجاح"}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={form.image}
                      onChange={(e) => onChange('image', e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm"
                    />
                  </div>
                )}

                {/* حقل إدخال الرابط يدوياً */}
                {!form.image && (
                  <input
                    type="url"
                    value={form.image}
                    onChange={(e) => onChange('image', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                  />
                )}

                {/* أزرار التحكم */}
                <div className="flex gap-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-lg text-13 font-medium cursor-pointer hover:bg-primary/20 transition-colors border border-primary/20">
                    <Upload className="w-4 h-4" />
                    {form.image ? (t('instructorForm.changeImage') || "تغيير الصورة") : (t('instructorForm.uploadImage') || "رفع صورة")}
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage || loading}
                    />
                  </label>

                  {form.image && (
                    <button
                      type="button"
                      onClick={() => {
                        onChange('image', '');
                        setImagePreview('');
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2.5 bg-red-500/10 text-red-500 rounded-lg text-13 font-medium hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      {t('instructorForm.removeImage') || "حذف"}
                    </button>
                  )}
                </div>

                {/* رسالة أثناء الرفع */}
                {uploadingImage && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    {t('instructorForm.uploading') || "جاري رفع الصورة..."}
                  </div>
                )}

                <div className="text-11 text-SlateBlueText dark:text-darktext">
                  {t('instructorForm.imageRequirements') || "الحد الأقصى: 5MB • JPEG, PNG, WebP"}
                </div>
              </div>

              {/* معاينة الصورة */}
              {imagePreview && (
                <div className="w-24 h-24 border-2 border-dashed border-PowderBlueBorder dark:border-dark_border rounded-lg overflow-hidden bg-gray-50 dark:bg-dark_input flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "/images/default-avatar.jpg";
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Password Section */}
      <div className="space-y-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow">
            <Lock className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("instructorForm.changePassword")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("instructorForm.passwordOptional")}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-gray-700 dark:text-gray-300">
              {t("instructorForm.newPassword")}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => onChange('password', e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-blue-200 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark_input dark:text-white bg-white/50"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-gray-700 dark:text-gray-300">
              {t("instructorForm.confirmPassword")}
            </label>
            <input
              type="password"
              value={form.passwordConfirm}
              onChange={(e) => onChange('passwordConfirm', e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-blue-200 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark_input dark:text-white bg-white/50"
            />
          </div>
        </div>

        <div className="text-xs text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-gray-800/30 p-3 rounded border border-blue-100 dark:border-blue-900/30">
          <p className="font-medium mb-1">{t("instructorForm.passwordRequirements")}</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>{t("instructorForm.minChars")}</li>
            <li>{t("instructorForm.leaveBlank")}</li>
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-white dark:bg-darkmode pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading || uploadingImage}
            className="flex-1 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white py-3 px-4 rounded-lg font-semibold text-13 hover:bg-gray-50 dark:hover:bg-dark_input flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={loading || uploadingImage}
            className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white py-3 px-4 rounded-lg font-semibold text-13 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {t("instructorForm.updating")}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t("instructorForm.saveChanges")}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}