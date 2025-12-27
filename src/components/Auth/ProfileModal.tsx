"use client";
import React, { useState, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import toast, { Toaster } from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";

const DEFAULT_AVATAR = "/images/default-avatar.jpg";

// ✅ Cache خارج المكون
const profileCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

type Props = {
  onClose?: () => void;
  onProfileUpdate?: (userData: any) => void;
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

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

  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) return "profile.validation.imageTooLarge";

  return "";
};

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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<{
    name?: string;
    password?: string;
    image?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const { t } = useI18n();

  // ✅ Refs لمنع memory leaks
  const isMounted = useRef(true);
  const qrGenerationTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      if (qrGenerationTimeout.current) {
        clearTimeout(qrGenerationTimeout.current);
      }
    };
  }, []);

  // ✅ تحسين useEffect مع cleanup
  useEffect(() => {
    let isSubscribed = true;
    const controller = new AbortController();

    const fetchUser = async () => {
      try {
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) {
          if (isSubscribed) {
            toast.error(t("auth.validation.required"));
          }
          return;
        }

        // ✅ التحقق من الـ cache أولاً
        const cacheKey = `user_${token.substring(0, 20)}`;
        const cachedData = profileCache.get(cacheKey);

        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
          if (isSubscribed) {
            setUserData(cachedData.data);
            setName(cachedData.data.name || "");
            setEmail(cachedData.data.email || t("common.none"));
            setImagePreview(cachedData.data.image || null);
            setQrCode(cachedData.data.qrCode || "");
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
            // ✅ حفظ في الـ cache
            profileCache.set(cacheKey, {
              data: data.user,
              timestamp: Date.now()
            });

            setUserData(data.user);
            setName(data.user.name || "");
            setEmail(data.user.email || t("common.none"));
            setImagePreview(data.user.image || null);
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
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

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
  }, [onClose]); // ❌ إزالة dependency على 't'

  const handleShowQR = async () => {
    if (qrGenerationTimeout.current) {
      clearTimeout(qrGenerationTimeout.current);
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("يجب تسجيل الدخول أولاً");
        return;
      }

      if (!userData || !userData._id) {
        console.error("❌ User data or id is missing:", userData);
        toast.error("بيانات المستخدم غير متوفرة");
        return;
      }

      // ✅ استخدام debounce لمنع توليد QR متكرر
      qrGenerationTimeout.current = setTimeout(async () => {
        try {
          const response = await fetch("/api/auth/generate-qr", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId: userData._id,
            }),
          });

          const data = await response.json();

          if (data.success) {
            setQrCode(data.qrCode);
            setShowQR(true);

            const updatedUser = {
              ...userData,
              qrCode: data.qrCode,
              qrCodeData: data.qrData,
            };
            setUserData(updatedUser);
            if (onProfileUpdate) onProfileUpdate(updatedUser);
          } else {
            console.error("❌ QR generation failed:", data.message);
            toast.error(data.message || "فشل توليد QR code");
          }
        } catch (error) {
          console.error("💥 Show QR error:", error);
          toast.error("حدث خطأ أثناء توليد QR code");
        }
      }, 300); // debounce 300ms
    } catch (error) {
      console.error("💥 Show QR error:", error);
      toast.error("حدث خطأ أثناء توليد QR code");
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageError = validateImage(file);
    if (imageError) {
      setErrors((prev) => ({ ...prev, image: imageError }));
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setImagePreview(base64);
      setImageFile(file);
      setErrors((prev) => ({ ...prev, image: "" }));
    } catch (error) {
      console.error("Error converting image:", error);
      toast.error("حدث خطأ في تحويل الصورة");
    }
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

    if (!validateAll()) {
      toast.error(t("profile.validation.fixErrors"));
      return;
    }

    setLoading(true);

    try {
      const updateData: any = {};
      if (name && name.trim() !== "" && name.trim() !== userData?.name)
        updateData.name = name.trim();
      if (password && password !== "") updateData.password = password;
      if (imagePreview && imagePreview !== userData?.image)
        updateData.image = imagePreview;

      if (Object.keys(updateData).length === 0) {
        toast.error(t("profile.noChanges"));
        setLoading(false);
        return;
      }

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
          // ✅ تنظيف الـ cache
          profileCache.delete(`user_${token.substring(0, 20)}`);
          if (onClose) onClose();
          await signOut({ callbackUrl: "/" });
          return;
        }
        toast.error(
          data?.message || `${t("profile.updateFailed")} (${res.status})`
        );
        setLoading(false);
        return;
      }

      toast.success(t("profile.updateSuccess"));

      const updatedUser = data.user || userData;
      setUserData(updatedUser);

      if (onProfileUpdate) onProfileUpdate(updatedUser);

      // ✅ تحديث الـ cache
      profileCache.set(`user_${token.substring(0, 20)}`, {
        data: updatedUser,
        timestamp: Date.now()
      });

      // إعادة تعيين كلمة المرور بعد الحفظ الناجح
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
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      localStorage.removeItem("token");
      // ✅ تنظيف جميع الـ caches
      profileCache.clear();
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (!userData) {
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-darklight rounded-2xl shadow-lg p-4 sm:p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
          <div className="h-40 bg-gray-100 rounded mb-4" />
          <div className="h-4 bg-gray-200 rounded mb-2" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-white dark:bg-darklight p-3 sm:p-4 md:p-6">
      <Toaster />

      {/* الهيدر */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white text-center sm:text-left">
          {t("profile.title")}
        </h3>
        <button
          onClick={handleShowQR}
          className="px-3 sm:px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base w-full sm:w-auto"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
          {t("profile.showQR")}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" noValidate>

        {/* قسم الصورة والمعلومات */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="relative">
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
              <img
                src={imagePreview || userData?.image || DEFAULT_AVATAR}
                alt="avatar"
                className="w-full h-full object-cover"
                loading="lazy" // ✅ lazy loading للصورة
              />
            </div>

            <label
              className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-700 rounded-full p-1.5 sm:p-2 shadow-lg cursor-pointer border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 hover:shadow-xl"
              title={t("profile.changePhoto")}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 sm:h-4 sm:w-4 text-gray-700 dark:text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536M9 11l6-6 6 6M3 21v-4a4 4 0 014-4h4"
                />
              </svg>
            </label>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {userData.role?.toUpperCase() || t("profile.user")}
            </div>
            <div className="font-medium text-base sm:text-lg mt-1 text-gray-900 dark:text-white">
              {userData.name || t("common.none")}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
              {userData.email}
            </div>
          </div>
        </div>

        {errors.image && (
          <p className="text-sm text-red-500 text-center sm:text-left">{t(errors.image)}</p>
        )}

        {/* حقول الإدخال */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700 dark:text-gray-300">
              {t("auth.email")}
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-900 dark:text-white outline-none transition cursor-not-allowed opacity-70 text-sm sm:text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700 dark:text-gray-300">
              {t("auth.name")}
            </label>
            <input
              value={name}
              onChange={handleChangeName}
              placeholder={t("auth.name")}
              className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 sm:px-4 py-2.5 sm:py-3 text-gray-900 dark:text-white outline-none transition placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary dark:focus:border-primary text-sm sm:text-base ${errors.name ? "border-red-500" : ""
                }`}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1 sm:mt-2">{t(errors.name)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700 dark:text-gray-300">
              {t("auth.password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={handleChangePassword}
              placeholder={t("auth.newPassword")}
              className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 sm:px-4 py-2.5 sm:py-3 text-gray-900 dark:text-white outline-none transition placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary dark:focus:border-primary text-sm sm:text-base ${errors.password ? "border-red-500" : ""
                }`}
            />
            {errors.password && (
              <p className="text-sm text-red-500 mt-1 sm:mt-2">{t(errors.password)}</p>
            )}
          </div>
        </div>

        {/* أزرار التحكم */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
          <button
            type="button"
            onClick={handleSignOut}
            className="px-2 py-1 rounded-lg outline-none border border-red-500 text-red-600 hover:text-white hover:bg-red-500 hover:shadow-md transition-all duration-200 text-sm sm:text-base order-2 sm:order-1"
          >
            {t("profile.signOut")}
          </button>

          <div className="flex gap-3 sm:gap-4 order-1 sm:order-2">
            <button
              type="button"
              onClick={() => onClose && onClose()}
              className="flex-1 px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 outline-none text-gray-700 dark:text-gray-300 hover:bg-gray-500 hover:border-gray-500 hover:text-white hover:shadow-md transition-all duration-200 text-sm sm:text-base"
            >
              {t("common.cancel")}
            </button>

            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-12 py-1 rounded-lg bg-primary text-white disabled:opacity-60 transition-all duration-200 flex items-center justify-center gap-2 hover:bg-primary/70 hover:shadow-lg text-sm sm:text-base`}
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
              ) : null}
              <span>
                {loading ? t("common.saving") : t("profile.saveChanges")}
              </span>
            </button>
          </div>
        </div>
      </form>

      {/* نافذة عرض QR Code */}
      {showQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-darklight rounded-2xl p-4 sm:p-6 max-w-xs sm:max-w-sm w-full mx-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("profile.myQRCode")}
              </h3>
              <button
                onClick={() => setShowQR(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="text-center">
              {qrCode ? (
                <>
                  <img
                    src={qrCode}
                    alt="QR Code"
                    className="mx-auto w-48 sm:w-56 border border-gray-200 dark:border-gray-600 rounded-lg"
                    loading="lazy" // ✅ lazy loading
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 sm:mt-4 px-2">
                    {t("profile.qrInstructions")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    {userData?.name} • {userData?.role}
                  </p>
                </>
              ) : (
                <div className="py-6 sm:py-8">
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-3 sm:mt-4 text-gray-600 dark:text-gray-400 text-sm">
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