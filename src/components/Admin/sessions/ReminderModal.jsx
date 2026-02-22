// /src/components/sessions/ReminderModal.jsx
"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import {
  X,
  Send,
  RefreshCw,
  MessageCircle,
  User,
  Users,
  Zap,
  Calendar,
  Clock,
  Save,
  Globe
} from "lucide-react";

export default function ReminderModal({ session, groupStudents, reminderType, onClose, onRefresh, isRTL, t }) {
  // ✅ State للقالب المعروض حالياً في المحرر (للمعاينة فقط)
  const [currentStudentMessage, setCurrentStudentMessage] = useState('');
  const [currentGuardianMessage, setCurrentGuardianMessage] = useState('');
  
  // ✅ State للقوالب الخام لكل طالب (دي اللي هنرسلها للباك إند)
  const [studentTemplates, setStudentTemplates] = useState({});
  const [guardianTemplates, setGuardianTemplates] = useState({});
  
  // ✅ State للقوالب المعدلة يدوياً لكل طالب
  const [editedStudentTemplates, setEditedStudentTemplates] = useState({});
  const [editedGuardianTemplates, setEditedGuardianTemplates] = useState({});

  const [previewStudentMessage, setPreviewStudentMessage] = useState('');
  const [previewGuardianMessage, setPreviewGuardianMessage] = useState('');
  const [showHints, setShowHints] = useState({ student: false, guardian: false });
  const [cursorPosition, setCursorPosition] = useState({ student: 0, guardian: 0 });
  const [selectedHintIndex, setSelectedHintIndex] = useState({ student: 0, guardian: 0 });
  const [selectedStudentForPreview, setSelectedStudentForPreview] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [manuallyEdited, setManuallyEdited] = useState({ student: false, guardian: false });
  const [savingTemplate, setSavingTemplate] = useState({ student: false, guardian: false });
  const [sending, setSending] = useState(false);

  const studentTextareaRef = useRef(null);
  const guardianTextareaRef = useRef(null);
  const hintsRef = useRef({ student: null, guardian: null });

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (hintsRef.current.student && !hintsRef.current.student.contains(event.target)) {
        setShowHints(prev => ({ ...prev, student: false }));
      }
      if (hintsRef.current.guardian && !hintsRef.current.guardian.contains(event.target)) {
        setShowHints(prev => ({ ...prev, guardian: false }));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // اختيار أول طالب
  useEffect(() => {
    if (groupStudents.length > 0 && !selectedStudentForPreview) {
      setSelectedStudentForPreview(groupStudents[0]);
    }
  }, [groupStudents]);

  // ✅ FIX: جلب القوالب لجميع الطلاب مرة واحدة
  useEffect(() => {
    const fetchAllTemplates = async () => {
      if (groupStudents.length === 0) return;
      
      setLoadingTemplates(true);
      try {
        const eventType = reminderType === '24hours' ? 'reminder_24h' : 'reminder_1h';
        
        // جلب القوالب لكل طالب
        const templatesPromises = groupStudents.map(async (student) => {
          const res = await fetch(`/api/sessions/${session.id}/templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventType,
              studentId: student._id,
              extraData: { meetingLink: session.meetingLink }
            })
          });
          const json = await res.json();
          
          if (json.success) {
            return {
              studentId: student._id,
              studentTemplate: json.data.student?.rawContent || json.data.student?.content || '',
              guardianTemplate: json.data.guardian?.rawContent || json.data.guardian?.content || ''
            };
          }
          return null;
        });

        const results = await Promise.all(templatesPromises);
        
        const newStudentTemplates = {};
        const newGuardianTemplates = {};
        
        results.forEach(result => {
          if (result) {
            newStudentTemplates[result.studentId] = result.studentTemplate;
            newGuardianTemplates[result.studentId] = result.guardianTemplate;
          }
        });

        setStudentTemplates(newStudentTemplates);
        setGuardianTemplates(newGuardianTemplates);

        // عرض قالب أول طالب
        if (groupStudents[0]) {
          setCurrentStudentMessage(newStudentTemplates[groupStudents[0]._id] || '');
          setCurrentGuardianMessage(newGuardianTemplates[groupStudents[0]._id] || '');
        }

      } catch (error) {
        console.error('Error fetching templates:', error);
        toast.error(isRTL ? 'فشل تحميل القوالب' : 'Failed to load templates');
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchAllTemplates();
  }, [groupStudents, reminderType, session.id, session.meetingLink, isRTL]);

  // حفظ القالب في قاعدة البيانات
  const saveTemplateToDatabase = useCallback(async (type, content) => {
    if (!selectedStudentForPreview || !content?.trim()) return;

    setSavingTemplate(prev => ({ ...prev, [type]: true }));

    try {
      const templateType = reminderType === '24hours'
        ? (type === 'student' ? 'reminder_24h_student' : 'reminder_24h_guardian')
        : (type === 'student' ? 'reminder_1h_student' : 'reminder_1h_guardian');

      const recipientType = type === 'student' ? 'student' : 'guardian';
      const studentLang = selectedStudentForPreview.communicationPreferences?.preferredLanguage || 'ar';

      const templateName = reminderType === '24hours'
        ? (type === 'student' ? '24h Reminder - Student' : '24h Reminder - Guardian')
        : (type === 'student' ? '1h Reminder - Student' : '1h Reminder - Guardian');

      const searchRes = await fetch(`/api/message-templates?type=${templateType}&recipient=${recipientType}&default=true`);
      const searchJson = await searchRes.json();

      if (searchJson.success && searchJson.data.length > 0) {
        const templateId = searchJson.data[0]._id;

        const updateData = {
          id: templateId,
          name: templateName,
          isDefault: true,
          updatedAt: new Date()
        };

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
          description: `${reminderType === '24hours' ? '24 hours' : '1 hour'} reminder for ${recipientType}`,
          isDefault: true,
          isActive: true,
          variables: [
            { key: 'guardianSalutation', label: 'Guardian Salutation', description: 'تحية ولي الأمر', example: 'عزيزي الأستاذ محمد' },
            { key: 'studentSalutation', label: 'Student Salutation', description: 'تحية الطالب', example: 'عزيزي أحمد' },
            { key: 'studentName', label: 'Student Name', description: 'اسم الطالب', example: 'أحمد' },
            { key: 'guardianName', label: 'Guardian Name', description: 'اسم ولي الأمر', example: 'محمد' },
            { key: 'childTitle', label: 'Son/Daughter', description: 'ابنك/ابنتك', example: 'ابنك' },
            { key: 'sessionName', label: 'Session Name', description: 'اسم الجلسة', example: 'الجلسة الأولى' },
            { key: 'date', label: 'Date', description: 'التاريخ', example: 'الاثنين ١ يناير ٢٠٢٥' },
            { key: 'time', label: 'Time', description: 'الوقت', example: '٥:٠٠ م - ٧:٠٠ م' },
            { key: 'meetingLink', label: 'Meeting Link', description: 'رابط الاجتماع', example: 'https://meet.google.com/xxx' },
            { key: 'enrollmentNumber', label: 'Enrollment Number', description: 'الرقم التعريفي', example: 'STU001' }
          ],
          contentAr: studentLang === 'ar' ? content : content,
          contentEn: studentLang === 'en' ? content : content
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
      setSavingTemplate(prev => ({ ...prev, [type]: false }));
    }
  }, [reminderType, selectedStudentForPreview, isRTL]);

  // بناء المتغيرات مع تطبيع gender و relationship
  const buildVariables = useCallback((student) => {
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

    let studentSalutation = '';
    if (lang === 'ar') {
      studentSalutation = gender === 'female'
        ? `عزيزتي ${studentFirstName}`
        : `عزيزي ${studentFirstName}`;
    } else {
      studentSalutation = `Dear ${studentFirstName}`;
    }

    let guardianSalutation = '';
    if (lang === 'ar') {
      if (relationship === 'mother') guardianSalutation = `عزيزتي السيدة ${guardianFirstName}`;
      else if (relationship === 'father') guardianSalutation = `عزيزي الأستاذ ${guardianFirstName}`;
      else guardianSalutation = `عزيزي/عزيزتي ${guardianFirstName}`;
    } else {
      if (relationship === 'mother') guardianSalutation = `Dear Mrs. ${guardianFirstName}`;
      else if (relationship === 'father') guardianSalutation = `Dear Mr. ${guardianFirstName}`;
      else guardianSalutation = `Dear ${guardianFirstName}`;
    }

    const childTitle = lang === 'ar'
      ? (gender === 'female' ? 'ابنتك' : 'ابنك')
      : (gender === 'female' ? 'your daughter' : 'your son');

    const sessionDate = session?.scheduledDate
      ? new Date(session.scheduledDate).toLocaleDateString(
          lang === 'ar' ? 'ar-EG' : 'en-US',
          { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
        )
      : '';

    return {
      studentSalutation,
      guardianSalutation,
      salutation: guardianSalutation,
      studentName: studentFirstName,
      studentFullName: student.personalInfo?.fullName || '',
      guardianName: guardianFirstName,
      guardianFullName: student.guardianInfo?.name || '',
      childTitle,
      sessionName: session?.title || '',
      date: sessionDate,
      time: `${session?.startTime || ''} - ${session?.endTime || ''}`,
      meetingLink: session?.meetingLink || '',
      groupCode: session?.groupId?.code || '',
      groupName: session?.groupId?.name || '',
      enrollmentNumber: student.enrollmentNumber || '',
    };
  }, [session]);

  // إنشاء المعاينة
  const generatePreview = useCallback((message, student) => {
    if (!message || !student) return '';
    const variables = buildVariables(student);
    let preview = message;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      preview = preview.replace(regex, String(value ?? ''));
    });
    return preview;
  }, [buildVariables]);

  // تحديث المعاينة
  useEffect(() => {
    if (!selectedStudentForPreview) return;
    setPreviewStudentMessage(generatePreview(currentStudentMessage, selectedStudentForPreview));
    setPreviewGuardianMessage(generatePreview(currentGuardianMessage, selectedStudentForPreview));
  }, [currentStudentMessage, currentGuardianMessage, selectedStudentForPreview, generatePreview]);

  // المتغيرات المتاحة للـ Hints
  const availableVariables = useMemo(() => [
    { key: '{guardianSalutation}', label: isRTL ? 'تحية ولي الأمر' : 'Guardian Salutation', icon: '👤' },
    { key: '{studentSalutation}', label: isRTL ? 'تحية الطالب' : 'Student Salutation', icon: '👶' },
    { key: '{studentName}', label: isRTL ? 'اسم الطالب' : 'Student Name', icon: '👶' },
    { key: '{guardianName}', label: isRTL ? 'اسم ولي الأمر' : 'Guardian Name', icon: '👤' },
    { key: '{childTitle}', label: isRTL ? 'ابنك/ابنتك' : 'Son/Daughter', icon: '👪' },
    { key: '{sessionName}', label: isRTL ? 'اسم الجلسة' : 'Session Name', icon: '📘' },
    { key: '{date}', label: isRTL ? 'التاريخ' : 'Date', icon: '📅' },
    { key: '{time}', label: isRTL ? 'الوقت' : 'Time', icon: '⏰' },
    { key: '{meetingLink}', label: isRTL ? 'رابط الاجتماع' : 'Meeting Link', icon: '🔗' },
    { key: '{enrollmentNumber}', label: isRTL ? 'الرقم التعريفي' : 'Enrollment No.', icon: '🔢' },
  ], [isRTL]);

  // دوال الـ Textarea مع Hints
  const handleStudentInput = useCallback((e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    // تحديث القالب الحالي
    setCurrentStudentMessage(value);
    
    // تحديث القالب المعدل للطالب المختار
    if (selectedStudentForPreview) {
      setEditedStudentTemplates(prev => ({
        ...prev,
        [selectedStudentForPreview._id]: value
      }));
      setManuallyEdited(prev => ({ ...prev, student: true }));
    }
    
    setCursorPosition(prev => ({ ...prev, student: cursorPos }));

    const lastAt = value.substring(0, cursorPos).lastIndexOf('@');
    if (lastAt !== -1 && lastAt === cursorPos - 1) {
      setShowHints(prev => ({ ...prev, student: true }));
      setSelectedHintIndex(prev => ({ ...prev, student: 0 }));
    } else {
      setShowHints(prev => ({ ...prev, student: false }));
    }
  }, [selectedStudentForPreview]);

  const handleGuardianInput = useCallback((e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    // تحديث القالب الحالي
    setCurrentGuardianMessage(value);
    
    // تحديث القالب المعدل للطالب المختار
    if (selectedStudentForPreview) {
      setEditedGuardianTemplates(prev => ({
        ...prev,
        [selectedStudentForPreview._id]: value
      }));
      setManuallyEdited(prev => ({ ...prev, guardian: true }));
    }
    
    setCursorPosition(prev => ({ ...prev, guardian: cursorPos }));

    const lastAt = value.substring(0, cursorPos).lastIndexOf('@');
    if (lastAt !== -1 && lastAt === cursorPos - 1) {
      setShowHints(prev => ({ ...prev, guardian: true }));
      setSelectedHintIndex(prev => ({ ...prev, guardian: 0 }));
    } else {
      setShowHints(prev => ({ ...prev, guardian: false }));
    }
  }, [selectedStudentForPreview]);

  const handleStudentKeyDown = useCallback((e) => {
    if (!showHints.student) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedHintIndex(prev => ({ ...prev, student: (prev.student + 1) % availableVariables.length }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedHintIndex(prev => ({ ...prev, student: (prev.student - 1 + availableVariables.length) % availableVariables.length }));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertStudentVariable(availableVariables[selectedHintIndex.student]);
    } else if (e.key === 'Escape') {
      setShowHints(prev => ({ ...prev, student: false }));
    }
  }, [showHints.student, selectedHintIndex.student, availableVariables]);

  const handleGuardianKeyDown = useCallback((e) => {
    if (!showHints.guardian) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedHintIndex(prev => ({ ...prev, guardian: (prev.guardian + 1) % availableVariables.length }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedHintIndex(prev => ({ ...prev, guardian: (prev.guardian - 1 + availableVariables.length) % availableVariables.length }));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertGuardianVariable(availableVariables[selectedHintIndex.guardian]);
    } else if (e.key === 'Escape') {
      setShowHints(prev => ({ ...prev, guardian: false }));
    }
  }, [showHints.guardian, selectedHintIndex.guardian, availableVariables]);

  const insertStudentVariable = useCallback((variable) => {
    const textarea = studentTextareaRef.current;
    if (!textarea) return;

    const currentValue = currentStudentMessage;
    const cursorPos = cursorPosition.student;
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

    setCurrentStudentMessage(newValue);
    
    if (selectedStudentForPreview) {
      setEditedStudentTemplates(prev => ({
        ...prev,
        [selectedStudentForPreview._id]: newValue
      }));
      setManuallyEdited(prev => ({ ...prev, student: true }));
    }
    
    setShowHints(prev => ({ ...prev, student: false }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [currentStudentMessage, cursorPosition.student, selectedStudentForPreview]);

  const insertGuardianVariable = useCallback((variable) => {
    const textarea = guardianTextareaRef.current;
    if (!textarea) return;

    const currentValue = currentGuardianMessage;
    const cursorPos = cursorPosition.guardian;
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

    setCurrentGuardianMessage(newValue);
    
    if (selectedStudentForPreview) {
      setEditedGuardianTemplates(prev => ({
        ...prev,
        [selectedStudentForPreview._id]: newValue
      }));
      setManuallyEdited(prev => ({ ...prev, guardian: true }));
    }
    
    setShowHints(prev => ({ ...prev, guardian: false }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [currentGuardianMessage, cursorPosition.guardian, selectedStudentForPreview]);

  // عرض التحيات المتوقعة
  const salutationPreview = selectedStudentForPreview
    ? (() => {
        const vars = buildVariables(selectedStudentForPreview);
        return { student: vars.studentSalutation, guardian: vars.guardianSalutation };
      })()
    : { student: '', guardian: '' };

  // تغيير الطالب المختار
  const handleStudentPreviewChange = useCallback((studentId) => {
    const student = groupStudents.find(s => s._id === studentId);
    if (!student) return;
    
    setSelectedStudentForPreview(student);
    
    // ✅ استخدام القالب المعدل يدوياً إذا موجود، وإلا استخدم القالب الافتراضي
    const studentTemplate = editedStudentTemplates[studentId] || studentTemplates[studentId] || '';
    const guardianTemplate = editedGuardianTemplates[studentId] || guardianTemplates[studentId] || '';
    
    setCurrentStudentMessage(studentTemplate);
    setCurrentGuardianMessage(guardianTemplate);
    
    // تحديث حالة manual edit
    setManuallyEdited({
      student: !!editedStudentTemplates[studentId],
      guardian: !!editedGuardianTemplates[studentId]
    });
    
  }, [groupStudents, studentTemplates, guardianTemplates, editedStudentTemplates, editedGuardianTemplates]);

  // إعادة تعيين القوالب الافتراضية
  const resetToDefault = useCallback(async () => {
    if (!selectedStudentForPreview) return;

    setLoadingTemplates(true);
    try {
      const eventType = reminderType === '24hours' ? 'reminder_24h' : 'reminder_1h';
      const res = await fetch(`/api/sessions/${session.id}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          studentId: selectedStudentForPreview._id,
          extraData: { meetingLink: session.meetingLink }
        })
      });
      const json = await res.json();

      if (json.success) {
        const studentTemplate = json.data.student?.rawContent || json.data.student?.content || '';
        const guardianTemplate = json.data.guardian?.rawContent || json.data.guardian?.content || '';

        // تحديث القوالب الافتراضية
        setStudentTemplates(prev => ({
          ...prev,
          [selectedStudentForPreview._id]: studentTemplate
        }));
        setGuardianTemplates(prev => ({
          ...prev,
          [selectedStudentForPreview._id]: guardianTemplate
        }));

        // إزالة أي تعديلات يدوية
        setEditedStudentTemplates(prev => {
          const newState = { ...prev };
          delete newState[selectedStudentForPreview._id];
          return newState;
        });
        setEditedGuardianTemplates(prev => {
          const newState = { ...prev };
          delete newState[selectedStudentForPreview._id];
          return newState;
        });

        // عرض القوالب الافتراضية
        setCurrentStudentMessage(studentTemplate);
        setCurrentGuardianMessage(guardianTemplate);
        setManuallyEdited({ student: false, guardian: false });
        
        toast.success(isRTL ? 'تم استعادة القوالب الافتراضية' : 'Default templates restored');
      }
    } catch (error) {
      console.error('Error resetting templates:', error);
      toast.error(isRTL ? 'فشل استعادة القوالب' : 'Failed to reset templates');
    } finally {
      setLoadingTemplates(false);
    }
  }, [selectedStudentForPreview, reminderType, session.id, session.meetingLink, isRTL]);

  // ✅ FIX: إرسال التذكير - نرسل القوالب المناسبة لكل طالب
  const handleSend = useCallback(async () => {
    if (!currentStudentMessage?.trim() || !currentGuardianMessage?.trim()) {
      toast.error(isRTL ? 'الرجاء كتابة الرسالتين' : 'Please write both messages');
      return;
    }

    setSending(true);
    const loadingToast = toast.loading(isRTL ? 'جاري الإرسال...' : 'Sending...');

    try {
      // ✅ تجهيز القوالب لكل طالب
      const studentMessages = {};
      const guardianMessages = {};

      groupStudents.forEach(student => {
        const studentId = student._id;
        
        // استخدام القالب المعدل يدوياً إذا موجود، وإلا استخدم القالب الافتراضي
        studentMessages[studentId] = editedStudentTemplates[studentId] || studentTemplates[studentId] || '';
        guardianMessages[studentId] = editedGuardianTemplates[studentId] || guardianTemplates[studentId] || '';
      });

      const res = await fetch(`/api/sessions/${session.id}/send-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminderType,
          metadata: {
            studentMessages,    // ✅ القوالب الخام لكل طالب
            guardianMessages    // ✅ القوالب الخام لكل طالب
          }
        })
      });

      const json = await res.json();

      if (json.success) {
        toast.success(
          isRTL ? `تم إرسال ${json.data.successCount} تذكير` : `${json.data.successCount} reminders sent`,
          { id: loadingToast }
        );
        onClose();
        onRefresh();
      } else {
        toast.error(json.error || (isRTL ? 'فشل الإرسال' : 'Send failed'), { id: loadingToast });
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error(isRTL ? 'حدث خطأ' : 'An error occurred', { id: loadingToast });
    } finally {
      setSending(false);
    }
  }, [currentStudentMessage, currentGuardianMessage, groupStudents, studentTemplates, guardianTemplates, editedStudentTemplates, editedGuardianTemplates, reminderType, session.id, isRTL, onClose, onRefresh]);

  const reminderTypeText = reminderType === '24hours'
    ? (isRTL ? '٢٤ ساعة' : '24 hours')
    : (isRTL ? 'ساعة' : '1 hour');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>

        {/* Header */}
        <div className="p-6 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-MidnightNavyText dark:text-white">
              {isRTL ? `إرسال تذكير ${reminderTypeText}` : `Send ${reminderTypeText} Reminder`}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {session?.title} - {session?.scheduledDate ? new Date(session.scheduledDate).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
              }) : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-5">

            {/* Student Selector */}
            {groupStudents.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block">
                  {isRTL ? 'اختر طالباً لمعاينة الرسالة:' : 'Select student to preview:'}
                </label>
                <select
                  value={selectedStudentForPreview?._id || ''}
                  onChange={(e) => handleStudentPreviewChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-700 rounded-lg dark:bg-gray-800 dark:text-white"
                  disabled={loadingTemplates}
                >
                  {groupStudents.map(student => {
                    const lang = student.communicationPreferences?.preferredLanguage || 'ar';
                    const gender = (student.personalInfo?.gender || 'male').toLowerCase().trim();
                    const rel = (student.guardianInfo?.relationship || 'father').toLowerCase().trim();
                    const isEdited = editedStudentTemplates[student._id] || editedGuardianTemplates[student._id];
                    
                    return (
                      <option key={student._id} value={student._id}>
                        {student.personalInfo?.fullName}
                        {' · '}
                        <span className="inline-flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {lang === 'ar' ? '🇸🇦 عربي' : '🇬🇧 English'}
                        </span>
                        {' · '}{gender === 'female' ? '👧' : '👦'}
                        {' · '}{rel === 'mother' ? '👩 أم' : rel === 'father' ? '👨 أب' : '👤'}
                        {isEdited && ' ✏️'}
                      </option>
                    );
                  })}
                </select>

                {/* التحيات المتوقعة */}
                {selectedStudentForPreview && (
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 dark:text-blue-400 font-medium w-28 shrink-0">
                        👶 {isRTL ? 'تحية الطالب:' : 'Student:'}
                      </span>
                      <span className="text-gray-800 dark:text-gray-200 font-semibold">
                        {salutationPreview.student}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-600 dark:text-purple-400 font-medium w-28 shrink-0">
                        👪 {isRTL ? 'تحية ولي الأمر:' : 'Guardian:'}
                      </span>
                      <span className="text-gray-800 dark:text-gray-200 font-semibold">
                        {salutationPreview.guardian}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Globe className="w-3 h-3" />
                      <span>
                        {isRTL ? 'لغة الطالب: ' : 'Student language: '}
                        {selectedStudentForPreview.communicationPreferences?.preferredLanguage === 'ar' ? '🇸🇦 العربية' : '🇬🇧 English'}
                      </span>
                    </div>
                    {(manuallyEdited.student || manuallyEdited.guardian) && (
                      <p className="text-orange-500 dark:text-orange-400 flex items-center gap-1 mt-1">
                        ✏️ {isRTL ? 'هذا الطالب لديه رسائل معدلة يدوياً' : 'This student has manually edited messages'}
                      </p>
                    )}
                    {loadingTemplates && (
                      <p className="text-blue-500 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        {isRTL ? 'جاري تحميل القوالب...' : 'Loading templates...'}
                      </p>
                    )}
                  </div>
                )}

                {/* Reset Button */}
                <button
                  onClick={resetToDefault}
                  disabled={loadingTemplates}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingTemplates ? 'animate-spin' : ''}`} />
                  {isRTL ? 'استعادة القوالب الافتراضية' : 'Reset to defaults'}
                </button>
              </div>
            )}

            {/* Student Message */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                  {isRTL ? 'رسالة تذكير للطالب' : 'Reminder for Student'}
                </h4>
                {loadingTemplates && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500" />}
              </div>

              <div className="relative">
                <textarea
                  ref={studentTextareaRef}
                  value={currentStudentMessage}
                  onChange={handleStudentInput}
                  onKeyDown={handleStudentKeyDown}
                  onSelect={(e) => setCursorPosition(prev => ({ ...prev, student: e.target.selectionStart }))}
                  placeholder={isRTL ? 'اكتب رسالة التذكير للطالب...' : 'Write student reminder...'}
                  className="w-full px-3 py-2.5 border-2 border-blue-200 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white resize-none h-32 font-mono text-sm"
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
                <span className="absolute bottom-2 left-2 text-xs text-gray-400">
                  @ {isRTL ? 'للمتغيرات' : 'for variables'}
                </span>

                {showHints.student && (
                  <div
                    ref={el => hintsRef.current.student = el}
                    className="absolute z-50 w-full mt-1 bg-white dark:bg-darkmode border-2 border-blue-300 dark:border-blue-700 rounded-lg shadow-xl max-h-56 overflow-y-auto"
                  >
                    <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border-b dark:border-blue-800">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {isRTL ? 'المتغيرات المتاحة' : 'Available Variables'}
                      </p>
                    </div>
                    {availableVariables.map((v, i) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => insertStudentVariable(v)}
                        className={`w-full px-3 py-2 text-right hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 ${
                          i === selectedHintIndex.student ? 'bg-blue-100 dark:bg-blue-900/40' : ''
                        }`}
                      >
                        <span>{v.icon}</span>
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-sm font-mono text-blue-600 dark:text-blue-400">{v.key}</span>
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

              {/* Preview - Student */}
              {previewStudentMessage && selectedStudentForPreview && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700 overflow-hidden">
                  <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-2 border-b flex items-center justify-between">
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      📋 {isRTL ? 'معاينة للطالب' : 'Student Preview'}
                    </span>
                    <span className="text-xs text-blue-500 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {selectedStudentForPreview.communicationPreferences?.preferredLanguage === 'ar' ? '🇸🇦 عربي' : '🇬🇧 English'}
                      {' · '}
                      {(selectedStudentForPreview.personalInfo?.gender || '').toLowerCase() === 'female' ? '👧' : '👦'}
                    </span>
                  </div>
                  <div className="p-3 text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto" dir={selectedStudentForPreview.communicationPreferences?.preferredLanguage === 'ar' ? 'rtl' : 'ltr'}>
                    {previewStudentMessage}
                  </div>
                </div>
              )}
            </div>

            {/* Guardian Message */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="font-semibold text-purple-900 dark:text-purple-100 text-sm">
                  {isRTL ? 'رسالة تذكير لولي الأمر' : 'Reminder for Guardian'}
                </h4>
              </div>

              <div className="relative">
                <textarea
                  ref={guardianTextareaRef}
                  value={currentGuardianMessage}
                  onChange={handleGuardianInput}
                  onKeyDown={handleGuardianKeyDown}
                  onSelect={(e) => setCursorPosition(prev => ({ ...prev, guardian: e.target.selectionStart }))}
                  placeholder={isRTL ? 'اكتب رسالة التذكير لولي الأمر...' : 'Write guardian reminder...'}
                  className="w-full px-3 py-2.5 border-2 border-purple-200 dark:border-purple-700 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white resize-none h-32 font-mono text-sm"
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
                <span className="absolute bottom-2 left-2 text-xs text-gray-400">
                  @ {isRTL ? 'للمتغيرات' : 'for variables'}
                </span>

                {showHints.guardian && (
                  <div
                    ref={el => hintsRef.current.guardian = el}
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
                        onClick={() => insertGuardianVariable(v)}
                        className={`w-full px-3 py-2 text-right hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-2 ${
                          i === selectedHintIndex.guardian ? 'bg-purple-100 dark:bg-purple-900/40' : ''
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

              {/* Preview - Guardian */}
              {previewGuardianMessage && selectedStudentForPreview && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700 overflow-hidden">
                  <div className="bg-purple-50 dark:bg-purple-900/30 px-3 py-2 border-b flex items-center justify-between">
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                      📋 {isRTL ? 'معاينة لولي الأمر' : 'Guardian Preview'}
                    </span>
                    <span className="text-xs text-purple-500 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {selectedStudentForPreview.communicationPreferences?.preferredLanguage === 'ar' ? '🇸🇦 عربي' : '🇬🇧 English'}
                      {' · '}
                      {(() => {
                        const rel = (selectedStudentForPreview.guardianInfo?.relationship || '').toLowerCase();
                        return rel === 'mother' ? '👩 أم' : rel === 'father' ? '👨 أب' : '👤';
                      })()}
                    </span>
                  </div>
                  <div className="p-3 text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto" dir={selectedStudentForPreview.communicationPreferences?.preferredLanguage === 'ar' ? 'rtl' : 'ltr'}>
                    {previewGuardianMessage}
                  </div>
                </div>
              )}

              {/* Save Template Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                <button
                  onClick={() => saveTemplateToDatabase('student', currentStudentMessage)}
                  disabled={!currentStudentMessage || savingTemplate.student || loadingTemplates}
                  className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  {savingTemplate.student ? (
                    <><RefreshCw className="w-3 h-3 animate-spin" /> {isRTL ? 'جاري الحفظ...' : 'Saving...'}</>
                  ) : (
                    isRTL ? 'حفظ قالب الطالب' : 'Save Student Template'
                  )}
                </button>
                <button
                  onClick={() => saveTemplateToDatabase('guardian', currentGuardianMessage)}
                  disabled={!currentGuardianMessage || savingTemplate.guardian || loadingTemplates}
                  className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  {savingTemplate.guardian ? (
                    <><RefreshCw className="w-3 h-3 animate-spin" /> {isRTL ? 'جاري الحفظ...' : 'Saving...'}</>
                  ) : (
                    isRTL ? 'حفظ قالب ولي الأمر' : 'Save Guardian Template'
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-PowderBlueBorder dark:border-dark_border flex items-center justify-end gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-500">
              <Globe className="w-3 h-3 inline mr-1" />
              {isRTL 
                ? 'سيتم إرسال القالب المناسب لكل طالب حسب لغته' 
                : 'Each student will receive the message in their preferred language'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-gray-50 dark:hover:bg-dark_input"
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handleSend}
            disabled={sending || loadingTemplates || !currentStudentMessage?.trim() || !currentGuardianMessage?.trim()}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                {isRTL ? 'جاري الإرسال...' : 'Sending...'}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {isRTL ? `إرسال لـ ${groupStudents.length} طالب` : `Send to ${groupStudents.length} students`}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}