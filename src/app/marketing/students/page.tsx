'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Users,
  Filter,
  Search,
  Target,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Zap,
  Rocket,
  Send,
  X,
  Edit,
  Star,
  Award,
  HelpCircle,
  Repeat
} from "lucide-react";

interface MarketingStudent {
  studentId: string;
  studentName: string;
  whatsappNumber: string;
  email: string;
  enrollmentNumber: string;
  currentCourseName: string;
  currentCourseLevel: string;
  overallScore: number;
  studentCategory: string;
  finalDecision: string;
  groupName: string;
  groupCode: string;
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
    offerType: string;
  } | null;
  estimatedConversionProbability: number;
  attendancePercentage?: number;
  weakPoints?: string[];
  strengths?: string[];
}

interface MarketingStats {
  totalStudents: number;
  starStudents: number;
  readyForNextLevel: number;
  needsSupport: number;
  needsRepeat: number;
  atRisk: number;
  totalOffersMade: number;
  conversionRate: number;
  estimatedRevenue: number;
}

export default function MarketingAllStudentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<MarketingStudent[]>([]);
  const [stats, setStats] = useState<MarketingStats | null>(null);
  const [filteredStudents, setFilteredStudents] = useState<MarketingStudent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [decisionFilter, setDecisionFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<MarketingStudent | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [timeframe, setTimeframe] = useState("month");

  useEffect(() => {
    fetchStudentsData();
  }, [timeframe]);

  useEffect(() => {
    filterAndSortStudents();
  }, [students, searchTerm, categoryFilter, decisionFilter, levelFilter]);

  const fetchStudentsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/marketing/all-students?timeframe=${timeframe}`, {
        credentials: "include"
      });

      const result = await response.json();
      if (result.success) {
        setStudents(result.data.students);
        setStats(result.data.stats);
      }
    } catch (error) {
      console.error("Error fetching students data:", error);
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
          student.currentCourseName.toLowerCase().includes(term) ||
          student.groupName.toLowerCase().includes(term)
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(student => student.studentCategory === categoryFilter);
    }

    if (decisionFilter !== "all") {
      filtered = filtered.filter(student => student.finalDecision === decisionFilter);
    }

    if (levelFilter !== "all") {
      filtered = filtered.filter(student => student.currentCourseLevel === levelFilter);
    }

    // ترتيب حسب الأولوية (المتميزين أولاً، ثم المعرضين للخطر)
    filtered.sort((a, b) => {
      const priorityOrder = {
        'star_student': 1,
        'ready_for_next_level': 2,
        'needs_support': 3,
        'needs_repeat': 4,
        'at_risk': 5
      };
      return (priorityOrder[a.studentCategory as keyof typeof priorityOrder] || 6) -
        (priorityOrder[b.studentCategory as keyof typeof priorityOrder] || 6);
    });

    setFilteredStudents(filtered);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      star_student: "bg-gradient-to-br from-yellow-400 to-amber-600",
      ready_for_next_level: "bg-gradient-to-br from-green-400 to-emerald-600",
      needs_support: "bg-gradient-to-br from-blue-400 to-cyan-600",
      needs_repeat: "bg-gradient-to-br from-orange-400 to-red-600",
      at_risk: "bg-gradient-to-br from-red-400 to-pink-600"
    };
    return colors[category as keyof typeof colors] || "bg-gradient-to-br from-gray-400 to-gray-600";
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      star_student: Star,
      ready_for_next_level: TrendingUp,
      needs_support: HelpCircle,
      needs_repeat: Repeat,
      at_risk: AlertCircle
    };
    return icons[category as keyof typeof icons] || Users;
  };

  const getDecisionColor = (decision: string) => {
    const colors = {
      pass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      repeat: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
    };
    return colors[decision as keyof typeof colors] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
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

  const getDecisionName = (decision: string) => {
    const names = {
      pass: "ناجح",
      review: "مراجعة",
      repeat: "إعادة"
    };
    return names[decision as keyof typeof names] || decision;
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 70) return "text-green-600 dark:text-green-400";
    if (probability >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const handleCreateOffer = (student: MarketingStudent) => {
    setSelectedStudent(student);

    // إنشاء رسالة مخصصة حسب حالة الطالب
    let defaultMessage = "";
    const studentName = student.studentName;
    const courseName = student.currentCourseName;

    switch (student.studentCategory) {
      case 'star_student':
        defaultMessage = `🎉 مبروك ${studentName}!

أداؤك في ${courseName} كان استثنائياً! 🏆

نقدم لك عرضاً حصرياً للطلاب المتميزين:
**${student.suggestedOffer?.targetCourseName || "الكورس المتقدم"}**

🏆 **عرض التميز:**
• خصم خاص: ${student.suggestedOffer?.discountPercentage || 25}%
• شهادة تميز خاصة
• دعم مباشر من أفضل المدربين
• فرص تدريب في شركات كبرى

📞 للاستفادة من العرض، رد بكلمة "نعم" أو اتصل بنا مباشرة.

مع تحيات فريق Code School 💻✨`;
        break;

      case 'ready_for_next_level':
        defaultMessage = `👍 أحسنت ${studentName}!

أكملت ${courseName} بنجاح 🎓

نقدم لك عرضاً خاصاً للانتقال للمستوى التالي:
**${student.suggestedOffer?.targetCourseName || "المستوى المتقدم"}**

🎯 **العرض الخاص:**
• خصم: ${student.suggestedOffer?.discountPercentage || 15}%
• جلسة تعريفية مجانية
• مواد إضافية مجانية
• متابعة شخصية

📞 للاستفادة من العرض، رد بكلمة "نعم" أو اتصل بنا مباشرة.

مع تحيات فريق Code School 💻✨`;
        break;

      case 'needs_support':
        defaultMessage = `👋 ${studentName}، أداؤك في ${courseName} جيد!

لكن نلاحظ أنك تحتاج بعض الدعم في:
${student.weakPoints?.map(point => `• ${getWeakPointName(point)}`).join('\n') || 'بعض النقاط'}

نقترح عليك:
✅ جلسات دعم مجانية (3 جلسات)
✅ مراجعة جميع المشاريع
✅ خصم ${student.suggestedOffer?.discountPercentage || 20}% للاستمرار معنا
✅ متابعة أسبوعية مع المدرب

🎯 هدفنا: نوصل معاك لـ 100% استفادة!
📞 رد علينا عشان نبدأ خطة الدعم.

مع تحيات فريق Code School 💻✨`;
        break;

      case 'needs_repeat':
        defaultMessage = `🔄 ${studentName}، علشان تستفيد 100% من ${courseName}

بنقترح إعادة الكورس مع:
✅ دعم شخصي مكثف (جلسة أسبوعياً)
✅ خصم ${student.suggestedOffer?.discountPercentage || 40}% على إعادة الكورس
✅ مراجعة جميع المشاريع والدروس
✅ متابعة يومية مع المدرب

${student.weakPoints?.length ? `🎯 سنركز معاك على: ${student.weakPoints.map(wp => getWeakPointName(wp)).join('، ')}` : ''}

💪 المستوى الجاي بتكون أقوى ومستعد 100%!
💰 السعر بعد الخصم: ${student.suggestedOffer?.discountedPrice || 0} ج.م
📞 رد علشان نحجز مكانك!

مع تحيات فريق Code School 💻✨`;
        break;

      case 'at_risk':
        defaultMessage = `🔔 ${studentName}، نرى أن ${courseName} كان تحدياً!

لكن نحن هنا لنساعدك! نقدم لك:
✅ خطة دعم شخصية مكثفة
✅ خصم ${student.suggestedOffer?.discountPercentage || 50}% على إعادة الكورس
✅ جلسات علاجية للمواضيع الصعبة
✅ مراجعة شاملة لكل الدروس

${student.weakPoints?.length ? `🎯 سنعمل معاك على: ${student.weakPoints.map(wp => getWeakPointName(wp)).join('، ')}` : ''}

🎯 **هدفنا:** نجاحك هو أولويتنا!
📞 **تواصل معنا الآن** لوضع خطة النجاح.

مع تحيات فريق Code School 💻✨`;
        break;

      default:
        defaultMessage = `مرحباً ${studentName}،

نقدم لك عرضاً خاصاً للتطوير التعليمي بناءً على أدائك في ${courseName}.

📞 للتفاصيل والاستفسار، تواصل معنا مباشرة.

مع تحيات فريق Code School 💻✨`;
    }

    setCustomMessage(defaultMessage);
    setShowOfferModal(true);
  };

  const getWeakPointName = (point: string) => {
    const names: Record<string, string> = {
      understanding: "الفهم النظري",
      practice: "الممارسة العملية",
      attendance: "الحضور والانتظام",
      participation: "المشاركة في الفصل",
      homework: "إنجاز الواجبات",
      projects: "تنفيذ المشاريع"
    };
    return names[point] || point;
  };

  const sendOffer = async () => {
    if (!selectedStudent) return;

    try {
      // أولاً: إنشاء إجراء تسويقي
      const response = await fetch("/api/marketing/all-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          studentId: selectedStudent.studentId,
          studentCategory: selectedStudent.studentCategory,
          finalDecision: selectedStudent.finalDecision,
          targetCourseId: selectedStudent.availableCourses[0]?._id,
          offerType: selectedStudent.studentCategory === 'needs_repeat' || selectedStudent.studentCategory === 'at_risk' ? 'retention' : 'upsell',
          offerDetails: {
            discountPercentage: selectedStudent.suggestedOffer?.discountPercentage ||
              (selectedStudent.studentCategory === 'star_student' ? 25 :
                selectedStudent.studentCategory === 'ready_for_next_level' ? 15 :
                  selectedStudent.studentCategory === 'needs_support' ? 20 :
                    selectedStudent.studentCategory === 'needs_repeat' ? 40 : 50),
            message: customMessage,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        // ثانياً: إرسال الرسالة عبر WhatsApp
        const whatsappResponse = await fetch("/api/marketing-automation/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            studentId: selectedStudent.studentId,
            whatsappNumber: selectedStudent.whatsappNumber,
            message: customMessage,
            offerType: selectedStudent.studentCategory,
            actionId: result.action?._id
          })
        });

        const whatsappResult = await whatsappResponse.json();

        if (whatsappResult.success) {
          alert(`✅ تم إنشاء وعرض ${getCategoryName(selectedStudent.studentCategory)} بنجاح وتم إرسال الرسالة!`);
          setShowOfferModal(false);
          setSelectedStudent(null);
          fetchStudentsData();
        } else {
          alert("⚠️ تم إنشاء العرض ولكن حدث خطأ في إرسال الرسالة");
        }
      }
    } catch (error) {
      console.error("Error creating/sending offer:", error);
      alert("❌ حدث خطأ أثناء إنشاء/إرسال العرض");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            جاري تحميل بيانات جميع الطلاب...
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
                جميع الطلاب للتسويق
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                إدارة عروض الترقية والدعم لجميع فئات الطلاب
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
                onClick={fetchStudentsData}
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
          {/* Total Students */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">إجمالي الطلاب</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats?.totalStudents || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {stats?.starStudents || 0} طالب متميز
            </div>
          </div>

          {/* Ready for Next Level */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">جاهز للمستوى التالي</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats?.readyForNextLevel || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {stats?.needsSupport || 0} يحتاج دعم
            </div>
          </div>

          {/* Needs Attention */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">يحتاج اهتمام</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {(stats?.needsRepeat || 0) + (stats?.atRisk || 0)}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {stats?.needsRepeat || 0} إعادة، {stats?.atRisk || 0} معرض للخطر
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">معدل التحويل</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats?.conversionRate || 0}%
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {stats?.totalOffersMade || 0} عرض تم تقديمه
            </div>
          </div>
        </div>

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
                placeholder="بحث عن طالب، مجموعة، كورس..."
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
              <option value="star_student">طلاب متميزون</option>
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

            <button
              onClick={() => {
                setSearchTerm("");
                setCategoryFilter("all");
                setDecisionFilter("all");
                setLevelFilter("all");
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              إعادة تعيين
            </button>
          </div>

          {/* Students Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.map((student) => {
              const CategoryIcon = getCategoryIcon(student.studentCategory);
              return (
                <div key={student.studentId} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Student Header */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getCategoryColor(student.studentCategory)}`}>
                          <CategoryIcon className="w-6 h-6 text-white" />
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
                              {getDecisionName(student.finalDecision)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getProbabilityColor(student.estimatedConversionProbability)}`}>
                          {student.estimatedConversionProbability}%
                        </div>
                        <div className="text-xs text-gray-500">احتمال التحويل</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {student.groupName} • {student.currentCourseName}
                      </p>
                      <span className="text-sm font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {student.currentCourseLevel === 'beginner' ? 'مبتدئ' :
                          student.currentCourseLevel === 'intermediate' ? 'متوسط' : 'متقدم'}
                      </span>
                    </div>
                  </div>

                  {/* Student Stats */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <div className={`text-xl font-bold ${student.overallScore >= 4 ? "text-green-600 dark:text-green-400" :
                            student.overallScore >= 3 ? "text-yellow-600 dark:text-yellow-400" :
                              "text-red-600 dark:text-red-400"
                          }`}>
                          {student.overallScore}/5
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">النتيجة</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {student.attendancePercentage || 0}%
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">الحضور</div>
                      </div>
                    </div>

                    {/* Category Badge */}
                    <div className="mb-4">
                      <div className="text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getCategoryColor(student.studentCategory)}`}>
                          {getCategoryName(student.studentCategory)}
                        </span>
                      </div>
                    </div>

                    {/* Suggested Offer */}
                    {student.suggestedOffer ? (
                      <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="font-medium text-gray-900 dark:text-white text-sm">
                              {student.suggestedOffer.targetCourseName}
                            </span>
                          </div>
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs">
                            {student.suggestedOffer.discountPercentage}% خصم
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            {student.suggestedOffer.discountedPrice.toLocaleString()} ج.م
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                            {(student.suggestedOffer.discountedPrice / (1 - student.suggestedOffer.discountPercentage / 100)).toLocaleString()} ج.م
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          لا يوجد عرض مقترح تلقائياً
                        </p>
                      </div>
                    )}

                    {/* Contact Info */}
                    <div className="mb-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <MessageSquare className="w-4 h-4" />
                        <span>{student.whatsappNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Send className="w-4 h-4" />
                        <span>{student.email}</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => handleCreateOffer(student)}
                      className="w-full px-4 py-2 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg hover:from-primary/90 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      إنشاء عرض {getCategoryName(student.studentCategory)}
                    </button>
                  </div>
                </div>
              );
            })}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Categories Distribution */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              توزيع تصنيفات الطلاب
            </h3>
            <div className="space-y-4">
              {["star_student", "ready_for_next_level", "needs_support", "needs_repeat", "at_risk"].map((category) => {
                const count = students.filter(s => s.studentCategory === category).length;
                const percentage = students.length > 0 ? (count / students.length) * 100 : 0;
                const CategoryIcon = getCategoryIcon(category);

                return (
                  <div key={category} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColor(category)}`}>
                        <CategoryIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {getCategoryName(category)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {category === 'star_student' ? 'طلاب متميزون' :
                            category === 'ready_for_next_level' ? 'جاهزين للترقية' :
                              category === 'needs_support' ? 'بحاجة للدعم' :
                                category === 'needs_repeat' ? 'بحاجة للإعادة' : 'معرضين للخطر'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900 dark:text-white text-lg">{count}</div>
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
              إجراءات سريعة للجميع
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  const starStudents = filteredStudents.filter(s => s.studentCategory === 'star_student');
                  if (starStudents.length > 0) {
                    handleCreateOffer(starStudents[0]);
                  } else {
                    alert("لا توجد طلاب متميزين في القائمة المصفاة");
                  }
                }}
                className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-lg hover:from-yellow-600 hover:to-amber-700 transition-all flex items-center justify-between"
              >
                <span>إنشاء عرض لطالب متميز</span>
                <Star className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  const atRiskStudents = filteredStudents.filter(s => s.studentCategory === 'at_risk');
                  if (atRiskStudents.length > 0) {
                    handleCreateOffer(atRiskStudents[0]);
                  } else {
                    alert("لا توجد طلاب معرضين للخطر في القائمة المصفاة");
                  }
                }}
                className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-700 transition-all flex items-center justify-between"
              >
                <span>إنشاء عرض لطالب معرض للخطر</span>
                <AlertCircle className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  const needsRepeat = filteredStudents.filter(s => s.studentCategory === 'needs_repeat');
                  if (needsRepeat.length > 0) {
                    handleCreateOffer(needsRepeat[0]);
                  } else {
                    alert("لا توجد طلاب بحاجة لإعادة في القائمة المصفاة");
                  }
                }}
                className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all flex items-center justify-between"
              >
                <span>إنشاء عرض لإعادة كورس</span>
                <Repeat className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-secondary rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  إنشاء {getCategoryName(selectedStudent.studentCategory)}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  للطالب: {selectedStudent.studentName} • {getDecisionName(selectedStudent.finalDecision)}
                </p>
              </div>
              <button
                onClick={() => setShowOfferModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Student Info */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">التصنيف</p>
                    <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${getCategoryColor(selectedStudent.studentCategory).split(' ')[0]}`}></span>
                      {getCategoryName(selectedStudent.studentCategory)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">الكورس الحالي</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedStudent.currentCourseName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">رقم الواتساب</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedStudent.whatsappNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">النتيجة</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedStudent.overallScore}/5
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom Message Editor */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    تعديل الرسالة قبل الإرسال:
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {customMessage.length} حرف
                    </span>
                    <button
                      onClick={() => {
                        // إعادة تعيين الرسالة الافتراضية
                        handleCreateOffer(selectedStudent);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      إعادة تعيين
                    </button>
                  </div>
                </div>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full h-64 p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white resize-none"
                  placeholder="قم بتعديل الرسالة هنا..."
                />
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  💡 يمكنك تعديل الرسالة لجعلها أكثر تخصيصاً للطالب
                </div>
              </div>

              {/* Offer Summary */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  تفاصيل الإرسال:
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">نوع العرض</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {getCategoryName(selectedStudent.studentCategory)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">سيتم الإرسال إلى</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedStudent.whatsappNumber}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {selectedStudent.studentName} • {selectedStudent.enrollmentNumber}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowOfferModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={sendOffer}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  إرسال العرض
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}