"use client";
import { useState, useEffect } from "react";
import { User, Mail, MapPin, Phone, FileText, Briefcase, Image as ImageIcon, Loader2, X, FileUp, FileCheck, TrendingUp, GitCommit } from "lucide-react";
import { PortfolioFormData, ContactInfo } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

interface BasicInfoSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

interface BasicInfoStats {
  yearsOfExperience: number;
  codeCommits: number;
}

interface BasicInfoForm {
  title: string;
  description: string;
  ownerRole: string;
  ownerImage: string;
  cvUrl: string;
  stats: BasicInfoStats;
  contactInfo: ContactInfo;
}

/* ─── Reusable AI-border field wrapper ─────────────────────── */
function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="pf-group">
      <label className="pf-label">
        {icon}
        {label}
      </label>
      <div className="pf-wrap">
        <div className="pf-surface">{children}</div>
      </div>
    </div>
  );
}

/* ✅ نفس أسلوب الرفع المستخدم في ProjectsSection / CertificatesSection */
async function uploadImage(file: File): Promise<string> {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "portfolio-owner");

  const res = await fetch("/api/upload-image", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Upload failed");
  return data.imageUrl;
}

/* ✅ رفع ملف الـ CV (PDF) */
async function uploadCv(file: File): Promise<string> {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "portfolio-cv");

  const res = await fetch("/api/upload-cv", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Upload failed");
  return data.fileUrl;
}

export default function BasicInfoSection({ data, onChange }: BasicInfoSectionProps) {
  const { t } = useI18n();

  const [form, setForm] = useState<BasicInfoForm>({
    title: data?.title || "",
    description: data?.description || "",
    ownerRole: data?.ownerRole || "",
    ownerImage: data?.ownerImage || "",
    cvUrl: data?.cvUrl || "",
    stats: data?.stats || { yearsOfExperience: 0, codeCommits: 0 },
    contactInfo: data?.contactInfo || { email: "", phone: "", location: "" },
  });

  const [uploading, setUploading] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);

  useEffect(() => {
    setForm({
      title: data?.title || "",
      description: data?.description || "",
      ownerRole: data?.ownerRole || "",
      ownerImage: data?.ownerImage || "",
      cvUrl: data?.cvUrl || "",
      stats: data?.stats || { yearsOfExperience: 0, codeCommits: 0 },
      contactInfo: data?.contactInfo || { email: "", phone: "", location: "" },
    });
  }, [data]);

  const set = (
    field: keyof Omit<BasicInfoForm, "contactInfo" | "stats">,
    value: string
  ) => {
    const next = { ...form, [field]: value };
    setForm(next);
    onChange(next);
  };

  const setContact = (field: keyof ContactInfo, value: string) => {
    const ci = { ...form.contactInfo, [field]: value };
    const next = { ...form, contactInfo: ci };
    setForm(next);
    onChange(next);
  };

  /* ✅ setter مخصص لحقول الـ stats اليدوية */
  const setStats = (field: keyof BasicInfoStats, value: number) => {
    const st = { ...form.stats, [field]: value };
    const next = { ...form, stats: st };
    setForm(next);
    onChange(next);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      set("ownerImage", url);
    } catch (err) {
      console.error("Owner image upload failed:", err);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  /* ✅ هاندلر رفع الـ CV */
  const handleCvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert(t("portfolio.basic.cvPdfOnly") || "Please upload a PDF file only.");
      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert(t("portfolio.basic.cvTooLarge") || "File size must be less than 10MB.");
      e.target.value = "";
      return;
    }

    setUploadingCv(true);
    try {
      const url = await uploadCv(file);
      set("cvUrl", url);
    } catch (err) {
      console.error("CV upload failed:", err);
      alert("Failed to upload CV. Please try again.");
    } finally {
      setUploadingCv(false);
      e.target.value = "";
    }
  };

  const descLen = form.description.length;

  return (
    <div className="space-y-6">

      {/* Owner Photo */}
      <div className="pf-group">
        <label className="pf-label">
          <ImageIcon size={14} />
          {t("portfolio.basic.ownerImage") || "Profile Photo"}
        </label>
        <div className="flex items-center gap-4">
          {form.ownerImage ? (
            <div className="relative group">
              <img
                src={form.ownerImage}
                alt="Profile"
                className="w-20 h-20 object-cover rounded-full border border-gray-200 dark:border-dark_border"
              />
              <button
                type="button"
                onClick={() => set("ownerImage", "")}
                className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ) : uploading ? (
            <div className="w-20 h-20 flex items-center justify-center bg-gray-100 dark:bg-dark_input rounded-full border border-dashed border-gray-300 dark:border-dark_border">
              <Loader2 size={18} className="animate-spin text-primary" />
            </div>
          ) : (
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-dark_input text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs font-medium">
              <ImageIcon size={13} />
              {t("portfolio.basic.uploadPhoto") || "Upload Photo"}
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {/* CV Upload */}
      <div className="pf-group">
        <label className="pf-label">
          <FileUp size={14} />
          {t("portfolio.basic.cv") || "CV / Resume (PDF)"}
        </label>
        <div className="flex items-center gap-3">
          {form.cvUrl ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-dark_input rounded-lg border border-gray-200 dark:border-dark_border text-xs">
              <FileCheck size={14} className="text-green-500 flex-shrink-0" />
              <a
                href={form.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline truncate max-w-[180px]"
              >
                {t("portfolio.basic.cvUploaded") || "View uploaded CV"}
              </a>
              <button
                type="button"
                onClick={() => set("cvUrl", "")}
                className="text-red-500 hover:text-red-600 flex-shrink-0"
              >
                <X size={13} />
              </button>
            </div>
          ) : uploadingCv ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-dark_input rounded-lg border border-dashed border-gray-300 dark:border-dark_border text-xs text-gray-500">
              <Loader2 size={14} className="animate-spin text-primary" />
              {t("portfolio.basic.uploadingCv") || "Uploading..."}
            </div>
          ) : (
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-dark_input text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs font-medium">
              <FileUp size={13} />
              {t("portfolio.basic.uploadCv") || "Upload CV (PDF)"}
              <input type="file" accept="application/pdf" onChange={handleCvChange} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {/* Title */}
      <Field label={`${t("portfolio.basic.title")} *`} icon={<User size={14} />}>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder={t("portfolio.basic.titlePlaceholder")}
          className="pf-input"
          required
        />
      </Field>

      {/* Owner Role */}
      <Field label={t("portfolio.basic.ownerRole") || "Role / Job Title"} icon={<Briefcase size={14} />}>
        <input
          type="text"
          value={form.ownerRole}
          onChange={(e) => set("ownerRole", e.target.value)}
          placeholder={t("portfolio.basic.ownerRolePlaceholder") || "e.g. Full-Stack Developer"}
          className="pf-input"
        />
      </Field>

      {/* Description */}
      <div className="pf-group">
        <label className="pf-label">
          <FileText size={14} />
          {t("portfolio.basic.description")}
        </label>
        <div className="pf-wrap">
          <div className="pf-surface">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder={t("portfolio.basic.descriptionPlaceholder")}
              className="pf-textarea"
              maxLength={500}
            />
          </div>
        </div>
        <span className="pf-count" data-warn={descLen > 420 ? "true" : "false"}>
          {descLen}/500 {t("common.characters")}
        </span>
      </div>

      {/* ✅ Stats — الحقول اليدوية بس، الباقي بيتحسب تلقائي في الباك اند */}
      <div className="border-t border-gray-200 dark:border-dark_border pt-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          {t("portfolio.basic.statsTitle") || "Stats"}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {t("portfolio.basic.statsNote") ||
            "Projects completed and Technologies mastered are calculated automatically from your Projects and Skills sections."}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label={t("portfolio.basic.yearsOfExperience") || "Years of Experience"}
            icon={<Briefcase size={14} />}
          >
            <input
              type="number"
              min={0}
              value={form.stats.yearsOfExperience}
              onChange={(e) =>
                setStats("yearsOfExperience", Math.max(0, Number(e.target.value) || 0))
              }
              placeholder="0"
              className="pf-input"
            />
          </Field>

          <Field
            label={t("portfolio.basic.codeCommits") || "Code Commits"}
            icon={<GitCommit size={14} />}
          >
            <input
              type="number"
              min={0}
              value={form.stats.codeCommits}
              onChange={(e) =>
                setStats("codeCommits", Math.max(0, Number(e.target.value) || 0))
              }
              placeholder="0"
              className="pf-input"
            />
          </Field>
        </div>
      </div>

      {/* Contact Information */}
      <div className="border-t border-gray-200 dark:border-dark_border pt-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          {t("portfolio.basic.contactInfo")}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <Field label={t("portfolio.basic.email")} icon={<Mail size={14} />}>
            <input
              type="email"
              value={form.contactInfo.email || ""}
              onChange={(e) => setContact("email", e.target.value)}
              placeholder="your.email@example.com"
              className="pf-input"
            />
          </Field>

          <Field label={t("portfolio.basic.phone")} icon={<Phone size={14} />}>
            <input
              type="tel"
              value={form.contactInfo.phone || ""}
              onChange={(e) => setContact("phone", e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="pf-input"
            />
          </Field>

          <div className="md:col-span-2">
            <Field label={t("portfolio.basic.location")} icon={<MapPin size={14} />}>
              <input
                type="text"
                value={form.contactInfo.location || ""}
                onChange={(e) => setContact("location", e.target.value)}
                placeholder="City, Country"
                className="pf-input"
              />
            </Field>
          </div>

        </div>
      </div>
    </div>
  );
}