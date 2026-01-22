"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Loader2,
  Filter,
  Trash2,
  Eye,
  EyeOff,
  Download,
  ChevronLeft,
  Settings,
  Globe,
  Users,
  AlertTriangle,
  X,
  Check,
} from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  date: string;
  icon: string;
  read: boolean;
  metadata?: {
    messageId?: string;
    type?: string;
    status?: string;
    groupId?: string;
    groupName?: string;
    sessionId?: string;
    sessionTitle?: string;
    language?: string;
    reminderId?: string;
    reminderType?: string;
    sessionDetails?: any;
  };
}

export default function StudentNotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [filterRead, setFilterRead] = useState("all");
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("🔄 [Notifications] Fetching notifications...");

      const notificationsRes = await fetch(`/api/student/notifications`, {
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include'
      });

      const response = await notificationsRes.json();

      console.log("📥 [Notifications] API Response:", {
        success: response.success,
        status: notificationsRes.status,
        count: response.data?.length
      });

      if (!notificationsRes.ok || !response.success) {
        throw new Error(response.message || "فشل في تحميل الإشعارات");
      }

      setNotifications(response.data || []);

    } catch (error: any) {
      console.error("❌ [Notifications] Error fetching notifications:", error);
      setError(error.message || "حدث خطأ أثناء تحميل الإشعارات");

      if (error.message.includes("غير مصرح") || error.message.includes("UNAUTHORIZED")) {
        router.push("/signin");
      }
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // تحديث حالة القراءة محلياً أولاً
      setReadIds(prev => [...prev, notificationId]);

      const markRes = await fetch(`/api/student/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include'
      });

      const response = await markRes.json();

      if (!response.success) {
        // إذا فشلت العملية، نرجع الحالة المحلية
        setReadIds(prev => prev.filter(id => id !== notificationId));
        console.error("Failed to mark as read:", response.message);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      setReadIds(prev => prev.filter(id => id !== notificationId));
    }
  };

  const markAllAsRead = async () => {
    try {
      const markRes = await fetch(`/api/student/notifications`, {
        method: 'PUT',
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include'
      });

      const response = await markRes.json();

      if (response.success) {
        // تحديث جميع الإشعارات كمقروءة محلياً
        setReadIds(notifications.map(n => n.id));
        setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الإشعار؟")) {
      return;
    }

    try {
      setDeletingId(notificationId);

      const deleteRes = await fetch(`/api/student/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include'
      });

      const response = await deleteRes.json();

      if (response.success) {
        // حذف الإشعار من القائمة المحلية
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        setReadIds(prev => prev.filter(id => id !== notificationId));
      } else {
        alert(response.message || "فشل في حذف الإشعار");
      }
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      alert(error.message || "حدث خطأ أثناء حذف الإشعار");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "تاريخ غير صالح";

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 60) {
        return `قبل ${diffMins} دقيقة`;
      } else if (diffHours < 24) {
        return `قبل ${diffHours} ساعة`;
      } else if (diffDays < 7) {
        return `قبل ${diffDays} يوم`;
      } else {
        return date.toLocaleDateString("ar-EG", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      }
    } catch {
      return dateString;
    }
  };

  const getIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      'MessageSquare': MessageSquare,
      'Bell': Bell,
      'AlertCircle': AlertCircle,
      'CheckCircle': CheckCircle,
      'XCircle': XCircle,
      'Clock': Clock,
      'Calendar': Calendar,
      'Settings': Settings,
      'Globe': Globe,
      'Users': Users,
      'AlertTriangle': AlertTriangle,
    };
    return icons[iconName] || Bell;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case 'reminder':
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case 'warning':
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case 'alert':
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'whatsapp': return "واتساب";
      case 'reminder': return "تذكير";
      case 'warning': return "تحذير";
      case 'alert': return "تنبيه";
      default: return type;
    }
  };

  const getTypeFromMetadata = (metadata?: any) => {
    if (!metadata) return 'whatsapp';
    if (metadata.reminderId) return 'reminder';
    if (metadata.messageId) return 'whatsapp';
    return 'whatsapp';
  };

  const filteredNotifications = notifications.filter(notification => {
    const notificationType = getTypeFromMetadata(notification.metadata);

    if (filterType !== "all" && notificationType !== filterType) return false;
    if (filterRead === "read" && !notification.read && !readIds.includes(notification.id)) return false;
    if (filterRead === "unread" && (notification.read || readIds.includes(notification.id))) return false;
    return true;
  });

  const unreadCount = notifications.filter(n =>
    !n.read && !readIds.includes(n.id)
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">جاري تحميل الإشعارات...</p>
        </div>
      </div>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkmode">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            حدث خطأ
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchNotifications}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              حاول مرة أخرى
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
            >
              العودة للداشبورد
            </button>
          </div>
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
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  الإشعارات
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  جميع إشعاراتك ورسائلك
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>تعيين الكل كمقروء</span>
                </button>
              )}
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                العودة للداشبورد
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* الإحصائيات والفلاتر */}
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {notifications.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">إجمالي الإشعارات</div>
              </div>

              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-1">
                  {unreadCount}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-300">غير مقروء</div>
              </div>

              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">
                  {notifications.filter(n => getTypeFromMetadata(n.metadata) === 'whatsapp').length}
                </div>
                <div className="text-sm text-green-600 dark:text-green-300">رسائل واتساب</div>
              </div>

              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mb-1">
                  {notifications.filter(n => getTypeFromMetadata(n.metadata) === 'reminder').length}
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-300">تذكيرات</div>
              </div>
            </div>
          </div>

          {/* الفلاتر */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                نوع الإشعار
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="all">جميع الأنواع</option>
                <option value="whatsapp">واتساب</option>
                <option value="reminder">تذكيرات</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                حالة القراءة
              </label>
              <select
                value={filterRead}
                onChange={(e) => setFilterRead(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="all">جميع الإشعارات</option>
                <option value="unread">غير المقروءة فقط</option>
                <option value="read">المقروءة فقط</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchNotifications}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>تحديث البيانات</span>
              </button>
            </div>
          </div>
        </div>

        {/* قائمة الإشعارات */}
        <div className="bg-white dark:bg-secondary rounded-xl shadow-lg overflow-hidden">
          {filteredNotifications.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotifications.map((notification) => {
                const Icon = getIcon(notification.icon);
                const notificationType = getTypeFromMetadata(notification.metadata);
                const isRead = notification.read || readIds.includes(notification.id);
                const isDeleting = deletingId === notification.id;

                return (
                  <div
                    key={notification.id}
                    className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${!isRead ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                      } ${isDeleting ? 'opacity-50' : ''}`}
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`p-2 rounded-lg ${!isRead
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {notification.title}
                              </h3>
                              <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(notificationType)}`}>
                                {getTypeText(notificationType)}
                              </span>
                              {!isRead && (
                                <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                  جديد
                                </span>
                              )}
                              {notification.metadata?.status === 'failed' && (
                                <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                  فشل الإرسال
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(notification.date)}
                            </p>
                          </div>
                        </div>

                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                          {notification.message}
                        </p>

                        {notification.metadata && (
                          <div className="flex flex-wrap gap-2">
                            {notification.metadata.groupName && (
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs">
                                {notification.metadata.groupName}
                              </span>
                            )}
                            {notification.metadata.sessionTitle && (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs">
                                {notification.metadata.sessionTitle}
                              </span>
                            )}
                            {notification.metadata.language && (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded text-xs">
                                {notification.metadata.language === 'ar' ? 'عربي' : 'English'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {!isRead && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            disabled={readIds.includes(notification.id)}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="تعيين كمقروء"
                          >
                            {readIds.includes(notification.id) ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          disabled={isDeleting}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="حذف الإشعار"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                لا توجد إشعارات
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {filterType !== "all" || filterRead !== "all"
                  ? "لا توجد إشعارات تطابق معايير البحث"
                  : "لا توجد إشعارات لعرضها حالياً"}
              </p>
              <button
                onClick={fetchNotifications}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                تحديث الصفحة
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// أيقونة تحديث إضافية
const RefreshCw = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 2v6h-6"></path>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
    <path d="M3 22v-6h6"></path>
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
  </svg>
);