"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import {
  X,
  Save,
  UserCheck,
  UserX,
  MessageCircle,
  Users,
  Zap,
  RefreshCw,
  Eye,
  Clock,
  AlertTriangle,
  Ban
} from "lucide-react";

export default function AttendanceModal({
  session,
  attendanceData,
  groupStudents,
  loading,
  onClose,
  onRefresh,
  isRTL,
  t
}) {
  const [attendance, setAttendance] = useState([]);
  const [customMessages, setCustomMessages] = useState({});
  const [saving, setSaving] = useState(false);
  const [showMessageEditor, setShowMessageEditor] = useState({});
  const [showHints, setShowHints] = useState({});
  const [cursorPosition, setCursorPosition] = useState({});
  const [selectedHintIndex, setSelectedHintIndex] = useState({});
  const [loadingTemplates, setLoadingTemplates] = useState({});
  const [previewMessages, setPreviewMessages] = useState({});
  const [manuallyEdited, setManuallyEdited] = useState({});
  const [savingTemplate, setSavingTemplate] = useState({});
  const [templatesFetched, setTemplatesFetched] = useState(false);
  
  const textareaRefs = useRef({});
  const hintsRefs = useRef({});
  const initialLoadDone = useRef(false);
  const fetchQueue = useRef(new Set());

  // ✅ للتشخيص - عرض بيانات الطلاب
  useEffect(() => {
    console.log("📊 groupStudents data:", groupStudents);
    groupStudents.forEach(student => {
      console.log(`Student ${student._id}:`, {
        name: student.personalInfo?.fullName,
        creditSystem: student.creditSystem,
        remainingHours: student.creditSystem?.currentPackage?.remainingHours,
        hasPackage: !!student.creditSystem?.currentPackage
      });
    });
  }, [groupStudents]);

  // ========== الدوال الأساسية ==========

  const getStudentStatus = useCallback((studentId) => {
    const record = attendance.find(
      a => (a.studentId?._id || a.studentId?.id || a.studentId)?.toString() === studentId?.toString()
    );
    return record?.status || 'absent';
  }, [attendance]);

  const getStudentNotes = useCallback((studentId) => {
    const record = attendance.find(
      a => (a.studentId?._id || a.studentId?.id || a.studentId)?.toString() === studentId?.toString()
    );
    return record?.notes || '';
  }, [attendance]);

  // ✅ دالة للتحقق من رصيد الطالب (معدلة - بدون إضافة الاستثناءات)
  const checkStudentBalance = useCallback((student) => {
    if (!student) {
      return { hasBalance: false, remainingHours: 0, isBlocked: true };
    }
    
    if (!student.creditSystem) {
      console.log("⚠️ No creditSystem for student:", student._id);
      return { hasBalance: false, remainingHours: 0, isBlocked: true };
    }
    
    // ✅ الرصيد الفعلي = رصيد الحزمة فقط (لأن الاستثناءات مضافة بالفعل)
    const remainingHours = student.creditSystem.currentPackage?.remainingHours || 0;
    
    // التحقق من وجود تجميد نشط
    const hasActiveFreeze = student.creditSystem.exceptions?.some(
      e => e.type === 'freeze' && 
           e.status === 'active' && 
           (!e.endDate || new Date() <= new Date(e.endDate))
    );
    
    const isBlocked = hasActiveFreeze || remainingHours <= 0;
    
    console.log(`✅ Student ${student._id} balance: ${remainingHours}h, blocked: ${isBlocked}`);
    
    return {
      hasBalance: remainingHours > 0,
      remainingHours: remainingHours,
      isBlocked
    };
  }, []);

  // ✅ دالة بناء المتغيرات المُصلحة
  const buildVariables = useCallback((student, status) => {
    if (!student) return {};

    const lang = student.communicationPreferences?.preferredLanguage || 'ar';

    const gender = (student.personalInfo?.gender || 'male').toLowerCase().trim();
    const relationship = (student.guardianInfo?.relationship || 'father').toLowerCase().trim();

    const studentFirstName = lang === 'ar'
      ? (student.personalInfo?.nickname?.ar?.trim() || student.personalInfo?.fullName?.split(' ')[0] || 'الطالب')
      : (student.personalInfo?.nickname?.en?.trim() || student.personalInfo?.fullName?.split(' ')[0] || 'Student');

    const guardianFirstName = lang === 'ar'
      ? (student.guardianInfo?.nickname?.ar?.trim() || student.guardianInfo?.name?.split(' ')[0] || 'ولي الأمر')
      : (student.guardianInfo?.nickname?.en?.trim() || student.guardianInfo?.name?.split(' ')[0] || 'Guardian');

    let guardianSalutation = '';
    if (lang === 'ar') {
      if (relationship === 'mother') {
        guardianSalutation = `عزيزتي السيدة ${guardianFirstName}`;
      } else if (relationship === 'father') {
        guardianSalutation = `عزيزي الأستاذ ${guardianFirstName}`;
      } else {
        guardianSalutation = `عزيزي/عزيزتي ${guardianFirstName}`;
      }
    } else {
      if (relationship === 'mother') {
        guardianSalutation = `Dear Mrs. ${guardianFirstName}`;
      } else if (relationship === 'father') {
        guardianSalutation = `Dear Mr. ${guardianFirstName}`;
      } else {
        guardianSalutation = `Dear ${guardianFirstName}`;
      }
    }

    let studentSalutation = '';
    if (lang === 'ar') {
      studentSalutation = gender === 'female'
        ? `عزيزتي ${studentFirstName}`
        : `عزيزي ${studentFirstName}`;
    } else {
      studentSalutation = `Dear ${studentFirstName}`;
    }

    const childTitle = lang === 'ar'
      ? (gender === 'female' ? 'ابنتك' : 'ابنك')
      : (gender === 'female' ? 'your daughter' : 'your son');

    const statusText = status === 'absent'
      ? (lang === 'ar' ? 'غائب' : 'absent')
      : status === 'late'
        ? (lang === 'ar' ? 'متأخر' : 'late')
        : status === 'excused'
          ? (lang === 'ar' ? 'معتذر' : 'excused')
          : (lang === 'ar' ? 'حاضر' : 'present');

    const sessionDate = session?.scheduledDate
      ? new Date(session.scheduledDate).toLocaleDateString(
          lang === 'ar' ? 'ar-EG' : 'en-US',
          { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
        )
      : '';

    return {
      guardianSalutation,
      studentSalutation,
      salutation: guardianSalutation,
      guardianName: guardianFirstName,
      guardianFullName: student.guardianInfo?.name || '',
      studentName: studentFirstName,
      studentFullName: student.personalInfo?.fullName || '',
      childTitle,
      status: statusText,
      sessionName: session?.title || '',
      date: sessionDate,
      time: `${session?.startTime || ''} - ${session?.endTime || ''}`,
      meetingLink: session?.meetingLink || '',
      enrollmentNumber: student.enrollmentNumber || '',
      groupName: session?.groupId?.name || '',
      groupCode: session?.groupId?.code || '',
    };
  }, [session]);

  // ========== دوال جلب وحفظ القوالب ==========

  const fetchTemplateForStudent = useCallback(async (studentId, status) => {
    if (!studentId || !status) return null;
    if (manuallyEdited[studentId]) return null;

    setLoadingTemplates(prev => ({ ...prev, [studentId]: true }));
    try {
      const res = await fetch(`/api/sessions/${session.id}/attendance-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceStatus: status, studentId })
      });

      const json = await res.json();

      if (json.success && json.data?.guardian?.content) {
        setCustomMessages(prev => ({ ...prev, [studentId]: json.data.guardian.content }));
        setManuallyEdited(prev => ({ ...prev, [studentId]: false }));
        return json.data.guardian.content;
      }
    } catch (error) {
      console.error('Error fetching template:', error);
    } finally {
      setLoadingTemplates(prev => ({ ...prev, [studentId]: false }));
    }
    return null;
  }, [session.id, manuallyEdited]);

  const resetToDefaultTemplate = useCallback(async (studentId) => {
    const status = getStudentStatus(studentId);
    if (!status) return;

    setLoadingTemplates(prev => ({ ...prev, [studentId]: true }));
    try {
      const res = await fetch(`/api/sessions/${session.id}/attendance-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceStatus: status, studentId })
      });

      const json = await res.json();

      if (json.success && json.data?.guardian?.content) {
        setCustomMessages(prev => ({ ...prev, [studentId]: json.data.guardian.content }));
        setManuallyEdited(prev => ({ ...prev, [studentId]: false }));
        toast.success(isRTL ? 'تم استعادة القالب الافتراضي' : 'Default template restored');
      }
    } catch (error) {
      console.error('Error resetting template:', error);
      toast.error(isRTL ? 'فشل استعادة القالب' : 'Failed to restore template');
    } finally {
      setLoadingTemplates(prev => ({ ...prev, [studentId]: false }));
    }
  }, [session.id, getStudentStatus, isRTL]);

  // ✅ دالة حفظ القالب
  const saveTemplateToDatabase = useCallback(async (studentId, content) => {
    if (!studentId || !content?.trim()) return;

    const status = getStudentStatus(studentId);
    if (!status) return;

    setSavingTemplate(prev => ({ ...prev, [studentId]: true }));

    try {
      let templateType = '';
      if (status === 'absent') templateType = 'absence_notification';
      else if (status === 'late') templateType = 'late_notification';
      else if (status === 'excused') templateType = 'excused_notification';
      else return;

      const recipientType = 'guardian';
      const student = groupStudents.find(s => s._id === studentId);
      const studentLang = student?.communicationPreferences?.preferredLanguage || 'ar';

      const templateName = status === 'absent' ? 'Absence Notification'
        : status === 'late' ? 'Late Notification'
        : 'Excused Absence Notification';

      const searchRes = await fetch(`/api/message-templates?type=${templateType}&recipient=${recipientType}&default=true`);
      const searchJson = await searchRes.json();

      if (searchJson.success && searchJson.data.length > 0) {
        const templateId = searchJson.data[0]._id;
        const updateData = { id: templateId, name: templateName, isDefault: true };

        if (studentLang === 'ar') {
          updateData.contentAr = content;
          if (!searchJson.data[0].contentEn) updateData.contentEn = content;
        } else {
          updateData.contentEn = content;
          if (!searchJson.data[0].contentAr) updateData.contentAr = content;
        }

        const updateRes = await fetch(`/api/message-templates`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });

        const updateJson = await updateRes.json();
        if (updateJson.success) {
          toast.success(isRTL ? 'تم تحديث القالب في قاعدة البيانات' : 'Template updated in database');
        } else {
          throw new Error(updateJson.error || 'Update failed');
        }
      } else {
        const newTemplate = {
          templateType,
          recipientType,
          name: templateName,
          description: `${status} notification for guardian`,
          isDefault: true,
          isActive: true,
          variables: [
            { key: 'guardianSalutation', label: 'Guardian Salutation', description: 'تحية ولي الأمر', example: 'عزيزي الأستاذ محمد' },
            { key: 'guardianName', label: 'Guardian Name', description: 'اسم ولي الأمر', example: 'محمد' },
            { key: 'studentName', label: 'Student Name', description: 'اسم الطالب', example: 'أحمد' },
            { key: 'childTitle', label: 'Son/Daughter', description: 'ابنك/ابنتك', example: 'ابنك' },
            { key: 'status', label: 'Status', description: 'حالة الغياب', example: 'غائب' },
            { key: 'sessionName', label: 'Session Name', description: 'اسم الجلسة', example: 'الجلسة الأولى' },
            { key: 'date', label: 'Date', description: 'التاريخ', example: 'الاثنين ١ يناير ٢٠٢٥' },
            { key: 'time', label: 'Time', description: 'الوقت', example: '٥:٠٠ م - ٧:٠٠ م' },
            { key: 'enrollmentNumber', label: 'Enrollment Number', description: 'الرقم التعريفي', example: 'STU001' }
          ],
          contentAr: studentLang === 'ar' ? content : '',
          contentEn: studentLang === 'en' ? content : ''
        };

        const createRes = await fetch(`/api/message-templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTemplate)
        });

        const createJson = await createRes.json();
        if (createJson.success) {
          toast.success(isRTL ? 'تم حفظ القالب في قاعدة البيانات' : 'Template saved to database');
        } else {
          throw new Error(createJson.error || 'Creation failed');
        }
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(isRTL ? 'فشل حفظ القالب: ' + error.message : 'Failed to save template: ' + error.message);
    } finally {
      setSavingTemplate(prev => ({ ...prev, [studentId]: false }));
    }
  }, [groupStudents, getStudentStatus, isRTL]);

  // ========== دوال تحديث البيانات ==========

  const updateAttendanceStatus = useCallback((studentId, status) => {
    // ✅ التحقق من رصيد الطالب قبل تغيير الحالة
    const student = groupStudents.find(s => s._id === studentId);
    const { isBlocked, remainingHours } = checkStudentBalance(student);

    if (isBlocked && (status === 'present' || status === 'late')) {
      toast.error(
        isRTL 
          ? `لا يمكن تسجيل حضور للطالب - الرصيد صفر (${remainingHours} ساعة)` 
          : `Cannot mark attendance - Zero balance (${remainingHours} hours)`
      );
      return;
    }

    setAttendance(prev => {
      const existingIndex = prev.findIndex(
        a => (a.studentId?._id || a.studentId?.id || a.studentId)?.toString() === studentId?.toString()
      );

      let newAttendance;
      if (existingIndex >= 0) {
        newAttendance = [...prev];
        newAttendance[existingIndex] = { ...newAttendance[existingIndex], status };
      } else {
        newAttendance = [...prev, { studentId, status, notes: '' }];
      }
      return newAttendance;
    });

    if (['absent', 'late', 'excused'].includes(status)) {
      setShowMessageEditor(prev => ({ ...prev, [studentId]: true }));
      if (!manuallyEdited[studentId]) {
        fetchTemplateForStudent(studentId, status);
      }
    } else {
      setShowMessageEditor(prev => ({ ...prev, [studentId]: false }));
      setCustomMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[studentId];
        return newMessages;
      });
      setManuallyEdited(prev => {
        const newEdited = { ...prev };
        delete newEdited[studentId];
        return newEdited;
      });
    }
  }, [fetchTemplateForStudent, manuallyEdited, groupStudents, checkStudentBalance, isRTL]);

  const updateStudentNotes = useCallback((studentId, notes) => {
    setAttendance(prev => {
      const existingIndex = prev.findIndex(
        a => (a.studentId?._id || a.studentId?.id || a.studentId)?.toString() === studentId?.toString()
      );

      if (existingIndex >= 0) {
        const newAttendance = [...prev];
        newAttendance[existingIndex] = { ...newAttendance[existingIndex], notes };
        return newAttendance;
      }
      return prev;
    });
  }, []);

  const generatePreview = useCallback((studentId, message) => {
    if (!message) return '';

    const student = groupStudents.find(s => s._id === studentId);
    if (!student) return message;

    const status = getStudentStatus(studentId);
    const variables = buildVariables(student, status);

    let preview = message;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      preview = preview.replace(regex, String(value ?? ''));
    });
    return preview;
  }, [groupStudents, buildVariables, getStudentStatus]);

  // ========== دوال الـ Hints ==========

  const availableVariables = useMemo(() => [
    { key: '{guardianSalutation}', label: isRTL ? 'تحية ولي الأمر (كاملة)' : 'Guardian Salutation (full)', icon: '👤' },
    { key: '{guardianName}', label: isRTL ? 'اسم ولي الأمر' : 'Guardian Name', icon: '👤' },
    { key: '{studentName}', label: isRTL ? 'اسم الطالب' : 'Student Name', icon: '👶' },
    { key: '{childTitle}', label: isRTL ? 'ابنك/ابنتك' : 'Son/Daughter', icon: '👪' },
    { key: '{status}', label: isRTL ? 'الحالة' : 'Status', icon: '📊' },
    { key: '{sessionName}', label: isRTL ? 'اسم الجلسة' : 'Session Name', icon: '📘' },
    { key: '{date}', label: isRTL ? 'التاريخ' : 'Date', icon: '📅' },
    { key: '{time}', label: isRTL ? 'الوقت' : 'Time', icon: '⏰' },
    { key: '{enrollmentNumber}', label: isRTL ? 'الرقم التعريفي' : 'Enrollment No.', icon: '🔢' },
  ], [isRTL]);

  const handleTextareaInput = useCallback((e, studentId) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;

    setCustomMessages(prev => ({ ...prev, [studentId]: value }));
    setManuallyEdited(prev => ({ ...prev, [studentId]: true }));
    setCursorPosition(prev => ({ ...prev, [studentId]: cursorPos }));

    const lastAt = value.substring(0, cursorPos).lastIndexOf('@');
    if (lastAt !== -1 && lastAt === cursorPos - 1) {
      setShowHints(prev => ({ ...prev, [studentId]: true }));
      setSelectedHintIndex(prev => ({ ...prev, [studentId]: 0 }));
    } else {
      setShowHints(prev => ({ ...prev, [studentId]: false }));
    }
  }, []);

  const handleKeyDown = useCallback((e, studentId) => {
    if (!showHints[studentId]) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedHintIndex(prev => ({
        ...prev,
        [studentId]: ((prev[studentId] || 0) + 1) % availableVariables.length
      }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedHintIndex(prev => ({
        ...prev,
        [studentId]: ((prev[studentId] || 0) - 1 + availableVariables.length) % availableVariables.length
      }));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertVariable(studentId, availableVariables[selectedHintIndex[studentId] || 0]);
    } else if (e.key === 'Escape') {
      setShowHints(prev => ({ ...prev, [studentId]: false }));
    }
  }, [showHints, selectedHintIndex, availableVariables]);

  const insertVariable = useCallback((studentId, variable) => {
    const textarea = textareaRefs.current[studentId];
    if (!textarea) return;

    const currentValue = customMessages[studentId] || '';
    const cursorPos = cursorPosition[studentId] || 0;
    const beforeCursor = currentValue.substring(0, cursorPos);
    const lastAt = beforeCursor.lastIndexOf('@');

    let newValue, newCursorPos;
    if (lastAt !== -1) {
      newValue = currentValue.substring(0, lastAt) + variable.key + currentValue.substring(cursorPos);
      newCursorPos = lastAt + variable.key.length;
    } else {
      newValue = currentValue.substring(0, cursorPos) + variable.key + currentValue.substring(cursorPos);
      newCursorPos = cursorPos + variable.key.length;
    }

    setCustomMessages(prev => ({ ...prev, [studentId]: newValue }));
    setManuallyEdited(prev => ({ ...prev, [studentId]: true }));
    setShowHints(prev => ({ ...prev, [studentId]: false }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [customMessages, cursorPosition]);

  // ========== دوال الـ Effects ==========

  useEffect(() => {
    if (initialLoadDone.current) return;

    if (attendanceData?.attendance && attendanceData.attendance.length > 0) {
      setAttendance(attendanceData.attendance);
      initialLoadDone.current = true;
    } else if (groupStudents.length > 0 && !initialLoadDone.current) {
      const initialAttendance = groupStudents.map(student => ({
        studentId: student._id,
        status: 'absent',
        notes: ''
      }));
      setAttendance(initialAttendance);
      initialLoadDone.current = true;
    }
  }, [attendanceData, groupStudents]);

  useEffect(() => {
    if (!groupStudents.length || !attendance.length || templatesFetched) return;

    const fetchAllTemplates = async () => {
      for (const student of groupStudents) {
        const status = getStudentStatus(student._id);

        if (['absent', 'late', 'excused'].includes(status)) {
          setShowMessageEditor(prev => ({ ...prev, [student._id]: true }));

          if (!fetchQueue.current.has(student._id) && !manuallyEdited[student._id]) {
            fetchQueue.current.add(student._id);
            await fetchTemplateForStudent(student._id, status);
            fetchQueue.current.delete(student._id);
          }
        }
      }

      setTemplatesFetched(true);
    };

    fetchAllTemplates();
  }, [groupStudents, attendance]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(hintsRefs.current).forEach(studentId => {
        if (hintsRefs.current[studentId] && !hintsRefs.current[studentId].contains(event.target)) {
          setShowHints(prev => ({ ...prev, [studentId]: false }));
        }
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const newPreviews = {};
    Object.keys(customMessages).forEach(studentId => {
      if (customMessages[studentId]) {
        newPreviews[studentId] = generatePreview(studentId, customMessages[studentId]);
      }
    });
    setPreviewMessages(newPreviews);
  }, [customMessages, generatePreview]);

  // ========== دوال الحفظ ==========

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendance: attendance.map(a => ({
            studentId: a.studentId?._id || a.studentId?.id || a.studentId,
            status: a.status,
            notes: a.notes || ''
          })),
          customMessages
        })
      });

      const json = await res.json();

      if (json.success) {
        toast.success(isRTL ? 'تم حفظ الحضور بنجاح' : 'Attendance saved successfully');
        onClose();
        onRefresh();
      } else {
        toast.error(json.error || (isRTL ? 'فشل الحفظ' : 'Save failed'));
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error(isRTL ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setSaving(false);
    }
  }, [attendance, customMessages, session.id, isRTL, onClose, onRefresh]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-darkmode rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  const stats = {
    total: groupStudents.length,
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    late: attendance.filter(a => a.status === 'late').length,
    excused: attendance.filter(a => a.status === 'excused').length,
    blocked: groupStudents.filter(s => {
      const { isBlocked } = checkStudentBalance(s);
      return isBlocked;
    }).length
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-lg max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>

        {/* Header */}
        <div className="p-6 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-MidnightNavyText dark:text-white">
              {isRTL ? 'تسجيل الحضور' : 'Attendance'} - {session?.title}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(session?.scheduledDate).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
              })} - {session?.startTime} {isRTL ? 'إلى' : 'to'} {session?.endTime}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="p-6 border-b border-PowderBlueBorder dark:border-dark_border bg-gray-50 dark:bg-dark_input">
          <div className="grid grid-cols-6 gap-4">
            {[
              { label: isRTL ? 'الإجمالي' : 'Total', value: stats.total, color: 'text-gray-800 dark:text-white' },
              { label: isRTL ? 'حاضر' : 'Present', value: stats.present, color: 'text-green-600' },
              { label: isRTL ? 'غائب' : 'Absent', value: stats.absent, color: 'text-red-600' },
              { label: isRTL ? 'متأخر' : 'Late', value: stats.late, color: 'text-yellow-600' },
              { label: isRTL ? 'معتذر' : 'Excused', value: stats.excused, color: 'text-blue-600' },
              { label: isRTL ? 'محظور' : 'Blocked', value: stats.blocked, color: 'text-gray-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Students List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {groupStudents.map(student => {
              const studentId = student._id;
              const status = getStudentStatus(studentId);
              const notes = getStudentNotes(studentId);
              const needsMessage = ['absent', 'late', 'excused'].includes(status);
              const studentLang = student.communicationPreferences?.preferredLanguage || 'ar';
              
              const { hasBalance, remainingHours, isBlocked } = checkStudentBalance(student);

              const gender = (student.personalInfo?.gender || 'male').toLowerCase().trim();
              const relationship = (student.guardianInfo?.relationship || 'father').toLowerCase().trim();

              const currentVars = buildVariables(student, status);

              return (
                <div key={studentId} className={`border rounded-lg overflow-hidden ${
                  isBlocked ? 'border-gray-300 dark:border-gray-700 opacity-75' : 'border-PowderBlueBorder dark:border-dark_border'
                }`}>
                  <div className={`flex items-center justify-between p-4 ${
                    isBlocked ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-darkmode'
                  }`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-MidnightNavyText dark:text-white">
                          {student.personalInfo?.fullName}
                        </p>
                        {isBlocked && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs">
                            <Ban className="w-3 h-3" />
                            {isRTL ? 'محظور' : 'Blocked'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{isRTL ? 'رقم' : 'ID'}: {student.enrollmentNumber}</p>
                      
                      <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                        <span className="text-blue-600 dark:text-blue-400" title={isRTL ? 'اللغة المفضلة' : 'Preferred language'}>
                          {studentLang === 'ar' ? '🇸🇦 عربي' : '🇬🇧 English'}
                        </span>
                        
                        <span className="text-purple-600 dark:text-purple-400">
                          {gender === 'female'
                            ? (isRTL ? '👧 أنثى' : '👧 Female')
                            : (isRTL ? '👦 ذكر' : '👦 Male')}
                        </span>
                        
                        <span className="text-green-600 dark:text-green-400">
                          {relationship === 'mother'
                            ? (isRTL ? '👩 أم' : '👩 Mother')
                            : relationship === 'father'
                              ? (isRTL ? '👨 أب' : '👨 Father')
                              : (isRTL ? '👤 ولي أمر' : '👤 Guardian')}
                        </span>
                        
                        {student.creditSystem?.currentPackage && (
                          <span 
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                              remainingHours <= 0
                                ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                : remainingHours <= 2
                                  ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                  : remainingHours <= 5
                                    ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                            }`}
                            title={isRTL ? 'الساعات المتبقية' : 'Remaining hours'}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{remainingHours}h</span>
                          </span>
                        )}
                      </div>

                      {!isBlocked && remainingHours <= 2 && remainingHours > 0 && (
                        <p className="flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-400">
                          <AlertTriangle className="w-3 h-3" />
                          {isRTL 
                            ? `تحذير: الرصيد على وشك النفاذ (${remainingHours} ساعات)` 
                            : `Warning: Low balance (${remainingHours} hours)`}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <select
                        value={status}
                        onChange={(e) => updateAttendanceStatus(studentId, e.target.value)}
                        disabled={isBlocked}
                        className={`px-3 py-2 text-sm border rounded-lg dark:bg-dark_input dark:text-white ${
                          isBlocked ? 'border-gray-300 dark:border-gray-700 opacity-50 cursor-not-allowed' : 'border-PowderBlueBorder dark:border-dark_border'
                        }`}
                      >
                        <option value="present" disabled={isBlocked}>{isRTL ? 'حاضر' : 'Present'}</option>
                        <option value="absent">{isRTL ? 'غائب' : 'Absent'}</option>
                        <option value="late" disabled={isBlocked}>{isRTL ? 'متأخر' : 'Late'}</option>
                        <option value="excused">{isRTL ? 'معتذر' : 'Excused'}</option>
                      </select>
                    </div>
                  </div>

                  {!isBlocked && needsMessage && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border-t border-purple-200 dark:border-purple-800 p-4">
                      <div className="flex items-start gap-3">
                        <MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-purple-900 dark:text-purple-100 text-sm">
                              📨 {isRTL ? 'رسالة لولي الأمر' : 'Message for Guardian'}
                              {' '}({student.guardianInfo?.name || (isRTL ? 'ولي الأمر' : 'Guardian')})
                            </h4>
                            <button
                              onClick={() => resetToDefaultTemplate(studentId)}
                              disabled={loadingTemplates[studentId]}
                              className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-700 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-1"
                            >
                              <RefreshCw className={`w-3 h-3 ${loadingTemplates[studentId] ? 'animate-spin' : ''}`} />
                              {isRTL ? 'استعادة القالب' : 'Reset'}
                            </button>
                          </div>

                          <div className="p-2 bg-white dark:bg-gray-800 rounded border border-purple-200 dark:border-purple-700 text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-purple-600 dark:text-purple-400 font-medium">
                                {relationship === 'mother'
                                  ? (isRTL ? '👩 تحية الأم:' : '👩 Mother greeting:')
                                  : (isRTL ? '👨 تحية الأب:' : '👨 Father greeting:')}
                              </span>
                              <span className="text-gray-800 dark:text-gray-200 font-medium">
                                {currentVars.guardianSalutation}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-purple-600 dark:text-purple-400 font-medium">
                                {gender === 'female'
                                  ? (isRTL ? '👧 وصف الطالبة:' : '👧 Student ref:')
                                  : (isRTL ? '👦 وصف الطالب:' : '👦 Student ref:')}
                              </span>
                              <span className="text-gray-800 dark:text-gray-200">
                                {currentVars.childTitle} {currentVars.studentName}
                              </span>
                            </div>
                            {loadingTemplates[studentId] && (
                              <div className="flex items-center gap-2 mt-1 text-purple-600">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>{isRTL ? 'جاري تحميل القالب...' : 'Loading template...'}</span>
                              </div>
                            )}
                            {manuallyEdited[studentId] && (
                              <p className="text-orange-500 dark:text-orange-400 mt-1">
                                ✏️ {isRTL ? 'الرسالة معدلة يدوياً' : 'Message manually edited'}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2 relative">
                            <div className="flex justify-between items-center">
                              <label className="text-xs text-gray-600 dark:text-gray-400">
                                {isRTL ? 'نص الرسالة' : 'Message text'}
                              </label>
                              <span className="text-xs text-gray-400">
                                @ {isRTL ? 'للمتغيرات' : 'for variables'}
                              </span>
                            </div>
                            <textarea
                              ref={el => textareaRefs.current[studentId] = el}
                              value={customMessages[studentId] || ''}
                              onChange={(e) => handleTextareaInput(e, studentId)}
                              onKeyDown={(e) => handleKeyDown(e, studentId)}
                              onSelect={(e) => setCursorPosition(prev => ({ ...prev, [studentId]: e.target.selectionStart }))}
                              placeholder={isRTL ? 'اكتب رسالة مخصصة...' : 'Write custom message...'}
                              className="w-full px-3 py-2.5 border-2 border-purple-200 dark:border-purple-700 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white resize-none h-24 font-mono text-sm"
                              dir={studentLang === 'ar' ? 'rtl' : 'ltr'}
                            />

                            {showHints[studentId] && (
                              <div
                                ref={el => hintsRefs.current[studentId] = el}
                                className="absolute z-50 w-full mt-1 bg-white dark:bg-darkmode border-2 border-purple-300 dark:border-purple-700 rounded-lg shadow-xl max-h-56 overflow-y-auto"
                              >
                                <div className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 border-b dark:border-purple-800">
                                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                    <Zap className="w-3 h-3" />
                                    {isRTL ? 'المتغيرات المتاحة' : 'Available Variables'}
                                  </p>
                                </div>
                                {availableVariables.map((v, i) => (
                                  <button
                                    key={v.key}
                                    type="button"
                                    onClick={() => insertVariable(studentId, v)}
                                    className={`w-full px-3 py-2 text-right hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-2 ${
                                      i === selectedHintIndex[studentId] ? 'bg-purple-100 dark:bg-purple-900/40' : ''
                                    }`}
                                  >
                                    <span>{v.icon}</span>
                                    <div className="flex-1 flex items-center justify-between">
                                      <span className="text-sm font-mono text-purple-600 dark:text-purple-400">{v.key}</span>
                                      <span className="text-xs text-gray-500">{v.label}</span>
                                    </div>
                                  </button>
                                ))}
                                <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-t text-xs text-gray-400">
                                  ↑↓ {isRTL ? 'للتنقل' : 'navigate'} · Enter {isRTL ? 'للإدراج' : 'insert'} · Esc {isRTL ? 'إغلاق' : 'close'}
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                              {isRTL ? 'ملاحظات إضافية (اختياري)' : 'Additional Notes (optional)'}
                            </label>
                            <input
                              type="text"
                              value={notes}
                              onChange={(e) => updateStudentNotes(studentId, e.target.value)}
                              placeholder={isRTL ? 'أضف ملاحظة...' : 'Add a note...'}
                              className="w-full px-3 py-2 text-sm border border-purple-200 dark:border-purple-700 rounded-lg dark:bg-gray-800 dark:text-white"
                            />
                          </div>

                          {previewMessages[studentId] && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700 overflow-hidden">
                              <div className="bg-purple-50 dark:bg-purple-900/30 px-3 py-2 border-b flex items-center justify-between">
                                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                  📋 {isRTL ? 'معاينة حية' : 'Live Preview'}
                                </span>
                                <span className="text-xs text-purple-500">
                                  {studentLang === 'ar' ? '🇸🇦' : '🇬🇧'} ·
                                  {gender === 'female' ? ' 👧' : ' 👦'} ·
                                  {relationship === 'mother' ? ' 👩 أم' : relationship === 'father' ? ' 👨 أب' : ' 👤'}
                                </span>
                              </div>
                              <div className="p-3 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 max-h-48 overflow-y-auto" dir={studentLang === 'ar' ? 'rtl' : 'ltr'}>
                                {previewMessages[studentId]}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end pt-2 border-t border-purple-200 dark:border-purple-800">
                            <button
                              onClick={() => saveTemplateToDatabase(studentId, customMessages[studentId])}
                              disabled={!customMessages[studentId] || savingTemplate[studentId] || loadingTemplates[studentId]}
                              className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              {savingTemplate[studentId] ? (
                                <><RefreshCw className="w-3 h-3 animate-spin" /> {isRTL ? 'جاري الحفظ...' : 'Saving...'}</>
                              ) : (
                                isRTL ? 'حفظ كقالب افتراضي' : 'Save as Default Template'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isBlocked && needsMessage && (
                    <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 p-4 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                        <Ban className="w-4 h-4" />
                        {isRTL 
                          ? 'تم تعطيل الإشعارات لهذا الطالب بسبب نفاد الرصيد' 
                          : 'Notifications disabled for this student due to zero balance'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {groupStudents.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 font-medium">
                {isRTL ? 'لا يوجد طلاب في هذه المجموعة' : 'No students in this group'}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-PowderBlueBorder dark:border-dark_border flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-gray-50 dark:hover:bg-dark_input"
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                {isRTL ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isRTL ? 'حفظ الحضور' : 'Save Attendance'}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}