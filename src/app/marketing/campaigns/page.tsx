"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Target,
  TrendingUp,
  Users,
  MessageSquare,
  Calendar,
  Filter,
  Search,
  Download,
  Plus,
  Play,
  Pause,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  DollarSign,
  Eye,
  Edit,
  MoreVertical,
  RefreshCw,
  ChevronRight,
  Activity,
  Zap,
  Rocket,
  Sparkles,
  AlertCircle
} from "lucide-react";

interface Campaign {
  _id: string;
  name: string;
  code: string;
  description: string;
  campaignType: string;
  status: string;
  stats: {
    totalTargets: number;
    messagesSent: number;
    conversions: number;
    conversionRate: number;
    totalRevenue: number;
    startDate: string;
    endDate: string;
  };
  schedule: {
    startDate: string;
    endDate: string;
  };
  budget: {
    allocated: number;
    spent: number;
    remaining: number;
  };
  metadata: {
    createdAt: string;
  };
  detailedStats?: {
    totalActions: number;
    totalRevenue: number;
    conversions: number;
    conversionRate: number;
    roi: number;
  };
  performanceScore: number;
  daysRemaining: number | null;
}

interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalRevenue: number;
  totalConversions: number;
  overallConversionRate: number;
  avgCostPerAction: number;
  avgROI: number;
}

export default function MarketingCampaignsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("performance");
  const [timeframe, setTimeframe] = useState("month");

  useEffect(() => {
    fetchCampaignsData();
  }, [timeframe]);

  useEffect(() => {
    filterAndSortCampaigns();
  }, [campaigns, searchTerm, statusFilter, typeFilter, sortBy]);

  const fetchCampaignsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/marketing/campaigns?timeframe=${timeframe}`, {
        credentials: "include"
      });

      const result = await response.json();

      if (result.success) {
        setCampaigns(result.data.campaigns);
        setStats(result.data.summary);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error fetching campaigns data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortCampaigns = () => {
    let filtered = [...campaigns];

    // البحث
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        campaign =>
          campaign.name.toLowerCase().includes(term) ||
          campaign.code.toLowerCase().includes(term) ||
          campaign.description?.toLowerCase().includes(term) ||
          campaign.campaignType.toLowerCase().includes(term)
      );
    }

    // فلترة الحالة
    if (statusFilter !== "all") {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }

    // فلترة النوع
    if (typeFilter !== "all") {
      filtered = filtered.filter(campaign => campaign.campaignType === typeFilter);
    }

    // الترتيب
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "performance":
          return b.performanceScore - a.performanceScore;
        case "revenue":
          return (b.detailedStats?.totalRevenue || 0) - (a.detailedStats?.totalRevenue || 0);
        case "conversion":
          return (b.detailedStats?.conversionRate || 0) - (a.detailedStats?.conversionRate || 0);
        case "newest":
          return new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime();
        case "ending":
          return (a.daysRemaining || 999) - (b.daysRemaining || 999);
        default:
          return 0;
      }
    });

    setFilteredCampaigns(filtered);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      archived: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getTypeColor = (type: string) => {
    const colors = {
      evaluation_followup: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
      retention: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      upsell: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      re_enrollment: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
      referral: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
      welcome: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      reactivation: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
      feedback: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
      announcement: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
      promotional: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300"
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      evaluation_followup: Target,
      retention: Activity,
      upsell: TrendingUp,
      re_enrollment: RefreshCw,
      referral: Users,
      welcome: Sparkles,
      reactivation: Zap,
      feedback: MessageSquare,
      announcement: Rocket,
      promotional: DollarSign
    };
    return icons[type as keyof typeof icons] || Target;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "غير محدد";
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("ar-EG");
  };

  const handleCampaignAction = async (campaignId: string, action: string) => {
    try {
      const response = await fetch(`/api/marketing/campaigns?campaignId=${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: action })
      });

      const result = await response.json();
      if (result.success) {
        fetchCampaignsData();
      }
    } catch (error) {
      console.error("Error updating campaign:", error);
    }
  };

  const handleExportCampaigns = () => {
    const csvContent = [
      ["Name", "Code", "Type", "Status", "Targets", "Messages", "Conversions", "Rate", "Revenue", "Start", "End"],
      ...filteredCampaigns.map(campaign => [
        campaign.name,
        campaign.code,
        campaign.campaignType,
        campaign.status,
        campaign.stats.totalTargets,
        campaign.stats.messagesSent,
        campaign.stats.conversions,
        `${campaign.stats.conversionRate}%`,
        formatNumber(campaign.stats.totalRevenue),
        formatDate(campaign.schedule.startDate),
        formatDate(campaign.schedule.endDate)
      ])
    ]
      .map(row => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaigns-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            جاري تحميل بيانات الحملات...
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
                إدارة الحملات
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                إنشاء وإدارة الحملات التسويقية
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
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
                onClick={fetchCampaignsData}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push("/marketing/campaigns/new")}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                حملة جديدة
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Campaigns */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">إجمالي الحملات</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats?.totalCampaigns || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {stats?.activeCampaigns || 0} نشطة
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">إجمالي الإيرادات</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {formatNumber(stats?.totalRevenue || 0)} ج.م
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              ROI: {stats?.avgROI || 0}%
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">معدل التحويل</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats?.overallConversionRate || 0}%
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {stats?.totalConversions || 0} تحويل
            </div>
          </div>

          {/* Average CPA */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">متوسط تكلفة الإجراء</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {formatNumber(stats?.avgCostPerAction || 0)} ج.م
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              تكلفة منخفضة
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
                  placeholder="بحث في الحملات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white w-64"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="all">كل الحالات</option>
                <option value="draft">مسودة</option>
                <option value="scheduled">مجدولة</option>
                <option value="active">نشطة</option>
                <option value="paused">متوقفة</option>
                <option value="completed">مكتملة</option>
                <option value="cancelled">ملغاة</option>
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="all">كل الأنواع</option>
                <option value="evaluation_followup">متابعة تقييمات</option>
                <option value="retention">احتفاظ</option>
                <option value="upsell">ترقية</option>
                <option value="re_enrollment">إعادة تسجيل</option>
                <option value="referral">إحالات</option>
                <option value="welcome">ترحيب</option>
                <option value="reactivation">إعادة تنشيط</option>
                <option value="feedback">ملاحظات</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="performance">الأفضل أداءً</option>
                <option value="revenue">أعلى إيرادات</option>
                <option value="conversion">أعلى تحويل</option>
                <option value="newest">الأحدث</option>
                <option value="ending">تنتهي قريباً</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCampaigns}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                تصدير
              </button>
            </div>
          </div>

          {/* Campaigns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => {
              const TypeIcon = getTypeIcon(campaign.campaignType);
              const daysRemaining = campaign.daysRemaining;
              const isEndingSoon = daysRemaining !== null && daysRemaining <= 7;

              return (
                <div key={campaign._id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Campaign Header */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <TypeIcon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {campaign.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {campaign.code}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(campaign.status)}`}>
                              {campaign.status === "draft" && "مسودة"}
                              {campaign.status === "scheduled" && "مجدولة"}
                              {campaign.status === "active" && "نشطة"}
                              {campaign.status === "paused" && "متوقفة"}
                              {campaign.status === "completed" && "مكتملة"}
                              {campaign.status === "cancelled" && "ملغاة"}
                              {campaign.status === "archived" && "مؤرشفة"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                      {campaign.description || "لا يوجد وصف"}
                    </p>
                  </div>

                  {/* Campaign Stats */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {formatNumber(campaign.stats.totalTargets)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">أهداف</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {campaign.stats.conversionRate}%
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">تحويل</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {formatNumber(campaign.stats.messagesSent)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">رسائل</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {formatNumber(campaign.stats.totalRevenue)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">إيرادات</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">التقدم</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {campaign.performanceScore}/100
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            campaign.performanceScore >= 80 ? "bg-green-500" :
                            campaign.performanceScore >= 60 ? "bg-yellow-500" :
                            "bg-red-500"
                          }`}
                          style={{ width: `${campaign.performanceScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Budget */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">الميزانية</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatNumber(campaign.budget.spent)} / {formatNumber(campaign.budget.allocated)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            (campaign.budget.spent / campaign.budget.allocated) >= 0.9 ? "bg-red-500" :
                            (campaign.budget.spent / campaign.budget.allocated) >= 0.7 ? "bg-yellow-500" :
                            "bg-green-500"
                          }`}
                          style={{ width: `${(campaign.budget.spent / campaign.budget.allocated) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(campaign.schedule.startDate)}</span>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                      <div>
                        {campaign.schedule.endDate ? (
                          <div className={`flex items-center gap-2 ${isEndingSoon ? "text-red-600 dark:text-red-400" : ""}`}>
                            <Calendar className="w-4 h-4" />
                            <span>
                              {formatDate(campaign.schedule.endDate)}
                              {isEndingSoon && campaign.status === "active" && (
                                <span className="ml-1">🚨</span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">مستمرة</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/marketing/campaigns/${campaign._id}`)}
                        className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        تفاصيل
                      </button>
                      
                      {campaign.status === "draft" && (
                        <button
                          onClick={() => handleCampaignAction(campaign._id, "active")}
                          className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                          title="تفعيل"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      
                      {campaign.status === "active" && (
                        <button
                          onClick={() => handleCampaignAction(campaign._id, "paused")}
                          className="px-3 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
                          title="إيقاف"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      
                      {campaign.status === "paused" && (
                        <button
                          onClick={() => handleCampaignAction(campaign._id, "active")}
                          className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                          title="استئناف"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCampaigns.length === 0 && (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                لا توجد حملات تطابق معايير البحث
              </p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                }}
                className="mt-4 text-primary hover:underline"
              >
                إعادة تعيين الفلاتر
              </button>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campaign Types Distribution */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              توزيع أنواع الحملات
            </h3>
            <div className="space-y-3">
              {["evaluation_followup", "upsell", "retention", "re_enrollment", "referral"].map(type => {
                const count = campaigns.filter(c => c.campaignType === type).length;
                const percentage = campaigns.length > 0 ? (count / campaigns.length) * 100 : 0;
                const TypeIcon = getTypeIcon(type);
                
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TypeIcon className="w-5 h-5 text-primary" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {type === "evaluation_followup" && "متابعة تقييمات"}
                        {type === "upsell" && "ترقية"}
                        {type === "retention" && "احتفاظ"}
                        {type === "re_enrollment" && "إعادة تسجيل"}
                        {type === "referral" && "إحالات"}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-white">{count}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Performance Leaders */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              أفضل الحملات أداءً
            </h3>
            <div className="space-y-4">
              {campaigns
                .filter(c => c.status === "completed" || c.status === "active")
                .sort((a, b) => b.performanceScore - a.performanceScore)
                .slice(0, 5)
                .map(campaign => (
                  <div key={campaign._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        campaign.performanceScore >= 80 ? "bg-green-100 dark:bg-green-900/30" :
                        campaign.performanceScore >= 60 ? "bg-yellow-100 dark:bg-yellow-900/30" :
                        "bg-red-100 dark:bg-red-900/30"
                      }`}>
                        <TrendingUp className={`w-4 h-4 ${
                          campaign.performanceScore >= 80 ? "text-green-600 dark:text-green-400" :
                          campaign.performanceScore >= 60 ? "text-yellow-600 dark:text-yellow-400" :
                          "text-red-600 dark:text-red-400"
                        }`} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {campaign.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          تحويل: {campaign.stats.conversionRate}%
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {formatNumber(campaign.stats.totalRevenue)}
                      </div>
                      <div className="text-xs text-gray-500">إيرادات</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              إنشاء سريع
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push("/marketing/campaigns/new?type=evaluation_followup")}
                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all flex items-center justify-between"
              >
                <span>حملة متابعة تقييمات</span>
                <Target className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => router.push("/marketing/campaigns/new?type=upsell")}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-between"
              >
                <span>حملة ترقية</span>
                <TrendingUp className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => router.push("/marketing/campaigns/new?type=retention")}
                className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all flex items-center justify-between"
              >
                <span>حملة احتفاظ</span>
                <Activity className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => router.push("/marketing/campaigns/new")}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                حملة مخصصة
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}