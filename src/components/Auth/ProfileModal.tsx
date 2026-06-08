"use client";
import React, { useState, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import toast, { Toaster } from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";
import {
  Camera,
  QrCode,
  LogOut,
  X,
  Save,
  Mail,
  User,
  Lock,
  Loader2,
  CheckCircle2,
  Upload,
  AlertCircle,
} from "lucide-react";

const DEFAULT_AVATAR = "/images/default-avatar.jpg";

const profileCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

type Props = {
  onClose?: () => void;
  onProfileUpdate?: (userData: any) => void;
};

const validateName = (name: string) => {
  if (name && name.trim().length < 2) return "profile.validation.nameLength";
  return "";
};

const validatePassword = (password: string) => {
  if (password && password.length < 6)
    return "profile.validation.passwordLength";
  return "";
};

const validateImage = (file: File) => {
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type))
    return "profile.validation.invalidImageType";
  const maxSize = 20 * 1024 * 1024;
  if (file.size > maxSize) return "profile.validation.imageTooLarge";
  return "";
};

// ✅ Upload to Cloudinary via API route
export default function ProfileModal({ onClose, onProfileUpdate }: Props) {
  const [userData, setUserData] = useState<{
    _id: string;
    name: string;
    email: string;
    role: string;
    image?: string | null;
    qrCode?: string | null;
  } | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  // ✅ نفس نمط BlogForm — uploadedImageUrl هو المصدر الوحيد للحفظ
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    name?: string;
    password?: string;
    image?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const { t } = useI18n();

  const isMounted = useRef(true);
  const qrGenerationTimeout = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (qrGenerationTimeout.current) clearTimeout(qrGenerationTimeout.current);
    };
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    const controller = new AbortController();

    const fetchUser = async () => {
      try {
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) {
          if (isSubscribed) toast.error(t("auth.validation.required"));
          return;
        }

        const cacheKey = `user_${token.substring(0, 20)}`;
        const cachedData = profileCache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
          if (isSubscribed) {
            setUserData(cachedData.data);
            setName(cachedData.data.name || "");
            setEmail(cachedData.data.email || t("common.none"));
            setImagePreview(cachedData.data.image || null);
            setUploadedImageUrl(cachedData.data.image || null);
          }
          return;
        }

        const res = await fetch("/api/users/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const data = await res.json();
        if (isSubscribed) {
          if (res.ok && data.success) {
            profileCache.set(cacheKey, { data: data.user, timestamp: Date.now() });
            setUserData(data.user);
            setName(data.user.name || "");
            setEmail(data.user.email || t("common.none"));
            setImagePreview(data.user.image || null);
            setUploadedImageUrl(data.user.image || null);
            setQrCode(data.user.qrCode || "");
          } else {
            if (res.status === 401) {
              toast.error(t("profile.sessionExpired"));
              localStorage.removeItem("token");
              if (onClose) onClose();
            } else {
              toast.error(data?.message || t("common.error"));
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (isSubscribed) {
          console.error("Fetch user error:", err);
          toast.error(t("common.error"));
        }
      }
    };

    fetchUser();
    return () => {
      isSubscribed = false;
      controller.abort();
    };
  }, [onClose]);

  const handleShowQR = async () => {
    if (qrGenerationTimeout.current) clearTimeout(qrGenerationTimeout.current);

    try {
      const token = localStorage.getItem("token");
      if (!token) { toast.error("يجب تسجيل الدخول أولاً"); return; }
      if (!userData?._id) { toast.error("بيانات المستخدم غير متوفرة"); return; }

      qrGenerationTimeout.current = setTimeout(async () => {
        try {
          const response = await fetch("/api/auth/generate-qr", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ userId: userData._id }),
          });

          const data = await response.json();
          if (data.success) {
            setQrCode(data.qrCode);
            setShowQR(true);
            const updatedUser = { ...userData, qrCode: data.qrCode, qrCodeData: data.qrData };
            setUserData(updatedUser);
            if (onProfileUpdate) onProfileUpdate(updatedUser);
          } else {
            toast.error(data.message || "فشل توليد QR code");
          }
        } catch (error) {
          toast.error("حدث خطأ أثناء توليد QR code");
        }
      }, 300);
    } catch (error) {
      toast.error("حدث خطأ أثناء توليد QR code");
    }
  };

  // ✅ معالج الصورة مع رفع فوري على Cloudinary
  // ✅ نفس نمط BlogForm بالظبط
  const processImageFile = async (file: File) => {
    const imageError = validateImage(file);
    if (imageError) {
      setErrors((prev) => ({ ...prev, image: imageError }));
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("حجم الملف كبير جداً. الحد الأقصى 20MB");
      return;
    }
    // ✅ Preview فوري بـ object URL (بدون base64)
    setImagePreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, image: "" }));
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "profile-images");
      const res = await fetch("/api/upload-image", { method: "POST", body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Upload failed");
      // ✅ URL الحقيقي من Cloudinary يُحفظ هنا فقط
      setUploadedImageUrl(data.imageUrl);
      setImagePreview(data.imageUrl);
      toast.success("تم رفع الصورة بنجاح ✓");
    } catch (err: any) {
      // ✅ Rollback زي BlogForm
      setImagePreview(userData?.image || null);
      setUploadedImageUrl(userData?.image || null);
      setErrors((prev) => ({ ...prev, image: err.message || "فشل رفع الصورة" }));
      toast.error(err.message || "فشل رفع الصورة");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImageFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processImageFile(file);
  };

  const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    setErrors((prev) => ({ ...prev, name: validateName(value) || "" }));
  };

  const handleChangePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setErrors((prev) => ({ ...prev, password: validatePassword(value) || "" }));
  };

  const validateAll = () => {
    const nameError = validateName(name);
    const passError = validatePassword(password);
    const newErrors: { name?: string; password?: string; image?: string } = {};
    if (nameError) newErrors.name = nameError;
    if (passError) newErrors.password = passError;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) { toast.error(t("profile.validation.fixErrors")); return; }
    if (uploadingImage) { toast.error("الصورة لا تزال قيد الرفع، يرجى الانتظار"); return; }

    setLoading(true);

    try {
      const updateData: any = {};
      if (name && name.trim() !== "" && name.trim() !== userData?.name)
        updateData.name = name.trim();
      if (password && password !== "") updateData.password = password;

      // ✅ نفس نمط BlogForm — uploadedImageUrl هو URL Cloudinary الحقيقي
      // بنقارن مع userData.image اللي ممكن يكون قديم
      if (uploadedImageUrl && uploadedImageUrl !== userData?.image) {
        updateData.image = uploadedImageUrl;
      }

      if (Object.keys(updateData).length === 0) {
        toast.error(t("profile.noChanges"));
        setLoading(false);
        return;
      }

      // ✅ debug log لو في مشكلة
      console.log("[ProfileModal] updateData:", updateData);

      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        toast.error(t("auth.validation.required"));
        setLoading(false);
        return;
      }

      const res = await fetch("/api/users/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          toast.error(t("profile.sessionExpired"));
          localStorage.removeItem("token");
          profileCache.delete(`user_${token.substring(0, 20)}`);
          if (onClose) onClose();
          await signOut({ callbackUrl: "/" });
          return;
        }
        toast.error(data?.message || `${t("profile.updateFailed")} (${res.status})`);
        setLoading(false);
        return;
      }

      toast.success(t("profile.updateSuccess"));
      const updatedUser = data.user || userData;
      setUserData(updatedUser);
      if (onProfileUpdate) onProfileUpdate(updatedUser);
      profileCache.set(`user_${token.substring(0, 20)}`, { data: updatedUser, timestamp: Date.now() });
      setPassword("");
      setErrors((prev) => ({ ...prev, password: "" }));
      setLoading(false);
      if (onClose) onClose();
    } catch (err) {
      console.error("Update error:", err);
      toast.error(t("common.error"));
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("token");
      profileCache.clear();
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const getRoleColor = (role: string) => {
    const map: Record<string, string> = {
      admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      instructor: "bg-teal-brand/10 text-teal-brand dark:bg-teal-brand/20 dark:text-teal-400",
      student: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-orange-400",
      marketing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    };
    return map[role?.toLowerCase()] || "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  };

  if (!userData) {
    return (
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-darklight rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-dark_input" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 dark:bg-dark_input rounded-lg w-3/4" />
              <div className="h-4 bg-gray-100 dark:bg-darkmode rounded-lg w-1/2" />
            </div>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-11 bg-gray-100 dark:bg-darkmode rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const initials = userData.name
    ? userData.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  return (
    <div className="w-full max-w-lg mx-auto bg-white dark:bg-darklight rounded-2xl overflow-hidden">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--toast-bg, #fff)",
            color: "var(--toast-color, #1a1a1a)",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          },
        }}
      />

      {/* ── Header Banner ── */}
      <div className="relative h-24 bg-gradient-to-l from-teal-brand to-secondary overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-2 right-6 w-16 h-16 rounded-full border-2 border-white" />
          <div className="absolute -bottom-4 left-12 w-24 h-24 rounded-full border-2 border-white" />
          <div className="absolute top-4 left-1/2 w-8 h-8 rounded-full border border-white" />
        </div>

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 left-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200"
          >
            <X size={16} />
          </button>
        )}

        {/* QR button */}
        <button
          onClick={handleShowQR}
          className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-all duration-200 backdrop-blur-sm"
        >
          <QrCode size={14} />
          <span>{t("profile.showQR")}</span>
        </button>
      </div>

      {/* ── Avatar Zone ── */}
      <div className="px-6 pb-2">
        <div className="flex items-end gap-4 -mt-10 mb-4">
          {/* Avatar with upload overlay */}
          <div className="relative group">
            <div
              className={`w-20 h-20 rounded-2xl overflow-hidden border-4 border-white dark:border-darklight shadow-lg transition-all duration-300 ${
                isDragOver ? "ring-4 ring-primary ring-offset-2" : ""
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              {imagePreview || userData.image ? (
                <img
                  src={imagePreview || userData.image || DEFAULT_AVATAR}
                  alt="avatar"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-teal-brand flex items-center justify-center">
                  <span className="text-white text-xl font-bold">{initials}</span>
                </div>
              )}

              {/* Upload overlay */}
              <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center cursor-pointer gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {uploadingImage ? (
                  <Loader2 size={20} className="text-white animate-spin" />
                ) : (
                  <>
                    <Camera size={18} className="text-white" />
                    <span className="text-white text-[10px] font-medium">تغيير</span>
                  </>
                )}
              </label>
            </div>

            {/* Upload status badge */}
            {uploadingImage && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Loader2 size={10} className="text-white animate-spin" />
              </div>
            )}
            {uploadedImageUrl && uploadedImageUrl !== userData.image && !uploadingImage && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle2 size={10} className="text-white" />
              </div>
            )}
          </div>

          {/* Name + Role */}
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">
                {userData.name || t("common.none")}
              </h2>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${getRoleColor(userData.role)}`}>
                {userData.role}
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
              {userData.email}
            </p>
          </div>
        </div>

        {/* Image errors */}
        {errors.image && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400">{t(errors.image) || errors.image}</p>
          </div>
        )}

        {/* Upload hint */}
        {!imagePreview && !userData.image && (
          <div
            className={`mb-4 border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-gray-200 dark:border-dark_border hover:border-primary/50 dark:hover:border-primary/40"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={20} className="mx-auto mb-1.5 text-gray-400" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              اسحب صورتك هنا أو <span className="text-primary font-medium">اختر ملف</span>
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">PNG, JPG, WebP — حتى 20MB</p>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>

          {/* Email (disabled) */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Mail size={12} />
              {t("auth.email")}
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-xl border border-gray-200 dark:border-dark_border bg-gray-50 dark:bg-darkmode px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
              <User size={12} />
              {t("auth.name")}
            </label>
            <input
              value={name}
              onChange={handleChangeName}
              placeholder={t("auth.name")}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-white dark:bg-dark_input text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                errors.name
                  ? "border-red-400 dark:border-red-700"
                  : "border-gray-200 dark:border-dark_border"
              }`}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={11} /> {t(errors.name)}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Lock size={12} />
              {t("auth.password")}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={handleChangePassword}
                placeholder={t("auth.newPassword")}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm bg-white dark:bg-dark_input text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                  errors.password
                    ? "border-red-400 dark:border-red-700"
                    : "border-gray-200 dark:border-dark_border"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={11} /> {t(errors.password)}
              </p>
            )}
            {password && !errors.password && (
              <div className="mt-1.5 flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      password.length > i * 2
                        ? password.length < 6
                          ? "bg-red-400"
                          : password.length < 10
                          ? "bg-amber-400"
                          : "bg-green-500"
                        : "bg-gray-200 dark:bg-dark_border"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 dark:border-dark_border my-1" />

          {/* ── Action Buttons ── */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-medium transition-all duration-200"
            >
              <LogOut size={13} />
              {t("profile.signOut")}
            </button>

            <div className="flex-1" />

            <button
              type="button"
              onClick={() => onClose && onClose()}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-dark_border text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-darkmode text-xs font-medium transition-all duration-200"
            >
              {t("common.cancel")}
            </button>

            <button
              type="submit"
              disabled={loading || uploadingImage}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary hover:bg-primary/85 text-white text-xs font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-brand-sm"
            >
              {loading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              {loading ? t("common.saving") : t("profile.saveChanges")}
            </button>
          </div>
        </form>
      </div>

      {/* ── QR Modal ── */}
      {showQR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-darklight rounded-2xl p-6 max-w-xs w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <QrCode size={16} className="text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t("profile.myQRCode")}
                </h3>
              </div>
              <button
                onClick={() => setShowQR(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-darkmode text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-center">
              {qrCode ? (
                <>
                  <div className="p-3 bg-white rounded-xl border border-gray-100 dark:border-dark_border inline-block mb-3">
                    <img
                      src={qrCode}
                      alt="QR Code"
                      className="w-44 h-44"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed px-2">
                    {t("profile.qrInstructions")}
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-400">
                    <span className="font-medium text-gray-600 dark:text-gray-300">{userData?.name}</span>
                    <span>•</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${getRoleColor(userData?.role)}`}>
                      {userData?.role}
                    </span>
                  </div>
                </>
              ) : (
                <div className="py-8">
                  <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("profile.generatingQR")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}