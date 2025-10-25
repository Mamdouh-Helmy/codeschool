"use client";
import { useState, useEffect, useRef } from "react";
import {
  User,
  Star,
  MessageSquare,
  BookOpen,
  Image,
  Upload,
  Save,
  Rocket,
  X,
  Trash2,
  Globe,
  Award,
  ChevronDown,
  Search,
  Plus,
} from "lucide-react";

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
  isManual?: boolean; // إضافة علامة للطلاب اليدويين
}

export default function TestimonialForm({ initial, onClose, onSaved }: Props) {
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
  const [studentImagePreview, setStudentImagePreview] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [manualStudents, setManualStudents] = useState<Student[]>([]); // قائمة الطلاب اليدويين

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // جلب قائمة الطلاب من API
  useEffect(() => {
    const fetchStudents = async () => {
      setStudentsLoading(true);
      try {
        const res = await fetch("/api/students");
        const data = await res.json();
        if (data.success) {
          setStudents(data.data);
        }
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setStudentsLoading(false);
      }
    };

    fetchStudents();
  }, []);

  // إغلاق dropdown عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowStudentDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // معاينة صورة الطالب
  useEffect(() => {
    if (form.studentImage) {
      setStudentImagePreview(form.studentImage);
    }
  }, [form.studentImage]);

  const onChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // إضافة طالب يدوي إلى القائمة
  const addManualStudent = (name: string) => {
    if (name.trim() && !manualStudents.some(student => student.name === name.trim())) {
      const newManualStudent: Student = {
        _id: `manual_${Date.now()}`,
        name: name.trim(),
        email: "",
        role: "student",
        isManual: true
      };
      setManualStudents(prev => [...prev, newManualStudent]);
      return newManualStudent;
    }
    return null;
  };

  // اختيار طالب من القائمة
  const handleStudentSelect = (student: Student) => {
    onChange("studentName", student.name);
    onChange("studentId", student.isManual ? "" : student._id); // لا نضع ID للطلاب اليدويين
    
    if (student.image && !student.isManual) {
      onChange("studentImage", student.image);
      setStudentImagePreview(student.image);
    }
    
    setShowStudentDropdown(false);
    setStudentSearch("");
  };

  // معالجة تغيير الإدخال
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onChange("studentName", value);
    setStudentSearch(value);
  };

  // فتح/إغلاق dropdown
  const handleInputFocus = () => {
    setShowStudentDropdown(true);
  };

  // تصفية الطلاب حسب البحث
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // تصفية الطلاب اليدويين حسب البحث
  const filteredManualStudents = manualStudents.filter(student =>
    student.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // التحقق إذا كان الاسم المدخل موجودًا في القوائم
  const isNameInLists = studentSearch.trim() && 
    (filteredStudents.some(student => student.name.toLowerCase() === studentSearch.toLowerCase()) ||
     filteredManualStudents.some(student => student.name.toLowerCase() === studentSearch.toLowerCase()));

  // إضافة الاسم المدخل إلى القائمة
  const handleAddManualStudent = () => {
    if (studentSearch.trim() && !isNameInLists) {
      const newStudent = addManualStudent(studentSearch);
      if (newStudent) {
        handleStudentSelect(newStudent);
      }
    }
  };

  // معالجة رفع صورة الطالب
  const handleStudentImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setStudentImagePreview(result);
        onChange("studentImage", result);
      };
      reader.readAsDataURL(file);
    }
  };

  // إنشاء النجوم للتقييم
  const renderRatingStars = () => {
    return Array.from({ length: 5 }, (_, index) => (
      <button
        key={index}
        type="button"
        onClick={() => onChange("rating", index + 1)}
        className="transition-transform duration-200 hover:scale-110 active:scale-95"
      >
        <Star
          className={`w-8 h-8 ${
            index < form.rating
              ? "text-yellow-400 fill-yellow-400"
              : "text-gray-300 dark:text-gray-600"
          }`}
        />
      </button>
    ));
  };

 const submit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    // جلب token المستخدم الحالي
    const getToken = () => {
      return document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
    };

    // بناء payload آمن
    const payload: any = { 
      studentName: form.studentName,
      studentImage: form.studentImage,
      courseId: form.courseId,
      courseTitle: form.courseTitle,
      rating: form.rating,
      comment: form.comment,
      featured: form.featured,
      isActive: form.isActive
    };

    // إضافة userId - إذا كان موجودًا نستخدمه، وإلا سيستخدم الـ API القيمة الافتراضية
    if (form.studentId && form.studentId.trim() !== "") {
      payload.userId = form.studentId;
    }

    console.log("Sending testimonial payload:", payload);

    const method = initial?._id ? "PUT" : "POST";
    
    let url = "/api/testimonials";
    if (initial?._id) {
      url = `/api/testimonials?id=${encodeURIComponent(initial._id)}`;
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
      {/* Student Information */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              Student Information
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              Select a student from database or enter name manually
            </p>
          </div>
        </div>

        {/* Student Selection */}
        <div className="space-y-3">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <User className="w-3 h-3 text-primary" />
            Student Name *
          </label>
          
          <div className="relative" ref={dropdownRef}>
            {/* Input مع dropdown */}
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={form.studentName}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                placeholder="Search for a student or enter name manually"
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200 pr-10"
                required
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {studentsLoading ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <ChevronDown className="w-4 h-4 text-SlateBlueText dark:text-darktext" />
                )}
              </div>
            </div>

            {/* Dropdown List */}
            {showStudentDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-darkmode border border-PowderBlueBorder dark:border-dark_border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {/* Search Header */}
                <div className="p-2 border-b border-PowderBlueBorder dark:border-dark_border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-SlateBlueText dark:text-darktext" />
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

                {/* Students List */}
                <div className="py-1">
                  {/* زر إضافة الاسم المدخل */}
                  {studentSearch.trim() && !isNameInLists && (
                    <button
                      type="button"
                      onClick={handleAddManualStudent}
                      className="w-full px-3 py-2 text-left hover:bg-PaleCyan dark:hover:bg-dark_input transition-colors duration-200 flex items-center gap-3 text-primary border-b border-PowderBlueBorder dark:border-dark_border"
                    >
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Plus className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-13 font-medium text-MidnightNavyText dark:text-white">
                          Add "{studentSearch}"
                        </p>
                        <p className="text-11 text-SlateBlueText dark:text-darktext">
                          Create new student entry
                        </p>
                      </div>
                    </button>
                  )}

                  {/* الطلاب من قاعدة البيانات */}
                  {filteredStudents.length > 0 && (
                    <div className="border-b border-PowderBlueBorder dark:border-dark_border">
                      <div className="px-3 py-1 bg-IcyBreeze dark:bg-dark_input">
                        <p className="text-11 font-medium text-SlateBlueText dark:text-darktext">
                          DATABASE STUDENTS
                        </p>
                      </div>
                      {filteredStudents.map((student) => (
                        <button
                          key={student._id}
                          type="button"
                          onClick={() => handleStudentSelect(student)}
                          className="w-full px-3 py-2 text-left hover:bg-PaleCyan dark:hover:bg-dark_input transition-colors duration-200 flex items-center gap-3"
                        >
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            {student.image ? (
                              <img
                                src={student.image}
                                alt={student.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-13 font-medium text-MidnightNavyText dark:text-white truncate">
                              {student.name}
                            </p>
                            <p className="text-11 text-SlateBlueText dark:text-darktext truncate">
                              {student.email}
                            </p>
                          </div>
                          <span className="text-10 px-2 py-1 bg-primary/10 text-primary rounded-full">
                            Student
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* الطلاب اليدويين */}
                  {filteredManualStudents.length > 0 && (
                    <div>
                      <div className="px-3 py-1 bg-IcyBreeze dark:bg-dark_input">
                        <p className="text-11 font-medium text-SlateBlueText dark:text-darktext">
                          MANUAL ENTRIES
                        </p>
                      </div>
                      {filteredManualStudents.map((student) => (
                        <button
                          key={student._id}
                          type="button"
                          onClick={() => handleStudentSelect(student)}
                          className="w-full px-3 py-2 text-left hover:bg-PaleCyan dark:hover:bg-dark_input transition-colors duration-200 flex items-center gap-3"
                        >
                          <div className="w-8 h-8 bg-LightYellow/10 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-LightYellow" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-13 font-medium text-MidnightNavyText dark:text-white truncate">
                              {student.name}
                            </p>
                            <p className="text-11 text-SlateBlueText dark:text-darktext">
                              Manual entry
                            </p>
                          </div>
                          <span className="text-10 px-2 py-1 bg-LightYellow/10 text-LightYellow rounded-full">
                            Manual
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* لا توجد نتائج */}
                  {filteredStudents.length === 0 && filteredManualStudents.length === 0 && !studentSearch.trim() && (
                    <div className="px-3 py-2 text-13 text-SlateBlueText dark:text-darktext text-center">
                      No students found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Student Status Display */}
          {form.studentId && (
            <div className="flex items-center gap-2 text-11 text-SlateBlueText dark:text-darktext">
              <span className="px-2 py-1 bg-Aquamarine/10 text-Aquamarine rounded-full">
                Database Student
              </span>
              <span>Linked to user account</span>
            </div>
          )}

          {!form.studentId && form.studentName && (
            <div className="flex items-center gap-2 text-11 text-SlateBlueText dark:text-darktext">
              <span className="px-2 py-1 bg-LightYellow/10 text-LightYellow rounded-full">
                Manual Entry
              </span>
              <span>Student added manually</span>
            </div>
          )}
        </div>

        {/* باقي المكونات كما هي */}
        {/* Student Image */}
        <div className="space-y-3">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Image className="w-3 h-3 text-primary" />
            Student Image
          </label>
          
          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <input
                type="text"
                value={form.studentImage}
                onChange={(e) => onChange("studentImage", e.target.value)}
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
                    onChange={handleStudentImageUpload}
                    className="hidden"
                  />
                </label>
                {studentImagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("studentImage", "");
                      setStudentImagePreview("");
                    }}
                    className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-12 cursor-pointer hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </button>
                )}
              </div>
            </div>
            
            {studentImagePreview && (
              <div className="w-20 h-20 border border-PowderBlueBorder rounded-lg overflow-hidden">
                <img
                  src={studentImagePreview}
                  alt="Student Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {/* Course Information */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <BookOpen className="w-3 h-3 text-primary" />
              Course Title
            </label>
            <input
              type="text"
              value={form.courseTitle}
              onChange={(e) => onChange("courseTitle", e.target.value)}
              placeholder="e.g., Advanced React Patterns"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <BookOpen className="w-3 h-3 text-primary" />
              Course ID (Optional)
            </label>
            <input
              type="text"
              value={form.courseId}
              onChange={(e) => onChange("courseId", e.target.value)}
              placeholder="e.g., course_12345"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </div>
        </div>
      </div>
      {/* Rating & Feedback */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-LightYellow/10 rounded-lg flex items-center justify-center">
            <Star className="w-4 h-4 text-LightYellow fill-current" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              Rating & Feedback
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              Student rating and testimonial content
            </p>
          </div>
        </div>

        {/* Rating */}
        <div className="space-y-3">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
            Rating *
          </label>
          <div className="flex items-center gap-2">
            {renderRatingStars()}
            <span className="ml-4 text-lg font-bold text-MidnightNavyText dark:text-white">
              {form.rating}.0 / 5.0
            </span>
          </div>
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <MessageSquare className="w-3 h-3 text-LightYellow" />
            Testimonial Comment *
          </label>
          <textarea
            value={form.comment}
            onChange={(e) => onChange("comment", e.target.value)}
            rows={4}
            placeholder="Share the student's feedback, experience, and success story..."
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 resize-none transition-all duration-200"
            required
          />
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
              Testimonial visibility and features
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Active Status */}
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
                  className="w-4 h-4 text-ElectricAqua focus:ring-ElectricAqua border-PowderBlueBorder rounded"
                />
                <span className="text-13 font-medium text-MidnightNavyText dark:text-white">
                  Active Testimonial
                </span>
              </div>
              <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">
                Make this testimonial visible on the website
              </p>
            </div>
          </label>

          {/* Featured Status */}
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
                  className="w-4 h-4 text-Aquamarine focus:ring-Aquamarine border-PowderBlueBorder rounded"
                />
                <span className="text-13 font-medium text-MidnightNavyText dark:text-white">
                  Featured Testimonial
                </span>
              </div>
              <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">
                Highlight this testimonial as a featured review
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
              Update Testimonial
            </>
          ) : (
            <>
              <Rocket className="w-3 h-3" />
              Create Testimonial
            </>
          )}
        </button>
      </div>
    </form>
  );
}