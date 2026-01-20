'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  MessageSquare,
  Filter,
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Sparkles,
  Zap,
  Rocket,
  Star,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight,
  LineChart
} from "lucide-react";

interface MarketingStats {
  total: {
    actions: number;
    completed: number;
    students: number;
    successRate: number;
  };
  campaigns: {
    active: number;
    totalTargets: number;
    messagesSent: number;
    conversions: number;
    conversionRate: number;
  };
  evaluations: {
    pass: number;
    review: number;
    repeat: number;
    total: number;
  };
  leads: {
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
    total: number;
  };
  byActionType?: Record<string, any>;
}

interface Campaign {
  _id: string;
  name: string;
  campaignType: string;
  status: string;
  stats: {
    totalTargets: number;
    messagesSent: number;
    conversions: number;
    conversionRate: number;
  };
}

interface MarketingAction {
  _id: string;
  actionType: string;
  status: string;
  createdAt: string;
  targetStudent?: {
    personalInfo?: {
      fullName: string;
    };
  };
  targetGroup?: {
    name: string;
  };
  results?: {
    messageSent?: boolean;
    conversion?: boolean;
  };
}

export default function MarketingDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MarketingStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recentActions, setRecentActions] = useState<MarketingAction[]>([]);
  const [timeframe, setTimeframe] = useState("month");

  useEffect(() => {
    fetchDashboardData();
  }, [timeframe]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch marketing dashboard data
      const response = await fetch(`/api/marketing-dashboard?timeframe=${timeframe}`, {
        credentials: "include"
      });
      
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data.stats);
        setCampaigns(result.data.activeCampaigns || []);
        setRecentActions(result.data.recentActions || []);
      } else {
        console.error("Failed to fetch dashboard data:", result.message);
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCampaignTypeName = (type: string) => {
    const names: Record<string, string> = {
      evaluation_followup: "متابعة تقييمات",
      retention: "احتفاظ",
      upsell: "ترقية",
      re_enrollment: "إعادة تسجيل",
      referral: "إحالات",
      bulk_upsell: "ترقية جماعية",
      group_completed: "انتهاء المجموعات"
    };
    return names[type] || type;
  };

  const getActionTypeName = (type: string) => {
    const names: Record<string, string> = {
      upsell: "ترقية",
      support: "دعم",
      re_enroll: "إعادة تسجيل",
      referral: "إحالة",
      feedback: "تقييم",
      welcome: "ترحيب",
      reminder: "تذكير",
      announcement: "إعلان"
    };
    return names[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      active: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      paused: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
    };
    return colors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };

  const getStatusName = (status: string) => {
    const names: Record<string, string> = {
      completed: "مكتمل",
      pending: "معلق",
      failed: "فشل",
      active: "نشط",
      paused: "متوقف",
      in_progress: "قيد التنفيذ"
    };
    return names[status] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            جاري تحميل لوحة الماركتنج...
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
                لوحة الماركتنج
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                نظرة شاملة على أداء التسويق والأتمتة
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
                onClick={fetchDashboardData}
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
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Actions */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-blue-100 text-sm">إجمالي الإجراءات</p>
                <h3 className="text-2xl font-bold mt-2">
                  {stats?.total.actions || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
            </div>
            <div className="text-blue-100 text-sm">
              {stats?.total.completed || 0} مكتمل ({stats?.total.successRate || 0}%)
            </div>
          </div>

          {/* Active Campaigns */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-green-100 text-sm">حملات نشطة</p>
                <h3 className="text-2xl font-bold mt-2">
                  {stats?.campaigns.active || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Rocket className="w-6 h-6" />
              </div>
            </div>
            <div className="text-green-100 text-sm">
              {stats?.campaigns.conversions || 0} تحويل
            </div>
          </div>

          {/* Leads */}
          <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-purple-100 text-sm">Leads جديدة</p>
                <h3 className="text-2xl font-bold mt-2">
                  {stats?.leads?.new || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <div className="text-purple-100 text-sm">
              {stats?.leads?.converted || 0} تم تحويلهم
            </div>
          </div>

          {/* Evaluation Results */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-amber-100 text-sm">تقييمات حديثة</p>
                <h3 className="text-2xl font-bold mt-2">
                  {stats?.evaluations?.total || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
            </div>
            <div className="text-amber-100 text-sm">
              {stats?.evaluations?.pass || 0} ناجح
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          {/* Campaigns Overview */}
          <div className="lg:col-span-2 bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                الحملات النشطة
              </h3>
              <button
                onClick={() => router.push("/marketing/campaigns")}
                className="text-primary hover:underline text-sm flex items-center gap-1"
              >
                عرض الكل
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {campaigns.length > 0 ? (
                campaigns.map((campaign) => (
                  <div key={campaign._id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Rocket className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {campaign.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {getCampaignTypeName(campaign.campaignType)}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(campaign.status)}`}>
                        {getStatusName(campaign.status)}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {campaign.stats?.totalTargets || 0}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">أهداف</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {campaign.stats?.messagesSent || 0}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">رسائل</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {campaign.stats?.conversions || 0}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">تحويلات</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {campaign.stats?.conversionRate?.toFixed(1) || 0}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">معدل</div>
                      </div>
                    </div>
                    <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ 
                          width: `${Math.min(campaign.stats?.conversionRate || 0, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Rocket className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    لا توجد حملات نشطة حالياً
                  </p>
                  <button
                    onClick={() => router.push("/marketing/campaigns")}
                    className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    إنشاء حملة جديدة
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Recent Actions */}
          {/* <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                أحدث الإجراءات
              </h3>
              <button
                onClick={() => router.push("/marketing/actions")}
                className="text-primary hover:underline text-sm flex items-center gap-1"
              >
                عرض الكل
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {recentActions.length > 0 ? (
                recentActions.map((action) => (
                  <div key={action._id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {getActionTypeName(action.actionType)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {action.targetStudent?.personalInfo?.fullName || "طالب"}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(action.status)}`}>
                        {getStatusName(action.status)}
                      </span>
                    </div>
                    {action.results?.conversion && (
                      <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        تم التحويل بنجاح
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Activity className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    لا توجد إجراءات حديثة
                  </p>
                </div>
              )}
            </div>
          </div> */}
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* All Students */}
          <button
            onClick={() => router.push("/marketing/students")}
            className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-left"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                جميع الطلاب
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                إدارة جميع فئات الطلاب
              </p>
            </div>
          </button>

          {/* Upsell Offers */}
          <button
            onClick={() => router.push("/marketing/upsell")}
            className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-left"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                عروض الترقية
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ترقية الطلاب الناجحين
              </p>
            </div>
          </button>

          {/* Student Retention */}
          {/* <button
            onClick={() => router.push("/marketing/retention")}
            className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-left"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                الاحتفاظ بالطلاب
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                المعرضين للخطر
              </p>
            </div>
          </button> */}

          {/* Reports */}
          <button
            onClick={() => router.push("/marketing/analytics")}
            className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-left"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-500 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                التقارير
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                تقارير الأداء والتحليل
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}