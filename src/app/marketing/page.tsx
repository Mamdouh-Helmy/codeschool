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
  ChevronRight
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
  };
  evaluations: {
    pass: number;
    review: number;
    repeat: number;
  };
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

interface Lead {
  _id: string;
  fullName: string;
  status: string;
  leadScore: {
    score: number;
  };
}

export default function MarketingDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MarketingStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [timeframe, setTimeframe] = useState("month");

  useEffect(() => {
    fetchDashboardData();
  }, [timeframe]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch marketing stats
      const statsResponse = await fetch(`/api/marketing-dashboard?timeframe=${timeframe}`, {
        credentials: "include"
      });
      const statsResult = await statsResponse.json();
      
      if (statsResult.success) {
        setStats(statsResult.data.stats);
        setCampaigns(statsResult.data.activeCampaigns || []);
      }

      // Fetch recent leads
      const leadsResponse = await fetch(`/api/marketing/leads?timeframe=${timeframe}&limit=5`, {
        credentials: "include"
      });
      const leadsResult = await leadsResponse.json();
      
      if (leadsResult.success) {
        setLeads(leadsResult.data.leads.slice(0, 5) || []);
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCampaignTypeName = (type: string) => {
    const names = {
      evaluation_followup: "متابعة تقييمات",
      retention: "احتفاظ",
      upsell: "ترقية",
      re_enrollment: "إعادة تسجيل",
      referral: "إحالات"
    };
    return names[type as keyof typeof names] || type;
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
              {stats?.campaigns.messagesSent || 0} رسالة مرسلة
            </div>
          </div>

          {/* Leads */}
          <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-purple-100 text-sm">Leads جديدة</p>
                <h3 className="text-2xl font-bold mt-2">
                  {leads.length}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <div className="text-purple-100 text-sm">
              {leads.filter(l => l.status === "new").length} جديد
            </div>
          </div>

          {/* Evaluation Results */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-amber-100 text-sm">تقييمات حديثة</p>
                <h3 className="text-2xl font-bold mt-2">
                  {stats?.evaluations ? Object.values(stats.evaluations).reduce((a, b) => a + b, 0) : 0}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Campaigns Overview */}
          <div className="lg:col-span-2 bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                الحملات النشطة
              </h3>
              <button
                onClick={() => router.push("/marketing/campaigns")}
                className="text-primary hover:underline text-sm"
              >
                عرض الكل
              </button>
            </div>
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign._id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Rocket className="w-4 h-4 text-primary" />
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
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      campaign.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" :
                      campaign.status === "paused" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" :
                      "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                    }`}>
                      {campaign.status === "active" ? "نشطة" : "متوقفة"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {campaign.stats.totalTargets}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">أهداف</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {campaign.stats.conversions}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">تحويلات</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {campaign.stats.conversionRate}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">معدل</div>
                    </div>
                  </div>
                  <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.min(campaign.stats.conversionRate * 2, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && (
                <div className="text-center py-8">
                  <Rocket className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    لا توجد حملات نشطة حالياً
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Leads */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                آخر الـ Leads
              </h3>
              <button
                onClick={() => router.push("/marketing/leads")}
                className="text-primary hover:underline text-sm"
              >
                عرض الكل
              </button>
            </div>
            <div className="space-y-4">
              {leads.map((lead) => (
                <div key={lead._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white">
                      {lead.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {lead.fullName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {lead.status === "new" && "جديد"}
                        {lead.status === "contacted" && "تم التواصل"}
                        {lead.status === "converted" && "محول"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${
                      lead.leadScore.score >= 75 ? "text-green-600 dark:text-green-400" :
                      lead.leadScore.score >= 50 ? "text-yellow-600 dark:text-yellow-400" :
                      "text-red-600 dark:text-red-400"
                    }`}>
                      {lead.leadScore.score}
                    </div>
                    <div className="text-xs text-gray-500">نقاط</div>
                  </div>
                </div>
              ))}
              {leads.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    لا توجد Leads حديثة
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Create Campaign */}
          <button
            onClick={() => router.push("/marketing/campaigns/new")}
            className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                حملة جديدة
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                إنشاء حملة تسويقية جديدة
              </p>
            </div>
          </button>

          {/* Manage Leads */}
          <button
            onClick={() => router.push("/marketing/leads")}
            className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                إدارة الـ Leads
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                متابعة العملاء المحتملين
              </p>
            </div>
          </button>

          {/* Student Retention */}
          <button
            onClick={() => router.push("/marketing/retention")}
            className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                الاحتفاظ بالطلاب
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                متابعة الطلاب المعرضين للخطر
              </p>
            </div>
          </button>

          {/* Upsell Offers */}
          <button
            onClick={() => router.push("/marketing/upsell")}
            className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
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
        </div>
      </div>
    </div>
  );
}