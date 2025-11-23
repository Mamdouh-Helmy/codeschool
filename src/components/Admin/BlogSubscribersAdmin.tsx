"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Search,
  Mail,
  User,
  Trash2,
  Eye,
  Download,
  RefreshCw,
  Users,
  Calendar,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

interface Subscriber {
  _id: string;
  email: string;
  isActive: boolean;
  subscribedAt: string;
  createdAt: string;
  updatedAt: string;
  lastNotified?: string;
}

export default function BlogSubscribersAdmin() {
  const { t } = useI18n();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewSubscriber, setViewSubscriber] = useState<Subscriber | null>(null);

  const loadSubscribers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/blog/subscribe?limit=100", {
        cache: "no-store"
      });
      const json = await res.json();
      if (json.success) {
        setSubscribers(json.data);
      }
    } catch (err) {
      console.error("Error loading subscribers:", err);
      toast.error(t("blogSubscribers.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscribers();
  }, []);

  const filteredSubscribers = subscribers.filter(subscriber =>
    subscriber.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // وظيفة التصدير إلى CSV
  const exportToCSV = () => {
    if (filteredSubscribers.length === 0) {
      toast.error(t("blogSubscribers.noDataExport"));
      return;
    }

    const headers = [
      t("blogSubscribers.email"),
      t("blogSubscribers.subscriptionDate"),
      t("blogSubscribers.status"),
      t("blogSubscribers.lastNotified")
    ];

    const csvData = filteredSubscribers.map(subscriber => [
      subscriber.email,
      new Date(subscriber.subscribedAt).toLocaleDateString(),
      subscriber.isActive ? t("common.active") : t("common.inactive"),
      subscriber.lastNotified ? new Date(subscriber.lastNotified).toLocaleDateString() : t("blogSubscribers.never")
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `blog_subscribers_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(t("blogSubscribers.exportSuccess"));
  };

  const deleteSubscriber = async (id: string) => {
    toast(
      (tObj) => (
        <div className="w-404 max-w-full bg-white dark:bg-darkmode text-MidnightNavyText dark:text-white rounded-14 shadow-round-box border-none outline-none dark:border-dark_border p-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600 font-bold">
              !
            </div>
            <div className="flex-1">
              <p className="text-16 font-semibold">
                {t("blogSubscribers.deleteConfirm")}
              </p>
              <p className="text-14 mt-1 text-slate-500 dark:text-darktext">
                {t("blogSubscribers.deleteWarning")}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              className="px-3 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded-14 text-15 hover:opacity-90 border border-PeriwinkleBorder/50"
              onClick={() => toast.dismiss(tObj.id)}
            >
              {t("common.cancel")}
            </button>
            <button
              className="px-3 py-1 bg-red-600 text-white rounded-14 text-15 hover:bg-red-700 shadow-sm"
              onClick={async () => {
                toast.dismiss(tObj.id);
                try {
                  const res = await fetch(`/api/blog/subscribe?id=${id}`, {
                    method: "DELETE"
                  });
                  if (res.ok) {
                    setSubscribers(prev => prev.filter(s => s._id !== id));
                    toast.success(t("blogSubscribers.deletedSuccess"));
                  } else {
                    toast.error(t("blogSubscribers.deleteFailed"));
                  }
                } catch (err) {
                  console.error("Error deleting subscriber:", err);
                  toast.error(t("blogSubscribers.deleteError"));
                }
              }}
            >
              {t("common.delete")}
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: "top-center" }
    );
  };

  const handleViewSubscriber = (subscriber: Subscriber) => {
    setViewSubscriber(subscriber);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const language = document.documentElement.dir === 'rtl' ? 'ar-EG' : 'en-US';
    
    return date.toLocaleDateString(language, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span className="ml-2">{t("blogSubscribers.loading")}</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm p-6 border border-PowderBlueBorder dark:border-dark_border">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-MidnightNavyText dark:text-white flex items-center gap-3">
                <BookOpen className="w-7 h-7 text-primary" />
                {t("blogSubscribers.management")}
              </h1>
              <p className="text-sm text-SlateBlueText dark:text-darktext">
                {t("blogSubscribers.managementDescription")}
              </p>
            </div>
            <div className="flex gap-3 mt-4 lg:mt-0">
              <button
                onClick={loadSubscribers}
                className="bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 hover:bg-IcyBreeze dark:hover:bg-darklight flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {t("common.refresh")}
              </button>
              <button
                onClick={exportToCSV}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {t("common.export")}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                  {t("blogSubscribers.totalSubscribers")}
                </p>
                <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                  {subscribers.length}
                </p>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                  {t("blogSubscribers.activeSubscribers")}
                </p>
                <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                  {subscribers.filter(s => s.isActive).length}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                  {t("blogSubscribers.thisMonth")}
                </p>
                <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                  {subscribers.filter(s => {
                    const subDate = new Date(s.subscribedAt);
                    const now = new Date();
                    return subDate.getMonth() === now.getMonth() && 
                           subDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                  {t("blogSubscribers.today")}
                </p>
                <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                  {subscribers.filter(s => {
                    const today = new Date().toDateString();
                    const subDate = new Date(s.subscribedAt).toDateString();
                    return subDate === today;
                  }).length}
                </p>
              </div>
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-SlateBlueText dark:text-darktext w-4 h-4" />
              <input
                type="text"
                placeholder={t("blogSubscribers.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* Subscribers Table */}
        <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-IcyBreeze dark:bg-dark_input border-b border-PowderBlueBorder dark:border-dark_border">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                    {t("blogSubscribers.email")}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                    {t("blogSubscribers.subscriptionDate")}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                    {t("blogSubscribers.status")}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-PowderBlueBorder dark:divide-dark_border">
                {filteredSubscribers.map((subscriber) => (
                  <tr key={subscriber._id} className="hover:bg-IcyBreeze dark:hover:bg-dark_input transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-MidnightNavyText dark:text-white">
                            {subscriber.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-MidnightNavyText dark:text-white">
                        {formatDate(subscriber.subscribedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        subscriber.isActive 
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
                      }`}>
                        {subscriber.isActive ? t("common.active") : t("common.inactive")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewSubscriber(subscriber)}
                          className="p-2 text-SlateBlueText dark:text-darktext hover:text-primary dark:hover:text-primary transition-colors"
                          title={t("common.view")}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteSubscriber(subscriber._id)}
                          className="p-2 text-SlateBlueText dark:text-darktext hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title={t("common.delete")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredSubscribers.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-3">
                {t("blogSubscribers.noSubscribers")}
              </h3>
              <p className="text-sm text-SlateBlueText dark:text-darktext">
                {searchTerm
                  ? t("blogSubscribers.noMatchingResults")
                  : t("blogSubscribers.noSubscribersDescription")
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* View Subscriber Modal */}
      {viewSubscriber && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-darkmode rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-MidnightNavyText dark:text-white">
                {t("blogSubscribers.subscriberDetails")}
              </h3>
              <button
                onClick={() => setViewSubscriber(null)}
                className="text-SlateBlueText dark:text-darktext hover:text-red-600 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-SlateBlueText dark:text-darktext">
                  {t("blogSubscribers.email")}
                </label>
                <p className="text-MidnightNavyText dark:text-white mt-1">
                  {viewSubscriber.email}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-SlateBlueText dark:text-darktext">
                    {t("blogSubscribers.status")}
                  </label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                    viewSubscriber.isActive 
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
                  }`}>
                    {viewSubscriber.isActive ? t("common.active") : t("common.inactive")}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-SlateBlueText dark:text-darktext">
                    {t("blogSubscribers.subscribedOn")}
                  </label>
                  <p className="text-MidnightNavyText dark:text-white mt-1">
                    {formatDate(viewSubscriber.subscribedAt)}
                  </p>
                </div>
              </div>

              {viewSubscriber.lastNotified && (
                <div>
                  <label className="block text-sm font-medium text-SlateBlueText dark:text-darktext">
                    {t("blogSubscribers.lastNotified")}
                  </label>
                  <p className="text-MidnightNavyText dark:text-white mt-1">
                    {formatDate(viewSubscriber.lastNotified)}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-SlateBlueText dark:text-darktext">
                    {t("common.createdAt")}
                  </label>
                  <p className="text-MidnightNavyText dark:text-white mt-1">
                    {new Date(viewSubscriber.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-SlateBlueText dark:text-darktext">
                    {t("common.updatedAt")}
                  </label>
                  <p className="text-MidnightNavyText dark:text-white mt-1">
                    {new Date(viewSubscriber.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
              <button
                onClick={() => setViewSubscriber(null)}
                className="px-4 py-2 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded-lg font-semibold text-sm hover:bg-IcyBreeze dark:hover:bg-darklight transition-all duration-300 border border-PowderBlueBorder dark:border-dark_border"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}