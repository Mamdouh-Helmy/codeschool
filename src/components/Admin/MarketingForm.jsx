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
    Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";

export default function MarketingForm({ initial, isCreating, onClose, onSaved }) {
    const { t } = useI18n();
    const [form, setForm] = useState({
        name: initial?.name || "",
        email: initial?.email || "",
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

    /**
     * رفع الصورة إلى Cloudinary
     */
    const uploadImageToCloudinary = async (base64Image) => {
        setUploadingImage(true);
        const toastId = toast.loading("جاري رفع الصورة...");

        try {
            const response = await fetch('/api/upload-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: base64Image,
                    folder: 'marketing' // مجلد خاص بصور التسويق
                })
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
            toast.error(t("marketingForm.nameRequired") || "Name is required");
            return;
        }

        if (isCreating && !form.email.trim()) {
            toast.error(t("marketingForm.emailRequired") || "Email is required");
            return;
        }

        if (isCreating && !form.password) {
            toast.error(t("marketingForm.passwordRequired") || "Password is required");
            return;
        }

        if (form.password && form.password !== form.passwordConfirm) {
            toast.error(t("marketingForm.passwordMismatch") || "Passwords do not match");
            return;
        }

        if (form.password && form.password.length < 6) {
            toast.error(t("marketingForm.passwordTooShort") || "Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        const toastId = toast.loading(
            isCreating
                ? t("marketingForm.creating") || "Creating marketing user..."
                : t("marketingForm.updating") || "Updating marketing user..."
        );

        try {
            const payload = {
                name: form.name.trim(),
                username: form.username.trim(),
                phone: form.phone.trim(),
                image: form.image.trim(),
                ...(isCreating && { email: form.email.trim() }),
                ...(form.password && { password: form.password })
            };

            const url = isCreating
                ? "/api/marketing-admin"
                : `/api/marketing-admin/${initial._id}`;

            const method = isCreating ? "POST" : "PUT";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.message || (isCreating ? t("marketingForm.createFailed") : t("marketingForm.updateFailed")));
            }

            if (result.success) {
                toast.success(
                    isCreating
                        ? t("marketingForm.createdSuccess") || "Marketing user created successfully"
                        : t("marketingForm.updatedSuccess") || "Marketing user updated successfully",
                    { id: toastId }
                );
                onSaved();
                onClose();
            } else {
                throw new Error(result.message || (isCreating ? t("marketingForm.createFailed") : t("marketingForm.updateFailed")));
            }
        } catch (err) {
            console.error("Error:", err);
            toast.error(err.message || t("marketingForm.updateError") || "An error occurred", { id: toastId });
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
                            {t("marketingForm.basicInfo") || "Basic Information"}
                        </h3>
                        <p className="text-12 text-SlateBlueText dark:text-darktext">
                            {t("marketingForm.basicInfoDescription") || "Enter marketing user details"}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
                            <User className="w-3 h-3" />
                            {t("marketingForm.name") || "Name"} *
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => onChange('name', e.target.value)}
                            placeholder={t("marketingForm.namePlaceholder") || "Enter full name"}
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                            required
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            {t("marketingForm.email") || "Email"} {isCreating && "*"}
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => onChange('email', e.target.value)}
                            placeholder="marketing@example.com"
                            className={`w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white ${isCreating
                                    ? "dark:bg-dark_input"
                                    : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                                }`}
                            disabled={!isCreating}
                            required={isCreating}
                        />
                        {!isCreating && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {t("marketingForm.emailReadOnly") || "Email cannot be changed"}
                            </p>
                        )}
                    </div>

                    {/* Username */}
                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
                            <Hash className="w-3 h-3" />
                            {t("marketingForm.username") || "Username"}
                        </label>
                        <input
                            type="text"
                            value={form.username}
                            onChange={(e) => onChange('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            placeholder="john_doe"
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t("marketingForm.usernameHint") || "Letters, numbers, and underscores only. Leave empty to auto-generate."}
                        </p>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            {t("marketingForm.phone") || "Phone"}
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
                            {t("marketingForm.imageUrl") || "Profile Image"}
                        </label>

                        <div className="flex gap-4 items-start">
                            <div className="flex-1 space-y-3">
                                {/* رابط الصورة */}
                                <input
                                    type="url"
                                    value={form.image}
                                    onChange={(e) => onChange('image', e.target.value)}
                                    placeholder="أو أدخل رابط الصورة مباشرة"
                                    className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                                    disabled={uploadingImage}
                                />

                                {/* أزرار التحكم */}
                                <div className="flex gap-2">
                                    <label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-13 font-medium transition-colors border ${uploadingImage
                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border-gray-300'
                                            : 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 cursor-pointer'
                                        }`}>
                                        {uploadingImage ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                {t('marketingForm.uploading') || "جاري الرفع..."}
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-4 h-4" />
                                                {form.image ? (t('marketingForm.changeImage') || "تغيير الصورة") : (t('marketingForm.uploadImage') || "رفع صورة")}
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
                                                onChange('image', '');
                                                setImagePreview('');
                                            }}
                                            className="inline-flex items-center gap-2 px-3 py-2.5 bg-red-500/10 text-red-500 rounded-lg text-13 font-medium hover:bg-red-500/20 transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            {t('marketingForm.removeImage') || "حذف"}
                                        </button>
                                    )}
                                </div>

                                <div className="text-11 text-SlateBlueText dark:text-darktext">
                                    {t('marketingForm.imageRequirements') || "الحد الأقصى: 5MB • JPEG, PNG, WebP"}
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
                                ? t("marketingForm.setPassword") || "Set Password"
                                : t("marketingForm.changePassword") || "Change Password"
                            }
                        </h3>
                        <p className="text-12 text-SlateBlueText dark:text-darktext">
                            {isCreating
                                ? t("marketingForm.passwordRequired") || "Password is required for new user"
                                : t("marketingForm.passwordOptional") || "Leave blank to keep current password"
                            }
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-gray-700 dark:text-gray-300">
                            {isCreating
                                ? t("marketingForm.password") || "Password"
                                : t("marketingForm.newPassword") || "New Password"
                            } {isCreating && "*"}
                        </label>
                        <input
                            type="password"
                            value={form.password}
                            onChange={(e) => onChange('password', e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2.5 border border-blue-200 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark_input dark:text-white bg-white/50"
                            required={isCreating}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-13 font-medium text-gray-700 dark:text-gray-300">
                            {t("marketingForm.confirmPassword") || "Confirm Password"} {isCreating && "*"}
                        </label>
                        <input
                            type="password"
                            value={form.passwordConfirm}
                            onChange={(e) => onChange('passwordConfirm', e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2.5 border border-blue-200 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark_input dark:text-white bg-white/50"
                            required={isCreating}
                        />
                    </div>
                </div>

                <div className="text-xs text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-gray-800/30 p-3 rounded border border-blue-100 dark:border-blue-900/30">
                    <p className="font-medium mb-1">{t("marketingForm.passwordRequirements") || "Password Requirements:"}</p>
                    <ul className="space-y-1 list-disc list-inside">
                        <li>{t("marketingForm.minChars") || "At least 6 characters"}</li>
                        {!isCreating && <li>{t("marketingForm.leaveBlank") || "Leave blank to keep current password"}</li>}
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
                        {t("common.cancel") || "Cancel"}
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
                                    ? t("marketingForm.creating") || "Creating..."
                                    : t("marketingForm.updating") || "Updating..."
                                }
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {isCreating
                                    ? t("marketingForm.create") || "Create Marketing User"
                                    : t("marketingForm.saveChanges") || "Save Changes"
                                }
                            </>
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
}