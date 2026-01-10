// components/admin/AddStudentsToGroup.jsx
"use client";

import { useState, useEffect } from "react";
import { UserPlus, Search, X, CheckCircle, AlertCircle, Users, Loader2, MessageCircle, Info, Copy } from "lucide-react";
import toast from "react-hot-toast";

export default function AddStudentsToGroup({ groupId, onClose, onStudentAdded }) {
  const [students, setStudents] = useState([]);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // ✅ الرسائل المخصصة - يكتبها المستخدم
  const [customMessage, setCustomMessage] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");

  useEffect(() => {
    if (groupId) {
      loadData();
    }
  }, [groupId]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log(`🔍 Loading data for group: ${groupId}`);

      const groupRes = await fetch(`/api/groups/${groupId}`, {
        cache: 'no-store'
      });
      
      if (!groupRes.ok) {
        throw new Error(`Failed to load group: ${groupRes.status}`);
      }

      const groupData = await groupRes.json();
      
      if (!groupData.success) {
        throw new Error(groupData.error || 'Failed to load group');
      }

      console.log(`✅ Group loaded:`, {
        id: groupData.data._id,
        name: groupData.data.name,
        studentsCount: groupData.data.students?.length || 0
      });
      
      setGroup(groupData.data);

      const studentsRes = await fetch('/api/allStudents?status=Active', {
        cache: 'no-store'
      });

      if (!studentsRes.ok) {
        throw new Error(`Failed to load students: ${studentsRes.status}`);
      }

      const studentsData = await studentsRes.json();

      if (!studentsData.success) {
        throw new Error(studentsData.error || 'Failed to load students');
      }

      const groupStudentIds = (groupData.data.students || []).map(s => {
        const id = s._id || s.id || s;
        return typeof id === 'object' ? id.toString() : String(id);
      });

      const availableStudents = studentsData.data.filter(student => {
        const studentId = (student._id || student.id).toString();
        return !groupStudentIds.includes(studentId);
      });

      setStudents(availableStudents);

    } catch (error) {
      console.error("❌ Error loading data:", error);
      toast.error(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // ✅ إنشاء معاينة الرسالة بالحقول المملوءة تلقائياً
  const generatePreview = (message) => {
    if (!selectedStudent || !group || !message) return "";

    const studentName = selectedStudent.personalInfo?.fullName || "الطالب";
    const groupName = group.name;
    const courseName = group.courseSnapshot?.title || group.course?.title || "الكورس";
    const startDate = new Date(group.schedule?.startDate).toLocaleDateString('ar-EG');
    const timeFrom = group.schedule?.timeFrom || "00:00";
    const timeTo = group.schedule?.timeTo || "00:00";

    // استبدال المتغيرات في الرسالة
    let preview = message
      .replace(/\{studentName\}/g, studentName)
      .replace(/\{groupName\}/g, groupName)
      .replace(/\{courseName\}/g, courseName)
      .replace(/\{startDate\}/g, startDate)
      .replace(/\{timeFrom\}/g, timeFrom)
      .replace(/\{timeTo\}/g, timeTo);

    return preview;
  };

  // ✅ تحديث المعاينة عند تغيير الرسالة أو الطالب
  useEffect(() => {
    if (selectedStudent && customMessage) {
      const preview = generatePreview(customMessage);
      setPreviewMessage(preview);
    }
  }, [customMessage, selectedStudent, group]);

  const handleAddStudent = async () => {
    if (!selectedStudent) {
      toast.error("Please select a student");
      return;
    }

    if (!customMessage.trim()) {
      toast.error("Please enter a message for the student");
      return;
    }

    const studentId = selectedStudent._id || selectedStudent.id;
    
    if (!studentId) {
      console.error("❌ No student ID found:", selectedStudent);
      toast.error("Invalid student selected");
      return;
    }

    setAdding(true);
    const loadingToast = toast.loading("Adding student to group...");

    try {
      console.log(`\n📤 ========== ADDING STUDENT TO GROUP ==========`);
      console.log(`Student ID: ${studentId}`);
      console.log(`Student Name: ${selectedStudent.personalInfo?.fullName}`);
      console.log(`Group ID: ${groupId}`);
      console.log(`Custom Message Length: ${customMessage.length}`);

      // ✅ الرسالة النهائية مع الحقول المستبدلة
      const finalMessage = generatePreview(customMessage);

      const payload = {
        studentId: studentId.toString(),
        customMessage: finalMessage,
        sendWhatsApp: true
      };

      console.log(`📦 Final message to send:`, finalMessage);

      const res = await fetch(`/api/groups/${groupId}/add-student`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (res.ok && result.success) {
        console.log(`✅ Student added successfully!`);
        toast.success("Student added and message sent! 🎉", { id: loadingToast });
        
        setStudents(prev => prev.filter(s => {
          const sid = s._id || s.id;
          return sid.toString() !== studentId.toString();
        }));
        
        setSelectedStudent(null);
        setCustomMessage("");
        setPreviewMessage("");

        if (onStudentAdded) {
          onStudentAdded();
        }

        setTimeout(() => loadData(), 1000);

      } else {
        const errorMessage = result.error || result.message || "Failed to add student";
        console.error(`❌ Add student failed:`, errorMessage);
        toast.error(errorMessage, { id: loadingToast });
      }

    } catch (error) {
      console.error("❌ Error adding student:", error);
      toast.error(error.message || "Failed to add student", { id: loadingToast });
    } finally {
      setAdding(false);
    }
  };

  // ✅ نسخ الرسالة للحافظة
  const copyToClipboard = () => {
    navigator.clipboard.writeText(customMessage);
    toast.success("Message template copied!");
  };

  const filteredStudents = students.filter(student => {
    const fullName = student.personalInfo?.fullName?.toLowerCase() || "";
    const email = student.personalInfo?.email?.toLowerCase() || "";
    const enrollmentNumber = student.enrollmentNumber?.toLowerCase() || "";
    const searchLower = search.toLowerCase();

    return (
      fullName.includes(searchLower) ||
      email.includes(searchLower) ||
      enrollmentNumber.includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Group not found</p>
      </div>
    );
  }

  const currentCount = group.currentStudentsCount || group.students?.length || 0;
  const maxStudents = group.maxStudents || 0;
  const availableSeats = maxStudents - currentCount;
  const isFull = availableSeats <= 0;

  return (
    <div className="space-y-6">
      {/* Group Info */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-lg border border-primary/20">
        <h3 className="text-xl font-bold mb-2">{group.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {group.course?.title || group.courseSnapshot?.title} - {group.code}
        </p>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
            <div className="text-2xl font-bold">{currentCount}</div>
            <div className="text-xs text-gray-500">Current</div>
          </div>
          <div className="text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-gray-400" />
            <div className="text-2xl font-bold">{maxStudents}</div>
            <div className="text-xs text-gray-500">Maximum</div>
          </div>
          <div className="text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <div className="text-2xl font-bold">{availableSeats}</div>
            <div className="text-xs text-gray-500">Available</div>
          </div>
        </div>
      </div>

      {/* Full Warning */}
      {isFull && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">Group is Full</h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                This group has reached its maximum capacity.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search students by name, email, or enrollment number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
        />
      </div>

      {/* Students List */}
      <div className="max-h-96 overflow-y-auto space-y-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg p-4">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {search ? "No students match your search" : "No available students"}
            </p>
          </div>
        ) : (
          filteredStudents.map((student) => {
            const studentId = student._id || student.id;
            const isSelected = selectedStudent && (
              (selectedStudent._id || selectedStudent.id)?.toString() === studentId?.toString()
            );

            return (
              <div
                key={studentId}
                onClick={() => !isFull && setSelectedStudent(student)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-PowderBlueBorder dark:border-dark_border hover:border-primary/50"
                } ${isFull ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">
                        {student.personalInfo?.fullName}
                      </h4>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                      )}
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {student.personalInfo?.email}
                    </p>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                        Enrollment: {student.enrollmentNumber}
                      </span>
                      {student.personalInfo?.whatsappNumber && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded flex items-center gap-1">
                          📱 {student.personalInfo.whatsappNumber}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded ${
                        student.communicationPreferences?.preferredLanguage === 'ar'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                      }`}>
                        🌐 {student.communicationPreferences?.preferredLanguage === 'ar' ? 'العربية' : 'English'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Message Customization */}
      {selectedStudent && (
        <div className="space-y-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                WhatsApp Message Template
              </h4>

              {/* Available Variables */}
              <div className="bg-white dark:bg-dark_input rounded p-3 mb-3 border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📌 Use these variables (will auto-fill):
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {`{studentName}`} → {selectedStudent.personalInfo?.fullName}
                  </div>
                  <div className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {`{groupName}`} → {group.name}
                  </div>
                  <div className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {`{courseName}`} → {group.courseSnapshot?.title || group.course?.title}
                  </div>
                  <div className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {`{startDate}`} → {new Date(group.schedule?.startDate).toLocaleDateString('ar-EG')}
                  </div>
                  <div className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {`{timeFrom}`} → {group.schedule?.timeFrom}
                  </div>
                  <div className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {`{timeTo}`} → {group.schedule?.timeTo}
                  </div>
                </div>
              </div>

              {/* Message Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Write your message:
                  </label>
                  <button
                    onClick={copyToClipboard}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy template
                  </button>
                </div>

                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Example: 🎓 مرحباً {studentName}&#10;تم إضافتك بنجاح إلى {groupName}&#10;الكورس: {courseName}&#10;البدء: {startDate}&#10;الوقت: {timeFrom} - {timeTo}"
                  className="w-full px-3 py-2.5 border border-blue-300 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark_input dark:text-white resize-none h-32 font-mono text-sm"
                />

                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {customMessage.length} characters
                </div>
              </div>

              {/* Live Preview */}
              {previewMessage && (
                <div className="bg-white dark:bg-dark_input rounded p-3 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📋 Live Preview:
                  </p>
                  <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 max-h-40 overflow-y-auto">
                    {previewMessage}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
        <button
          onClick={onClose}
          disabled={adding}
          className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        
        <button
          onClick={handleAddStudent}
          disabled={!selectedStudent || !customMessage.trim() || isFull || adding}
          className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {adding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Add Student & Send Message
            </>
          )}
        </button>
      </div>
    </div>
  );
}