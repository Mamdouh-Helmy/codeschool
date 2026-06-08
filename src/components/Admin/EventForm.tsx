"use client";
import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  User,
  Image,
  Link,
  Users,
  Tag,
  X,
  Save,
  Rocket,
  Upload,
  Plus,
  Trash2,
  Globe,
  MapPin,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import toast from "react-hot-toast";

interface Props {
  initial?: any;
  onClose: () => void;
  onSaved: () => void;
}

interface Speaker {
  name: string;
  role: string;
  image: string;
}

// ─── Helper: رفع صورة عبر FormData → Cloudinary ─────────────────────────────
async function uploadImage(file: File, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  const res = await fetch("/api/upload-image", { method: "POST", body: formData });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Upload failed");
  return data.imageUrl;
}

// ─── Image Upload Zone Component ─────────────────────────────────────────────
interface ImageUploadZoneProps {
  label: string;
  value: string;
  preview: string;
  uploading: boolean;
  disabled?: boolean;
  folder: string;
  accept?: string;
  maxSizeMB?: number;
  shape?: "rect" | "circle";
  onUploadStart: () => void;
  onUploadSuccess: (url: string) => void;
  onUploadError: (fallback: string) => void;
  onRemove: () => void;
  onUrlChange: (url: string) => void;
  urlPlaceholder?: string;
}

function ImageUploadZone({
  label,
  value,
  preview,
  uploading,
  disabled = false,
  folder,
  accept = "image/jpeg,image/jpg,image/png,image/webp",
  maxSizeMB = 5,
  shape = "rect",
  onUploadStart,
  onUploadSuccess,
  onUploadError,
  onRemove,
  onUrlChange,
  urlPlaceholder = "https://...",
}: ImageUploadZoneProps) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`حجم الملف كبير جداً. الحد الأقصى ${maxSizeMB}MB`);
      return;
    }
    onUploadStart();
    try {
      const url = await uploadImage(file, folder);
      onUploadSuccess(url);
    } catch (err: any) {
      toast.error(`خطأ في رفع الصورة: ${err.message}`);
      onUploadError(value);
    } finally {
      e.target.value = "";
    }
  };

  const isCircle = shape === "circle";

  return (
    <div className="space-y-3">
      <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
        <Image className="w-3 h-3 text-primary" />
        {label}
      </label>

      <div className={`flex gap-4 items-start ${isCircle ? "flex-col sm:flex-row" : ""}`}>
        {/* Preview */}
        {preview && (
          <div
            className={`relative shrink-0 border-2 border-PowderBlueBorder dark:border-dark_border overflow-hidden bg-IcyBreeze dark:bg-dark_input group ${
              isCircle ? "w-20 h-20 rounded-full" : "w-24 h-24 rounded-xl"
            }`}
          >
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            )}
            {!uploading && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <label className={`cursor-pointer p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <Upload className="w-4 h-4 text-white" />
                  <input type="file" accept={accept} onChange={handleFileChange} disabled={disabled} className="hidden" />
                </label>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex-1 space-y-2">
          {/* URL Input */}
          <input
            type="text"
            value={value}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder={urlPlaceholder}
            disabled={uploading}
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200 disabled:opacity-60"
          />

          {/* Upload / Remove Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Upload button */}
            <label
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-12 font-medium transition-all duration-200 cursor-pointer select-none ${
                uploading || disabled
                  ? "bg-primary/10 text-primary opacity-60 cursor-not-allowed"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  جاري الرفع...
                </>
              ) : (
                <>
                  <Upload className="w-3 h-3" />
                  رفع صورة
                </>
              )}
              <input
                type="file"
                accept={accept}
                onChange={handleFileChange}
                disabled={uploading || disabled}
                className="hidden"
              />
            </label>

            {/* Remove button */}
            {preview && !uploading && (
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-12 font-medium hover:bg-red-500/20 transition-all duration-200"
              >
                <Trash2 className="w-3 h-3" />
                حذف
              </button>
            )}

            {/* Uploaded indicator */}
            {preview && !uploading && value.includes("cloudinary") && (
              <span className="inline-flex items-center gap-1 text-11 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                تم الرفع
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Empty dropzone when no preview */}
      {!preview && (
        <label
          className={`flex flex-col items-center justify-center gap-2 w-full h-28 border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer ${
            uploading || disabled
              ? "border-primary/30 bg-primary/5 cursor-not-allowed"
              : "border-PowderBlueBorder dark:border-dark_border hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="text-12 text-primary font-medium">جاري الرفع...</p>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <p className="text-12 text-SlateBlueText dark:text-darktext">
                اسحب وأفلت أو <span className="text-primary font-medium">اختر ملفاً</span>
              </p>
              <p className="text-11 text-SlateBlueText/70 dark:text-darktext/70">
                Max {maxSizeMB}MB • JPEG, PNG, WebP
              </p>
            </>
          )}
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={uploading || disabled}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EventForm({ initial, onClose, onSaved }: Props) {
  const { t } = useI18n();

  const formatDateTimeForInput = (dateTimeString: string) => {
    if (!dateTimeString) return "";
    try {
      return new Date(dateTimeString).toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  const [form, setForm] = useState(() => ({
    title: initial?.title || "",
    description: initial?.description || "",
    date: initial?.date || "",
    time: initial?.time || "",
    location: initial?.location || "",
    image: initial?.image || "",
    instructor: initial?.instructor || "",
    instructorImage: initial?.instructorImage || "",
    crmRegistrationUrl: initial?.crmRegistrationUrl || "",
    maxAttendees: initial?.maxAttendees || 100,
    currentAttendees: initial?.currentAttendees || 0,
    tags: initial?.tags || [],
    speakers: initial?.speakers || [],
    registrationStart: formatDateTimeForInput(initial?.registrationStart),
    registrationEnd: formatDateTimeForInput(initial?.registrationEnd),
    isActive: initial?.isActive ?? true,
  }));

  const [tags, setTags] = useState<string[]>(initial?.tags || []);
  const [newTagInput, setNewTagInput] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Image state ──
  const [eventImagePreview, setEventImagePreview] = useState(initial?.image || "");
  const [instructorImagePreview, setInstructorImagePreview] = useState(initial?.instructorImage || "");
  const [uploadingEventImage, setUploadingEventImage] = useState(false);
  const [uploadingInstructorImage, setUploadingInstructorImage] = useState(false);

  // ── Speaker state ──
  const [speakers, setSpeakers] = useState<Speaker[]>(initial?.speakers || []);
  const [newSpeaker, setNewSpeaker] = useState<Speaker>({ name: "", role: "", image: "" });
  const [speakerImagePreview, setSpeakerImagePreview] = useState("");
  const [uploadingSpeakerImage, setUploadingSpeakerImage] = useState(false);

  const isUploading = uploadingEventImage || uploadingInstructorImage || uploadingSpeakerImage;
  const isDisabled = loading || isUploading;

  const onChange = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ── Tags ──
  const addTag = () => {
    const tag = newTagInput.trim();
    if (tag && !tags.includes(tag)) {
      const next = [...tags, tag];
      setTags(next);
      setNewTagInput("");
      onChange("tags", next);
    }
  };
  const removeTag = (index: number) => {
    const next = tags.filter((_, i) => i !== index);
    setTags(next);
    onChange("tags", next);
  };
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); addTag(); }
  };

  // ── Speakers ──
  const addSpeaker = () => {
    if (newSpeaker.name.trim()) {
      const next = [...speakers, { ...newSpeaker }];
      setSpeakers(next);
      onChange("speakers", next);
      setNewSpeaker({ name: "", role: "", image: "" });
      setSpeakerImagePreview("");
    }
  };
  const removeSpeaker = (index: number) => {
    const next = speakers.filter((_, i) => i !== index);
    setSpeakers(next);
    onChange("speakers", next);
  };

  // ── Submit ──
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parseDateTimeToISO = (s: string) => {
        if (!s) return "";
        try { return new Date(s).toISOString(); } catch { return ""; }
      };

      const payload = {
        ...form,
        registrationStart: parseDateTimeToISO(form.registrationStart),
        registrationEnd: parseDateTimeToISO(form.registrationEnd),
        tags,
        speakers,
      };

      const eventId = initial?._id || initial?.id;
      const method = eventId ? "PUT" : "POST";
      const url = eventId
        ? `/api/events?id=${encodeURIComponent(eventId)}`
        : "/api/events";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = `HTTP error! status: ${res.status}`;
        try { const d = await res.json(); msg = d.message || msg; } catch {}
        throw new Error(msg);
      }

      const result = await res.json();
      if (result.success) {
        onSaved();
        onClose();
        toast.success(t("events.savedSuccess"));
      } else {
        throw new Error(result.message || "Operation failed");
      }
    } catch (err: any) {
      toast.error(t("common.error") + ": " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={submit} className="space-y-6">

      {/* ── 1. Basic Information ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader
          icon={<Calendar className="w-4 h-4 text-primary" />}
          iconBg="bg-primary/10"
          title={t("eventForm.basicInfo")}
          desc={t("eventForm.basicInfoDescription")}
        />

        <div className="grid md:grid-cols-2 gap-4">
          <FormField label={`${t("eventForm.eventTitle")} *`} icon={<Calendar className="w-3 h-3 text-primary" />}>
            <input
              type="text"
              value={form.title}
              onChange={(e) => onChange("title", e.target.value)}
              placeholder={t("eventForm.titlePlaceholder")}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              required
            />
          </FormField>

          <FormField label={`${t("eventForm.mainInstructor")} *`} icon={<User className="w-3 h-3 text-primary" />}>
            <input
              type="text"
              value={form.instructor}
              onChange={(e) => onChange("instructor", e.target.value)}
              placeholder={t("eventForm.instructorPlaceholder")}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              required
            />
          </FormField>
        </div>

        <FormField label={`${t("eventForm.description")} *`} icon={<Calendar className="w-3 h-3 text-primary" />}>
          <textarea
            value={form.description}
            onChange={(e) => onChange("description", e.target.value)}
            rows={3}
            placeholder={t("eventForm.descriptionPlaceholder")}
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 resize-none transition-all duration-200"
            required
          />
        </FormField>

        <FormField label={t("eventForm.location")} icon={<MapPin className="w-3 h-3 text-primary" />}>
          <input
            type="text"
            value={form.location}
            onChange={(e) => onChange("location", e.target.value)}
            placeholder={t("eventForm.locationPlaceholder")}
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
          />
        </FormField>

        {/* Event Cover Image */}
        <ImageUploadZone
          label={t("eventForm.coverImage")}
          value={form.image}
          preview={eventImagePreview}
          uploading={uploadingEventImage}
          disabled={isDisabled}
          folder="event-covers"
          maxSizeMB={5}
          urlPlaceholder={t("eventForm.imagePlaceholder")}
          onUploadStart={() => setUploadingEventImage(true)}
          onUploadSuccess={(url) => {
            onChange("image", url);
            setEventImagePreview(url);
            setUploadingEventImage(false);
          }}
          onUploadError={(fallback) => {
            onChange("image", fallback);
            setEventImagePreview(fallback);
            setUploadingEventImage(false);
          }}
          onRemove={() => {
            onChange("image", "");
            setEventImagePreview("");
          }}
          onUrlChange={(url) => {
            onChange("image", url);
            setEventImagePreview(url);
          }}
        />
      </div>

      {/* ── 2. Schedule & Timing ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader
          icon={<Clock className="w-4 h-4 text-Aquamarine" />}
          iconBg="bg-Aquamarine/10"
          title={t("eventForm.scheduleTiming")}
          desc={t("eventForm.scheduleDescription")}
        />

        <div className="grid md:grid-cols-2 gap-4">
          <FormField label={`${t("eventForm.date")} *`} icon={<Calendar className="w-3 h-3 text-Aquamarine" />}>
            <input
              type="date"
              value={form.date}
              onChange={(e) => onChange("date", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              required
            />
          </FormField>
          <FormField label={`${t("eventForm.time")} *`} icon={<Clock className="w-3 h-3 text-Aquamarine" />}>
            <input
              type="time"
              value={form.time}
              onChange={(e) => onChange("time", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              required
            />
          </FormField>
        </div>

        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
          <FormField label={t("eventForm.registrationStart")}>
            <input
              type="datetime-local"
              value={form.registrationStart}
              onChange={(e) => onChange("registrationStart", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </FormField>
          <FormField label={t("eventForm.registrationEnd")}>
            <input
              type="datetime-local"
              value={form.registrationEnd}
              onChange={(e) => onChange("registrationEnd", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </FormField>
        </div>
      </div>

      {/* ── 3. Speakers ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader
          icon={<Users className="w-4 h-4 text-ElectricAqua" />}
          iconBg="bg-ElectricAqua/10"
          title={t("eventForm.speakers")}
          desc={t("eventForm.speakersDescription")}
        />

        {/* Add New Speaker */}
        <div className="space-y-4 p-4 bg-IcyBreeze dark:bg-dark_input rounded-xl border border-PowderBlueBorder/50 dark:border-dark_border/50">
          <h4 className="text-13 font-semibold text-MidnightNavyText dark:text-white">
            {t("eventForm.addNewSpeaker")}
          </h4>

          <div className="grid md:grid-cols-2 gap-3">
            <input
              type="text"
              value={newSpeaker.name}
              onChange={(e) => setNewSpeaker((p) => ({ ...p, name: e.target.value }))}
              placeholder={t("eventForm.speakerNamePlaceholder")}
              className="px-3 py-2 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary dark:bg-darkmode dark:text-white text-13"
            />
            <input
              type="text"
              value={newSpeaker.role}
              onChange={(e) => setNewSpeaker((p) => ({ ...p, role: e.target.value }))}
              placeholder={t("eventForm.speakerRolePlaceholder")}
              className="px-3 py-2 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary dark:bg-darkmode dark:text-white text-13"
            />
          </div>

          {/* Speaker Image Upload */}
          <ImageUploadZone
            label={t("eventForm.speakerImage")}
            value={newSpeaker.image}
            preview={speakerImagePreview}
            uploading={uploadingSpeakerImage}
            disabled={isDisabled}
            folder="event-speakers"
            maxSizeMB={2}
            shape="circle"
            urlPlaceholder={t("eventForm.imagePlaceholder")}
            onUploadStart={() => setUploadingSpeakerImage(true)}
            onUploadSuccess={(url) => {
              setNewSpeaker((p) => ({ ...p, image: url }));
              setSpeakerImagePreview(url);
              setUploadingSpeakerImage(false);
            }}
            onUploadError={() => {
              setNewSpeaker((p) => ({ ...p, image: "" }));
              setSpeakerImagePreview("");
              setUploadingSpeakerImage(false);
            }}
            onRemove={() => {
              setNewSpeaker((p) => ({ ...p, image: "" }));
              setSpeakerImagePreview("");
            }}
            onUrlChange={(url) => {
              setNewSpeaker((p) => ({ ...p, image: url }));
              setSpeakerImagePreview(url);
            }}
          />

          <button
            type="button"
            onClick={addSpeaker}
            disabled={!newSpeaker.name.trim() || isDisabled}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-13 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("eventForm.addSpeaker")}
          </button>
        </div>

        {/* Speakers List */}
        {speakers.length > 0 && (
          <div className="space-y-2">
            <p className="text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("eventForm.addedSpeakers")}:
            </p>
            <div className="space-y-2">
              {speakers.map((speaker, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-PaleCyan dark:bg-dark_input rounded-lg border border-PowderBlueBorder/50 dark:border-dark_border/50"
                >
                  <div className="flex items-center gap-3">
                    {speaker.image ? (
                      <img
                        src={speaker.image}
                        alt={speaker.name}
                        className="w-9 h-9 rounded-full object-cover border-2 border-primary/20"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="text-13 font-semibold text-MidnightNavyText dark:text-white">{speaker.name}</p>
                      <p className="text-11 text-SlateBlueText dark:text-darktext">{speaker.role}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSpeaker(index)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Media & Registration ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader
          icon={<Link className="w-4 h-4 text-LightYellow" />}
          iconBg="bg-LightYellow/10"
          title={t("eventForm.mediaRegistration")}
          desc={t("eventForm.mediaRegistrationDescription")}
        />

        {/* Instructor Image */}
        <ImageUploadZone
          label={t("eventForm.instructorImage")}
          value={form.instructorImage}
          preview={instructorImagePreview}
          uploading={uploadingInstructorImage}
          disabled={isDisabled}
          folder="event-instructors"
          maxSizeMB={3}
          shape="circle"
          urlPlaceholder={t("eventForm.imagePlaceholder")}
          onUploadStart={() => setUploadingInstructorImage(true)}
          onUploadSuccess={(url) => {
            onChange("instructorImage", url);
            setInstructorImagePreview(url);
            setUploadingInstructorImage(false);
          }}
          onUploadError={(fallback) => {
            onChange("instructorImage", fallback);
            setInstructorImagePreview(fallback);
            setUploadingInstructorImage(false);
          }}
          onRemove={() => {
            onChange("instructorImage", "");
            setInstructorImagePreview("");
          }}
          onUrlChange={(url) => {
            onChange("instructorImage", url);
            setInstructorImagePreview(url);
          }}
        />

        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
          <FormField label={t("eventForm.crmRegistrationUrl")} icon={<Link className="w-3 h-3 text-LightYellow" />}>
            <input
              type="url"
              value={form.crmRegistrationUrl}
              onChange={(e) => onChange("crmRegistrationUrl", e.target.value)}
              placeholder="https://crm.registration-link.com"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </FormField>
          <FormField label={t("eventForm.maxAttendees")} icon={<Users className="w-3 h-3 text-LightYellow" />}>
            <input
              type="number"
              value={form.maxAttendees}
              onChange={(e) => onChange("maxAttendees", parseInt(e.target.value) || 100)}
              min="1"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </FormField>
        </div>
      </div>

      {/* ── 5. Tags ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader
          icon={<Tag className="w-4 h-4 text-primary" />}
          iconBg="bg-primary/10"
          title={t("eventForm.tags")}
          desc={t("eventForm.tagsDescription")}
        />

        <div className="flex gap-2">
          <input
            type="text"
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyPress={handleTagKeyPress}
            placeholder={t("eventForm.tagsPlaceholder")}
            className="flex-1 px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
          />
          <button
            type="button"
            onClick={addTag}
            disabled={!newTagInput.trim()}
            className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-13 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("eventForm.addTag")}
          </button>
        </div>

        {tags.length > 0 && (
          <div className="space-y-2">
            <p className="text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("eventForm.addedTags")}:
            </p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white px-3 py-1.5 rounded-lg text-13 border border-PowderBlueBorder/50 dark:border-dark_border/50"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(index)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-11 text-SlateBlueText dark:text-darktext">{t("eventForm.tagsHint")}</p>
      </div>

      {/* ── 6. Settings ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader
          icon={<Globe className="w-4 h-4 text-primary" />}
          iconBg="bg-primary/10"
          title={t("eventForm.settings")}
          desc={t("eventForm.settingsDescription")}
        />

        <label className="flex items-center space-x-3 p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-IcyBreeze dark:hover:bg-dark_input transition-all duration-200 cursor-pointer group">
          <div className="w-8 h-8 bg-Aquamarine/10 rounded flex items-center justify-center group-hover:bg-Aquamarine/20 transition-colors">
            <Globe className="w-3 h-3 text-Aquamarine" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => onChange("isActive", e.target.checked)}
                className="w-4 h-4 text-Aquamarine focus:ring-Aquamarine border-PowderBlueBorder rounded"
              />
              <span className="text-13 font-medium text-MidnightNavyText dark:text-white">
                {t("eventForm.activeEvent")}
              </span>
            </div>
            <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">
              {t("eventForm.activeDescription")}
            </p>
          </div>
        </label>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex gap-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
        <button
          type="button"
          onClick={onClose}
          disabled={isDisabled}
          className="flex-1 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 hover:bg-IcyBreeze dark:hover:bg-darklight hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <X className="w-3 h-3" />
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          disabled={isDisabled}
          className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              {t("eventForm.saving")}
            </>
          ) : isUploading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              جاري رفع الصور...
            </>
          ) : initial ? (
            <>
              <Save className="w-3 h-3" />
              {t("eventForm.updateEvent")}
            </>
          ) : (
            <>
              <Rocket className="w-3 h-3" />
              {t("eventForm.createEvent")}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  icon, iconBg, title, desc,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">{title}</h3>
        {desc && <p className="text-12 text-SlateBlueText dark:text-darktext">{desc}</p>}
      </div>
    </div>
  );
}

function FormField({
  label, icon, children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}