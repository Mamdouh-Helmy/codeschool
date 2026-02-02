"use client";
import { useState, useEffect, useRef } from "react";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Users,
  BookOpen,
  Globe,
  Save,
  X,
  ChevronDown,
  Search,
  Plus,
  CheckCircle,
  Lock,
  Smartphone,
  Shield,
  Home,
  GraduationCap,
  MessageCircle,
  Bell,
  GlobeIcon,
  Hash,
  AlertCircle,
  Check,
  Info
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";

export default function StudentForm({ initial, onClose, onSaved }) {
  // الحالة الرئيسية للفورم
  const [form, setForm] = useState(() => ({
    authUserId: initial?.authUserId?._id || "",
    personalInfo: {
      fullName: initial?.personalInfo?.fullName || "",
      email: initial?.personalInfo?.email || "",
      phone: initial?.personalInfo?.phone || "",
      whatsappNumber: initial?.personalInfo?.whatsappNumber || "",
      dateOfBirth: initial?.personalInfo?.dateOfBirth?.split('T')[0] || "",
      gender: initial?.personalInfo?.gender || "Male",
      nationalId: initial?.personalInfo?.nationalId || "",
      address: initial?.personalInfo?.address || {
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: ""
      }
    },
    guardianInfo: initial?.guardianInfo || {
      name: "",
      relationship: "",
      phone: "",
      whatsappNumber: "",
      email: ""
    },
    enrollmentInfo: {
      source: initial?.enrollmentInfo?.source || "Website",
      referredBy: initial?.enrollmentInfo?.referredBy || "",
      status: initial?.enrollmentInfo?.status || "Active"
    },
    academicInfo: {
      level: initial?.academicInfo?.level || "Beginner",
      groupIds: initial?.academicInfo?.groupIds || [],
      currentCourses: initial?.academicInfo?.currentCourses || []
    },
    communicationPreferences: {
      preferredLanguage: initial?.communicationPreferences?.preferredLanguage || "ar",
      notificationChannels: initial?.communicationPreferences?.notificationChannels || {
        email: true,
        whatsapp: true,
        sms: false
      },
      marketingOptIn: initial?.communicationPreferences?.marketingOptIn || true
    },
    whatsappCustomMessages: {
      firstMessage: initial?.whatsappCustomMessages?.firstMessage || "",
      secondMessage: initial?.whatsappCustomMessages?.secondMessage || ""
    }
  }));

  const [loading, setLoading] = useState(false);
  const { t } = useI18n();
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [manualStudents, setManualStudents] = useState([]);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // دالة جديدة لإرسال رسالة الترحيب عبر WhatsApp
  const sendWhatsAppWelcomeMessage = async (studentData) => {
    try {
      console.log("📱 Starting WhatsApp welcome message process...");

      // استخدام service مباشرة
      const { wapilotService } = await import('@/app/services/wapilot-service');

      console.log("🔍 Wapilot service mode:", wapilotService.mode);

      // إرسال الرسالتين (ترحيب + اختيار اللغة)
      const result = await wapilotService.sendWelcomeMessages(
        studentData.personalInfo.fullName,
        studentData.personalInfo.whatsappNumber,
        studentData.whatsappCustomMessages?.firstMessage,
        studentData.whatsappCustomMessages?.secondMessage
      );

      if (result.success) {
        console.log('✅ WhatsApp welcome messages sent successfully!', {
          mode: result.mode,
          simulated: result.simulated
        });

        if (result.simulated) {
          toast.success(`📱 Simulation: Welcome messages prepared for ${studentData.personalInfo.fullName}! (Not sent in simulation)`);
        } else {
          toast.success(`✅ WhatsApp messages sent to ${studentData.personalInfo.fullName}!`);
        }
        return true;
      } else {
        console.warn('⚠️ WhatsApp message sending failed:', result.message);
        toast.error(`Failed to send WhatsApp message: ${result.message}`);
        return false;
      }

    } catch (error) {
      console.error('❌ Error sending WhatsApp message:', error);
      toast.error('Error sending WhatsApp message');
      return false;
    }
  };

  // جلب جميع الطلاب عند تحميل المكون
  useEffect(() => {
    const fetchStudents = async () => {
      setStudentsLoading(true);
      try {
        const res = await fetch("/api/students", {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        if (!res.ok) throw new Error("Failed to fetch students");

        const data = await res.json();
        if (data.success) {
          setStudents(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching students:", error);
        toast.error(t("students.loadError"));
      } finally {
        setStudentsLoading(false);
      }
    };

    fetchStudents();
  }, []);

  // إغلاق dropdown عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // تحميل البيانات الأولية
  useEffect(() => {
    if (initial?.authUserId) {
      const studentName = initial.personalInfo?.fullName || initial.authUserId?.name || "";
      setStudentSearch(studentName);
      setSelectedStudent({
        _id: initial.authUserId._id,
        name: studentName,
        email: initial.authUserId.email
      });
    } else if (initial && !initial.authUserId) {
      setStudentSearch(initial.personalInfo?.fullName || "");
    }
  }, [initial]);

  // دالة عامة لتحديث الحقول المتداخلة
  const onChange = (path, value) => {
    const paths = path.split('.');
    setForm(prev => {
      const newForm = JSON.parse(JSON.stringify(prev)); // Deep copy
      let current = newForm;

      for (let i = 0; i < paths.length - 1; i++) {
        if (!current[paths[i]]) {
          current[paths[i]] = {};
        }
        current = current[paths[i]];
      }

      current[paths[paths.length - 1]] = value;
      return newForm;
    });
  };

  // تحديث العنوان
  const handleAddressChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        address: {
          ...prev.personalInfo.address,
          [field]: value
        }
      }
    }));
  };

  // دالة إضافة طالب يدوي
  const addManualStudent = (name) => {
    if (name.trim() && !manualStudents.some(student => student.name === name.trim())) {
      const newManualStudent = {
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
  const handleStudentSelect = (student) => {
    if (!student.isManual) {
      setSelectedStudent(student);
      onChange('personalInfo.fullName', student.name);
      onChange('personalInfo.email', student.email);
      onChange('authUserId', student._id);
    } else {
      setSelectedStudent(null);
      onChange('personalInfo.fullName', student.name);
      onChange('personalInfo.email', form.personalInfo.email || "");
      onChange('authUserId', "");
    }

    setStudentSearch(student.name);
    setShowUserDropdown(false);
  };

  // تغيير اسم الطالب
  const handleInputChange = (e) => {
    const value = e.target.value;

    onChange('personalInfo.fullName', value);
    setStudentSearch(value);

    if (selectedStudent && value !== selectedStudent.name) {
      setSelectedStudent(null);
      onChange('authUserId', "");
    }
  };

  const handleInputFocus = () => {
    setShowUserDropdown(true);
  };

  // تصفية الطلاب بناءً على البحث
  const filteredStudents = students.filter(student =>
    student.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.email?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredManualStudents = manualStudents.filter(student =>
    student.name?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const isNameInLists = studentSearch.trim() &&
    (filteredStudents.some(student => student.name?.toLowerCase() === studentSearch.toLowerCase()) ||
      filteredManualStudents.some(student => student.name?.toLowerCase() === studentSearch.toLowerCase()));

  const handleAddManualStudent = () => {
    if (studentSearch.trim() && !isNameInLists) {
      const newStudent = addManualStudent(studentSearch);
      if (newStudent) {
        handleStudentSelect(newStudent);
      }
    }
  };

  // ✅ إرسال الفورم - بدون استدعاء WhatsApp من Client
  const submit = async (e) => {
    e.preventDefault();

    setLoading(true);
    const toastId = toast.loading(selectedStudent ?
      t("studentForm.updating") :
      t("studentForm.creating"));

    try {
      let userId = form.authUserId;

      // إذا كان طالباً جديداً بدون حساب سابق
      if (!selectedStudent || (selectedStudent && selectedStudent.isManual)) {
        console.log("👤 Creating new user account for student...");

        // 1. إنشاء حساب المستخدم
        const userRes = await fetch("/api/allStudents/createUser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.personalInfo.fullName,
            email: form.personalInfo.email,
            password: password,
            role: "student"
          }),
        });

        const userData = await userRes.json();

        if (!userRes.ok) {
          throw new Error(userData.message || t("students.saveError"));
        }

        console.log("✅ User created successfully:", userData.user?.id);
        userId = userData.user?.id;
      }

      // إعداد بيانات الطالب للإرسال
      let dateOfBirthISO = null;
      if (form.personalInfo.dateOfBirth) {
        try {
          const dateStr = form.personalInfo.dateOfBirth;
          const dateObj = new Date(dateStr + 'T12:00:00');

          if (isNaN(dateObj.getTime())) {
            throw new Error("Invalid date value");
          }

          dateOfBirthISO = dateObj.toISOString();
        } catch (dateError) {
          console.error("❌ Date conversion error:", dateError);
          throw new Error(`تاريخ الميلاد غير صحيح: ${dateError.message}`);
        }
      }

      const studentPayload = {
        ...form,
        authUserId: userId,
        personalInfo: {
          ...form.personalInfo,
          dateOfBirth: dateOfBirthISO
        }
      };

      const studentId = initial?.id || initial?._id;

      const method = studentId ? "PUT" : "POST";
      const url = studentId
        ? `/api/allStudents/${studentId}`
        : "/api/allStudents";

      console.log("📤 Submitting student data...", {
        method,
        url,
        studentId,
        hasInitial: !!initial,
        dateOfBirth: dateOfBirthISO,
        hasAuthUserId: !!userId,
        whatsappMessages: {
          firstMessage: form.whatsappCustomMessages?.firstMessage ? "✓" : "✗",
          secondMessage: form.whatsappCustomMessages?.secondMessage ? "✓" : "✗"
        }
      });

      // إرسال بيانات الطالب
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentPayload),
      });

      const result = await res.json();

      if (!res.ok) {
        let errorMessage = result.message || `HTTP error! status: ${res.status}`;

        if (result.errors && Array.isArray(result.errors)) {
          const errorDetails = result.errors.map(err => `${err.field}: ${err.message}`).join(', ');
          errorMessage += ` - ${errorDetails}`;
        }

        if (result.field) {
          errorMessage += ` - Field: ${result.field}, Value: ${result.value}`;
        }

        throw new Error(errorMessage);
      }

      if (result.success) {
        const successMessage = studentId
          ? t("students.updatedSuccess")
          : t("students.createdSuccess");

        toast.success(successMessage, { id: toastId });

        // ✅ WhatsApp automation يحدث تلقائياً في Server API
        // لا حاجة لاستدعاء أي service من هنا
        if (!studentId && result.data?.whatsappAutomation) {
          console.log("📱 WhatsApp automation triggered on server:", result.data.whatsappAutomation);

          // إظهار notification للمستخدم بناءً على النتيجة
          if (result.data.whatsappAutomation.triggered) {
            toast.success("📱 WhatsApp messages will be sent automatically", {
              duration: 3000
            });
          }
        }

        onSaved();
        onClose();
      } else {
        throw new Error(result.message || t("students.saveError"));
      }
    } catch (err) {
      console.error("❌ Error:", err);
      toast.error(err.message || t("students.saveError"), { id: toastId });
    } finally {
      setLoading(false);
    }
  };



  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Student Selection Section */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                {t("studentForm.studentInfo")}
              </h3>
              <p className="text-12 text-SlateBlueText dark:text-darktext">
                {t("studentForm.selectExisting")}
              </p>
            </div>
          </div>
        </div>

        {/* Student Selection */}
        <div className="space-y-3">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Hash className="w-3 h-3" />
            {t("studentForm.studentName")}
          </label>

          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={form.personalInfo.fullName}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                placeholder={t("testimonials.form.searchStudent")}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200 pr-10 disabled:opacity-50"
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

            {/* Dropdown */}
            {showUserDropdown && (
              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-darkmode border border-PowderBlueBorder dark:border-dark_border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2 border-b border-PowderBlueBorder dark:border-dark_border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-SlateBlueText dark:text-darktext" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder={t("testimonials.dropdown.searchStudents")}
                      className="w-full pl-10 pr-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="py-1">
                  {/* Manual Entry Option */}
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
                          {t("testimonials.dropdown.addStudent", { name: studentSearch })}
                        </p>
                        <p className="text-11 text-SlateBlueText dark:text-darktext">
                          {t("testimonials.dropdown.createEntry")}
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Database Students */}
                  {filteredStudents.length > 0 && (
                    <div className="border-b border-PowderBlueBorder dark:border-dark_border">
                      <div className="px-3 py-1 bg-IcyBreeze dark:bg-dark_input">
                        <p className="text-11 font-medium text-SlateBlueText dark:text-darktext">
                          {t("testimonials.dropdown.databaseStudents")} ({filteredStudents.length})
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
                            <User className="w-4 h-4 text-primary" />
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
                            {t("testimonials.dropdown.student")}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Manual Students */}
                  {filteredManualStudents.length > 0 && (
                    <div>
                      <div className="px-3 py-1 bg-IcyBreeze dark:bg-dark_input">
                        <p className="text-11 font-medium text-SlateBlueText dark:text-darktext">
                          {t("testimonials.dropdown.manualEntries")} ({filteredManualStudents.length})
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
                              {t("testimonials.form.manualEntry")}
                            </p>
                          </div>
                          <span className="text-10 px-2 py-1 bg-LightYellow/10 text-LightYellow rounded-full">
                            {t("testimonials.dropdown.manual")}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Empty State */}
                  {filteredStudents.length === 0 && filteredManualStudents.length === 0 && !studentSearch.trim() && (
                    <div className="px-3 py-2 text-13 text-SlateBlueText dark:text-darktext text-center">
                      {t("testimonials.dropdown.noStudents")}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Status Indicators */}
          {selectedStudent && !selectedStudent.isManual ? (
            <div className="flex items-center gap-2 text-11 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10 p-2 rounded">
              <CheckCircle className="w-3 h-3" />
              <span>{t("studentForm.existingStudent")}</span>
            </div>
          ) : selectedStudent?.isManual ? (
            <div className="flex items-center gap-2 text-11 text-LightYellow dark:text-LightYellow bg-LightYellow/10 dark:bg-LightYellow/20 p-2 rounded">
              <AlertCircle className="w-3 h-3" />
              <span>{t("studentForm.manualEntry")}</span>
            </div>
          ) : form.personalInfo.fullName && (
            <div className="flex items-center gap-2 text-11 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10 p-2 rounded">
              <Plus className="w-3 h-3" />
              <span>{t("studentForm.newStudent")}</span>
            </div>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <Mail className="w-3 h-3" />
            {t("studentForm.email")}
          </label>
          <input
            type="email"
            value={form.personalInfo.email}
            onChange={(e) => onChange('personalInfo.email', e.target.value)}
            placeholder="student@example.com"
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            disabled={selectedStudent && !selectedStudent.isManual}
          />
          {selectedStudent && !selectedStudent.isManual && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("testimonials.form.linkedAccount")}
            </p>
          )}
        </div>

        {/* Password Fields */}
        {(!selectedStudent || (selectedStudent && selectedStudent.isManual)) && form.personalInfo.fullName && (
          <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-14 font-semibold text-gray-900 dark:text-white">
                  {t("studentForm.createAccount")}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t("studentForm.accountDescription")}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Lock className="w-3 h-3" />
                  {t("studentForm.password")}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 border border-blue-200 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark_input dark:text-white bg-white/50"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Lock className="w-3 h-3" />
                  {t("studentForm.confirmPassword")}
                </label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 border border-blue-200 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark_input dark:text-white bg-white/50"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-gray-800/30 p-3 rounded border border-blue-100 dark:border-blue-900/30">
              <Smartphone className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-500" />
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("studentForm.accountIncludes")}
                </p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span>{t("studentForm.fullProfile")}</span>
                  </li>
                  <li className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span>{t("studentForm.portfolio")}</span>
                  </li>
                  <li className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span>{t("studentForm.qrCode")}</span>
                  </li>
                  <li className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span>{t("studentForm.emailVerified")}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contact Information */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <Phone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("studentForm.contactInfo")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("studentForm.contactDescription")}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("studentForm.phone")}
            </label>
            <input
              type="tel"
              value={form.personalInfo.phone}
              onChange={(e) => onChange('personalInfo.phone', e.target.value)}
              placeholder="+201234567890"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("studentForm.whatsappNumber")}
            </label>
            <input
              type="tel"
              value={form.personalInfo.whatsappNumber}
              onChange={(e) => onChange('personalInfo.whatsappNumber', e.target.value)}
              placeholder="01234567890"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("studentForm.whatsappNote") || "Enter Egyptian number (e.g., 01234567890). Country code will be added automatically."}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("studentForm.dateOfBirth")}
            </label>
            <input
              type="date"
              value={form.personalInfo.dateOfBirth}
              onChange={(e) => onChange('personalInfo.dateOfBirth', e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("studentForm.gender")}
            </label>
            <select
              value={form.personalInfo.gender}
              onChange={(e) => onChange('personalInfo.gender', e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            >
              <option value="Male">{t("studentForm.gender.male")}</option>
              <option value="Female">{t("studentForm.gender.female")}</option>
              <option value="Other">{t("studentForm.gender.other")}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("studentForm.nationalId")}
            </label>
            <input
              type="text"
              value={form.personalInfo.nationalId}
              onChange={(e) => onChange('personalInfo.nationalId', e.target.value)}
              placeholder="12345678901234"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-gray-500" />
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("studentForm.address")}
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("studentForm.street")}</label>
              <input
                type="text"
                value={form.personalInfo.address.street}
                onChange={(e) => handleAddressChange('street', e.target.value)}
                placeholder={t("studentForm.street")}
                className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-1 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("studentForm.city")}</label>
              <input
                type="text"
                value={form.personalInfo.address.city}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                placeholder={t("studentForm.city")}
                className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-1 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-sm"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("studentForm.state")}</label>
              <input
                type="text"
                value={form.personalInfo.address.state}
                onChange={(e) => handleAddressChange('state', e.target.value)}
                placeholder={t("studentForm.state")}
                className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-1 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("studentForm.postalCode")}</label>
              <input
                type="text"
                value={form.personalInfo.address.postalCode}
                onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                placeholder={t("studentForm.postalCode")}
                className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-1 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("studentForm.country")}</label>
              <input
                type="text"
                value={form.personalInfo.address.country}
                onChange={(e) => handleAddressChange('country', e.target.value)}
                placeholder={t("studentForm.country")}
                className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-1 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Guardian Information */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("studentForm.guardianInfo")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("studentForm.guardianDescription")}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("studentForm.guardianName")}
            </label>
            <input
              type="text"
              value={form.guardianInfo.name}
              onChange={(e) => onChange('guardianInfo.name', e.target.value)}
              placeholder={t("studentForm.guardianName")}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("studentForm.relationship")}
            </label>
            <input
              type="text"
              value={form.guardianInfo.relationship}
              onChange={(e) => onChange('guardianInfo.relationship', e.target.value)}
              placeholder={t("studentForm.relationship")}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("studentForm.guardianPhone")}
            </label>
            <input
              type="tel"
              value={form.guardianInfo.phone}
              onChange={(e) => onChange('guardianInfo.phone', e.target.value)}
              placeholder="+201234567890"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("studentForm.guardianWhatsApp")}
            </label>
            <input
              type="tel"
              value={form.guardianInfo.whatsappNumber}
              onChange={(e) => onChange('guardianInfo.whatsappNumber', e.target.value)}
              placeholder="01234567890"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("studentForm.guardianEmail")}
            </label>
            <input
              type="email"
              value={form.guardianInfo.email}
              onChange={(e) => onChange('guardianInfo.email', e.target.value)}
              placeholder="guardian@example.com"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Enrollment Information */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("studentForm.enrollmentInfo")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("studentForm.enrollmentDescription")}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("studentForm.source")}
            </label>
            <select
              value={form.enrollmentInfo.source}
              onChange={(e) => onChange('enrollmentInfo.source', e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            >
              <option value="Website">{t("students.source.website")}</option>
              <option value="Referral">{t("students.source.referral")}</option>
              <option value="Marketing">{t("students.source.marketing")}</option>
              <option value="Walk-in">{t("students.source.walkin")}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("studentForm.status")}
            </label>
            <select
              value={form.enrollmentInfo.status}
              onChange={(e) => onChange('enrollmentInfo.status', e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            >
              <option value="Active">{t("students.status.active")}</option>
              <option value="Suspended">{t("students.status.suspended")}</option>
              <option value="Graduated">{t("students.status.graduated")}</option>
              <option value="Dropped">{t("students.status.dropped")}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("studentForm.academicLevel")}
            </label>
            <select
              value={form.academicInfo.level}
              onChange={(e) => onChange('academicInfo.level', e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            >
              <option value="Beginner">{t("students.level.beginner")}</option>
              <option value="Intermediate">{t("students.level.intermediate")}</option>
              <option value="Advanced">{t("students.level.advanced")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Communication Preferences */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("studentForm.communicationPrefs")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("studentForm.communicationDescription")}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
                <GlobeIcon className="w-3 h-3" />
                {t("studentForm.preferredLanguage")}
              </label>
              <select
                value={form.communicationPreferences.preferredLanguage}
                onChange={(e) => onChange('communicationPreferences.preferredLanguage', e.target.value)}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
              >
                <option value="ar">{t("studentForm.language.ar")}</option>
                <option value="en">{t("studentForm.language.en")}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
                <Bell className="w-3 h-3" />
                {t("studentForm.marketingOptIn")}
              </label>
              <div className="flex items-center p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-gray-50 dark:bg-gray-800">
                <input
                  type="checkbox"
                  id="marketingOptIn"
                  checked={form.communicationPreferences.marketingOptIn}
                  onChange={(e) => onChange('communicationPreferences.marketingOptIn', e.target.checked)}
                  className="w-4 h-4 text-primary rounded focus:ring-primary"
                />
                <label htmlFor="marketingOptIn" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                  {t("studentForm.marketingOptIn")}
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
              {t("studentForm.notificationChannels")}
            </label>

            <div className="space-y-2">
              {Object.entries(form.communicationPreferences.notificationChannels).map(([channel, enabled]) => (
                <div key={channel} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                  <div className="flex items-center gap-2">
                    {channel === 'email' && <Mail className="w-3 h-3" />}
                    {channel === 'whatsapp' && <MessageCircle className="w-3 h-3 text-green-500" />}
                    {channel === 'sms' && <Smartphone className="w-3 h-3" />}
                    <span className="text-sm capitalize">{t(`studentForm.${channel}`)}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => {
                        const newChannels = {
                          ...form.communicationPreferences.notificationChannels,
                          [channel]: e.target.checked
                        };
                        onChange('communicationPreferences.notificationChannels', newChannels);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Custom Messages */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              رسائل WhatsApp المخصصة
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              قم بتخصيص محتوى الرسائل التي سيتلقاها الطالب
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* First Message */}
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 bg-primary/20 text-primary text-10 font-bold rounded">1</span>
              الرسالة الأولى (First Message)
            </label>
            <textarea
              value={form.whatsappCustomMessages?.firstMessage || ""}
              onChange={(e) => onChange('whatsappCustomMessages.firstMessage', e.target.value)}
              placeholder="أدخل محتوى الرسالة الأولى التي ستصل للطالب..."
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white resize-none h-28"
            />
            <div className="flex justify-between items-center text-xs text-SlateBlueText dark:text-darktext">
              <p>ستُرسل كرسالة نصية عادية</p>
              <span>{(form.whatsappCustomMessages?.firstMessage || "").length} حرف</span>
            </div>
          </div>

          {/* Second Message */}
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 bg-primary/20 text-primary text-10 font-bold rounded">2</span>
              الرسالة الثانية (Second Message)
            </label>
            <textarea
              value={form.whatsappCustomMessages?.secondMessage || ""}
              onChange={(e) => onChange('whatsappCustomMessages.secondMessage', e.target.value)}
              placeholder="أدخل محتوى الرسالة الثانية (رسالة اختيار اللغة)..."
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white resize-none h-28"
            />
            <div className="flex justify-between items-center text-xs text-SlateBlueText dark:text-darktext">
              <p>ستُرسل مع أزرار تفاعلية (العربية/English)</p>
              <span>{(form.whatsappCustomMessages?.secondMessage || "").length} حرف</span>
            </div>
          </div>

          {/* Preview Info */}
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p className="font-medium">ملاحظات مهمة:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>الرسالة الأولى: رسالة نصية عادية (Text Message)</li>
                  <li>الرسالة الثانية: رسالة مع أزرار تفاعلية (Interactive List)</li>
                  <li>سيتم إرسالهما تلقائياً بعد تسجيل بيانات الطالب</li>
                  <li>الطالب سيختار اللغة من الأزرار التفاعلية</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-white dark:bg-darkmode pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white py-3 px-4 rounded-lg font-semibold text-13 hover:bg-gray-50 dark:hover:bg-dark_input flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            {t("studentForm.cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white py-3 px-4 rounded-lg font-semibold text-13 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {selectedStudent ? t("studentForm.updating") : t("studentForm.creating")}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {initial?.id ? t("studentForm.updateStudent") :
                  selectedStudent ? t("studentForm.updateStudent") : t("studentForm.createStudent")}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}