"use client";
import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  User,
  Image,
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
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

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

interface Form {
  title: string;
  description: string;
  date: string;
  time: string;
  image: string;
  location: string;
  tags: string[];
  speakers: Speaker[];
  isActive: boolean;
  _id?: string;
}

// ─── Cloudinary upload helper ─────────────────────────────────────────────────
async function uploadImage(file: File, folder: string): Promise<string> {
  if (file.size > 20 * 1024 * 1024)
    throw new Error("حجم الملف يتجاوز 20MB");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  const res = await fetch("/api/upload-image", { method: "POST", body: formData });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Upload failed");
  return data.imageUrl;
}

// ─── Shared style constants ───────────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200";

const removeBtnCls =
  "inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-12 cursor-pointer hover:bg-red-500/20 transition-colors";

export default function SchedulesForm({ initial, onClose, onSaved }: Props) {
  const { t } = useI18n();

  const [form, setForm] = useState<Form>(() => ({
    title: initial?.title || "",
    description: initial?.description || "",
    date: initial?.date || "",
    time: initial?.time || "",
    image: initial?.image || "",
    location: initial?.location || "",
    tags: initial?.tags || [],
    speakers: initial?.speakers || [],
    isActive: initial?.isActive ?? true,
    _id: initial?._id,
  }));

  const [tags, setTags] = useState<string[]>(initial?.tags || []);
  const [newTagInput, setNewTagInput] = useState("");
  const [loading, setLoading] = useState(false);

  // ─── upload states ────────────────────────────────────────────────────────
  const [uploadingEventImage, setUploadingEventImage]     = useState(false);
  const [uploadingSpeakerImage, setUploadingSpeakerImage] = useState(false);

  const [eventImagePreview, setEventImagePreview]   = useState(initial?.image || "");
  const [speakers, setSpeakers]                     = useState<Speaker[]>(form.speakers);
  const [newSpeaker, setNewSpeaker]                 = useState<Speaker>({ name: "", role: "", image: "" });
  const [speakerImagePreview, setSpeakerImagePreview] = useState("");

  const isUploading = uploadingEventImage || uploadingSpeakerImage;
  const isDisabled  = loading || isUploading;

  useEffect(() => { if (form.image) setEventImagePreview(form.image); }, [form.image]);

  const onChange = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ─── Tag helpers ──────────────────────────────────────────────────────────
  const addTag = () => {
    const tag = newTagInput.trim();
    if (tag && !tags.includes(tag)) {
      const next = [...tags, tag];
      setTags(next); setNewTagInput(""); onChange("tags", next);
    }
  };
  const removeTag = (index: number) => {
    const next = tags.filter((_, i) => i !== index);
    setTags(next); onChange("tags", next);
  };
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); addTag(); }
  };

  // ─── Speaker helpers ──────────────────────────────────────────────────────
  const addSpeaker = () => {
    if (newSpeaker.name.trim()) {
      const next = [...speakers, { ...newSpeaker }];
      setSpeakers(next); onChange("speakers", next);
      setNewSpeaker({ name: "", role: "", image: "" });
      setSpeakerImagePreview("");
    }
  };
  const removeSpeaker = (index: number) => {
    const next = speakers.filter((_, i) => i !== index);
    setSpeakers(next); onChange("speakers", next);
  };

  // ─── Upload handlers ──────────────────────────────────────────────────────
  const handleEventImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEventImagePreview(URL.createObjectURL(file));
    setUploadingEventImage(true);
    try {
      const url = await uploadImage(file, "schedule-events");
      onChange("image", url);
      setEventImagePreview(url);
    } catch (err: any) {
      alert(`خطأ في رفع الصورة: ${err.message}`);
      setEventImagePreview(initial?.image || "");
      onChange("image", initial?.image || "");
    } finally {
      setUploadingEventImage(false);
      e.target.value = "";
    }
  };

  const handleSpeakerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSpeakerImagePreview(URL.createObjectURL(file));
    setUploadingSpeakerImage(true);
    try {
      const url = await uploadImage(file, "schedule-speakers");
      setSpeakerImagePreview(url);
      setNewSpeaker((prev) => ({ ...prev, image: url }));
    } catch (err: any) {
      alert(`خطأ في رفع الصورة: ${err.message}`);
      setSpeakerImagePreview("");
      setNewSpeaker((prev) => ({ ...prev, image: "" }));
    } finally {
      setUploadingSpeakerImage(false);
      e.target.value = "";
    }
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        title: form.title,
        description: form.description,
        date: form.date,
        time: form.time,
        image: form.image,
        location: form.location,
        tags,
        speakers,
        isActive: form.isActive,
      };
      if (form._id) payload.id = form._id;

      const method = form._id ? "PUT" : "POST";
      const res = await fetch("/api/schedules", {
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
      if (result.success) { onSaved(); onClose(); }
      else throw new Error(result.message || "Operation failed");
    } catch (err: any) {
      alert(`An error occurred: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <form onSubmit={submit} className="space-y-6">

      {/* ── 1. Basic Information ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader
          icon={<Calendar className="w-4 h-4 text-primary" />} iconBg="bg-primary/10"
          title={t("schedules.form.basicInfo")}
          desc={t("schedules.form.basicInfoDescription")}
        />

        <Field label={t("schedules.form.eventTitle")} icon={<Calendar className="w-3 h-3 text-primary" />}>
          <input type="text" value={form.title} onChange={(e) => onChange("title", e.target.value)}
            placeholder={t("schedules.form.titlePlaceholder")} className={inputCls} required />
        </Field>

        <Field label={t("schedules.form.description")} icon={<Calendar className="w-3 h-3 text-primary" />}>
          <textarea value={form.description} onChange={(e) => onChange("description", e.target.value)}
            rows={3} placeholder={t("schedules.form.descriptionPlaceholder")}
            className={`${inputCls} resize-none`} required />
        </Field>

        {/* Event Cover Image */}
        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Image className="w-3 h-3 text-primary" />
            {t("schedules.form.coverImage")}
          </label>
          <div className="flex gap-4 items-start">
            <div className="flex-1 space-y-2">
              <input type="text" value={form.image} onChange={(e) => onChange("image", e.target.value)}
                placeholder={t("schedules.form.imagePlaceholder")}
                disabled={uploadingEventImage} className={inputCls} />
              <div className="flex gap-2">
                <UploadLabel
                  uploading={uploadingEventImage}
                  label={t("schedules.form.uploadImage")}
                  accept="image/*"
                  onChange={handleEventImageUpload}
                  disabled={isDisabled}
                />
                {eventImagePreview && !uploadingEventImage && (
                  <button type="button"
                    onClick={() => { onChange("image", ""); setEventImagePreview(""); }}
                    className={removeBtnCls}>
                    <Trash2 className="w-3 h-3" /> {t("schedules.form.removeImage")}
                  </button>
                )}
              </div>
            </div>
            {eventImagePreview && (
              <div className="relative w-20 h-20 border border-PowderBlueBorder rounded-lg overflow-hidden shrink-0">
                <img src={eventImagePreview} alt="Event Preview" className="w-full h-full object-cover" />
                {uploadingEventImage && <UploadOverlay />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Schedule & Location ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader
          icon={<Clock className="w-4 h-4 text-Aquamarine" />} iconBg="bg-Aquamarine/10"
          title={t("schedules.form.scheduleLocation")}
          desc={t("schedules.form.scheduleDescription")}
        />

        <div className="grid md:grid-cols-2 gap-4">
          <Field label={t("schedules.form.date")} icon={<Calendar className="w-3 h-3 text-Aquamarine" />}>
            <input type="date" value={form.date} onChange={(e) => onChange("date", e.target.value)}
              className={inputCls} required />
          </Field>
          <Field label={t("schedules.form.time")} icon={<Clock className="w-3 h-3 text-Aquamarine" />}>
            <input type="time" value={form.time} onChange={(e) => onChange("time", e.target.value)}
              className={inputCls} required />
          </Field>
        </div>

        <Field label={t("schedules.form.location")} icon={<MapPin className="w-3 h-3 text-Aquamarine" />}>
          <input type="text" value={form.location} onChange={(e) => onChange("location", e.target.value)}
            placeholder={t("schedules.form.locationPlaceholder")} className={inputCls} />
        </Field>
      </div>

      {/* ── 3. Speakers ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader
          icon={<Users className="w-4 h-4 text-ElectricAqua" />} iconBg="bg-ElectricAqua/10"
          title={t("schedules.form.speakers")}
          desc={t("schedules.form.speakersDescription")}
        />

        {/* Add New Speaker */}
        <div className="space-y-3 p-4 bg-IcyBreeze dark:bg-dark_input rounded-lg">
          <h4 className="text-13 font-medium text-MidnightNavyText dark:text-white">
            {t("schedules.form.addNewSpeaker")}
          </h4>

          <div className="grid md:grid-cols-2 gap-3">
            <input type="text" value={newSpeaker.name}
              onChange={(e) => setNewSpeaker((p) => ({ ...p, name: e.target.value }))}
              placeholder={t("schedules.form.speakerNamePlaceholder")}
              className={inputCls} />
            <input type="text" value={newSpeaker.role}
              onChange={(e) => setNewSpeaker((p) => ({ ...p, role: e.target.value }))}
              placeholder={t("schedules.form.speakerRolePlaceholder")}
              className={inputCls} />
          </div>

          {/* Speaker image */}
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("schedules.form.speakerImage")}
            </label>
            <div className="flex gap-3 items-start">
              <div className="flex-1 space-y-2">
                <input type="text" value={newSpeaker.image}
                  onChange={(e) => { setNewSpeaker((p) => ({ ...p, image: e.target.value })); setSpeakerImagePreview(e.target.value); }}
                  placeholder={t("schedules.form.imagePlaceholder")}
                  disabled={uploadingSpeakerImage} className={inputCls} />
                <div className="flex gap-2">
                  <UploadLabel
                    uploading={uploadingSpeakerImage}
                    label={t("schedules.form.uploadImage")}
                    accept="image/*"
                    onChange={handleSpeakerImageUpload}
                    disabled={isDisabled}
                  />
                  {speakerImagePreview && !uploadingSpeakerImage && (
                    <button type="button"
                      onClick={() => { setNewSpeaker((p) => ({ ...p, image: "" })); setSpeakerImagePreview(""); }}
                      className={removeBtnCls}>
                      <Trash2 className="w-3 h-3" /> {t("schedules.form.removeImage")}
                    </button>
                  )}
                </div>
              </div>
              {speakerImagePreview && (
                <div className="relative w-20 h-20 border border-PowderBlueBorder rounded-lg overflow-hidden shrink-0">
                  <img src={speakerImagePreview} alt="Speaker Preview" className="w-full h-full object-cover" />
                  {uploadingSpeakerImage && <UploadOverlay />}
                </div>
              )}
            </div>
          </div>

          <button type="button" onClick={addSpeaker}
            disabled={!newSpeaker.name.trim() || isDisabled}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-13 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t("schedules.form.addSpeaker")}
          </button>
        </div>

        {/* Speakers List */}
        {speakers.length > 0 && (
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("schedules.form.addedSpeakers")}:
            </label>
            {speakers.map((speaker, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-PaleCyan dark:bg-dark_input rounded-lg">
                <div className="flex items-center gap-3">
                  {speaker.image && (
                    <img src={speaker.image} alt={speaker.name} className="w-8 h-8 rounded-full object-cover" />
                  )}
                  <div>
                    <p className="text-13 font-medium text-MidnightNavyText dark:text-white">{speaker.name}</p>
                    <p className="text-11 text-SlateBlueText dark:text-darktext">{speaker.role}</p>
                  </div>
                </div>
                <button type="button" onClick={() => removeSpeaker(index)}
                  className="text-red-500 hover:text-red-700 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. Tags ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader
          icon={<Tag className="w-4 h-4 text-primary" />} iconBg="bg-primary/10"
          title={t("schedules.form.tags")}
          desc={t("schedules.form.tagsDescription")}
        />

        <div className="flex gap-2">
          <input type="text" value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyPress={handleTagKeyPress}
            placeholder={t("schedules.form.tagsPlaceholder")}
            className={`${inputCls} flex-1`} />
          <button type="button" onClick={addTag} disabled={!newTagInput.trim()}
            className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-13 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t("schedules.form.addTag")}
          </button>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <div key={index} className="flex items-center gap-2 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white px-3 py-2 rounded-lg text-13">
                <span>{tag}</span>
                <button type="button" onClick={() => removeTag(index)}
                  className="text-red-500 hover:text-red-700 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-11 text-SlateBlueText dark:text-darktext">{t("schedules.form.tagsHint")}</p>
      </div>

      {/* ── 5. Settings ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader
          icon={<Globe className="w-4 h-4 text-primary" />} iconBg="bg-primary/10"
          title={t("schedules.form.settings")}
          desc={t("schedules.form.settingsDescription")}
        />

        <label className="flex items-center space-x-3 p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-IcyBreeze dark:hover:bg-dark_input transition-all duration-200 cursor-pointer group">
          <div className="w-8 h-8 bg-Aquamarine/10 rounded flex items-center justify-center group-hover:bg-Aquamarine/20 transition-colors">
            <Globe className="w-3 h-3 text-Aquamarine" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isActive}
                onChange={(e) => onChange("isActive", e.target.checked)}
                className="w-4 h-4 text-Aquamarine focus:ring-Aquamarine border-PowderBlueBorder rounded" />
              <span className="text-13 font-medium text-MidnightNavyText dark:text-white">
                {t("schedules.form.activeEvent")}
              </span>
            </div>
            <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">
              {t("schedules.form.activeDescription")}
            </p>
          </div>
        </label>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
        <button type="button" onClick={onClose} disabled={isDisabled}
          className="flex-1 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 hover:bg-IcyBreeze dark:hover:bg-darklight hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          <X className="w-3 h-3" /> {t("common.cancel")}
        </button>
        <button type="submit" disabled={isDisabled}
          className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> {t("schedules.form.saving")}</>
          ) : isUploading ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> جاري الرفع...</>
          ) : form._id ? (
            <><Save className="w-3 h-3" /> {t("schedules.form.updateEvent")}</>
          ) : (
            <><Rocket className="w-3 h-3" /> {t("schedules.form.createEvent")}</>
          )}
        </button>
      </div>
    </form>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionHeader({
  icon, iconBg, title, desc,
}: { icon: React.ReactNode; iconBg: string; title: string; desc?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>{icon}</div>
      <div>
        <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">{title}</h3>
        {desc && <p className="text-12 text-SlateBlueText dark:text-darktext">{desc}</p>}
      </div>
    </div>
  );
}

function Field({
  label, icon, children,
}: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

function UploadLabel({
  uploading, label, accept, onChange, disabled,
}: {
  uploading: boolean; label: string; accept: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-12 cursor-pointer hover:bg-primary/20 transition-colors ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}>
      {uploading
        ? <><Loader2 className="w-3 h-3 animate-spin" /> جاري الرفع...</>
        : <><Upload className="w-3 h-3" /> {label}</>}
      <input type="file" accept={accept} onChange={onChange} disabled={disabled} className="hidden" />
    </label>
  );
}

function UploadOverlay() {
  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
      <div className="flex items-center gap-1.5 text-white text-11">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>رفع...</span>
      </div>
    </div>
  );
}