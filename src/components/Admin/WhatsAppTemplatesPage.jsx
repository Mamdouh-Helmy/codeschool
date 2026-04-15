"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageCircle, Eye, Save, RefreshCw, Send, User, Users, Globe,
  Loader2, Zap, CheckCircle, XCircle, AlertCircle, Sparkles,
  Edit, Clock, Bell, Calendar, Award, FileText,
  UserPlus, UserCog, Search, Star, RotateCcw, Video,
  Settings, ChevronDown, ChevronUp, Check, X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";

// ─────────────────────────────────────────────────────────────
// CONSTANTS (unchanged from original)
// ─────────────────────────────────────────────────────────────
const SINGLE_CONTENT_TEMPLATES = ["student_welcome", "guardian_notification"];

const TEMPLATE_TYPES = [
  { id: "student_welcome",               label: "ترحيب الطالب",                icon: User,         color: "violet",  emoji: "🎓", category: "basic",      type: "student_only",           api: "whatsapp" },
  { id: "guardian_notification",          label: "إشعار ولي الأمر",             icon: Users,        color: "blue",    emoji: "👨‍👩‍👧", category: "basic",      type: "guardian_only",          api: "whatsapp" },
  { id: "language_confirmation",          label: "تأكيد اللغة",                 icon: Globe,        color: "emerald", emoji: "🌍", category: "basic",      type: "student_only",           api: "whatsapp" },
  { id: "guardian_language_notification", label: "إشعار اللغة لولي الأمر",      icon: Bell,         color: "orange",  emoji: "📢", category: "basic",      type: "guardian_only",          api: "whatsapp" },
  { id: "group_student_welcome_student",  label: "ترحيب الطالب بالمجموعة",      icon: UserPlus,     color: "indigo",  emoji: "➕", category: "group",      type: "student_with_group",     api: "group",   isNew: true },
  { id: "group_student_welcome_guardian", label: "إشعار ولي الأمر بالمجموعة",   icon: Users,        color: "indigo",  emoji: "👨‍👩‍👧", category: "group",      type: "guardian_with_group",    api: "group",   isNew: true },
  { id: "instructor_group_activation",    label: "إشعار تفعيل مجموعة للمدرب",   icon: UserCog,      color: "amber",   emoji: "👨‍🏫", category: "instructor", type: "instructor_only",        api: "instructor", isNew: true },
  { id: "reminder_24h_student",           label: "تذكير الطالب 24 ساعة",        icon: Clock,        color: "sky",     emoji: "⏰", category: "reminder",   type: "student_with_session",   api: "message" },
  { id: "reminder_24h_guardian",          label: "تذكير ولي الأمر 24 ساعة",     icon: Clock,        color: "sky",     emoji: "⏰", category: "reminder",   type: "guardian_with_session",  api: "message" },
  { id: "reminder_1h_student",            label: "تذكير الطالب قبل ساعة",       icon: Clock,        color: "amber",   emoji: "⏳", category: "reminder",   type: "student_with_session",   api: "message" },
  { id: "reminder_1h_guardian",           label: "تذكير ولي الأمر قبل ساعة",    icon: Clock,        color: "amber",   emoji: "⏳", category: "reminder",   type: "guardian_with_session",  api: "message" },
  { id: "session_cancelled_student",      label: "إلغاء حصة - الطالب",          icon: XCircle,      color: "rose",    emoji: "❌", category: "session",    type: "student_with_session",   api: "message" },
  { id: "session_cancelled_guardian",     label: "إلغاء حصة - ولي الأمر",       icon: XCircle,      color: "rose",    emoji: "❌", category: "session",    type: "guardian_with_session",  api: "message" },
  { id: "session_postponed_student",      label: "تأجيل حصة - الطالب",          icon: Calendar,     color: "orange",  emoji: "🔄", category: "session",    type: "student_with_session",   api: "message" },
  { id: "session_postponed_guardian",     label: "تأجيل حصة - ولي الأمر",       icon: Calendar,     color: "orange",  emoji: "🔄", category: "session",    type: "guardian_with_session",  api: "message" },
  { id: "absence_notification",           label: "إشعار غياب - ولي الأمر",      icon: AlertCircle,  color: "rose",    emoji: "📋", category: "attendance", type: "guardian_with_session",  api: "message" },
  { id: "late_notification",              label: "إشعار تأخير - ولي الأمر",     icon: Clock,        color: "orange",  emoji: "⏰", category: "attendance", type: "guardian_with_session",  api: "message" },
  { id: "excused_notification",           label: "إشعار غياب بعذر - ولي الأمر", icon: FileText,     color: "blue",    emoji: "📝", category: "attendance", type: "guardian_with_session",  api: "message" },
  { id: "group_completion_student",       label: "إكمال المجموعة - الطالب",     icon: Award,        color: "emerald", emoji: "🎉", category: "completion", type: "student_with_group",     api: "message" },
  { id: "group_completion_guardian",      label: "إكمال المجموعة - ولي الأمر",  icon: Award,        color: "emerald", emoji: "🎉", category: "completion", type: "guardian_with_group",    api: "message" },
  { id: "evaluation_pass",                label: "تقييم: ممتاز",                icon: Star,         color: "emerald", emoji: "✅", category: "evaluation", type: "guardian_with_session",  api: "message" },
  { id: "evaluation_review",              label: "تقييم: يحتاج مراجعة",         icon: FileText,     color: "amber",   emoji: "⚠️", category: "evaluation", type: "guardian_with_session",  api: "message" },
  { id: "evaluation_repeat",              label: "تقييم: يحتاج دعم إضافي",      icon: RotateCcw,    color: "rose",    emoji: "🔄", category: "evaluation", type: "guardian_with_session",  api: "message" },
  { id: "session_recording",              label: "رابط التسجيل",                icon: Video,        color: "sky",     emoji: "🎥", category: "evaluation", type: "guardian_with_session",  api: "message" },
];

const CATEGORIES = {
  basic:      { label: "أساسية",     emoji: "📌" },
  group:      { label: "المجموعات", emoji: "👥" },
  instructor: { label: "المدربين",  emoji: "👨‍🏫" },
  reminder:   { label: "التذكيرات", emoji: "⏰" },
  session:    { label: "الحصص",     emoji: "📅" },
  attendance: { label: "الحضور",    emoji: "📋" },
  completion: { label: "الإكمال",   emoji: "🎉" },
  evaluation: { label: "التقييم",   emoji: "⭐" },
};

const VAR_GROUPS = {
  student:    { label: "الطالب",        emoji: "👤" },
  guardian:   { label: "ولي الأمر",    emoji: "👨‍👩‍👧" },
  group:      { label: "المجموعة",     emoji: "👥" },
  session:    { label: "الحصة",        emoji: "📅" },
  attendance: { label: "الحضور",       emoji: "📋" },
  evaluation: { label: "التقييم",      emoji: "⭐" },
  common:     { label: "عامة",         emoji: "📌" },
};

const TEMPLATE_VARS = {
  student_welcome:               ["salutation_ar","salutation_en","welcome_ar","name_ar","name_en","fullName","you_ar"],
  guardian_notification:         ["guardianSalutation_ar","studentGender_ar","studentName_ar","studentName_en","relationship_ar","fullStudentName"],
  language_confirmation:         ["salutation_ar","salutation_en","name_ar","name_en","selectedLanguage_ar","selectedLanguage_en"],
  guardian_language_notification:["guardianSalutation_ar","guardianSalutation_en","studentGender_ar","studentGender_en","studentName_ar","studentName_en","selectedLanguage_ar","selectedLanguage_en"],
  group_student_welcome_student: ["salutation","courseName","groupName","startDate","timeTo","timeFrom","instructor","firstMeetingLink","studentName"],
  group_student_welcome_guardian:["salutation","childTitle","studentName","courseName","groupName","startDate","timeTo","timeFrom","instructor","firstMeetingLink"],
  instructor_group_activation:   ["salutation","courseName","groupName","startDate","timeTo","timeFrom","instructorName","studentCount"],
  reminder_24h_student:          ["studentSalutation","sessionName","date","time","meetingLink","guardianSalutation","studentName","guardianName","childTitle","enrollmentNumber"],
  reminder_24h_guardian:         ["guardianSalutation","studentSalutation","studentName","guardianName","childTitle","groupName","groupCode","courseName","enrollmentNumber","feedbackLink"],
  reminder_1h_student:           ["studentSalutation","sessionName","time","meetingLink","guardianSalutation","studentName","childTitle","enrollmentNumber"],
  reminder_1h_guardian:          ["guardianSalutation","studentSalutation","studentName","guardianName","childTitle","sessionName","date","time","meetingLink","enrollmentNumber"],
  session_cancelled_student:     ["guardianSalutation","studentSalutation","studentName","guardianName","childTitle","sessionName","date","time","meetingLink","enrollmentNumber"],
  session_cancelled_guardian:    ["guardianSalutation","studentSalutation","guardianName","childTitle","sessionName","date","time","meetingLink","enrollmentNumber"],
  session_postponed_student:     ["guardianSalutation","studentSalutation","studentName","guardianName","childTitle","sessionName","date","time","meetingLink","enrollmentNumber","newDate","newTime"],
  session_postponed_guardian:    ["guardianSalutation","studentSalutation","studentName","guardianName","childTitle","sessionName","date","time","meetingLink","enrollmentNumber","newDate","newTime"],
  absence_notification:          ["guardianSalutation","guardianName","studentName","childTitle","status","sessionName","date","time","enrollmentNumber"],
  late_notification:             ["guardianSalutation","guardianName","studentName","childTitle","status","sessionName","date","time","enrollmentNumber"],
  excused_notification:          ["guardianSalutation","guardianName","studentName","childTitle","status","sessionName","date","time","enrollmentNumber"],
  group_completion_student:      ["studentSalutation","guardianSalutation","studentName","guardianName","childTitle","groupName","groupCode","courseName","enrollmentNumber","feedbackLink"],
  group_completion_guardian:     ["studentSalutation","guardianSalutation","studentName","guardianName","childTitle","groupName","groupCode","courseName","enrollmentNumber","feedbackLink"],
  evaluation_pass:               ["guardianSalutation","sessionDate","sessionNumber","attendanceStatus","starsCommitment","starsUnderstanding","starsTaskExecution","starsParticipation","instructorComment","completedSessions","recordingLink"],
  evaluation_review:             ["guardianSalutation","sessionDate","sessionNumber","attendanceStatus","starsCommitment","starsUnderstanding","starsTaskExecution","starsParticipation","instructorComment","completedSessions","recordingLink"],
  evaluation_repeat:             ["guardianSalutation","sessionDate","sessionNumber","attendanceStatus","starsCommitment","starsUnderstanding","starsTaskExecution","starsParticipation","instructorComment","completedSessions","recordingLink"],
  session_recording:             ["guardianSalutation","guardianName","childTitle","studentName","sessionName","recordingLink"],
};

const FRONTEND_FALLBACKS = {
  language_confirmation: {
    ar: `✅ تم تأكيد اللغة المفضلة\n\n{salutation_ar}،\n\nتم تعيين *اللغة العربية* كلغة التواصل الرسمية معك.\n\n📌 ماذا يحدث الآن؟\n- جميع الرسائل القادمة ستكون بالعربية\n- المحتوى التعليمي والدعم سيكون متاحاً بالعربية\n\nنحن متحمسون لوجودك معنا! 🚀\n\nمع أطيب التحيات،\nفريق Code School 💻\n\n🌍 شكراً لاختيارك Code School`,
    en: `✅ Language Preference Confirmed\n\n{salutation_en},\n\nYour preferred language has been set to *English*.\n\n📌 What happens next?\n- All future messages will be sent in English\n- Course materials and support will be available in English\n\nWe're excited to have you on board! 🚀\n\nBest regards,\nThe Code School Team 💻\n\n🌍 Thank you for choosing Code School`,
  },
  guardian_language_notification: {
    ar: `{guardianSalutation_ar}،\n\nيسعدنا إبلاغكم بأن {studentGender_ar} **{studentName_ar}** قام/ت باختيار *اللغة العربية* كلغة مفضلة للتواصل بنجاح.\n\n📌 ماذا يعني هذا؟\n- جميع الرسائل القادمة لـ{studentGender_ar} ستكون باللغة العربية\n\nشكراً لثقتكم المستمرة في Code School.\n\nمع أطيب التحيات،\nفريق Code School 💻`,
    en: `{guardianSalutation_en},\n\nWe are pleased to inform you that your {studentGender_en} **{studentName_en}** has successfully selected *English* as their preferred communication language.\n\n📌 What this means?\n- All future messages will be sent in English\n\nThank you for your continued trust in Code School.\n\nBest regards,\nThe Code School Team 💻`,
  },
  evaluation_pass: {
    ar: `{guardianSalutation}،\n\nتقرير الحصة 📃✨\n📆 التاريخ : {sessionDate}\n📑 رقم الحصة : {sessionNumber}\n⏱️ مدة الحصة : ساعتين\n👥 الحضور : {attendanceStatus}\n📊 تقييم الأداء :\n⭐ الالتزام والتركيز : {starsCommitment}\n⭐ مستوى الاستيعاب : {starsUnderstanding}\n⭐ تنفيذ المهام : {starsTaskExecution}\n⭐ المشاركة داخل الحصة : {starsParticipation}\n📝 تعليق المدرس :\n{instructorComment}\n🔢 عدد الحصص المنتهية : {completedSessions}\n{recordingLink}\n🙏 نشكركم على ثقتكم في Code School\n📞 للتواصل : +2 011 40 474 129`,
    en: `{guardianSalutation},\n\nSession Report 📃✨\n📆 Date : {sessionDate}\n📑 Session No. : {sessionNumber}\n⏱️ Duration : 2 hours\n👥 Attendance : {attendanceStatus}\n📊 Performance Evaluation :\n⭐ Commitment & Focus : {starsCommitment}\n⭐ Understanding Level : {starsUnderstanding}\n⭐ Task Execution : {starsTaskExecution}\n⭐ Class Participation : {starsParticipation}\n📝 Instructor's Comment :\n{instructorComment}\n🔢 Sessions Completed : {completedSessions}\n{recordingLink}\n🙏 Thank you for trusting Code School\n📞 Contact : +2 011 40 474 129`,
  },
  evaluation_review: {
    ar: `{guardianSalutation}،\n\nتقرير الحصة 📃✨\n📆 التاريخ : {sessionDate}\n📑 رقم الحصة : {sessionNumber}\n⏱️ مدة الحصة : ساعتين\n👥 الحضور : {attendanceStatus}\n📊 تقييم الأداء :\n⭐ الالتزام والتركيز : {starsCommitment}\n⭐ مستوى الاستيعاب : {starsUnderstanding}\n⭐ تنفيذ المهام : {starsTaskExecution}\n⭐ المشاركة داخل الحصة : {starsParticipation}\n📝 تعليق المدرس :\n{instructorComment}\n🔢 عدد الحصص المنتهية : {completedSessions}\n{recordingLink}\n🙏 نشكركم على ثقتكم في Code School\n📞 للتواصل : +2 011 40 474 129`,
    en: `{guardianSalutation},\n\nSession Report 📃✨\n📆 Date : {sessionDate}\n📑 Session No. : {sessionNumber}\n⏱️ Duration : 2 hours\n👥 Attendance : {attendanceStatus}\n📊 Performance Evaluation :\n⭐ Commitment & Focus : {starsCommitment}\n⭐ Understanding Level : {starsUnderstanding}\n⭐ Task Execution : {starsTaskExecution}\n⭐ Class Participation : {starsParticipation}\n📝 Instructor's Comment :\n{instructorComment}\n🔢 Sessions Completed : {completedSessions}\n{recordingLink}\n🙏 Thank you for trusting Code School\n📞 Contact : +2 011 40 474 129`,
  },
  evaluation_repeat: {
    ar: `{guardianSalutation}،\n\nتقرير الحصة 📃✨\n📆 التاريخ : {sessionDate}\n📑 رقم الحصة : {sessionNumber}\n⏱️ مدة الحصة : ساعتين\n👥 الحضور : {attendanceStatus}\n📊 تقييم الأداء :\n⭐ الالتزام والتركيز : {starsCommitment}\n⭐ مستوى الاستيعاب : {starsUnderstanding}\n⭐ تنفيذ المهام : {starsTaskExecution}\n⭐ المشاركة داخل الحصة : {starsParticipation}\n📝 تعليق المدرس :\n{instructorComment}\n🔢 عدد الحصص المنتهية : {completedSessions}\n{recordingLink}\n🙏 نشكركم على ثقتكم في Code School\n📞 للتواصل : +2 011 40 474 129`,
    en: `{guardianSalutation},\n\nSession Report 📃✨\n📆 Date : {sessionDate}\n📑 Session No. : {sessionNumber}\n⏱️ Duration : 2 hours\n👥 Attendance : {attendanceStatus}\n📊 Performance Evaluation :\n⭐ Commitment & Focus : {starsCommitment}\n⭐ Understanding Level : {starsUnderstanding}\n⭐ Task Execution : {starsTaskExecution}\n⭐ Class Participation : {starsParticipation}\n📝 Instructor's Comment :\n{instructorComment}\n🔢 Sessions Completed : {completedSessions}\n{recordingLink}\n🙏 Thank you for trusting Code School\n📞 Contact : +2 011 40 474 129`,
  },
  session_recording: {
    ar: `{guardianSalutation}،\n\n🎥 رابط تسجيل جلسة "{sessionName}" لـ{childTitle} *{studentName}*:\n\n{recordingLink}\n\nيمكن مراجعة التسجيل في أي وقت للمذاكرة والمراجعة.\nفريق Code School 💻`,
    en: `{guardianSalutation},\n\n🎥 Recording for "{sessionName}" — {childTitle} *{studentName}*:\n\n{recordingLink}\n\nThe recording can be reviewed anytime for study and revision.\nCode School Team 💻`,
  },
};

const C_MAP = {
  violet:  { bg: "bg-violet-500",  text: "text-violet-600 dark:text-violet-400",  light: "bg-violet-50 dark:bg-violet-900/20",  border: "border-violet-200 dark:border-violet-800",  ring: "ring-violet-500/30",  activePill: "bg-violet-500 text-white" },
  blue:    { bg: "bg-blue-500",    text: "text-blue-600 dark:text-blue-400",      light: "bg-blue-50 dark:bg-blue-900/20",      border: "border-blue-200 dark:border-blue-800",      ring: "ring-blue-500/30",    activePill: "bg-blue-500 text-white" },
  emerald: { bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400",light: "bg-emerald-50 dark:bg-emerald-900/20",border: "border-emerald-200 dark:border-emerald-800",ring: "ring-emerald-500/30", activePill: "bg-emerald-500 text-white" },
  orange:  { bg: "bg-orange-500",  text: "text-orange-600 dark:text-orange-400",  light: "bg-orange-50 dark:bg-orange-900/20",  border: "border-orange-200 dark:border-orange-800",  ring: "ring-orange-500/30",  activePill: "bg-orange-500 text-white" },
  amber:   { bg: "bg-amber-500",   text: "text-amber-600 dark:text-amber-400",    light: "bg-amber-50 dark:bg-amber-900/20",    border: "border-amber-200 dark:border-amber-800",    ring: "ring-amber-500/30",   activePill: "bg-amber-500 text-white" },
  indigo:  { bg: "bg-indigo-500",  text: "text-indigo-600 dark:text-indigo-400",  light: "bg-indigo-50 dark:bg-indigo-900/20",  border: "border-indigo-200 dark:border-indigo-800",  ring: "ring-indigo-500/30",  activePill: "bg-indigo-500 text-white" },
  sky:     { bg: "bg-sky-500",     text: "text-sky-600 dark:text-sky-400",        light: "bg-sky-50 dark:bg-sky-900/20",        border: "border-sky-200 dark:border-sky-800",        ring: "ring-sky-500/30",     activePill: "bg-sky-500 text-white" },
  rose:    { bg: "bg-rose-500",    text: "text-rose-600 dark:text-rose-400",      light: "bg-rose-50 dark:bg-rose-900/20",      border: "border-rose-200 dark:border-rose-800",      ring: "ring-rose-500/30",    activePill: "bg-rose-500 text-white" },
  slate:   { bg: "bg-slate-500",   text: "text-slate-600 dark:text-slate-400",    light: "bg-slate-50 dark:bg-slate-900/20",    border: "border-slate-200 dark:border-slate-800",    ring: "ring-slate-500/30",   activePill: "bg-slate-500 text-white" },
};

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENT: VariableRow — سطر تعديل متغير واحد
// ─────────────────────────────────────────────────────────────
function VariableRow({ variable, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [valAr, setValAr]     = useState(variable.valueAr);
  const [valEn, setValEn]     = useState(variable.valueEn);
  const [dirty, setDirty]     = useState(false);

  // reset لما variable تتغير من الـ parent (بعد حفظ ناجح)
  useEffect(() => {
    setValAr(variable.valueAr);
    setValEn(variable.valueEn);
    setDirty(false);
  }, [variable.valueAr, variable.valueEn]);

  const handleSave = () => {
    onSave(variable.key, valAr, valEn);
    setEditing(false);
    setDirty(false);
  };

  const handleCancel = () => {
    setValAr(variable.valueAr);
    setValEn(variable.valueEn);
    setEditing(false);
    setDirty(false);
  };

  const isSaving = saving === variable.key;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${editing ? "border-violet-300 dark:border-violet-700 shadow-sm" : "border-slate-200 dark:border-slate-700"}`}>
      {/* Header row */}
      <div
        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none
          ${editing ? "bg-violet-50 dark:bg-violet-900/20" : "bg-white dark:bg-[#161b27] hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
        onClick={() => !isSaving && setEditing((p) => !p)}
      >
        <span className="text-lg flex-shrink-0">{variable.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-[10px] font-mono font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded">
              {`{${variable.key}}`}
            </code>
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
              {variable.labelAr}
            </span>
          </div>
          {/* Preview of current values */}
          {!editing && (
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span className="text-[9px]">🇸🇦</span>
                <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[140px]">{variable.valueAr}</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span className="text-[9px]">🇬🇧</span>
                <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[140px]">{variable.valueEn}</span>
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {dirty && !editing && (
            <span className="w-2 h-2 rounded-full bg-amber-400" title="يوجد تغييرات غير محفوظة" />
          )}
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin" />
          ) : editing ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Edit panel */}
      {editing && (
        <div className="px-3 pb-3 pt-2 bg-white dark:bg-[#161b27] border-t border-slate-100 dark:border-slate-800 space-y-2">
          {/* Arabic value */}
          <div>
            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              <span>🇸🇦</span> القيمة العربية
            </label>
            <textarea
              value={valAr}
              onChange={(e) => { setValAr(e.target.value); setDirty(true); }}
              dir="rtl"
              rows={valAr.length > 60 ? 2 : 1}
              className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 dark:text-slate-100 resize-none transition-all"
            />
          </div>
          {/* English value */}
          <div>
            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              <span>🇬🇧</span> القيمة الإنجليزية
            </label>
            <textarea
              value={valEn}
              onChange={(e) => { setValEn(e.target.value); setDirty(true); }}
              dir="ltr"
              rows={valEn.length > 60 ? 2 : 1}
              className="w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 dark:text-slate-100 resize-none transition-all"
            />
          </div>
          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-3 h-3" /> إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !dirty}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all
                ${isSaving || !dirty
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                  : "bg-violet-500 hover:bg-violet-600 text-white shadow-sm active:scale-95"}`}
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              {isSaving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENT: VariablesTab — تبويب إدارة المتغيرات
// ─────────────────────────────────────────────────────────────
function VariablesTab({ dbVars, setDbVars, loadingVars }) {
  const [savingKey, setSavingKey]   = useState(null);
  const [searchVars, setSearchVars] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");
  const [bulkSaving, setBulkSaving]   = useState(false);

  // ── حفظ متغير واحد ─────────────────────────────────────────
  const handleSaveVar = useCallback(async (key, valueAr, valueEn) => {
    setSavingKey(key);
    try {
      const res  = await fetch("/api/whatsapp/template-variables", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, valueAr, valueEn }),
      });
      const data = await res.json();
      if (data.success) {
        // تحديث الـ state محلياً
        setDbVars((prev) =>
          prev.map((v) => v.key === key ? { ...v, valueAr, valueEn } : v)
        );
        toast.success(`✅ تم حفظ ${key}`);
      } else {
        toast.error(data.message || "فشل الحفظ");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setSavingKey(null);
    }
  }, [setDbVars]);

  // ── فلترة ──────────────────────────────────────────────────
  const filtered = dbVars.filter((v) => {
    const matchGroup = activeGroup === "all" || v.group === activeGroup;
    const q = searchVars.toLowerCase();
    const matchSearch = !q || v.key.toLowerCase().includes(q) || v.labelAr.includes(q) || v.valueAr.includes(q) || v.valueEn.toLowerCase().includes(q);
    return matchGroup && matchSearch;
  });

  // تجميع حسب الـ group
  const grouped = filtered.reduce((acc, v) => {
    const g = v.group || "common";
    if (!acc[g]) acc[g] = [];
    acc[g].push(v);
    return acc;
  }, {});

  if (loadingVars) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        <p className="text-sm text-slate-400">جاري تحميل المتغيرات...</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-5">
      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-2xl border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-900/10 mb-4">
        <Settings className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-blue-700 dark:text-blue-300">
            ⚙️ إدارة قيم المتغيرات
          </p>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
            القيم المخزنة هنا هي قيم <strong>المعاينة فقط</strong> — تساعدك على رؤية كيف ستبدو الرسالة.
            أما قيم الإرسال الفعلية فتأتي من بيانات الطالب/المجموعة تلقائياً.
            يمكنك تعديل أي قيمة بالنقر عليها، وستُحفظ في الداتابيز فوراً.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={searchVars}
            onChange={(e) => setSearchVars(e.target.value)}
            placeholder="بحث في المتغيرات..."
            className="w-full pr-9 pl-3 py-2 text-xs bg-white dark:bg-[#161b27] border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 dark:text-slate-200 placeholder-slate-400"
          />
        </div>
        {/* Group filter */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setActiveGroup("all")}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${activeGroup === "all" ? "bg-violet-500 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
          >
            الكل ({dbVars.length})
          </button>
          {Object.entries(VAR_GROUPS).map(([key, grp]) => {
            const count = dbVars.filter((v) => v.group === key).length;
            if (count === 0) return null;
            return (
              <button key={key} onClick={() => setActiveGroup(key)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${activeGroup === key ? "bg-violet-500 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
              >
                <span>{grp.emoji}</span>
                <span className="hidden sm:inline">{grp.label}</span>
                <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Variables list grouped */}
      <div className="space-y-5">
        {Object.entries(grouped).map(([groupKey, vars]) => {
          const grp = VAR_GROUPS[groupKey] || { label: groupKey, emoji: "📌" };
          return (
            <div key={groupKey}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">{grp.emoji}</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{grp.label}</span>
                <span className="text-[10px] text-slate-400">({vars.length})</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700 mr-1" />
              </div>
              <div className="space-y-1.5">
                {vars.map((v) => (
                  <VariableRow
                    key={v.key}
                    variable={v}
                    onSave={handleSaveVar}
                    saving={savingKey}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Search className="w-8 h-8 text-slate-300" />
            <p className="text-sm text-slate-400">لا توجد متغيرات تطابق البحث</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function WhatsAppTemplatesPage() {
  const { locale } = useI18n();

  // ── existing state ─────────────────────────────────────────
  const [activeTab, setActiveTab]       = useState("student_welcome");
  const [templates, setTemplates]       = useState({});
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [testing, setTesting]           = useState(false);
  const [testPhone, setTestPhone]       = useState("");
  const [testLanguage, setTestLanguage] = useState("ar");
  const [showHints, setShowHints]       = useState(false);
  const [selectedHint, setSelectedHint] = useState(0);
  const [cursorPos, setCursorPos]       = useState(0);
  const [searchQ, setSearchQ]           = useState("");
  const [activeCat, setActiveCat]       = useState("basic");

  // ── NEW: variables state ────────────────────────────────────
  const [dbVars, setDbVars]           = useState([]);   // [ { key, labelAr, valueAr, valueEn, ... } ]
  const [loadingVars, setLoadingVars] = useState(false);
  const [mainTab, setMainTab]         = useState("templates"); // "templates" | "variables"

  const textareaRef = useRef(null);
  const hintsRef    = useRef(null);
  const [hintsPos, setHintsPos] = useState({ top: 0, left: 0, right: 0 });

  // ── force AR for single-content templates ──────────────────
  useEffect(() => {
    if (SINGLE_CONTENT_TEMPLATES.includes(activeTab)) setTestLanguage("ar");
  }, [activeTab]);

  // ── hints position ─────────────────────────────────────────
  useEffect(() => {
    if (!showHints) return;
    const update = () => {
      if (!textareaRef.current) return;
      const r = textareaRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      setHintsPos({
        top:   spaceBelow > 280 ? r.bottom + 4 : Math.max(8, r.top - 284),
        left:  Math.max(8, r.left),
        right: Math.max(8, window.innerWidth - r.right),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [showHints]);

  // ── fetch templates ────────────────────────────────────────
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const [sRes, iRes, gRes, mRes] = await Promise.all([
        fetch("/api/whatsapp/templates"),
        fetch("/api/whatsapp/instructor-templates"),
        fetch("/api/whatsapp/group-templates"),
        fetch("/api/whatsapp/message-templates"),
      ]);
      const map = {};

      const sd = await sRes.json();
      if (sd.success && sd.data) {
        sd.data.forEach(t => {
          if (t.templateType === "student_language_confirmation") {
            if (!map["language_confirmation"]) map["language_confirmation"] = { ...t, content: t.contentAr || t.content || "", contentAr: t.contentAr || t.content || "", contentEn: t.contentEn || t.content || "" };
          } else if (t.templateType === "guardian_language_confirmation") {
            if (!map["guardian_language_notification"]) map["guardian_language_notification"] = { ...t, content: t.contentAr || t.content || "", contentAr: t.contentAr || t.content || "", contentEn: t.contentEn || t.content || "" };
          } else {
            if (!map[t.templateType]) map[t.templateType] = t;
          }
        });
      }
      const id = await iRes.json();
      if (id.success && id.data) { const d = id.data; if (!map["instructor_group_activation"]) map["instructor_group_activation"] = { ...d, content: d.contentAr || d.content || "", contentAr: d.contentAr || d.content || "", contentEn: d.contentEn || "" }; }
      const gd = await gRes.json();
      if (gd.success && gd.data) {
        const d = gd.data;
        if (!map["group_student_welcome_student"])  map["group_student_welcome_student"]  = { ...d, templateType: "group_student_welcome_student",  content: d.studentContentAr  || d.content || "", contentAr: d.studentContentAr  || "", contentEn: d.studentContentEn  || "" };
        if (!map["group_student_welcome_guardian"]) map["group_student_welcome_guardian"] = { ...d, templateType: "group_student_welcome_guardian", content: d.guardianContentAr || d.content || "", contentAr: d.guardianContentAr || "", contentEn: d.guardianContentEn || "" };
      }
      const md = await mRes.json();
      if (md.success && md.data) {
        md.data.forEach(t => {
          if (!map[t.templateType]) map[t.templateType] = { ...t, content: t.contentAr || "", contentAr: t.contentAr || "", contentEn: t.contentEn || "", isMessageTemplate: true, _messageTemplateId: t._id };
        });
      }
      Object.entries(FRONTEND_FALLBACKS).forEach(([typeId, fb]) => {
        if (!map[typeId]) map[typeId] = { templateType: typeId, content: fb.ar, contentAr: fb.ar, contentEn: fb.en, isMessageTemplate: !["language_confirmation","guardian_language_notification"].includes(typeId), isFrontendFallback: true, _messageTemplateId: null };
      });
      setTemplates(map);
    } catch { toast.error("فشل تحميل القوالب"); }
    finally { setLoading(false); }
  };

  // ── NEW: fetch variables from DB ───────────────────────────
  const fetchVariables = useCallback(async () => {
    setLoadingVars(true);
    try {
      const res  = await fetch("/api/whatsapp/template-variables");
      const data = await res.json();
      if (data.success) {
        setDbVars(data.data);
      } else {
        toast.error("فشل تحميل المتغيرات");
      }
    } catch {
      toast.error("خطأ في تحميل المتغيرات");
    } finally {
      setLoadingVars(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); fetchVariables(); }, []);

  // ── getVarExamples: من الـ DB لو متاح، وإلا fallback ────────
  const getVarExamples = useCallback((lang = "ar") => {
    const map = {};
    if (dbVars.length > 0) {
      dbVars.forEach((v) => {
        map[`{${v.key}}`] = lang === "ar" ? v.valueAr : v.valueEn;
      });
    }
    return map;
  }, [dbVars]);

  // ── getVariablesForTemplate: من الـ DB ────────────────────
  const getVariablesForTemplate = useCallback((templateId, lang = "ar") => {
    const keys = TEMPLATE_VARS[templateId] || [];
    return keys
      .map((k) => {
        const dbVar = dbVars.find((v) => v.key === k);
        if (!dbVar) return null;
        return {
          key:     `{${k}}`,
          label:   lang === "ar" ? dbVar.labelAr : dbVar.labelEn,
          icon:    dbVar.icon,
          example: lang === "ar" ? dbVar.valueAr : dbVar.valueEn,
          category: k,
        };
      })
      .filter(Boolean);
  }, [dbVars]);

  // ── update content ─────────────────────────────────────────
  const updateContent = (val) => {
    const cur = templates[activeTab];
    if (!cur) return;
    if (SINGLE_CONTENT_TEMPLATES.includes(activeTab)) {
      setTemplates(p => ({ ...p, [activeTab]: { ...cur, content: val } }));
    } else {
      setTemplates(p => ({ ...p, [activeTab]: { ...cur, content: val, contentAr: testLanguage === "ar" ? val : cur.contentAr, contentEn: testLanguage === "en" ? val : cur.contentEn } }));
    }
  };

  // ── save template ──────────────────────────────────────────
  const saveTemplate = async () => {
    const cur = templates[activeTab];
    if (!cur) return;
    setSaving(true);
    try {
      let endpoint, payload;
      if (activeTab === "instructor_group_activation") {
        endpoint = "/api/whatsapp/instructor-templates";
        payload  = { id: cur._id, contentAr: cur.contentAr || cur.content, contentEn: cur.contentEn, setAsDefault: true };
      } else if (activeTab.startsWith("group_student_welcome")) {
        endpoint = "/api/whatsapp/group-templates";
        const base = templates["group_student_welcome_student"];
        payload = { id: base?._id || cur._id, setAsDefault: true };
        if (activeTab === "group_student_welcome_student") { payload.studentContentAr  = cur.contentAr || cur.content; payload.studentContentEn  = cur.contentEn; }
        else                                               { payload.guardianContentAr = cur.contentAr || cur.content; payload.guardianContentEn = cur.contentEn; }
      } else if (activeTab === "language_confirmation" || activeTab === "guardian_language_notification") {
        endpoint = "/api/whatsapp/templates";
        const dbType = activeTab === "language_confirmation" ? "student_language_confirmation" : "guardian_language_confirmation";
        if (cur.isFrontendFallback || !cur._id) {
          payload = { templateType: dbType, name: activeTab === "language_confirmation" ? "تأكيد اللغة للطالب" : "تأكيد اللغة لولي الأمر", content: cur.contentAr || cur.content, contentAr: cur.contentAr || cur.content, contentEn: cur.contentEn || "", description: activeTab === "language_confirmation" ? "رسالة تأكيد اللغة للطالب - باللغة المختارة فقط" : "رسالة تأكيد اللغة لولي الأمر - باللغة المختارة فقط", isDefault: true, isActive: true, setAsDefault: true };
          const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          const data = await res.json();
          if (data.success) { await fetchTemplates(); toast.success("✅ تم حفظ القالب"); } else toast.error(data.message || data.error || "فشل الحفظ");
          return;
        }
        payload = { id: cur._id, content: cur.contentAr || cur.content, contentAr: cur.contentAr || cur.content, contentEn: cur.contentEn || "", setAsDefault: true };
      } else if (cur.isMessageTemplate) {
        endpoint = "/api/whatsapp/message-templates";
        if (cur.isFrontendFallback || !cur._messageTemplateId) {
          payload = { templateType: activeTab, contentAr: cur.contentAr || cur.content, contentEn: cur.contentEn || "", recipientType: "guardian", name: activeTab, isDefault: true, isActive: true };
          const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          const data = await res.json();
          if (data.success) { await fetchTemplates(); toast.success("✅ تم حفظ القالب"); } else toast.error(data.message || data.error || "فشل الحفظ");
          return;
        }
        payload = { _id: cur._messageTemplateId || cur._id, templateType: activeTab, contentAr: cur.contentAr || cur.content, contentEn: cur.contentEn };
      } else {
        endpoint = "/api/whatsapp/templates";
        payload  = { id: cur._id, content: cur.content, setAsDefault: true };
      }
      const res  = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) { await fetchTemplates(); toast.success("✅ تم حفظ القالب"); }
      else toast.error(data.message || data.error || "فشل الحفظ");
    } catch { toast.error("خطأ في الحفظ"); }
    finally { setSaving(false); }
  };

  // ── preview ────────────────────────────────────────────────
  const getPreview = () => {
    const tmpl = templates[activeTab];
    if (!tmpl) return "";
    let text = SINGLE_CONTENT_TEMPLATES.includes(activeTab)
      ? (tmpl.content || "")
      : testLanguage === "ar" ? (tmpl.contentAr || tmpl.content || "") : (tmpl.contentEn || tmpl.content || "");
    const VAR_EXAMPLES = getVarExamples(testLanguage);
    Object.entries(VAR_EXAMPLES).forEach(([key, example]) => {
      text = text.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), example);
    });
    return text;
  };

  // ── insert variable ────────────────────────────────────────
  const allVars = getVariablesForTemplate(activeTab, testLanguage);

  const insertVariable = (variable) => {
    const textVal = SINGLE_CONTENT_TEMPLATES.includes(activeTab)
      ? (templates[activeTab]?.content || "")
      : testLanguage === "ar"
        ? (templates[activeTab]?.contentAr || templates[activeTab]?.content || "")
        : (templates[activeTab]?.contentEn || templates[activeTab]?.content || "");
    const before = textVal.substring(0, cursorPos);
    const lastAt = before.lastIndexOf("@");
    const insertText = variable.key;
    let newVal, newPos;
    if (lastAt !== -1) { newVal = textVal.substring(0, lastAt) + insertText + textVal.substring(cursorPos); newPos = lastAt + insertText.length; }
    else { newVal = textVal.substring(0, cursorPos) + insertText + textVal.substring(cursorPos); newPos = cursorPos + insertText.length; }
    updateContent(newVal);
    setShowHints(false);
    setCursorPos(newPos);
    setTimeout(() => { textareaRef.current?.focus(); textareaRef.current?.setSelectionRange(newPos, newPos); }, 0);
  };

  // ── textarea handlers ──────────────────────────────────────
  const handleInput = (e) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    updateContent(val);
    setCursorPos(pos);
    const before = val.substring(0, pos);
    const lastAt = before.lastIndexOf("@");
    if (lastAt !== -1 && lastAt === pos - 1) { setShowHints(true); setSelectedHint(0); }
    else if (showHints && lastAt === -1) setShowHints(false);
  };

  const handleKeyDown = (e) => {
    if (!showHints) return;
    if (e.key === "ArrowDown")                     { e.preventDefault(); setSelectedHint(p => (p + 1) % allVars.length); }
    else if (e.key === "ArrowUp")                  { e.preventDefault(); setSelectedHint(p => (p - 1 + allVars.length) % allVars.length); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertVariable(allVars[selectedHint]); }
    else if (e.key === "Escape")                   { e.preventDefault(); setShowHints(false); }
  };

  useEffect(() => {
    const h = (e) => { if (hintsRef.current && !hintsRef.current.contains(e.target)) setShowHints(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── test send ──────────────────────────────────────────────
  const sendTest = async () => {
    if (!testPhone) { toast.error("أدخل رقم الهاتف"); return; }
    setTesting(true);
    try {
      const res  = await fetch("/api/whatsapp/test-send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phoneNumber: testPhone, messageContent: getPreview(), messageType: activeTab, language: testLanguage }) });
      const data = await res.json();
      if (data.success) toast.success(`✅ تم الإرسال إلى ${testPhone}`);
      else toast.error(data.message || "فشل الإرسال");
    } catch { toast.error("خطأ في الإرسال"); }
    finally { setTesting(false); }
  };

  // ── derived ────────────────────────────────────────────────
  const curTemplate  = templates[activeTab];
  const activeType   = TEMPLATE_TYPES.find(t => t.id === activeTab);
  const C            = C_MAP[activeType?.color || "violet"];
  const filtered     = TEMPLATE_TYPES.filter(t => !searchQ || t.label.includes(searchQ));
  const byCategory   = filtered.reduce((acc, t) => { if (!acc[t.category]) acc[t.category] = []; acc[t.category].push(t); return acc; }, {});
  const isSingleContent    = SINGLE_CONTENT_TEMPLATES.includes(activeTab);
  const isLangConfirmation = ["language_confirmation", "guardian_language_notification"].includes(activeTab);

  const textVal = isSingleContent
    ? (curTemplate?.content || "")
    : testLanguage === "ar"
      ? (curTemplate?.contentAr || curTemplate?.content || "")
      : (curTemplate?.contentEn || curTemplate?.content || "");

  // ── loading ────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl">
          <MessageCircle className="w-7 h-7 text-white" />
        </div>
        <div className="absolute -inset-1 rounded-3xl border-2 border-violet-500/30 animate-ping" />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">جاري تحميل القوالب...</p>
    </div>
  );

  // ── render ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-slate-50 dark:bg-[#0f1117] min-h-screen" dir="rtl">

      {/* ══════ TOP HEADER ══════ */}
      <header className="sticky top-0 z-40 bg-white dark:bg-[#161b27] border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 px-4 h-14">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">قوالب الرسائل</p>
              <p className="text-[10px] text-slate-400 mt-0.5">WhatsApp Templates</p>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 flex-shrink-0" />

          {/* ── MAIN TAB SWITCH: القوالب | المتغيرات ── */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex-shrink-0">
            <button
              onClick={() => setMainTab("templates")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                ${mainTab === "templates" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"}`}
            >
              <MessageCircle className="w-3 h-3" />
              <span>القوالب</span>
            </button>
            <button
              onClick={() => setMainTab("variables")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                ${mainTab === "variables" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"}`}
            >
              <Settings className="w-3 h-3" />
              <span>المتغيرات</span>
              <span className={`text-[9px] px-1 py-0.5 rounded-full font-bold ${mainTab === "variables" ? "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300" : "bg-slate-200 dark:bg-slate-700 text-slate-400"}`}>
                {dbVars.length}
              </span>
            </button>
          </div>

          {/* ── Only show template controls when on templates tab ── */}
          {mainTab === "templates" && (
            <>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 flex-shrink-0" />

              {/* Category Tabs */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                  {Object.entries(CATEGORIES).map(([key, cat]) => {
                    const items = byCategory[key] || [];
                    if (items.length === 0) return null;
                    const isCatActive = items.some(t => t.id === activeTab);
                    return (
                      <button key={key}
                        onClick={() => { setActiveCat(key); if (!isCatActive && items[0]) setActiveTab(items[0].id); }}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap
                          ${isCatActive ? `${C_MAP[items[0]?.color || "slate"]?.activePill || "bg-slate-500 text-white"} shadow-sm` : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                        <span>{cat.emoji}</span>
                        <span className="hidden sm:inline">{cat.label}</span>
                        <span className={`hidden sm:inline text-[10px] px-1 py-0.5 rounded-full ${isCatActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>{items.length}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 flex-shrink-0" />

              {!isSingleContent && (
                <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex-shrink-0">
                  {["ar","en"].map(lang => (
                    <button key={lang} onClick={() => setTestLanguage(lang)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${testLanguage === lang ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"}`}>
                      {lang === "ar" ? "🇸🇦 عربي" : "🇬🇧 EN"}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <button
            onClick={() => { fetchTemplates(); fetchVariables(); }}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 flex-shrink-0 mr-auto"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-nav — فقط في تبويب القوالب */}
        {mainTab === "templates" && (
          <div className="border-t border-slate-100 dark:border-slate-800/80 px-4 py-1.5 overflow-x-auto no-scrollbar">
            <div className="flex gap-1">
              {(byCategory[activeCat] || []).map(tmpl => {
                const Icon     = tmpl.icon;
                const isActive = activeTab === tmpl.id;
                const tc       = C_MAP[tmpl.color] || C_MAP.slate;
                const hasData  = !!(templates[tmpl.id]?.contentAr || templates[tmpl.id]?.content);
                return (
                  <button key={tmpl.id} onClick={() => setActiveTab(tmpl.id)}
                    className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap
                      ${isActive ? `${tc.light} ${tc.text} ${tc.border} border` : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}>
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? tc.text : "text-slate-400"}`} />
                    <span>{tmpl.emoji} {tmpl.label}</span>
                    {tmpl.isNew && <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">NEW</span>}
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hasData ? "bg-emerald-400" : "bg-slate-300 dark:bg-slate-600"}`} />
                  </button>
                );
              })}
              <div className="relative mr-auto flex-shrink-0">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="بحث..."
                  className="pr-7 pl-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-slate-300 dark:focus:border-slate-600 rounded-xl focus:outline-none dark:text-slate-200 placeholder-slate-400 w-28 focus:w-40 transition-all" />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ══════ MAIN CONTENT ══════ */}

      {/* ── Variables Tab ── */}
      {mainTab === "variables" && (
        <VariablesTab
          dbVars={dbVars}
          setDbVars={setDbVars}
          loadingVars={loadingVars}
        />
      )}

      {/* ── Templates Tab ── */}
      {mainTab === "templates" && (
        <div className="flex-1 p-3 sm:p-4 lg:p-5">
          {activeType && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border mb-4 ${C.light} ${C.border}`}>
              <div className={`w-10 h-10 rounded-xl ${C.bg} flex items-center justify-center shadow-md flex-shrink-0`}>
                <activeType.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{activeType.emoji} {activeType.label}</span>
                  {activeType.isNew && <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
                  {curTemplate?.isMessageTemplate && !curTemplate?.isFrontendFallback && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800">MessageTemplate</span>}
                  {curTemplate?.isFrontendFallback && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-800">⚡ Default — لم يُحفظ بعد</span>}
                  {isSingleContent && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700">🌐 رسالة ثنائية اللغة</span>}
                  {isLangConfirmation && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800">🌍 باللغة المختارة فقط</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {activeType.type.includes("student")    && <span className={`text-[10px] px-2 py-0.5 rounded-full ${C.light} ${C.text} border ${C.border}`}>👤 للطالب</span>}
                  {activeType.type.includes("guardian")   && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">👨‍👩‍👧 لولي الأمر</span>}
                  {activeType.type.includes("instructor") && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">👨‍🏫 للمدرب</span>}
                  {activeType.type.includes("group")      && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">👥 بيانات المجموعة</span>}
                  {activeType.type.includes("session")    && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">📅 بيانات الحصة</span>}
                  <span className="text-[10px] text-slate-400">{allVars.length} متغير</span>
                </div>
              </div>
            </div>
          )}

          {isLangConfirmation && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10 mb-4">
              <Globe className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">🌍 قالب باللغة المختارة فقط</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">هذا القالب بيتبعت <strong>باللغة اللي اختارها الطالب فعلاً</strong>. عدّل النسخة العربية (🇸🇦) ليتبعت لمن اختار عربي، والإنجليزية (🇬🇧) لمن اختار إنجليزي.</p>
              </div>
            </div>
          )}

          <div className="grid xl:grid-cols-3 lg:grid-cols-2 gap-4">
            {/* ── EDITOR ── */}
            <div className="xl:col-span-2 space-y-4">
              <div className="bg-white dark:bg-[#161b27] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className={`flex items-center justify-between px-4 py-2.5 border-b ${C.light} ${C.border}`}>
                  <div className="flex items-center gap-2">
                    <Edit className={`w-3.5 h-3.5 ${C.text}`} />
                    <span className={`text-xs font-bold ${C.text}`}>
                      تحرير القالب{!isSingleContent && (testLanguage === "ar" ? " 🇸🇦 عربي" : " 🇬🇧 English")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${C.light} ${C.text} border ${C.border}`}>اكتب @ لإدراج مثال</span>
                    <span className="text-[10px] text-slate-400">{textVal.length} حرف</span>
                  </div>
                </div>

                <div className="relative p-4">
                  <textarea ref={textareaRef} value={textVal} onChange={handleInput} onKeyDown={handleKeyDown}
                    onClick={e => setCursorPos(e.target.selectionStart)} dir="ltr"
                    placeholder={testLanguage === "ar" ? "اكتب الرسالة... اكتب @ لإدراج قيمة مثال" : "Write your message... type @ to insert example value"}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 dark:focus:border-violet-600 dark:text-slate-100 resize-none h-52 sm:h-64 lg:h-80 text-sm font-mono leading-loose transition-all placeholder-slate-400"
                  />

                  {showHints && allVars.length > 0 && (
                    <div ref={hintsRef}
                      className="fixed z-[9999] bg-white dark:bg-[#1a2236] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden"
                      style={{ top: hintsPos.top, left: hintsPos.left, right: hintsPos.right, maxWidth: "calc(100vw - 16px)" }}>
                      <div className={`flex items-center gap-2 px-3 py-2 ${C.light} border-b ${C.border}`}>
                        <Zap className={`w-3 h-3 ${C.text}`} />
                        <span className={`text-[10px] font-bold ${C.text}`}>اختر متغيراً — سيُدرج مثاله في النص</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto no-scrollbar">
                        {allVars.map((v, gIdx) => (
                          <button key={v.key} onClick={() => insertVariable(v)}
                            className={`w-full px-3 py-2.5 flex items-center gap-3 text-right transition-colors ${gIdx === selectedHint ? C.light : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                            <span className="text-base flex-shrink-0">{v.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-[10px] font-mono ${C.text} font-bold`}>{v.key}</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">{v.label}</span>
                              </div>
                              <div className="mt-0.5 flex items-center gap-1">
                                <span className="text-[9px] text-slate-400">يُدرج:</span>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${C.light} ${C.text} font-mono`}>{v.example}</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 text-[9px] text-slate-400 text-center">
                        ↑ ↓ للتنقل &bull; Enter للإدراج &bull; Esc للإغلاق
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    الـ @ يُدرج القيمة من الداتابيز في النص والمعاينة
                  </p>
                  <button onClick={saveTemplate} disabled={saving}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-md
                      ${saving ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed" : `${C.bg} text-white hover:opacity-90`}`}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                  </button>
                </div>
              </div>

              {/* Quick-insert chips */}
              {allVars.length > 0 && (
                <div className="bg-white dark:bg-[#161b27] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className={`w-3.5 h-3.5 ${C.text}`} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">إدراج سريع — انقر للإدراج في موضع الكرسر</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto no-scrollbar sm:max-h-none">
                    {allVars.map(v => (
                      <button key={v.key}
                        onClick={() => { const pos = textareaRef.current ? textareaRef.current.selectionStart : textVal.length; setCursorPos(pos); insertVariable(v); }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium border transition-all hover:scale-105 active:scale-95 ${C.light} ${C.text} ${C.border} hover:shadow-sm`}>
                        <span>{v.icon}</span>
                        <span className="font-mono">{v.example}</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 border-r border-current/20 pr-1 mr-0.5 opacity-60">{v.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Test Send */}
              <div className="bg-white dark:bg-[#161b27] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center">
                    <Send className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">اختبار الإرسال</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input type="tel" value={testPhone} onChange={e => setTestPhone(e.target.value)}
                    placeholder="+201234567890" dir="ltr"
                    className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 dark:text-slate-100 placeholder-slate-400" />
                  <button onClick={sendTest} disabled={testing}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-md disabled:opacity-50 whitespace-nowrap">
                    {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {testing ? "جاري..." : "إرسال تجريبي"}
                  </button>
                </div>
              </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="space-y-4">
              {/* Preview */}
              <div className="bg-white dark:bg-[#161b27] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${C.light} ${C.border}`}>
                  <Eye className={`w-3.5 h-3.5 ${C.text}`} />
                  <span className={`text-xs font-bold ${C.text}`}>معاينة مباشرة</span>
                  <div className="mr-auto flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-slate-400">مباشر</span>
                  </div>
                </div>
                <div className="p-3">
                  <div className="bg-[#e5ddd5] dark:bg-[#0d1117] rounded-xl p-3 min-h-44 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E\")" }} />
                    <div className="relative">
                      {getPreview() ? (
                        <div className="bg-white dark:bg-[#1e2535] rounded-xl rounded-tl-sm p-3 shadow-sm max-w-[94%] ml-auto">
                          <pre className="text-[11px] text-slate-800 dark:text-slate-100 whitespace-pre-wrap font-sans leading-relaxed max-h-72 overflow-y-auto no-scrollbar">{getPreview()}</pre>
                          <div className="flex justify-end mt-1.5 gap-1 items-center">
                            <span className="text-[9px] text-slate-400">12:34</span>
                            <CheckCircle className="w-3 h-3 text-sky-400" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                          <div className="w-9 h-9 rounded-full bg-white/40 dark:bg-white/10 flex items-center justify-center">
                            <MessageCircle className="w-4 h-4 text-slate-400" />
                          </div>
                          <p className="text-xs text-slate-400">اكتب الرسالة لترى المعاينة</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Variables quick reference */}
              {allVars.length > 0 && (
                <div className="bg-white dark:bg-[#161b27] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className={`flex items-center justify-between gap-2 px-4 py-2.5 border-b ${C.light} ${C.border}`}>
                    <div className="flex items-center gap-2">
                      <Zap className={`w-3.5 h-3.5 ${C.text}`} />
                      <span className={`text-xs font-bold ${C.text}`}>متغيرات هذا القالب</span>
                    </div>
                    <button
                      onClick={() => setMainTab("variables")}
                      className="text-[10px] text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 font-bold flex items-center gap-1 transition-colors"
                    >
                      <Settings className="w-3 h-3" /> تعديل القيم
                    </button>
                  </div>
                  <div className="p-3 max-h-72 overflow-y-auto no-scrollbar space-y-0.5">
                    {allVars.map(v => (
                      <button key={v.key}
                        onClick={() => { const pos = textareaRef.current ? textareaRef.current.selectionStart : textVal.length; setCursorPos(pos); insertVariable(v); }}
                        className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-right">
                        <span className="text-sm flex-shrink-0">{v.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[10px] font-mono font-bold ${C.text}`}>{v.key}</span>
                            <span className="text-[9px] text-slate-400 truncate">{v.label}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[9px] text-slate-400">مثال:</span>
                            <span className={`text-[10px] font-semibold ${C.text} truncate`}>{v.example}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800/40 rounded-2xl p-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 mb-1">💡 نصائح</p>
                    <ul className="text-[10px] text-blue-600 dark:text-blue-400 space-y-0.5">
                      <li>• اكتب @ لعرض المتغيرات — القيم من الداتابيز مباشرة</li>
                      <li>• انقر "تعديل القيم" لتغيير قيم المعاينة من الداتابيز</li>
                      <li>• النقطة الخضراء = يوجد محتوى محفوظ للقالب</li>
                      <li>• عدّل العربي والإنجليزي بشكل مستقل</li>
                      {isSingleContent && <li>• 🌐 هذا القالب رسالة واحدة تحتوي عربي وإنجليزي معاً</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}