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
  Trash2,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";

export default function InstructorForm({
  initial,
  isCreating,
  onClose,
  onSaved,
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: initial?.name || "",
    email: initial?.email || "",
    username: initial?.username || "",
    phone: initial?.profile?.phone || "",
    image: initial?.image || "",
    gender: initial?.gender || "",
    password: "",
    passwordConfirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(initial?.image || "");
  const [uploadingImage, setUploadingImage] = useState(false);

  const onChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * رفع الصورة إلى Cloudinary
   */
  const uploadImageToCloudinary = async (base64Image) => {
    setUploadingImage(true);
    const toastId = toast.loading("جاري رفع الصورة...");

    try {
      const response = await fetch("/api/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Image,
          folder: "instructors",
        }),
      });

      const data = await response.json();

      if (data.success) {
        onChange("image", data.imageUrl);
        setImagePreview(data.imageUrl);
        toast.success("تم رفع الصورة بنجاح!", { id: toastId });
        return data.imageUrl;
      } else {
        throw new Error(data.message || "فشل رفع الصورة");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.message || "حدث خطأ أثناء رفع الصورة", { id: toastId });
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = (e) => {
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

    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result;

      // عرض معاينة فورية
      setImagePreview(result);

      try {
        // رفع الصورة إلى Cloudinary
        await uploadImageToCloudinary(result);
      } catch (error) {
        // إعادة المعاينة للصورة القديمة في حالة الفشل
        setImagePreview(initial?.image || "");
        onChange("image", initial?.image || "");
      }
    };
    reader.readAsDataURL(file);
  };

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

    if (isCreating && !form.email.trim()) {
      toast.error(t("instructorForm.emailRequired") || "Email is required");
      return;
    }

    if (isCreating && !form.password) {
      toast.error(
        t("instructorForm.passwordRequired") || "Password is required"
      );
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
    const toastId = toast.loading(
      isCreating
        ? t("instructorForm.creating") || "Creating instructor..."
        : t("instructorForm.updating")
    );

    try {
      // تجهيز البيانات للإرسال
      const payload = {
        name: form.name.trim(),
        ...(isCreating && { email: form.email.trim() }),
        ...(form.username.trim() && { username: form.username.trim() }),
        ...(form.phone.trim() && { phone: form.phone.trim() }),
        ...(form.image.trim() && { image: form.image.trim() }),
        ...(form.gender && { gender: form.gender }),
        ...(form.password && { password: form.password }),
      };

      console.log("📤 Sending payload:", payload);

      const url = isCreating
        ? "/api/instructor"
        : `/api/instructor/${initial._id}`;

      const method = isCreating ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      console.log("📥 Response:", result);

      if (!res.ok) {
        throw new Error(
          result.message ||
            (isCreating
              ? t("instructorForm.createFailed")
              : t("instructorForm.updateFailed"))
        );
      }

      if (result.success) {
        toast.success(
          isCreating
            ? t("instructorForm.createdSuccess") ||
                "Instructor created successfully"
            : t("instructorForm.updatedSuccess"),
          { id: toastId }
        );
        onSaved();
        onClose();
      } else {
        throw new Error(
          result.message ||
            (isCreating
              ? t("instructorForm.createFailed")
              : t("instructorForm.updateFailed"))
        );
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error(err.message || t("instructorForm.updateError"), {
        id: toastId,
      });
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
              onChange={(e) => onChange("name", e.target.value)}
              placeholder={t("instructorForm.namePlaceholder")}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
              required
            />
          </div>

          {/* Gender Field */}
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <User className="w-3 h-3" />
              {t("instructorForm.gender") || "Gender"}
              <span className="text-xs text-gray-500 font-normal">
                ({t("common.optional") || "اختياري"})
              </span>
            </label>
            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={form.gender === "male"}
                  onChange={(e) => onChange("gender", e.target.value)}
                  className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                />
                <span className="text-sm text-MidnightNavyText dark:text-white">
                  {t("common.male") || "ذكر"}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={form.gender === "female"}
                  onChange={(e) => onChange("gender", e.target.value)}
                  className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                />
                <span className="text-sm text-MidnightNavyText dark:text-white">
                  {t("common.female") || "أنثى"}
                </span>
              </label>
              {form.gender && (
                <button
                  type="button"
                  onClick={() => onChange("gender", "")}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 underline"
                >
                  {t("common.clear") || "مسح"}
                </button>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Mail className="w-3 h-3" />
              {t("instructorForm.email")} {isCreating && "*"}
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => onChange("email", e.target.value)}
              placeholder="instructor@example.com"
              className={`w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white ${
                isCreating
                  ? "dark:bg-dark_input"
                  : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              }`}
              disabled={!isCreating}
              required={isCreating}
            />
            {!isCreating && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("instructorForm.emailReadOnly")}
              </p>
            )}
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
              onChange={(e) =>
                onChange(
                  "username",
                  e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                )
              }
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
              onChange={(e) => onChange("phone", e.target.value)}
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
                {/* رابط الصورة */}
                <input
                  type="url"
                  value={form.image}
                  onChange={(e) => onChange("image", e.target.value)}
                  placeholder="أو أدخل رابط الصورة مباشرة"
                  className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                  disabled={uploadingImage}
                />

                {/* أزرار التحكم */}
                <div className="flex gap-2">
                  <label
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-13 font-medium transition-colors border ${
                      uploadingImage
                        ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border-gray-300"
                        : "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 cursor-pointer"
                    }`}
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("instructorForm.uploading") || "جاري الرفع..."}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        {form.image
                          ? t("instructorForm.changeImage") || "تغيير الصورة"
                          : t("instructorForm.uploadImage") || "رفع صورة"}
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage || loading}
                    />
                  </label>

                  {form.image && !uploadingImage && (
                    <button
                      type="button"
                      onClick={() => {
                        onChange("image", "");
                        setImagePreview("");
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2.5 bg-red-500/10 text-red-500 rounded-lg text-13 font-medium hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      {t("instructorForm.removeImage") || "حذف"}
                    </button>
                  )}
                </div>

                <div className="text-11 text-SlateBlueText dark:text-darktext">
                  {t("instructorForm.imageRequirements") ||
                    "الحد الأقصى: 5MB • JPEG, PNG, WebP"}
                </div>
              </div>

              {/* معاينة الصورة */}
              {imagePreview && (
                <div className="w-24 h-24 border-2 border-dashed border-PowderBlueBorder dark:border-dark_border rounded-lg overflow-hidden bg-gray-50 dark:bg-dark_input flex items-center justify-center relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "/images/default-avatar.jpg";
                    }}
                  />
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
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
              {isCreating
                ? t("instructorForm.setPassword") || "Set Password"
                : t("instructorForm.changePassword")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {isCreating
                ? t("instructorForm.passwordRequired") ||
                  "Password is required for new instructor"
                : t("instructorForm.passwordOptional")}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-gray-700 dark:text-gray-300">
              {isCreating
                ? t("instructorForm.password") || "Password"
                : t("instructorForm.newPassword")}{" "}
              {isCreating && "*"}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => onChange("password", e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-blue-200 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark_input dark:text-white bg-white/50"
              required={isCreating}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-gray-700 dark:text-gray-300">
              {t("instructorForm.confirmPassword")} {isCreating && "*"}
            </label>
            <input
              type="password"
              value={form.passwordConfirm}
              onChange={(e) => onChange("passwordConfirm", e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-blue-200 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark_input dark:text-white bg-white/50"
              required={isCreating}
            />
          </div>
        </div>

        <div className="text-xs text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-gray-800/30 p-3 rounded border border-blue-100 dark:border-blue-900/30">
          <p className="font-medium mb-1">
            {t("instructorForm.passwordRequirements")}
          </p>
          <ul className="space-y-1 list-disc list-inside">
            <li>{t("instructorForm.minChars")}</li>
            {!isCreating && <li>{t("instructorForm.leaveBlank")}</li>}
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
            className="flex-1 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white py-3 px-4 rounded-lg font-semibold text-13 hover:bg-gray-50 dark:hover:bg-dark_input flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <Loader2 className="w-4 h-4 animate-spin" />
                {isCreating
                  ? t("instructorForm.creating") || "Creating..."
                  : t("instructorForm.updating")}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isCreating
                  ? t("instructorForm.create") || "Create Instructor"
                  : t("instructorForm.saveChanges")}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}