// components/Profile/ProfileModal.jsx
"use client";
import React, { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import toast, { Toaster } from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";

const DEFAULT_AVATAR = "/images/default-avatar.jpg";

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

const validateProfile = (name: string, password: string, file?: File) => {
  const errors: { name?: string; password?: string; image?: string } = {};

  if (name && name.trim().length < 2)
    errors.name = "profile.validation.nameLength";
  if (password && password.length < 6)
    errors.password = "profile.validation.passwordLength";
  if (file) {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type))
      errors.image = "profile.validation.invalidImageType";
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) errors.image = "profile.validation.imageTooLarge";
  }

  return errors;
};

export default function ProfileModal({ onClose, onProfileUpdate }: Props) {
  const [userData, setUserData] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string | null;
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
  const { t } = useI18n();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) {
          toast.error(t("auth.validation.required"));
          return;
        }

        const res = await fetch("/api/users/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setUserData(data.user);
          setName(data.user.name || "");
          setEmail(data.user.email || t("common.none"));
          setImagePreview(data.user.image || null);
        } else {
          if (res.status === 401) {
            toast.error(t("profile.sessionExpired"));
            localStorage.removeItem("token");
            onClose && onClose();
          } else {
            toast.error(data?.message || t("common.error"));
          }
        }
      } catch (err) {
        console.error("Fetch user error:", err);
        toast.error(t("common.error"));
      }
    };

    fetchUser();
  }, [onClose, t]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationErrors = validateProfile(name, password, file);
    if (validationErrors.image) {
      setErrors(validationErrors);
      return;
    }

    const base64 = await fileToBase64(file);
    setImagePreview(base64);
    setImageFile(file);
    setErrors((prev) => ({ ...prev, image: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const validationErrors = validateProfile(
      name,
      password,
      imageFile || undefined
    );
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      return;
    }

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

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        if (res.status === 401) {
          toast.error(t("profile.sessionExpired"));
          localStorage.removeItem("token");
          onClose && onClose();
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

      setLoading(false);
      onClose && onClose();
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
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (!userData) {
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-darklight rounded-2xl shadow-lg p-6">
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
    <div className="max-w-lg mx-auto bg-white dark:bg-darklight p-3">
      <Toaster />
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{t("profile.title")}</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-100 border-none border-gray-200">
              <img
                src={imagePreview || userData?.image || DEFAULT_AVATAR}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            </div>

            <label
              className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-700 rounded-full p-2 shadow-lg cursor-pointer border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 hover:shadow-xl"
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
                className="h-4 w-4 text-gray-700 dark:text-gray-300"
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

          <div className="flex-1">
            <div className="text-sm text-gray-500">
              {userData.role?.toUpperCase() || t("profile.user")}
            </div>
            <div className="font-medium text-lg mt-1">
              {userData.name || t("common.none")}
            </div>
            <div className="text-xs text-gray-400 mt-1">{userData.email}</div>
          </div>
        </div>

        {errors.image && <p className="text-sm text-red-500">{t(errors.image)}</p>}

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-left">
              {t("auth.email")}
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white outline-none transition cursor-not-allowed opacity-70"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-left">
              {t("auth.name")}
            </label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
              }}
              placeholder={t("auth.name")}
              className={`w-full rounded-md border border-border dark:border-dark_border bg-transparent px-5 py-3 text-base text-dark outline-none transition placeholder:text-gray-300 focus:border-primary dark:text-white dark:focus:border-primary ${
                errors.name ? "border-red-500" : ""
              }`}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{t(errors.name)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-left">
              {t("auth.password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password)
                  setErrors((p) => ({ ...p, password: undefined }));
              }}
              placeholder={t("auth.password")}
              className={`w-full rounded-md border border-border dark:border-dark_border bg-transparent px-5 py-3 text-base text-dark outline-none transition placeholder:text-gray-300 focus:border-primary dark:text-white dark:focus:border-primary ${
                errors.password ? "border-red-500" : ""
              }`}
            />
            {errors.password && (
              <p className="text-sm text-red-500 mt-1">{t(errors.password)}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handleSignOut}
            className="px-4 py-2 rounded-lg outline-none border border-red-500 text-red-600 hover:text-white hover:bg-red-500 hover:shadow-md transition-all duration-200"
          >
            {t("profile.signOut")}
          </button>

          <button
            type="button"
            onClick={() => onClose && onClose()}
            className="px-4 py-2 rounded-md border border-gray-200 outline-none text-white hover:bg-gray-500 hover:border-gray-500 hover:text-white hover:shadow-md transition-all duration-200"
          >
            {t("common.cancel")}
          </button>

          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 rounded-md bg-primary text-white disabled:opacity-60 transition-all duration-200 flex items-center gap-2 hover:bg-primary/70 hover:shadow-lg`}
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
            <span>{loading ? t("common.saving") : t("profile.saveChanges")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}