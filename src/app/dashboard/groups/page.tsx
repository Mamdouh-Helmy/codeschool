"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Calendar,
  Clock,
  BookOpen,
  Award,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  ChevronRight,
  TrendingUp,
  User,
  MapPin,
  CreditCard,
  Bell,
} from "lucide-react";

interface Group {
  _id: string;
  name: string;
  code: string;
  status: "active" | "completed" | "draft" | "cancelled";
  course: {
    title: string;
    level: string;
  };
  instructors: Array<{
    name: string;
    email: string;
  }>;
  currentStudentsCount: number;
  maxStudents: number;
  schedule: {
    startDate: string;
    daysOfWeek: string[];
    timeFrom: string;
    timeTo: string;
    timezone: string;
  };
  pricing: {
    price: number;
    paymentType: "full" | "installments";
    installmentPlan?: {
      numberOfInstallments: number;
      amountPerInstallment: number;
    };
  };
  automation: {
    whatsappEnabled: boolean;
    welcomeMessage: boolean;
    reminderEnabled: boolean;
  };
  sessionsGenerated: boolean;
  totalSessions: number;
  attendanceRate?: number;
  metadata?: {
    createdAt: string;
    updatedAt: string;
  };
}

export default function StudentGroupsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    filterGroups();
  }, [groups, searchTerm, filterStatus]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("🔄 [Groups] Fetching groups data...");
      
      const groupsRes = await fetch(`/api/student/groups`, {
        headers: { 
          "Content-Type": "application/json"
        },
        credentials: 'include'
      });

      const response = await groupsRes.json();
      
      console.log("📥 [Groups] API Response:", {
        success: response.success,
        status: groupsRes.status,
        count: response.data?.length
      });

      if (!groupsRes.ok || !response.success) {
        throw new Error(response.message || "فشل في تحميل المجموعات");
      }

      setGroups(response.data || []);
      setFilteredGroups(response.data || []);

    } catch (error: any) {
      console.error("❌ [Groups] Error fetching groups:", error);
      setError(error.message || "حدث خطأ أثناء تحميل المجموعات");
      
      if (error.message.includes("غير مصرح") || error.message.includes("UNAUTHORIZED")) {
        router.push("/signin");
      }
    } finally {
      setLoading(false);
    }
  };

  const filterGroups = () => {
    let filtered = [...groups];

    // البحث
    if (searchTerm) {
      filtered = filtered.filter(
        (group) =>
          group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          group.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          group.course.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // تصفية حسب الحالة
    if (filterStatus !== "all") {
      filtered = filtered.filter((group) => group.status === filterStatus);
    }

    setFilteredGroups(filtered);
  };

  const formatDate = (dateString: string) => {
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

  const getDaysInArabic = (days: string[]) => {
    const daysMap: Record<string, string> = {
      "Sunday": "الأحد",
      "Monday": "الاثنين",
      "Tuesday": "الثلاثاء",
      "Wednesday": "الأربعاء",
      "Thursday": "الخميس",
      "Friday": "الجمعة",
      "Saturday": "السبت",
    };
    
    return days.map(day => daysMap[day] || day).join("، ");
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: {
        bg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        text: "نشط",
        icon: TrendingUp,
      },
      completed: {
        bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        text: "مكتمل",
        icon: CheckCircle,
      },
      draft: {
        bg: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        text: "مسودة",
        icon: AlertCircle,
      },
      cancelled: {
        bg: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        text: "ملغي",
        icon: AlertCircle,
      },
    };

    return config[status as keyof typeof config] || config.active;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">جاري تحميل المجموعات...</p>
        </div>
      </div>
    );
  }

  if (error && groups.length === 0) {
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
              onClick={fetchGroups}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              حاول مرة أخرى
            </button>
            <button
              onClick={() => router.push("/student/dashboard")}
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
                مجموعاتي
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                جميع المجموعات التي أنت مسجل فيها
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/student/dashboard"
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
        {/* فلتر وبحث */}
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* بحث */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ابحث عن مجموعة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* تصفية حسب الحالة */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
            >
              <option value="all">جميع المجموعات</option>
              <option value="active">نشطة</option>
              <option value="completed">مكتملة</option>
              <option value="draft">مسودة</option>
              <option value="cancelled">ملغية</option>
            </select>

            {/* زر التحديث */}
            <button
              onClick={fetchGroups}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <span>تحديث البيانات</span>
            </button>
          </div>
        </div>

        {/* نتائج البحث */}
        <div className="mb-6 flex justify-between items-center">
          <p className="text-gray-600 dark:text-gray-300">
            عرض {filteredGroups.length} من {groups.length} مجموعة
          </p>
        </div>

        {/* قائمة المجموعات */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredGroups.map((group) => {
            const statusConfig = getStatusBadge(group.status);
            const StatusIcon = statusConfig.icon;
            const availableSeats = group.maxStudents - group.currentStudentsCount;
            const isFull = availableSeats <= 0;

            return (
              <div
                key={group._id}
                className="bg-white dark:bg-secondary rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
              >
                <div className="p-6">
                  {/* العنوان والحالة */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {group.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {group.code} • {group.course.title}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${statusConfig.bg}`}>
                      <StatusIcon className="inline w-4 h-4 mr-1 rtl:ml-1" />
                      {statusConfig.text}
                    </span>
                  </div>

                  {/* تفاصيل المجموعة */}
                  <div className="space-y-4">
                    {/* المدرس */}
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">المدرس</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {group.instructors[0]?.name || "بدون مدرس"}
                        </p>
                      </div>
                    </div>

                    {/* الوقت */}
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">الوقت</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {group.schedule.timeFrom} - {group.schedule.timeTo}
                        </p>
                      </div>
                    </div>

                    {/* الأيام */}
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">الأيام</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {getDaysInArabic(group.schedule.daysOfWeek)}
                        </p>
                      </div>
                    </div>

                    {/* عدد الطلاب */}
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-gray-400" />
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm text-gray-500 dark:text-gray-400">عدد الطلاب</p>
                          <p className="text-sm font-medium">
                            {group.currentStudentsCount}/{group.maxStudents}
                          </p>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ 
                              width: `${(group.currentStudentsCount / group.maxStudents) * 100}%` 
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {isFull ? "المجموعة ممتلئة" : `متاح ${availableSeats} مقعد`}
                        </p>
                      </div>
                    </div>

                    {/* نسبة الحضور */}
                    {group.attendanceRate !== undefined && (
                      <div className="flex items-center gap-3">
                        <Award className="w-5 h-5 text-gray-400" />
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400">نسبة حضورك</p>
                            <p className="text-sm font-medium">{group.attendanceRate}%</p>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                group.attendanceRate >= 80 ? "bg-green-600" : 
                                group.attendanceRate >= 60 ? "bg-yellow-600" : "bg-red-600"
                              }`}
                              style={{ width: `${group.attendanceRate}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* السعر */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">السعر</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {group.pricing.price.toLocaleString()} ج.م
                          </p>
                          {group.pricing.paymentType === "installments" && group.pricing.installmentPlan && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {group.pricing.installmentPlan.numberOfInstallments} أقساط ×{" "}
                              {group.pricing.installmentPlan.amountPerInstallment.toLocaleString()} ج.م
                            </p>
                          )}
                        </div>
                        
                        <div className="flex gap-3">
                          <Link
                            href={`/dashboard/groups/${group._id}`}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                          >
                            <span>دخول المجموعة</span>
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* الفوتر */}
                <div className="bg-gray-50 dark:bg-gray-800 px-6 py-3">
                  <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>تاريخ البدء: {formatDate(group.schedule.startDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>{group.totalSessions} جلسة</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredGroups.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-secondary rounded-xl shadow-lg">
            <Users className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              لا توجد مجموعات
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || filterStatus !== "all"
                ? "لا توجد نتائج مطابقة للبحث"
                : "لم يتم إضافتك إلى أي مجموعة بعد"}
            </p>
            {!searchTerm && filterStatus === "all" && (
              <Link
                href="/courses"
                className="inline-block mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                تصفح الدورات المتاحة
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}