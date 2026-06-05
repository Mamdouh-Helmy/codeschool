"use client";
import { useState } from "react";
import {
  Plus, Trash2, Edit3, ExternalLink, Calendar, Award,
  Building2, Check, Link, Image, X, Loader2,
} from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { PortfolioFormData, Certificate } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

interface CertificatesSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

const EMPTY_CERT: Certificate = {
  title: "",
  description: "",
  image: { url: "", alt: "" },
  issuer: "",
  issueDate: "",
  credentialUrl: "",
};

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="pf-group">
      <label className="pf-label">{icon}{label}</label>
      {children}
    </div>
  );
}

function formatDate(dateStr: string | Date | null): string {
  if (!dateStr) return "";
  return new Date(dateStr as string).toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

function toInputDate(dateStr: string | Date | null): string {
  if (!dateStr) return "";
  return dateStr.toString().split("T")[0];
}

/* ─────────────────────────────────────────────────────────────────
   ✅ دالة الرفع على Cloudinary عبر /api/upload
───────────────────────────────────────────────────────────────── */
async function uploadImage(file: File): Promise<string> {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "portfolio-certificates");

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Upload failed");
  return data.imageUrl; // ✅ URL من Cloudinary
}

/* ─────────────────────────────────────────────────────────────────
   Image Upload Button
───────────────────────────────────────────────────────────────── */
function ImageUploadButton({
  currentUrl,
  onFileChange,
  onRemove,
  uploading = false,
  previewSize = "md",
}: {
  currentUrl: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  uploading?: boolean;
  previewSize?: "sm" | "md";
}) {
  const sizeClass = previewSize === "sm" ? "w-14 h-14" : "w-20 h-20";

  if (uploading) {
    return (
      <div className={`${sizeClass} flex items-center justify-center bg-gray-100 dark:bg-dark_input rounded-lg border border-dashed border-gray-300 dark:border-dark_border`}>
        <Loader2 size={18} className="animate-spin text-primary" />
      </div>
    );
  }

  if (currentUrl) {
    return (
      <div className="flex items-center gap-3">
        <div className="relative group">
          <img
            src={currentUrl}
            alt="certificate"
            className={`${sizeClass} object-cover rounded-lg border border-gray-200 dark:border-dark_border`}
          />
          <button
            type="button"
            onClick={onRemove}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={10} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-dark_input text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs font-medium">
      <Image size={13} />
      Upload Image
      <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
    </label>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────────── */
export default function CertificatesSection({ data, onChange }: CertificatesSectionProps) {
  const { t } = useI18n();

  const [draft, setDraft]               = useState<Certificate>(EMPTY_CERT);
  const [editingIdx, setEditingIdx]     = useState<number | null>(null);
  const [editDraft, setEditDraft]       = useState<Certificate | null>(null);

  // ✅ state لتتبع حالة الرفع
  const [draftUploading, setDraftUploading]   = useState(false);
  const [editUploading, setEditUploading]     = useState(false);

  const certificates: Certificate[] = data.certificates || [];

  /* ── إضافة شهادة ── */
  const addCertificate = () => {
    if (!draft.title.trim()) return;
    onChange({ certificates: [...certificates, { ...draft }] });
    setDraft(EMPTY_CERT);
  };

  /* ── حذف شهادة ── */
  const removeCertificate = (i: number) => {
    onChange({ certificates: certificates.filter((_, idx) => idx !== i) });
    if (editingIdx === i) { setEditingIdx(null); setEditDraft(null); }
  };

  const openEdit  = (i: number) => { setEditingIdx(i); setEditDraft({ ...certificates[i] }); };
  const closeEdit = () => { setEditingIdx(null); setEditDraft(null); };

  const saveEdit = () => {
    if (editingIdx === null || !editDraft) return;
    const next = [...certificates];
    next[editingIdx] = { ...editDraft };
    onChange({ certificates: next });
    closeEdit();
  };

  /* ✅ رفع صورة الـ draft — بترفع على Cloudinary مباشرةً */
  const handleDraftImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDraftUploading(true);
    try {
      const url = await uploadImage(file);
      setDraft((p) => ({ ...p, image: { url, alt: file.name } }));
    } catch (err) {
      console.error("Draft image upload failed:", err);
      alert("Failed to upload image. Please try again.");
    } finally {
      setDraftUploading(false);
      // ✅ reset الـ input عشان تقدر ترفع نفس الصورة مرة تانية لو محتاج
      e.target.value = "";
    }
  };

  /* ✅ رفع صورة الـ edit — بترفع على Cloudinary مباشرةً */
  const handleEditImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editDraft) return;
    setEditUploading(true);
    try {
      const url = await uploadImage(file);
      setEditDraft((p) => p ? { ...p, image: { url, alt: file.name } } : p);
    } catch (err) {
      console.error("Edit image upload failed:", err);
      alert("Failed to upload image. Please try again.");
    } finally {
      setEditUploading(false);
      e.target.value = "";
    }
  };

  /* ─────────────────────────────────────────────────────────────
     Render — نفس الـ UI بالظبط، مش اتغير فيه حاجة غير الـ handlers
  ───────────────────────────────────────────────────────────── */
  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="space-y-6">

        {/* ══ Add Form ══════════════════════════════════════════ */}
        <div className="bg-gray-50 dark:bg-dark_input rounded-xl p-6 space-y-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            {t("portfolio.certificates.addNew") || "Add New Certificate"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={t("portfolio.certificates.title") || "Certificate Title"} icon={<Award size={13} />}>
              <div className="pf-wrap"><div className="pf-surface">
                <input type="text" value={draft.title}
                  onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                  placeholder={t("portfolio.certificates.titlePlaceholder") || "e.g. AWS Certified Developer"}
                  className="pf-input" />
              </div></div>
            </Field>

            <Field label={t("portfolio.certificates.issuer") || "Issuing Organization"} icon={<Building2 size={13} />}>
              <div className="pf-wrap"><div className="pf-surface">
                <input type="text" value={draft.issuer}
                  onChange={(e) => setDraft((p) => ({ ...p, issuer: e.target.value }))}
                  placeholder={t("portfolio.certificates.issuerPlaceholder") || "e.g. Amazon Web Services"}
                  className="pf-input" />
              </div></div>
            </Field>
          </div>

          <Field label={t("portfolio.certificates.description") || "Description"}>
            <div className="pf-wrap"><div className="pf-surface">
              <textarea value={draft.description}
                onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                placeholder={t("portfolio.certificates.descriptionPlaceholder") || "Brief description..."}
                className="pf-textarea" />
            </div></div>
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={t("portfolio.certificates.issueDate") || "Issue Date"} icon={<Calendar size={13} />}>
              <div className="pf-wrap"><div className="pf-surface">
                <input type="date" value={draft.issueDate as string}
                  onChange={(e) => setDraft((p) => ({ ...p, issueDate: e.target.value }))}
                  className="pf-input" />
              </div></div>
            </Field>

            <Field label={t("portfolio.certificates.credentialUrl") || "Credential URL"} icon={<Link size={13} />}>
              <div className="pf-wrap"><div className="pf-surface">
                <input type="url" value={draft.credentialUrl}
                  onChange={(e) => setDraft((p) => ({ ...p, credentialUrl: e.target.value }))}
                  placeholder="https://verify.example.com/cert/..."
                  className="pf-input" />
              </div></div>
            </Field>
          </div>

          <Field label={t("portfolio.certificates.image") || "Certificate Image"} icon={<Image size={13} />}>
            <ImageUploadButton
              currentUrl={draft.image.url}
              onFileChange={handleDraftImage}
              onRemove={() => setDraft((p) => ({ ...p, image: { url: "", alt: "" } }))}
              uploading={draftUploading}
            />
          </Field>

          <button onClick={addCertificate} disabled={!draft.title.trim() || draftUploading}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm">
            <Plus size={15} />
            {t("portfolio.certificates.addNew") || "Add Certificate"}
          </button>
        </div>

        {/* ══ Certificates List ══════════════════════════════════ */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            {t("portfolio.certificates.yourCertificates") || "Your Certificates"} ({certificates.length})
          </h3>

          {certificates.length === 0 ? (
            <div className="text-center py-10 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-dark_input rounded-xl">
              <Award className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{t("portfolio.certificates.noCertificates") || "No certificates added yet"}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {certificates.map((cert, i) => (
                <div key={i} className="bg-white dark:bg-darkmode border border-gray-200 dark:border-dark_border rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex gap-3 flex-1 min-w-0 pr-4">
                      {cert.image?.url && (
                        <img src={cert.image.url} alt={cert.image.alt}
                          className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-dark_border flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-0.5 truncate">{cert.title}</h4>
                        {cert.issuer && (
                          <p className="text-xs text-primary font-medium flex items-center gap-1">
                            <Building2 size={11} />{cert.issuer}
                          </p>
                        )}
                        {cert.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{cert.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <button onClick={() => editingIdx === i ? closeEdit() : openEdit(i)}
                            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/8 transition-colors">
                            <Edit3 size={14} />
                          </button>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content className="pf-tooltip-content" side="top" sideOffset={4}>Edit</Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>

                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <button onClick={() => removeCertificate(i)}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content className="pf-tooltip-content" side="top" sideOffset={4}>Remove</Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {cert.issueDate && (
                      <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <Calendar size={12} />{formatDate(cert.issueDate)}
                      </span>
                    )}
                    {cert.credentialUrl && (
                      <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors">
                        <ExternalLink size={12} />
                        {t("portfolio.certificates.verify") || "Verify Credential"}
                      </a>
                    )}
                  </div>

                  {/* ── Inline edit panel ── */}
                  {editingIdx === i && editDraft && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-dark_border space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label={t("portfolio.certificates.title") || "Certificate Title"}>
                          <div className="pf-wrap"><div className="pf-surface">
                            <input type="text" value={editDraft.title}
                              onChange={(e) => setEditDraft((p) => p ? { ...p, title: e.target.value } : p)}
                              className="pf-input" />
                          </div></div>
                        </Field>

                        <Field label={t("portfolio.certificates.issuer") || "Issuing Organization"}>
                          <div className="pf-wrap"><div className="pf-surface">
                            <input type="text" value={editDraft.issuer}
                              onChange={(e) => setEditDraft((p) => p ? { ...p, issuer: e.target.value } : p)}
                              className="pf-input" />
                          </div></div>
                        </Field>
                      </div>

                      <Field label={t("portfolio.certificates.description") || "Description"}>
                        <div className="pf-wrap"><div className="pf-surface">
                          <textarea value={editDraft.description}
                            onChange={(e) => setEditDraft((p) => p ? { ...p, description: e.target.value } : p)}
                            rows={2} className="pf-textarea" />
                        </div></div>
                      </Field>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label={t("portfolio.certificates.issueDate") || "Issue Date"} icon={<Calendar size={13} />}>
                          <div className="pf-wrap"><div className="pf-surface">
                            <input type="date" value={toInputDate(editDraft.issueDate)}
                              onChange={(e) => setEditDraft((p) => p ? { ...p, issueDate: e.target.value } : p)}
                              className="pf-input" />
                          </div></div>
                        </Field>

                        <Field label={t("portfolio.certificates.credentialUrl") || "Credential URL"} icon={<Link size={13} />}>
                          <div className="pf-wrap"><div className="pf-surface">
                            <input type="url" value={editDraft.credentialUrl}
                              onChange={(e) => setEditDraft((p) => p ? { ...p, credentialUrl: e.target.value } : p)}
                              placeholder="https://..." className="pf-input" />
                          </div></div>
                        </Field>
                      </div>

                      <Field label={t("portfolio.certificates.image") || "Certificate Image"} icon={<Image size={13} />}>
                        <ImageUploadButton
                          currentUrl={editDraft.image?.url ?? ""}
                          onFileChange={handleEditImage}
                          onRemove={() => setEditDraft((p) => p ? { ...p, image: { url: "", alt: "" } } : p)}
                          uploading={editUploading}
                          previewSize="sm"
                        />
                      </Field>

                      <div className="flex items-center gap-2">
                        <button onClick={saveEdit} disabled={editUploading}
                          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                          <Check size={13} />
                          {t("common.save") || "Save Changes"}
                        </button>
                        <button onClick={closeEdit}
                          className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-dark_input text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-xs font-semibold transition-colors">
                          {t("common.cancel") || "Cancel"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Tooltip.Provider>
  );
}