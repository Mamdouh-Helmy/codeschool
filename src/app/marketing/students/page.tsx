'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Target,
  Filter,
  Search,
  Download,
  MessageSquare,
  Mail,
  Phone,
  Star,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ChevronRight,
  MoreVertical,
  Eye,
  RefreshCw,
  Sparkles,
  Zap
} from "lucide-react";

interface MarketingStudent {
  studentId: string;
  studentName: string;
  email: string;
  whatsappNumber: string;
  enrollmentNumber: string;
  groupName: string;
  courseName: string;
  studentCategory: string;
  overallScore: number;
  finalDecision: string;
  lastContact: string;
  conversionProbability: number;
}

export default function MarketingStudentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<MarketingStudent[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<MarketingStudent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [decisionFilter, setDecisionFilter] = useState<string>("all");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  useEffect(() => {
    fetchStudentsData();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, categoryFilter, decisionFilter]);

  const fetchStudentsData = async () => {
    try {
      setLoading(true);
      // يمكنك إضافة API مخصص لهذه الصفحة أو استخدام API موجود
      const response = await fetch("/api/marketing/retention", {
        credentials: "include"
      });
      
      const result = await response.json();
      if (result.success) {
        // تحويل البيانات من retention إلى تنسيق مناسب
        const marketingStudents = result.data.atRiskStudents?.map((student: any) => ({
          studentId: student.studentId,
          studentName: student.studentName,
          email: student.email,
          whatsappNumber: student.whatsappNumber,
          enrollmentNumber: student.enrollmentNumber,
          groupName: student.groupName,
          courseName: student.courseName,
          studentCategory: student.studentCategory,
          overallScore: student.overallScore,
          finalDecision: student.finalDecision,
          lastContact: new Date().toISOString(), // يمكن استبدالها ببيانات فعلية
          conversionProbability: student.riskLevel === "low" ? 80 : 
                                student.riskLevel === "medium" ? 50 : 20
        })) || [];
        
        setStudents(marketingStudents);
      }
    } catch (error) {
      console.error("Error fetching students data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = [...students];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        student =>
          student.studentName.toLowerCase().includes(term) ||
          student.enrollmentNumber.includes(term) ||
          student.email.toLowerCase().includes(term)
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(student => student.studentCategory === categoryFilter);
    }

    if (decisionFilter !== "all") {
      filtered = filtered.filter(student => student.finalDecision === decisionFilter);
    }

    setFilteredStudents(filtered);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      star_student: "bg-gradient-to-r from-yellow-500 to-amber-500",
      ready_for_next_level: "bg-gradient-to-r from-green-500 to-emerald-500",
      needs_support: "bg-gradient-to-r from-blue-500 to-cyan-500",
      needs_repeat: "bg-gradient-to-r from-orange-500 to-red-500",
      at_risk: "bg-gradient-to-r from-red-500 to-pink-500"
    };
    return colors[category as keyof typeof colors] || "bg-gray-500";
  };

  const getDecisionColor = (decision: string) => {
    const colors = {
      pass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      repeat: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
    };
    return colors[decision as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getCategoryName = (category: string) => {
    const names = {
      star_student: "طالب متميز",
      ready_for_next_level: "جاهز للمستوى التالي",
      needs_support: "يحتاج دعم",
      needs_repeat: "يحتاج إعادة",
      at_risk: "معرض للخطر"
    };
    return names[category as keyof typeof names] || category;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            جاري تحميل بيانات الطلاب...
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
                قاعدة بيانات الطلاب التسويقية
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                إدارة وتصنيف الطلاب لأغراض التسويق
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchStudentsData}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              فلترة الطلاب
            </h3>
            
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="بحث عن طالب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
            >
              <option value="all">كل التصنيفات</option>
              <option value="star_student">طالب متميز</option>
              <option value="ready_for_next_level">جاهز للمستوى التالي</option>
              <option value="needs_support">يحتاج دعم</option>
              <option value="needs_repeat">يحتاج إعادة</option>
              <option value="at_risk">معرض للخطر</option>
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
              onClick={() => {
                setSearchTerm("");
                setCategoryFilter("all");
                setDecisionFilter("all");
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              إعادة تعيين
            </button>
          </div>

          {/* Students Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.map((student) => (
              <div key={student.studentId} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                {/* Student Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getCategoryColor(student.studentCategory)}`}>
                        {student.studentCategory === "star_student" ? (
                          <Star className="w-6 h-6 text-white" />
                        ) : student.studentCategory === "ready_for_next_level" ? (
                          <TrendingUp className="w-6 h-6 text-white" />
                        ) : student.studentCategory === "at_risk" ? (
                          <AlertCircle className="w-6 h-6 text-white" />
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
                          <span className={`px-2 py-1 rounded-full text-xs ${getDecisionColor(student.finalDecision)}`}>
                            {student.finalDecision === "pass" ? "ناجح" :
                             student.finalDecision === "review" ? "مراجعة" : "إعادة"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.studentId)}
                      onChange={() => setSelectedStudents(prev =>
                        prev.includes(student.studentId)
                          ? prev.filter(id => id !== student.studentId)
                          : [...prev, student.studentId]
                      )}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {student.groupName} • {student.courseName}
                  </p>
                </div>

                {/* Student Stats */}
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${
                        student.overallScore >= 4 ? "text-green-600 dark:text-green-400" :
                        student.overallScore >= 3 ? "text-yellow-600 dark:text-yellow-400" :
                        "text-red-600 dark:text-red-400"
                      }`}>
                        {student.overallScore}/5
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">النتيجة</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${
                        student.conversionProbability >= 70 ? "text-green-600 dark:text-green-400" :
                        student.conversionProbability >= 40 ? "text-yellow-600 dark:text-yellow-400" :
                        "text-red-600 dark:text-red-400"
                      }`}>
                        {student.conversionProbability}%
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">احتمال التحويل</div>
                    </div>
                  </div>

                  {/* Category Badge */}
                  <div className="mb-6">
                    <div className="text-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getCategoryColor(student.studentCategory)}`}>
                        {getCategoryName(student.studentCategory)}
                      </span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mb-6 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Mail className="w-4 h-4" />
                      <span>{student.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Phone className="w-4 h-4" />
                      <span>{student.whatsappNumber}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.open(`https://wa.me/${student.whatsappNumber}`, '_blank')}
                      className="flex-1 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <MessageSquare className="w-4 h-4" />
                      تواصل
                    </button>
                    <button
                      onClick={() => router.push(`/marketing/students/${student.studentId}`)}
                      className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                لا توجد طلاب تطابق معايير البحث
              </p>
            </div>
          )}
        </div>

        {/* Categories Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Categories Distribution */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              توزيع التصنيفات
            </h3>
            <div className="space-y-4">
              {["star_student", "ready_for_next_level", "needs_support", "needs_repeat", "at_risk"].map((category) => {
                const count = students.filter(s => s.studentCategory === category).length;
                const percentage = students.length > 0 ? (count / students.length) * 100 : 0;
                
                return (
                  <div key={category} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getCategoryColor(category)}`} />
                      <span className="text-gray-700 dark:text-gray-300">
                        {getCategoryName(category)}
                      </span>
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

          {/* Quick Actions */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              إجراءات سريعة
            </h3>
            <div className="space-y-3">
              <button className="w-full px-4 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg hover:from-primary/90 hover:to-blue-700 transition-all flex items-center justify-between">
                <span>إرسال حملة WhatsApp</span>
                <MessageSquare className="w-4 h-4" />
              </button>
              
              <button className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-between">
                <span>إنشاء حملة بريدية</span>
                <Mail className="w-4 h-4" />
              </button>
              
              <button className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-lg hover:from-purple-600 hover:to-violet-700 transition-all flex items-center justify-between">
                <span>تحديد التصنيفات</span>
                <Target className="w-4 h-4" />
              </button>
              
              <button className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                تصدير البيانات
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}