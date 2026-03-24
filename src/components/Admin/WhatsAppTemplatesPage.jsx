"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  MessageCircle, Eye, Save, RefreshCw, Send, User, Users, Globe,
  Loader2, Zap, CheckCircle, XCircle, AlertCircle, Sparkles,
  ChevronDown, Edit, Clock, Bell, Calendar, Award, FileText,
  UserPlus, UserCog, Search, Star, RotateCcw, Video,
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";

// ─────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// ALL VARIABLES
// ─────────────────────────────────────────────────────────────
const ALL_VARS = {
  // ── Student basic
  salutation_ar:         { label: "تحية (عربي)",              labelEn: "Salutation (AR)",          icon: "👋", ar: "عزيزي الطالب ممدوح",     en: "عزيزي الطالب ممدوح" },
  salutation_en:         { label: "تحية (إنجليزي)",            labelEn: "Salutation (EN)",          icon: "👋", ar: "Dear student Mamdouh",    en: "Dear student Mamdouh" },
  name_ar:               { label: "الاسم (عربي)",              labelEn: "Name (AR)",                icon: "👤", ar: "ممدوح",                   en: "ممدوح" },
  name_en:               { label: "الاسم (إنجليزي)",           labelEn: "Name (EN)",                icon: "👤", ar: "Mamdouh",                 en: "Mamdouh" },
  fullName:              { label: "الاسم الكامل",              labelEn: "Full Name",                icon: "📝", ar: "ممدوح أحمد",               en: "Mamdouh Ahmed" },
  you_ar:                { label: "أنت / حضرتك",              labelEn: "You (AR)",                 icon: "🫵", ar: "أنت",                     en: "أنت" },
  welcome_ar:            { label: "أهلاً (عربي)",              labelEn: "Welcome (AR)",             icon: "🌟", ar: "أهلاً بك",                en: "أهلاً بك" },
  // ── Language confirmation
  selectedLanguage_ar:   { label: "اللغة المختارة (عربي)",     labelEn: "Selected Language (AR)",   icon: "🌍", ar: "العربية",                 en: "الإنجليزية" },
  selectedLanguage_en:   { label: "اللغة المختارة (إنجليزي)",  labelEn: "Selected Language (EN)",   icon: "🌍", ar: "Arabic",                  en: "English" },
  // ── Guardian
  guardianSalutation_ar: { label: "تحية ولي الأمر (عربي)",    labelEn: "Guardian Salutation (AR)", icon: "👋", ar: "عزيزي الأستاذ محمد",      en: "عزيزي الأستاذ محمد" },
  guardianSalutation_en: { label: "تحية ولي الأمر (إنجليزي)", labelEn: "Guardian Salutation (EN)", icon: "👋", ar: "Dear Mr. Mohamed",         en: "Dear Mr. Mohamed" },
  guardianSalutation:    { label: "تحية ولي الأمر",            labelEn: "Guardian Salutation",      icon: "👋", ar: "عزيزي الأستاذ محمد",      en: "Dear Mr. Mohamed" },
  studentSalutation:     { label: "تحية الطالب",               labelEn: "Student Salutation",       icon: "👋", ar: "عزيزي ممدوح",             en: "Dear Mamdouh" },
  studentGender_ar:      { label: "جنس الطالب (عربي)",         labelEn: "Student Gender (AR)",      icon: "⚧",  ar: "الابن",                   en: "الابن" },
  studentGender_en:      { label: "جنس الطالب (إنجليزي)",      labelEn: "Student Gender (EN)",      icon: "⚧",  ar: "son",                     en: "son" },
  studentName_ar:        { label: "اسم الطالب (عربي)",         labelEn: "Student Name (AR)",        icon: "👤", ar: "ممدوح",                   en: "ممدوح" },
  studentName_en:        { label: "اسم الطالب (إنجليزي)",      labelEn: "Student Name (EN)",        icon: "👤", ar: "Mamdouh",                 en: "Mamdouh" },
  studentName:           { label: "اسم الطالب",                labelEn: "Student Name",             icon: "👤", ar: "ممدوح",                   en: "Mamdouh" },
  relationship_ar:       { label: "العلاقة (عربي)",             labelEn: "Relationship (AR)",        icon: "👨‍👩‍👦", ar: "الأب",                    en: "الأب" },
  fullStudentName:       { label: "الاسم الكامل للطالب",       labelEn: "Full Student Name",        icon: "📝", ar: "ممدوح أحمد علي",          en: "Mamdouh Ahmed Ali" },
  guardianName:          { label: "اسم ولي الأمر",             labelEn: "Guardian Name",            icon: "👨", ar: "محمد",                    en: "Mohamed" },
  childTitle:            { label: "ابنك / ابنتك",              labelEn: "Child Title",              icon: "👶", ar: "ابنك",                    en: "your son" },
  enrollmentNumber:      { label: "رقم القيد",                 labelEn: "Enrollment Number",        icon: "🔢", ar: "STU-2024-001",             en: "STU-2024-001" },
  // ── Group
  salutation:            { label: "التحية",                    labelEn: "Salutation",               icon: "👋", ar: "عزيزي ممدوح",             en: "Dear Mamdouh" },
  courseName:            { label: "اسم الكورس",                labelEn: "Course Name",              icon: "📚", ar: "الإنجليزية للمبتدئين",    en: "English for Beginners" },
  groupName:             { label: "اسم المجموعة",              labelEn: "Group Name",               icon: "👥", ar: "مستوى مبتدئ A1",          en: "Beginner Level A1" },
  groupCode:             { label: "كود المجموعة",              labelEn: "Group Code",               icon: "🔤", ar: "GRP-001",                  en: "GRP-001" },
  startDate:             { label: "تاريخ البدء",               labelEn: "Start Date",               icon: "📅", ar: "الاثنين 15 مايو 2024",    en: "Monday, May 15, 2024" },
  timeTo:                { label: "وقت النهاية",               labelEn: "End Time",                 icon: "⏰", ar: "08:30 مساءً",              en: "08:30 PM" },
  timeFrom:              { label: "وقت البداية",               labelEn: "Start Time",               icon: "⏰", ar: "07:00 مساءً",              en: "07:00 PM" },
  instructor:            { label: "اسم المدرب",                labelEn: "Instructor",               icon: "👨‍🏫", ar: "أستاذ أحمد",               en: "Mr. Ahmed" },
  instructorName:        { label: "اسم المدرب",                labelEn: "Instructor Name",          icon: "👨‍🏫", ar: "أحمد",                     en: "Ahmed" },
  firstMeetingLink:      { label: "رابط أول جلسة",             labelEn: "First Meeting Link",       icon: "🔗", ar: "https://meet.google.com/abc-xyz", en: "https://meet.google.com/abc-xyz" },
  studentCount:          { label: "عدد الطلاب",                labelEn: "Student Count",            icon: "👥", ar: "8",                        en: "8" },
  // ── Session
  sessionName:           { label: "اسم الحصة",                 labelEn: "Session Name",             icon: "📘", ar: "الدرس الأول: التعارف",    en: "Lesson 1: Introduction" },
  date:                  { label: "التاريخ",                   labelEn: "Date",                     icon: "📅", ar: "الثلاثاء 20 مايو 2024",   en: "Tuesday, May 20, 2024" },
  time:                  { label: "الوقت",                     labelEn: "Time",                     icon: "⏰", ar: "07:00 - 08:30 مساءً",     en: "07:00 - 08:30 PM" },
  meetingLink:           { label: "رابط الحصة",                labelEn: "Meeting Link",             icon: "🔗", ar: "https://meet.google.com/abc-xyz", en: "https://meet.google.com/abc-xyz" },
  newDate:               { label: "التاريخ الجديد",             labelEn: "New Date",                 icon: "📅", ar: "الخميس 22 مايو 2024",     en: "Thursday, May 22, 2024" },
  newTime:               { label: "الوقت الجديد",              labelEn: "New Time",                 icon: "⏰", ar: "08:00 - 09:30 مساءً",     en: "08:00 - 09:30 PM" },
  // ── Attendance
  status:                { label: "الحالة",                    labelEn: "Status",                   icon: "📌", ar: "غائب",                    en: "Absent" },
  // ── Evaluation — NEW REPORT FORMAT
  sessionDate:           { label: "تاريخ الجلسة",              labelEn: "Session Date",             icon: "📆", ar: "30/12/2025",               en: "12/30/2025" },
  sessionNumber:         { label: "رقم الحصة",                 labelEn: "Session Number",           icon: "📑", ar: "1",                        en: "1" },
  attendanceStatus:      { label: "الحضور",                    labelEn: "Attendance Status",        icon: "👥", ar: "حاضر",                     en: "Present" },
  starsCommitment:       { label: "نجوم الالتزام والتركيز",    labelEn: "Stars: Commitment",        icon: "⭐", ar: "⭐⭐⭐⭐⭐",               en: "⭐⭐⭐⭐⭐" },
  starsUnderstanding:    { label: "نجوم مستوى الاستيعاب",     labelEn: "Stars: Understanding",     icon: "⭐", ar: "⭐⭐⭐⭐",                 en: "⭐⭐⭐⭐" },
  starsTaskExecution:    { label: "نجوم تنفيذ المهام",         labelEn: "Stars: Task Execution",    icon: "⭐", ar: "⭐⭐⭐⭐",                 en: "⭐⭐⭐⭐" },
  starsParticipation:    { label: "نجوم المشاركة داخل الحصة", labelEn: "Stars: Participation",     icon: "⭐", ar: "⭐⭐⭐⭐",                 en: "⭐⭐⭐⭐" },
  instructorComment:     { label: "تعليق المدرس",              labelEn: "Instructor Comment",       icon: "📝", ar: "أداء ممتاز، استمر هكذا!",  en: "Excellent performance, keep it up!" },
  completedSessions:     { label: "عدد الحصص المنتهية",        labelEn: "Completed Sessions",       icon: "🔢", ar: "2",                        en: "2" },
  recordingLink:         { label: "رابط التسجيل",              labelEn: "Recording Link",           icon: "🎥", ar: "🎥 رابط التسجيل: https://drive.google.com/xxx", en: "🎥 Recording: https://drive.google.com/xxx" },
  // ── Common
  feedbackLink:          { label: "رابط التقييم",              labelEn: "Feedback Link",            icon: "⭐", ar: "https://forms.gle/xyz123", en: "https://forms.gle/xyz123" },
  decision:              { label: "نتيجة التقييم",             labelEn: "Evaluation Decision",      icon: "🏆", ar: "ممتاز",                    en: "Excellent" },
};

// ─────────────────────────────────────────────────────────────
// TEMPLATE VARS MAP
// ─────────────────────────────────────────────────────────────
const TEMPLATE_VARS = {
  // ✅ رسائل الترحيب - bilingual
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

  // ✅ Evaluation — المتغيرات الجديدة بتاعت تقرير الحصة
  evaluation_pass: [
    "guardianSalutation",
    "sessionDate",
    "sessionNumber",
    "attendanceStatus",
    "starsCommitment",
    "starsUnderstanding",
    "starsTaskExecution",
    "starsParticipation",
    "instructorComment",
    "completedSessions",
    "recordingLink",
  ],
  evaluation_review: [
    "guardianSalutation",
    "sessionDate",
    "sessionNumber",
    "attendanceStatus",
    "starsCommitment",
    "starsUnderstanding",
    "starsTaskExecution",
    "starsParticipation",
    "instructorComment",
    "completedSessions",
    "recordingLink",
  ],
  evaluation_repeat: [
    "guardianSalutation",
    "sessionDate",
    "sessionNumber",
    "attendanceStatus",
    "starsCommitment",
    "starsUnderstanding",
    "starsTaskExecution",
    "starsParticipation",
    "instructorComment",
    "completedSessions",
    "recordingLink",
  ],

  // ✅ Recording link — متغيرات خاصة بيه
  session_recording: [
    "guardianSalutation",
    "guardianName",
    "childTitle",
    "studentName",
    "sessionName",
    "recordingLink",
  ],
};

// ─────────────────────────────────────────────────────────────
// FRONTEND FALLBACK TEMPLATES
// ─────────────────────────────────────────────────────────────
const FRONTEND_FALLBACKS = {

  language_confirmation: {
    ar: `✅ تم تأكيد اللغة المفضلة

{salutation_ar}،

تم تعيين *اللغة العربية* كلغة التواصل الرسمية معك.

📌 ماذا يحدث الآن؟
- جميع الرسائل القادمة ستكون بالعربية
- المحتوى التعليمي والدعم سيكون متاحاً بالعربية

نحن متحمسون لوجودك معنا! 🚀

مع أطيب التحيات،
فريق Code School 💻

🌍 شكراً لاختيارك Code School`,

    en: `✅ Language Preference Confirmed

{salutation_en},

Your preferred language has been set to *English*.

📌 What happens next?
- All future messages will be sent in English
- Course materials and support will be available in English

We're excited to have you on board! 🚀

Best regards,
The Code School Team 💻

🌍 Thank you for choosing Code School`,
  },

  guardian_language_notification: {
    ar: `{guardianSalutation_ar}،

يسعدنا إبلاغكم بأن {studentGender_ar} **{studentName_ar}** قام/ت باختيار *اللغة العربية* كلغة مفضلة للتواصل بنجاح.

📌 ماذا يعني هذا؟
- جميع الرسائل القادمة لـ{studentGender_ar} ستكون باللغة العربية

شكراً لثقتكم المستمرة في Code School.

مع أطيب التحيات،
فريق Code School 💻`,

    en: `{guardianSalutation_en},

We are pleased to inform you that your {studentGender_en} **{studentName_en}** has successfully selected *English* as their preferred communication language.

📌 What this means?
- All future messages will be sent in English

Thank you for your continued trust in Code School.

Best regards,
The Code School Team 💻`,
  },

  // ✅ evaluation_pass — شكل تقرير الحصة الجديد
  evaluation_pass: {
    ar: `{guardianSalutation}،

تقرير الحصة 📃✨
📆 التاريخ : {sessionDate}
📑 رقم الحصة : {sessionNumber}
⏱️ مدة الحصة : ساعتين
👥 الحضور : {attendanceStatus}
📊 تقييم الأداء :
⭐ الالتزام والتركيز : {starsCommitment}
⭐ مستوى الاستيعاب : {starsUnderstanding}
⭐ تنفيذ المهام : {starsTaskExecution}
⭐ المشاركة داخل الحصة : {starsParticipation}
📝 تعليق المدرس :
{instructorComment}
🔢 عدد الحصص المنتهية : {completedSessions}
{recordingLink}
🙏 نشكركم على ثقتكم في Code School
📞 للتواصل : +2 011 40 474 129`,

    en: `{guardianSalutation},

Session Report 📃✨
📆 Date : {sessionDate}
📑 Session No. : {sessionNumber}
⏱️ Duration : 2 hours
👥 Attendance : {attendanceStatus}
📊 Performance Evaluation :
⭐ Commitment & Focus : {starsCommitment}
⭐ Understanding Level : {starsUnderstanding}
⭐ Task Execution : {starsTaskExecution}
⭐ Class Participation : {starsParticipation}
📝 Instructor's Comment :
{instructorComment}
🔢 Sessions Completed : {completedSessions}
{recordingLink}
🙏 Thank you for trusting Code School
📞 Contact : +2 011 40 474 129`,
  },

  // ✅ evaluation_review — نفس الشكل
  evaluation_review: {
    ar: `{guardianSalutation}،

تقرير الحصة 📃✨
📆 التاريخ : {sessionDate}
📑 رقم الحصة : {sessionNumber}
⏱️ مدة الحصة : ساعتين
👥 الحضور : {attendanceStatus}
📊 تقييم الأداء :
⭐ الالتزام والتركيز : {starsCommitment}
⭐ مستوى الاستيعاب : {starsUnderstanding}
⭐ تنفيذ المهام : {starsTaskExecution}
⭐ المشاركة داخل الحصة : {starsParticipation}
📝 تعليق المدرس :
{instructorComment}
🔢 عدد الحصص المنتهية : {completedSessions}
{recordingLink}
🙏 نشكركم على ثقتكم في Code School
📞 للتواصل : +2 011 40 474 129`,

    en: `{guardianSalutation},

Session Report 📃✨
📆 Date : {sessionDate}
📑 Session No. : {sessionNumber}
⏱️ Duration : 2 hours
👥 Attendance : {attendanceStatus}
📊 Performance Evaluation :
⭐ Commitment & Focus : {starsCommitment}
⭐ Understanding Level : {starsUnderstanding}
⭐ Task Execution : {starsTaskExecution}
⭐ Class Participation : {starsParticipation}
📝 Instructor's Comment :
{instructorComment}
🔢 Sessions Completed : {completedSessions}
{recordingLink}
🙏 Thank you for trusting Code School
📞 Contact : +2 011 40 474 129`,
  },

  // ✅ evaluation_repeat — نفس الشكل
  evaluation_repeat: {
    ar: `{guardianSalutation}،

تقرير الحصة 📃✨
📆 التاريخ : {sessionDate}
📑 رقم الحصة : {sessionNumber}
⏱️ مدة الحصة : ساعتين
👥 الحضور : {attendanceStatus}
📊 تقييم الأداء :
⭐ الالتزام والتركيز : {starsCommitment}
⭐ مستوى الاستيعاب : {starsUnderstanding}
⭐ تنفيذ المهام : {starsTaskExecution}
⭐ المشاركة داخل الحصة : {starsParticipation}
📝 تعليق المدرس :
{instructorComment}
🔢 عدد الحصص المنتهية : {completedSessions}
{recordingLink}
🙏 نشكركم على ثقتكم في Code School
📞 للتواصل : +2 011 40 474 129`,

    en: `{guardianSalutation},

Session Report 📃✨
📆 Date : {sessionDate}
📑 Session No. : {sessionNumber}
⏱️ Duration : 2 hours
👥 Attendance : {attendanceStatus}
📊 Performance Evaluation :
⭐ Commitment & Focus : {starsCommitment}
⭐ Understanding Level : {starsUnderstanding}
⭐ Task Execution : {starsTaskExecution}
⭐ Class Participation : {starsParticipation}
📝 Instructor's Comment :
{instructorComment}
🔢 Sessions Completed : {completedSessions}
{recordingLink}
🙏 Thank you for trusting Code School
📞 Contact : +2 011 40 474 129`,
  },

  // ✅ session_recording
  session_recording: {
    ar: `{guardianSalutation}،

🎥 رابط تسجيل جلسة "{sessionName}" لـ{childTitle} *{studentName}*:

{recordingLink}

يمكن مراجعة التسجيل في أي وقت للمذاكرة والمراجعة.
فريق Code School 💻`,
    en: `{guardianSalutation},

🎥 Recording for "{sessionName}" — {childTitle} *{studentName}*:

{recordingLink}

The recording can be reviewed anytime for study and revision.
Code School Team 💻`,
  },
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const getVarExamples = (lang = "ar") => {
  const map = {};
  Object.entries(ALL_VARS).forEach(([key, v]) => {
    map["{" + key + "}"] = lang === "ar" ? v.ar : v.en;
  });
  return map;
};

const getVariablesForTemplate = (templateId, lang = "ar") => {
  const keys = TEMPLATE_VARS[templateId] || [];
  return keys
    .filter(k => ALL_VARS[k])
    .map(k => ({
      key: "{" + k + "}",
      label: lang === "ar" ? ALL_VARS[k].label : ALL_VARS[k].labelEn,
      icon: ALL_VARS[k].icon,
      example: lang === "ar" ? ALL_VARS[k].ar : ALL_VARS[k].en,
      category: k,
    }));
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
// COMPONENT
// ─────────────────────────────────────────────────────────────
export default function WhatsAppTemplatesPage() {
  const { locale } = useI18n();

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

  const textareaRef = useRef(null);
  const hintsRef    = useRef(null);
  const [hintsPos, setHintsPos] = useState({ top: 0, left: 0, right: 0 });

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
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [showHints]);

  // ── fetch ──────────────────────────────────────────────────
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
            map["language_confirmation"] = {
              ...t,
              content:   t.contentAr || t.content || "",
              contentAr: t.contentAr || t.content || "",
              contentEn: t.contentEn || t.content || "",
            };
          } else if (t.templateType === "guardian_language_confirmation") {
            map["guardian_language_notification"] = {
              ...t,
              content:   t.contentAr || t.content || "",
              contentAr: t.contentAr || t.content || "",
              contentEn: t.contentEn || t.content || "",
            };
          } else {
            map[t.templateType] = t;
          }
        });
      }

      const id = await iRes.json();
      if (id.success && id.data) {
        const d = id.data;
        map["instructor_group_activation"] = { ...d, content: d.contentAr || d.content || "", contentAr: d.contentAr || d.content || "", contentEn: d.contentEn || "" };
      }

      const gd = await gRes.json();
      if (gd.success && gd.data) {
        const d = gd.data;
        map["group_student_welcome_student"]  = { ...d, templateType: "group_student_welcome_student",  content: d.studentContentAr  || d.content || "", contentAr: d.studentContentAr  || "", contentEn: d.studentContentEn  || "" };
        map["group_student_welcome_guardian"] = { ...d, templateType: "group_student_welcome_guardian", content: d.guardianContentAr || d.content || "", contentAr: d.guardianContentAr || "", contentEn: d.guardianContentEn || "" };
      }

      const md = await mRes.json();
      if (md.success && md.data) {
        md.data.forEach(t => {
          map[t.templateType] = {
            ...t,
            content:            t.contentAr || "",
            contentAr:          t.contentAr || "",
            contentEn:          t.contentEn || "",
            isMessageTemplate:  true,
            _messageTemplateId: t._id,
          };
        });
      }

      // ✅ fallbacks لو مفيش record في DB
      Object.entries(FRONTEND_FALLBACKS).forEach(([typeId, fb]) => {
        if (!map[typeId]) {
          map[typeId] = {
            templateType:       typeId,
            content:            fb.ar,
            contentAr:          fb.ar,
            contentEn:          fb.en,
            isMessageTemplate:  !["language_confirmation", "guardian_language_notification"].includes(typeId),
            isFrontendFallback: true,
            _messageTemplateId: null,
          };
        }
      });

      setTemplates(map);
    } catch { toast.error("فشل تحميل القوالب"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTemplates(); }, []);

  // ── update content ─────────────────────────────────────────
  const updateContent = (val) => {
    const cur = templates[activeTab];
    if (!cur) return;
    setTemplates(p => ({
      ...p,
      [activeTab]: {
        ...cur,
        content:   val,
        contentAr: testLanguage === "ar" ? val : cur.contentAr,
        contentEn: testLanguage === "en" ? val : cur.contentEn,
      },
    }));
  };

  // ── save ───────────────────────────────────────────────────
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
        const dbType = activeTab === "language_confirmation"
          ? "student_language_confirmation"
          : "guardian_language_confirmation";

        if (cur.isFrontendFallback || !cur._id) {
          payload = {
            templateType: dbType,
            name:         activeTab === "language_confirmation" ? "تأكيد اللغة للطالب" : "تأكيد اللغة لولي الأمر",
            content:      cur.contentAr || cur.content,
            contentAr:    cur.contentAr || cur.content,
            contentEn:    cur.contentEn || "",
            description:  activeTab === "language_confirmation"
              ? "رسالة تأكيد اللغة للطالب - باللغة المختارة فقط"
              : "رسالة تأكيد اللغة لولي الأمر - باللغة المختارة فقط",
            isDefault: true,
            isActive:  true,
            setAsDefault: true,
          };
          const res  = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          const data = await res.json();
          if (data.success) { await fetchTemplates(); toast.success("✅ تم حفظ القالب"); }
          else toast.error(data.message || data.error || "فشل الحفظ");
          return;
        }

        payload = {
          id:        cur._id,
          content:   cur.contentAr || cur.content,
          contentAr: cur.contentAr || cur.content,
          contentEn: cur.contentEn || "",
          setAsDefault: true,
        };

      } else if (cur.isMessageTemplate) {
        endpoint = "/api/whatsapp/message-templates";
        if (cur.isFrontendFallback || !cur._messageTemplateId) {
          payload = {
            templateType: activeTab,
            contentAr:    cur.contentAr || cur.content,
            contentEn:    cur.contentEn || "",
            recipientType: "guardian",
            name:          activeTab,
            isDefault:     true,
            isActive:      true,
          };
          const res  = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          const data = await res.json();
          if (data.success) { await fetchTemplates(); toast.success("✅ تم حفظ القالب"); }
          else toast.error(data.message || data.error || "فشل الحفظ");
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
    let text = testLanguage === "ar" ? (tmpl.contentAr || tmpl.content || "") : (tmpl.contentEn || tmpl.content || "");
    const VAR_EXAMPLES = getVarExamples(testLanguage);
    Object.entries(VAR_EXAMPLES).forEach(([key, example]) => {
      text = text.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), example);
    });
    return text;
  };

  // ── insert variable ────────────────────────────────────────
  const insertVariable = (variable) => {
    const textVal   = testLanguage === "ar"
      ? (templates[activeTab]?.contentAr || templates[activeTab]?.content || "")
      : (templates[activeTab]?.contentEn || templates[activeTab]?.content || "");
    const before    = textVal.substring(0, cursorPos);
    const lastAt    = before.lastIndexOf("@");
    const insertText = variable.key;
    let newVal, newPos;
    if (lastAt !== -1) {
      newVal = textVal.substring(0, lastAt) + insertText + textVal.substring(cursorPos);
      newPos = lastAt + insertText.length;
    } else {
      newVal = textVal.substring(0, cursorPos) + insertText + textVal.substring(cursorPos);
      newPos = cursorPos + insertText.length;
    }
    updateContent(newVal);
    setShowHints(false);
    setCursorPos(newPos);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
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

  const allVars = getVariablesForTemplate(activeTab, testLanguage);

  const handleKeyDown = (e) => {
    if (!showHints) return;
    if (e.key === "ArrowDown")                       { e.preventDefault(); setSelectedHint(p => (p + 1) % allVars.length); }
    else if (e.key === "ArrowUp")                    { e.preventDefault(); setSelectedHint(p => (p - 1 + allVars.length) % allVars.length); }
    else if (e.key === "Enter" || e.key === "Tab")   { e.preventDefault(); insertVariable(allVars[selectedHint]); }
    else if (e.key === "Escape")                     { e.preventDefault(); setShowHints(false); }
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
  const curTemplate = templates[activeTab];
  const activeType  = TEMPLATE_TYPES.find(t => t.id === activeTab);
  const C           = C_MAP[activeType?.color || "violet"];
  const filtered    = TEMPLATE_TYPES.filter(t => !searchQ || t.label.includes(searchQ));
  const byCategory  = filtered.reduce((acc, t) => { if (!acc[t.category]) acc[t.category] = []; acc[t.category].push(t); return acc; }, {});
  const textVal     = testLanguage === "ar" ? (curTemplate?.contentAr || curTemplate?.content || "") : (curTemplate?.contentEn || curTemplate?.content || "");

  const isLangConfirmation = ["language_confirmation", "guardian_language_notification"].includes(activeTab);

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
                      ${isCatActive
                        ? `${C_MAP[items[0]?.color || "slate"]?.activePill || "bg-slate-500 text-white"} shadow-sm`
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                    <span>{cat.emoji}</span>
                    <span className="hidden sm:inline">{cat.label}</span>
                    <span className={`hidden sm:inline text-[10px] px-1 py-0.5 rounded-full ${isCatActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                      {items.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 flex-shrink-0" />

          {/* Language Toggle */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex-shrink-0">
            {["ar","en"].map(lang => (
              <button key={lang} onClick={() => setTestLanguage(lang)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all
                  ${testLanguage === lang ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"}`}>
                {lang === "ar" ? "🇸🇦 عربي" : "🇬🇧 EN"}
              </button>
            ))}
          </div>

          <button onClick={fetchTemplates} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 flex-shrink-0">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-nav */}
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
      </header>

      {/* ══════ MAIN ══════ */}
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
                {isLangConfirmation && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800">
                    🌍 باللغة المختارة فقط
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {activeType.type.includes("student")    && <span className={`text-[10px] px-2 py-0.5 rounded-full ${C.light} ${C.text} border ${C.border}`}>👤 للطالب</span>}
                {activeType.type.includes("guardian")   && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">👨‍👩‍👧 لولي الأمر</span>}
                {activeType.type.includes("instructor") && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">👨‍🏫 للمدرب</span>}
                {activeType.type.includes("group")      && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">👥 بيانات المجموعة</span>}
                {activeType.type.includes("session")    && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">📅 بيانات الحصة</span>}
                <span className="text-[10px] text-slate-400">{allVars.length} متغير</span>
                {isLangConfirmation && (
                  <span className="text-[10px] text-slate-400">
                    • {testLanguage === "ar" ? "يُعرض لمن اختار العربية" : "يُعرض لمن اختار الإنجليزية"}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {isLangConfirmation && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10 mb-4">
            <Globe className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                🌍 قالب باللغة المختارة فقط
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                هذا القالب بيتبعت <strong>باللغة اللي اختارها الطالب فعلاً</strong>. عدّل النسخة العربية (🇸🇦) ليتبعت لمن اختار عربي، والإنجليزية (🇬🇧) لمن اختار إنجليزي بشكل مستقل.
              </p>
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
                  <span className={`text-xs font-bold ${C.text}`}>تحرير القالب {testLanguage === "ar" ? "🇸🇦 عربي" : "🇬🇧 English"}</span>
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
                      <span className={`text-[10px] font-bold ${C.text}`}>
                        {testLanguage === "ar" ? "اختر متغيراً — سيُدرج مثاله في النص" : "Choose a variable — its example will be inserted"}
                      </span>
                    </div>
                    <div className="max-h-60 overflow-y-auto no-scrollbar">
                      {allVars.map((v, gIdx) => (
                        <button key={v.key} onClick={() => insertVariable(v)}
                          className={`w-full px-3 py-2.5 flex items-center gap-3 text-right transition-colors
                            ${gIdx === selectedHint ? C.light : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                          <span className="text-base flex-shrink-0">{v.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[10px] font-mono ${C.text} font-bold`}>{v.key}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">{v.label}</span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-1">
                              <span className="text-[9px] text-slate-400">{testLanguage === "ar" ? "يُدرج:" : "inserts:"}</span>
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
                  {testLanguage === "ar" ? "الـ @ يُدرج القيمة في النص والمعاينة" : "@ inserts the value into the text and preview"}
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
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {testLanguage === "ar" ? "إدراج سريع — انقر للإدراج في موضع الكرسر" : "Quick Insert — click to insert at cursor position"}
                  </span>
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

          {/* ── RIGHT ── */}
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

            {/* Variables reference */}
            {allVars.length > 0 && (
              <div className="bg-white dark:bg-[#161b27] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${C.light} ${C.border}`}>
                  <Zap className={`w-3.5 h-3.5 ${C.text}`} />
                  <span className={`text-xs font-bold ${C.text}`}>{testLanguage === "ar" ? "المتغيرات وأمثلتها" : "Variables & Examples"}</span>
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
                          <span className="text-[9px] text-slate-400">{testLanguage === "ar" ? "مثال:" : "example:"}</span>
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
                    <li>• اكتب @ لعرض المتغيرات — النقر يُدرج المثال بلغة القالب الحالية</li>
                    <li>• المعاينة تعرض القيم بنفس لغة القالب المحدد</li>
                    <li>• النقطة الخضراء = يوجد محتوى محفوظ للقالب</li>
                    <li>• عدّل العربي والإنجليزي بشكل مستقل</li>
                    {isLangConfirmation && <li>• 🌍 هذا القالب بيتبعت باللغة المختارة من الطالب فقط</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}