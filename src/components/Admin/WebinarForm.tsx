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
} from "lucide-react";

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

export default function WebinarForm({ initial, onClose, onSaved }: Props) {
  // دالة لتحويل التاريخ من ISO إلى تنسيق datetime-local
  const formatDateTimeForInput = (dateTimeString: string) => {
    if (!dateTimeString) return "";
    try {
      const date = new Date(dateTimeString);
      return date.toISOString().slice(0, 16); // يزيل الثواني و .000Z
    } catch {
      return "";
    }
  };

  const [form, setForm] = useState(() => ({
    title: initial?.title || "",
    description: initial?.description || "",
    date: initial?.date || "",
    time: initial?.time || "",
    duration: initial?.duration || 60, // إضافة المدة
    image: initial?.image || "", // إضافة صورة الندوة
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
  const [webinarImagePreview, setWebinarImagePreview] = useState(""); // معاينة صورة الندوة
  const [speakers, setSpeakers] = useState<Speaker[]>(form.speakers);
  const [newSpeaker, setNewSpeaker] = useState<Speaker>({
    name: "",
    role: "",
    image: "",
  });
  const [speakerImagePreview, setSpeakerImagePreview] = useState("");

  // ✅ معاينة صورة المدرب
  useEffect(() => {
    if (form.instructorImage) {
      setInstructorImagePreview(form.instructorImage);
    }
  }, [form.instructorImage]);

  // ✅ معاينة صورة الندوة
  useEffect(() => {
    if (form.image) {
      setWebinarImagePreview(form.image);
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
        setNewSpeaker(prev => ({ ...prev, image: result }));
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

  // ✅ معالجة رفع صورة المدرب
  const handleInstructorImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // ✅ معالجة رفع صورة الندوة
  const handleWebinarImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setWebinarImagePreview(result);
        onChange("image", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // دالة لتحويل من datetime-local إلى ISO
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

      console.log("Sending webinar payload:", payload);

      const method = initial?._id ? "PUT" : "POST";
      
      // بناء الرابط الصحيح
      let url = "/api/webinars";
      if (initial?._id) {
        url = `/api/webinars?id=${encodeURIComponent(initial._id)}`;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // تحقق من حالة الرد أولاً
      if (!res.ok) {
        let errorMessage = `HTTP error! status: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // إذا فشل تحويل JSON، اقرأ النص العادي
          const text = await res.text();
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // إذا كان الرد ناجحاً، تابع
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
              Webinar Information
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              Basic details about the webinar
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Calendar className="w-3 h-3 text-primary" />
              Webinar Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => onChange("title", e.target.value)}
              placeholder="e.g., Advanced React Patterns"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <User className="w-3 h-3 text-primary" />
              Main Instructor *
            </label>
            <input
              type="text"
              value={form.instructor}
              onChange={(e) => onChange("instructor", e.target.value)}
              placeholder="Instructor name"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Calendar className="w-3 h-3 text-primary" />
            Description *
          </label>
          <textarea
            value={form.description}
            onChange={(e) => onChange("description", e.target.value)}
            rows={3}
            placeholder="Describe the webinar content, learning objectives, and target audience..."
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 resize-none transition-all duration-200"
            required
          />
        </div>

        {/* Webinar Image */}
        <div className="space-y-3">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Image className="w-3 h-3 text-primary" />
            Webinar Cover Image
          </label>
          
          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <input
                type="text"
                value={form.image}
                onChange={(e) => onChange("image", e.target.value)}
                placeholder="Image URL or upload file"
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              />
              <div className="mt-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-12 cursor-pointer hover:bg-primary/20 transition-colors">
                  <Upload className="w-3 h-3" />
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleWebinarImageUpload}
                    className="hidden"
                  />
                </label>
                {webinarImagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("image", "");
                      setWebinarImagePreview("");
                    }}
                    className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-12 cursor-pointer hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </button>
                )}
              </div>
            </div>
            
            {webinarImagePreview && (
              <div className="w-20 h-20 border border-PowderBlueBorder rounded-lg overflow-hidden">
                <img
                  src={webinarImagePreview}
                  alt="Webinar Preview"
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
              Schedule & Timing
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              Set date and time for the webinar
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Calendar className="w-3 h-3 text-Aquamarine" />
              Date *
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
              Time *
            </label>
            <input
              type="time"
              value={form.time}
              onChange={(e) => onChange("time", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Clock className="w-3 h-3 text-Aquamarine" />
              Duration (minutes)
            </label>
            <input
              type="number"
              value={form.duration}
              onChange={(e) => onChange("duration", parseInt(e.target.value) || 60)}
              min="1"
              placeholder="60"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </div>
        </div>

        {/* Registration Period */}
        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              Registration Start
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
              Registration End
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

      {/* باقي الكود يبقى كما هو بدون تغيير */}
      {/* Speakers */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-ElectricAqua/10 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-ElectricAqua" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              Speakers
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              Add multiple speakers for this webinar
            </p>
          </div>
        </div>

        {/* Add New Speaker */}
        <div className="space-y-3 p-4 bg-IcyBreeze dark:bg-dark_input rounded-lg">
          <h4 className="text-13 font-medium text-MidnightNavyText dark:text-white">
            Add New Speaker
          </h4>
          
          <div className="grid md:grid-cols-2 gap-3">
            <input
              type="text"
              value={newSpeaker.name}
              onChange={(e) => setNewSpeaker(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Speaker name"
              className="px-3 py-2 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13"
            />
            <input
              type="text"
              value={newSpeaker.role}
              onChange={(e) => setNewSpeaker(prev => ({ ...prev, role: e.target.value }))}
              placeholder="Role/Title"
              className="px-3 py-2 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13"
            />
          </div>

          {/* Speaker Image - URL or Upload */}
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              Speaker Image
            </label>
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <input
                  type="text"
                  value={newSpeaker.image}
                  onChange={(e) => {
                    setNewSpeaker(prev => ({ ...prev, image: e.target.value }));
                    setSpeakerImagePreview(e.target.value);
                  }}
                  placeholder="Image URL or upload file"
                  className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13"
                />
                <div className="mt-2 flex gap-2">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-12 cursor-pointer hover:bg-primary/20 transition-colors">
                    <Upload className="w-3 h-3" />
                    Upload Image
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
                        setNewSpeaker(prev => ({ ...prev, image: "" }));
                        setSpeakerImagePreview("");
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-12 cursor-pointer hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
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
            Add Speaker
          </button>
        </div>

        {/* Speakers List */}
        {speakers.length > 0 && (
          <div className="space-y-3">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              Added Speakers:
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
              Media & Registration
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              Instructor image and registration details
            </p>
          </div>
        </div>

        {/* Instructor Image */}
        <div className="space-y-3">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Image className="w-3 h-3 text-LightYellow" />
            Instructor Image
          </label>
          
          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <input
                type="text"
                value={form.instructorImage}
                onChange={(e) => onChange("instructorImage", e.target.value)}
                placeholder="Image URL or upload file"
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              />
              <div className="mt-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-12 cursor-pointer hover:bg-primary/20 transition-colors">
                  <Upload className="w-3 h-3" />
                  Upload Image
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
              CRM Registration URL
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
              Max Attendees
            </label>
            <input
              type="number"
              value={form.maxAttendees}
              onChange={(e) => onChange("maxAttendees", parseInt(e.target.value) || 100)}
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
              Tags
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              Add tags for better categorization and search
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
                placeholder="Enter a tag (e.g., React, JavaScript, Web Development)"
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
              Add
            </button>
          </div>

          {/* قائمة الـ Tags المضافوة */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                Added Tags:
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
            Press Enter or click Add to include multiple tags
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
              Settings
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              Webinar visibility and status
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
                  Active Webinar
                </span>
              </div>
              <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">
                Make this webinar visible and available for registration
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
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : initial ? (
            <>
              <Save className="w-3 h-3" />
              Update Webinar
            </>
          ) : (
            <>
              <Rocket className="w-3 h-3" />
              Create Webinar
            </>
          )}
        </button>
      </div>
    </form>
  );
}