'use client';

import { useEffect, useState } from "react";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  DollarSign,
  MessageSquare,
  Target,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  ChevronRight,
  Activity,
  Sparkles,
  Zap
} from "lucide-react";

interface AnalyticsData {
  conversionByType: Record<string, {
    count: number;
    totalRevenue: number;
    averageRevenue: number;
  }>;
  monthlyTrend: Array<{
    _id: string;
    count: number;
    revenue: number;
  }>;
  campaignPerformance: Array<{
    _id: string;
    totalCampaigns: number;
    conversionRate: number;
    totalRevenue: number;
  }>;
  leadStats: {
    total: number;
    converted: number;
    conversionRate: number;
    revenue: number;
  };
}

export default function MarketingAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeframe, setTimeframe] = useState("month");
  const [chartType, setChartType] = useState("conversion");

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeframe]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/marketing-dashboard?timeframe=${timeframe}`, {
        credentials: "include"
      });
      
      const result = await response.json();
      if (result.success) {
        setData(result.data.conversionStats);
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            جاري تحميل التحليلات...
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
                التحليلات والتقارير
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                تحليل أداء الحملات والتحويلات
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
                onClick={fetchAnalyticsData}
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
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Conversions */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">إجمالي التحويلات</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {Object.values(data?.conversionByType || {}).reduce((sum, item) => sum + item.count, 0) || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              عبر جميع الحملات
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">إجمالي الإيرادات</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {Object.values(data?.conversionByType || {}).reduce((sum, item) => sum + item.totalRevenue, 0).toLocaleString() || 0} ج.م
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              من التسويق الآلي
            </div>
          </div>

          {/* Avg Revenue */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">متوسط الإيرادات</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {Object.values(data?.conversionByType || {}).reduce((sum, item) => sum + item.averageRevenue, 0).toLocaleString() || 0} ج.م
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              لكل تحويل
            </div>
          </div>

          {/* Lead Conversion */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">تحويل الـ Leads</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {data?.leadStats?.conversionRate || 0}%
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {data?.leadStats?.converted || 0} محول
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Conversion by Type */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                التحويلات حسب النوع
              </h3>
              <button className="text-primary hover:underline text-sm">
                <Download className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {data?.conversionByType && Object.entries(data.conversionByType).map(([type, stats]) => (
                <div key={type} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      {type === "upsell" && <TrendingUp className="w-4 h-4 text-primary" />}
                      {type === "support" && <Activity className="w-4 h-4 text-primary" />}
                      {type === "re_enroll" && <RefreshCw className="w-4 h-4 text-primary" />}
                      {type === "referral" && <Users className="w-4 h-4 text-primary" />}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {type === "upsell" && "ترقية"}
                        {type === "support" && "دعم"}
                        {type === "re_enroll" && "إعادة تسجيل"}
                        {type === "referral" && "إحالات"}
                        {type === "feedback" && "ملاحظات"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {stats.count}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {stats.totalRevenue.toLocaleString()} ج.م
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                اتجاه الشهر
              </h3>
              <button className="text-primary hover:underline text-sm">
                <Download className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {data?.monthlyTrend?.slice(-6).map((month) => (
                <div key={month._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {new Date(month._id).toLocaleDateString("ar-EG", { month: "long" })}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {month.count} تحويل
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {month.revenue.toLocaleString()} ج.م
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Campaign Performance */}
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              أداء الحملات
            </h3>
            <button className="text-primary hover:underline text-sm">
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {data?.campaignPerformance?.map((campaign) => (
              <div key={campaign._id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {campaign._id === "evaluation_followup" ? "متابعة" :
                     campaign._id === "upsell" ? "ترقية" :
                     campaign._id === "retention" ? "احتفاظ" :
                     campaign._id === "re_enrollment" ? "إعادة" : campaign._id}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {campaign.totalCampaigns} حملة
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">معدل التحويل</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {campaign.conversionRate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${Math.min(campaign.conversionRate * 2, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {campaign.totalRevenue.toLocaleString()} ج.م
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">إيرادات</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4">
                <Download className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                تصدير تقرير كامل
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                PDF شامل للتحليلات
              </p>
            </div>
          </button>

          <button className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                تقرير الحملات
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                تحليل أداء الحملات
              </p>
            </div>
          </button>

          <button className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                تقرير التحويلات
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                تحليل معدلات التحويل
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}