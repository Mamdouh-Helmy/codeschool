// /src/components/sessions/StudentsListModal.jsx
"use client";
import React from "react";
import { X, Users, Mail, Phone, Hash } from "lucide-react";

export default function StudentsListModal({ groupStudents, group, onClose, isRTL, t }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        
        {/* Header */}
        <div className="p-6 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              {isRTL ? 'قائمة الطلاب' : 'Students List'} - {group?.name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isRTL ? 'الإجمالي' : 'Total'}: {groupStudents.length}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Students List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {groupStudents.map(student => (
              <div key={student._id} className="p-4 border border-PowderBlueBorder dark:border-dark_border rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-MidnightNavyText dark:text-white">
                      {student.personalInfo?.fullName}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Hash className="w-4 h-4" />
                        <span>{student.enrollmentNumber}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Mail className="w-4 h-4" />
                        <span>{student.personalInfo?.email || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Phone className="w-4 h-4" />
                        <span>{student.personalInfo?.phone || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                        {student.communicationPreferences?.preferredLanguage === 'ar' ? '🇸🇦 العربية' : '🇬🇧 English'}
                      </span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full">
                        {student.personalInfo?.gender === 'male' ? '👦 ذكر' : '👧 أنثى'}
                      </span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                        {student.guardianInfo?.relationship === 'father' ? '👨 أب' : 
                         student.guardianInfo?.relationship === 'mother' ? '👩 أم' : '👤 ولي أمر'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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