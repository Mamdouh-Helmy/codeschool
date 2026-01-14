"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  BookOpen,
  Settings,
  Bell,
  Shield,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  Users,
  Globe,
  MessageSquare,
  Smartphone,
} from "lucide-react";

interface StudentProfile {
  _id: string;
  personalInfo: {
    fullName?: string;
    email?: string;
    phone?: string;
    whatsappNumber?: string;
    dateOfBirth?: string;
    gender?: string;
    nationalId?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
  guardianInfo?: {
    name?: string;
    relationship?: string;
    phone?: string;
    whatsappNumber?: string;
    email?: string;
  };
  academicInfo: {
    level?: string;
    groupIds: string[];
    currentCourses: Array<{
      courseId: string;
      enrolledDate: string;
      progressPercentage: number;
    }>;
  };
  communicationPreferences: {
    preferredLanguage: string;
    notificationChannels: {
      email: boolean;
      whatsapp: boolean;
      sms: boolean;
    };
    marketingOptIn: boolean;
  };
  enrollmentInfo: {
    enrollmentDate: string;
    status: string;
    source?: string;
    referredBy?: string;
  };
  metadata?: {
    createdAt: string;
    updatedAt: string;
  };
}

export default function StudentProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("🔄 [Profile] Fetching profile data...");

      const profileRes = await fetch(`/api/student/profile`, {
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include'
      });

      const response = await profileRes.json();

      console.log("📥 [Profile] API Response:", {
        success: response.success,
        status: profileRes.status
      });

      if (!profileRes.ok || !response.success) {
        throw new Error(response.message || "فشل في تحميل الملف الشخصي");
      }

      setProfile(response.data);

    } catch (error: any) {
      console.error("❌ [Profile] Error fetching profile:", error);
      setError(error.message || "حدث خطأ أثناء تحميل الملف الشخصي");

      if (error.message.includes("غير مصرح") || error.message.includes("UNAUTHORIZED")) {
        router.push("/signin");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "غير محدد";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "تاريخ غير صالح";

      return date.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getLevelText = (level?: string) => {
    switch (level) {
      case "Beginner": return "مبتدئ";
      case "Intermediate": return "متوسط";
      case "Advanced": return "متقدم";
      default: return level || "غير محدد";
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case "Active": return "نشط";
      case "Suspended": return "موقوف";
      case "Graduated": return "متخرج";
      case "Dropped": return "منسحب";
      default: return status || "غير محدد";
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "Suspended": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "Graduated": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "Dropped": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getGenderText = (gender?: string) => {
    switch (gender) {
      case "male": return "ذكر";
      case "female": return "أنثى";
      default: return "غير محدد";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">جاري تحميل الملف الشخصي...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            حدث خطأ
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchProfile}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              حاول مرة أخرى
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
            >
              العودة للداشبورد
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkmode">
      {/* Header */}
      <div className="bg-white dark:bg-secondary shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                الملف الشخصي
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                معلوماتك الشخصية والأكاديمية
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                العودة للداشبورد
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* الجانب الأيسر */}
          <div className="lg:col-span-2 space-y-6">
            {/* معلومات الطالب */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-purple-600 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {profile?.personalInfo?.fullName || "طالب"}
                    </h2>
                    <p className="text-white/80">
                      {profile?.personalInfo?.email || "بريد إلكتروني غير متوفر"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* المعلومات الأساسية */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b pb-2">
                      المعلومات الأساسية
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">البريد الإلكتروني</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {profile?.personalInfo?.email || "غير محدد"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">رقم الهاتف</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {profile?.personalInfo?.phone || "غير محدد"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">رقم الواتساب</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {profile?.personalInfo?.whatsappNumber || "غير محدد"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* المعلومات الشخصية */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b pb-2">
                      المعلومات الشخصية
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">تاريخ الميلاد</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {profile?.personalInfo?.dateOfBirth ? formatDate(profile.personalInfo.dateOfBirth) : "غير محدد"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                          <User className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">الجنس</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {getGenderText(profile?.personalInfo?.gender)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">رقم الهوية</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {profile?.personalInfo?.nationalId || "غير محدد"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* العنوان */}
                {profile?.personalInfo?.address && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      العنوان
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">الشارع</p>
                        <p className="text-gray-900 dark:text-white">
                          {profile.personalInfo.address.street || "غير محدد"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">المدينة</p>
                        <p className="text-gray-900 dark:text-white">
                          {profile.personalInfo.address.city || "غير محدد"}
                        </p>
                      </div>
                      {profile.personalInfo.address.state && (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">المنطقة</p>
                          <p className="text-gray-900 dark:text-white">{profile.personalInfo.address.state}</p>
                        </div>
                      )}
                      {profile.personalInfo.address.country && (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">البلد</p>
                          <p className="text-gray-900 dark:text-white">{profile.personalInfo.address.country}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* المعلومات الأكاديمية */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    المعلومات الأكاديمية
                  </h2>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(profile?.enrollmentInfo?.status)}`}>
                  {getStatusText(profile?.enrollmentInfo?.status)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">المستوى الدراسي</p>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900 dark:text-white font-medium">
                      {getLevelText(profile?.academicInfo?.level)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">تاريخ التسجيل</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900 dark:text-white font-medium">
                      {profile?.enrollmentInfo?.enrollmentDate ? formatDate(profile.enrollmentInfo.enrollmentDate) : "غير محدد"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">عدد المجموعات</p>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900 dark:text-white font-medium">
                      {profile?.academicInfo?.groupIds?.length || 0} مجموعة
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">مصدر التسجيل</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {profile?.enrollmentInfo?.source === "Website" ? "الموقع الإلكتروني" :
                     profile?.enrollmentInfo?.source === "Referral" ? "إحالة" :
                     profile?.enrollmentInfo?.source === "Marketing" ? "التسويق" :
                     profile?.enrollmentInfo?.source === "Walk-in" ? "زيارة مباشرة" :
                     "غير محدد"}
                  </p>
                </div>
              </div>

              {/* الدورات الحالية */}
              {profile?.academicInfo?.currentCourses && profile.academicInfo.currentCourses.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                    الدورات الحالية
                  </h3>
                  <div className="space-y-4">
                    {profile.academicInfo.currentCourses.map((course, index) => (
                      <div key={index} className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              دورة #{index + 1}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              تاريخ التسجيل: {formatDate(course.enrolledDate)}
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light rounded-full text-sm font-medium">
                            {course.progressPercentage}%
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">التقدم</span>
                            <span className="font-medium text-gray-900 dark:text-white">{course.progressPercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-primary to-blue-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${course.progressPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* الجانب الأيمن */}
          <div className="space-y-6">
            {/* تفضيلات الاتصال */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  تفضيلات الاتصال
                </h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">اللغة المفضلة</p>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900 dark:text-white font-medium">
                      {profile?.communicationPreferences?.preferredLanguage === "ar" ? "العربية 🇸🇦" : "الإنجليزية 🇬🇧"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">قنوات الإشعارات</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                          <Mail className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </div>
                        <span className="text-gray-700 dark:text-gray-300">البريد الإلكتروني</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${profile?.communicationPreferences?.notificationChannels?.email
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        }`}>
                        {profile?.communicationPreferences?.notificationChannels?.email ? "مفعل" : "معطل"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-gray-700 dark:text-gray-300">الواتساب</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${profile?.communicationPreferences?.notificationChannels?.whatsapp
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        }`}>
                        {profile?.communicationPreferences?.notificationChannels?.whatsapp ? "مفعل" : "معطل"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-gray-700 dark:text-gray-300">رسائل SMS</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${profile?.communicationPreferences?.notificationChannels?.sms
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        }`}>
                        {profile?.communicationPreferences?.notificationChannels?.sms ? "مفعل" : "معطل"}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">الاشتراك في الرسائل التسويقية</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${profile?.communicationPreferences?.marketingOptIn
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                      }`}>
                      {profile?.communicationPreferences?.marketingOptIn ? "مفعل" : "معطل"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* معلومات ولي الأمر */}
            {profile?.guardianInfo && (profile.guardianInfo.name || profile.guardianInfo.phone) && (
              <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Shield className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    معلومات ولي الأمر
                  </h2>
                </div>

                <div className="space-y-4">
                  {profile.guardianInfo.name && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">الاسم</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {profile.guardianInfo.name}
                      </p>
                    </div>
                  )}
                  
                  {profile.guardianInfo.relationship && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">صلة القرابة</p>
                      <p className="text-gray-900 dark:text-white">
                        {profile.guardianInfo.relationship}
                      </p>
                    </div>
                  )}
                  
                  {profile.guardianInfo.phone && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">رقم الهاتف</p>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-900 dark:text-white">
                          {profile.guardianInfo.phone}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {profile.guardianInfo.whatsappNumber && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">رقم الواتساب</p>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-900 dark:text-white">
                          {profile.guardianInfo.whatsappNumber}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* الإجراءات السريعة */}
            <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                إجراءات سريعة
              </h3>

              <div className="space-y-3">
                <Link
                  href="/dashboard"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Settings className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">
                      لوحة التحكم
                    </span>
                  </div>
                </Link>

                <Link
                  href="/dashboard/sessions"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">
                      الجلسات
                    </span>
                  </div>
                </Link>

                <Link
                  href="/dashboard/attendance"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">
                      سجل الحضور
                    </span>
                  </div>
                </Link>

                <Link
                  href="/dashboard/groups"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                      <Users className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">
                      مجموعاتي
                    </span>
                  </div>
                </Link>
              </div>
            </div>
            
            {/* معلومات النظام */}
            {profile?.metadata && (
              <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  معلومات النظام
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">تاريخ الإنشاء</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatDate(profile.metadata.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">آخر تحديث</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatDate(profile.metadata.updatedAt)}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={fetchProfile}
                      className="w-full px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      تحديث البيانات
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}