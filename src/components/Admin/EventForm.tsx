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

export default function EventForm({ initial, onClose, onSaved }: Props) {
  const { t } = useI18n();

  const formatDateTimeForInput = (dateTimeString: string) => {
    if (!dateTimeString) return "";
    try {
      const date = new Date(dateTimeString);
      return date.toISOString().slice(0, 16);
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
  const [instructorImagePreview, setInstructorImagePreview] = useState("");
  const [eventImagePreview, setEventImagePreview] = useState("");
  const [speakers, setSpeakers] = useState<Speaker[]>(form.speakers);
  const [newSpeaker, setNewSpeaker] = useState<Speaker>({
    name: "",
    role: "",
    image: "",
  });
  const [speakerImagePreview, setSpeakerImagePreview] = useState("");

  useEffect(() => {
    if (form.instructorImage) {
      setInstructorImagePreview(form.instructorImage);
    }
  }, [form.instructorImage]);

  useEffect(() => {
    if (form.image) {
      setEventImagePreview(form.image);
    }
  }, [form.image]);

  const onChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    const tag = newTagInput.trim();
    if (tag && !tags.includes(tag)) {
      const updatedTags = [...tags, tag];
      setTags(updatedTags);
      setNewTagInput("");
      onChange("tags", updatedTags);
    }
  };

  const removeTag = (index: number) => {
    const updatedTags = tags.filter((_, i) => i !== index);
    setTags(updatedTags);
    onChange("tags", updatedTags);
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

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

  const addSpeaker = () => {
    if (newSpeaker.name.trim()) {
      const updatedSpeakers = [...speakers, { ...newSpeaker }];
      setSpeakers(updatedSpeakers);
      onChange("speakers", updatedSpeakers);
      setNewSpeaker({ name: "", role: "", image: "" });
      setSpeakerImagePreview("");
    }
  };

  const removeSpeaker = (index: number) => {
    const updatedSpeakers = speakers.filter((_, i) => i !== index);
    setSpeakers(updatedSpeakers);
    onChange("speakers", updatedSpeakers);
  };

  const handleInstructorImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setInstructorImagePreview(result);
        onChange("instructorImage", result);
      };
      reader.readAsDataURL(file);
    }
  };

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
      const parseDateTimeToISO = (dateTimeString: string) => {
        if (!dateTimeString) return "";
        try {
          return new Date(dateTimeString).toISOString();
        } catch {
          return "";
        }
      };

      const payload = {
        ...form,
        registrationStart: parseDateTimeToISO(form.registrationStart),
        registrationEnd: parseDateTimeToISO(form.registrationEnd),
        tags,
        speakers,
      };

      console.log("Sending event payload:", payload);

      const eventId = initial?._id || initial?.id;
      const method = eventId ? "PUT" : "POST";
      
      let url = "/api/events";
      if (eventId) {
        url = `/api/events?id=${encodeURIComponent(eventId)}`;
      }

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
        toast.success(t("events.savedSuccess"));
      } else {
        throw new Error(result.message || "Operation failed");
      }
    } catch (err: any) {
      console.error("Error:", err);
      toast.error(t("common.error") + ": " + err.message);
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
              {t("eventForm.basicInfo")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("eventForm.basicInfoDescription")}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Calendar className="w-3 h-3 text-primary" />
              {t("eventForm.eventTitle")} *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => onChange("title", e.target.value)}
              placeholder={t("eventForm.titlePlaceholder")}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <User className="w-3 h-3 text-primary" />
              {t("eventForm.mainInstructor")} *
            </label>
            <input
              type="text"
              value={form.instructor}
              onChange={(e) => onChange("instructor", e.target.value)}
              placeholder={t("eventForm.instructorPlaceholder")}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Calendar className="w-3 h-3 text-primary" />
            {t("eventForm.description")} *
          </label>
          <textarea
            value={form.description}
            onChange={(e) => onChange("description", e.target.value)}
            rows={3}
            placeholder={t("eventForm.descriptionPlaceholder")}
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 resize-none transition-all duration-200"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <MapPin className="w-3 h-3 text-primary" />
            {t("eventForm.location")}
          </label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => onChange("location", e.target.value)}
            placeholder={t("eventForm.locationPlaceholder")}
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
          />
        </div>

        {/* Event Image */}
        <div className="space-y-3">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Image className="w-3 h-3 text-primary" />
            {t("eventForm.coverImage")}
          </label>

          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <input
                type="text"
                value={form.image}
                onChange={(e) => onChange("image", e.target.value)}
                placeholder={t("eventForm.imagePlaceholder")}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              />
              <div className="mt-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-12 cursor-pointer hover:bg-primary/20 transition-colors">
                  <Upload className="w-3 h-3" />
                  {t("eventForm.uploadImage")}
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
                    {t("eventForm.removeImage")}
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

      {/* Schedule & Timing */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-Aquamarine/10 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-Aquamarine" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("eventForm.scheduleTiming")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("eventForm.scheduleDescription")}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Calendar className="w-3 h-3 text-Aquamarine" />
              {t("eventForm.date")} *
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
              {t("eventForm.time")} *
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

        {/* Registration Period */}
        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("eventForm.registrationStart")}
            </label>
            <input
              type="datetime-local"
              value={form.registrationStart}
              onChange={(e) => onChange("registrationStart", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("eventForm.registrationEnd")}
            </label>
            <input
              type="datetime-local"
              value={form.registrationEnd}
              onChange={(e) => onChange("registrationEnd", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </div>
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
              {t("eventForm.speakers")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("eventForm.speakersDescription")}
            </p>
          </div>
        </div>

        {/* Add New Speaker */}
        <div className="space-y-3 p-4 bg-IcyBreeze dark:bg-dark_input rounded-lg">
          <h4 className="text-13 font-medium text-MidnightNavyText dark:text-white">
            {t("eventForm.addNewSpeaker")}
          </h4>

          <div className="grid md:grid-cols-2 gap-3">
            <input
              type="text"
              value={newSpeaker.name}
              onChange={(e) =>
                setNewSpeaker((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={t("eventForm.speakerNamePlaceholder")}
              className="px-3 py-2 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13"
            />
            <input
              type="text"
              value={newSpeaker.role}
              onChange={(e) =>
                setNewSpeaker((prev) => ({ ...prev, role: e.target.value }))
              }
              placeholder={t("eventForm.speakerRolePlaceholder")}
              className="px-3 py-2 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13"
            />
          </div>

          {/* Speaker Image - URL or Upload */}
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("eventForm.speakerImage")}
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
                  placeholder={t("eventForm.imagePlaceholder")}
                  className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13"
                />
                <div className="mt-2 flex gap-2">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-12 cursor-pointer hover:bg-primary/20 transition-colors">
                    <Upload className="w-3 h-3" />
                    {t("eventForm.uploadImage")}
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
                      {t("eventForm.removeImage")}
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
            {t("eventForm.addSpeaker")}
          </button>
        </div>

        {/* Speakers List */}
        {speakers.length > 0 && (
          <div className="space-y-3">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("eventForm.addedSpeakers")}:
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

      {/* Media & Registration */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-LightYellow/10 rounded-lg flex items-center justify-center">
            <Link className="w-4 h-4 text-LightYellow" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("eventForm.mediaRegistration")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("eventForm.mediaRegistrationDescription")}
            </p>
          </div>
        </div>

        {/* Instructor Image */}
        <div className="space-y-3">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Image className="w-3 h-3 text-LightYellow" />
            {t("eventForm.instructorImage")}
          </label>

          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <input
                type="text"
                value={form.instructorImage}
                onChange={(e) => onChange("instructorImage", e.target.value)}
                placeholder={t("eventForm.imagePlaceholder")}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              />
              <div className="mt-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-12 cursor-pointer hover:bg-primary/20 transition-colors">
                  <Upload className="w-3 h-3" />
                  {t("eventForm.uploadImage")}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleInstructorImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {instructorImagePreview && (
              <div className="w-20 h-20 border border-PowderBlueBorder rounded-lg overflow-hidden">
                <img
                  src={instructorImagePreview}
                  alt="Instructor Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Link className="w-3 h-3 text-LightYellow" />
              {t("eventForm.crmRegistrationUrl")}
            </label>
            <input
              type="url"
              value={form.crmRegistrationUrl}
              onChange={(e) => onChange("crmRegistrationUrl", e.target.value)}
              placeholder="https://crm.registration-link.com"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Users className="w-3 h-3 text-LightYellow" />
              {t("eventForm.maxAttendees")}
            </label>
            <input
              type="number"
              value={form.maxAttendees}
              onChange={(e) =>
                onChange("maxAttendees", parseInt(e.target.value) || 100)
              }
              min="1"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Tag className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("eventForm.tags")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("eventForm.tagsDescription")}
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
                placeholder={t("eventForm.tagsPlaceholder")}
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
              {t("eventForm.addTag")}
            </button>
          </div>

          {/* قائمة الـ Tags المضافوة */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                {t("eventForm.addedTags")}:
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
            {t("eventForm.tagsHint")}
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
              {t("eventForm.settings")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("eventForm.settingsDescription")}
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
                  {t("eventForm.activeEvent")}
                </span>
              </div>
              <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">
                {t("eventForm.activeDescription")}
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
              {t("eventForm.saving")}
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