"use client";
import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { User, Star, MessageSquare, BookOpen, Image, Upload,
  Save, Rocket, X, Trash2, Globe, Award, ChevronDown,
  Search, Plus, AlertCircle, CheckCircle, CheckCircle2, Loader2 } from "lucide-react";

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
  image?: string;
  isManual?: boolean;
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

export default function TestimonialForm({ initial, onClose, onSaved }: Props) {
  const { t } = useI18n();

  const [form, setForm] = useState(() => ({
    studentName: initial?.studentName || "",
    studentImage: initial?.studentImage || "",
    studentId: initial?.userId || "",
    courseId: initial?.courseId || "",
    courseTitle: initial?.courseTitle || "",
    rating: initial?.rating || 5,
    comment: initial?.comment || "",
    featured: initial?.featured || false,
    isActive: initial?.isActive ?? true,
  }));

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(initial?.studentImage || "");

  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [manualStudents, setManualStudents] = useState<Student[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDisabled = loading || uploadingImage;

  useEffect(() => {
    const fetchStudents = async () => {
      setStudentsLoading(true);
      try {
        const res = await fetch("/api/students");
        const data = await res.json();
        if (data.success) setStudents(data.data || []);
      } catch (err) {
        console.error("Error fetching students:", err);
      } finally {
        setStudentsLoading(false);
      }
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowStudentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // sync preview when form.studentImage changes externally (e.g. student select)
  useEffect(() => {
    setImagePreview(form.studentImage || "");
  }, [form.studentImage]);

  const onChange = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ── Image upload ──
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("حجم الملف كبير جداً. الحد الأقصى 5MB");
      return;
    }
    // local preview immediately
    setImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);
    try {
      const url = await uploadImage(file, "testimonial-students");
      onChange("studentImage", url);
      setImagePreview(url);
    } catch (err: any) {
      alert(`خطأ في رفع الصورة: ${err.message}`);
      setImagePreview(initial?.studentImage || "");
      onChange("studentImage", initial?.studentImage || "");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const removeImage = () => {
    onChange("studentImage", "");
    setImagePreview("");
  };

  // ── Student selection ──
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );
  const filteredManual = manualStudents.filter((s) =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );
  const isNameInLists =
    studentSearch.trim() &&
    (filteredStudents.some(
      (s) => s.name.toLowerCase() === studentSearch.toLowerCase()
    ) ||
      filteredManual.some(
        (s) => s.name.toLowerCase() === studentSearch.toLowerCase()
      ));

  const handleStudentSelect = (student: Student) => {
    onChange("studentName", student.name);
    onChange("studentId", student.isManual ? "" : student._id);
    // لو الطالب عنده صورة في الـ DB، استخدمها — غير كده سيّب الصورة اللي رفعها المستخدم
    if (student.image && !student.isManual) {
      onChange("studentImage", student.image);
      setImagePreview(student.image);
    }
    setShowStudentDropdown(false);
    setStudentSearch("");
  };

  const handleAddManual = () => {
    if (!studentSearch.trim() || isNameInLists) return;
    const newStudent: Student = {
      _id: `manual_${Date.now()}`,
      name: studentSearch.trim(),
      email: "",
      role: "student",
      isManual: true,
    };
    setManualStudents((prev) => [...prev, newStudent]);
    handleStudentSelect(newStudent);
  };

  // ── Rating ──
  const renderStars = () =>
    Array.from({ length: 5 }, (_, i) => (
      <button
        key={i}
        type="button"
        onClick={() => onChange("rating", i + 1)}
        disabled={isDisabled}
        className="transition-transform duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded-full p-1"
      >
        <Star
          className={`w-8 h-8 ${
            i < form.rating
              ? "text-yellow-400 fill-yellow-400"
              : "text-gray-300 dark:text-gray-600"
          }`}
        />
      </button>
    ));

  // ── Submit ──
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentName.trim()) { alert("اسم الطالب مطلوب"); return; }
    if (!form.comment.trim() || form.comment.length < 10) {
      alert("التعليق مطلوب ويجب أن يكون 10 أحرف على الأقل");
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        studentName: form.studentName.trim(),
        studentImage: form.studentImage,
        courseId: form.courseId.trim(),
        courseTitle: form.courseTitle.trim(),
        rating: form.rating,
        comment: form.comment.trim(),
        featured: form.featured,
        isActive: form.isActive,
      };
      if (form.studentId && !form.studentId.startsWith("manual")) {
        payload.userId = form.studentId;
      }

      const method = initial?._id ? "PUT" : "POST";
      const url = initial?._id
        ? `/api/testimonials?id=${encodeURIComponent(initial._id)}`
        : "/api/testimonials";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let result;
      try {
        result = await res.json();
      } catch {
        throw new Error("Invalid response from server");
      }

      if (!res.ok) throw new Error(result.message || `HTTP error! status: ${res.status}`);
      if (!result.success) throw new Error(result.message || "Operation failed");

      onSaved();
      onClose();
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={submit} className="space-y-6">

      {/* ── 1. Student Information ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader
          icon={<User className="w-4 h-4 text-primary" />}
          iconBg="bg-primary/10"
          title={t("testimonials.form.studentInfo") || "Student Information"}
          desc={t("testimonials.form.studentInfoDescription") || "Enter student details and course information"}
        />

        {/* Student Search/Select */}
        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <User className="w-3 h-3 text-primary" />
            {t("testimonials.form.studentName") || "Student Name"} *
          </label>

          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={form.studentName}
                onChange={(e) => {
                  onChange("studentName", e.target.value);
                  setStudentSearch(e.target.value);
                }}
                onFocus={() => setShowStudentDropdown(true)}
                placeholder={t("testimonials.form.searchStudent") || "Search for student or enter name manually"}
                className="w-full px-3 py-2.5 pr-10 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200 disabled:opacity-50"
                required
                disabled={isDisabled}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {studentsLoading ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-SlateBlueText dark:text-darktext" />
                )}
              </div>
            </div>

            {showStudentDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-darkmode border border-PowderBlueBorder dark:border-dark_border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {/* Search inside dropdown */}
                <div className="p-2 border-b border-PowderBlueBorder dark:border-dark_border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-SlateBlueText dark:text-darktext" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search students..."
                      className="w-full pl-10 pr-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="py-1">
                  {/* Add manual entry */}
                  {studentSearch.trim() && !isNameInLists && (
                    <button
                      type="button"
                      onClick={handleAddManual}
                      className="w-full px-3 py-2 text-left hover:bg-PaleCyan dark:hover:bg-dark_input transition-colors flex items-center gap-3 text-primary border-b border-PowderBlueBorder dark:border-dark_border"
                    >
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Plus className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-13 font-medium text-MidnightNavyText dark:text-white">
                          Add &quot;{studentSearch}&quot; as manual entry
                        </p>
                        <p className="text-11 text-SlateBlueText dark:text-darktext">Create manual student entry</p>
                      </div>
                    </button>
                  )}

                  {/* DB students */}
                  {filteredStudents.length > 0 && (
                    <div>
                      <div className="px-3 py-1 bg-IcyBreeze dark:bg-dark_input">
                        <p className="text-11 font-medium text-SlateBlueText dark:text-darktext">Database Students</p>
                      </div>
                      {filteredStudents.map((student) => (
                        <button
                          key={student._id}
                          type="button"
                          onClick={() => handleStudentSelect(student)}
                          className="w-full px-3 py-2 text-left hover:bg-PaleCyan dark:hover:bg-dark_input transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                            {student.image ? (
                              <img src={student.image} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-13 font-medium text-MidnightNavyText dark:text-white truncate">{student.name}</p>
                            <p className="text-11 text-SlateBlueText dark:text-darktext truncate">{student.email}</p>
                          </div>
                          <span className="text-10 px-2 py-1 bg-primary/10 text-primary rounded-full">Student</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Manual entries */}
                  {filteredManual.length > 0 && (
                    <div>
                      <div className="px-3 py-1 bg-IcyBreeze dark:bg-dark_input">
                        <p className="text-11 font-medium text-SlateBlueText dark:text-darktext">Manual Entries</p>
                      </div>
                      {filteredManual.map((student) => (
                        <button
                          key={student._id}
                          type="button"
                          onClick={() => handleStudentSelect(student)}
                          className="w-full px-3 py-2 text-left hover:bg-PaleCyan dark:hover:bg-dark_input transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 bg-LightYellow/10 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-LightYellow" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-13 font-medium text-MidnightNavyText dark:text-white truncate">{student.name}</p>
                            <p className="text-11 text-SlateBlueText dark:text-darktext">Manual Entry</p>
                          </div>
                          <span className="text-10 px-2 py-1 bg-LightYellow/10 text-LightYellow rounded-full">Manual</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredStudents.length === 0 && filteredManual.length === 0 && !studentSearch.trim() && (
                    <p className="px-3 py-4 text-13 text-SlateBlueText dark:text-darktext text-center">No students found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Student type badge */}
          {form.studentName && (
            <div className="flex items-center gap-2 text-11">
              {form.studentId && !form.studentId.startsWith("manual") ? (
                <span className="px-2 py-1 bg-Aquamarine/10 text-Aquamarine rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Database Student
                </span>
              ) : (
                <span className="px-2 py-1 bg-LightYellow/10 text-LightYellow rounded-full flex items-center gap-1">
                  <User className="w-3 h-3" /> Manual Entry
                </span>
              )}
            </div>
          )}
        </div>

        {/* Student Image Upload */}
        <div className="space-y-3">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Image className="w-3 h-3 text-primary" />
            {t("testimonials.form.studentImage") || "Student Image"}
          </label>

          <div className="flex gap-4 items-start">
            {/* Preview */}
            {imagePreview && (
              <div className="relative w-20 h-20 shrink-0 rounded-full border-2 border-PowderBlueBorder dark:border-dark_border overflow-hidden group">
                <img src={imagePreview} alt="Student" className="w-full h-full object-cover" />
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
                {!uploadingImage && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label className="cursor-pointer p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition">
                      <Upload className="w-4 h-4 text-white" />
                      <input type="file" accept="image/*" onChange={handleFileChange} disabled={isDisabled} className="hidden" />
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 space-y-2">
              {/* URL input */}
              <input
                type="text"
                value={form.studentImage}
                onChange={(e) => {
                  onChange("studentImage", e.target.value);
                  setImagePreview(e.target.value);
                }}
                placeholder={t("testimonials.form.imageUrl") || "Paste image URL or upload file"}
                disabled={uploadingImage}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200 disabled:opacity-60"
              />

              {/* Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <label
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-12 font-medium transition-all duration-200 cursor-pointer select-none ${
                    isDisabled
                      ? "bg-primary/10 text-primary opacity-60 cursor-not-allowed"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  {uploadingImage ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> جاري الرفع...</>
                  ) : (
                    <><Upload className="w-3 h-3" /> رفع صورة</>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileChange} disabled={isDisabled} className="hidden" />
                </label>

                {imagePreview && !uploadingImage && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-12 font-medium hover:bg-red-500/20 transition-all duration-200"
                  >
                    <Trash2 className="w-3 h-3" /> حذف
                  </button>
                )}

                {imagePreview && !uploadingImage && form.studentImage.includes("cloudinary") && (
                  <span className="inline-flex items-center gap-1 text-11 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> تم الرفع
                  </span>
                )}
              </div>

              <p className="text-11 text-SlateBlueText dark:text-darktext">
                Max 5MB • JPEG, PNG, WebP
              </p>
            </div>
          </div>

          {/* Empty dropzone */}
          {!imagePreview && (
            <label
              className={`flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer ${
                isDisabled
                  ? "border-primary/30 bg-primary/5 cursor-not-allowed"
                  : "border-PowderBlueBorder dark:border-dark_border hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10"
              }`}
            >
              {uploadingImage ? (
                <>
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <p className="text-12 text-primary font-medium">جاري الرفع...</p>
                </>
              ) : (
                <>
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-12 text-SlateBlueText dark:text-darktext">
                    اسحب وأفلت أو <span className="text-primary font-medium">اختر ملفاً</span>
                  </p>
                </>
              )}
              <input type="file" accept="image/*" onChange={handleFileChange} disabled={isDisabled} className="hidden" />
            </label>
          )}
        </div>

        {/* Course info */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <BookOpen className="w-3 h-3 text-primary" />
              {t("testimonials.form.courseTitle") || "Course Title"}
            </label>
            <input
              type="text"
              value={form.courseTitle}
              onChange={(e) => onChange("courseTitle", e.target.value)}
              placeholder="e.g., Advanced React Patterns"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200 disabled:opacity-50"
              disabled={isDisabled}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <BookOpen className="w-3 h-3 text-primary" />
              {t("testimonials.form.courseId") || "Course ID"}
            </label>
            <input
              type="text"
              value={form.courseId}
              onChange={(e) => onChange("courseId", e.target.value)}
              placeholder="e.g., course_12345"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200 disabled:opacity-50"
              disabled={isDisabled}
            />
          </div>
        </div>
      </div>

      {/* ── 2. Rating & Feedback ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader
          icon={<Star className="w-4 h-4 text-LightYellow fill-current" />}
          iconBg="bg-LightYellow/10"
          title={t("testimonials.form.ratingFeedback") || "Rating & Feedback"}
          desc={t("testimonials.form.ratingDescription") || "Rate the course and share the student's experience"}
        />

        <div className="space-y-3">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
            {t("testimonials.form.rating") || "Rating"} *
          </label>
          <div className="flex items-center gap-2">
            {renderStars()}
            <span className="ml-4 text-lg font-bold text-MidnightNavyText dark:text-white">
              {form.rating}.0 / 5.0
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <MessageSquare className="w-3 h-3 text-LightYellow" />
            {t("testimonials.form.testimonialComment") || "Testimonial Comment"} *
          </label>
          <textarea
            value={form.comment}
            onChange={(e) => onChange("comment", e.target.value)}
            rows={4}
            placeholder="Share the student's feedback, experience, and success story..."
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 resize-none transition-all duration-200 disabled:opacity-50"
            required
            disabled={isDisabled}
          />
          <div className="flex justify-between text-11 text-SlateBlueText dark:text-darktext">
            <span>Minimum 10 characters</span>
            <span>{form.comment.length} characters</span>
          </div>
        </div>
      </div>

      {/* ── 3. Settings ── */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <SectionHeader
          icon={<Globe className="w-4 h-4 text-primary" />}
          iconBg="bg-primary/10"
          title={t("testimonials.form.settings") || "Settings"}
          desc={t("testimonials.form.settingsDescription") || "Configure testimonial visibility and features"}
        />

        <div className="space-y-3">
          <label className="flex items-center space-x-3 p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-IcyBreeze dark:hover:bg-dark_input transition-all duration-200 cursor-pointer group">
            <div className="w-8 h-8 bg-ElectricAqua/10 rounded flex items-center justify-center group-hover:bg-ElectricAqua/20 transition-colors">
              <Globe className="w-3 h-3 text-ElectricAqua" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => onChange("isActive", e.target.checked)}
                  className="w-4 h-4 text-ElectricAqua focus:ring-ElectricAqua border-PowderBlueBorder rounded disabled:opacity-50"
                  disabled={isDisabled}
                />
                <span className="text-13 font-medium text-MidnightNavyText dark:text-white">
                  {t("testimonials.form.activeTestimonial") || "Active Testimonial"}
                </span>
              </div>
              <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">
                {t("testimonials.form.activeDescription") || "Show this testimonial on the website"}
              </p>
            </div>
          </label>

          <label className="flex items-center space-x-3 p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-IcyBreeze dark:hover:bg-dark_input transition-all duration-200 cursor-pointer group">
            <div className="w-8 h-8 bg-Aquamarine/10 rounded flex items-center justify-center group-hover:bg-Aquamarine/20 transition-colors">
              <Award className="w-3 h-3 text-Aquamarine" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => onChange("featured", e.target.checked)}
                  className="w-4 h-4 text-Aquamarine focus:ring-Aquamarine border-PowderBlueBorder rounded disabled:opacity-50"
                  disabled={isDisabled}
                />
                <span className="text-13 font-medium text-MidnightNavyText dark:text-white">
                  {t("testimonials.form.featuredTestimonial") || "Featured Testimonial"}
                </span>
              </div>
              <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">
                {t("testimonials.form.featuredDescription") || "Highlight this testimonial as featured"}
              </p>
            </div>
          </label>
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
          disabled={isDisabled}
          className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> {t("testimonials.form.saving") || "Saving..."}</>
          ) : uploadingImage ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> جاري رفع الصورة...</>
          ) : initial ? (
            <><Save className="w-3 h-3" /> {t("testimonials.form.updateTestimonial") || "Update Testimonial"}</>
          ) : (
            <><Rocket className="w-3 h-3" /> {t("testimonials.form.createTestimonial") || "Create Testimonial"}</>
          )}
        </button>
      </div>
    </form>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────
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