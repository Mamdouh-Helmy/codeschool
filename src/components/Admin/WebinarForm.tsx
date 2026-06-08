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

export default function WebinarForm({ initial, onClose, onSaved }: Props) {
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
    duration: initial?.duration || 60,
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

  // ─── upload states ────────────────────────────────────────────────────────
  const [uploadingWebinarImage, setUploadingWebinarImage]       = useState(false);
  const [uploadingInstructorImage, setUploadingInstructorImage] = useState(false);
  const [uploadingSpeakerImage, setUploadingSpeakerImage]       = useState(false);

  const [instructorImagePreview, setInstructorImagePreview] = useState(initial?.instructorImage || "");
  const [webinarImagePreview, setWebinarImagePreview]       = useState(initial?.image || "");

  const [speakers, setSpeakers] = useState<Speaker[]>(form.speakers);
  const [newSpeaker, setNewSpeaker] = useState<Speaker>({ name: "", role: "", image: "" });
  const [speakerImagePreview, setSpeakerImagePreview] = useState("");

  useEffect(() => { if (form.instructorImage) setInstructorImagePreview(form.instructorImage); }, [form.instructorImage]);
  useEffect(() => { if (form.image)           setWebinarImagePreview(form.image); },            [form.image]);

  const onChange = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const isUploading = uploadingWebinarImage || uploadingInstructorImage || uploadingSpeakerImage;
  const isDisabled  = loading || isUploading;

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
  const handleWebinarImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWebinarImagePreview(URL.createObjectURL(file));
    setUploadingWebinarImage(true);
    try {
      const url = await uploadImage(file, "webinar-covers");
      onChange("image", url);
      setWebinarImagePreview(url);
    } catch (err: any) {
      alert(`خطأ في رفع الصورة: ${err.message}`);
      setWebinarImagePreview(initial?.image || "");
      onChange("image", initial?.image || "");
    } finally {
      setUploadingWebinarImage(false);
      e.target.value = "";
    }
  };

  const handleInstructorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setInstructorImagePreview(URL.createObjectURL(file));
    setUploadingInstructorImage(true);
    try {
      const url = await uploadImage(file, "webinar-instructors");
      onChange("instructorImage", url);
      setInstructorImagePreview(url);
    } catch (err: any) {
      alert(`خطأ في رفع الصورة: ${err.message}`);
      setInstructorImagePreview(initial?.instructorImage || "");
      onChange("instructorImage", initial?.instructorImage || "");
    } finally {
      setUploadingInstructorImage(false);
      e.target.value = "";
    }
  };

  const handleSpeakerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSpeakerImagePreview(URL.createObjectURL(file));
    setUploadingSpeakerImage(true);
    try {
      const url = await uploadImage(file, "webinar-speakers");
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
      const parseDateTimeToISO = (s: string) => {
        if (!s) return "";
        try { return new Date(s).toISOString(); } catch { return ""; }
      };

      const payload = {
        ...form,
        registrationStart: parseDateTimeToISO(form.registrationStart),
        registrationEnd:   parseDateTimeToISO(form.registrationEnd),
        tags,
        speakers,
      };

      const method = initial?._id ? "PUT" : "POST";
      const url    = initial?._id
        ? `/api/webinars?id=${encodeURIComponent(initial._id)}`
        : "/api/webinars";

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
      if (result.success) { onSaved(); onClose(); }
      else throw new Error(result.message || "Operation failed");
    } catch (err: any) {
      alert(`${t("webinar.saveError") || "An error occurred"}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <form onSubmit={submit} className="space-y-6">

      {/* ── 1. Basic Information ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader icon={<Calendar className="w-4 h-4 text-primary" />} iconBg="bg-primary/10"
          title={t("webinar.basicInfo") || "Webinar Information"}
          desc={t("webinar.basicInfoDescription") || "Basic details about the webinar"} />

        <div className="grid md:grid-cols-2 gap-4">
          <Field label={`${t("webinar.title") || "Webinar Title"} *`} icon={<Calendar className="w-3 h-3 text-primary" />}>
            <input type="text" value={form.title} onChange={(e) => onChange("title", e.target.value)}
              placeholder={t("webinar.titlePlaceholder") || "e.g., Advanced React Patterns"}
              className={inputCls} required />
          </Field>

          <Field label={`${t("webinar.instructor") || "Main Instructor"} *`} icon={<User className="w-3 h-3 text-primary" />}>
            <input type="text" value={form.instructor} onChange={(e) => onChange("instructor", e.target.value)}
              placeholder={t("webinar.instructorPlaceholder") || "Instructor name"}
              className={inputCls} required />
          </Field>
        </div>

        <Field label={`${t("webinar.description") || "Description"} *`} icon={<Calendar className="w-3 h-3 text-primary" />}>
          <textarea value={form.description} onChange={(e) => onChange("description", e.target.value)}
            rows={3} placeholder={t("webinar.descriptionPlaceholder") || "Describe the webinar content..."}
            className={`${inputCls} resize-none`} required />
        </Field>

        {/* Webinar Cover Image */}
        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Image className="w-3 h-3 text-primary" />
            {t("webinar.coverImage") || "Webinar Cover Image"}
          </label>
          <div className="flex gap-4 items-start">
            <div className="flex-1 space-y-2">
              <input type="text" value={form.image} onChange={(e) => onChange("image", e.target.value)}
                placeholder={t("webinar.imagePlaceholder") || "Image URL or upload file"}
                disabled={uploadingWebinarImage}
                className={inputCls} />
              <div className="flex gap-2">
                <UploadLabel
                  uploading={uploadingWebinarImage}
                  label={t("webinar.uploadImage") || "Upload Image"}
                  accept="image/*"
                  onChange={handleWebinarImageUpload}
                  disabled={isDisabled}
                />
                {webinarImagePreview && !uploadingWebinarImage && (
                  <button type="button"
                    onClick={() => { onChange("image", ""); setWebinarImagePreview(""); }}
                    className={removeBtnCls}>
                    <Trash2 className="w-3 h-3" /> {t("common.remove") || "Remove"}
                  </button>
                )}
              </div>
            </div>
            {webinarImagePreview && (
              <div className="relative w-20 h-20 border border-PowderBlueBorder rounded-lg overflow-hidden shrink-0">
                <img src={webinarImagePreview} alt="Webinar Preview" className="w-full h-full object-cover" />
                {uploadingWebinarImage && <UploadOverlay />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Schedule & Timing ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader icon={<Clock className="w-4 h-4 text-Aquamarine" />} iconBg="bg-Aquamarine/10"
          title={t("webinar.schedule") || "Schedule & Timing"}
          desc={t("webinar.scheduleDescription") || "Set date and time for the webinar"} />

        <div className="grid md:grid-cols-2 gap-4">
          <Field label={`${t("webinar.date") || "Date"} *`} icon={<Calendar className="w-3 h-3 text-Aquamarine" />}>
            <input type="date" value={form.date} onChange={(e) => onChange("date", e.target.value)} className={inputCls} required />
          </Field>
          <Field label={`${t("webinar.time") || "Time"} *`} icon={<Clock className="w-3 h-3 text-Aquamarine" />}>
            <input type="time" value={form.time} onChange={(e) => onChange("time", e.target.value)} className={inputCls} required />
          </Field>
        </div>

        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
          <Field label={t("webinar.registrationStart") || "Registration Start"}>
            <input type="datetime-local" value={form.registrationStart}
              onChange={(e) => onChange("registrationStart", e.target.value)} className={inputCls} />
          </Field>
          <Field label={t("webinar.registrationEnd") || "Registration End"}>
            <input type="datetime-local" value={form.registrationEnd}
              onChange={(e) => onChange("registrationEnd", e.target.value)} className={inputCls} />
          </Field>
        </div>
      </div>

      {/* ── 3. Speakers ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader icon={<Users className="w-4 h-4 text-ElectricAqua" />} iconBg="bg-ElectricAqua/10"
          title={t("webinar.speakers") || "Speakers"}
          desc={t("webinar.speakersDescription") || "Add multiple speakers for this webinar"} />

        {/* Add New Speaker */}
        <div className="space-y-3 p-4 bg-IcyBreeze dark:bg-dark_input rounded-lg">
          <h4 className="text-13 font-medium text-MidnightNavyText dark:text-white">
            {t("webinar.addSpeaker") || "Add New Speaker"}
          </h4>

          <div className="grid md:grid-cols-2 gap-3">
            <input type="text" value={newSpeaker.name}
              onChange={(e) => setNewSpeaker((p) => ({ ...p, name: e.target.value }))}
              placeholder={t("webinar.speakerNamePlaceholder") || "Speaker name"}
              className={inputCls} />
            <input type="text" value={newSpeaker.role}
              onChange={(e) => setNewSpeaker((p) => ({ ...p, role: e.target.value }))}
              placeholder={t("webinar.speakerRolePlaceholder") || "Role/Title"}
              className={inputCls} />
          </div>

          {/* Speaker image */}
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("webinar.speakerImage") || "Speaker Image"}
            </label>
            <div className="flex gap-3 items-start">
              <div className="flex-1 space-y-2">
                <input type="text" value={newSpeaker.image}
                  onChange={(e) => { setNewSpeaker((p) => ({ ...p, image: e.target.value })); setSpeakerImagePreview(e.target.value); }}
                  placeholder={t("webinar.imagePlaceholder") || "Image URL or upload file"}
                  disabled={uploadingSpeakerImage}
                  className={inputCls} />
                <div className="flex gap-2">
                  <UploadLabel
                    uploading={uploadingSpeakerImage}
                    label={t("webinar.uploadImage") || "Upload Image"}
                    accept="image/*"
                    onChange={handleSpeakerImageUpload}
                    disabled={isDisabled}
                  />
                  {speakerImagePreview && !uploadingSpeakerImage && (
                    <button type="button"
                      onClick={() => { setNewSpeaker((p) => ({ ...p, image: "" })); setSpeakerImagePreview(""); }}
                      className={removeBtnCls}>
                      <Trash2 className="w-3 h-3" /> {t("common.remove") || "Remove"}
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
            <Plus className="w-4 h-4" /> {t("webinar.addSpeakerButton") || "Add Speaker"}
          </button>
        </div>

        {/* Speakers list */}
        {speakers.length > 0 && (
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("webinar.addedSpeakers") || "Added Speakers"}:
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
                <button type="button" onClick={() => removeSpeaker(index)} className="text-red-500 hover:text-red-700 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. Media & Registration ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader icon={<Link className="w-4 h-4 text-LightYellow" />} iconBg="bg-LightYellow/10"
          title={t("webinar.mediaRegistration") || "Media & Registration"}
          desc={t("webinar.mediaRegistrationDescription") || "Instructor image and registration details"} />

        {/* Instructor Image */}
        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Image className="w-3 h-3 text-LightYellow" />
            {t("webinar.instructorImage") || "Instructor Image"}
          </label>
          <div className="flex gap-4 items-start">
            <div className="flex-1 space-y-2">
              <input type="text" value={form.instructorImage}
                onChange={(e) => onChange("instructorImage", e.target.value)}
                placeholder={t("webinar.imagePlaceholder") || "Image URL or upload file"}
                disabled={uploadingInstructorImage}
                className={inputCls} />
              <div className="flex gap-2">
                <UploadLabel
                  uploading={uploadingInstructorImage}
                  label={t("webinar.uploadImage") || "Upload Image"}
                  accept="image/*"
                  onChange={handleInstructorImageUpload}
                  disabled={isDisabled}
                />
                {instructorImagePreview && !uploadingInstructorImage && (
                  <button type="button"
                    onClick={() => { onChange("instructorImage", ""); setInstructorImagePreview(""); }}
                    className={removeBtnCls}>
                    <Trash2 className="w-3 h-3" /> {t("common.remove") || "Remove"}
                  </button>
                )}
              </div>
            </div>
            {instructorImagePreview && (
              <div className="relative w-20 h-20 border border-PowderBlueBorder rounded-lg overflow-hidden shrink-0">
                <img src={instructorImagePreview} alt="Instructor Preview" className="w-full h-full object-cover" />
                {uploadingInstructorImage && <UploadOverlay />}
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label={t("webinar.crmUrl") || "CRM Registration URL"} icon={<Link className="w-3 h-3 text-LightYellow" />}>
            <input type="url" value={form.crmRegistrationUrl}
              onChange={(e) => onChange("crmRegistrationUrl", e.target.value)}
              placeholder="https://crm.registration-link.com" className={inputCls} />
          </Field>
          <Field label={t("webinar.maxAttendees") || "Max Attendees"} icon={<Users className="w-3 h-3 text-LightYellow" />}>
            <input type="number" value={form.maxAttendees} min="1"
              onChange={(e) => onChange("maxAttendees", parseInt(e.target.value) || 100)}
              className={inputCls} />
          </Field>
        </div>
      </div>

      {/* ── 5. Tags ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader icon={<Tag className="w-4 h-4 text-primary" />} iconBg="bg-primary/10"
          title={t("webinar.tags") || "Tags"}
          desc={t("webinar.tagsDescription") || "Add tags for better categorization and search"} />

        <div className="flex gap-2">
          <input type="text" value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyPress={handleTagKeyPress}
            placeholder={t("webinar.tagsPlaceholder") || "Enter a tag and press Enter"}
            className={`${inputCls} flex-1`} />
          <button type="button" onClick={addTag} disabled={!newTagInput.trim()}
            className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-13 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t("common.add") || "Add"}
          </button>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <div key={index} className="flex items-center gap-2 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white px-3 py-2 rounded-lg text-13">
                <span>{tag}</span>
                <button type="button" onClick={() => removeTag(index)} className="text-red-500 hover:text-red-700 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-11 text-SlateBlueText dark:text-darktext">
          {t("webinar.tagsHint") || "Press Enter or click Add to include multiple tags"}
        </p>
      </div>

      {/* ── 6. Settings ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader icon={<Globe className="w-4 h-4 text-primary" />} iconBg="bg-primary/10"
          title={t("webinar.settings") || "Settings"}
          desc={t("webinar.settingsDescription") || "Webinar visibility and status"} />

        <label className="flex items-center space-x-3 p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-IcyBreeze dark:hover:bg-dark_input transition-all duration-200 cursor-pointer group">
          <div className="w-8 h-8 bg-Aquamarine/10 rounded flex items-center justify-center group-hover:bg-Aquamarine/20 transition-colors">
            <Globe className="w-3 h-3 text-Aquamarine" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => onChange("isActive", e.target.checked)}
                className="w-4 h-4 text-Aquamarine focus:ring-Aquamarine border-PowderBlueBorder rounded" />
              <span className="text-13 font-medium text-MidnightNavyText dark:text-white">
                {t("webinar.activeWebinar") || "Active Webinar"}
              </span>
            </div>
            <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">
              {t("webinar.activeDescription") || "Make this webinar visible and available for registration"}
            </p>
          </div>
        </label>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
        <button type="button" onClick={onClose} disabled={isDisabled}
          className="flex-1 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 hover:bg-IcyBreeze dark:hover:bg-darklight hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          <X className="w-3 h-3" /> {t("common.cancel") || "Cancel"}
        </button>
        <button type="submit" disabled={isDisabled}
          className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> {t("common.saving") || "Saving..."}</>
          ) : isUploading ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> جاري الرفع...</>
          ) : initial ? (
            <><Save className="w-3 h-3" /> {t("webinar.updateWebinar") || "Update Webinar"}</>
          ) : (
            <><Rocket className="w-3 h-3" /> {t("webinar.createWebinar") || "Create Webinar"}</>
          )}
        </button>
      </div>
    </form>
  );
}

// ─── Shared constants ─────────────────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200";

const removeBtnCls =
  "inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-12 cursor-pointer hover:bg-red-500/20 transition-colors";

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