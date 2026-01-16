'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Users,
  Filter,
  Search,
  Download,
  Target,
  BarChart3,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Mail,
  Phone,
  ChevronRight,
  Eye,
  MoreVertical,
  RefreshCw,
  Sparkles,
  Zap,
  Rocket,
  Star
} from "lucide-react";

interface EligibleStudent {
  studentId: string;
  studentName: string;
  whatsappNumber: string;
  email: string;
  enrollmentNumber: string;
  currentCourseName: string;
  currentCourseLevel: string;
  overallScore: number;
  readinessScore: number;
  isReadyForUpsell: boolean;
  availableCourses: Array<{
    _id: string;
    title: string;
    level: string;
    price: number;
  }>;
  suggestedOffer: {
    targetCourseName: string;
    discountPercentage: number;
    discountedPrice: number;
  } | null;
  estimatedConversionProbability: number;
}

interface UpsellStats {
  totalEligible: number;
  readyForUpsell: number;
  pendingUpsell: number;
  completedUpsell: number;
  conversionRate: number;
  estimatedRevenue: number;
}

export default function MarketingUpsellPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<EligibleStudent[]>([]);
  const [stats, setStats] = useState<UpsellStats | null>(null);
  const [filteredStudents, setFilteredStudents] = useState<EligibleStudent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [readinessFilter, setReadinessFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState("month");

  useEffect(() => {
    fetchUpsellData();
  }, [timeframe]);

  useEffect(() => {
    filterAndSortStudents();
  }, [students, searchTerm, readinessFilter, levelFilter]);

  const fetchUpsellData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/marketing/upsell?timeframe=${timeframe}`, {
        credentials: "include"
      });

      const result = await response.json();
      if (result.success) {
        setStudents(result.data.eligibleStudents);
        setStats(result.data.summary);
      }
    } catch (error) {
      console.error("Error fetching upsell data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortStudents = () => {
    let filtered = [...students];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        student =>
          student.studentName.toLowerCase().includes(term) ||
          student.enrollmentNumber.includes(term) ||
          student.currentCourseName.toLowerCase().includes(term)
      );
    }

    if (readinessFilter === "ready") {
      filtered = filtered.filter(student => student.isReadyForUpsell);
    } else if (readinessFilter === "not-ready") {
      filtered = filtered.filter(student => !student.isReadyForUpsell);
    }

    if (levelFilter !== "all") {
      filtered = filtered.filter(student => student.currentCourseLevel === levelFilter);
    }

    filtered.sort((a, b) => b.readinessScore - a.readinessScore);
    setFilteredStudents(filtered);
  };

  const getReadinessColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    if (score >= 60) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return "text-green-600 dark:text-green-400";
    if (probability >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(student => student.studentId));
    }
  };

  const handleCreateUpsellOffer = async (student: EligibleStudent) => {
    if (!student.suggestedOffer) return;

    try {
      const response = await fetch("/api/marketing/upsell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          studentId: student.studentId,
          targetCourseId: student.availableCourses[0]?._id,
          offerDetails: {
            discountPercentage: student.suggestedOffer.discountPercentage,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        alert("تم إنشاء عرض الترقية بنجاح!");
        fetchUpsellData();
      }
    } catch (error) {
      console.error("Error creating upsell offer:", error);
    }
  };

  const handleBulkCreateOffers = async () => {
    const readyStudents = filteredStudents.filter(s => s.isReadyForUpsell);
    
    try {
      const response = await fetch("/api/marketing-automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          eventType: "bulk_upsell_campaign",
          data: {
            groupIds: [],
            courseId: readyStudents[0]?.availableCourses[0]?._id,
            discountPercentage: 15,
            deadlineDays: 7
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`تم إنشاء ${result.actionsCreated} عرض ترقية`);
        fetchUpsellData();
      }
    } catch (error) {
      console.error("Error creating bulk offers:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            جاري تحميل بيانات الترقية...
          </p>
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
                عروض الترقية
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                ترقية الطلاب الناجحين للمستويات المتقدمة
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="month">الشهر</option>
                <option value="quarter">الربع</option>
                <option value="year">السنة</option>
              </select>
              <button
                onClick={fetchUpsellData}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Eligible */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">إجمالي المؤهلين</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats?.totalEligible || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {stats?.readyForUpsell || 0} جاهز للترقية
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">معدل تحويل الترقية</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats?.conversionRate || 0}%
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {stats?.completedUpsell || 0} تحويل ناجح
            </div>
          </div>

          {/* Estimated Revenue */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">الإيرادات المتوقعة</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats?.estimatedRevenue?.toLocaleString() || 0} ج.م
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              من {stats?.readyForUpsell || 0} طالب
            </div>
          </div>

          {/* Pending Offers */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">عروض معلقة</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats?.pendingUpsell || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              تحتاج متابعة
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="بحث عن طلاب..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white w-64"
                />
              </div>

              {/* Readiness Filter */}
              <select
                value={readinessFilter}
                onChange={(e) => setReadinessFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="all">كل الطلاب</option>
                <option value="ready">جاهز للترقية</option>
                <option value="not-ready">غير جاهز</option>
              </select>

              {/* Level Filter */}
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="all">كل المستويات</option>
                <option value="beginner">مبتدئ</option>
                <option value="intermediate">متوسط</option>
                <option value="advanced">متقدم</option>
              </select>
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {selectedStudents.length === filteredStudents.length ? "إلغاء الكل" : "تحديد الكل"}
              </button>
              <button
                onClick={handleBulkCreateOffers}
                disabled={selectedStudents.length === 0}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                إنشاء عروض جماعية
              </button>
            </div>
          </div>

          {/* Students Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.map((student) => (
              <div key={student.studentId} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                {/* Student Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        student.readinessScore >= 80 ? "bg-gradient-to-br from-green-400 to-emerald-600" :
                        student.readinessScore >= 60 ? "bg-gradient-to-br from-yellow-400 to-orange-500" :
                        "bg-gradient-to-br from-gray-400 to-gray-600"
                      }`}>
                        {student.readinessScore >= 80 ? (
                          <Rocket className="w-6 h-6 text-white" />
                        ) : student.readinessScore >= 60 ? (
                          <Zap className="w-6 h-6 text-white" />
                        ) : (
                          <Users className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {student.studentName}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {student.enrollmentNumber}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${getReadinessColor(student.readinessScore)}`}>
                            {student.readinessScore}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.studentId)}
                      onChange={() => handleSelectStudent(student.studentId)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {student.currentCourseName}
                  </p>
                </div>

                {/* Student Stats */}
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {student.overallScore}/5
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">النتيجة</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-xl font-bold ${getProbabilityColor(student.estimatedConversionProbability)}`}>
                        {student.estimatedConversionProbability}%
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">احتمال التحويل</div>
                    </div>
                  </div>

                  {/* Suggested Offer */}
                  {student.suggestedOffer && student.isReadyForUpsell ? (
                    <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {student.suggestedOffer.targetCourseName}
                          </span>
                        </div>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs">
                          {student.suggestedOffer.discountPercentage}% خصم
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          {student.suggestedOffer.discountedPrice.toLocaleString()} ج.م
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                          {(student.suggestedOffer.discountedPrice / (1 - student.suggestedOffer.discountPercentage / 100)).toLocaleString()} ج.م
                        </span>
                      </div>
                      <button
                        onClick={() => handleCreateUpsellOffer(student)}
                        className="w-full mt-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
                      >
                        <TrendingUp className="w-4 h-4" />
                        إنشاء عرض
                      </button>
                    </div>
                  ) : (
                    <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 text-center">
                      <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
                      <p className="text-sm text-yellow-800 dark:text-yellow-300">
                        يحتاج تحسين قبل الترقية
                      </p>
                    </div>
                  )}

                  {/* Available Courses */}
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      الكورسات المتاحة:
                    </h5>
                    <div className="space-y-2">
                      {student.availableCourses.slice(0, 3).map((course) => (
                        <div key={course._id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {course.title}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {course.price.toLocaleString()} ج.م
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.open(`https://wa.me/${student.whatsappNumber}`, '_blank')}
                      className="flex-1 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <MessageSquare className="w-4 h-4" />
                      WhatsApp
                    </button>
                    <button className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                لا توجد طلاب مؤهلين للترقية
              </p>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Readiness Distribution */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              توزيع الجاهزية
            </h3>
            <div className="space-y-3">
              {[
                { label: "ممتاز", min: 80, color: "bg-green-500" },
                { label: "جيد", min: 60, color: "bg-yellow-500" },
                { label: "بحاجة تحسين", min: 0, color: "bg-red-500" }
              ].map((category) => {
                const count = students.filter(s => 
                  category.min === 0 ? s.readinessScore < 60 :
                  category.min === 60 ? s.readinessScore >= 60 && s.readinessScore < 80 :
                  s.readinessScore >= 80
                ).length;
                const percentage = students.length > 0 ? (count / students.length) * 100 : 0;
                
                return (
                  <div key={category.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${category.color}`} />
                      <span className="text-gray-700 dark:text-gray-300">{category.label}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-white">{count}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Courses for Upsell */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              أفضل الكورسات للترقية
            </h3>
            <div className="space-y-4">
              {students
                .filter(s => s.isReadyForUpsell)
                .flatMap(s => s.availableCourses)
                .reduce((acc, course) => {
                  const existing = acc.find(c => c._id === course._id);
                  if (existing) {
                    existing.count++;
                  } else {
                    acc.push({ ...course, count: 1 });
                  }
                  return acc;
                }, [] as Array<any>)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map(course => (
                  <div key={course._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {course.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        مستوى: {course.level === "intermediate" ? "متوسط" : "متقدم"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {course.count} طالب
                      </div>
                      <div className="text-sm text-gray-500">{course.price.toLocaleString()} ج.م</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              إجراءات سريعة
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => handleBulkCreateOffers()}
                className="w-full px-4 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg hover:from-primary/90 hover:to-blue-700 transition-all flex items-center justify-between"
              >
                <span>إنشاء عروض جماعية</span>
                <Sparkles className="w-4 h-4" />
              </button>
              
              <button className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-between">
                <span>إعداد قوالب الرسائل</span>
                <MessageSquare className="w-4 h-4" />
              </button>
              
              <button className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-lg hover:from-purple-600 hover:to-violet-700 transition-all flex items-center justify-between">
                <span>تحليل الإيرادات المتوقعة</span>
                <BarChart3 className="w-4 h-4" />
              </button>
              
              <button className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2">
                <TrendingUp className="w-4 h-4" />
                عرض تقارير الترقية
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}