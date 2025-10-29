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

export default function SchedulesForm({ initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState(() => ({
    title: initial?.title || "",
    description: initial?.description || "",
    date: initial?.date || "",
    time: initial?.time || "",
    image: initial?.image || "",
    location: initial?.location || "",
    tags: initial?.tags || [],
    speakers: initial?.speakers || [],
    isActive: initial?.isActive ?? true,
  }));

  const [tags, setTags] = useState<string[]>(initial?.tags || []);
  const [newTagInput, setNewTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [eventImagePreview, setEventImagePreview] = useState("");
  const [speakers, setSpeakers] = useState<Speaker[]>(form.speakers);
  const [newSpeaker, setNewSpeaker] = useState<Speaker>({
    name: "",
    role: "",
    image: "",
  });
  const [speakerImagePreview, setSpeakerImagePreview] = useState("");
  const { t } = useI18n();

  useEffect(() => {
    if (form.image) {
      setEventImagePreview(form.image);
    }
  }, [form.image]);

  const onChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ✅ إضافة tag جديد
  const addTag = () => {
    const tag = newTagInput.trim();
    if (tag && !tags.includes(tag)) {
      const updatedTags = [...tags, tag];
      setTags(updatedTags);
      setNewTagInput("");
      onChange("tags", updatedTags);
    }
  };

  // ✅ حذف tag
  const removeTag = (index: number) => {
    const updatedTags = tags.filter((_, i) => i !== index);
    setTags(updatedTags);
    onChange("tags", updatedTags);
  };

  // ✅ إدخال بالزر Enter للـ tags
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  // ✅ معالجة رفع صورة المتحدث
  const handleSpeakerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSpeakerImagePreview(result);
        setNewSpeaker((prev) => ({ ...prev, image: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ إضافة متحدث جديد
  const addSpeaker = () => {
    if (newSpeaker.name.trim()) {
      const updatedSpeakers = [...speakers, { ...newSpeaker }];
      setSpeakers(updatedSpeakers);
      onChange("speakers", updatedSpeakers);
      setNewSpeaker({ name: "", role: "", image: "" });
      setSpeakerImagePreview("");
    }
  };

  // ✅ حذف متحدث
  const removeSpeaker = (index: number) => {
    const updatedSpeakers = speakers.filter((_, i) => i !== index);
    setSpeakers(updatedSpeakers);
    onChange("speakers", updatedSpeakers);
  };

  // ✅ معالجة رفع صورة الحدث
  const handleEventImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setEventImagePreview(result);
        onChange("image", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...form,
        tags,
        speakers,
      };

      // إذا كان هناك ID (تعديل) نضيفه للـ payload
      if (initial?._id) {
        payload.id = initial._id;
      }

      console.log("Sending schedule event payload:", payload);

      const method = initial?._id ? "PUT" : "POST";
      
      // استخدام endpoint الصحيح
      const url = "/api/schedules";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errorMessage = `HTTP error! status: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          const text = await res.text();
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await res.json();
      if (result.success) {
        onSaved();
        onClose();
      } else {
        throw new Error(result.message || "Operation failed");
      }
    } catch (err: any) {
      console.error("Error:", err);
      alert(`An error occurred: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("schedules.form.basicInfo")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("schedules.form.basicInfoDescription")}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Calendar className="w-3 h-3 text-primary" />
            {t("schedules.form.eventTitle")}
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder={t("schedules.form.titlePlaceholder")}
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Calendar className="w-3 h-3 text-primary" />
            {t("schedules.form.description")}
          </label>
          <textarea
            value={form.description}
            onChange={(e) => onChange("description", e.target.value)}
            rows={3}
            placeholder={t("schedules.form.descriptionPlaceholder")}
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 resize-none transition-all duration-200"
            required
          />
        </div>

        {/* Event Image */}
        <div className="space-y-3">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Image className="w-3 h-3 text-primary" />
            {t("schedules.form.coverImage")}
          </label>

          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <input
                type="text"
                value={form.image}
                onChange={(e) => onChange("image", e.target.value)}
                placeholder={t("schedules.form.imagePlaceholder")}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              />
              <div className="mt-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-12 cursor-pointer hover:bg-primary/20 transition-colors">
                  <Upload className="w-3 h-3" />
                  {t("schedules.form.uploadImage")}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEventImageUpload}
                    className="hidden"
                  />
                </label>
                {eventImagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("image", "");
                      setEventImagePreview("");
                    }}
                    className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-12 cursor-pointer hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    {t("schedules.form.removeImage")}
                  </button>
                )}
              </div>
            </div>

            {eventImagePreview && (
              <div className="w-20 h-20 border border-PowderBlueBorder rounded-lg overflow-hidden">
                <img
                  src={eventImagePreview}
                  alt="Event Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule & Location */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-Aquamarine/10 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-Aquamarine" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("schedules.form.scheduleLocation")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("schedules.form.scheduleDescription")}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Calendar className="w-3 h-3 text-Aquamarine" />
              {t("schedules.form.date")}
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => onChange("date", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Clock className="w-3 h-3 text-Aquamarine" />
              {t("schedules.form.time")}
            </label>
            <input
              type="time"
              value={form.time}
              onChange={(e) => onChange("time", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <MapPin className="w-3 h-3 text-Aquamarine" />
            {t("schedules.form.location")}
          </label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => onChange("location", e.target.value)}
            placeholder={t("schedules.form.locationPlaceholder")}
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
          />
        </div>
      </div>

      {/* Speakers */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-ElectricAqua/10 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-ElectricAqua" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("schedules.form.speakers")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("schedules.form.speakersDescription")}
            </p>
          </div>
        </div>

        {/* Add New Speaker */}
        <div className="space-y-3 p-4 bg-IcyBreeze dark:bg-dark_input rounded-lg">
          <h4 className="text-13 font-medium text-MidnightNavyText dark:text-white">
            {t("schedules.form.addNewSpeaker")}
          </h4>

          <div className="grid md:grid-cols-2 gap-3">
            <input
              type="text"
              value={newSpeaker.name}
              onChange={(e) =>
                setNewSpeaker((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={t("schedules.form.speakerNamePlaceholder")}
              className="px-3 py-2 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13"
            />
            <input
              type="text"
              value={newSpeaker.role}
              onChange={(e) =>
                setNewSpeaker((prev) => ({ ...prev, role: e.target.value }))
              }
              placeholder={t("schedules.form.speakerRolePlaceholder")}
              className="px-3 py-2 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13"
            />
          </div>

          {/* Speaker Image - URL or Upload */}
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("schedules.form.speakerImage")}
            </label>
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <input
                  type="text"
                  value={newSpeaker.image}
                  onChange={(e) => {
                    setNewSpeaker((prev) => ({
                      ...prev,
                      image: e.target.value,
                    }));
                    setSpeakerImagePreview(e.target.value);
                  }}
                  placeholder={t("schedules.form.imagePlaceholder")}
                  className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13"
                />
                <div className="mt-2 flex gap-2">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-12 cursor-pointer hover:bg-primary/20 transition-colors">
                    <Upload className="w-3 h-3" />
                    {t("schedules.form.uploadImage")}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSpeakerImageUpload}
                      className="hidden"
                    />
                  </label>
                  {speakerImagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewSpeaker((prev) => ({ ...prev, image: "" }));
                        setSpeakerImagePreview("");
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-12 cursor-pointer hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      {t("schedules.form.removeImage")}
                    </button>
                  )}
                </div>
              </div>

              {speakerImagePreview && (
                <div className="w-20 h-20 border border-PowderBlueBorder rounded-lg overflow-hidden">
                  <img
                    src={speakerImagePreview}
                    alt="Speaker Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={addSpeaker}
            disabled={!newSpeaker.name.trim()}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-13 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("schedules.form.addSpeaker")}
          </button>
        </div>

        {/* Speakers List */}
        {speakers.length > 0 && (
          <div className="space-y-3">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("schedules.form.addedSpeakers")}:
            </label>
            <div className="space-y-2">
              {speakers.map((speaker, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-PaleCyan dark:bg-dark_input rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {speaker.image && (
                      <img
                        src={speaker.image}
                        alt={speaker.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <p className="text-13 font-medium text-MidnightNavyText dark:text-white">
                        {speaker.name}
                      </p>
                      <p className="text-11 text-SlateBlueText dark:text-darktext">
                        {speaker.role}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSpeaker(index)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Tag className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("schedules.form.tags")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("schedules.form.tagsDescription")}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Input لإضافة tag جديد */}
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyPress={handleTagKeyPress}
                placeholder={t("schedules.form.tagsPlaceholder")}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              />
            </div>
            <button
              type="button"
              onClick={addTag}
              disabled={!newTagInput.trim()}
              className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-13 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("schedules.form.addTag")}
            </button>
          </div>

          {/* قائمة الـ Tags المضافوة */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                {t("schedules.form.addedTags")}:
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white px-3 py-2 rounded-lg text-13"
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

          <p className="text-11 text-SlateBlueText dark:text-darktext">
            {t("schedules.form.tagsHint")}
          </p>
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Globe className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("schedules.form.settings")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("schedules.form.settingsDescription")}
            </p>
          </div>
        </div>

        <div className="space-y-3">
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
                  {t("schedules.form.activeEvent")}
                </span>
              </div>
              <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">
                {t("schedules.form.activeDescription")}
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 hover:bg-IcyBreeze dark:hover:bg-darklight hover:shadow-md flex items-center justify-center gap-2"
        >
          <X className="w-3 h-3" />
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {t("schedules.form.saving")}
            </>
          ) : initial ? (
            <>
              <Save className="w-3 h-3" />
              {t("schedules.form.updateEvent")}
            </>
          ) : (
            <>
              <Rocket className="w-3 h-3" />
              {t("schedules.form.createEvent")}
            </>
          )}
        </button>
      </div>
    </form>
  );
}