"use client";
import { useState } from "react";
import {
  Plus, Trash2, Edit3, ExternalLink, Github, Calendar,
  Image, Check, Loader2, Save,
} from "lucide-react";
import * as Select from "@radix-ui/react-select";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ChevronDown } from "lucide-react";
import { PortfolioFormData, Project, ProjectImage } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

interface ProjectsSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

const EMPTY_PROJECT: Project = {
  title: "", description: "", technologies: [],
  demoUrl: "", githubUrl: "", images: [],
  featured: false, startDate: "", endDate: "", status: "completed",
};

function Field({ label, icon, children }: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="pf-group">
      <label className="pf-label">{icon}{label}</label>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ✅ رفع الصورة على Cloudinary عبر /api/upload
───────────────────────────────────────────────────────────────── */
async function uploadImage(file: File, folder = "portfolio-projects"): Promise<string> {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await fetch("/api/upload-image", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Upload failed");
  return data.imageUrl;
}

const techSuggestions = [
  "React", "Next.js", "TypeScript", "Node.js", "Python",
  "MongoDB", "Tailwind CSS", "PostgreSQL", "GraphQL",
];

/* ─────────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────────── */
export default function ProjectsSection({ data, onChange }: ProjectsSectionProps) {
  const { t } = useI18n();

  const [draft, setDraft]           = useState<Project>(EMPTY_PROJECT);
  const [newTech, setNewTech]       = useState("");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editTech, setEditTech]     = useState(""); // input الـ tech الجديد وقت التعديل

  // ✅ uploadingIdx: "draft" لما الـ draft بيترفع، أو رقم الـ project
  const [uploadingIdx, setUploadingIdx] = useState<number | "draft" | null>(null);

  const projects = data.projects || [];

  /* ── إضافة / حذف project ── */
  const addProject = () => {
    if (!draft.title.trim()) return;
    onChange({ projects: [...projects, { ...draft }] });
    setDraft(EMPTY_PROJECT);
  };

  const removeProject = (i: number) => {
    onChange({ projects: projects.filter((_, idx) => idx !== i) });
    if (editingIdx === i) setEditingIdx(null);
  };

  /* ── ✅ تعديل مشروع موجود ── */
  const patchProject = (i: number, field: keyof Project, val: any) => {
    const next = [...projects];
    next[i] = { ...next[i], [field]: val };
    onChange({ projects: next });
  };

  const openEdit = (i: number) => {
    setEditingIdx(editingIdx === i ? null : i);
    setEditTech("");
  };

  const addEditTech = (i: number) => {
    if (!editTech.trim()) return;
    patchProject(i, "technologies", [...projects[i].technologies, editTech.trim()]);
    setEditTech("");
  };

  const removeEditTech = (i: number, ti: number) => {
    patchProject(i, "technologies", projects[i].technologies.filter((_, idx) => idx !== ti));
  };

  /* ── Technologies (draft الجديد) ── */
  const addTech = () => {
    if (!newTech.trim()) return;
    setDraft((p) => ({ ...p, technologies: [...p.technologies, newTech.trim()] }));
    setNewTech("");
  };

  const removeTech = (i: number) =>
    setDraft((p) => ({ ...p, technologies: p.technologies.filter((_, idx) => idx !== i) }));

  /* ── ✅ رفع صورة — Cloudinary مباشرةً بدل base64 ── */
  const handleImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    idx?: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIdx(idx ?? "draft");
    try {
      const url = await uploadImage(file);
      const img: ProjectImage = { url, alt: file.name };

      if (idx !== undefined) {
        const next = [...projects];
        next[idx] = { ...next[idx], images: [...next[idx].images, img] };
        onChange({ projects: next });
      } else {
        setDraft((p) => ({ ...p, images: [...p.images, img] }));
      }
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploadingIdx(null);
      e.target.value = "";
    }
  };

  /* ── حذف صورة ── */
  const removeImage = (pi: number, ii: number) => {
    const next = [...projects];
    next[pi] = { ...next[pi], images: next[pi].images.filter((_, i) => i !== ii) };
    onChange({ projects: next });
  };

  /* ─────────────────────────────────────────────────────────────
     Render
  ───────────────────────────────────────────────────────────── */
  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="space-y-6">

        {/* ══ Add New Project ══════════════════════════════════ */}
        <div className="bg-gray-50 dark:bg-dark_input rounded-xl p-6 space-y-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            {t("portfolio.projects.addNew")}
          </h3>

          {/* Title + Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={t("portfolio.projects.title")}>
              <div className="pf-wrap"><div className="pf-surface">
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                  placeholder={t("portfolio.projects.titlePlaceholder")}
                  className="pf-input"
                />
              </div></div>
            </Field>

            <Field label={t("portfolio.projects.status")}>
              <div className="pf-wrap"><div className="pf-surface">
                <Select.Root
                  value={draft.status}
                  onValueChange={(v) => setDraft((p) => ({ ...p, status: v as Project["status"] }))}
                >
                  <Select.Trigger className="pf-select-trigger" aria-label="Status">
                    <Select.Value />
                    <Select.Icon><ChevronDown className="pf-select-chevron" /></Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="pf-select-content" position="popper" sideOffset={4}>
                      <Select.Viewport className="pf-select-viewport">
                        {[
                          { value: "completed",   label: t("portfolio.projects.status.completed") },
                          { value: "in-progress", label: t("portfolio.projects.status.inProgress") },
                          { value: "planned",     label: t("portfolio.projects.status.planned") },
                        ].map((opt) => (
                          <Select.Item key={opt.value} value={opt.value} className="pf-select-item">
                            <Select.ItemText>
                              <span className={`pf-status pf-status--${opt.value}`}>
                                <span className="pf-status-dot" />
                                {opt.label}
                              </span>
                            </Select.ItemText>
                            <Select.ItemIndicator className="pf-select-item-indicator">
                              <Check size={13} />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div></div>
            </Field>
          </div>

          {/* Description */}
          <Field label={t("portfolio.projects.description")}>
            <div className="pf-wrap"><div className="pf-surface">
              <textarea
                value={draft.description}
                onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                placeholder={t("portfolio.projects.descriptionPlaceholder")}
                className="pf-textarea"
              />
            </div></div>
          </Field>

          {/* Technologies */}
          <Field label={t("portfolio.projects.technologies")}>
            <div className="flex gap-2">
              <div className="pf-wrap flex-1"><div className="pf-surface">
                <input
                  type="text"
                  value={newTech}
                  onChange={(e) => setNewTech(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTech())}
                  placeholder={`${t("portfolio.projects.addTechnology")} (Enter)`}
                  className="pf-input"
                  list="tech-list"
                />
                <datalist id="tech-list">
                  {techSuggestions.map((s) => <option key={s} value={s} />)}
                </datalist>
              </div></div>
              <button
                onClick={addTech}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex-shrink-0"
              >
                {t("common.add")}
              </button>
            </div>
            {draft.technologies.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {draft.technologies.map((tech, i) => (
                  <span key={i} className="pf-tag">
                    {tech}
                    <button onClick={() => removeTech(i)} aria-label={`Remove ${tech}`}>×</button>
                  </span>
                ))}
              </div>
            )}
          </Field>

          {/* GitHub + Demo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={t("portfolio.projects.githubUrl")} icon={<Github size={13} />}>
              <div className="pf-wrap"><div className="pf-surface">
                <input
                  type="url"
                  value={draft.githubUrl}
                  onChange={(e) => setDraft((p) => ({ ...p, githubUrl: e.target.value }))}
                  placeholder="https://github.com/username/repo"
                  className="pf-input"
                />
              </div></div>
            </Field>
            <Field label={t("portfolio.projects.demoUrl")} icon={<ExternalLink size={13} />}>
              <div className="pf-wrap"><div className="pf-surface">
                <input
                  type="url"
                  value={draft.demoUrl}
                  onChange={(e) => setDraft((p) => ({ ...p, demoUrl: e.target.value }))}
                  placeholder="https://your-project.com"
                  className="pf-input"
                />
              </div></div>
            </Field>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={t("portfolio.projects.startDate")} icon={<Calendar size={13} />}>
              <div className="pf-wrap"><div className="pf-surface">
                <input
                  type="date"
                  value={draft.startDate as string}
                  onChange={(e) => setDraft((p) => ({ ...p, startDate: e.target.value }))}
                  className="pf-input"
                />
              </div></div>
            </Field>
            <Field label={t("portfolio.projects.endDate")} icon={<Calendar size={13} />}>
              <div className="pf-wrap"><div className="pf-surface">
                <input
                  type="date"
                  value={draft.endDate as string}
                  onChange={(e) => setDraft((p) => ({ ...p, endDate: e.target.value }))}
                  className="pf-input"
                />
              </div></div>
            </Field>
          </div>

          {/* Featured */}
          <div className="flex items-center gap-3">
            <Checkbox.Root
              id="featured"
              checked={draft.featured}
              onCheckedChange={(v) => setDraft((p) => ({ ...p, featured: !!v }))}
              className="pf-checkbox-root"
            >
              <Checkbox.Indicator className="pf-checkbox-indicator">
                <Check size={11} strokeWidth={3} />
              </Checkbox.Indicator>
            </Checkbox.Root>
            <label htmlFor="featured" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              {t("portfolio.projects.featured")}
            </label>
          </div>

          {/* ✅ Draft image upload */}
          <Field label={t("portfolio.projects.addImage") || "Project Images"} icon={<Image size={13} />}>
            <div className="space-y-2">
              <label className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${uploadingIdx === "draft"
                  ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed pointer-events-none"
                  : "bg-gray-100 dark:bg-dark_input text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {uploadingIdx === "draft"
                  ? <><Loader2 size={13} className="animate-spin" /> Uploading...</>
                  : <><Image size={13} /> {t("portfolio.projects.addImage")}</>
                }
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImage(e)}
                  disabled={uploadingIdx === "draft"}
                  className="hidden"
                />
              </label>

              {draft.images.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {draft.images.map((img, ii) => (
                    <div key={ii} className="relative group">
                      <img
                        src={img.url}
                        alt={img.alt}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-dark_border"
                      />
                      <button
                        onClick={() => setDraft((p) => ({ ...p, images: p.images.filter((_, i) => i !== ii) }))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <button
            onClick={addProject}
            disabled={!draft.title.trim() || uploadingIdx === "draft"}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={15} />
            {t("portfolio.projects.addNew")}
          </button>
        </div>

        {/* ══ Projects List ═════════════════════════════════════ */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            {t("portfolio.projects.yourProjects")} ({projects.length})
          </h3>

          {projects.length === 0 ? (
            <div className="text-center py-10 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-dark_input rounded-xl">
              <Image className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{t("portfolio.projects.noProjects")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {projects.map((project, i) => {
                const isEditing = editingIdx === i;

                return (
                  <div key={i} className="bg-white dark:bg-darkmode border border-gray-200 dark:border-dark_border rounded-xl p-5">

                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 pr-4">
                        {isEditing ? (
                          <div className="pf-wrap mb-2"><div className="pf-surface">
                            <input
                              autoFocus
                              type="text"
                              value={project.title}
                              onChange={(e) => patchProject(i, "title", e.target.value)}
                              className="pf-input py-1.5 font-semibold"
                              placeholder={t("portfolio.projects.titlePlaceholder")}
                            />
                          </div></div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{project.title}</h4>
                            {project.featured && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 font-medium">
                                ★ {t("portfolio.common.featured")}
                              </span>
                            )}
                            <span className={`pf-status pf-status--${project.status}`}>
                              <span className="pf-status-dot" />
                              {t(`portfolio.projects.status.${project.status}`)}
                            </span>
                          </div>
                        )}
                        {!isEditing && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{project.description}</p>
                        )}
                      </div>

                      <div className="flex gap-1 flex-shrink-0">
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <button
                              onClick={() => openEdit(i)}
                              className={`p-2 rounded-lg transition-colors ${
                                isEditing
                                  ? "text-primary bg-primary/10"
                                  : "text-gray-400 hover:text-primary hover:bg-primary/8"
                              }`}
                            >
                              {isEditing ? <Save size={14} /> : <Edit3 size={14} />}
                            </button>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content className="pf-tooltip-content" side="top" sideOffset={4}>
                              {isEditing ? (t("common.done") || "Done") : (t("common.edit") || "Edit")}
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>

                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <button
                              onClick={() => removeProject(i)}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content className="pf-tooltip-content" side="top" sideOffset={4}>Remove</Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      </div>
                    </div>

                    {/* ══ Edit Mode ══════════════════════════════ */}
                    {isEditing ? (
                      <div className="space-y-4 border-t border-gray-100 dark:border-dark_border pt-4 mt-1">

                        {/* Description */}
                        <Field label={t("portfolio.projects.description")}>
                          <div className="pf-wrap"><div className="pf-surface">
                            <textarea
                              value={project.description}
                              onChange={(e) => patchProject(i, "description", e.target.value)}
                              rows={3}
                              placeholder={t("portfolio.projects.descriptionPlaceholder")}
                              className="pf-textarea"
                            />
                          </div></div>
                        </Field>

                        {/* Status */}
                        <Field label={t("portfolio.projects.status")}>
                          <div className="pf-wrap"><div className="pf-surface">
                            <Select.Root
                              value={project.status}
                              onValueChange={(v) => patchProject(i, "status", v as Project["status"])}
                            >
                              <Select.Trigger className="pf-select-trigger" aria-label="Status">
                                <Select.Value />
                                <Select.Icon><ChevronDown className="pf-select-chevron" /></Select.Icon>
                              </Select.Trigger>
                              <Select.Portal>
                                <Select.Content className="pf-select-content" position="popper" sideOffset={4}>
                                  <Select.Viewport className="pf-select-viewport">
                                    {[
                                      { value: "completed",   label: t("portfolio.projects.status.completed") },
                                      { value: "in-progress", label: t("portfolio.projects.status.inProgress") },
                                      { value: "planned",     label: t("portfolio.projects.status.planned") },
                                    ].map((opt) => (
                                      <Select.Item key={opt.value} value={opt.value} className="pf-select-item">
                                        <Select.ItemText>
                                          <span className={`pf-status pf-status--${opt.value}`}>
                                            <span className="pf-status-dot" />
                                            {opt.label}
                                          </span>
                                        </Select.ItemText>
                                        <Select.ItemIndicator className="pf-select-item-indicator">
                                          <Check size={13} />
                                        </Select.ItemIndicator>
                                      </Select.Item>
                                    ))}
                                  </Select.Viewport>
                                </Select.Content>
                              </Select.Portal>
                            </Select.Root>
                          </div></div>
                        </Field>

                        {/* Technologies */}
                        <Field label={t("portfolio.projects.technologies")}>
                          <div className="flex gap-2">
                            <div className="pf-wrap flex-1"><div className="pf-surface">
                              <input
                                type="text"
                                value={editTech}
                                onChange={(e) => setEditTech(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEditTech(i))}
                                placeholder={`${t("portfolio.projects.addTechnology")} (Enter)`}
                                className="pf-input"
                                list="tech-list-edit"
                              />
                              <datalist id="tech-list-edit">
                                {techSuggestions.map((s) => <option key={s} value={s} />)}
                              </datalist>
                            </div></div>
                            <button
                              onClick={() => addEditTech(i)}
                              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex-shrink-0"
                            >
                              {t("common.add")}
                            </button>
                          </div>
                          {project.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {project.technologies.map((tech, ti) => (
                                <span key={ti} className="pf-tag">
                                  {tech}
                                  <button onClick={() => removeEditTech(i, ti)} aria-label={`Remove ${tech}`}>×</button>
                                </span>
                              ))}
                            </div>
                          )}
                        </Field>

                        {/* GitHub + Demo */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Field label={t("portfolio.projects.githubUrl")} icon={<Github size={13} />}>
                            <div className="pf-wrap"><div className="pf-surface">
                              <input
                                type="url"
                                value={project.githubUrl}
                                onChange={(e) => patchProject(i, "githubUrl", e.target.value)}
                                placeholder="https://github.com/username/repo"
                                className="pf-input"
                              />
                            </div></div>
                          </Field>
                          <Field label={t("portfolio.projects.demoUrl")} icon={<ExternalLink size={13} />}>
                            <div className="pf-wrap"><div className="pf-surface">
                              <input
                                type="url"
                                value={project.demoUrl}
                                onChange={(e) => patchProject(i, "demoUrl", e.target.value)}
                                placeholder="https://your-project.com"
                                className="pf-input"
                              />
                            </div></div>
                          </Field>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Field label={t("portfolio.projects.startDate")} icon={<Calendar size={13} />}>
                            <div className="pf-wrap"><div className="pf-surface">
                              <input
                                type="date"
                                value={project.startDate as string}
                                onChange={(e) => patchProject(i, "startDate", e.target.value)}
                                className="pf-input"
                              />
                            </div></div>
                          </Field>
                          <Field label={t("portfolio.projects.endDate")} icon={<Calendar size={13} />}>
                            <div className="pf-wrap"><div className="pf-surface">
                              <input
                                type="date"
                                value={project.endDate as string}
                                onChange={(e) => patchProject(i, "endDate", e.target.value)}
                                className="pf-input"
                              />
                            </div></div>
                          </Field>
                        </div>

                        {/* Featured */}
                        <div className="flex items-center gap-3">
                          <Checkbox.Root
                            id={`featured-${i}`}
                            checked={project.featured}
                            onCheckedChange={(v) => patchProject(i, "featured", !!v)}
                            className="pf-checkbox-root"
                          >
                            <Checkbox.Indicator className="pf-checkbox-indicator">
                              <Check size={11} strokeWidth={3} />
                            </Checkbox.Indicator>
                          </Checkbox.Root>
                          <label htmlFor={`featured-${i}`} className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                            {t("portfolio.projects.featured")}
                          </label>
                        </div>

                        {/* Done button */}
                        <button
                          onClick={() => setEditingIdx(null)}
                          className="w-full bg-primary hover:bg-primary/90 text-white py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <Save size={14} />
                          {t("common.done") || "Done"}
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Technologies */}
                        {project.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {project.technologies.slice(0, 4).map((tech, ti) => (
                              <span key={ti} className="pf-tag" style={{ fontSize: 11 }}>{tech}</span>
                            ))}
                            {project.technologies.length > 4 && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark_input text-gray-500">
                                +{project.technologies.length - 4}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Links */}
                        <div className="flex gap-3 text-xs mb-3">
                          {project.githubUrl && (
                            <a href={project.githubUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors">
                              <Github size={13} /> GitHub
                            </a>
                          )}
                          {project.demoUrl && (
                            <a href={project.demoUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors">
                              <ExternalLink size={13} /> {t("portfolio.projects.demo")}
                            </a>
                          )}
                        </div>
                      </>
                    )}

                    {/* ✅ Project image upload — متاح دايمًا، تعديل أو لأ */}
                    <div className="space-y-2">
                      <label className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                        ${uploadingIdx === i
                          ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed pointer-events-none"
                          : "bg-gray-100 dark:bg-dark_input text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        {uploadingIdx === i
                          ? <><Loader2 size={13} className="animate-spin" /> Uploading...</>
                          : <><Image size={13} /> {t("portfolio.projects.addImage")}</>
                        }
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImage(e, i)}
                          disabled={uploadingIdx === i}
                          className="hidden"
                        />
                      </label>

                      {project.images.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {project.images.map((img, ii) => (
                            <div key={ii} className="relative group">
                              <img
                                src={img.url}
                                alt={img.alt}
                                className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-dark_border"
                              />
                              <button
                                onClick={() => removeImage(i, ii)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Tooltip.Provider>
  );
}