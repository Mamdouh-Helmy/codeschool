// components/portfolio/sections/BasicInfoSection.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import {
  User, Mail, MapPin, Phone, FileText, Briefcase,
  Image as ImageIcon, Loader2, X, FileUp, TrendingUp, GitCommit,
  FileText as PdfIcon, Eye, Download, RefreshCw, Trash2, CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { PortfolioFormData, ContactInfo } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

interface BasicInfoSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
  ownerName?: string;
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

/* ─────────────────────────────────────────────────────────────
   ✅ توليد اسم ملف الـ CV من اسم صاحب البورتفوليو نفسه
───────────────────────────────────────────────────────────── */
function sanitizeForFileName(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_");
}

function buildCvFileName(ownerName?: string): string {
  const safe = ownerName ? sanitizeForFileName(ownerName) : "";
  return safe ? `${safe}-CV.pdf` : "CV.pdf";
}

function formatUploadedLabel(): string {
  const now = new Date();
  return now.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/* ─────────────────────────────────────────────────────────────
   ✅ جلب الملف كـ blob وتحويله لـ object URL. مستخدمة في المعاينة
   وفي التحميل، وده اللي بيتخطى مشكلة Content-Disposition: attachment
   اللي بيرجعها Cloudinary مع الملفات المرفوعة بـ resource_type: raw
   (لو فتحنا اللينك ده مباشرة في iframe أو تاب، المتصفح هيتصرف معاه
   كملف للتحميل مش للعرض؛ لكن لما بنجيبه بـ fetch كـ blob، المشكلة دي
   مبتحصلش لأننا بنعرض الـ blob نفسه مش اللينك الأصلي).
───────────────────────────────────────────────────────────── */
async function fetchCvBlobUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("fetch failed");
  const blob = await res.blob();
  // نتأكد إن الـ blob نوعه PDF عشان المتصفح يعرضه صح جوه iframe
  const pdfBlob = blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
  return URL.createObjectURL(pdfBlob);
}

/* ✅ تحميل الملف باسم مخصص فعليًا */
async function downloadCvAs(url: string, fileName: string): Promise<void> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  } catch (err) {
    console.error("CV download failed, falling back to direct link:", err);
    window.open(url, "_blank");
  }
}

/* ─────────────────────────────────────────────────────────────
   ✅ مودال معاينة الـ CV — بيجيب الملف كـ blob أول ما يفتح (بدل ما
   يحط اللينك الأصلي مباشرة في الـ iframe)، عشان يتعرض جوه الصفحة
   فعلاً بدل ما يتحمّل. لو الجلب فشل (مشكلة شبكة/CORS) بيظهر فولباك
   فيه زرار "افتح في تاب جديد".
───────────────────────────────────────────────────────────── */
function CvPreviewModal({
  url,
  fileName,
  onClose,
  onDownload,
  downloading,
}: {
  url: string;
  fileName: string;
  onClose: () => void;
  onDownload: () => void;
  downloading: boolean;
}) {
  const { t } = useI18n();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");

    fetchCvBlobUrl(url)
      .then((b) => {
        if (cancelled) {
          URL.revokeObjectURL(b);
          return;
        }
        blobUrlRef.current = b;
        setBlobUrl(b);
        setLoadState("ready");
      })
      .catch((err) => {
        console.error("CV preview fetch failed:", err);
        if (!cancelled) setLoadState("error");
      });

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [url]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 md:p-8"
      onClick={onClose}
    >
      <style>{`
        @keyframes pb-cv-pop { from { opacity: 0; transform: scale(.96) translateY(6px);} to { opacity:1; transform: scale(1) translateY(0);} }
      `}</style>
      <div
        className="relative w-full max-w-3xl h-[88vh] bg-white dark:bg-darklight rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ animation: "pb-cv-pop .18s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-dark_border flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-9 rounded-md bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-center justify-center flex-shrink-0">
              <PdfIcon size={16} className="text-red-500" />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {fileName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={onDownload}
              disabled={downloading}
              title={t("portfolio.basic.downloadCv") || "تحميل"}
              className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/8 transition-colors disabled:opacity-50"
            >
              {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title={t("common.close") || "إغلاق"}
              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-gray-100 dark:bg-darkmode min-h-0 relative">
          {loadState === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
              <Loader2 size={26} className="animate-spin text-primary" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t("portfolio.basic.loadingCv") || "بيجيب الملف…"}
              </span>
            </div>
          )}

          {loadState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <AlertTriangle size={26} className="text-red-500" />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t("portfolio.basic.previewFailed") || "مقدرناش نعرض الملف هنا."}
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary underline"
              >
                {t("portfolio.builder.openInNewTab") || "افتح في تاب جديد"}
              </a>
            </div>
          )}

          {loadState === "ready" && blobUrl && (
            <iframe src={blobUrl} className="w-full h-full border-none" title="CV Preview" />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ✅ كارت عرض الـ CV بعد الرفع
───────────────────────────────────────────────────────────── */
function CvCard({
  fileName,
  onPreview,
  onReplace,
  onRemove,
  onDownload,
  replacing,
  downloading,
}: {
  fileName: string;
  onPreview: () => void;
  onReplace: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  onDownload: () => void;
  replacing: boolean;
  downloading: boolean;
}) {
  const { t } = useI18n();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!confirmingDelete) return;
    const timer = setTimeout(() => setConfirmingDelete(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmingDelete]);

  const handleDeleteClick = () => {
    if (confirmingDelete) {
      setConfirmingDelete(false);
      onRemove();
    } else {
      setConfirmingDelete(true);
    }
  };

  return (
    <div className="relative flex items-center gap-3.5 p-4 rounded-xl border border-gray-200 dark:border-dark_border bg-white dark:bg-darkmode overflow-hidden group">
      <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary/70" />

      <button
        type="button"
        onClick={onPreview}
        title={t("portfolio.basic.viewCv") || "معاينة"}
        className="relative flex-shrink-0 w-12 h-14 rounded-md bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-center justify-center cursor-pointer hover:brightness-95 transition"
      >
        <PdfIcon size={22} className="text-red-500" />
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-bold tracking-wide text-white bg-red-500 px-1.5 py-[1px] rounded">
          PDF
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {fileName}
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
          <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
          {t("portfolio.basic.cvUploaded") || "تم الرفع"} · {formatUploadedLabel()}
        </p>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={onPreview}
          title={t("portfolio.basic.viewCv") || "معاينة"}
          className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/8 transition-colors"
        >
          <Eye size={15} />
        </button>

        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          title={t("portfolio.basic.downloadCv") || "تحميل"}
          className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/8 transition-colors disabled:opacity-50"
        >
          {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        </button>

        <label
          title={t("portfolio.basic.replaceCv") || "استبدال"}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${replacing
              ? "text-gray-300 pointer-events-none"
              : "text-gray-400 hover:text-primary hover:bg-primary/8"
            }`}
        >
          {replacing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          <input
            type="file"
            accept="application/pdf"
            onChange={onReplace}
            disabled={replacing}
            className="hidden"
          />
        </label>

        <button
          type="button"
          onClick={handleDeleteClick}
          title={
            confirmingDelete
              ? t("portfolio.basic.confirmRemove") || "متأكد؟ دوس تاني للحذف"
              : t("common.remove") || "حذف"
          }
          className={
            "p-2 rounded-lg transition-colors " +
            (confirmingDelete
              ? "text-white bg-red-500 hover:bg-red-600"
              : "text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20")
          }
        >
          {confirmingDelete ? <AlertTriangle size={15} /> : <Trash2 size={15} />}
        </button>
      </div>
    </div>
  );
}

export default function BasicInfoSection({ data, onChange, ownerName }: BasicInfoSectionProps) {
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

  const [showCvPreview, setShowCvPreview] = useState(false);
  const [downloadingCv, setDownloadingCv] = useState(false);

  const cvFileName = buildCvFileName(ownerName);

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

  const handleDownloadCv = async () => {
    if (!form.cvUrl) return;
    setDownloadingCv(true);
    await downloadCvAs(form.cvUrl, cvFileName);
    setDownloadingCv(false);
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

      {/* ✅ CV Upload */}
      <div className="pf-group">
        <label className="pf-label">
          <FileUp size={14} />
          {t("portfolio.basic.cv") || "CV / Resume (PDF)"}
        </label>

        {form.cvUrl ? (
          <CvCard
            fileName={cvFileName}
            onPreview={() => setShowCvPreview(true)}
            onReplace={handleCvChange}
            onRemove={() => set("cvUrl", "")}
            onDownload={handleDownloadCv}
            replacing={uploadingCv}
            downloading={downloadingCv}
          />
        ) : uploadingCv ? (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-gray-300 dark:border-dark_border bg-gray-50 dark:bg-dark_input">
            <Loader2 size={18} className="animate-spin text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {t("portfolio.basic.uploadingCv") || "Uploading..."}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {t("portfolio.basic.uploadingCvHint") || "برجاء الانتظار لحظات"}
              </p>
            </div>
          </div>
        ) : (
          <label className="flex items-center gap-3.5 p-4 rounded-xl border border-dashed border-gray-300 dark:border-dark_border bg-gray-50 dark:bg-dark_input cursor-pointer hover:border-primary hover:bg-primary/[0.04] transition-colors group">
            <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white dark:bg-darkmode border border-gray-200 dark:border-dark_border flex items-center justify-center group-hover:border-primary/40 transition-colors">
              <FileUp size={18} className="text-gray-400 group-hover:text-primary transition-colors" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {t("portfolio.basic.uploadCv") || "Upload CV (PDF)"}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {t("portfolio.basic.cvHint") || "PDF فقط، حتى 10 ميجا"}
              </p>
            </div>
            <input type="file" accept="application/pdf" onChange={handleCvChange} className="hidden" />
          </label>
        )}
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

      {/* ✅ Stats */}
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

      {/* ✅ مودال معاينة الـ CV */}
      {showCvPreview && form.cvUrl && (
        <CvPreviewModal
          url={form.cvUrl}
          fileName={cvFileName}
          onClose={() => setShowCvPreview(false)}
          onDownload={handleDownloadCv}
          downloading={downloadingCv}
        />
      )}
    </div>
  );
}