// /src/components/sessions/EditSessionModal.jsx - مع زر حفظ القالب
"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import {
  X,
  Save,
  RefreshCw,
  Link2,
  VideoIcon,
  FileText,
  MessageCircle,
  User,
  Users,
  Zap,
  Info,
  Calendar,
  Clock
} from "lucide-react";

export default function EditSessionModal({ session, groupStudents, onClose, onRefresh, isRTL, t }) {
  const [formData, setFormData] = useState({
    meetingLink: session?.meetingLink || '',
    recordingLink: session?.recordingLink || '',
    instructorNotes: session?.instructorNotes || '',
    status: session?.status || 'scheduled',
    studentMessage: '',
    guardianMessage: '',
    newDate: '',
    newTime: '',
  });

  const [previewStudentMessage, setPreviewStudentMessage] = useState('');
  const [previewGuardianMessage, setPreviewGuardianMessage] = useState('');
  const [showHints, setShowHints] = useState({ student: false, guardian: false });
  const [cursorPosition, setCursorPosition] = useState({ student: 0, guardian: 0 });
  const [selectedHintIndex, setSelectedHintIndex] = useState({ student: 0, guardian: 0 });
  const [selectedStudentForPreview, setSelectedStudentForPreview] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [manuallyEdited, setManuallyEdited] = useState({ student: false, guardian: false });
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState({ student: false, guardian: false });

  const studentTextareaRef = useRef(null);
  const guardianTextareaRef = useRef(null);
  const hintsRef = useRef({ student: null, guardian: null });

  const showReasonField = formData.status === 'cancelled' || formData.status === 'postponed';
  const isPostponed = formData.status === 'postponed';

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

  // جلب القوالب من الباك إند
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!showReasonField || !selectedStudentForPreview) return;
      if (manuallyEdited.student && manuallyEdited.guardian) return;

      setLoadingTemplates(true);
      try {
        const eventType = formData.status === 'cancelled' ? 'session_cancelled' : 'session_postponed';
        
        const res = await fetch(`/api/sessions/${session.id}/templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType,
            studentId: selectedStudentForPreview._id,
            extraData: {
              newDate: formData.newDate,
              newTime: formData.newTime,
              meetingLink: formData.meetingLink
            }
          })
        });

        const json = await res.json();

        if (json.success) {
          const { student, guardian } = json.data;
          
          if (!manuallyEdited.student && student) {
            setFormData(prev => ({ ...prev, studentMessage: student.content }));
          }
          if (!manuallyEdited.guardian && guardian) {
            setFormData(prev => ({ ...prev, guardianMessage: guardian.content }));
          }
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
        toast.error(isRTL ? 'فشل تحميل القوالب' : 'Failed to load templates');
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [formData.status, selectedStudentForPreview?._id, formData.newDate, formData.newTime]);

  // ✅ حفظ القالب في قاعدة البيانات
  const saveTemplateToDatabase = useCallback(async (type, content) => {
    if (!selectedStudentForPreview || !content?.trim()) return;
    
    setSavingTemplate(prev => ({ ...prev, [type]: true }));
    
    try {
      let templateType = '';
      if (formData.status === 'cancelled') {
        templateType = type === 'student' ? 'session_cancelled_student' : 'session_cancelled_guardian';
      } else if (formData.status === 'postponed') {
        templateType = type === 'student' ? 'session_postponed_student' : 'session_postponed_guardian';
      } else {
        return;
      }
      
      const recipientType = type === 'student' ? 'student' : 'guardian';
      const studentLang = selectedStudentForPreview.communicationPreferences?.preferredLanguage || 'ar';
      
      const templateName = formData.status === 'cancelled' 
        ? (type === 'student' ? 'Session Cancelled - Student' : 'Session Cancelled - Guardian')
        : (type === 'student' ? 'Session Postponed - Student' : 'Session Postponed - Guardian');
      
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
          description: `${formData.status === 'cancelled' ? 'Session cancelled' : 'Session postponed'} notification for ${recipientType}`,
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
          ]
        };
        
        if (studentLang === 'ar') {
          newTemplate.contentAr = content;
          newTemplate.contentEn = content;
        } else {
          newTemplate.contentEn = content;
          newTemplate.contentAr = content;
        }
        
        if (formData.status === 'postponed') {
          newTemplate.variables.push(
            { key: 'newDate', label: 'New Date', description: 'التاريخ الجديد', example: 'الثلاثاء ٢ يناير ٢٠٢٥' },
            { key: 'newTime', label: 'New Time', description: 'الوقت الجديد', example: '٦:٠٠ م - ٨:٠٠ م' }
          );
        }
        
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
  }, [formData.status, selectedStudentForPreview, isRTL]);

  // ✅ بناء المتغيرات مع تطبيع gender و relationship
  const buildVariables = useCallback((student) => {
    if (!student) return {};
    
    const lang = student.communicationPreferences?.preferredLanguage || 'ar';

    // ✅ تطبيع القيم دائماً إلى lowercase
    const gender = (student.personalInfo?.gender || 'male').toLowerCase().trim();
    const relationship = (student.guardianInfo?.relationship || 'father').toLowerCase().trim();

    // ✅ اسم الطالب حسب اللغة: nickname أولاً ثم أول كلمة
    const studentFirstName = lang === 'ar'
      ? (student.personalInfo?.nickname?.ar?.trim() || student.personalInfo?.fullName?.split(' ')[0] || 'الطالب')
      : (student.personalInfo?.nickname?.en?.trim() || student.personalInfo?.fullName?.split(' ')[0] || 'Student');

    // ✅ اسم ولي الأمر حسب اللغة: nickname أولاً ثم أول كلمة
    const guardianFirstName = lang === 'ar'
      ? (student.guardianInfo?.nickname?.ar?.trim() || student.guardianInfo?.name?.split(' ')[0] || 'ولي الأمر')
      : (student.guardianInfo?.nickname?.en?.trim() || student.guardianInfo?.name?.split(' ')[0] || 'Guardian');

    // ✅ تحية الطالب حسب الجنس واللغة
    let studentSalutation = '';
    if (lang === 'ar') {
      studentSalutation = gender === 'female'
        ? `عزيزتي ${studentFirstName}`
        : `عزيزي ${studentFirstName}`;
    } else {
      studentSalutation = `Dear ${studentFirstName}`;
    }

    // ✅ تحية ولي الأمر حسب العلاقة واللغة
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

    // ✅ childTitle حسب الجنس واللغة
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
      salutation: guardianSalutation, // للتوافق مع القوالب القديمة
      studentName: studentFirstName,
      studentFullName: student.personalInfo?.fullName || '',
      guardianName: guardianFirstName,
      guardianFullName: student.guardianInfo?.name || '',
      childTitle,
      sessionName: session?.title || '',
      date: sessionDate,
      time: `${session?.startTime || ''} - ${session?.endTime || ''}`,
      meetingLink: formData.meetingLink || session?.meetingLink || '',
      newDate: formData.newDate
        ? new Date(formData.newDate).toLocaleDateString(
            lang === 'ar' ? 'ar-EG' : 'en-US',
            { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
          )
        : (lang === 'ar' ? 'التاريخ الجديد' : 'New Date'),
      newTime: formData.newTime || '',
      groupCode: session?.groupId?.code || '',
      groupName: session?.groupId?.name || '',
      enrollmentNumber: student.enrollmentNumber || '',
    };
  }, [session, formData.meetingLink, formData.newDate, formData.newTime]);

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
    
    setPreviewStudentMessage(generatePreview(formData.studentMessage, selectedStudentForPreview));
    setPreviewGuardianMessage(generatePreview(formData.guardianMessage, selectedStudentForPreview));
  }, [formData.studentMessage, formData.guardianMessage, selectedStudentForPreview, generatePreview]);

  // المتغيرات المتاحة للـ Hints
  const availableVariables = useMemo(() => {
    const vars = [
      { key: '{guardianSalutation}', label: isRTL ? 'تحية ولي الأمر' : 'Guardian Salutation', icon: '👤', description: isRTL ? 'حسب العلاقة (أب/أم)' : 'Based on relationship' },
      { key: '{studentSalutation}', label: isRTL ? 'تحية الطالب' : 'Student Salutation', icon: '👶', description: isRTL ? 'حسب الجنس (ذكر/أنثى)' : 'Based on gender' },
      { key: '{studentName}', label: isRTL ? 'اسم الطالب' : 'Student Name', icon: '👶', description: '' },
      { key: '{guardianName}', label: isRTL ? 'اسم ولي الأمر' : 'Guardian Name', icon: '👤', description: '' },
      { key: '{childTitle}', label: isRTL ? 'ابنك/ابنتك' : 'Son/Daughter', icon: '👪', description: '' },
      { key: '{sessionName}', label: isRTL ? 'اسم الجلسة' : 'Session Name', icon: '📘', description: '' },
      { key: '{date}', label: isRTL ? 'التاريخ' : 'Date', icon: '📅', description: '' },
      { key: '{time}', label: isRTL ? 'الوقت' : 'Time', icon: '⏰', description: '' },
      { key: '{meetingLink}', label: isRTL ? 'رابط الاجتماع' : 'Meeting Link', icon: '🔗', description: '' },
      { key: '{enrollmentNumber}', label: isRTL ? 'الرقم التعريفي' : 'Enrollment No.', icon: '🔢', description: '' },
    ];
    if (isPostponed) {
      vars.push(
        { key: '{newDate}', label: isRTL ? 'التاريخ الجديد' : 'New Date', icon: '📅', description: '' },
        { key: '{newTime}', label: isRTL ? 'الوقت الجديد' : 'New Time', icon: '⏰', description: '' }
      );
    }
    return vars;
  }, [isRTL, isPostponed]);

  // دوال الـ Textarea مع Hints
  const handleStudentInput = useCallback((e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setFormData(prev => ({ ...prev, studentMessage: value }));
    setManuallyEdited(prev => ({ ...prev, student: true }));
    setCursorPosition(prev => ({ ...prev, student: cursorPos }));
    
    const lastAt = value.substring(0, cursorPos).lastIndexOf('@');
    if (lastAt !== -1 && lastAt === cursorPos - 1) {
      setShowHints(prev => ({ ...prev, student: true }));
      setSelectedHintIndex(prev => ({ ...prev, student: 0 }));
    } else {
      setShowHints(prev => ({ ...prev, student: false }));
    }
  }, []);

  const handleGuardianInput = useCallback((e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setFormData(prev => ({ ...prev, guardianMessage: value }));
    setManuallyEdited(prev => ({ ...prev, guardian: true }));
    setCursorPosition(prev => ({ ...prev, guardian: cursorPos }));
    
    const lastAt = value.substring(0, cursorPos).lastIndexOf('@');
    if (lastAt !== -1 && lastAt === cursorPos - 1) {
      setShowHints(prev => ({ ...prev, guardian: true }));
      setSelectedHintIndex(prev => ({ ...prev, guardian: 0 }));
    } else {
      setShowHints(prev => ({ ...prev, guardian: false }));
    }
  }, []);

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
    
    const currentValue = formData.studentMessage || '';
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
    
    setFormData(prev => ({ ...prev, studentMessage: newValue }));
    setManuallyEdited(prev => ({ ...prev, student: true }));
    setShowHints(prev => ({ ...prev, student: false }));
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [formData.studentMessage, cursorPosition.student]);

  const insertGuardianVariable = useCallback((variable) => {
    const textarea = guardianTextareaRef.current;
    if (!textarea) return;
    
    const currentValue = formData.guardianMessage || '';
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
    
    setFormData(prev => ({ ...prev, guardianMessage: newValue }));
    setManuallyEdited(prev => ({ ...prev, guardian: true }));
    setShowHints(prev => ({ ...prev, guardian: false }));
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [formData.guardianMessage, cursorPosition.guardian]);

  // ✅ عرض التحيات المتوقعة مع تطبيع البيانات
  const salutationPreview = selectedStudentForPreview
    ? (() => {
        const vars = buildVariables(selectedStudentForPreview);
        return {
          student: vars.studentSalutation,
          guardian: vars.guardianSalutation,
        };
      })()
    : { student: '', guardian: '' };

  // تغيير الطالب المختار
  const handleStudentPreviewChange = useCallback(async (studentId) => {
    const student = groupStudents.find(s => s._id === studentId);
    if (!student) return;
    setSelectedStudentForPreview(student);
    
    if (!manuallyEdited.student || !manuallyEdited.guardian) {
      setLoadingTemplates(true);
      try {
        const eventType = formData.status === 'cancelled' ? 'session_cancelled' : 'session_postponed';
        const res = await fetch(`/api/sessions/${session.id}/templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType, studentId: student._id })
        });
        const json = await res.json();
        
        if (json.success) {
          const { student: studentTemplate, guardian: guardianTemplate } = json.data;
          
          if (!manuallyEdited.student && studentTemplate) {
            setFormData(prev => ({ ...prev, studentMessage: studentTemplate.content }));
          }
          if (!manuallyEdited.guardian && guardianTemplate) {
            setFormData(prev => ({ ...prev, guardianMessage: guardianTemplate.content }));
          }
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoadingTemplates(false);
      }
    }
  }, [groupStudents, manuallyEdited, formData.status, session.id]);

  // إعادة تعيين القوالب الافتراضية
  const resetToDefault = useCallback(async () => {
    if (!selectedStudentForPreview) return;
    
    setLoadingTemplates(true);
    try {
      const eventType = formData.status === 'cancelled' ? 'session_cancelled' : 'session_postponed';
      const res = await fetch(`/api/sessions/${session.id}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventType, 
          studentId: selectedStudentForPreview._id,
          extraData: {
            newDate: formData.newDate,
            newTime: formData.newTime,
            meetingLink: formData.meetingLink
          }
        })
      });
      const json = await res.json();
      
      if (json.success) {
        const { student, guardian } = json.data;
        setFormData(prev => ({ 
          ...prev, 
          studentMessage: student?.content || '',
          guardianMessage: guardian?.content || ''
        }));
        setManuallyEdited({ student: false, guardian: false });
        toast.success(isRTL ? 'تم استعادة القوالب الافتراضية' : 'Default templates restored');
      }
    } catch (error) {
      console.error('Error resetting templates:', error);
      toast.error(isRTL ? 'فشل استعادة القوالب' : 'Failed to reset templates');
    } finally {
      setLoadingTemplates(false);
    }
  }, [selectedStudentForPreview, formData.status, formData.newDate, formData.newTime, formData.meetingLink, session.id, isRTL]);

  // حفظ التعديلات
  const handleSave = useCallback(async () => {
    if (showReasonField && (!formData.studentMessage?.trim() || !formData.guardianMessage?.trim())) {
      toast.error(isRTL ? 'الرجاء كتابة الرسالتين' : 'Please write both messages');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          newDate: isPostponed ? formData.newDate : null,
          newTime: isPostponed ? formData.newTime : null,
        })
      });

      const json = await res.json();

      if (json.success) {
        toast.success(isRTL ? 'تم تحديث الجلسة بنجاح' : 'Session updated successfully');
        onClose();
        onRefresh();
      } else {
        toast.error(json.error || (isRTL ? 'فشل التحديث' : 'Update failed'));
      }
    } catch (error) {
      console.error('Error saving session:', error);
      toast.error(isRTL ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setSaving(false);
    }
  }, [formData, showReasonField, isPostponed, session.id, isRTL, onClose, onRefresh]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>

        {/* Header */}
        <div className="p-6 border-b border-PowderBlueBorder dark:border-dark_border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-MidnightNavyText dark:text-white">
              {isRTL ? `تعديل الجلسة - ${session?.title}` : `Edit Session - ${session?.title}`}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {session?.scheduledDate ? new Date(session.scheduledDate).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              }) : ''} - {session?.startTime} {isRTL ? 'إلى' : 'to'} {session?.endTime}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
              {isRTL ? 'الحالة' : 'Status'}
            </label>
            <select
              value={formData.status}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, status: e.target.value }));
                setManuallyEdited({ student: false, guardian: false });
              }}
              className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
            >
              <option value="scheduled">{isRTL ? 'مجدولة' : 'Scheduled'}</option>
              <option value="completed">{isRTL ? 'مكتملة' : 'Completed'}</option>
              <option value="cancelled">{isRTL ? 'ملغاة' : 'Cancelled'}</option>
              <option value="postponed">{isRTL ? 'مؤجلة' : 'Postponed'}</option>
            </select>
          </div>

          {/* Meeting Link */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
              <Link2 className="w-4 h-4" />
              {isRTL ? 'رابط الاجتماع' : 'Meeting Link'}
            </label>
            <input
              type="url"
              value={formData.meetingLink}
              onChange={(e) => setFormData(prev => ({ ...prev, meetingLink: e.target.value }))}
              placeholder={isRTL ? 'أدخل رابط الاجتماع' : 'Enter meeting link'}
              className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
            />
          </div>

          {/* Recording Link */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
              <VideoIcon className="w-4 h-4" />
              {isRTL ? 'رابط التسجيل' : 'Recording Link'}
            </label>
            <input
              type="url"
              value={formData.recordingLink}
              onChange={(e) => setFormData(prev => ({ ...prev, recordingLink: e.target.value }))}
              placeholder={isRTL ? 'أدخل رابط التسجيل' : 'Enter recording link'}
              className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
            />
          </div>

          {/* New Date/Time for Postponed */}
          {isPostponed && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                  {isRTL ? 'التاريخ الجديد' : 'New Date'}
                </label>
                <input
                  type="date"
                  value={formData.newDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, newDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                  {isRTL ? 'الوقت الجديد' : 'New Time'}
                </label>
                <input
                  type="time"
                  value={formData.newTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, newTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Messages Area - فقط للـ cancelled/postponed */}
          {showReasonField && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-5">

              {/* Header with Reset Button */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  {isRTL ? 'رسائل الإشعار' : 'Notification Messages'}
                </h3>
                <button
                  onClick={resetToDefault}
                  disabled={loadingTemplates}
                  className="px-3 py-1 text-xs bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingTemplates ? 'animate-spin' : ''}`} />
                  {isRTL ? 'استعادة القوالب' : 'Reset Templates'}
                </button>
              </div>

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
                      // ✅ تطبيع القيم للعرض أيضاً
                      const lang = student.communicationPreferences?.preferredLanguage || 'ar';
                      const gender = (student.personalInfo?.gender || 'male').toLowerCase().trim();
                      const rel = (student.guardianInfo?.relationship || 'father').toLowerCase().trim();
                      return (
                        <option key={student._id} value={student._id}>
                          {student.personalInfo?.fullName}
                          {' · '}{lang === 'ar' ? '🇸🇦' : '🇬🇧'}
                          {' · '}{gender === 'female' ? '👧' : '👦'}
                          {' · '}{rel === 'mother' ? '👩 أم' : rel === 'father' ? '👨 أب' : '👤'}
                        </option>
                      );
                    })}
                  </select>

                  {/* عرض التحيات المتوقعة */}
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
                      {(manuallyEdited.student || manuallyEdited.guardian) && (
                        <p className="text-orange-500 dark:text-orange-400 flex items-center gap-1 mt-1">
                          ✏️ {isRTL ? 'الرسائل معدلة يدوياً' : 'Messages manually edited'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Student Message */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                    {isRTL ? 'رسالة للطالب' : 'Message for Student'}
                  </h4>
                  {loadingTemplates && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500" />}
                </div>

                <div className="relative">
                  <textarea
                    ref={studentTextareaRef}
                    value={formData.studentMessage}
                    onChange={handleStudentInput}
                    onKeyDown={handleStudentKeyDown}
                    onSelect={(e) => setCursorPosition(prev => ({ ...prev, student: e.target.selectionStart }))}
                    placeholder={isRTL ? 'اكتب رسالة الطالب...' : 'Write student message...'}
                    className="w-full px-3 py-2.5 border-2 border-blue-200 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white resize-none h-32 font-mono text-sm"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                  <span className="absolute bottom-2 left-2 text-xs text-gray-400">
                    @ {isRTL ? 'للمتغيرات' : 'for variables'}
                  </span>

                  {/* Hints Dropdown - Student */}
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
                      <span className="text-xs text-blue-500">
                        {selectedStudentForPreview.communicationPreferences?.preferredLanguage === 'ar' ? '🇸🇦' : '🇬🇧'}
                        {' · '}
                        {(selectedStudentForPreview.personalInfo?.gender || '').toLowerCase() === 'female' ? '👧' : '👦'}
                      </span>
                    </div>
                    <div className="p-3 text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
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
                    {isRTL ? 'رسالة لولي الأمر' : 'Message for Guardian'}
                  </h4>
                </div>

                <div className="relative">
                  <textarea
                    ref={guardianTextareaRef}
                    value={formData.guardianMessage}
                    onChange={handleGuardianInput}
                    onKeyDown={handleGuardianKeyDown}
                    onSelect={(e) => setCursorPosition(prev => ({ ...prev, guardian: e.target.selectionStart }))}
                    placeholder={isRTL ? 'اكتب رسالة ولي الأمر...' : 'Write guardian message...'}
                    className="w-full px-3 py-2.5 border-2 border-purple-200 dark:border-purple-700 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white resize-none h-32 font-mono text-sm"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                  <span className="absolute bottom-2 left-2 text-xs text-gray-400">
                    @ {isRTL ? 'للمتغيرات' : 'for variables'}
                  </span>

                  {/* Hints Dropdown - Guardian */}
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
                      <span className="text-xs text-purple-500">
                        {(() => {
                          const rel = (selectedStudentForPreview.guardianInfo?.relationship || '').toLowerCase();
                          return rel === 'mother' ? '👩 أم' : rel === 'father' ? '👨 أب' : '👤';
                        })()}
                      </span>
                    </div>
                    <div className="p-3 text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                      {previewGuardianMessage}
                    </div>
                  </div>
                )}
              </div>

              {/* Save Template Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                <button
                  onClick={() => saveTemplateToDatabase('student', formData.studentMessage)}
                  disabled={!formData.studentMessage || savingTemplate.student || loadingTemplates}
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
                  onClick={() => saveTemplateToDatabase('guardian', formData.guardianMessage)}
                  disabled={!formData.guardianMessage || savingTemplate.guardian || loadingTemplates}
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
          )}

          {/* Instructor Notes */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
              <FileText className="w-4 h-4" />
              {isRTL ? 'ملاحظات المدرب' : 'Instructor Notes'}
            </label>
            <textarea
              value={formData.instructorNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, instructorNotes: e.target.value }))}
              placeholder={isRTL ? 'أضف ملاحظات للمدرب...' : 'Add instructor notes...'}
              rows={3}
              className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white resize-none"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-PowderBlueBorder dark:border-dark_border flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-gray-50 dark:hover:bg-dark_input"
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loadingTemplates || (showReasonField && (!formData.studentMessage?.trim() || !formData.guardianMessage?.trim()))}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                {isRTL ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}