"use client";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Settings,
  Save,
  Globe,
  Mail,
  Users,
  Bell,
  Shield,
  Database,
  Palette,
  Languages,
  CreditCard,
  FileText,
  Image,
  Video,
  User,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Upload,
  Trash2,
  ChevronRight,
  Building,
  Phone,
  MapPin,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

interface SiteSettings {
  // الإعدادات العامة
  siteName: string;
  siteDescription: string;
  siteLogo: string;
  favicon: string;
  language: string;
  timezone: string;

  // إعدادات الاتصال
  contactEmail: string;
  supportEmail: string;
  phoneNumber: string;
  address: string;

  // إعدادات الوسائط
  maxFileSize: number;
  allowedFileTypes: string[];
  enableImageCompression: boolean;

  // إعدادات الأمان
  enableTwoFactor: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;

  // إعدادات المدفوعات
  currency: string;
  taxRate: number;
  paymentMethods: string[];

  // إعدادات الإشعارات
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
}

export default function AdminSettings() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: "Code School",
    siteDescription: "منصة تعليم البرمجة للشباب",
    siteLogo: "",
    favicon: "",
    language: "ar",
    timezone: "Africa/Cairo",
    contactEmail: "info@codeschool.com",
    supportEmail: "support@codeschool.com",
    phoneNumber: "+201234567890",
    address: "القاهرة، مصر",
    maxFileSize: 5,
    allowedFileTypes: ["jpg", "jpeg", "png", "gif", "pdf", "mp4"],
    enableImageCompression: true,
    enableTwoFactor: false,
    sessionTimeout: 60,
    maxLoginAttempts: 5,
    currency: "EGP",
    taxRate: 14,
    paymentMethods: ["bank", "card", "vodafone_cash"],
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [logoPreview, setLogoPreview] = useState("");
  const [faviconPreview, setFaviconPreview] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings.siteLogo) {
      setLogoPreview(settings.siteLogo);
    }
    if (settings.favicon) {
      setFaviconPreview(settings.favicon);
    }
  }, [settings.siteLogo, settings.favicon]);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSettings(data.data);
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast.success(t("settings.savedSuccess") || "تم حفظ الإعدادات بنجاح");
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(t("settings.saveError") || "خطأ في حفظ الإعدادات");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "favicon"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (type === "logo") {
          setLogoPreview(result);
          setSettings((prev) => ({ ...prev, siteLogo: result }));
        } else {
          setFaviconPreview(result);
          setSettings((prev) => ({ ...prev, favicon: result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetSettings = () => {
    const resetConfirm =
      t("settings.resetConfirm") ||
      "هل أنت متأكد من إعادة التعيين إلى الإعدادات الافتراضية؟";
    const resetWarning =
      t("settings.resetWarning") ||
      "سيتم فقدان جميع التغييرات التي لم يتم حفظها.";
    const cancelText = t("common.cancel") || "إلغاء";
    const resetText = t("settings.reset") || "إعادة التعيين";
    const resetSuccess = t("settings.resetSuccess") || "تم إعادة التعيين بنجاح";

    toast(
      (toastInstance) => (
        <div className="w-96 max-w-full bg-white dark:bg-darkmode text-MidnightNavyText dark:text-white rounded-xl shadow-lg border border-gray-200 dark:border-dark_border p-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600 text-sm">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{resetConfirm}</p>
              <p className="text-xs mt-1 text-slate-500 dark:text-darktext">
                {resetWarning}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              className="px-3 py-1.5 bg-gray-100 dark:bg-dark_input text-gray-700 dark:text-white rounded-lg text-xs hover:opacity-90 border border-gray-300 dark:border-dark_border transition-all duration-200"
              onClick={() => toast.dismiss(toastInstance.id)}
            >
              {cancelText}
            </button>
            <button
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs transition-all duration-200 shadow-sm flex items-center gap-1"
              onClick={async () => {
                toast.dismiss(toastInstance.id);
                setSettings({
                  siteName: "Code School",
                  siteDescription: "منصة تعليم البرمجة للشباب",
                  siteLogo: "",
                  favicon: "",
                  language: "ar",
                  timezone: "Africa/Cairo",
                  contactEmail: "info@codeschool.com",
                  supportEmail: "support@codeschool.com",
                  phoneNumber: "+201234567890",
                  address: "القاهرة، مصر",
                  maxFileSize: 5,
                  allowedFileTypes: ["jpg", "jpeg", "png", "gif", "pdf", "mp4"],
                  enableImageCompression: true,
                  enableTwoFactor: false,
                  sessionTimeout: 60,
                  maxLoginAttempts: 5,
                  currency: "EGP",
                  taxRate: 14,
                  paymentMethods: ["bank", "card", "vodafone_cash"],
                  emailNotifications: true,
                  pushNotifications: true,
                  smsNotifications: false,
                });
                toast.success(resetSuccess);
              }}
            >
              <RefreshCw className="w-3 h-3" />
              {resetText}
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: "top-center" }
    );
  };

  const tabs = [
    {
      id: "general",
      label: t("settings.general") || "عام",
      icon: Settings,
      description: "الإعدادات الأساسية للموقع",
    },
    {
      id: "media",
      label: t("settings.media") || "الوسائط",
      icon: Image,
      description: "إعدادات الملفات والصور",
    },
    {
      id: "security",
      label: t("settings.security") || "الأمان",
      icon: Shield,
      description: "إعدادات الأمان والمصادقة",
    },
    {
      id: "payments",
      label: t("settings.payments") || "المدفوعات",
      icon: CreditCard,
      description: "إعدادات الدفع والعملات",
    },
    {
      id: "notifications",
      label: t("settings.notifications") || "الإشعارات",
      icon: Bell,
      description: "إعدادات الإشعارات",
    },
  ];

  const SettingSection = ({
    title,
    description,
    children,
    icon: Icon,
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
    icon?: any;
  }) => (
    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-darkmode dark:to-dark_input rounded-lg p-4 border border-gray-200 dark:border-dark_border shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        {Icon && (
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white mb-1">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-gray-600 dark:text-darktext">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );

  const SettingField = ({
    label,
    description,
    children,
  }: {
    label: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-1">
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500 dark:text-darktext mb-1">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );

  const Input = ({ ...props }) => (
    <input
      className="w-full px-3 py-2 border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-sm transition-all duration-200 placeholder-gray-400 dark:placeholder-darktext"
      {...props}
    />
  );

  const Textarea = ({ ...props }) => (
    <textarea
      className="w-full px-3 py-2 border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-sm transition-all duration-200 resize-none placeholder-gray-400 dark:placeholder-darktext"
      {...props}
    />
  );

  const Select = ({ ...props }) => (
    <select
      className="w-full px-3 py-2 border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-sm transition-all duration-200 appearance-none bg-no-repeat bg-right-2 bg-center pr-8"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
      }}
      {...props}
    />
  );

  const Checkbox = ({
    checked,
    onChange,
    label,
    description,
  }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    description?: string;
  }) => (
    <label className="flex items-start gap-2 p-3 bg-white dark:bg-dark_input border border-gray-300 dark:border-dark_border rounded-lg hover:bg-gray-50 dark:hover:bg-darklight transition-all duration-200 cursor-pointer group">
      <div className="flex items-center h-4 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded transition-all duration-200"
        />
      </div>
      <div className="flex-1">
        <span className="text-sm text-gray-800 dark:text-white group-hover:text-primary transition-colors duration-200">
          {label}
        </span>
        {description && (
          <p className="text-xs text-gray-500 dark:text-darktext mt-1">
            {description}
          </p>
        )}
      </div>
    </label>
  );

  const ImageUpload = ({
    label,
    value,
    preview,
    onUpload,
    onRemove,
    onUrlChange,
  }: {
    label: string;
    value: string;
    preview: string;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: () => void;
    onUrlChange: (url: string) => void;
  }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-MidnightNavyText dark:text-white">
        {label}
      </label>
      <div className="flex gap-3 items-start">
        <div className="flex-1 space-y-2">
          <Input
            type="text"
            value={value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onUrlChange(e.target.value)
            }
            placeholder={t("settings.logoUrl") || "رابط الصورة أو رفع ملف"}
          />
          <div className="flex gap-2">
            <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 border border-primary/20">
              <Upload className="w-3 h-3" />
              {t("settings.uploadImage") || "رفع صورة"}
              <input
                type="file"
                accept="image/*"
                onChange={onUpload}
                className="hidden"
              />
            </label>
            {preview && (
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-medium transition-all duration-200 border border-red-500/20"
              >
                <Trash2 className="w-3 h-3" />
                {t("settings.removeImage") || "إزالة"}
              </button>
            )}
          </div>
        </div>

        {preview && (
          <div className="w-16 h-16 border-2 border-dashed border-gray-300 dark:border-dark_border rounded-lg overflow-hidden bg-white dark:bg-dark_input flex items-center justify-center">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-contain p-1"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderGeneralSettings = () => (
    <div className="space-y-4">
      <SettingSection
        title={t("settings.basicInfo") || "المعلومات الأساسية"}
        description="إعدادات الموقع الأساسية والهوية"
        icon={Building}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <SettingField
            label={t("settings.siteName") || "اسم الموقع"}
            description="اسم الموقع كما يظهر للزوار"
          >
            <Input
              type="text"
              value={settings.siteName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSettings((prev) => ({ ...prev, siteName: e.target.value }))
              }
              placeholder="أدخل اسم الموقع"
            />
          </SettingField>

          <SettingField
            label={t("settings.language") || "اللغة الافتراضية"}
            description="اللغة الرئيسية للموقع"
          >
            <Select
              value={settings.language}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSettings((prev) => ({ ...prev, language: e.target.value }))
              }
            >
              <option value="ar">العربية 🇸🇦</option>
              <option value="en">English 🇺🇸</option>
            </Select>
          </SettingField>
        </div>

        <SettingField
          label={t("settings.siteDescription") || "وصف الموقع"}
          description="وصف مختصر يظهر في محركات البحث"
        >
          <Textarea
            value={settings.siteDescription}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSettings((prev) => ({
                ...prev,
                siteDescription: e.target.value,
              }))
            }
            rows={2}
            placeholder="أدخل وصف الموقع..."
          />
        </SettingField>
      </SettingSection>

      <SettingSection
        title={t("settings.contactInfo") || "معلومات الاتصال"}
        description="معلومات الاتصال الخاصة بالموقع"
        icon={Phone}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <SettingField
            label={t("settings.contactEmail") || "البريد الإلكتروني للاتصال"}
            description="البريد الإلكتروني الرئيسي للتواصل"
          >
            <Input
              type="email"
              value={settings.contactEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSettings((prev) => ({
                  ...prev,
                  contactEmail: e.target.value,
                }))
              }
              placeholder="info@example.com"
            />
          </SettingField>

          <SettingField
            label={t("settings.supportEmail") || "بريد الدعم"}
            description="البريد الإلكتروني لدعم العملاء"
          >
            <Input
              type="email"
              value={settings.supportEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSettings((prev) => ({
                  ...prev,
                  supportEmail: e.target.value,
                }))
              }
              placeholder="support@example.com"
            />
          </SettingField>

          <SettingField
            label={t("settings.phoneNumber") || "رقم الهاتف"}
            description="رقم الهاتف للتواصل"
          >
            <Input
              type="tel"
              value={settings.phoneNumber}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSettings((prev) => ({
                  ...prev,
                  phoneNumber: e.target.value,
                }))
              }
              placeholder="+201234567890"
            />
          </SettingField>

          <SettingField
            label={t("settings.address") || "العنوان"}
            description="العنوان الفعلي للمؤسسة"
          >
            <Input
              type="text"
              value={settings.address}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSettings((prev) => ({ ...prev, address: e.target.value }))
              }
              placeholder="أدخل العنوان الكامل..."
            />
          </SettingField>
        </div>
      </SettingSection>

      <SettingSection
        title={t("settings.branding") || "الهوية البصرية"}
        description="الشعار والأيقونة الخاصة بالموقع"
        icon={Palette}
      >
        <div className="grid md:grid-cols-2 gap-6">
          <ImageUpload
            label={t("settings.siteLogo") || "شعار الموقع"}
            value={settings.siteLogo}
            preview={logoPreview}
            onUpload={(e) => handleImageUpload(e, "logo")}
            onRemove={() => {
              setLogoPreview("");
              setSettings((prev) => ({ ...prev, siteLogo: "" }));
            }}
            onUrlChange={(url) =>
              setSettings((prev) => ({ ...prev, siteLogo: url }))
            }
          />

          <ImageUpload
            label={t("settings.favicon") || "الأيقونة (Favicon)"}
            value={settings.favicon}
            preview={faviconPreview}
            onUpload={(e) => handleImageUpload(e, "favicon")}
            onRemove={() => {
              setFaviconPreview("");
              setSettings((prev) => ({ ...prev, favicon: "" }));
            }}
            onUrlChange={(url) =>
              setSettings((prev) => ({ ...prev, favicon: url }))
            }
          />
        </div>
      </SettingSection>
    </div>
  );

  const renderMediaSettings = () => (
    <div className="space-y-4">
      <SettingSection
        title={t("settings.fileSettings") || "إعدادات الملفات"}
        description="إعدادات رفع وإدارة الملفات"
        icon={Database}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <SettingField
            label={t("settings.maxFileSize") || "الحد الأقصى لحجم الملف (MB)"}
            description="الحجم الأقصى المسموح به لرفع الملفات"
          >
            <Input
              type="number"
              value={settings.maxFileSize}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSettings((prev) => ({
                  ...prev,
                  maxFileSize: Number(e.target.value),
                }))
              }
              min="1"
              max="100"
            />
          </SettingField>

          <SettingField
            label={t("settings.allowedFileTypes") || "أنواع الملفات المسموحة"}
            description="امتدادات الملفات المقبولة (مفصولة بفواصل)"
          >
            <Input
              type="text"
              value={settings.allowedFileTypes.join(", ")}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSettings((prev) => ({
                  ...prev,
                  allowedFileTypes: e.target.value
                    .split(",")
                    .map((type) => type.trim()),
                }))
              }
              placeholder="jpg, png, pdf, mp4"
            />
          </SettingField>
        </div>

        <Checkbox
          checked={settings.enableImageCompression}
          onChange={(checked) =>
            setSettings((prev) => ({
              ...prev,
              enableImageCompression: checked,
            }))
          }
          label={
            t("settings.enableImageCompression") || "تفعيل ضغط الصور تلقائياً"
          }
          description="تقليل حجم الصور تلقائياً للحفاظ على المساحة وتحسين الأداء"
        />
      </SettingSection>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-4">
      <SettingSection
        title={t("settings.authentication") || "المصادقة"}
        description="إعدادات الأمان والمصادقة"
        icon={Lock}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <SettingField
            label={t("settings.sessionTimeout") || "مهلة الجلسة (دقيقة)"}
            description="مدة الجلسة قبل أن يتم تسجيل الخروج تلقائياً"
          >
            <Input
              type="number"
              value={settings.sessionTimeout}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSettings((prev) => ({
                  ...prev,
                  sessionTimeout: Number(e.target.value),
                }))
              }
              min="15"
              max="1440"
            />
          </SettingField>

          <SettingField
            label={
              t("settings.maxLoginAttempts") ||
              "الحد الأقصى لمحاولات تسجيل الدخول"
            }
            description="عدد المحاولات المسموحة قبل قفل الحساب مؤقتاً"
          >
            <Input
              type="number"
              value={settings.maxLoginAttempts}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSettings((prev) => ({
                  ...prev,
                  maxLoginAttempts: Number(e.target.value),
                }))
              }
              min="3"
              max="10"
            />
          </SettingField>
        </div>

        <Checkbox
          checked={settings.enableTwoFactor}
          onChange={(checked) =>
            setSettings((prev) => ({ ...prev, enableTwoFactor: checked }))
          }
          label={t("settings.enableTwoFactor") || "تفعيل المصادقة الثنائية"}
          description="طلب رمز تحقق إضافي عند تسجيل الدخول"
        />
      </SettingSection>
    </div>
  );

  const renderPaymentSettings = () => (
    <div className="space-y-4">
      <SettingSection
        title={t("settings.paymentConfig") || "إعدادات الدفع"}
        description="إعدادات العملات وطرق الدفع"
        icon={CreditCard}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <SettingField
            label={t("settings.currency") || "العملة الافتراضية"}
            description="العملة الرئيسية المستخدمة في المعاملات"
          >
            <Select
              value={settings.currency}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSettings((prev) => ({ ...prev, currency: e.target.value }))
              }
            >
              <option value="EGP">جنيه مصري (EGP)</option>
              <option value="USD">دولار أمريكي (USD)</option>
              <option value="EUR">يورو (EUR)</option>
              <option value="SAR">ريال سعودي (SAR)</option>
            </Select>
          </SettingField>

          <SettingField
            label={t("settings.taxRate") || "معدل الضريبة (%)"}
            description="نسبة الضريبة المطبقة على المعاملات"
          >
            <Input
              type="number"
              value={settings.taxRate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSettings((prev) => ({
                  ...prev,
                  taxRate: Number(e.target.value),
                }))
              }
              min="0"
              max="50"
              step="0.1"
            />
          </SettingField>
        </div>

        <SettingField
          label={t("settings.paymentMethods") || "طرق الدفع المتاحة"}
          description="اختر طرق الدفع التي تريد تفعيلها"
        >
          <div className="grid md:grid-cols-2 gap-2">
            {[
              {
                value: "bank",
                label: t("settings.bankTransfer") || "التحويل البنكي",
                icon: Building,
              },
              {
                value: "card",
                label: t("settings.creditCard") || "البطاقة الائتمانية",
                icon: CreditCard,
              },
              {
                value: "vodafone_cash",
                label: t("settings.vodafoneCash") || "فودافون كاش",
                icon: Phone,
              },
              { value: "paypal", label: "PayPal", icon: Globe },
            ].map((method) => (
              <Checkbox
                key={method.value}
                checked={settings.paymentMethods.includes(method.value)}
                onChange={(checked) => {
                  const updatedMethods = checked
                    ? [...settings.paymentMethods, method.value]
                    : settings.paymentMethods.filter((m) => m !== method.value);
                  setSettings((prev) => ({
                    ...prev,
                    paymentMethods: updatedMethods,
                  }));
                }}
                label={method.label}
              />
            ))}
          </div>
        </SettingField>
      </SettingSection>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-4">
      <SettingSection
        title={t("settings.notificationChannels") || "قنوات الإشعارات"}
        description="إعدادات طرق إرسال الإشعارات"
        icon={Bell}
      >
        <div className="space-y-3">
          <Checkbox
            checked={settings.emailNotifications}
            onChange={(checked) =>
              setSettings((prev) => ({ ...prev, emailNotifications: checked }))
            }
            label={t("settings.emailNotifications") || "الإشعارات البريدية"}
            description="إرسال الإشعارات عبر البريد الإلكتروني"
          />

          <Checkbox
            checked={settings.pushNotifications}
            onChange={(checked) =>
              setSettings((prev) => ({ ...prev, pushNotifications: checked }))
            }
            label={t("settings.pushNotifications") || "الإشعارات الفورية"}
            description="إظهار الإشعارات الفورية في المتصفح"
          />

          <Checkbox
            checked={settings.smsNotifications}
            onChange={(checked) =>
              setSettings((prev) => ({ ...prev, smsNotifications: checked }))
            }
            label={t("settings.smsNotifications") || "رسائل SMS"}
            description="إرسال الإشعارات عبر رسائل SMS"
          />
        </div>
      </SettingSection>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return renderGeneralSettings();
      case "media":
        return renderMediaSettings();
      case "security":
        return renderSecuritySettings();
      case "payments":
        return renderPaymentSettings();
      case "notifications":
        return renderNotificationSettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-darkmode dark:to-dark_input rounded-xl shadow-md p-6 border border-gray-200 dark:border-dark_border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-400 rounded-xl flex items-center justify-center shadow-md">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-MidnightNavyText dark:text-white">
                  {t("settings.title") || "إعدادات الموقع"}
                </h1>
                <p className="text-sm text-gray-600 dark:text-darktext">
                  {t("settings.description") ||
                    "إدارة إعدادات الموقع العامة، الأمان، المدفوعات، والإشعارات"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-darkmode rounded-xl shadow-md border border-gray-200 dark:border-dark_border overflow-hidden">
        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 dark:border-dark_border bg-gradient-to-r from-gray-50 to-white dark:from-dark_input dark:to-darkmode">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs transition-all duration-300 min-w-max flex-1 lg:flex-none justify-center ${
                    isActive
                      ? "border-primary text-primary bg-white dark:bg-darkmode shadow-sm"
                      : "border-transparent text-gray-600 dark:text-darktext hover:text-gray-800 dark:hover:text-white hover:bg-white dark:hover:bg-dark_input"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-transform duration-300 ${
                      isActive ? "scale-110" : ""
                    }`}
                  />
                  <span className="whitespace-nowrap">{tab.label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 ml-1" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          <div className="space-y-4">{renderTabContent()}</div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-dark_border">
            <button
              type="button"
              onClick={handleResetSettings}
              className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg font-medium text-xs transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              {t("settings.reset") || "إعادة التعيين"}
            </button>

            <div className="flex-1"></div>

            <button
              type="button"
              onClick={saveSettings}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-primary to-blue-400 hover:from-primary/90 hover:to-blue-400/90 text-white rounded-lg font-medium text-xs transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t("settings.saving") || "جاري الحفظ..."}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t("settings.save") || "حفظ الإعدادات"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
