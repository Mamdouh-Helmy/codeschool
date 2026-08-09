// components/Admin/UserForm.jsx
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
  Globe,
  ShieldCheck,
  Sparkles,
  Briefcase,
  Eye as EyeIcon,
  Star,
  FolderKanban,
  Award,
  Bell,
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export default function UserForm({ initial, onClose, onSaved }) {
  const { t } = useI18n();

  const [form, setForm] = useState({
    name: initial?.name || "",
    username: initial?.username || "",
    phone: initial?.profile?.phone || "",
    image: initial?.image || "",
    gender: initial?.gender || "",
    language: initial?.language ?? "ar",
    isActive: initial?.isActive ?? true,
    role: initial?.role || "guest",
    password: "",
    passwordConfirm: "",
  });

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(initial?.image || "");

  const onChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (form.image && form.image !== imagePreview) {
      setImagePreview(form.image);
    }
  }, [form.image]); // eslint-disable-line react-hooks/exhaustive-deps

  const isPromotingToInstructor = form.role === "instructor" && initial?.role !== "instructor";

  const uploadImageToCloudinary = async (file) => {
    setUploadingImage(true);
    const toastId = toast.loading("جاري رفع الصورة...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "users");

      const res = await fetch("/api/upload-image", { method: "POST", body: formData });
      const data = await res.json();

      if (!data.success) throw new Error(data.message || "فشل رفع الصورة");

      onChange("image", data.imageUrl);
      setImagePreview(data.imageUrl);
      toast.success("تم رفع الصورة بنجاح!", { id: toastId });
      return data.imageUrl;
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

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("نوع الملف غير مدعوم. يرجى استخدام صورة (JPEG, PNG, WebP)");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("حجم الملف كبير جداً. الحد الأقصى 5MB");
      return;
    }

    setImagePreview(URL.createObjectURL(file));

    uploadImageToCloudinary(file).catch(() => {
      setImagePreview(initial?.image || "");
      onChange("image", initial?.image || "");
    });
  };

  const removeImage = () => {
    onChange("image", "");
    setImagePreview("");
  };

  const validate = () => {
    if (!form.name.trim()) {
      toast.error(t("userForm.nameRequired") || "الاسم مطلوب");
      return false;
    }
    if (form.password && form.password !== form.passwordConfirm) {
      toast.error(t("userForm.passwordMismatch") || "الباسورد مش متطابق");
      return false;
    }
    if (form.password && form.password.length < 6) {
      toast.error(t("userForm.passwordTooShort") || "الباسورد لازم يكون 6 أحرف على الأقل");
      return false;
    }
    return true;
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    phone: form.phone.trim(),
    image: form.image.trim(),
    gender: form.gender || "",
    language: form.language,
    isActive: form.isActive,
    ...(form.username.trim() && { username: form.username.trim() }),
    ...(form.password && { password: form.password }),
    ...(form.role !== initial?.role && { role: form.role }),
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const toastId = toast.loading(t("userForm.updating") || "جاري الحفظ...");

    try {
      const res = await fetch(`/api/all-users/${initial._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || t("userForm.updateFailed") || "فشل الحفظ");
      }

      toast.success(t("userForm.updatedSuccess") || "تم الحفظ بنجاح", { id: toastId });
      onSaved();
      onClose();
    } catch (err) {
      console.error("Error:", err);
      toast.error(err.message || t("userForm.updateError") || "حصل خطأ أثناء الحفظ", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!initial) return null;

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* ── Basic Info ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("userForm.basicInfo") || "البيانات الأساسية"}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("userForm.basicInfoDescription") || "بيانات الحساب الأساسية"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-13 font-medium text-MidnightNavyText dark:text-white">
              <User className="w-3 h-3" />
              {t("userForm.name") || "الاسم"} *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
              required
            />
          </div>

          {/* Email (read only) */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-13 font-medium text-MidnightNavyText dark:text-white">
              <Mail className="w-3 h-3" />
              {t("userForm.email") || "الإيميل"}
            </label>
            <input
              type="email"
              value={initial?.email || ""}
              disabled
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:text-white bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-13 font-medium text-MidnightNavyText dark:text-white">
              <Hash className="w-3 h-3" />
              {t("userForm.username") || "اليوزرنيم"}
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => onChange("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="john_doe"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            />
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-13 font-medium text-MidnightNavyText dark:text-white">
              <User className="w-3 h-3" />
              {t("userForm.gender") || "النوع"}
              <span className="text-xs text-gray-500 font-normal">({t("common.optional") || "اختياري"})</span>
            </label>
            <div className="flex items-center gap-4">
              {["male", "female"].map((g) => (
                <label key={g} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value={g}
                    checked={form.gender === g}
                    onChange={(e) => onChange("gender", e.target.value)}
                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                  />
                  <span className="text-sm text-MidnightNavyText dark:text-white">
                    {g === "male" ? t("common.male") || "ذكر" : t("common.female") || "أنثى"}
                  </span>
                </label>
              ))}
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

          {/* Language */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-13 font-medium text-MidnightNavyText dark:text-white">
              <Globe className="w-3 h-3" />
              {t("userForm.language") || "اللغة"}
            </label>
            <div className="flex items-center gap-4">
              {[
                { value: "ar", label: "🇸🇦 عربي" },
                { value: "en", label: "🇬🇧 English" },
              ].map((lang) => (
                <label key={lang.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="language"
                    value={lang.value}
                    checked={form.language === lang.value}
                    onChange={(e) => onChange("language", e.target.value)}
                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                  />
                  <span className="text-sm text-MidnightNavyText dark:text-white">{lang.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-13 font-medium text-MidnightNavyText dark:text-white">
              <Phone className="w-3 h-3" />
              {t("userForm.phone") || "الهاتف"}
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              placeholder="+201234567890"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg">
            <span className="text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("userForm.isActive") || "الحساب فعّال"}
            </span>
            <button
              type="button"
              onClick={() => onChange("isActive", !form.isActive)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                form.isActive ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  form.isActive ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Image Upload */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-13 font-medium text-MidnightNavyText dark:text-white">
              <ImageIcon className="w-3 h-3" />
              {t("userForm.imageUrl") || "صورة البروفايل"}
            </label>

            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-3">
                <input
                  type="url"
                  value={form.image}
                  onChange={(e) => onChange("image", e.target.value)}
                  placeholder="أو أدخل رابط الصورة مباشرة"
                  className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                  disabled={uploadingImage}
                />

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
                        {t("userForm.uploading") || "جاري الرفع..."}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        {form.image ? t("userForm.changeImage") || "تغيير الصورة" : t("userForm.uploadImage") || "رفع صورة"}
                      </>
                    )}
                    <input
                      type="file"
                      accept={ALLOWED_IMAGE_TYPES.join(",")}
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage || loading}
                    />
                  </label>

                  {form.image && !uploadingImage && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="inline-flex items-center gap-2 px-3 py-2.5 bg-red-500/10 text-red-500 rounded-lg text-13 font-medium hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      {t("userForm.removeImage") || "حذف"}
                    </button>
                  )}
                </div>

                <p className="text-11 text-SlateBlueText dark:text-darktext">
                  {t("userForm.imageRequirements") || "الحد الأقصى: 5MB • JPEG, PNG, WebP — بدون صورة هيتاخد الأفتار الافتراضي"}
                </p>
              </div>

              <div className="relative w-24 h-24 border-2 border-dashed border-PowderBlueBorder dark:border-dark_border rounded-lg overflow-hidden bg-gray-50 dark:bg-dark_input flex items-center justify-center">
                <img
                  src={imagePreview || "/images/default-avatar.jpg"}
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
            </div>
          </div>
        </div>
      </div>

      {/* ── Role & Security ── */}
      <div className="space-y-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("userForm.roleAndSecurity") || "الدور والأمان"}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("userForm.roleDescription") || "تغيير دور الحساب أو إعادة تعيين الباسورد"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-13 font-medium text-gray-700 dark:text-gray-300">
            {t("userForm.role") || "الدور"}
          </label>
          <select
            value={form.role}
            onChange={(e) => onChange("role", e.target.value)}
            className="w-full px-3 py-2.5 border border-blue-200 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark_input dark:text-white bg-white/50"
          >
            <option value="guest">Guest</option>
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="marketing">Marketing</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {isPromotingToInstructor && (
          <div className="flex items-start gap-2 text-xs bg-white/60 dark:bg-gray-800/40 p-3 rounded border border-blue-100 dark:border-blue-900/30">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-gray-600 dark:text-gray-300">
              {t("userForm.instructorPromotionNote") ||
                "هيتعمل تلقائي: يوزرنيم (لو مش موجود)، QR كود، وبورتفوليو افتراضي — نفس اللي بيحصل وقت إنشاء انستراكتور جديد."}
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-blue-100 dark:border-blue-900/30">
          <div className="space-y-2">
            <label className="text-13 font-medium text-gray-700 dark:text-gray-300">
              {t("userForm.newPassword") || "باسورد جديد"}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => onChange("password", e.target.value)}
              placeholder="اسيبه فاضي لو مش هتغيّره"
              className="w-full px-3 py-2.5 border border-blue-200 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark_input dark:text-white bg-white/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-13 font-medium text-gray-700 dark:text-gray-300">
              {t("userForm.confirmPassword") || "تأكيد الباسورد"}
            </label>
            <input
              type="password"
              value={form.passwordConfirm}
              onChange={(e) => onChange("passwordConfirm", e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-blue-200 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark_input dark:text-white bg-white/50"
            />
          </div>
        </div>
      </div>

      {/* ── Role-specific details ── */}
      {initial.role === "instructor" ? (
        <div className="space-y-3 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                {t("userForm.portfolioDetails") || "بيانات البورتفوليو"}
              </h3>
              <p className="text-12 text-SlateBlueText dark:text-darktext">
                {initial.portfolioSummary?.title || t("userForm.noPortfolio") || "مفيش بورتفوليو"}
              </p>
            </div>
          </div>

          {initial.portfolioSummary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-dark_input rounded-lg p-2.5">
                <EyeIcon className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-[10px] text-SlateBlueText dark:text-darktext">{t("userForm.views") || "المشاهدات"}</p>
                  <p className="text-sm font-semibold text-MidnightNavyText dark:text-white">{initial.portfolioSummary.views}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-dark_input rounded-lg p-2.5">
                <Star className="w-4 h-4 text-yellow-500" />
                <div>
                  <p className="text-[10px] text-SlateBlueText dark:text-darktext">{t("userForm.skills") || "المهارات"}</p>
                  <p className="text-sm font-semibold text-MidnightNavyText dark:text-white">{initial.portfolioSummary.skillsCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-dark_input rounded-lg p-2.5">
                <FolderKanban className="w-4 h-4 text-purple-500" />
                <div>
                  <p className="text-[10px] text-SlateBlueText dark:text-darktext">{t("userForm.projects") || "المشاريع"}</p>
                  <p className="text-sm font-semibold text-MidnightNavyText dark:text-white">{initial.portfolioSummary.projectsCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-dark_input rounded-lg p-2.5">
                <Award className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-[10px] text-SlateBlueText dark:text-darktext">{t("userForm.certificates") || "الشهادات"}</p>
                  <p className="text-sm font-semibold text-MidnightNavyText dark:text-white">{initial.portfolioSummary.certificatesCount}</p>
                </div>
              </div>
              <a
                href={initial.portfolioSummary.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="col-span-2 md:col-span-4 text-xs text-primary hover:underline text-center py-1.5"
              >
                {t("userForm.viewPortfolio") || "معاينة البورتفوليو"} →
              </a>
            </div>
          ) : (
            <p className="text-xs text-SlateBlueText dark:text-darktext">
              {t("userForm.noPortfolioYet") || "لسه ملوش بورتفوليو — هيتعمل تلقائي أول ما يتحفظ التعديل"}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                {t("userForm.recentNotifications") || "آخر التنبيهات"}
              </h3>
              <p className="text-12 text-SlateBlueText dark:text-darktext">
                {t("userForm.recentNotificationsDescription") || "آخر 5 رسائل واتساب اتبعتت للحساب ده"}
              </p>
            </div>
          </div>

          {initial.recentNotifications && initial.recentNotifications.length > 0 ? (
            <div className="space-y-1.5">
              {initial.recentNotifications.map((n, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs bg-gray-50 dark:bg-dark_input rounded-lg px-3 py-2"
                >
                  <span className="text-MidnightNavyText dark:text-white truncate">
                    {n.groupName || n.courseName || "—"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-medium ${
                      n.status === "sent"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                    }`}
                  >
                    {n.status === "sent" ? t("userForm.sent") || "اتبعتت" : t("userForm.failed") || "فشلت"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-SlateBlueText dark:text-darktext">
              {t("userForm.noNotifications") || "لا يوجد تنبيهات مسجلة"}
            </p>
          )}
        </div>
      )}

      {/* ── Action Buttons ── */}
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
                {t("userForm.updating") || "جاري الحفظ..."}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t("userForm.saveChanges") || "حفظ التعديلات"}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}