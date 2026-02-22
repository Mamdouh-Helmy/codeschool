// /src/components/sessions/SessionDetailsModal.jsx
"use client";
import React from "react";
import { X, Calendar, Clock, Link2, VideoIcon, FileText, UserCheck, UserX } from "lucide-react";

export default function SessionDetailsModal({ session, attendanceData, loading, onClose, isRTL, t }) {
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-darkmode rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  const stats = attendanceData?.stats || { total: 0, present: 0, absent: 0, late: 0, excused: 0 };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        
        {/* Header */}
        <div className="p-6 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-MidnightNavyText dark:text-white">
              {isRTL ? 'تفاصيل الجلسة' : 'Session Details'} - {session?.title}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {isRTL ? 'التاريخ' : 'Date'}
              </p>
              <p className="font-medium">
                {session?.scheduledDate ? new Date(session.scheduledDate).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {isRTL ? 'الوقت' : 'Time'}
              </p>
              <p className="font-medium">{session?.startTime} - {session?.endTime}</p>
            </div>
          </div>

          {session?.meetingLink && (
            <div>
              <p className="text-sm text-gray-500 flex items-center gap-2 mb-1">
                <Link2 className="w-4 h-4" />
                {isRTL ? 'رابط الاجتماع' : 'Meeting Link'}
              </p>
              <a href={session.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                {session.meetingLink}
              </a>
            </div>
          )}

          {session?.recordingLink && (
            <div>
              <p className="text-sm text-gray-500 flex items-center gap-2 mb-1">
                <VideoIcon className="w-4 h-4" />
                {isRTL ? 'رابط التسجيل' : 'Recording Link'}
              </p>
              <a href={session.recordingLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                {session.recordingLink}
              </a>
            </div>
          )}

          {session?.instructorNotes && (
            <div>
              <p className="text-sm text-gray-500 flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4" />
                {isRTL ? 'ملاحظات المدرب' : 'Instructor Notes'}
              </p>
              <p className="text-sm bg-gray-50 dark:bg-dark_input p-3 rounded-lg whitespace-pre-wrap">
                {session.instructorNotes}
              </p>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-3">{isRTL ? 'إحصائيات الحضور' : 'Attendance Stats'}</h3>
            <div className="grid grid-cols-5 gap-3">
              <div className="text-center p-3 bg-gray-50 dark:bg-dark_input rounded">
                <p className="text-xl font-bold">{stats.total}</p>
                <p className="text-xs text-gray-500">{isRTL ? 'الإجمالي' : 'Total'}</p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded">
                <p className="text-xl font-bold text-green-600">{stats.present}</p>
                <p className="text-xs text-gray-500">{isRTL ? 'حاضر' : 'Present'}</p>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded">
                <p className="text-xl font-bold text-red-600">{stats.absent}</p>
                <p className="text-xs text-gray-500">{isRTL ? 'غائب' : 'Absent'}</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <p className="text-xl font-bold text-yellow-600">{stats.late}</p>
                <p className="text-xs text-gray-500">{isRTL ? 'متأخر' : 'Late'}</p>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                <p className="text-xl font-bold text-blue-600">{stats.excused}</p>
                <p className="text-xs text-gray-500">{isRTL ? 'معتذر' : 'Excused'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-PowderBlueBorder dark:border-dark_border flex items-center justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">
            {isRTL ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
}