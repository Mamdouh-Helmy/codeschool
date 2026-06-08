"use client";
import { useState, useEffect } from "react";
import {
  FileText, Image, Link, User, X, Save, Rocket, Upload,
  Film, Globe, ChevronDown, Plus, Trash2, Loader2, CheckCircle2,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

interface Props {
  initial?: any;
  onClose: () => void;
  onSaved: () => void;
}

interface Student {
  _id: string;
  name: string;
  email: string;
  role: string;
}

async function uploadImage(file: File, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  const res = await fetch("/api/upload-image", { method: "POST", body: formData });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Upload failed");
  return data.imageUrl;
}

export default function ProjectForm({ initial, onClose, onSaved }: Props) {
  const { t } = useI18n();

  const [form, setForm] = useState(() => ({
    title: initial?.title || "",
    description: initial?.description || "",
    image: initial?.image || "",
    video: initial?.video || "",
    portfolioLink: initial?.portfolioLink || "",
    student: initial?.student || "",
    technologies: initial?.technologies || [],
    featured: initial?.featured || false,
    isActive: initial?.isActive ?? true,
  }));

  const [technologies, setTechnologies] = useState<string[]>(initial?.technologies || []);
  const [newTechInput, setNewTechInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(initial?.image || "");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const isDisabled = loading || uploadingImage;

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch("/api/students", { cache: "no-store" });
        const json = await res.json();
        if (json.success) {
          setStudents(json.data);
          if (initial?.student?.id) {
            const found = json.data.find((s: Student) => s._id === initial.student.id);
            if (found) setSelectedStudent(found);
          }
        }
      } catch (err) {
        console.error("Error fetching students:", err);
      } finally {
        setStudentsLoading(false);
      }
    };
    fetchStudents();
  }, [initial]);

  const onChange = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleStudentSelect = (student: Student | null) => {
    setSelectedStudent(student);
    setForm((prev) => ({
      ...prev,
      student: student
        ? { id: student._id, name: student.name, email: student.email, role: student.role }
        : "",
    }));
  };

  // ── Technologies ──
  const addTechnology = () => {
    const tech = newTechInput.trim();
    if (tech && !technologies.includes(tech)) {
      const next = [...technologies, tech];
      setTechnologies(next);
      setNewTechInput("");
      onChange("technologies", next);
    }
  };
  const removeTechnology = (index: number) => {
    const next = technologies.filter((_, i) => i !== index);
    setTechnologies(next);
    onChange("technologies", next);
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); addTechnology(); }
  };

  // ── Image upload ──
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("حجم الملف كبير جداً. الحد الأقصى 5MB");
      return;
    }
    setImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);
    try {
      const url = await uploadImage(file, "project-covers");
      onChange("image", url);
      setImagePreview(url);
    } catch (err: any) {
      alert(`خطأ في رفع الصورة: ${err.message}`);
      setImagePreview(initial?.image || "");
      onChange("image", initial?.image || "");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const removeImage = () => {
    onChange("image", "");
    setImagePreview("");
  };

  // ── Submit ──
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      alert(t("project.selectStudent") || "Please select a student");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        technologies,
        student: {
          id: selectedStudent._id,
          name: selectedStudent.name,
          email: selectedStudent.email,
          role: selectedStudent.role,
        },
      };

      const method = initial?._id ? "PUT" : "POST";
      const url = initial?._id ? `/api/projects/${initial._id}` : "/api/projects";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSaved();
        onClose();
      } else {
        const errorData = await res.json();
        alert(`Failed to save project: ${errorData.message}`);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("An error occurred while saving the project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">

      {/* ── 1. Basic Information ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader
          icon={<FileText className="w-4 h-4 text-primary" />}
          iconBg="bg-primary/10"
          title={t("project.basicInfo") || "Project Information"}
          desc={t("project.basicInfoDescription") || "Basic details about the student project"}
        />

        <div className="grid md:grid-cols-2 gap-4">
          {/* Title */}
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <FileText className="w-3 h-3 text-primary" />
              {t("project.title") || "Project Title"} *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => onChange("title", e.target.value)}
              placeholder={t("project.titlePlaceholder") || "e.g., E-commerce Website"}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              required
            />
          </div>

          {/* Student Select */}
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <User className="w-3 h-3 text-primary" />
              {t("project.selectStudent") || "Select Student"} *
            </label>
            <div className="relative">
              <select
                value={selectedStudent?._id || ""}
                onChange={(e) => {
                  const student = students.find((s) => s._id === e.target.value) || null;
                  handleStudentSelect(student);
                }}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200 appearance-none pr-10 disabled:opacity-50"
                required
                disabled={studentsLoading || isDisabled}
              >
                <option value="">{t("project.chooseStudent") || "Choose a student..."}</option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.email})
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                {studentsLoading
                  ? <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  : <ChevronDown className="w-4 h-4 text-SlateBlueText dark:text-darktext" />
                }
              </div>
            </div>
            {selectedStudent && (
              <div className="p-2 bg-IcyBreeze dark:bg-dark_input rounded-lg">
                <p className="text-12 text-MidnightNavyText dark:text-white font-medium">{selectedStudent.name}</p>
                <p className="text-11 text-SlateBlueText dark:text-darktext">{selectedStudent.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <FileText className="w-3 h-3 text-primary" />
            {t("project.description") || "Description"} *
          </label>
          <textarea
            value={form.description}
            onChange={(e) => onChange("description", e.target.value)}
            rows={3}
            placeholder={t("project.descriptionPlaceholder") || "Describe the project, technologies used, and achievements..."}
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 resize-none transition-all duration-200"
            required
          />
        </div>
      </div>

      {/* ── 2. Technologies ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader
          icon={<Globe className="w-4 h-4 text-ElectricAqua" />}
          iconBg="bg-ElectricAqua/10"
          title={t("project.technologies") || "Technologies"}
          desc={t("project.technologiesDescription") || "Add technologies used in this project"}
        />

        <div className="flex gap-2">
          <input
            type="text"
            value={newTechInput}
            onChange={(e) => setNewTechInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t("project.technologiesPlaceholder") || "e.g., React, Node.js"}
            className="flex-1 px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
          />
          <button
            type="button"
            onClick={addTechnology}
            disabled={!newTechInput.trim()}
            className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-13 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("common.add") || "Add"}
          </button>
        </div>

        {technologies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {technologies.map((tech, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white px-3 py-1.5 rounded-lg text-13 border border-PowderBlueBorder/50 dark:border-dark_border/50"
              >
                <span>{tech}</span>
                <button type="button" onClick={() => removeTechnology(index)} className="text-red-500 hover:text-red-700 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-11 text-SlateBlueText dark:text-darktext">
          {t("project.technologiesHint") || "Press Enter or click Add to include multiple technologies"}
        </p>
      </div>

      {/* ── 3. Media & Links ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader
          icon={<Image className="w-4 h-4 text-Aquamarine" />}
          iconBg="bg-Aquamarine/10"
          title={t("project.mediaLinks") || "Media & Links"}
          desc={t("project.mediaLinksDescription") || "Upload images, videos, and portfolio links"}
        />

        {/* Project Image */}
        <div className="space-y-3">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Image className="w-3 h-3 text-Aquamarine" />
            {t("project.coverImage") || "Project Image"}
          </label>

          <div className="flex gap-4 items-start">
            {/* Preview */}
            {imagePreview && (
              <div className="relative w-24 h-24 shrink-0 rounded-xl border-2 border-PowderBlueBorder dark:border-dark_border overflow-hidden group">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
                {!uploadingImage && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label className="cursor-pointer p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition">
                      <Upload className="w-4 h-4 text-white" />
                      <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isDisabled} className="hidden" />
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={form.image}
                onChange={(e) => { onChange("image", e.target.value); setImagePreview(e.target.value); }}
                placeholder={t("project.imagePlaceholder") || "Image URL or upload file"}
                disabled={uploadingImage}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200 disabled:opacity-60"
              />

              <div className="flex items-center gap-2 flex-wrap">
                <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-12 font-medium transition-all duration-200 cursor-pointer select-none ${
                  isDisabled ? "bg-primary/10 text-primary opacity-60 cursor-not-allowed" : "bg-primary/10 text-primary hover:bg-primary/20"
                }`}>
                  {uploadingImage
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> جاري الرفع...</>
                    : <><Upload className="w-3 h-3" /> رفع صورة</>
                  }
                  <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isDisabled} className="hidden" />
                </label>

                {imagePreview && !uploadingImage && (
                  <button type="button" onClick={removeImage} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-12 font-medium hover:bg-red-500/20 transition-all duration-200">
                    <Trash2 className="w-3 h-3" /> حذف
                  </button>
                )}

                {imagePreview && !uploadingImage && form.image.includes("cloudinary") && (
                  <span className="inline-flex items-center gap-1 text-11 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> تم الرفع
                  </span>
                )}
              </div>

              <p className="text-11 text-SlateBlueText dark:text-darktext">Max 5MB • JPEG, PNG, WebP</p>
            </div>
          </div>

          {/* Empty dropzone */}
          {!imagePreview && (
            <label className={`flex flex-col items-center justify-center gap-2 w-full h-28 border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer ${
              isDisabled
                ? "border-primary/30 bg-primary/5 cursor-not-allowed"
                : "border-PowderBlueBorder dark:border-dark_border hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10"
            }`}>
              {uploadingImage ? (
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
                  <p className="text-11 text-SlateBlueText/70 dark:text-darktext/70">Max 5MB • JPEG, PNG, WebP</p>
                </>
              )}
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isDisabled} className="hidden" />
            </label>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Film className="w-3 h-3 text-Aquamarine" />
              {t("project.videoUrl") || "Video URL"}
            </label>
            <input
              type="url"
              value={form.video}
              onChange={(e) => onChange("video", e.target.value)}
              placeholder="https://youtube.com/..."
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Link className="w-3 h-3 text-Aquamarine" />
              {t("project.portfolioLink") || "Portfolio Link"}
            </label>
            <input
              type="url"
              value={form.portfolioLink}
              onChange={(e) => onChange("portfolioLink", e.target.value)}
              placeholder="https://portfolio.com..."
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {/* ── 4. Settings ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader
          icon={<Save className="w-4 h-4 text-primary" />}
          iconBg="bg-primary/10"
          title={t("project.settings") || "Settings"}
          desc={t("project.settingsDescription") || "Project visibility and status"}
        />

        <div className="space-y-3">
          <CheckboxRow
            icon={<Rocket className="w-3 h-3 text-primary" />}
            iconBg="bg-primary/10 group-hover:bg-primary/20"
            checked={form.featured}
            onChange={(v) => onChange("featured", v)}
            label={t("project.featuredProject") || "Featured Project"}
            desc={t("project.featuredDescription") || "Highlight this project as featured in the YoungStars section"}
            checkColor="text-primary focus:ring-primary"
          />
          <CheckboxRow
            icon={<Save className="w-3 h-3 text-Aquamarine" />}
            iconBg="bg-Aquamarine/10 group-hover:bg-Aquamarine/20"
            checked={form.isActive}
            onChange={(v) => onChange("isActive", v)}
            label={t("project.activeProject") || "Active Project"}
            desc={t("project.activeDescription") || "Make this project visible to users in the YoungStars section"}
            checkColor="text-Aquamarine focus:ring-Aquamarine"
          />
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
        <button
          type="button"
          onClick={onClose}
          disabled={isDisabled}
          className="flex-1 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 hover:bg-IcyBreeze dark:hover:bg-darklight hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="w-3 h-3" />
          {t("common.cancel") || "Cancel"}
        </button>
        <button
          type="submit"
          disabled={isDisabled || !selectedStudent}
          className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> {t("common.saving") || "Saving..."}</>
          ) : uploadingImage ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> جاري رفع الصورة...</>
          ) : initial ? (
            <><Save className="w-3 h-3" /> {t("project.updateProject") || "Update Project"}</>
          ) : (
            <><Rocket className="w-3 h-3" /> {t("projects.createProject") || "Create Project"}</>
          )}
        </button>
      </div>
    </form>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, iconBg, title, desc }: {
  icon: React.ReactNode; iconBg: string; title: string; desc?: string;
}) {
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

function CheckboxRow({ icon, iconBg, checked, onChange, label, desc, checkColor }: {
  icon: React.ReactNode; iconBg: string; checked: boolean;
  onChange: (v: boolean) => void; label: string; desc: string; checkColor: string;
}) {
  return (
    <label className="flex items-center space-x-3 p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-IcyBreeze dark:hover:bg-dark_input transition-all duration-200 cursor-pointer group">
      <div className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${iconBg}`}>{icon}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className={`w-4 h-4 border-PowderBlueBorder rounded ${checkColor}`}
          />
          <span className="text-13 font-medium text-MidnightNavyText dark:text-white">{label}</span>
        </div>
        <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">{desc}</p>
      </div>
    </label>
  );
}