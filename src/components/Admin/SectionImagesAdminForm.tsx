"use client";
import { useState, useRef } from "react";
import {
  Upload, Save, X, Eye, EyeOff, FileText, Trash2,
  CheckCircle, AlertCircle, Loader2, ImageIcon,
  Link as LinkIcon, Edit3, Crop, RotateCw, SlidersHorizontal,
  Ticket, CalendarDays,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Props {
  initial?: any;
  onClose: () => void;
  onSaved: () => void;
}

type UploadState = "idle" | "uploading" | "success" | "error";
type ActiveTab   = "empty" | "uploading" | "success";

const SECTIONS = [
  {
    value: "ticket-section",
    label: "Ticket Section",
    desc:  "Main ticket display area · Order #1",
    icon:  <Ticket className="w-4 h-4" />,
  },
  {
    value: "event-ticket",
    label: "Event Ticket",
    desc:  "Event ticket listing page · Order #2",
    icon:  <CalendarDays className="w-4 h-4" />,
  },
];

// ─────────────────────────────────────────────
// Progress bar (uploading state)
// ─────────────────────────────────────────────
function UploadProgress({ fileName, progress }: { fileName: string; progress: number }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 py-10">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
          <ImageIcon className="w-7 h-7 text-gray-300 dark:text-gray-600" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md">
          <Upload className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          Uploading {fileName}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          ~3 seconds remaining
        </p>
      </div>

      <div className="w-full max-w-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-primary">Uploading...</span>
          <span className="text-gray-500">{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span className="w-1 h-1 rounded-full bg-primary inline-block" />
          Processing image metadata...
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Drop zone (empty state)
// ─────────────────────────────────────────────
function DropZone({
  onFileSelect, onUrlPaste,
}: {
  onFileSelect: (f: File) => void;
  onUrlPaste:  () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f?.type.startsWith("image/")) onFileSelect(f);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center h-full gap-5 py-10 border-2 border-dashed rounded-2xl m-4 transition-all duration-200
        ${dragging
          ? "border-primary bg-orange-50/60 dark:bg-orange-950/10"
          : "border-gray-200 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-800/20"}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/30 flex items-center justify-center">
        <Upload className="w-7 h-7 text-primary" />
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Drop your image here
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          PNG, JPG, WebP, AVIF · Max 10 MB · Min 1200px wide
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 bg-primary hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Browse Files
        </button>
        <button
          type="button"
          onClick={onUrlPaste}
          className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          Paste URL
        </button>
      </div>

      <div className="flex items-center gap-5 text-xs text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="text-[10px]">🔒</span> Secure upload
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-[10px]">⚡</span> CDN optimized
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-[10px]">🗜️</span> Auto-compress
        </span>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) onFileSelect(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Success preview
// ─────────────────────────────────────────────
function SuccessPreview({
  imageUrl, imageAlt, onReplace,
}: {
  imageUrl: string;
  imageAlt: string;
  onReplace: () => void;
}) {
  return (
    <div className="relative flex flex-col h-full">
      {/* Upload complete badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-secondary text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-md">
        <CheckCircle className="w-3.5 h-3.5" />
        Upload complete
      </div>

      {/* Image */}
      <div className="flex-1 relative overflow-hidden rounded-t-xl bg-gray-100 dark:bg-gray-800 min-h-[220px]">
        <img
          src={imageUrl}
          alt={imageAlt || "Preview"}
          className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </div>

      {/* Image tools bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-1">
          {[
            { icon: <Crop className="w-3.5 h-3.5" />,            label: "Crop" },
            { icon: <RotateCw className="w-3.5 h-3.5" />,        label: "Rotate" },
            { icon: <SlidersHorizontal className="w-3.5 h-3.5" />, label: "Adjust" },
          ].map(a => (
            <button
              key={a.label}
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-secondary font-medium">
          <CheckCircle className="w-3 h-3" />
          Optimized for web
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Meta bar (bottom strip)
// ─────────────────────────────────────────────
function MetaBar({
  fileName, dimensions, size, aspect, uploaded, isActive,
}: {
  fileName: string; dimensions: string; size: string;
  aspect: string; uploaded: string; isActive: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 text-[11px] text-gray-400 dark:text-gray-500 gap-2 flex-wrap">
      <div className="flex items-center gap-4 flex-wrap">
        {fileName && <span><strong className="text-gray-600 dark:text-gray-300 uppercase text-[10px] tracking-wide">Format</strong> <span className="ml-1.5 font-semibold text-gray-700 dark:text-gray-200">{fileName}</span></span>}
        {dimensions && <span><strong className="text-gray-600 dark:text-gray-300 uppercase text-[10px] tracking-wide">Dimensions</strong> <span className="ml-1.5 font-semibold text-gray-700 dark:text-gray-200">{dimensions}</span></span>}
        {size && <span><strong className="text-gray-600 dark:text-gray-300 uppercase text-[10px] tracking-wide">Size</strong> <span className="ml-1.5 font-semibold text-gray-700 dark:text-gray-200">{size}</span></span>}
        {aspect && <span><strong className="text-gray-600 dark:text-gray-300 uppercase text-[10px] tracking-wide">Aspect</strong> <span className="ml-1.5 font-semibold text-gray-700 dark:text-gray-200">{aspect}</span></span>}
        {uploaded && <span><strong className="text-gray-600 dark:text-gray-300 uppercase text-[10px] tracking-wide">Uploaded</strong> <span className="ml-1.5 font-semibold text-gray-700 dark:text-gray-200">{uploaded}</span></span>}
      </div>
      {(dimensions || size) && (
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
          isActive
            ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300"
            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-400"
        }`}>
          {isActive ? "Active" : "Inactive"}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function SectionImagesAdminForm({ initial, onClose, onSaved }: Props) {
  const { t }     = useI18n();
  const isEditing = !!initial?._id;

  const [form, setForm] = useState({
    sectionName: initial?.sectionName || "",
    imageUrl:    initial?.imageUrl    || "",
    imageAlt:    initial?.imageAlt    || "",
    description: initial?.description || "",
    isActive:    initial?.isActive    ?? true,
  });

  const [uploadState,  setUploadState]  = useState<UploadState>("idle");
  const [uploadProgress, setProgress]  = useState(0);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; dims: string } | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Derive active tab from upload state
  const activeTab: ActiveTab =
    uploadState === "uploading" ? "uploading" :
    (uploadState === "success" || (form.imageUrl && uploadState === "idle" && isEditing)) ? "success" :
    "empty";

  const set = (field: string, value: any) =>
    setForm(p => ({ ...p, [field]: value }));

  // ── Upload ──
  const uploadFile = async (file: File) => {
    setUploadState("uploading");
    setUploadedFile({ name: file.name, size: `${(file.size / 1_048_576).toFixed(1)} MB`, dims: "" });

    // Simulate progress
    let prog = 0;
    const tick = setInterval(() => {
      prog = Math.min(prog + Math.random() * 15, 95);
      setProgress(Math.floor(prog));
    }, 200);

    const preview = URL.createObjectURL(file);
    set("imageUrl", preview);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "section-images");

      const res    = await fetch("/api/upload-image", { method: "POST", body: fd });
      const result = await res.json();

      clearInterval(tick);
      setProgress(100);

      if (result.success && result.imageUrl) {
        set("imageUrl", result.imageUrl);
        if (!form.imageAlt) set("imageAlt", file.name.replace(/\.[^.]+$/, ""));
        setUploadState("success");
      } else {
        throw new Error(result.message || "Upload failed");
      }
    } catch (err: any) {
      clearInterval(tick);
      setUploadState("error");
      setError(err.message || "Failed to upload image");
      setTimeout(() => setUploadState("idle"), 3000);
    } finally {
      URL.revokeObjectURL(preview);
    }
  };

  // ── Save ──
  const handleSubmit = async () => {
    setError("");
    if (!form.sectionName)           return setError("Please choose a section.");
    if (!form.imageUrl)              return setError("Please upload or paste an image URL.");
    if (!form.imageAlt)              return setError("Alt text is required for accessibility.");
    if (uploadState === "uploading") return setError("Please wait for the upload to finish.");

    setSaving(true);
    try {
      const method  = isEditing ? "PUT" : "POST";
      const payload = isEditing ? { id: initial._id, ...form } : form;
      const res     = await fetch("/api/section-images", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (res.ok && result.success) { onSaved(); onClose(); }
      else setError(result.message || "Failed to save.");
    } catch (err: any) {
      setError(err.message || "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  const isBusy   = saving || uploadState === "uploading";
  const hasUnsaved = form.imageUrl || form.imageAlt || form.description || form.sectionName;

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl" style={{ maxHeight: "92vh" }}>

      {/* ── Top header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <Edit3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight">
              {isEditing ? "Edit Image Asset" : "Add Image Asset"}
            </h2>
            {uploadedFile && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {uploadedFile.name} · {uploadedFile.size} · {uploadedFile.dims || "3840 × 2160px"}
              </p>
            )}
          </div>
        </div>

        {/* State tabs */}
        <div className="flex items-center gap-2">
          {(["empty", "uploading", "success"] as ActiveTab[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                if (tab === "empty") { setUploadState("idle"); set("imageUrl", ""); }
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? tab === "success"
                    ? "bg-secondary text-white"
                    : "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="ml-2 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Two-panel body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left panel — image area */}
        <div className="flex flex-col flex-1 border-r border-gray-100 dark:border-gray-800 min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0">
            {activeTab === "empty" && (
              <DropZone
                onFileSelect={uploadFile}
                onUrlPaste={() => setShowUrlInput(true)}
              />
            )}
            {activeTab === "uploading" && (
              <UploadProgress
                fileName={uploadedFile?.name || "image.jpg"}
                progress={uploadProgress}
              />
            )}
            {activeTab === "success" && (
              <SuccessPreview
                imageUrl={form.imageUrl}
                imageAlt={form.imageAlt}
                onReplace={() => { setUploadState("idle"); set("imageUrl", ""); }}
              />
            )}
          </div>

          {/* URL paste input (if needed) */}
          {showUrlInput && activeTab === "empty" && (
            <div className="px-4 pb-3 flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={e => set("imageUrl", e.target.value)}
                  placeholder="https://res.cloudinary.com/..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={() => { if (form.imageUrl) setUploadState("success"); setShowUrlInput(false); }}
                className="px-3 py-2 text-xs font-semibold bg-primary text-white rounded-xl"
              >
                Use URL
              </button>
            </div>
          )}

          {/* Meta bar */}
          <MetaBar
            fileName="WebP"
            dimensions={activeTab !== "empty" ? "3840 × 2160" : ""}
            size={activeTab !== "empty" ? "2.4 MB" : ""}
            aspect={activeTab !== "empty" ? "16 : 9" : ""}
            uploaded={activeTab !== "empty" ? "Jun 1, 2025" : ""}
            isActive={form.isActive}
          />

          {/* Footer actions */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-4 text-xs">
              {hasUnsaved && (
                <span className="flex items-center gap-1.5 text-primary font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Unsaved changes
                </span>
              )}
              {isEditing && (
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Asset
                </button>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isBusy}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Discard
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isBusy}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                ) : (
                  <><Save className="w-3.5 h-3.5" />Save Changes</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right panel — form fields */}
        <div className="w-[360px] flex-shrink-0 flex flex-col overflow-y-auto bg-white dark:bg-gray-900">
          <div className="p-5 space-y-5">

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 rounded-xl px-3.5 py-3 text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Alt Text */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 block">
                  Alt Text <span className="text-red-400">*</span>
                </label>
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                  {form.imageAlt.length}/125
                </span>
              </div>
              <input
                type="text"
                value={form.imageAlt}
                onChange={e => set("imageAlt", e.target.value.slice(0, 125))}
                placeholder="Modern hero banner with gradient teal blue..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                For screen readers and SEO. Be descriptive.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 block">
                  Description
                </label>
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                  {form.description.length}/300
                </span>
              </div>
              <textarea
                value={form.description}
                onChange={e => set("description", e.target.value.slice(0, 300))}
                rows={3}
                placeholder="Primary hero banner background image used across the main landing page..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition-all"
              />
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Internal note. Not shown publicly.
              </p>
            </div>

            {/* Section Assignment */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 block">
                  Section Assignment
                </label>
                <span className="text-[11px] font-semibold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                  {form.sectionName ? "1 selected" : "0 selected"}
                </span>
              </div>
              <div className="space-y-2">
                {SECTIONS.map(s => {
                  const selected = form.sectionName === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => set("sectionName", s.value)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all duration-150 ${
                        selected
                          ? "border-secondary bg-secondary/5 dark:bg-secondary/10"
                          : "border-gray-150 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          selected ? "bg-secondary/10 text-secondary" : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                        }`}>
                          {s.icon}
                        </div>
                        <div>
                          <p className={`text-sm font-semibold leading-tight ${selected ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>
                            {s.label}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {s.desc}
                          </p>
                        </div>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full border-2 transition-colors ${
                        selected ? "bg-secondary border-secondary" : "border-gray-300 dark:border-gray-600"
                      }`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visibility Status */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 block">
                Visibility Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: true,  label: "Active",   icon: <Eye className="w-3.5 h-3.5" /> },
                  { val: false, label: "Inactive", icon: <EyeOff className="w-3.5 h-3.5" /> },
                ].map(o => (
                  <button
                    key={String(o.val)}
                    type="button"
                    onClick={() => set("isActive", o.val)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      form.isActive === o.val
                        ? o.val
                          ? "border-secondary bg-secondary/5 text-secondary dark:bg-secondary/10"
                          : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                        : "border-gray-150 dark:border-gray-700 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 hover:border-gray-300"
                    }`}
                  >
                    {o.icon}
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}