"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  TrendingUp,
  Filter,
  Search,
  Download,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Star,
  UserPlus,
  BarChart3,
  ChevronRight,
  MoreVertical,
  Calendar,
  Tag,
  Eye,
  Edit,
  Trash2,
  RefreshCw
} from "lucide-react";

interface Lead {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  source: string;
  status: string;
  leadScore: {
    score: number;
    factors: Array<{ factor: string; score: number; reason: string }>;
  };
  metadata: {
    createdAt: string;
    lastContacted: string;
    nextFollowUp: string;
  };
  communicationHistory: Array<any>;
  tags: string[];
}

interface LeadStats {
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalRevenue: number;
}

export default function MarketingLeadsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("score");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState("month");

  useEffect(() => {
    fetchLeadsData();
  }, [timeframe]);

  useEffect(() => {
    filterAndSortLeads();
  }, [leads, searchTerm, statusFilter, sourceFilter, sortBy]);

  const fetchLeadsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/marketing/leads?timeframe=${timeframe}`, {
        credentials: "include"
      });

      const result = await response.json();

      if (result.success) {
        setLeads(result.data.leads);
        setStats(result.data.summary);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error fetching leads data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortLeads = () => {
    let filtered = [...leads];

    // البحث
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        lead =>
          lead.fullName.toLowerCase().includes(term) ||
          lead.email.toLowerCase().includes(term) ||
          lead.phone.includes(term) ||
          lead.source.toLowerCase().includes(term)
      );
    }

    // فلترة الحالة
    if (statusFilter !== "all") {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    // فلترة المصدر
    if (sourceFilter !== "all") {
      filtered = filtered.filter(lead => lead.source === sourceFilter);
    }

    // الترتيب
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "score":
          return b.leadScore.score - a.leadScore.score;
        case "newest":
          return new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime();
        case "oldest":
          return new Date(a.metadata.createdAt).getTime() - new Date(b.metadata.createdAt).getTime();
        case "name":
          return a.fullName.localeCompare(b.fullName);
        default:
          return 0;
      }
    });

    setFilteredLeads(filtered);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      converted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      not_interested: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      follow_up: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      new: Clock,
      contacted: MessageSquare,
      converted: CheckCircle,
      not_interested: XCircle,
      follow_up: AlertCircle
    };
    return icons[status as keyof typeof icons] || Clock;
  };

  const getSourceColor = (source: string) => {
    const colors = {
      landing_page: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
      contact_form: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
      referral: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
      social_media: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
      event: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
      other: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
    };
    return colors[source as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getDaysSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(lead => lead._id));
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/marketing/leads?leadId=${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus })
      });

      const result = await response.json();
      if (result.success) {
        fetchLeadsData();
      }
    } catch (error) {
      console.error("Error updating lead status:", error);
    }
  };

  const handleExportLeads = () => {
    const csvContent = [
      ["Name", "Email", "Phone", "Status", "Source", "Score", "Created", "Last Contact"],
      ...filteredLeads.map(lead => [
        lead.fullName,
        lead.email,
        lead.phone,
        lead.status,
        lead.source,
        lead.leadScore.score,
        formatDate(lead.metadata.createdAt),
        lead.metadata.lastContacted ? formatDate(lead.metadata.lastContacted) : "Never"
      ])
    ]
      .map(row => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            جاري تحميل بيانات الـ Leads...
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
                إدارة الـ Leads
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                إدارة وتتبع العملاء المحتملين
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
                onClick={fetchLeadsData}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push("/marketing/leads/new")}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                إضافة Lead جديد
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Leads */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">إجمالي الـ Leads</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats?.totalLeads || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <TrendingUp className="w-4 h-4 text-green-500" />
              {stats?.newLeads || 0} جديد
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
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {stats?.convertedLeads || 0} محول
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">إجمالي الإيرادات</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats?.totalRevenue?.toLocaleString() || 0} ج.م
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              من Leads محولة
            </div>
          </div>

          {/* Contacted Leads */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Leads تم التواصل معهم</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats?.contactedLeads || 0}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              يحتاج متابعة
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
                  placeholder="بحث عن Leads..."
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
                <option value="new">جديد</option>
                <option value="contacted">تم التواصل</option>
                <option value="follow_up">متابعة</option>
                <option value="converted">محول</option>
                <option value="not_interested">غير مهتم</option>
              </select>

              {/* Source Filter */}
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="all">كل المصادر</option>
                <option value="landing_page">Landing Page</option>
                <option value="contact_form">Contact Form</option>
                <option value="referral">إحالة</option>
                <option value="social_media">Social Media</option>
                <option value="event">Event</option>
                <option value="other">أخرى</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="score">أعلى نقاط</option>
                <option value="newest">الأحدث</option>
                <option value="oldest">الأقدم</option>
                <option value="name">حسب الاسم</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportLeads}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                تصدير
              </button>
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {selectedLeads.length === filteredLeads.length ? "إلغاء الكل" : "تحديد الكل"}
              </button>
            </div>
          </div>

          {/* Leads Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    المصدر
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    النقاط
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    آخر تواصل
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-secondary divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLeads.map((lead) => {
                  const StatusIcon = getStatusIcon(lead.status);
                  const daysSinceLastContact = lead.metadata.lastContacted 
                    ? getDaysSince(lead.metadata.lastContacted)
                    : null;

                  return (
                    <tr key={lead._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead._id)}
                          onChange={() => handleSelectLead(lead._id)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-primary font-semibold">
                              {lead.fullName.charAt(0)}
                            </span>
                          </div>
                          <div className="mr-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {lead.fullName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {lead.email}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{lead.phone}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                            <StatusIcon className="w-3 h-3 inline-block ml-1" />
                            {lead.status === "new" && "جديد"}
                            {lead.status === "contacted" && "تم التواصل"}
                            {lead.status === "follow_up" && "متابعة"}
                            {lead.status === "converted" && "محول"}
                            {lead.status === "not_interested" && "غير مهتم"}
                          </span>
                          <button
                            onClick={() => handleStatusChange(lead._id, 
                              lead.status === "new" ? "contacted" : 
                              lead.status === "contacted" ? "follow_up" : "converted"
                            )}
                            className="text-xs text-primary hover:underline"
                          >
                            تحديث
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSourceColor(lead.source)}`}>
                          {lead.source === "landing_page" && "Landing Page"}
                          {lead.source === "contact_form" && "Contact Form"}
                          {lead.source === "referral" && "إحالة"}
                          {lead.source === "social_media" && "Social Media"}
                          {lead.source === "event" && "Event"}
                          {lead.source === "other" && "أخرى"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                lead.leadScore.score >= 75 ? "bg-green-500" :
                                lead.leadScore.score >= 50 ? "bg-yellow-500" :
                                "bg-red-500"
                              }`}
                              style={{ width: `${lead.leadScore.score}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${
                            lead.leadScore.score >= 75 ? "text-green-600 dark:text-green-400" :
                            lead.leadScore.score >= 50 ? "text-yellow-600 dark:text-yellow-400" :
                            "text-red-600 dark:text-red-400"
                          }`}>
                            {lead.leadScore.score}
                          </span>
                          {lead.leadScore.score >= 75 && <Star className="w-4 h-4 text-yellow-500" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {lead.metadata.lastContacted 
                            ? formatDate(lead.metadata.lastContacted)
                            : "لا يوجد"
                          }
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {daysSinceLastContact !== null 
                            ? `قبل ${daysSinceLastContact} يوم` 
                            : "لم يتم التواصل"
                          }
                        </div>
                        {lead.metadata.nextFollowUp && (
                          <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            متابعة: {formatDate(lead.metadata.nextFollowUp)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => window.open(`https://wa.me/${lead.whatsappNumber}`, '_blank')}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                            title="WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => window.location.href = `mailto:${lead.email}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/marketing/leads/${lead._id}`)}
                            className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredLeads.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  لا توجد Leads تطابق معايير البحث
                </p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setSourceFilter("all");
                  }}
                  className="mt-4 text-primary hover:underline"
                >
                  إعادة تعيين الفلاتر
                </button>
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredLeads.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                عرض <span className="font-medium">{filteredLeads.length}</span> من <span className="font-medium">{leads.length}</span> Lead
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed">
                  السابق
                </button>
                <button className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary/90">
                  1
                </button>
                <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  2
                </button>
                <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  3
                </button>
                <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  التالي
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tags and Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* High Potential Leads */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Leads عالية الإمكانات
            </h3>
            <div className="space-y-4">
              {leads
                .filter(lead => lead.leadScore.score >= 75)
                .slice(0, 5)
                .map(lead => (
                  <div key={lead._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                        <Star className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {lead.fullName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          نقاط: {lead.leadScore.score}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/marketing/leads/${lead._id}`)}
                      className="text-primary hover:underline text-sm"
                    >
                      التواصل
                    </button>
                  </div>
                ))}
            </div>
            <button className="w-full mt-4 text-center text-primary hover:underline text-sm">
              عرض الكل
            </button>
          </div>

          {/* Leads Needing Followup */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              تحتاج متابعة
            </h3>
            <div className="space-y-4">
              {leads
                .filter(lead => lead.metadata.nextFollowUp && new Date(lead.metadata.nextFollowUp) <= new Date())
                .slice(0, 5)
                .map(lead => {
                  const daysOverdue = Math.floor(
                    (new Date().getTime() - new Date(lead.metadata.nextFollowUp).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  
                  return (
                    <div key={lead._id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                          <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {lead.fullName}
                          </div>
                          <div className="text-sm text-yellow-600 dark:text-yellow-400">
                            متأخر {daysOverdue} يوم
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleStatusChange(lead._id, "contacted")}
                        className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm hover:bg-yellow-200 dark:hover:bg-yellow-800"
                      >
                        متابعة
                      </button>
                    </div>
                  );
                })}
            </div>
            <button className="w-full mt-4 text-center text-primary hover:underline text-sm">
              عرض الكل
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              إجراءات سريعة
            </h3>
            <div className="space-y-3">
              <button className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-between">
                <span>إرسال حملة WhatsApp</span>
                <MessageSquare className="w-4 h-4" />
              </button>
              <button className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-between">
                <span>إنشاء حملة بريدية</span>
                <Mail className="w-4 h-4" />
              </button>
              <button className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all flex items-center justify-between">
                <span>تحميل قوالب الرسائل</span>
                <Download className="w-4 h-4" />
              </button>
              <button 
                onClick={() => router.push("/marketing/leads/new")}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                إضافة Lead جديد
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}