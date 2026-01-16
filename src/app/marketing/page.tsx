// app/marketing/dashboard/page.tsx - صفحة رئيسية مختصرة
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Users,
  TrendingUp,
  MessageSquare,
  DollarSign,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Star,
  Target,
  Zap,
  PieChart,
  LineChart
} from "lucide-react";

interface MarketingStats {
  timeframe: string;
  total: {
    actions: number;
    completed: number;
    students: number;
    successRate: number;
  };
  byActionType: Record<string, any>;
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

export default function MarketingDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MarketingStats | null>(null);
  const [timeframe, setTimeframe] = useState("month");

  useEffect(() => {
    fetchMarketingData();
  }, [timeframe]);

  const fetchMarketingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/marketing-dashboard?timeframe=${timeframe}`, {
        credentials: "include"
      });

      const result = await response.json();

      if (result.success) {
        setStats(result.data.stats);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error fetching marketing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionTypeColor = (type: string) => {
    const colors = {
      upsell: "bg-green-100 text-green-800",
      support: "bg-yellow-100 text-yellow-800",
      re_enroll: "bg-blue-100 text-blue-800",
      referral: "bg-purple-100 text-purple-800",
      feedback: "bg-indigo-100 text-indigo-800"
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            جاري تحميل بيانات الماركتنج...
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
                لوحة تحكم الماركتنج
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                تحليل ومتابعة الحملات التسويقية
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
                onClick={fetchMarketingData}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Actions */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">إجمالي الإجراءات</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats?.total.actions || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {stats?.total.completed || 0} مكتملة
            </p>
          </div>

          {/* Success Rate */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">معدل النجاح</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats?.total.successRate || 0}%
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {stats?.total.students || 0} طالب
            </p>
          </div>

          {/* Active Campaigns */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">الحملات النشطة</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats?.campaigns.active || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {stats?.campaigns.totalTargets || 0} هدف
            </p>
          </div>

          {/* Messages Sent */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">الرسائل المرسلة</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats?.campaigns.messagesSent || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              عبر WhatsApp
            </p>
          </div>
        </div>

        {/* Action Types Breakdown */}
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            توزيع الإجراءات حسب النوع
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {stats?.byActionType && Object.entries(stats.byActionType).map(([type, data]: [string, any]) => (
              <div key={type} className="text-center p-4 rounded-lg border">
                <div className={`inline-block px-3 py-1 rounded-full text-sm mb-2 ${getActionTypeColor(type)}`}>
                  {type === "upsell" && "ترقية"}
                  {type === "support" && "دعم"}
                  {type === "re_enroll" && "إعادة تسجيل"}
                  {type === "referral" && "إحالات"}
                  {type === "feedback" && "تقييمات"}
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data.total}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {data.successRate}% نجاح
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Evaluation Decisions */}
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            قرارات التقييم
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {stats?.evaluations.pass || 0}
              </div>
              <div className="text-sm text-green-600 dark:text-green-300">ناجح</div>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                {stats?.evaluations.review || 0}
              </div>
              <div className="text-sm text-yellow-600 dark:text-yellow-300">مراجعة</div>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                {stats?.evaluations.repeat || 0}
              </div>
              <div className="text-sm text-red-600 dark:text-red-300">إعادة</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/marketing/campaigns"
            className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:border-primary/50 border"
          >
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-primary" />
              <h3 className="font-semibold text-gray-900 dark:text-white">إدارة الحملات</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              إنشاء وتعديل ومتابعة الحملات التسويقية
            </p>
            <div className="text-primary text-sm">عرض الحملات →</div>
          </Link>

          <Link
            href="/marketing/students"
            className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:border-primary/50 border"
          >
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-primary" />
              <h3 className="font-semibold text-gray-900 dark:text-white">تصنيف الطلاب</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              عرض وتصنيف الطلاب بناءً على التقييمات
            </p>
            <div className="text-primary text-sm">استعراض الطلاب →</div>
          </Link>

          <Link
            href="/marketing/analytics"
            className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:border-primary/50 border"
          >
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-6 h-6 text-primary" />
              <h3 className="font-semibold text-gray-900 dark:text-white">تقارير متقدمة</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              تحليلات تفصيلية وأداء الحملات
            </p>
            <div className="text-primary text-sm">التقارير →</div>
          </Link>
        </div>
      </div>
    </div>
  );
}