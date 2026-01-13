import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle, Calendar, BookOpen, Users, MessageCircle } from 'lucide-react';

export default function StudentReminders({ studentId }) {
  const [reminders, setReminders] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' or 'all'

  useEffect(() => {
    loadReminders();
  }, [studentId]);

  const loadReminders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${studentId}/reminders`);
      const data = await res.json();
      if (data.success) {
        setReminders(viewMode === 'grouped' ? data.data.reminders : data.data.allReminders);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReminderTypeLabel = (type) => {
    return type === '24hours' ? 'تذكير 24 ساعة' : 'تذكير 1 ساعة';
  };

  const getReminderTypeColor = (type) => {
    return type === '24hours' 
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">إجمالي الرسائل</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total || 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500">تم الإرسال</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.sent || 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-500">فشل</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.failed || 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">تذكير 24 ساعة</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.reminder24h || 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-500">تذكير 1 ساعة</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.reminder1h || 0}</p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('grouped')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'grouped'
              ? 'bg-primary text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          مجموعة حسب الجلسة
        </button>
        <button
          onClick={() => setViewMode('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'all'
              ? 'bg-primary text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          كل الرسائل
        </button>
      </div>

      {/* Reminders List */}
      {viewMode === 'grouped' ? (
        <div className="space-y-4">
          {reminders.map((item, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              {/* Session Info */}
              <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                    {item.session?.title || 'N/A'}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {item.session?.scheduledDate ? formatDate(item.session.scheduledDate) : 'N/A'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {item.session?.startTime} - {item.session?.endTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {item.group?.name || item.group?.code}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reminders for this session */}
              <div className="space-y-3">
                {item.reminders.map((reminder, rIndex) => (
                  <div key={rIndex} className="flex items-start gap-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="flex-shrink-0 mt-1">
                      {reminder.status === 'sent' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getReminderTypeColor(reminder.type)}`}>
                          {getReminderTypeLabel(reminder.type)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(reminder.sentAt)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          reminder.language === 'ar' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {reminder.language === 'ar' ? 'عربي' : 'English'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                        {reminder.message}
                      </p>
                      {reminder.error && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                          ⚠️ {reminder.error}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map((reminder, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {reminder.status === 'sent' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getReminderTypeColor(reminder.reminderType)}`}>
                    {getReminderTypeLabel(reminder.reminderType)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(reminder.sentAt)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    reminder.language === 'ar' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {reminder.language === 'ar' ? 'عربي' : 'English'}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded">
                  {reminder.message}
                </p>
                {reminder.sessionDetails && (
                  <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                    <BookOpen className="w-3 h-3" />
                    <span>{reminder.sessionDetails.title}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {reminders.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">لا توجد رسائل تذكير حتى الآن</p>
          <p className="text-sm text-gray-400 mt-1">
            سيتم إرسال تذكيرات تلقائية قبل كل جلسة
          </p>
        </div>
      )}
    </div>
  );
}