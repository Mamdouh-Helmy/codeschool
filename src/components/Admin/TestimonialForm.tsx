"use client";
import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/i18n/I18nProvider";

// استيراد الأيقونات بشكل منفرد لتجنب مشاكل التحسين
import { User } from "lucide-react";
import { Star } from "lucide-react";
import { MessageSquare } from "lucide-react";
import { BookOpen } from "lucide-react";
import { Image } from "lucide-react";
import { Upload } from "lucide-react";
import { Save } from "lucide-react";
import { Rocket } from "lucide-react";
import { X } from "lucide-react";
import { Trash2 } from "lucide-react";
import { Globe } from "lucide-react";
import { Award } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { Search } from "lucide-react";
import { Plus } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { CheckCircle } from "lucide-react";

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

// دالة لضغط الصور - تم إصلاحها
const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      // استخدام Image constructor بشكل صحيح
      const img = new window.Image(); // استخدام window.Image بدلاً من Image فقط
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // إضافة خلفية بيضاء للصور الشفافة
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        ctx.drawImage(img, 0, 0, width, height);
        
        try {
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// دالة للتحقق من حجم الصورة
const checkImageSize = (dataUrl: string): { isValid: boolean; sizeMB: number } => {
  if (!dataUrl || !dataUrl.includes(',')) {
    return { isValid: false, sizeMB: 0 };
  }
  
  try {
    const base64 = dataUrl.split(',')[1];
    const sizeInBytes = (base64.length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    return { 
      isValid: sizeInMB <= 3, // الحد الأقصى 3MB
      sizeMB: parseFloat(sizeInMB.toFixed(2))
    };
  } catch (error) {
    return { isValid: false, sizeMB: 0 };
  }
};

// دالة لتحسين معالجة URLs
const optimizeImageUrl = (url: string): string => {
  if (!url) return "";
  
  // إذا كانت data URL كبيرة جداً، نعيدها كما هي مع تحذير
  if (url.startsWith('data:image') && url.length > 1000000) {
    console.warn("Large image data URL detected");
    return url;
  }
  
  // تنظيف URLs العادية
  if (url.startsWith('http')) {
    return url.trim();
  }
  
  // إضافة / للأصول المحلية
  if (url && !url.startsWith('/') && !url.startsWith('data:')) {
    return `/${url}`;
  }
  
  return url.trim();
};

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
  const [manualStudents, setManualStudents] = useState<Student[]>([]); 
  const [imageError, setImageError] = useState<string>("");
  const [imageInfo, setImageInfo] = useState<{ sizeMB: number; isValid: boolean } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const { t } = useI18n();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      setStudentsLoading(true);
      try {
        const res = await fetch("/api/students");
        if (!res.ok) throw new Error("Failed to fetch students");
        
        const data = await res.json();
        if (data.success) {
          setStudents(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching students:", error);
        // نستمر حتى لو فشل تحميل الطلاب
      } finally {
        setStudentsLoading(false);
      }
    };

    fetchStudents();
  }, []);

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

  useEffect(() => {
    if (form.studentImage) {
      const optimizedUrl = optimizeImageUrl(form.studentImage);
      setStudentImagePreview(optimizedUrl);
      
      // التحقق من حجم الصورة إذا كانت base64
      if (optimizedUrl.startsWith('data:')) {
        const sizeCheck = checkImageSize(optimizedUrl);
        setImageInfo(sizeCheck);
        if (!sizeCheck.isValid) {
          setImageError(`Image size (${sizeCheck.sizeMB}MB) is too large. Maximum is 3MB.`);
        } else {
          setImageError("");
        }
      } else {
        setImageInfo(null);
        setImageError("");
      }
    } else {
      setStudentImagePreview("");
      setImageInfo(null);
      setImageError("");
    }
  }, [form.studentImage]);

  const onChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

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

  const handleStudentSelect = (student: Student) => {
    onChange("studentName", student.name);
    onChange("studentId", student.isManual ? "" : student._id);
    
    if (student.image && !student.isManual) {
      const optimizedImage = optimizeImageUrl(student.image);
      onChange("studentImage", optimizedImage);
    } else {
      onChange("studentImage", "");
    }
    
    setShowStudentDropdown(false);
    setStudentSearch("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onChange("studentName", value);
    setStudentSearch(value);
  };

  const handleInputFocus = () => {
    setShowStudentDropdown(true);
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredManualStudents = manualStudents.filter(student =>
    student.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const isNameInLists = studentSearch.trim() && 
    (filteredStudents.some(student => student.name.toLowerCase() === studentSearch.toLowerCase()) ||
     filteredManualStudents.some(student => student.name.toLowerCase() === studentSearch.toLowerCase()));

  const handleAddManualStudent = () => {
    if (studentSearch.trim() && !isNameInLists) {
      const newStudent = addManualStudent(studentSearch);
      if (newStudent) {
        handleStudentSelect(newStudent);
      }
    }
  };

  const handleStudentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError("");
    setUploadProgress(0);
    setImageInfo(null);

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      setImageError("Please select a valid image file (JPEG, PNG, WebP, etc.)");
      return;
    }

    // التحقق من الحجم (5MB كحد أقصى قبل الضغط)
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image size should be less than 5MB before compression");
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(10);
      
      // محاكاة التقدم
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      // ضغط الصورة
      const compressedImage = await compressImage(file);
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // التحقق من الحجم بعد الضغط
      const sizeCheck = checkImageSize(compressedImage);
      setImageInfo(sizeCheck);
      
      if (!sizeCheck.isValid) {
        setImageError(`Image is too large after compression (${sizeCheck.sizeMB}MB). Please try a smaller image.`);
        return;
      }

      const optimizedImage = optimizeImageUrl(compressedImage);
      setStudentImagePreview(optimizedImage);
      onChange("studentImage", optimizedImage);
      
      setTimeout(() => setUploadProgress(0), 1000);
      
    } catch (error) {
      console.error("Error processing image:", error);
      setImageError("Failed to process image. Please try again with a different image.");
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    const optimizedUrl = optimizeImageUrl(url);
    onChange("studentImage", optimizedUrl);
  };

  const removeImage = () => {
    onChange("studentImage", "");
    setStudentImagePreview("");
    setImageError("");
    setImageInfo(null);
    setUploadProgress(0);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const renderRatingStars = () => {
    return Array.from({ length: 5 }, (_, index) => (
      <button
        key={index}
        type="button"
        onClick={() => onChange("rating", index + 1)}
        className="transition-transform duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded-full p-1"
        disabled={loading}
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

  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!form.studentName.trim()) {
      errors.push("Student name is required");
    }

    if (!form.comment.trim()) {
      errors.push("Testimonial comment is required");
    }

    if (form.comment.length < 10) {
      errors.push("Comment should be at least 10 characters long");
    }

    if (form.rating < 1 || form.rating > 5) {
      errors.push("Rating must be between 1 and 5");
    }

    if (form.studentImage) {
      const sizeCheck = checkImageSize(form.studentImage);
      if (!sizeCheck.isValid) {
        errors.push(`Image size (${sizeCheck.sizeMB}MB) is too large. Maximum is 3MB.`);
      }
    }

    return { isValid: errors.length === 0, errors };
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateForm();
    if (!validation.isValid) {
      alert(`Please fix the following errors:\n${validation.errors.join('\n')}`);
      return;
    }

    setLoading(true);
    setImageError("");

    try {
      const payload: any = { 
        studentName: form.studentName.trim(),
        studentImage: form.studentImage,
        courseId: form.courseId.trim(),
        courseTitle: form.courseTitle.trim(),
        rating: form.rating,
        comment: form.comment.trim(),
        featured: form.featured,
        isActive: form.isActive
      };

      if (form.studentId && form.studentId.trim() !== "" && form.studentId !== "manual") {
        payload.userId = form.studentId;
      }

      const method = initial?._id ? "PUT" : "POST";
      
      let url = "/api/testimonials";
      if (initial?._id) {
        url = `/api/testimonials?id=${encodeURIComponent(initial._id)}`;
      }

      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // معالجة الـ response بشكل آمن
      let result;
      try {
        const responseText = await res.text();
        result = responseText ? JSON.parse(responseText) : { success: false, message: "Empty response" };
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        throw new Error("Invalid response from server");
      }

      if (!res.ok) {
        throw new Error(result.message || `HTTP error! status: ${res.status}`);
      }

      if (result.success) {
        onSaved();
        onClose();
      } else {
        throw new Error(result.message || "Operation failed");
      }
    } catch (err: any) {
      console.error("Error:", err);
      
      if (err.message.includes("413") || err.message.includes("Request Entity Too Large")) {
        setImageError("Image is too large. Please use a smaller image or compress it before uploading.");
        alert("Image is too large. Please use a smaller image or compress it before uploading.");
      } else if (err.message.includes("401")) {
        alert("Session expired. Please log in again.");
      } else {
        alert(`An error occurred: ${err.message}`);
      }
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
              {t("testimonials.form.studentInfo") || "Student Information"}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("testimonials.form.studentInfoDescription") || "Enter student details and course information"}
            </p>
          </div>
        </div>

        {/* Student Selection */}
        <div className="space-y-3">
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
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                placeholder={t("testimonials.form.searchStudent") || "Search for student or enter name manually"}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200 pr-10 disabled:opacity-50"
                required
                disabled={loading}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {studentsLoading ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <ChevronDown className="w-4 h-4 text-SlateBlueText dark:text-darktext" />
                )}
              </div>
            </div>

            {showStudentDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-darkmode border border-PowderBlueBorder dark:border-dark_border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2 border-b border-PowderBlueBorder dark:border-dark_border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-SlateBlueText dark:text-darktext" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder={t("testimonials.dropdown.searchStudents") || "Search students..."}
                      className="w-full pl-10 pr-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="py-1">
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
                          {t("testimonials.dropdown.addStudent", { name: studentSearch }) || `Add "${studentSearch}" as manual entry`}
                        </p>
                        <p className="text-11 text-SlateBlueText dark:text-darktext">
                          {t("testimonials.dropdown.createEntry") || "Create manual student entry"}
                        </p>
                      </div>
                    </button>
                  )}

                  {filteredStudents.length > 0 && (
                    <div className="border-b border-PowderBlueBorder dark:border-dark_border">
                      <div className="px-3 py-1 bg-IcyBreeze dark:bg-dark_input">
                        <p className="text-11 font-medium text-SlateBlueText dark:text-darktext">
                          {t("testimonials.dropdown.databaseStudents") || "Database Students"}
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
                                src={optimizeImageUrl(student.image)}
                                alt={student.name}
                                className="w-full h-full rounded-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
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
                            {t("testimonials.dropdown.student") || "Student"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredManualStudents.length > 0 && (
                    <div>
                      <div className="px-3 py-1 bg-IcyBreeze dark:bg-dark_input">
                        <p className="text-11 font-medium text-SlateBlueText dark:text-darktext">
                          {t("testimonials.dropdown.manualEntries") || "Manual Entries"}
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
                              {t("testimonials.form.manualEntry") || "Manual Entry"}
                            </p>
                          </div>
                          <span className="text-10 px-2 py-1 bg-LightYellow/10 text-LightYellow rounded-full">
                            {t("testimonials.dropdown.manual") || "Manual"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredStudents.length === 0 && filteredManualStudents.length === 0 && !studentSearch.trim() && (
                    <div className="px-3 py-2 text-13 text-SlateBlueText dark:text-darktext text-center">
                      {t("testimonials.dropdown.noStudents") || "No students found"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {form.studentId && !form.studentId.startsWith('manual') && (
            <div className="flex items-center gap-2 text-11 text-SlateBlueText dark:text-darktext">
              <span className="px-2 py-1 bg-Aquamarine/10 text-Aquamarine rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {t("testimonials.form.databaseStudent") || "Database Student"}
              </span>
              <span>{t("testimonials.form.linkedAccount") || "Linked to student account"}</span>
            </div>
          )}

          {(!form.studentId || form.studentId.startsWith('manual')) && form.studentName && (
            <div className="flex items-center gap-2 text-11 text-SlateBlueText dark:text-darktext">
              <span className="px-2 py-1 bg-LightYellow/10 text-LightYellow rounded-full flex items-center gap-1">
                <User className="w-3 h-3" />
                {t("testimonials.form.manualEntry") || "Manual Entry"}
              </span>
              <span>{t("testimonials.form.manualStudent") || "Manual student entry"}</span>
            </div>
          )}
        </div>

        {/* Student Image */}
        <div className="space-y-3">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Image className="w-3 h-3 text-primary" />
            {t("testimonials.form.studentImage") || "Student Image"}
          </label>
          
          <div className="flex gap-4 items-start">
            <div className="flex-1 space-y-3">
              <input
                type="text"
                value={form.studentImage}
                onChange={handleImageUrlChange}
                placeholder={t("testimonials.form.imageUrl") || "Paste image URL or upload file"}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200 disabled:opacity-50"
                disabled={loading}
              />
              
              {/* Upload Progress */}
              {uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-11 text-SlateBlueText dark:text-darktext">
                    <span>Compressing image...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-PaleCyan dark:bg-dark_input rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* Image Info */}
              {imageInfo && (
                <div className={`flex items-center gap-2 text-11 p-2 rounded-lg ${
                  imageInfo.isValid 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                }`}>
                  {imageInfo.isValid ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  <span>
                    Image size: {imageInfo.sizeMB}MB {imageInfo.isValid ? '(OK)' : '(Too large)'}
                  </span>
                </div>
              )}
              
              {/* Error Message */}
              {imageError && (
                <div className="flex items-center gap-2 text-12 text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                  <AlertCircle className="w-3 h-3" />
                  {imageError}
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={triggerFileInput}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-12 cursor-pointer hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-3 h-3" />
                  {t("testimonials.form.uploadImage") || "Upload Image"}
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleStudentImageUpload}
                  className="hidden"
                  disabled={loading}
                />
                
                {studentImagePreview && (
                  <button
                    type="button"
                    onClick={removeImage}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-12 cursor-pointer hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3 h-3" />
                    {t("testimonials.form.removeImage") || "Remove Image"}
                  </button>
                )}
              </div>
              
              {/* Help Text */}
              <p className="text-11 text-SlateBlueText dark:text-darktext">
                {t("testimonials.form.imageTips") || "Supported formats: JPEG, PNG, WebP. Max size: 3MB. Images will be automatically compressed."}
              </p>
            </div>
            
            {/* Image Preview */}
            {studentImagePreview && (
              <div className="w-20 h-20 border border-PowderBlueBorder rounded-lg overflow-hidden flex-shrink-0 relative">
                <img
                  src={studentImagePreview}
                  alt="Student Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    setImageError("Failed to load image. Please check the URL or upload a different image.");
                  }}
                />
                {loading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Course Information */}
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
              disabled={loading}
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
              disabled={loading}
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
              {t("testimonials.form.ratingFeedback") || "Rating & Feedback"}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("testimonials.form.ratingDescription") || "Rate the course and share the student's experience"}
            </p>
          </div>
        </div>

        {/* Rating */}
        <div className="space-y-3">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
            {t("testimonials.form.rating") || "Rating"} *
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
            {t("testimonials.form.testimonialComment") || "Testimonial Comment"} *
          </label>
          <textarea
            value={form.comment}
            onChange={(e) => onChange("comment", e.target.value)}
            rows={4}
            placeholder="Share the student's feedback, experience, and success story..."
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 resize-none transition-all duration-200 disabled:opacity-50"
            required
            disabled={loading}
          />
          <div className="flex justify-between text-11 text-SlateBlueText dark:text-darktext">
            <span>Minimum 10 characters</span>
            <span>{form.comment.length} characters</span>
          </div>
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
              {t("testimonials.form.settings") || "Settings"}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("testimonials.form.settingsDescription") || "Configure testimonial visibility and features"}
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
                  className="w-4 h-4 text-ElectricAqua focus:ring-ElectricAqua border-PowderBlueBorder rounded disabled:opacity-50"
                  disabled={loading}
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
                  className="w-4 h-4 text-Aquamarine focus:ring-Aquamarine border-PowderBlueBorder rounded disabled:opacity-50"
                  disabled={loading}
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

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="flex-1 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 hover:bg-IcyBreeze dark:hover:bg-darklight hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="w-3 h-3" />
          {t("common.cancel") || "Cancel"}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {t("testimonials.form.saving") || "Saving..."}
            </>
          ) : initial ? (
            <>
              <Save className="w-3 h-3" />
              {t("testimonials.form.updateTestimonial") || "Update Testimonial"}
            </>
          ) : (
            <>
              <Rocket className="w-3 h-3" />
              {t("testimonials.form.createTestimonial") || "Create Testimonial"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}