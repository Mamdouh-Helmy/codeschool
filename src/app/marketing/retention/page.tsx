"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Filter,
  Download,
  RefreshCw,
  MessageSquare,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart,
  Activity,
  ChevronRight,
  Eye,
  Target,
  Shield,
  Heart
} from "lucide-react";

interface AtRiskStudent {
  studentId: string;
  studentName: string;
  whatsappNumber: string;
  email: string;
  enrollmentNumber: string;
  groupName: string;
  courseName: string;
  finalDecision: string;
  studentCategory: string;
  overallScore: number;
  attendancePercentage: number;
  riskScore: number;
  riskLevel: string;
  riskReasons: string[];
  suggestedActions: Array<{
    action: string;
    priority: string;
    reason: string;
  }>;
  weakPoints: string[];
  strengths: string[];
}

interface RetentionStats {
  totalAtRisk: number;
  highRiskCount: number;
  mediumRiskCount: number;
  retentionRate: number;
  dropRate: number;
  completionRate: number;
}

export default function MarketingRetentionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<AtRiskStudent[]>([]);
  const [stats, setStats] = useState<RetentionStats | null>(null);
  const [filteredStudents, setFilteredStudents] = useState<AtRiskStudent[]>([]);
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [decisionFilter, setDecisionFilter] = useState<string>("all");
  const [timeframe, setTimeframe] = useState("month");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  useEffect(() => {
    fetchRetentionData();
  }, [timeframe]);

  useEffect(() => {
    filterStudents();
  }, [students, riskLevelFilter, groupFilter, decisionFilter]);

  const fetchRetentionData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/marketing/retention?timeframe=${timeframe}`, {
        credentials: "include"
      });

      const result = await response.json();

      if (result.success) {
        setStudents(result.data.atRiskStudents);
        setStats(result.data.summary);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error fetching retention data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = [...students];

    if (riskLevelFilter !== "all") {
      filtered = filtered.filter(student => student.riskLevel === riskLevelFilter);
    }

    if (groupFilter !== "all") {
      filtered = filtered.filter(student => student.groupName === groupFilter);
    }

    if (decisionFilter !== "all") {
      filtered = filtered.filter(student => student.finalDecision === decisionFilter);
    }

    setFilteredStudents(filtered);
  };

  const getRiskLevelColor = (level: string) => {
    const colors = {
      high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
    };
    return colors[level as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getDecisionColor = (decision: string) => {
    const colors = {
      pass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      repeat: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
    };
    return colors[decision as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
    };
    return colors[priority as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getUniqueGroups = () => {
    const groups = students.map(student => student.groupName);
    return Array.from(new Set(groups));
  };

  const handleSendMessage = (student: AtRiskStudent) => {
    const message = `🔔 ${student.studentName}،

نلاحظ أنك بحاجة دعم في ${student.courseName}.

${student.riskReasons.map(reason => `• ${reason}`).join("\n")}

نقدم لك:
✅ جلسات دعم خاصة
✅ متابعة شخصية مع المدرب
✅ خصم خاص للاستمرار

🎯 هدفنا: نوصل معاك لـ 100% استفادة!

📞 رد علينا للتفاصيل.`;

    const whatsappUrl = `https://wa.me/${student.whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleExportData = () => {
    const csvContent = [
      ["Student Name", "Email", "Phone", "Group", "Course", "Risk Level", "Score", "Attendance", "Decision", "Risk Reasons"],
      ...filteredStudents.map(student => [
        student.studentName,
        student.email,
        student.whatsappNumber,
        student.groupName,
        student.courseName,
        student.riskLevel,
        student.overallScore,
        `${student.attendancePercentage}%`,
        student.finalDecision,
        student.riskReasons.join("; ")
      ])
    ]
      .map(row => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `at-risk-students-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            جاري تحميل بيانات الاحتفاظ...
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
                لوحة الاحتفاظ بالطلاب
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                رصد ومتابعة الطلاب المعرضين للخطر
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="day">اليوم</option>
                <option value="week">الأسبوع</option>
                <option value="month">الشهر</option>
                <option value="quarter">الربع</option>
                <option value="year">السنة</option>
              </select>
              <button
                onClick={fetchRetentionData}
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
          {/* Total At Risk */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">طلاب معرضون للخطر</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats?.totalAtRisk || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {stats?.highRiskCount || 0} عالي الخطورة
            </div>
          </div>

          {/* Retention Rate */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">معدل الاحتفاظ</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats?.retentionRate || 0}%
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {stats?.completionRate || 0}% إكمال
            </div>
          </div>

          {/* Drop Rate */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">معدل التسرب</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats?.dropRate || 0}%
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              يحتاج تدخل عاجل
            </div>
          </div>

          {/* Medium Risk */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">خطر متوسط</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats?.mediumRiskCount || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Shield className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              يحتاج متابعة دورية
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              فلترة الطلاب
            </h3>
            
            <select
              value={riskLevelFilter}
              onChange={(e) => setRiskLevelFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
            >
              <option value="all">كل مستويات الخطورة</option>
              <option value="high">عالي الخطورة</option>
              <option value="medium">متوسط الخطورة</option>
              <option value="low">منخفض الخطورة</option>
            </select>

            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
            >
              <option value="all">كل المجموعات</option>
              {getUniqueGroups().map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>

            <select
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
            >
              <option value="all">كل القرارات</option>
              <option value="pass">ناجح</option>
              <option value="review">مراجعة</option>
              <option value="repeat">إعادة</option>
            </select>

            <button
              onClick={handleExportData}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              تصدير البيانات
            </button>
          </div>

          {/* Students List */}
          <div className="space-y-4">
            {filteredStudents.map((student) => (
              <div key={student.studentId} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {/* Student Header */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        student.riskLevel === "high" ? "bg-red-500" :
                        student.riskLevel === "medium" ? "bg-yellow-500" :
                        "bg-green-500"
                      }`} />
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {student.studentName}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {student.enrollmentNumber}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">•</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {student.groupName}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">•</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {student.courseName}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(student.riskLevel)}`}>
                        {student.riskLevel === "high" ? "عالي الخطورة" :
                         student.riskLevel === "medium" ? "متوسط الخطورة" :
                         "منخفض الخطورة"}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDecisionColor(student.finalDecision)}`}>
                        {student.finalDecision === "pass" ? "ناجح" :
                         student.finalDecision === "review" ? "مراجعة" :
                         "إعادة"}
                      </span>
                      <button
                        onClick={() => setExpandedStudent(
                          expandedStudent === student.studentId ? null : student.studentId
                        )}
                        className="text-primary hover:underline text-sm"
                      >
                        {expandedStudent === student.studentId ? "إخفاء التفاصيل" : "عرض التفاصيل"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Student Details */}
                {expandedStudent === student.studentId && (
                  <div className="p-4 bg-white dark:bg-secondary">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      {/* Performance Stats */}
                      <div className="space-y-4">
                        <h5 className="font-medium text-gray-900 dark:text-white">الأداء</h5>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600 dark:text-gray-400">النتيجة العامة</span>
                              <span className={`font-medium ${
                                student.overallScore >= 4 ? "text-green-600 dark:text-green-400" :
                                student.overallScore >= 3 ? "text-yellow-600 dark:text-yellow-400" :
                                "text-red-600 dark:text-red-400"
                              }`}>
                                {student.overallScore}/5
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full bg-primary"
                                style={{ width: `${(student.overallScore / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600 dark:text-gray-400">نسبة الحضور</span>
                              <span className={`font-medium ${
                                student.attendancePercentage >= 90 ? "text-green-600 dark:text-green-400" :
                                student.attendancePercentage >= 70 ? "text-yellow-600 dark:text-yellow-400" :
                                "text-red-600 dark:text-red-400"
                              }`}>
                                {student.attendancePercentage}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  student.attendancePercentage >= 90 ? "bg-green-500" :
                                  student.attendancePercentage >= 70 ? "bg-yellow-500" :
                                  "bg-red-500"
                                }`}
                                style={{ width: `${student.attendancePercentage}%` }}
                              />
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600 dark:text-gray-400">درجة الخطورة</span>
                              <span className={`font-medium ${
                                student.riskScore >= 80 ? "text-red-600 dark:text-red-400" :
                                student.riskScore >= 50 ? "text-yellow-600 dark:text-yellow-400" :
                                "text-green-600 dark:text-green-400"
                              }`}>
                                {student.riskScore}/100
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  student.riskScore >= 80 ? "bg-red-500" :
                                  student.riskScore >= 50 ? "bg-yellow-500" :
                                  "bg-green-500"
                                }`}
                                style={{ width: `${student.riskScore}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Risk Analysis */}
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-3">أسباب الخطورة</h5>
                        <div className="space-y-2">
                          {student.riskReasons.map((reason, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                              <span className="text-gray-700 dark:text-gray-300">{reason}</span>
                            </div>
                          ))}
                        </div>

                        <h5 className="font-medium text-gray-900 dark:text-white mt-4 mb-3">نقاط الضعف</h5>
                        <div className="flex flex-wrap gap-2">
                          {student.weakPoints.map((weakPoint, index) => (
                            <span key={index} className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-xs">
                              {weakPoint === "understanding" && "الفهم النظري"}
                              {weakPoint === "practice" && "الممارسة العملية"}
                              {weakPoint === "attendance" && "الحضور"}
                              {weakPoint === "participation" && "المشاركة"}
                              {weakPoint === "homework" && "الواجبات"}
                              {weakPoint === "projects" && "المشاريع"}
                            </span>
                          ))}
                        </div>

                        {student.strengths.length > 0 && (
                          <>
                            <h5 className="font-medium text-gray-900 dark:text-white mt-4 mb-3">نقاط القوة</h5>
                            <div className="flex flex-wrap gap-2">
                              {student.strengths.map((strength, index) => (
                                <span key={index} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs">
                                  {strength === "fast_learner" && "سرعة التعلم"}
                                  {strength === "hard_worker" && "الاجتهاد"}
                                  {strength === "team_player" && "العمل الجماعي"}
                                  {strength === "creative" && "الإبداع"}
                                  {strength === "problem_solver" && "حل المشكلات"}
                                  {strength === "consistent" && "الانتظام"}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Suggested Actions */}
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-3">الإجراءات المقترحة</h5>
                        <div className="space-y-3">
                          {student.suggestedActions.map((action, index) => (
                            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {action.action}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(action.priority)}`}>
                                  {action.priority === "urgent" && "عاجل"}
                                  {action.priority === "high" && "مرتفع"}
                                  {action.priority === "medium" && "متوسط"}
                                  {action.priority === "low" && "منخفض"}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {action.reason}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => handleSendMessage(student)}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm"
                          >
                            <MessageSquare className="w-4 h-4" />
                            إرسال رسالة
                          </button>
                          <button
                            onClick={() => window.location.href = `mailto:${student.email}`}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm"
                          >
                            <Mail className="w-4 h-4" />
                            إرسال بريد
                          </button>
                          <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4" />
                            اتصال هاتفي
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredStudents.length === 0 && (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  لا توجد طلاب معرضين للخطر
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  معدل الاحتفاظ جيد! 🎉
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Analysis */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              تحليل الخطورة
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-gray-700 dark:text-gray-300">عالية الخطورة</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {students.filter(s => s.riskLevel === "high").length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {students.length > 0 
                      ? `${Math.round((students.filter(s => s.riskLevel === "high").length / students.length) * 100)}%`
                      : "0%"
                    }
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <span className="text-gray-700 dark:text-gray-300">متوسطة الخطورة</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {students.filter(s => s.riskLevel === "medium").length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {students.length > 0 
                      ? `${Math.round((students.filter(s => s.riskLevel === "medium").length / students.length) * 100)}%`
                      : "0%"
                    }
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-gray-700 dark:text-gray-300">منخفضة الخطورة</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {students.filter(s => s.riskLevel === "low").length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {students.length > 0 
                      ? `${Math.round((students.filter(s => s.riskLevel === "low").length / students.length) * 100)}%`
                      : "0%"
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Retention Strategies */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              استراتيجيات الاحتفاظ
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-gray-900 dark:text-white">برامج الدعم</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  تقديم جلسات دعم مجانية للطلاب المعرضين للخطر
                </p>
              </div>
              
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Heart className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-gray-900 dark:text-white">التواصل الشخصي</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  مكالمات هاتفية شخصية مع الطلاب ذوي الخطورة العالية
                </p>
              </div>
              
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span className="font-medium text-gray-900 dark:text-white">عروض خاصة</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  خصومات على الدورات القادمة للطلاب المحتاجين إعادة
                </p>
              </div>
              
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <span className="font-medium text-gray-900 dark:text-white">مجموعات الدعم</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  إنشاء مجموعات دعم خاصة بين الطلاب
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}