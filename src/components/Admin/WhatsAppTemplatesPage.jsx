"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageCircle, Eye, Save, RefreshCw, Send, User, Users, Globe,
  Loader2, Zap, CheckCircle, XCircle, AlertCircle, Sparkles,
  Edit, Clock, Bell, Calendar, Award, FileText,
  UserPlus, UserCog, Search, Star, RotateCcw, Video,
  Settings, ChevronDown, ChevronUp, Check, X,
  BookOpen, Menu, Info, MapPin, Car,
  Coins, AlertTriangle, Gift,
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const SINGLE_CONTENT_TEMPLATES = ["student_welcome", "guardian_notification"];

const TEMPLATE_TYPES = [
  { id: "student_welcome", label: "ترحيب الطالب", icon: User, color: "primary", emoji: "🎓", category: "basic", type: "student_only", api: "whatsapp" },
  { id: "guardian_notification", label: "إشعار ولي الأمر", icon: Users, color: "secondary", emoji: "👨‍👩‍👧", category: "basic", type: "guardian_only", api: "whatsapp" },
  { id: "language_confirmation", label: "تأكيد اللغة", icon: Globe, color: "emerald", emoji: "🌍", category: "basic", type: "student_only", api: "whatsapp" },
  { id: "guardian_language_notification", label: "إشعار اللغة لولي الأمر", icon: Bell, color: "accent", emoji: "📢", category: "basic", type: "guardian_only", api: "whatsapp" },
  { id: "group_student_welcome_student", label: "ترحيب الطالب بالمجموعة (Online)", icon: UserPlus, color: "indigo", emoji: "➕", category: "group", type: "student_with_group", api: "group", isNew: true },
  { id: "group_student_welcome_guardian", label: "إشعار ولي الأمر بالمجموعة (Online)", icon: Users, color: "indigo", emoji: "👨‍👩‍👧", category: "group", type: "guardian_with_group", api: "group", isNew: true },
  { id: "group_student_welcome_student_offline", label: "ترحيب الطالب بالمجموعة (Offline)", icon: MapPin, color: "amber", emoji: "📍", category: "group", type: "student_with_group", api: "group", isNew: true },
  { id: "group_student_welcome_guardian_offline", label: "إشعار ولي الأمر بالمجموعة (Offline)", icon: MapPin, color: "amber", emoji: "📍", category: "group", type: "guardian_with_group", api: "group", isNew: true },
  { id: "instructor_group_activation", label: "إشعار تفعيل مجموعة للمدرب (Online)", icon: UserCog, color: "amber", emoji: "👨‍🏫", category: "instructor", type: "instructor_only", api: "instructor", isNew: true },
  { id: "instructor_group_activation_offline", label: "إشعار تفعيل مجموعة للمدرب (Offline)", icon: MapPin, color: "amber", emoji: "📍", category: "instructor", type: "instructor_only", api: "instructor", isNew: true },
  { id: "reminder_24h_student", label: "تذكير الطالب 24 ساعة", icon: Clock, color: "sky", emoji: "⏰", category: "reminder", type: "student_with_session", api: "message" },
  { id: "reminder_24h_guardian", label: "تذكير ولي الأمر 24 ساعة", icon: Clock, color: "sky", emoji: "⏰", category: "reminder", type: "guardian_with_session", api: "message" },
  { id: "reminder_15min_student", label: "تذكير الطالب قبل 15 دقيقة", icon: Clock, color: "accent", emoji: "⏳", category: "reminder", type: "student_with_session", api: "message" },
  { id: "reminder_15min_guardian", label: "تذكير ولي الأمر قبل 15 دقيقة", icon: Clock, color: "accent", emoji: "⏳", category: "reminder", type: "guardian_with_session", api: "message" },
  { id: "session_cancelled_student", label: "إلغاء حصة - الطالب", icon: XCircle, color: "rose", emoji: "❌", category: "session", type: "student_with_session", api: "message" },
  { id: "session_cancelled_guardian", label: "إلغاء حصة - ولي الأمر", icon: XCircle, color: "rose", emoji: "❌", category: "session", type: "guardian_with_session", api: "message" },
  { id: "session_postponed_student", label: "تأجيل حصة - الطالب", icon: Calendar, color: "accent", emoji: "🔄", category: "session", type: "student_with_session", api: "message" },
  { id: "session_postponed_guardian", label: "تأجيل حصة - ولي الأمر", icon: Calendar, color: "accent", emoji: "🔄", category: "session", type: "guardian_with_session", api: "message" },
  { id: "absence_notification", label: "إشعار غياب - ولي الأمر", icon: AlertCircle, color: "rose", emoji: "📋", category: "attendance", type: "guardian_with_session", api: "message" },
  { id: "late_notification", label: "إشعار تأخير - ولي الأمر", icon: Clock, color: "accent", emoji: "⏰", category: "attendance", type: "guardian_with_session", api: "message" },
  { id: "excused_notification", label: "إشعار غياب بعذر - ولي الأمر", icon: FileText, color: "secondary", emoji: "📝", category: "attendance", type: "guardian_with_session", api: "message" },
  { id: "group_completion_student", label: "إكمال المجموعة - الطالب", icon: Award, color: "secondary", emoji: "🎉", category: "completion", type: "student_with_group", api: "message" },
  { id: "group_completion_guardian", label: "إكمال المجموعة - ولي الأمر", icon: Award, color: "secondary", emoji: "🎉", category: "completion", type: "guardian_with_group", api: "message" },
  { id: "evaluation_pass", label: "تقييم: ممتاز", icon: Star, color: "primary", emoji: "✅", category: "evaluation", type: "guardian_with_session", api: "message" },
  { id: "evaluation_review", label: "تقييم: يحتاج مراجعة", icon: FileText, color: "accent", emoji: "⚠️", category: "evaluation", type: "guardian_with_session", api: "message" },
  { id: "evaluation_repeat", label: "تقييم: يحتاج دعم إضافي", icon: RotateCcw, color: "rose", emoji: "🔄", category: "evaluation", type: "guardian_with_session", api: "message" },
  { id: "session_recording", label: "رابط التسجيل", icon: Video, color: "sky", emoji: "🎥", category: "evaluation", type: "guardian_with_session", api: "message" },
  { id: "learning_supervisor_intro", label: "تقديم المشرف الأكاديمي", icon: User, color: "primary", emoji: "👨‍🏫", category: "basic", type: "guardian_only", api: "message", isNew: true },
  { id: "module_overview", label: "نظرة عامة على الموديول", icon: BookOpen, color: "secondary", emoji: "📚", category: "basic", type: "guardian_only", api: "message", isNew: true },
  { id: "instructor_reminder_24h", label: "تذكير المدرب 24 ساعة (Online)", icon: Clock, color: "sky", emoji: "⏰", category: "instructor", type: "instructor_only", api: "instructor", isNew: true },
  { id: "instructor_reminder_15min", label: "تذكير المدرب 15 دقيقة (Online)", icon: Clock, color: "accent", emoji: "⏳", category: "instructor", type: "instructor_only", api: "instructor", isNew: true },

  // ═══════════════════════════════════════════════════════════════
  // ✅ OFFLINE FLOW — Student & Guardian
  // ═══════════════════════════════════════════════════════════════
  { id: "reminder_24h_offline_student", label: "تذكير الطالب 24 ساعة (Offline)", icon: MapPin, color: "amber", emoji: "📍", category: "offline", type: "student_with_session", api: "message", isNew: true },
  { id: "reminder_24h_offline_guardian", label: "تذكير ولي الأمر 24 ساعة (Offline)", icon: MapPin, color: "amber", emoji: "📍", category: "offline", type: "guardian_with_session", api: "message", isNew: true },
  { id: "reminder_30min_offline_student", label: "تنبيه الطالب قبل 30 دقيقة (Drop-off)", icon: Car, color: "amber", emoji: "🚗", category: "offline", type: "student_with_session", api: "message", isNew: true },
  { id: "reminder_30min_offline_guardian", label: "تنبيه ولي الأمر قبل 30 دقيقة (Drop-off)", icon: Car, color: "amber", emoji: "🚗", category: "offline", type: "guardian_with_session", api: "message", isNew: true },
  { id: "pre_attendance_ping_student", label: "Pre-Attendance Ping - الطالب", icon: Bell, color: "amber", emoji: "✅", category: "offline", type: "student_with_session", api: "message", isNew: true },
  { id: "pre_attendance_ping_guardian", label: "Pre-Attendance Ping - ولي الأمر", icon: Bell, color: "amber", emoji: "✅", category: "offline", type: "guardian_with_session", api: "message", isNew: true },

  // ═══════════════════════════════════════════════════════════════
  // ✅ OFFLINE FLOW — Instructor
  // ═══════════════════════════════════════════════════════════════
  { id: "instructor_reminder_24h_offline", label: "تذكير المدرب 24 ساعة (Offline)", icon: MapPin, color: "amber", emoji: "📍", category: "instructor", type: "instructor_only", api: "instructor", isNew: true },
  { id: "instructor_reminder_30min_offline", label: "تنبيه المدرب قبل 30 دقيقة (Offline)", icon: Car, color: "amber", emoji: "🚗", category: "instructor", type: "instructor_only", api: "instructor", isNew: true },
  { id: "instructor_pre_attendance_ping", label: "Pre-Attendance Ping - المدرب", icon: Bell, color: "amber", emoji: "✅", category: "instructor", type: "instructor_only", api: "instructor", isNew: true },

  // ── Portfolio ──
  { id: "portfolio_inactivity_reminder", label: "تذكير عدم تحديث البورتفوليو", icon: RefreshCw, color: "amber", emoji: "💼", category: "portfolio", type: "portfolio_owner_only", api: "message", isNew: true },
  { id: "portfolio_update_broadcast", label: "إعلان تحديث النظام", icon: Zap, color: "secondary", emoji: "📢", category: "portfolio", type: "portfolio_owner_only", api: "message", isNew: true },
  { id: "portfolio_contact_form_notification", label: "إشعار رسالة Contact Form", icon: MessageCircle, color: "sky", emoji: "📩", category: "portfolio", type: "portfolio_owner_only", api: "message", isNew: true },

  // ── Billing ──
  { id: "credit_low_balance_4h_student", label: "تنبيه رصيد منخفض (4 ساعات) - الطالب", icon: Coins, color: "amber", emoji: "🟡", category: "billing", type: "student_only", api: "message", isNew: true },
  { id: "credit_low_balance_4h_guardian", label: "تنبيه رصيد منخفض (4 ساعات) - ولي الأمر", icon: Coins, color: "amber", emoji: "🟡", category: "billing", type: "guardian_only", api: "message", isNew: true },
  { id: "credit_low_balance_2h_student", label: "تنبيه رصيد عاجل (2 ساعة) - الطالب", icon: AlertTriangle, color: "rose", emoji: "🔴", category: "billing", type: "student_only", api: "message", isNew: true },
  { id: "credit_low_balance_2h_guardian", label: "تنبيه رصيد عاجل (2 ساعة) - ولي الأمر", icon: AlertTriangle, color: "rose", emoji: "🔴", category: "billing", type: "guardian_only", api: "message", isNew: true },

  // ═══════════════════════════════════════════════════════════════
  // 🎁 MAKE-UP SESSION (الحصة التعويضية) — Online + Offline
  // ═══════════════════════════════════════════════════════════════
  { id: "makeup_session_student", label: "حصة تعويضية - الطالب", icon: Gift, color: "primary", emoji: "🎁", category: "makeup", type: "student_only", api: "message", isNew: true },
  { id: "makeup_session_guardian", label: "حصة تعويضية - ولي الأمر", icon: Gift, color: "primary", emoji: "🎁", category: "makeup", type: "guardian_only", api: "message", isNew: true },
  { id: "makeup_session_instructor", label: "حصة تعويضية - المدرب", icon: Gift, color: "primary", emoji: "🎁", category: "makeup", type: "instructor_only", api: "instructor", isNew: true },
  { id: "makeup_session_student_offline", label: "حصة تعويضية - الطالب (Offline)", icon: Gift, color: "amber", emoji: "🎁", category: "makeup", type: "student_only", api: "message", isNew: true },
  { id: "makeup_session_guardian_offline", label: "حصة تعويضية - ولي الأمر (Offline)", icon: Gift, color: "amber", emoji: "🎁", category: "makeup", type: "guardian_only", api: "message", isNew: true },
  { id: "makeup_session_instructor_offline", label: "حصة تعويضية - المدرب (Offline)", icon: Gift, color: "amber", emoji: "🎁", category: "makeup", type: "instructor_only", api: "instructor", isNew: true },
];

const CATEGORIES = {
  basic: { label: "أساسية", emoji: "📌" },
  group: { label: "المجموعات", emoji: "👥" },
  instructor: { label: "المدربين", emoji: "👨‍🏫" },
  reminder: { label: "التذكيرات (Online)", emoji: "⏰" },
  offline: { label: "Offline - الحصص الحضورية", emoji: "📍" },
  session: { label: "الحصص", emoji: "📅" },
  attendance: { label: "الحضور", emoji: "📋" },
  completion: { label: "الإكمال", emoji: "🎉" },
  evaluation: { label: "التقييم", emoji: "⭐" },
  billing: { label: "الرصيد والباقات", emoji: "💳" },
  makeup: { label: "الحصص التعويضية", emoji: "🎁" },
  portfolio: { label: "البورتفوليو", emoji: "💼" },
};

const VAR_GROUPS = {
  student: { label: "الطالب", emoji: "👤" },
  guardian: { label: "ولي الأمر", emoji: "👨‍👩‍👧" },
  instructor: { label: "المدرب", emoji: "👨‍🏫" },
  group: { label: "المجموعة", emoji: "👥" },
  session: { label: "الحصة", emoji: "📅" },
  attendance: { label: "الحضور", emoji: "📋" },
  reminder: { label: "التذكيرات", emoji: "⏰" },
  completion: { label: "الإكمال", emoji: "🎉" },
  evaluation: { label: "التقييم", emoji: "⭐" },
  common: { label: "عامة", emoji: "📌" },
  portfolio: { label: "البورتفوليو", emoji: "💼" },
  offline: { label: "Offline (الموقع)", emoji: "📍" },
  billing: { label: "الرصيد والباقة", emoji: "💳" },
  makeup: { label: "الحصة التعويضية", emoji: "🎁" },
};

const TEMPLATE_VARS = {
  student_welcome: ["salutation_ar", "salutation_en", "welcome_ar", "name_ar", "name_en", "fullName", "you_ar"],
  guardian_notification: ["guardianSalutation_ar", "studentGender_ar", "studentName_ar", "studentName_en", "relationship_ar", "fullStudentName"],
  language_confirmation: ["salutation_ar", "salutation_en", "name_ar", "name_en", "selectedLanguage_ar", "selectedLanguage_en"],
  guardian_language_notification: ["guardianSalutation_ar", "guardianSalutation_en", "studentGender_ar", "studentGender_en", "studentName_ar", "studentName_en", "selectedLanguage_ar", "selectedLanguage_en"],
  group_student_welcome_student: ["salutation_ar", "salutation_en", "courseName", "groupName", "startDate", "timeTo", "timeFrom", "instructor", "firstMeetingLink", "studentName"],
  group_student_welcome_guardian: ["guardianSalutation_ar", "guardianSalutation_en", "childTitle", "studentName", "courseName", "groupName", "startDate", "timeTo", "timeFrom", "instructor", "firstMeetingLink"],
  group_student_welcome_student_offline: ["salutation_ar", "salutation_en", "courseName", "groupName", "startDate", "timeTo", "timeFrom", "instructor", "placeName", "address", "mapsLink", "studentName"],
  group_student_welcome_guardian_offline: ["guardianSalutation_ar", "guardianSalutation_en", "childTitle", "studentName", "courseName", "groupName", "startDate", "timeTo", "timeFrom", "instructor", "placeName", "address", "mapsLink"],
  instructor_group_activation: ["salutation", "courseName", "groupName", "startDate", "timeTo", "timeFrom", "instructorName", "studentCount", "meetingLink"],
  instructor_group_activation_offline: ["salutation", "courseName", "groupName", "startDate", "timeTo", "timeFrom", "instructorName", "studentCount", "placeName", "address", "mapsLink"],
  reminder_24h_student: ["salutation_ar", "salutation_en", "sessionName", "sessionDescription", "date", "time", "meetingLink", "guardianSalutation", "studentName", "guardianName", "childTitle", "enrollmentNumber"],
  reminder_24h_guardian: ["guardianSalutation", "salutation_ar", "salutation_en", "studentName", "guardianName", "childTitle", "sessionDescription", "groupName", "groupCode", "courseName", "enrollmentNumber", "feedbackLink"],
  reminder_15min_student: ["salutation_ar", "salutation_en", "sessionName", "sessionDescription", "time", "meetingLink", "guardianSalutation", "studentName", "childTitle", "enrollmentNumber"],
  reminder_15min_guardian: ["guardianSalutation", "salutation_ar", "salutation_en", "studentName", "guardianName", "childTitle", "sessionName", "sessionDescription", "date", "time", "meetingLink", "enrollmentNumber"],
  session_cancelled_student: ["guardianSalutation", "salutation_ar", "salutation_en", "studentName", "guardianName", "childTitle", "sessionName", "date", "time", "meetingLink", "enrollmentNumber"],
  session_cancelled_guardian: ["guardianSalutation", "salutation_ar", "salutation_en", "guardianName", "childTitle", "sessionName", "date", "time", "meetingLink", "enrollmentNumber"],
  session_postponed_student: ["guardianSalutation", "salutation_ar", "salutation_en", "studentName", "guardianName", "childTitle", "sessionName", "date", "time", "meetingLink", "enrollmentNumber", "newDate", "newTime"],
  session_postponed_guardian: ["guardianSalutation", "salutation_ar", "salutation_en", "studentName", "guardianName", "childTitle", "sessionName", "date", "time", "meetingLink", "enrollmentNumber", "newDate", "newTime"],
  absence_notification: ["guardianSalutation", "guardianName", "studentName", "childTitle", "status", "sessionName", "date", "time", "enrollmentNumber", "salutation_ar", "salutation_en"],
  late_notification: ["guardianSalutation", "guardianName", "studentName", "childTitle", "status", "sessionName", "date", "time", "enrollmentNumber", "salutation_ar", "salutation_en"],
  excused_notification: ["guardianSalutation", "guardianName", "studentName", "childTitle", "status", "sessionName", "date", "time", "enrollmentNumber", "salutation_ar", "salutation_en"],
  group_completion_student: ["salutation_ar", "salutation_en", "guardianSalutation", "studentName", "guardianName", "childTitle", "groupName", "groupCode", "courseName", "enrollmentNumber", "feedbackLink", "totalSessions", "completionDate"],
  group_completion_guardian: ["salutation_ar", "salutation_en", "guardianSalutation", "studentName", "guardianName", "childTitle", "groupName", "groupCode", "courseName", "enrollmentNumber", "feedbackLink", "totalSessions", "completionDate"],
  evaluation_pass: ["guardianSalutation", "sessionDate", "sessionNumber", "attendanceStatus", "starsCommitment", "starsUnderstanding", "starsTaskExecution", "starsParticipation", "instructorComment", "completedSessions", "recordingLink", "supervisorName", "moduleTitle", "moduleDescription"],
  evaluation_review: ["guardianSalutation", "sessionDate", "sessionNumber", "attendanceStatus", "starsCommitment", "starsUnderstanding", "starsTaskExecution", "starsParticipation", "instructorComment", "completedSessions", "recordingLink", "supervisorName", "moduleTitle", "moduleDescription"],
  evaluation_repeat: ["guardianSalutation", "sessionDate", "sessionNumber", "attendanceStatus", "starsCommitment", "starsUnderstanding", "starsTaskExecution", "starsParticipation", "instructorComment", "completedSessions", "recordingLink", "supervisorName", "moduleTitle", "moduleDescription"],
  session_recording: ["guardianSalutation", "guardianName", "childTitle", "studentName", "sessionName", "recordingLink"],
  instructor_reminder_24h: ["instructorSalutation", "sessionName", "sessionDescription", "date", "time", "meetingLink", "username", "password", "groupName", "studentCount"],
  instructor_reminder_15min: ["instructorSalutation", "sessionName", "sessionDescription", "time", "meetingLink", "username", "password", "groupName"],
  reminder_24h_offline_student: ["salutation_ar", "salutation_en", "sessionName", "date", "time", "placeName", "address", "mapsLink"],
  reminder_24h_offline_guardian: ["guardianSalutation", "childTitle", "studentName", "sessionName", "date", "time", "placeName", "address", "mapsLink"],
  reminder_30min_offline_student: ["salutation_ar", "salutation_en", "sessionName", "time", "placeName", "mapsLink"],
  reminder_30min_offline_guardian: ["guardianSalutation", "childTitle", "studentName", "sessionName", "time", "placeName", "mapsLink"],
  pre_attendance_ping_student: ["salutation_ar", "salutation_en", "sessionName"],
  pre_attendance_ping_guardian: ["guardianSalutation", "childTitle", "studentName", "sessionName"],
  instructor_reminder_24h_offline: ["instructorSalutation", "sessionName", "date", "time", "placeName", "address", "mapsLink", "groupName", "studentCount"],
  instructor_reminder_30min_offline: ["instructorSalutation", "sessionName", "time", "placeName", "mapsLink", "groupName"],
  instructor_pre_attendance_ping: ["instructorSalutation", "sessionName"],
  learning_supervisor_intro: ["guardianSalutation", "childTitle", "studentName", "supervisorName"],
  module_overview: ["guardianSalutation", "childTitle", "studentName", "moduleTitle", "moduleDescription", "supervisorName"],
  portfolio_inactivity_reminder: ["ownerWelcome", "ownerName", "portfolioLink"],
  portfolio_update_broadcast: ["ownerName", "updateLink"],
  portfolio_contact_form_notification: ["ownerSalutation", "ownerName", "dashboardLink"],
  credit_low_balance_4h_student: ["salutation_ar", "salutation_en", "remainingHours", "packageName"],
  credit_low_balance_4h_guardian: ["guardianSalutation", "childTitle", "studentName", "remainingHours", "packageName"],
  credit_low_balance_2h_student: ["salutation_ar", "salutation_en", "remainingHours", "packageName"],
  credit_low_balance_2h_guardian: ["guardianSalutation", "childTitle", "studentName", "remainingHours", "packageName"],

  // 🎁 Make-up (Online)
  makeup_session_student: ["studentSalutation", "studentName", "courseName", "groupName", "groupCode", "originalDate", "originalTime", "originalSessionTitle", "newDate", "newTime", "newSessionTitle", "meetingLink", "instructorName"],
  makeup_session_guardian: ["guardianSalutation", "guardianName", "childTitle", "studentName", "courseName", "groupName", "groupCode", "originalDate", "originalTime", "newDate", "newTime", "meetingLink", "instructorName"],
  makeup_session_instructor: ["instructorSalutation", "instructorName", "studentName", "courseName", "groupName", "groupCode", "originalDate", "originalTime", "originalSessionTitle", "newDate", "newTime", "meetingLink"],

  // 🎁 Make-up (Offline)
  makeup_session_student_offline: ["studentSalutation", "studentName", "courseName", "groupName", "groupCode", "originalDate", "originalTime", "originalSessionTitle", "newDate", "newTime", "newSessionTitle", "placeName", "address", "mapsLink", "instructorName"],
  makeup_session_guardian_offline: ["guardianSalutation", "guardianName", "childTitle", "studentName", "courseName", "groupName", "groupCode", "originalDate", "originalTime", "newDate", "newTime", "placeName", "address", "mapsLink", "instructorName"],
  makeup_session_instructor_offline: ["instructorSalutation", "instructorName", "studentName", "courseName", "groupName", "groupCode", "originalDate", "originalTime", "originalSessionTitle", "newDate", "newTime", "placeName", "address", "mapsLink"],
};

const FRONTEND_FALLBACKS = {
  language_confirmation: {
    ar: `✅ تم تأكيد اللغة المفضلة\n\n{salutation_ar}،\n\nتم تعيين *اللغة العربية* كلغة التواصل الرسمية معك.\n\n📌 ماذا يحدث الآن؟\n- جميع الرسائل القادمة ستكون بالعربية\n- المحتوى التعليمي والدعم سيكون متاحاً بالعربية\n\nنحن متحمسون لوجودك معنا! 🚀\n\nمع أطيب التحيات،\nفريق Code School 💻\n\n🌍 شكراً لاختيارك Code School`,
    en: `✅ Language Preference Confirmed\n\n{salutation_en},\n\nYour preferred language has been set to *English*.\n\n📌 What happens next?\n- All future messages will be sent in English\n- Course materials and support will be available in English\n\nWe're excited to have you on board! 🚀\n\nBest regards,\nThe Code School Team 💻\n\n🌍 Thank you for choosing Code School`,
  },
  group_student_welcome_student: {
    ar: `{salutation_ar}،\n\nيسرنا إعلامك بأنه تم تسجيلك بنجاح في Code School! 🎉\n\n📘 البرنامج: {courseName}\n👥 المجموعة: {groupName}\n📅 تاريخ البدء: {startDate}\n⏰ الموعد: {timeFrom} – {timeTo}\n👨‍🏫 المدرب: {instructor}\n🔗 رابط الجلسة الأولى: {firstMeetingLink}\n\nمتحمسون لبدء رحلتك التعليمية معنا! 🚀\n\nمع أطيب التحيات،\nفريق Code School 💻`,
    en: `{salutation_en},\n\nWe are pleased to confirm your enrollment at Code School! 🎉\n\n📘 Program: {courseName}\n👥 Group: {groupName}\n📅 Start Date: {startDate}\n⏰ Schedule: {timeFrom} – {timeTo}\n👨‍🏫 Instructor: {instructor}\n🔗 First Session Link: {firstMeetingLink}\n\nExcited to start your learning journey with us! 🚀\n\nBest regards,\nCode School Team 💻`,
  },
  group_student_welcome_guardian: {
    ar: `{guardianSalutation_ar}،\n\nيسرنا إعلامكم بأنه تم تسجيل {childTitle} {studentName} بنجاح في Code School! 🎉\n\n📘 البرنامج: {courseName}\n👥 المجموعة: {groupName}\n📅 تاريخ البدء: {startDate}\n⏰ الموعد: {timeFrom} – {timeTo}\n👨‍🏫 المدرب: {instructor}\n🔗 رابط الجلسة الأولى: {firstMeetingLink}\n\nنتطلع لرؤية تقدم {studentName} معنا! 🚀\n\nمع أطيب التحيات،\nفريق Code School 💻`,
    en: `{guardianSalutation_en},\n\nWe are pleased to inform you that {childTitle} {studentName} has been successfully enrolled at Code School! 🎉\n\n📘 Program: {courseName}\n👥 Group: {groupName}\n📅 Start Date: {startDate}\n⏰ Schedule: {timeFrom} – {timeTo}\n👨‍🏫 Instructor: {instructor}\n🔗 First Session Link: {firstMeetingLink}\n\nWe look forward to seeing {studentName}'s progress! 🚀\n\nBest regards,\nCode School Team 💻`,
  },
  group_student_welcome_student_offline: {
    ar: `{salutation_ar}،\n\nيسرنا إعلامك بأنه تم تسجيلك بنجاح في Code School! 🎉\n\n📘 البرنامج: {courseName}\n👥 المجموعة: {groupName}\n📅 تاريخ البدء: {startDate}\n⏰ الموعد: {timeFrom} – {timeTo}\n👨‍🏫 المدرب: {instructor}\n\n📍 المكان: {placeName}\n📌 العنوان: {address}\n🗺️ اللوكيشن: {mapsLink}\n\nمتحمسون لبدء رحلتك التعليمية معنا! 🚀\n\nمع أطيب التحيات،\nفريق Code School 💻`,
    en: `{salutation_en},\n\nWe are pleased to confirm your enrollment at Code School! 🎉\n\n📘 Program: {courseName}\n👥 Group: {groupName}\n📅 Start Date: {startDate}\n⏰ Schedule: {timeFrom} – {timeTo}\n👨‍🏫 Instructor: {instructor}\n\n📍 Location: {placeName}\n📌 Address: {address}\n🗺️ Maps: {mapsLink}\n\nExcited to start your learning journey with us! 🚀\n\nBest regards,\nCode School Team 💻`,
  },
  group_student_welcome_guardian_offline: {
    ar: `{guardianSalutation_ar}،\n\nيسرنا إعلامكم بأنه تم تسجيل {childTitle} {studentName} بنجاح في Code School! 🎉\n\n📘 البرنامج: {courseName}\n👥 المجموعة: {groupName}\n📅 تاريخ البدء: {startDate}\n⏰ الموعد: {timeFrom} – {timeTo}\n👨‍🏫 المدرب: {instructor}\n\n📍 المكان: {placeName}\n📌 العنوان: {address}\n🗺️ اللوكيشن: {mapsLink}\n\nنتطلع لرؤية تقدم {studentName} معنا! 🚀\n\nمع أطيب التحيات،\nفريق Code School 💻`,
    en: `{guardianSalutation_en},\n\nWe are pleased to inform you that {childTitle} {studentName} has been successfully enrolled at Code School! 🎉\n\n📘 Program: {courseName}\n👥 Group: {groupName}\n📅 Start Date: {startDate}\n⏰ Schedule: {timeFrom} – {timeTo}\n👨‍🏫 Instructor: {instructor}\n\n📍 Location: {placeName}\n📌 Address: {address}\n🗺️ Maps: {mapsLink}\n\nWe look forward to seeing {studentName}'s progress! 🚀\n\nBest regards,\nCode School Team 💻`,
  },
  guardian_language_notification: {
    ar: `{guardianSalutation_ar}،\n\nيسعدنا إبلاغكم بأن {studentGender_ar} **{studentName_ar}** قام/ت باختيار *اللغة العربية* كلغة مفضلة للتواصل بنجاح.\n\n📌 ماذا يعني هذا؟\n- جميع الرسائل القادمة لـ{studentGender_ar} ستكون باللغة العربية\n\nشكراً لثقتكم المستمرة في Code School.\n\nمع أطيب التحيات،\nفريق Code School 💻`,
    en: `{guardianSalutation_en},\n\nWe are pleased to inform you that your {studentGender_en} **{studentName_en}** has successfully selected *English* as their preferred communication language.\n\n📌 What this means?\n- All future messages will be sent in English\n\nThank you for your continued trust in Code School.\n\nBest regards,\nThe Code School Team 💻`,
  },
  evaluation_pass: {
    ar: `{guardianSalutation}،\n\nتقرير الحصة 📃✨\n📆 التاريخ : {sessionDate}\n📑 رقم الحصة : {sessionNumber}\n⏱️ مدة الحصة : ساعتين\n👥 الحضور : {attendanceStatus}\n📊 تقييم الأداء :\n⭐ الالتزام والتركيز : {starsCommitment}\n⭐ مستوى الاستيعاب : {starsUnderstanding}\n⭐ تنفيذ المهام : {starsTaskExecution}\n⭐ المشاركة داخل الحصة : {starsParticipation}\n📝 تعليق المدرس :\n{instructorComment}\n🔢 عدد الحصص المنتهية : {completedSessions}\n{recordingLink}\n🏆 النتيجة : {evaluationDecision}\n🙏 نشكركم على ثقتكم في Code School\n📞 للتواصل : +2 011 40 474 129`,
    en: `{guardianSalutation},\n\nSession Report 📃✨\n📆 Date : {sessionDate}\n📑 Session No. : {sessionNumber}\n⏱️ Duration : 2 hours\n👥 Attendance : {attendanceStatus}\n📊 Performance Evaluation :\n⭐ Commitment & Focus : {starsCommitment}\n⭐ Understanding Level : {starsUnderstanding}\n⭐ Task Execution : {starsTaskExecution}\n⭐ Class Participation : {starsParticipation}\n📝 Instructor's Comment :\n{instructorComment}\n🔢 Sessions Completed : {completedSessions}\n{recordingLink}\n🏆 Result : {evaluationDecision}\n🙏 Thank you for trusting Code School\n📞 Contact : +2 011 40 474 129`,
  },
  evaluation_review: {
    ar: `{guardianSalutation}،\n\nتقرير الحصة 📃✨\n📆 التاريخ : {sessionDate}\n📑 رقم الحصة : {sessionNumber}\n⏱️ مدة الحصة : ساعتين\n👥 الحضور : {attendanceStatus}\n📊 تقييم الأداء :\n⭐ الالتزام والتركيز : {starsCommitment}\n⭐ مستوى الاستيعاب : {starsUnderstanding}\n⭐ تنفيذ المهام : {starsTaskExecution}\n⭐ المشاركة داخل الحصة : {starsParticipation}\n📝 تعليق المدرس :\n{instructorComment}\n🔢 عدد الحصص المنتهية : {completedSessions}\n{recordingLink}\n🏆 النتيجة : {evaluationDecision}\n🙏 نشكركم على ثقتكم في Code School\n📞 للتواصل : +2 011 40 474 129`,
    en: `{guardianSalutation},\n\nSession Report 📃✨\n📆 Date : {sessionDate}\n📑 Session No. : {sessionNumber}\n⏱️ Duration : 2 hours\n👥 Attendance : {attendanceStatus}\n📊 Performance Evaluation :\n⭐ Commitment & Focus : {starsCommitment}\n⭐ Understanding Level : {starsUnderstanding}\n⭐ Task Execution : {starsTaskExecution}\n⭐ Class Participation : {starsParticipation}\n📝 Instructor's Comment :\n{instructorComment}\n🔢 Sessions Completed : {completedSessions}\n{recordingLink}\n🏆 Result : {evaluationDecision}\n🙏 Thank you for trusting Code School\n📞 Contact : +2 011 40 474 129`,
  },
  evaluation_repeat: {
    ar: `{guardianSalutation}،\n\nتقرير الحصة 📃✨\n📆 التاريخ : {sessionDate}\n📑 رقم الحصة : {sessionNumber}\n⏱️ مدة الحصة : ساعتين\n👥 الحضور : {attendanceStatus}\n📊 تقييم الأداء :\n⭐ الالتزام والتركيز : {starsCommitment}\n⭐ مستوى الاستيعاب : {starsUnderstanding}\n⭐ تنفيذ المهام : {starsTaskExecution}\n⭐ المشاركة داخل الحصة : {starsParticipation}\n📝 تعليق المدرس :\n{instructorComment}\n🔢 عدد الحصص المنتهية : {completedSessions}\n{recordingLink}\n🏆 النتيجة : {evaluationDecision}\n🙏 نشكركم على ثقتكم في Code School\n📞 للتواصل : +2 011 40 474 129`,
    en: `{guardianSalutation},\n\nSession Report 📃✨\n📆 Date : {sessionDate}\n📑 Session No. : {sessionNumber}\n⏱️ Duration : 2 hours\n👥 Attendance : {attendanceStatus}\n📊 Performance Evaluation :\n⭐ Commitment & Focus : {starsCommitment}\n⭐ Understanding Level : {starsUnderstanding}\n⭐ Task Execution : {starsTaskExecution}\n⭐ Class Participation : {starsParticipation}\n📝 Instructor's Comment :\n{instructorComment}\n🔢 Sessions Completed : {completedSessions}\n{recordingLink}\n🏆 Result : {evaluationDecision}\n🙏 Thank you for trusting Code School\n📞 Contact : +2 011 40 474 129`,
  },
  session_recording: {
    ar: `{guardianSalutation}،\n\n🎥 رابط تسجيل جلسة "{sessionName}" لـ{childTitle} *{studentName}*:\n\n{recordingLink}\n\nيمكن مراجعة التسجيل في أي وقت للمذاكرة والمراجعة.\nفريق Code School 💻`,
    en: `{guardianSalutation},\n\n🎥 Recording for "{sessionName}" — {childTitle} *{studentName}*:\n\n{recordingLink}\n\nThe recording can be reviewed anytime for study and revision.\nCode School Team 💻`,
  },
  learning_supervisor_intro: {
    ar: `{guardianSalutation} 👋\nأنا {supervisorName}، الـ Learning Supervisor الخاص بـ {childTitle} **{studentName}** في Code School ✨\nحبيت أعرف حضرتك بنفسي، لأنني هكون معاكم في المتابعة الأكاديمية خلال الفترة الجاية، وهشارك مع حضرتك التقييمات الدورية، وكمان في بداية كل Module هبعت لحضرتك نظرة بسيطة على اللي {childTitle} هيتعلمه خلالها 🌟\nهدفي إن المتابعة تكون واضحة ومريحة، وإن حضرتك تبقى مطّمن على رحلة {studentName} التعليمية خطوة بخطوة 🤍\nوأي وقت تحب تستفسر عن أي حاجة تخص المستوى أو التقدم، أنا موجود مع حضرتك.\n{supervisorName} ✨\nLearning Supervisor`,
    en: `{guardianSalutation} 👋\nI am {supervisorName}, your Learning Supervisor for {childTitle} **{studentName}** at Code School ✨\nI wanted to introduce myself, as I will be following up on the academic progress during the coming period. I will share periodic evaluations with you, and at the beginning of each Module, I will send you a brief overview of what {childTitle} will be learning 🌟\nMy goal is to make follow-up clear and comfortable, and to keep you reassured about {studentName}'s educational journey step by step 🤍\nAnytime you would like to inquire about anything regarding the level or progress, I am here for you.\n{supervisorName} ✨\nLearning Supervisor`,
  },
  module_overview: {
    ar: `{guardianSalutation} 👋\nحابب أشارك مع حضرتك لمحة سريعة عن الـ Module الجديد اللي هيبدأه {childTitle} **{studentName}** ✨\n\n**Module Title:** {moduleTitle}\n\nخلال الـ Module ده، {studentName} هياخد فكرة ممتعة وبسيطة عن إزاي التطبيقات اللي بنستخدمها في حياتنا بتتعمل وبتتجهز بشكل مناسب للمستخدمين 📱\nوهيركز كمان على بناء شاشات بسيطة تشبه تطبيقات الموبايل، مع تدريب عملي يساعده يفهم الفكرة خطوة بخطوة بشكل سهل ومناسب لسنه 🌟\n\nوأنا هكون متابع مع حضرتك خلال الـ Module، وهشاركك أي ملاحظات مهمة أو تطور واضح بإذن الله.\n\n{supervisorName} ✨\nLearning Supervisor`,
    en: `{guardianSalutation} 👋\nI would like to share with you a quick overview of the new Module that {childTitle} **{studentName}** will be starting ✨\n\n**Module Title:** {moduleTitle}\n\nDuring this Module, {studentName} will get a fun and simple idea about how the applications we use in our daily lives are built and tailored for users 📱\nHe will also focus on building simple screens similar to mobile applications, with practical training to help him understand the concept step by step in an easy and age-appropriate way 🌟\n\nI will be following up with you during the Module and will share any important notes or noticeable progress with you, God willing.\n\n{supervisorName} ✨\nLearning Supervisor`,
  },
  reminder_15min_student: {
    ar: `{salutation_ar}،\n\n⏳ تذكير: حصتك *{sessionName}* هتبدأ خلال *15 دقيقة* الساعة {time} ⏰\n\n🔗 رابط الحصة:\n{meetingLink}\n\nCode School 💻`,
    en: `{salutation_en},\n\n⏳ Reminder: Your session *{sessionName}* starts in *15 minutes* at {time} ⏰\n\n🔗 Meeting link:\n{meetingLink}\n\nCode School 💻`,
  },
  reminder_15min_guardian: {
    ar: `{guardianSalutation}،\n\n⏳ تذكير: حصة {childTitle} *{studentName}* - *{sessionName}* هتبدأ خلال *15 دقيقة* الساعة {time} ⏰\n\n🔗 رابط الحصة:\n{meetingLink}\n\nCode School 💻`,
    en: `{guardianSalutation},\n\n⏳ Reminder: {childTitle} *{studentName}*'s session *{sessionName}* starts in *15 minutes* at {time} ⏰\n\n🔗 Meeting link:\n{meetingLink}\n\nCode School 💻`,
  },
  instructor_reminder_24h: {
    ar: `{instructorSalutation} 👋\nحبيت أفكرك إن ميعادنا بكرة إن شاء الله ✨\n\n📘 الـ Session: {sessionName}\n📝 وصف السيشن: {sessionDescription}\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n🔗 لينك الحصة:\n{meetingLink}\n\n🔐 بيانات الدخول:\n👤 Username: {username}\n🔑 Password: {password}\n\n👥 المجموعة: {groupName}\n🔢 عدد الطلاب: {studentCount}\n\nمتحمسين نشوفك بكرة 💻🚀\nفريق Code School`,
    en: `{instructorSalutation} 👋\nJust a reminder that our session is tomorrow, God willing ✨\n\n📘 Session: {sessionName}\n📝 Session Overview: {sessionDescription}\n📅 Date: {date}\n⏰ Time: {time}\n🔗 Meeting Link:\n{meetingLink}\n\n🔐 Login Details:\n👤 Username: {username}\n🔑 Password: {password}\n\n👥 Group: {groupName}\n🔢 Students: {studentCount}\n\nCan't wait to see you tomorrow 💻🚀\nCode School Team`,
  },
  instructor_reminder_15min: {
    ar: `{instructorSalutation} 👋\nحبيت أفكرك إن ميعادنا هيبدأ خلال *15 دقيقة* إن شاء الله ✨\n\n📘 الـ Session: {sessionName}\n📝 وصف السيشن: {sessionDescription}\n⏰ الوقت: {time}\n🔗 لينك الحصة:\n{meetingLink}\n\n🔐 بيانات الدخول:\n👤 Username: {username}\n🔑 Password: {password}\n\n👥 المجموعة: {groupName}\n\nمتحمسين نشوفك دلوقتي 💻🚀\nفريق Code School`,
    en: `{instructorSalutation} 👋\nJust a reminder that our session starts in *15 minutes*, God willing ✨\n\n📘 Session: {sessionName}\n📝 Session Overview: {sessionDescription}\n⏰ Time: {time}\n🔗 Meeting Link:\n{meetingLink}\n\n🔐 Login Details:\n👤 Username: {username}\n🔑 Password: {password}\n\n👥 Group: {groupName}\n\nCan't wait to see you now 💻🚀\nCode School Team`,
  },
  reminder_24h_offline_student: {
    ar: `{salutation_ar} 👋\n\nتذكير: حصتك *{sessionName}* بكرة إن شاء الله ✨\n\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n\n📍 المكان: {placeName}\n📌 العنوان: {address}\n\n🗺️ اللوكيشن على الخريطة:\n{mapsLink}\n\nمنتظرينك في الميعاد 💻\nCode School`,
    en: `{salutation_en} 👋\n\nReminder: Your session *{sessionName}* is tomorrow, God willing ✨\n\n📅 Date: {date}\n⏰ Time: {time}\n\n📍 Location: {placeName}\n📌 Address: {address}\n\n🗺️ Location on Maps:\n{mapsLink}\n\nSee you there 💻\nCode School`,
  },
  reminder_24h_offline_guardian: {
    ar: `{guardianSalutation} 👋\n\nتذكير: حصة {childTitle} *{studentName}* بكرة إن شاء الله ✨\n\n📘 الـ Session: {sessionName}\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n\n📍 المكان: {placeName}\n📌 العنوان: {address}\n\n🗺️ اللوكيشن على الخريطة:\n{mapsLink}\n\nياريت تجهز {childTitle} للوصول في الميعاد 🙏\nCode School 💻`,
    en: `{guardianSalutation} 👋\n\nReminder: {childTitle} *{studentName}*'s session is tomorrow ✨\n\n📘 Session: {sessionName}\n📅 Date: {date}\n⏰ Time: {time}\n\n📍 Location: {placeName}\n📌 Address: {address}\n\n🗺️ Location on Maps:\n{mapsLink}\n\nPlease prepare {childTitle} to arrive on time 🙏\nCode School 💻`,
  },
  reminder_30min_offline_student: {
    ar: `{salutation_ar} 👋\n\n⏰ فاضل 30 دقيقة على بداية الحصة *{sessionName}*\n\n📍 المكان: {placeName}\n🗺️ {mapsLink}\n\nيلا استعد للنزول 👍\nCode School 💻`,
    en: `{salutation_en} 👋\n\n⏰ 30 minutes left until *{sessionName}*\n\n📍 Location: {placeName}\n🗺️ {mapsLink}\n\nGet ready to head out 👍\nCode School 💻`,
  },
  reminder_30min_offline_guardian: {
    ar: `{guardianSalutation} 👋\n\n🚗 تنبيه: حصة {childTitle} *{studentName}* هتبدأ بعد 30 دقيقة\n\n⏰ الوقت: {time}\n📍 المكان: {placeName}\n🗺️ {mapsLink}\n\nياريت تجهز {childTitle} للنزول في الميعاد 🙏\nCode School 💻`,
    en: `{guardianSalutation} 👋\n\n🚗 Heads-up: {childTitle} *{studentName}*'s session starts in 30 minutes\n\n⏰ Time: {time}\n📍 Location: {placeName}\n🗺️ {mapsLink}\n\nPlease prepare {childTitle} to head out on time 🙏\nCode School 💻`,
  },
  pre_attendance_ping_student: {
    ar: `{salutation_ar} 👋\n\nبنستعد نبدأ حصة *{sessionName}* دلوقتي، ياريت نتأكد إنك موجود وجاهز ✨\nCode School 💻`,
    en: `{salutation_en} 👋\n\nWe're about to start *{sessionName}* now, please make sure you're ready ✨\nCode School 💻`,
  },
  pre_attendance_ping_guardian: {
    ar: `{guardianSalutation} 👋\n\nبنستعد نبدأ حصة {childTitle} *{studentName}* دلوقتي، ياريت نتأكد إنه موجود وجاهز ✨\nCode School 💻`,
    en: `{guardianSalutation} 👋\n\nWe're about to start {childTitle} *{studentName}*'s session now, please make sure they're ready ✨\nCode School 💻`,
  },
  instructor_reminder_24h_offline: {
    ar: `{instructorSalutation} 👋\n\nتذكير: عندك حصة *{sessionName}* بكرة إن شاء الله (Offline) ✨\n\n📅 التاريخ: {date}\n⏰ الوقت: {time}\n\n📍 المكان: {placeName}\n📌 العنوان: {address}\n🗺️ {mapsLink}\n\n👥 المجموعة: {groupName}\n🔢 عدد الطلاب: {studentCount}\n\nفريق Code School 💻`,
    en: `{instructorSalutation} 👋\n\nReminder: You have an *offline* session *{sessionName}* tomorrow ✨\n\n📅 Date: {date}\n⏰ Time: {time}\n\n📍 Location: {placeName}\n📌 Address: {address}\n🗺️ {mapsLink}\n\n👥 Group: {groupName}\n🔢 Students: {studentCount}\n\nCode School Team 💻`,
  },
  instructor_reminder_30min_offline: {
    ar: `{instructorSalutation} 👋\n\n⏰ فاضل 30 دقيقة على بداية حصة *{sessionName}*\n\n📍 المكان: {placeName}\n🗺️ {mapsLink}\n\n👥 المجموعة: {groupName}\n\nفريق Code School 💻`,
    en: `{instructorSalutation} 👋\n\n⏰ 30 minutes until *{sessionName}* starts\n\n📍 Location: {placeName}\n🗺️ {mapsLink}\n\n👥 Group: {groupName}\n\nCode School Team 💻`,
  },
  instructor_pre_attendance_ping: {
    ar: `{instructorSalutation} 👋\n\nالحصة *{sessionName}* هتبدأ دلوقتي، ياريت نتأكد إن الطلاب موجودين وجاهزين ونسجل الحضور ✨\n\nفريق Code School 💻`,
    en: `{instructorSalutation} 👋\n\n*{sessionName}* is about to start, please make sure students are present and take attendance ✨\n\nCode School Team 💻`,
  },
  portfolio_inactivity_reminder: {
    ar: `أهلاً بيك يا {ownerName}،\n\nعارفين إن الـ Personal Portfolio بتاعك مش مجرد صفحة على النت، ده واجهة الـ Business بتاعك والمكان اللي بيعكس مجهودك وشغلك.\n\nعشان كده، صممنا البورتفوليو بتاعك ليكون صديق لمحركات البحث ومُحسن للـ SEO والـ GEO.. وده معناه Visibility أعلى وعملاء أكتر يقدروا يوصلولك بسهولة.\n\nادخل دلوقتي وضيف أي Updates جديدة في الـ Projects بتاعتك عشان تفضل دايماً في الصدارة والـ Ranking بتاعك يعلى!\n\nلينك البورتفوليو بتاعك:\n{portfolioLink}`,
    en: `Hi {ownerName},\n\nYour Personal Portfolio isn't just a page online — it's the face of your business and the place that reflects your effort and work.\n\nThat's why we designed your portfolio to be search-engine friendly and optimized for SEO & GEO.. which means higher visibility and more clients finding you easily.\n\nLog in now and add any new Updates to your Projects to stay ahead and keep your Ranking climbing!\n\nYour portfolio link:\n{portfolioLink}`,
  },
  portfolio_update_broadcast: {
    ar: `أهلاً يا {ownerName} ✨\n\nلأن الـ Personal Portfolio بتاعك هو واجهتك الرقمية، إحنا دايماً بنطور الـ System عشان نضمن إنك في الصدارة. 🎯\n\nنزلنا النهاردة Update جديد هيحسن الـ SEO والـ GEO لصفحتك بشكل ملحوظ عشان يضمنلك أعلى Visibility ممكنة.\n\nادخل شوف التحديثات واعمل Update لبياناتك من هنا:\n🔗 {updateLink}\n\nيومك جميل وموفق! 🌻`,
    en: `Hi {ownerName} ✨\n\nSince your Personal Portfolio is your digital face, we're always upgrading the System to keep you ahead. 🎯\n\nToday we shipped a new Update that noticeably improves the SEO & GEO of your page, giving you the highest possible Visibility.\n\nCheck out the updates and refresh your data here:\n🔗 {updateLink}\n\nHave a great day! 🌻`,
  },
  portfolio_contact_form_notification: {
    ar: `عزيزي {ownerName}،\n\nيعلمك نظام الإشعارات الآلي بتلقي رسالة جديدة عبر الـ Contact Form الخاص بالـ Personal Portfolio الخاص بك.\n\nلضمان الخصوصية وسرية البيانات، يتم توجيه جميع الرسائل وتشفيرها آلياً إلى حسابك دون أي تدخل بشري.\n\nلعرض محتوى الرسالة والرد عليها، برجاء تسجيل الدخول إلى الـ Dashboard:\n🔗 {dashboardLink}`,
    en: `Dear {ownerName},\n\nOur automated notification system informs you that a new message has been received via the Contact Form on your Personal Portfolio.\n\nTo ensure privacy and data confidentiality, all messages are automatically routed and encrypted to your account without any human intervention.\n\nTo view the message and reply, please log in to your Dashboard:\n🔗 {dashboardLink}`,
  },
  credit_low_balance_4h_student: {
    ar: `{salutation_ar} 👋\n\n⚠️ تنبيه: رصيد الساعات المتبقية في باقتك قارب على الانتهاء.\n\n🔋 الساعات المتبقية: *{remainingHours}* ساعة\n📦 الباقة: {packageName}\n\nلتجنب توقف الجلسات، بننصحك بتجديد الباقة قبل ما الرصيد ينفذ.\n\nفريق Code School 💻`,
    en: `{salutation_en} 👋\n\n⚠️ Heads-up: Your remaining credit hours are running low.\n\n🔋 Remaining hours: *{remainingHours}*\n📦 Package: {packageName}\n\nTo avoid any session interruption, we recommend renewing your package before the balance runs out.\n\nCode School Team 💻`,
  },
  credit_low_balance_4h_guardian: {
    ar: `{guardianSalutation} 👋\n\n⚠️ تنبيه: رصيد ساعات {childTitle} *{studentName}* قارب على الانتهاء.\n\n🔋 الساعات المتبقية: *{remainingHours}* ساعة\n📦 الباقة: {packageName}\n\nلتجنب توقف الجلسات، بننصح حضرتك بتجديد الباقة قبل ما الرصيد ينفذ.\n\nفريق Code School 💻`,
    en: `{guardianSalutation} 👋\n\n⚠️ Heads-up: {childTitle} *{studentName}*'s credit hours are running low.\n\n🔋 Remaining hours: *{remainingHours}*\n📦 Package: {packageName}\n\nTo avoid any session interruption, we recommend renewing the package before the balance runs out.\n\nCode School Team 💻`,
  },
  credit_low_balance_2h_student: {
    ar: `{salutation_ar} 🚨\n\n🚨 تنبيه عاجل: رصيد ساعاتك أوشك على النفاذ.\n\n🔋 الساعات المتبقية: *{remainingHours}* ساعة فقط\n📦 الباقة: {packageName}\n\nبرجاء التواصل مع الإدارة فورًا لتجديد الباقة، عشان ما توقفش الجلسات.\n\nفريق Code School 💻`,
    en: `{salutation_en} 🚨\n\n🚨 Urgent: Your credit hours are almost exhausted.\n\n🔋 Remaining hours: *{remainingHours}* only\n📦 Package: {packageName}\n\nPlease contact the administration immediately to renew your package, so your sessions don't stop.\n\nCode School Team 💻`,
  },
  credit_low_balance_2h_guardian: {
    ar: `{guardianSalutation} 🚨\n\n🚨 تنبيه عاجل: رصيد ساعات {childTitle} *{studentName}* أوشك على النفاذ.\n\n🔋 الساعات المتبقية: *{remainingHours}* ساعة فقط\n📦 الباقة: {packageName}\n\nبرجاء التواصل مع الإدارة فورًا لتجديد الباقة، عشان ما توقفش جلسات {childTitle}.\n\nفريق Code School 💻`,
    en: `{guardianSalutation} 🚨\n\n🚨 Urgent: {childTitle} *{studentName}*'s credit hours are almost exhausted.\n\n🔋 Remaining hours: *{remainingHours}* only\n📦 Package: {packageName}\n\nPlease contact the administration immediately to renew the package, so {childTitle}'s sessions don't stop.\n\nCode School Team 💻`,
  },

  // ═══════════════════════════════════════════════════════════════
  // 🎁 MAKE-UP SESSION (Online)
  // ═══════════════════════════════════════════════════════════════
  makeup_session_student: {
    ar: `{studentSalutation} 👋\n\nعندنا خبر حلو ليك! 🎁\n\nتم تحديد حصة تعويضية ليك عشان نعوّضك عن الحصة اللي فاتتك:\n\n📘 الكورس: {courseName}\n👥 المجموعة الجديدة: {groupName} ({groupCode})\n\n🔄 الحصة الأصلية:\n📅 {originalDate}\n⏰ {originalTime}\n📚 {originalSessionTitle}\n\n✨ الحصة التعويضية الجديدة:\n📅 {newDate}\n⏰ {newTime}\n📚 {newSessionTitle}\n🔗 رابط الحصة: {meetingLink}\n👨‍🏫 المدرس: {instructorName}\n\n🎉 الحصة دي مجانية تمامًا — مش هتتخصم من رصيدك.\n\nمستنيينك! 💻\nفريق Code School`,
    en: `{studentSalutation} 👋\n\nWe've got great news! 🎁\n\nA make-up session has been scheduled for you:\n\n📘 Course: {courseName}\n👥 New Group: {groupName} ({groupCode})\n\n🔄 Original Session:\n📅 {originalDate}\n⏰ {originalTime}\n📚 {originalSessionTitle}\n\n✨ New Make-up Session:\n📅 {newDate}\n⏰ {newTime}\n📚 {newSessionTitle}\n🔗 Meeting Link: {meetingLink}\n👨‍🏫 Instructor: {instructorName}\n\n🎉 This session is completely free — it won't be deducted from your balance.\n\nSee you there! 💻\nCode School Team`,
  },
  makeup_session_guardian: {
    ar: `{guardianSalutation} 👋\n\nيسرنا إبلاغكم إنه تم تحديد حصة تعويضية لـ{childTitle} **{studentName}**:\n\n📘 الكورس: {courseName}\n👥 المجموعة الجديدة: {groupName} ({groupCode})\n\n🔄 الحصة الأصلية:\n📅 {originalDate}\n⏰ {originalTime}\n\n✨ الحصة التعويضية الجديدة:\n📅 {newDate}\n⏰ {newTime}\n🔗 رابط الحصة: {meetingLink}\n👨‍🏫 المدرس: {instructorName}\n\n🎉 الحصة دي مجانية — مش هتتخصم من رصيد {childTitle}.\n\nفريق Code School 💻`,
    en: `{guardianSalutation} 👋\n\nWe are pleased to inform you that a make-up session has been scheduled for {childTitle} **{studentName}**:\n\n📘 Course: {courseName}\n👥 New Group: {groupName} ({groupCode})\n\n🔄 Original Session:\n📅 {originalDate}\n⏰ {originalTime}\n\n✨ New Make-up Session:\n📅 {newDate}\n⏰ {newTime}\n🔗 Meeting Link: {meetingLink}\n👨‍🏫 Instructor: {instructorName}\n\n🎉 This session is free — it won't be deducted from {childTitle}'s balance.\n\nCode School Team 💻`,
  },
  makeup_session_instructor: {
    ar: `{instructorSalutation} 👋\n\nتم تحديد حصة تعويضية جديدة ليك:\n\n📘 الكورس: {courseName}\n👥 المجموعة: {groupName} ({groupCode})\n👤 الطالب: {studentName}\n\n📅 التاريخ: {newDate}\n⏰ الوقت: {newTime}\n🔗 رابط الحصة: {meetingLink}\n\n🔄 الحصة الأصلية:\n📅 {originalDate}\n⏰ {originalTime}\n📚 {originalSessionTitle}\n\nملاحظة: الحصة دي تعويضية (مجانية على الطالب)، لكن المدرس بيتحاسب عليها عادي.\n\nفريق Code School 💻`,
    en: `{instructorSalutation} 👋\n\nA new make-up session has been scheduled for you:\n\n📘 Course: {courseName}\n👥 Group: {groupName} ({groupCode})\n👤 Student: {studentName}\n\n📅 Date: {newDate}\n⏰ Time: {newTime}\n🔗 Meeting Link: {meetingLink}\n\n🔄 Original Session:\n📅 {originalDate}\n⏰ {originalTime}\n📚 {originalSessionTitle}\n\nNote: This is a make-up session (free for the student), but the instructor is still paid for it.\n\nCode School Team 💻`,
  },

  // ═══════════════════════════════════════════════════════════════
  // 🎁 MAKE-UP SESSION (Offline)
  // ═══════════════════════════════════════════════════════════════
  makeup_session_student_offline: {
    ar: `{studentSalutation} 👋\n\nعندنا خبر حلو ليك! 🎁\n\nتم تحديد حصة تعويضية ليك عشان نعوّضك عن الحصة اللي فاتتك:\n\n📘 الكورس: {courseName}\n👥 المجموعة الجديدة: {groupName} ({groupCode})\n\n🔄 الحصة الأصلية:\n📅 {originalDate}\n⏰ {originalTime}\n📚 {originalSessionTitle}\n\n✨ الحصة التعويضية الجديدة:\n📅 {newDate}\n⏰ {newTime}\n📚 {newSessionTitle}\n📍 المكان: {placeName}\n📌 العنوان: {address}\n🗺️ اللوكيشن: {mapsLink}\n👨‍🏫 المدرس: {instructorName}\n\n🎉 الحصة دي مجانية تمامًا — مش هتتخصم من رصيدك.\n\nمستنيينك! 💻\nفريق Code School`,
    en: `{studentSalutation} 👋\n\nWe've got great news! 🎁\n\nA make-up session has been scheduled for you:\n\n📘 Course: {courseName}\n👥 New Group: {groupName} ({groupCode})\n\n🔄 Original Session:\n📅 {originalDate}\n⏰ {originalTime}\n📚 {originalSessionTitle}\n\n✨ New Make-up Session:\n📅 {newDate}\n⏰ {newTime}\n📚 {newSessionTitle}\n📍 Location: {placeName}\n📌 Address: {address}\n🗺️ Maps: {mapsLink}\n👨‍🏫 Instructor: {instructorName}\n\n🎉 This session is completely free — it won't be deducted from your balance.\n\nSee you there! 💻\nCode School Team`,
  },
  makeup_session_guardian_offline: {
    ar: `{guardianSalutation} 👋\n\nيسرنا إبلاغكم إنه تم تحديد حصة تعويضية لـ{childTitle} **{studentName}**:\n\n📘 الكورس: {courseName}\n👥 المجموعة الجديدة: {groupName} ({groupCode})\n\n🔄 الحصة الأصلية:\n📅 {originalDate}\n⏰ {originalTime}\n\n✨ الحصة التعويضية الجديدة:\n📅 {newDate}\n⏰ {newTime}\n📍 المكان: {placeName}\n📌 العنوان: {address}\n🗺️ اللوكيشن: {mapsLink}\n👨‍🏫 المدرس: {instructorName}\n\n🎉 الحصة دي مجانية — مش هتتخصم من رصيد {childTitle}.\n\nفريق Code School 💻`,
    en: `{guardianSalutation} 👋\n\nWe are pleased to inform you that a make-up session has been scheduled for {childTitle} **{studentName}**:\n\n📘 Course: {courseName}\n👥 New Group: {groupName} ({groupCode})\n\n🔄 Original Session:\n📅 {originalDate}\n⏰ {originalTime}\n\n✨ New Make-up Session:\n📅 {newDate}\n⏰ {newTime}\n📍 Location: {placeName}\n📌 Address: {address}\n🗺️ Maps: {mapsLink}\n👨‍🏫 Instructor: {instructorName}\n\n🎉 This session is free — it won't be deducted from {childTitle}'s balance.\n\nCode School Team 💻`,
  },
  makeup_session_instructor_offline: {
    ar: `{instructorSalutation} 👋\n\nتم تحديد حصة تعويضية جديدة ليك (Offline):\n\n📘 الكورس: {courseName}\n👥 المجموعة: {groupName} ({groupCode})\n👤 الطالب: {studentName}\n\n📅 التاريخ: {newDate}\n⏰ الوقت: {newTime}\n📍 المكان: {placeName}\n📌 العنوان: {address}\n🗺️ اللوكيشن: {mapsLink}\n\n🔄 الحصة الأصلية:\n📅 {originalDate}\n⏰ {originalTime}\n📚 {originalSessionTitle}\n\nملاحظة: الحصة دي تعويضية (مجانية على الطالب)، لكن المدرس بيتحاسب عليها عادي.\n\nفريق Code School 💻`,
    en: `{instructorSalutation} 👋\n\nA new make-up session has been scheduled for you (Offline):\n\n📘 Course: {courseName}\n👥 Group: {groupName} ({groupCode})\n👤 Student: {studentName}\n\n📅 Date: {newDate}\n⏰ Time: {newTime}\n📍 Location: {placeName}\n📌 Address: {address}\n🗺️ Maps: {mapsLink}\n\n🔄 Original Session:\n📅 {originalDate}\n⏰ {originalTime}\n📚 {originalSessionTitle}\n\nNote: This is a make-up session (free for the student), but the instructor is still paid for it.\n\nCode School Team 💻`,
  },

  instructor_group_activation: {
    ar: `{salutation} 👋\n\nحبيت أبلغك إنه تم إسناد جروب *{groupName}* الخاص بكورس *{courseName}* لحضرتك ✨\nدي كل تفاصيل البداية عشان تكون جاهز:\n\n📘 الـ Course: {courseName}\n👥 الـ Group: {groupName}\n📅 تاريخ البداية: {startDate}\n⏰ المعاد: من {timeFrom} إلى {timeTo}\n🔗 لينك الحصة:\n{meetingLink}\n\nمتحمسين جداً لبداية قوية معاك، وبالتوفيق يا هندسة 🌟\n\nنور ✨\nفريق الأوبيريشن - Code School`,
    en: `{salutation} 👋\n\nWe're pleased to assign you group *{groupName}* for *{courseName}* ✨\nHere are all the starting details to get you ready:\n\n📘 Course: {courseName}\n👥 Group: {groupName}\n📅 Start Date: {startDate}\n⏰ Time: From {timeFrom} to {timeTo}\n🔗 Meeting Link:\n{meetingLink}\n\nExcited for a strong start with you, best of luck! 🌟\n\nNour ✨\nOperations Team - Code School`,
  },
  instructor_group_activation_offline: {
    ar: `{salutation} 👋\n\nحبيت أبلغك إنه تم إسناد جروب *{groupName}* الخاص بكورس *{courseName}* لحضرتك ✨\nدي كل تفاصيل البداية عشان تكون جاهز:\n\n📘 الـ Course: {courseName}\n👥 الـ Group: {groupName}\n📅 تاريخ البداية: {startDate}\n⏰ المعاد: من {timeFrom} إلى {timeTo}\n\n📍 المكان: {placeName}\n📌 العنوان: {address}\n🗺️ اللوكيشن: {mapsLink}\n\nمتحمسين جداً لبداية قوية معاك، وبالتوفيق يا هندسة 🌟\n\nنور ✨\nفريق الأوبيريشن - Code School`,
    en: `{salutation} 👋\n\nWe're pleased to assign you group *{groupName}* for *{courseName}* ✨\nHere are all the starting details to get you ready:\n\n📘 Course: {courseName}\n👥 Group: {groupName}\n📅 Start Date: {startDate}\n⏰ Time: From {timeFrom} to {timeTo}\n\n📍 Location: {placeName}\n📌 Address: {address}\n🗺️ Maps: {mapsLink}\n\nExcited for a strong start with you, best of luck! 🌟\n\nNour ✨\nOperations Team - Code School`,
  },
};

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────
const ORANGE_TEXT = "text-[#c24d00] dark:text-[#ff8a3d]";
const TEAL_TEXT = "text-[#004d59] dark:text-teal-300";
const AMBER_TEXT = "text-[#8f5b00] dark:text-[#feaf00]";

const TONE = {
  primary: { bg: "bg-[#ff6700]", onBg: "text-white", text: ORANGE_TEXT, light: "bg-[#ff6700]/10", border: "border-[#ff6700]/25" },
  secondary: { bg: "bg-[#004d59] dark:bg-[#0b7285]", onBg: "text-white", text: TEAL_TEXT, light: "bg-[#004d59]/10 dark:bg-teal-400/10", border: "border-[#004d59]/20 dark:border-teal-400/25" },
  accent: { bg: "bg-[#feaf00]", onBg: "text-slate-900", text: AMBER_TEXT, light: "bg-[#feaf00]/15", border: "border-[#feaf00]/40" },
  emerald: { bg: "bg-emerald-600", onBg: "text-white", text: "text-emerald-700 dark:text-emerald-400", light: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800" },
  sky: { bg: "bg-sky-600", onBg: "text-white", text: "text-sky-700 dark:text-sky-400", light: "bg-sky-50 dark:bg-sky-900/20", border: "border-sky-200 dark:border-sky-800" },
  rose: { bg: "bg-rose-600", onBg: "text-white", text: "text-rose-700 dark:text-rose-400", light: "bg-rose-50 dark:bg-rose-900/20", border: "border-rose-200 dark:border-rose-800" },
  slate: { bg: "bg-slate-600", onBg: "text-white", text: "text-slate-600 dark:text-slate-400", light: "bg-slate-50 dark:bg-slate-900/20", border: "border-slate-200 dark:border-slate-800" },
};

const C_MAP = {
  primary: TONE.primary,
  secondary: TONE.secondary,
  accent: TONE.accent,
  violet: TONE.primary,
  blue: TONE.secondary,
  emerald: TONE.emerald,
  orange: TONE.primary,
  amber: TONE.accent,
  indigo: TONE.secondary,
  sky: TONE.sky,
  rose: TONE.rose,
  slate: TONE.slate,
};

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6700]/40";
const PANEL = "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161b27]";
const INPUT = "w-full text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff6700]/20 focus:border-[#ff6700] dark:text-slate-100 placeholder-slate-400 transition-colors";

const WA_PATTERN = "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E\")";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function buildVals(variable) {
  return {
    valueAr: variable.valueAr ?? "",
    valueEn: variable.valueEn ?? "",
    valueMaleAr: variable.valueMaleAr ?? "",
    valueMaleEn: variable.valueMaleEn ?? "",
    valueFemaleAr: variable.valueFemaleAr ?? "",
    valueFemaleEn: variable.valueFemaleEn ?? "",
    valueFatherAr: variable.valueFatherAr ?? "",
    valueFatherEn: variable.valueFatherEn ?? "",
    valueMotherAr: variable.valueMotherAr ?? "",
    valueMotherEn: variable.valueMotherEn ?? "",
  };
}

function getRecipientType(tabId) {
  if (tabId.startsWith("portfolio_")) return "portfolio_owner";
  if (tabId.startsWith("makeup_session_instructor")) return "instructor";
  if (tabId.includes("student")) return "student";
  return "guardian";
}

function isInstructorTemplate(tabId) {
  return (
    tabId === "instructor_group_activation" ||
    tabId === "instructor_group_activation_offline" ||
    tabId === "instructor_reminder_24h" ||
    tabId === "instructor_reminder_15min" ||
    tabId === "instructor_reminder_24h_offline" ||
    tabId === "instructor_reminder_30min_offline" ||
    tabId === "instructor_pre_attendance_ping" ||
    tabId === "makeup_session_instructor" ||
    tabId === "makeup_session_instructor_offline"
  );
}

const INSTRUCTOR_TYPE_MAP = {
  instructor_group_activation: "group_activation",
  instructor_group_activation_offline: "group_activation_offline",
  instructor_reminder_24h: "reminder_24h",
  instructor_reminder_15min: "reminder_15min",
  instructor_reminder_24h_offline: "reminder_24h_offline",
  instructor_reminder_30min_offline: "reminder_30min_offline",
  instructor_pre_attendance_ping: "pre_attendance_ping",
  makeup_session_instructor: "makeup_session_instructor",
  makeup_session_instructor_offline: "makeup_session_instructor_offline",
};

const INSTRUCTOR_DB_TO_UI = {
  group_activation: "instructor_group_activation",
  group_activation_offline: "instructor_group_activation_offline",
  reminder_24h: "instructor_reminder_24h",
  reminder_15min: "instructor_reminder_15min",
  reminder_24h_offline: "instructor_reminder_24h_offline",
  reminder_30min_offline: "instructor_reminder_30min_offline",
  pre_attendance_ping: "instructor_pre_attendance_ping",
  makeup_session_instructor: "makeup_session_instructor",
  makeup_session_instructor_offline: "makeup_session_instructor_offline",
};

// ─────────────────────────────────────────────────────────────
// WHATSAPP PREVIEW RENDERING
// ─────────────────────────────────────────────────────────────
const VAR_OPEN = "\uE000";
const VAR_CLOSE = "\uE001";
const VAR_SPLIT = /\uE000([\s\S]*?)\uE001/;

function renderWhatsApp(text) {
  let k = 0;
  const nextKey = () => `wa-${k++}`;

  const withVarMarks = (str) =>
    str.split(VAR_SPLIT).map((part, i) =>
      i % 2 === 1 ? (
        <span
          key={nextKey()}
          className="rounded bg-[#ff6700]/15 px-0.5 text-[#a13f00] dark:bg-[#ff6700]/25 dark:text-[#ffb27a]"
        >
          {part}
        </span>
      ) : (
        part
      )
    );

  const out = [];
  const re = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(...withVarMarks(text.slice(last, m.index)));
    out.push(
      <strong key={nextKey()} className="font-bold">
        {withVarMarks(m[1] ?? m[2])}
      </strong>
    );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(...withVarMarks(text.slice(last)));
  return out;
}

// ─────────────────────────────────────────────────────────────
// SMALL SHARED UI
// ─────────────────────────────────────────────────────────────
function Segmented({ options, value, onChange, size = "md", className = "" }) {
  const pad = size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs";
  return (
    <div role="group" className={`inline-flex items-center gap-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 ${className}`}>
      {options.map(({ id, label, icon: Icon, badge }) => {
        const on = value === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(id)}
            className={`flex items-center gap-1.5 rounded-[10px] font-bold whitespace-nowrap transition-colors ${pad} ${FOCUS} ${on
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{label}</span>
            {badge !== undefined && (
              <span className={`rounded-full px-1.5 text-[10px] leading-4 ${on ? "bg-[#ff6700]/10 " + ORANGE_TEXT : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Chip({ tone = TONE.slate, small = false, children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-bold ${small ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"} ${tone.light} ${tone.text} ${tone.border} ${className}`}>
      {children}
    </span>
  );
}

function Notice({ tone = TONE.accent, icon: Icon, title, children }) {
  return (
    <div className={`mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 ${tone.light} ${tone.border}`}>
      <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${tone.text}`} />
      <div className="min-w-0">
        <p className={`text-xs font-bold ${tone.text}`}>{title}</p>
        {children && <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{children}</p>}
      </div>
    </div>
  );
}

const ROLE_ROWS = [
  { key: "studentGender", role: "student", label: "الطالب", emoji: "👤", options: [{ id: "male", label: "♂ ذكر" }, { id: "female", label: "♀ أنثى" }] },
  { key: "guardianType", role: "guardian", label: "ولي الأمر", emoji: "👨‍👩‍👧", options: [{ id: "father", label: "👨 أب" }, { id: "mother", label: "👩 أم" }] },
  { key: "instructorGender", role: "instructor", label: "المدرب", emoji: "👨‍🏫", options: [{ id: "male", label: "♂ ذكر" }, { id: "female", label: "♀ أنثى" }] },
  { key: "ownerGender", role: "owner", label: "صاحب البورتفوليو", emoji: "💼", options: [{ id: "male", label: "♂ ذكر" }, { id: "female", label: "♀ أنثى" }] },
];

function PreviewContext({ genderContext, setGenderContext, relevantRoles }) {
  const [showAll, setShowAll] = useState(false);
  const rows = ROLE_ROWS.filter(r => showAll || relevantRoles.has(r.role));
  const hiddenCount = ROLE_ROWS.length - rows.length;

  return (
    <div className={`${PANEL} p-3`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className={`h-3.5 w-3.5 ${ORANGE_TEXT}`} />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">المعاينة حسب</span>
        </div>
        {(hiddenCount > 0 || showAll) && (
          <button
            type="button"
            onClick={() => setShowAll(p => !p)}
            className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${ORANGE_TEXT} hover:bg-[#ff6700]/10 ${FOCUS}`}
          >
            {showAll ? "إخفاء الباقي" : `أدوار أخرى (${hiddenCount})`}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-slate-400">هذا القالب مبيعتمدش على الجنس.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map(r => (
            <div key={r.key} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>{r.emoji}</span>
                <span className="truncate">{r.label}</span>
              </span>
              <Segmented
                size="sm"
                options={r.options}
                value={genderContext[r.key]}
                onChange={(v) => setGenderContext(p => ({ ...p, [r.key]: v }))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PhonePreview({ nodes, dir }) {
  const tail = dir === "rtl" ? "rounded-tr-sm" : dir === "ltr" ? "rounded-tl-sm" : "";
  return (
    <div className="mx-auto w-full max-w-[360px]">
      <div className="overflow-hidden rounded-[28px] border-[5px] border-slate-800 bg-slate-800 shadow-xl dark:border-slate-600 dark:bg-slate-600">
        <div className="flex items-center gap-2.5 bg-[#075e54] px-3.5 py-2.5 text-white dark:bg-[#202c33]">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6700] to-[#004d59] text-[11px] font-bold">
            CS
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-bold">Code School</p>
            <p className="text-[11px] text-white/70">حساب تجاري</p>
          </div>
        </div>

        <div className="relative min-h-[300px] bg-[#efeae2] dark:bg-[#0b141a]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: WA_PATTERN }} />
          <div className="relative max-h-[min(56vh,520px)] overflow-y-auto no-scrollbar p-3">
            {nodes.length > 0 ? (
              <div dir={dir} className="flex flex-col items-start">
                <div className={`max-w-[92%] rounded-xl ${tail} bg-white px-3 pb-1.5 pt-2 shadow-[0_1px_1px_rgba(11,20,26,0.15)] dark:bg-[#202c33]`}>
                  <div className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[#111b21] dark:text-[#e9edef]">
                    {nodes}
                  </div>
                  <div className="mt-1 flex justify-end">
                    <span dir="ltr" className="text-[10px] text-slate-400">12:34</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-16">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/50 dark:bg-white/10">
                  <MessageCircle className="h-4 w-4 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">اكتب الرسالة لترى المعاينة</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="mt-2.5 flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
        <span>
          القيم <mark className="rounded bg-[#ff6700]/15 px-0.5 text-[#a13f00] dark:bg-[#ff6700]/25 dark:text-[#ffb27a]">المظللة</mark> تجريبية، وبتتبدل بالقيم الحقيقية وقت الإرسال.
        </span>
      </p>
    </div>
  );
}

function Field({ label, field, dir, vals, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold text-slate-500 dark:text-slate-400">{label}</label>
      <textarea
        value={vals[field]}
        onChange={(e) => onChange(field, e.target.value)}
        dir={dir}
        rows={vals[field]?.length > 60 ? 2 : 1}
        className={`${INPUT} resize-none px-3 py-1.5`}
      />
    </div>
  );
}

function VariableRow({ variable, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [vals, setVals] = useState(() => buildVals(variable));

  const handleChange = (field, value) => {
    setVals(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    onSave(variable.key, vals);
    setEditing(false);
    setDirty(false);
  };

  const handleCancel = () => {
    setVals(buildVals(variable));
    setEditing(false);
    setDirty(false);
  };

  const isSaving = saving === variable.key;
  const genderType = variable.genderType;

  const genderBadge = variable.hasGender
    ? genderType === "guardian"
      ? <Chip small tone={TONE.secondary}>أب/أم</Chip>
      : genderType === "instructor"
        ? <Chip small tone={TONE.accent}>ذ/أ مدرب</Chip>
        : <Chip small tone={TONE.primary}>ذكر/أنثى</Chip>
    : null;

  const valueLine = "flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400";
  const valueText = "font-medium text-slate-700 dark:text-slate-200 truncate max-w-[120px] sm:max-w-[160px]";

  return (
    <div className={`overflow-hidden rounded-xl border transition-colors ${editing ? "border-[#ff6700]/40 dark:border-[#ff6700]/50" : "border-slate-200 dark:border-slate-700"}`}>
      <button
        type="button"
        aria-expanded={editing}
        className={`flex w-full items-center gap-3 px-3 py-2.5 text-right ${FOCUS} ${editing ? "bg-[#ff6700]/5 dark:bg-[#ff6700]/10" : "bg-white hover:bg-slate-50 dark:bg-[#161b27] dark:hover:bg-slate-800/50"}`}
        onClick={() => !isSaving && setEditing(p => !p)}
      >
        <span className="flex-shrink-0 text-lg">{variable.icon}</span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <code dir="ltr" className={`rounded bg-[#ff6700]/10 px-1.5 py-0.5 font-mono text-[11px] font-bold ${ORANGE_TEXT}`}>
              {`{${variable.key}}`}
            </code>
            <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{variable.labelAr}</span>
            {genderBadge}
          </div>

          {!editing && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {variable.hasGender && genderType !== "guardian" ? (
                <>
                  <span className={valueLine}><span>♂</span><span className={valueText}>{vals.valueMaleAr}</span></span>
                  <span className={valueLine}><span>♀</span><span className={valueText}>{vals.valueFemaleAr}</span></span>
                </>
              ) : variable.hasGender && genderType === "guardian" ? (
                <>
                  <span className={valueLine}><span>👨</span><span className={valueText}>{vals.valueFatherAr}</span></span>
                  <span className={valueLine}><span>👩</span><span className={valueText}>{vals.valueMotherAr}</span></span>
                </>
              ) : (
                <>
                  <span className={valueLine}><span>🇸🇦</span><span className={valueText}>{vals.valueAr}</span></span>
                  <span className={valueLine}><span>🇬🇧</span><span className={valueText}>{vals.valueEn}</span></span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          {dirty && !editing && <span className="h-2 w-2 rounded-full bg-[#feaf00]" />}
          {isSaving
            ? <Loader2 className={`h-4 w-4 animate-spin ${ORANGE_TEXT}`} />
            : editing
              ? <ChevronUp className="h-4 w-4 text-slate-400" />
              : <ChevronDown className="h-4 w-4 text-slate-400" />
          }
        </div>
      </button>

      {editing && (
        <div className="space-y-3 border-t border-slate-100 bg-white px-3 pb-3 pt-3 dark:border-slate-800 dark:bg-[#161b27]">
          {variable.hasGender ? (
            <>
              {genderType === "guardian" ? (
                <>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Field label="👨 أب — عربي" field="valueFatherAr" dir="rtl" vals={vals} onChange={handleChange} />
                    <Field label="👨 أب — إنجليزي" field="valueFatherEn" dir="ltr" vals={vals} onChange={handleChange} />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Field label="👩 أم — عربي" field="valueMotherAr" dir="rtl" vals={vals} onChange={handleChange} />
                    <Field label="👩 أم — إنجليزي" field="valueMotherEn" dir="ltr" vals={vals} onChange={handleChange} />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Field label="♂ ذكر — عربي" field="valueMaleAr" dir="rtl" vals={vals} onChange={handleChange} />
                    <Field label="♂ ذكر — إنجليزي" field="valueMaleEn" dir="ltr" vals={vals} onChange={handleChange} />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Field label="♀ أنثى — عربي" field="valueFemaleAr" dir="rtl" vals={vals} onChange={handleChange} />
                    <Field label="♀ أنثى — إنجليزي" field="valueFemaleEn" dir="ltr" vals={vals} onChange={handleChange} />
                  </div>
                </>
              )}
              <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                <p className="mb-1.5 text-[11px] text-slate-400">القيمة الافتراضية (fallback)</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Field label="🇸🇦 افتراضي عربي" field="valueAr" dir="rtl" vals={vals} onChange={handleChange} />
                  <Field label="🇬🇧 افتراضي إنجليزي" field="valueEn" dir="ltr" vals={vals} onChange={handleChange} />
                </div>
              </div>
            </>
          ) : (
            <>
              <Field label="🇸🇦 القيمة العربية" field="valueAr" dir="rtl" vals={vals} onChange={handleChange} />
              <Field label="🇬🇧 القيمة الإنجليزية" field="valueEn" dir="ltr" vals={vals} onChange={handleChange} />
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${FOCUS}`}
            >
              <X className="h-3 w-3" /> إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !dirty}
              className={`flex items-center gap-1 rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${FOCUS}
                ${isSaving || !dirty
                  ? "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800"
                  : "bg-[#ff6700] text-white hover:bg-[#f06000] active:scale-95"}`}
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              {isSaving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function VariablesTab({ dbVars, setDbVars, loadingVars }) {
  const [savingKey, setSavingKey] = useState(null);
  const [searchVars, setSearchVars] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");

  const handleSaveVar = useCallback(async (key, vals) => {
    setSavingKey(key);
    try {
      const res = await fetch("/api/whatsapp/template-variables", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, ...vals }),
      });
      const data = await res.json();
      if (data.success) {
        setDbVars(prev => prev.map(v => v.key === key ? { ...v, ...vals } : v));
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

  const filtered = dbVars.filter(v => {
    const matchGroup = activeGroup === "all" || v.group === activeGroup;
    const q = searchVars.toLowerCase();
    const matchSearch = !q || v.key.toLowerCase().includes(q) || v.labelAr.includes(q) || v.valueAr.includes(q) || v.valueEn.toLowerCase().includes(q);
    return matchGroup && matchSearch;
  });

  const grouped = filtered.reduce((acc, v) => {
    const g = v.group || "common";
    if (!acc[g]) acc[g] = [];
    acc[g].push(v);
    return acc;
  }, {});

  if (loadingVars) return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <Loader2 className={`h-8 w-8 animate-spin ${ORANGE_TEXT}`} />
      <p className="text-sm text-slate-500 dark:text-slate-400">جاري تحميل المتغيرات...</p>
    </div>
  );

  const pill = (on) =>
    `flex flex-shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-colors ${FOCUS} ${on
      ? "bg-[#ff6700] text-white"
      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`;

  return (
    <div className="mx-auto w-full max-w-5xl p-3 sm:p-4 lg:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#ff6700]/10">
          <Settings className={`h-5 w-5 ${ORANGE_TEXT}`} />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white">إدارة قيم المتغيرات</h1>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            المتغيرات اللي بتدعم <strong>الجنس</strong> ليها حقول منفصلة: <strong>ذكر/أنثى</strong> للطالب والمدرب، و<strong>أب/أم</strong> لولي الأمر.
          </p>
        </div>
      </div>

      <div className="sticky top-14 z-20 -mx-3 mb-4 space-y-2 border-b border-slate-200 bg-slate-50/90 px-3 py-3 backdrop-blur dark:border-slate-800 dark:bg-[#0f1117]/90 sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchVars}
            onChange={e => setSearchVars(e.target.value)}
            placeholder="بحث في المتغيرات..."
            className={`${INPUT} bg-white py-2 pl-3 pr-10 dark:bg-[#161b27]`}
          />
        </div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          <button type="button" onClick={() => setActiveGroup("all")} className={pill(activeGroup === "all")}>
            الكل <span className="opacity-70">({dbVars.length})</span>
          </button>
          {Object.entries(VAR_GROUPS).map(([key, grp]) => {
            const count = dbVars.filter(v => v.group === key).length;
            if (!count) return null;
            return (
              <button key={key} type="button" onClick={() => setActiveGroup(key)} className={pill(activeGroup === key)}>
                <span>{grp.emoji}</span>
                <span>{grp.label}</span>
                <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([groupKey, vars]) => {
          const grp = VAR_GROUPS[groupKey] || { label: groupKey, emoji: "📌" };
          const genderVarCount = vars.filter(v => v.hasGender).length;
          return (
            <section key={groupKey}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm">{grp.emoji}</span>
                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">{grp.label}</h2>
                <span className="text-xs text-slate-400">({vars.length})</span>
                {genderVarCount > 0 && (
                  <Chip small tone={TONE.primary}>⚧ {genderVarCount} يدعم الجنس</Chip>
                )}
                <div className="mr-1 h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="space-y-1.5">
                {vars.map(v => (
                  <VariableRow key={v.key} variable={v} onSave={handleSaveVar} saving={savingKey} />
                ))}
              </div>
            </section>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <Search className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500 dark:text-slate-400">مفيش متغيرات تطابق البحث</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateSidebar({ byCategory, activeTab, onSelectTab, searchQ, setSearchQ, templates, isOpenMobile, onCloseMobile }) {
  const [openCats, setOpenCats] = useState(() => {
    const cat = TEMPLATE_TYPES.find(t => t.id === activeTab)?.category;
    return new Set(cat ? [cat] : []);
  });

  useEffect(() => {
    const cat = TEMPLATE_TYPES.find(t => t.id === activeTab)?.category;
    if (cat) setOpenCats(p => new Set(p).add(cat));
  }, [activeTab]);

  useEffect(() => {
    if (!isOpenMobile) return;
    const onKey = (e) => { if (e.key === "Escape") onCloseMobile(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpenMobile, onCloseMobile]);

  const statusOf = (id) => {
    const tpl = templates[id];
    if (tpl?.isFrontendFallback) return "fallback";
    return tpl?.contentAr || tpl?.content ? "saved" : "empty";
  };

  const DOT = {
    saved: { cls: "bg-[#004d59] dark:bg-teal-400", title: "محفوظ" },
    fallback: { cls: "bg-[#feaf00]", title: "افتراضي — لسه مش محفوظ" },
    empty: { cls: "bg-slate-300 dark:bg-slate-600", title: "فارغ" },
  };

  const panel = (
    <div className="flex h-full flex-col bg-white dark:bg-[#161b27]">
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-slate-100 p-3 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="بحث عن قالب..."
            className={`${INPUT} py-2 pl-3 pr-9 text-xs`}
          />
        </div>
        <button type="button" aria-label="إغلاق" onClick={onCloseMobile} className={`flex-shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden ${FOCUS}`}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto">
        {Object.entries(CATEGORIES).map(([key, cat]) => {
          const items = byCategory[key] || [];
          if (!items.length) return null;
          const isOpen = openCats.has(key) || !!searchQ;
          const hasActive = items.some(t => t.id === activeTab);
          return (
            <div key={key} className="border-b border-slate-100 dark:border-slate-800/60">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenCats(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; })}
                className={`flex w-full items-center justify-between px-3 py-2.5 text-xs font-bold transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${FOCUS} ${hasActive ? ORANGE_TEXT : "text-slate-700 dark:text-slate-200"}`}
              >
                <span className="flex items-center gap-2">
                  <span>{cat.emoji}</span>{cat.label}
                  <span className="font-normal text-slate-400">({items.length})</span>
                </span>
                {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {isOpen && (
                <div className="pb-1">
                  {items.map(t => {
                    const tc = C_MAP[t.color] || C_MAP.primary;
                    const isActive = activeTab === t.id;
                    const dot = DOT[statusOf(t.id)];
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => onSelectTab(t.id)}
                        aria-current={isActive ? "true" : undefined}
                        className={`flex w-full items-center gap-2 border-r-2 py-2 pl-3 pr-7 text-xs transition-colors ${FOCUS} ${isActive
                          ? `${tc.light} ${tc.text} border-current font-bold`
                          : "border-transparent text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/40"
                          }`}
                      >
                        <t.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? tc.text : "text-slate-400"}`} />
                        <span className="flex-1 truncate text-right">{t.emoji} {t.label}</span>
                        {t.isNew && <span className="flex-shrink-0 rounded-full bg-[#ff6700] px-1.5 py-px text-[9px] font-bold text-white">NEW</span>}
                        <span title={dot.title} className={`h-2 w-2 flex-shrink-0 rounded-full ${dot.cls}`} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {Object.values(byCategory).every(arr => !arr?.length) && (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-14">
            <Search className="h-7 w-7 text-slate-300" />
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">مفيش قوالب تطابق البحث</p>
          </div>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center justify-center gap-3 border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
        {Object.values(DOT).map(d => (
          <span key={d.title} className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${d.cls}`} />
            {d.title.split(" —")[0]}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden flex-shrink-0 border-l border-slate-200 dark:border-slate-800 lg:sticky lg:top-14 lg:block lg:h-[calc(100vh-56px)] lg:w-72">
        {panel}
      </aside>

      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="absolute inset-y-0 right-0 w-[85%] max-w-xs shadow-2xl animate-[slideIn_0.22s_ease-out]">
            {panel}
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function WhatsAppTemplatesPage() {
  useI18n();

  const [activeTab, setActiveTab] = useState("learning_supervisor_intro");
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testLanguage, setTestLanguage] = useState("ar");
  const [showHints, setShowHints] = useState(false);
  const [selectedHint, setSelectedHint] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const [searchQ, setSearchQ] = useState("");
  const [mainTab, setMainTab] = useState("templates");
  const [mobilePane, setMobilePane] = useState("edit");
  const [dbVars, setDbVars] = useState([]);
  const [loadingVars, setLoadingVars] = useState(false);
  const [genderContext, setGenderContext] = useState({
    studentGender: "male",
    guardianType: "father",
    instructorGender: "male",
    ownerGender: "male",
  });

  const [dirty, setDirty] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const textareaRef = useRef(null);
  const hintsRef = useRef(null);
  const [hintsPos, setHintsPos] = useState({ top: 0, left: 0, right: 0 });

  useEffect(() => {
    if (SINGLE_CONTENT_TEMPLATES.includes(activeTab)) setTestLanguage("ar");
  }, [activeTab]);

  useEffect(() => {
    const handler = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    if (!showHints) return;
    const update = () => {
      if (!textareaRef.current) return;
      const r = textareaRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      setHintsPos({
        top: spaceBelow > 280 ? r.bottom + 4 : Math.max(8, r.top - 284),
        left: Math.max(8, r.left),
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

  // ═══════════════════════════════════════════════════════════════════════
  // ✅ HELPER: Safe fetch JSON — بيتعامل مع أي رد مش JSON
  // ═══════════════════════════════════════════════════════════════════════
  const safeFetchJson = useCallback(async (url, options = {}) => {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      if (!text) return { success: false, error: "Empty response" };
      try {
        return JSON.parse(text);
      } catch {
        console.error(`❌ Invalid JSON from ${url}:`, text.slice(0, 200));
        return { success: false, error: "Invalid JSON response" };
      }
    } catch (err) {
      console.error(`❌ Fetch error for ${url}:`, err.message);
      return { success: false, error: err.message };
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // FETCH TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const [sd, id, gd, md] = await Promise.all([
        safeFetchJson("/api/whatsapp/templates"),
        safeFetchJson("/api/whatsapp/instructor-templates"),
        safeFetchJson("/api/whatsapp/group-templates"),
        safeFetchJson("/api/whatsapp/message-templates"),
      ]);

      const map = {};

      // 1. Language Confirmation Templates
      if (sd.success && Array.isArray(sd.data)) {
        sd.data.forEach(t => {
          if (t.templateType === "student_language_confirmation") {
            if (!map["language_confirmation"]) {
              map["language_confirmation"] = {
                ...t,
                content: t.contentAr || t.content || "",
                contentAr: t.contentAr || t.content || "",
                contentEn: t.contentEn || t.content || "",
              };
            }
          } else if (t.templateType === "guardian_language_confirmation") {
            if (!map["guardian_language_notification"]) {
              map["guardian_language_notification"] = {
                ...t,
                content: t.contentAr || t.content || "",
                contentAr: t.contentAr || t.content || "",
                contentEn: t.contentEn || t.content || "",
              };
            }
          } else {
            if (!map[t.templateType]) map[t.templateType] = t;
          }
        });
      }

      // 2. Instructor Templates
      if (id.success && id.data) {
        const list = Array.isArray(id.data) ? id.data : [id.data];
        list.forEach(d => {
          const uiKey = INSTRUCTOR_DB_TO_UI[d.templateType];
          if (uiKey && !map[uiKey]) {
            map[uiKey] = {
              ...d,
              content: d.contentAr || d.content || "",
              contentAr: d.contentAr || d.content || "",
              contentEn: d.contentEn || "",
            };
          }
        });
      }

      // 3. Group Welcome Templates
      if (gd.success && gd.data) {
        const list = Array.isArray(gd.data) ? gd.data : [gd.data];
        const online = list.find(t => t.templateType === "group_welcome");
        if (online && !map["group_student_welcome_student"]) {
          map["group_student_welcome_student"] = {
            ...online,
            templateType: "group_student_welcome_student",
            content: online.studentMaleContentAr || online.studentContentAr || online.content || "",
            contentAr: online.studentMaleContentAr || online.studentContentAr || "",
            contentEn: online.studentMaleContentEn || online.studentContentEn || "",
          };
        }
        if (online && !map["group_student_welcome_guardian"]) {
          map["group_student_welcome_guardian"] = {
            ...online,
            templateType: "group_student_welcome_guardian",
            content: online.guardianFatherContentAr || online.guardianContentAr || "",
            contentAr: online.guardianFatherContentAr || online.guardianContentAr || "",
            contentEn: online.guardianFatherContentEn || online.guardianContentEn || "",
          };
        }
        const offline = list.find(t => t.templateType === "group_welcome_offline");
        if (offline && !map["group_student_welcome_student_offline"]) {
          map["group_student_welcome_student_offline"] = {
            ...offline,
            templateType: "group_student_welcome_student_offline",
            content: offline.studentMaleContentAr || offline.studentContentAr || offline.content || "",
            contentAr: offline.studentMaleContentAr || offline.studentContentAr || "",
            contentEn: offline.studentMaleContentEn || offline.studentContentEn || "",
          };
        }
        if (offline && !map["group_student_welcome_guardian_offline"]) {
          map["group_student_welcome_guardian_offline"] = {
            ...offline,
            templateType: "group_student_welcome_guardian_offline",
            content: offline.guardianFatherContentAr || offline.guardianContentAr || "",
            contentAr: offline.guardianFatherContentAr || offline.guardianContentAr || "",
            contentEn: offline.guardianFatherContentEn || offline.guardianContentEn || "",
          };
        }
      }

      // 4. Message Templates
      if (md.success && Array.isArray(md.data)) {
        md.data.forEach(t => {
          if (!map[t.templateType]) {
            map[t.templateType] = {
              ...t,
              content: t.contentAr || "",
              contentAr: t.contentAr || "",
              contentEn: t.contentEn || "",
              isMessageTemplate: true,
              _messageTemplateId: t._id,
            };
          }
        });
      }

      // 5. Frontend Fallbacks
      Object.entries(FRONTEND_FALLBACKS).forEach(([typeId, fb]) => {
        const existing = map[typeId];
        const hasContent = existing && (existing.contentAr || existing.content || existing.contentEn);

        if (!existing || !hasContent) {
          map[typeId] = {
            ...(existing || {}),
            templateType: typeId,
            content: fb.ar,
            contentAr: fb.ar,
            contentEn: fb.en,
            isMessageTemplate: existing?.isMessageTemplate ?? !["language_confirmation", "guardian_language_notification"].includes(typeId),
            isFrontendFallback: true,
            _messageTemplateId: existing?._messageTemplateId || null,
            _id: existing?._id || null,
          };
        }
      });

      setTemplates(map);
    } catch (err) {
      console.error("❌ fetchTemplates error:", err);
      toast.error("فشل تحميل القوالب");
    } finally {
      setLoading(false);
    }
  }, [safeFetchJson]);

  // ═══════════════════════════════════════════════════════════════════════
  // FETCH VARIABLES
  // ═══════════════════════════════════════════════════════════════════════
  const fetchVariables = useCallback(async () => {
    setLoadingVars(true);
    try {
      const data = await safeFetchJson("/api/whatsapp/template-variables");
      if (data.success && Array.isArray(data.data)) {
        setDbVars(data.data);
      } else {
        toast.error("فشل تحميل المتغيرات");
      }
    } catch {
      toast.error("خطأ في تحميل المتغيرات");
    } finally {
      setLoadingVars(false);
    }
  }, [safeFetchJson]);

  useEffect(() => {
    fetchTemplates();
    fetchVariables();
  }, [fetchTemplates, fetchVariables]);

  // ═══════════════════════════════════════════════════════════════════════
  // RESOLVE VARIABLES
  // ═══════════════════════════════════════════════════════════════════════
  const resolveVarValue = useCallback((v, lang) => {
    if (!v.hasGender) return lang === "ar" ? v.valueAr : v.valueEn;

    const { studentGender, guardianType, instructorGender, ownerGender } = genderContext;

    if (v.genderType === "guardian") {
      return lang === "ar"
        ? (guardianType === "father" ? v.valueFatherAr : v.valueMotherAr) || v.valueAr
        : (guardianType === "father" ? v.valueFatherEn : v.valueMotherEn) || v.valueEn;
    }
    if (v.genderType === "instructor") {
      return lang === "ar"
        ? (instructorGender === "male" ? v.valueMaleAr : v.valueFemaleAr) || v.valueAr
        : (instructorGender === "male" ? v.valueMaleEn : v.valueFemaleEn) || v.valueEn;
    }
    if (v.genderType === "portfolio_owner") {
      return lang === "ar"
        ? (ownerGender === "male" ? v.valueMaleAr : v.valueFemaleAr) || v.valueAr
        : (ownerGender === "male" ? v.valueMaleEn : v.valueFemaleEn) || v.valueEn;
    }
    return lang === "ar"
      ? (studentGender === "male" ? v.valueMaleAr : v.valueFemaleAr) || v.valueAr
      : (studentGender === "male" ? v.valueMaleEn : v.valueFemaleEn) || v.valueEn;
  }, [genderContext]);

  const getVarExamples = useCallback((lang = "ar") => {
    const map = {};
    dbVars.forEach(v => { map[`{${v.key}}`] = resolveVarValue(v, lang); });
    return map;
  }, [dbVars, resolveVarValue]);

  const getVariablesForTemplate = useCallback((templateId, lang = "ar") => {
    return (TEMPLATE_VARS[templateId] || []).map(k => {
      const dbVar = dbVars.find(v => v.key === k);
      if (!dbVar) return null;
      return {
        key: `{${k}}`,
        label: lang === "ar" ? dbVar.labelAr : dbVar.labelEn,
        icon: dbVar.icon,
        example: resolveVarValue(dbVar, lang),
        hasGender: dbVar.hasGender,
        genderType: dbVar.genderType,
      };
    }).filter(Boolean);
  }, [dbVars, resolveVarValue]);

  const isSingleContent = SINGLE_CONTENT_TEMPLATES.includes(activeTab);
  const isLangConfirmation = ["language_confirmation", "guardian_language_notification"].includes(activeTab);
  const curTemplate = templates[activeTab];
  const activeType = TEMPLATE_TYPES.find(t => t.id === activeTab);
  const C = C_MAP[activeType?.color || "primary"];

  const textVal = isSingleContent
    ? (curTemplate?.content || "")
    : testLanguage === "ar"
      ? (curTemplate?.contentAr || curTemplate?.content || "")
      : (curTemplate?.contentEn || curTemplate?.content || "");

  const textDir = isSingleContent ? "auto" : testLanguage === "ar" ? "rtl" : "ltr";

  const updateContent = (val) => {
    const cur = templates[activeTab];
    if (!cur) return;
    setDirty(true);
    if (isSingleContent) {
      setTemplates(p => ({ ...p, [activeTab]: { ...cur, content: val } }));
    } else {
      setTemplates(p => ({
        ...p,
        [activeTab]: {
          ...cur,
          content: val,
          contentAr: testLanguage === "ar" ? val : cur.contentAr,
          contentEn: testLanguage === "en" ? val : cur.contentEn,
        },
      }));
    }
  };

  const buildPreview = (mark) => {
    const tmpl = templates[activeTab];
    if (!tmpl) return "";
    let text = isSingleContent
      ? (tmpl.content || "")
      : testLanguage === "ar" ? (tmpl.contentAr || tmpl.content || "") : (tmpl.contentEn || tmpl.content || "");
    const examples = getVarExamples(testLanguage);
    Object.entries(examples).forEach(([key, val]) => {
      const safe = val ?? "";
      text = text.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), () => (mark ? `${VAR_OPEN}${safe}${VAR_CLOSE}` : safe));
    });
    return text;
  };

  const getPreview = () => buildPreview(false);

  const handleSelectTab = useCallback((tabId) => {
    if (tabId === activeTab) { setSidebarOpen(false); return; }
    if (dirty) {
      const proceed = window.confirm("لديك تعديلات لم تُحفظ على هذا القالب. هل تريد المتابعة وفقدانها؟");
      if (!proceed) return;
    }
    setActiveTab(tabId);
    setDirty(false);
    setSidebarOpen(false);
    setMobilePane("edit");
  }, [activeTab, dirty]);

  const handleMainTabChange = useCallback((id) => {
    if (mainTab === "templates" && id !== "templates" && dirty) {
      const proceed = window.confirm("لديك تعديلات لم تُحفظ. هل تريد المتابعة؟");
      if (!proceed) return;
    }
    setMainTab(id);
  }, [mainTab, dirty]);

  // ═══════════════════════════════════════════════════════════════════════
  // SAVE TEMPLATE
  // ═══════════════════════════════════════════════════════════════════════
 // ═══════════════════════════════════════════════════════════════════════
// SAVE TEMPLATE
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// SAVE TEMPLATE
// ═══════════════════════════════════════════════════════════════════════
const saveTemplate = async () => {
  const cur = templates[activeTab];
  if (!cur) return;
  setSaving(true);
  try {
    let endpoint, payload;

    // ═══════════════════════════════════════════════════════════════
    // 1. Instructor Templates
    // ═══════════════════════════════════════════════════════════════
    if (isInstructorTemplate(activeTab)) {
      endpoint = "/api/whatsapp/instructor-templates";
      const dbType = INSTRUCTOR_TYPE_MAP[activeTab];

      if (cur.isFrontendFallback || !cur._id) {
        const data = await safeFetchJson(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateType: dbType,
            name: activeType?.label || activeTab,
            contentAr: cur.contentAr || cur.content,
            contentEn: cur.contentEn || "",
            isDefault: true,
            isActive: true,
          }),
        });
        if (data.success) {
          await fetchTemplates();
          setDirty(false);
          toast.success("✅ تم حفظ القالب");
        } else {
          toast.error(data.message || data.error || "فشل الحفظ");
        }
        return;
      }

      payload = {
        id: cur._id,
        templateType: dbType,
        contentAr: cur.contentAr || cur.content,
        contentEn: cur.contentEn || "",
        setAsDefault: true,
      };
    }
    // ═══════════════════════════════════════════════════════════════
    // 2. Group Welcome Templates
    // ═══════════════════════════════════════════════════════════════
    else if (activeTab.startsWith("group_student_welcome")) {
      endpoint = "/api/whatsapp/group-templates";
      const isOfflineTab = activeTab.endsWith("_offline");
      const baseKey = isOfflineTab
        ? "group_student_welcome_student_offline"
        : "group_student_welcome_student";
      const base = templates[baseKey] || cur;

      // ✅ FIX: تحديد دقيق لنوع التبويب الحالي
      // ⚠️ مش بنستخدم "_student" لأن كل الـ IDs فيها "_student"
      //    (حتى تبويب ولي الأمر! لأن الـ ID "group_student_welcome_guardian")
      //    الحل: نفحص "_guardian" — ده اللي بيفرّق فعلاً.
      const isGuardianTab = activeTab.includes("_guardian");

      const contentAr = cur.contentAr || cur.content || "";
      const contentEn = cur.contentEn || "";

      // ═══════════════════════════════════════════════════════════════
      // ✅ FIX: نبعت بس الحقول الخاصة بالتبويب الحالي
      //    الـ PUT route بيتجاهل أي حقل undefined، فبكده حقول الطرف
      //    التاني هتفضل زي ما هي في الداتابيز بدون overwrite فاضي.
      // ═══════════════════════════════════════════════════════════════
      payload = {
        id: base?._id || cur._id,
        setAsDefault: true,
      };

      if (isGuardianTab) {
        // ✅ حفظ حقول ولي الأمر فقط (الأب + الأم)
        payload.guardianFatherContentAr = contentAr;
        payload.guardianFatherContentEn = contentEn;
        payload.guardianMotherContentAr = contentAr;
        payload.guardianMotherContentEn = contentEn;
        console.log("🔒 [Group Template] Saving GUARDIAN slots:", {
          templateId: base?._id || cur._id,
          contentArPreview: contentAr.slice(0, 60),
        });
      } else {
        // ✅ حفظ حقول الطالب فقط (الذكر + الأنثى)
        payload.studentMaleContentAr = contentAr;
        payload.studentMaleContentEn = contentEn;
        payload.studentFemaleContentAr = contentAr;
        payload.studentFemaleContentEn = contentEn;
        console.log("🔒 [Group Template] Saving STUDENT slots:", {
          templateId: base?._id || cur._id,
          contentArPreview: contentAr.slice(0, 60),
        });
      }
    }
    // ═══════════════════════════════════════════════════════════════
    // 3. Language Confirmation
    // ═══════════════════════════════════════════════════════════════
    else if (isLangConfirmation) {
      endpoint = "/api/whatsapp/templates";
      const dbType = activeTab === "language_confirmation"
        ? "student_language_confirmation"
        : "guardian_language_confirmation";

      if (cur.isFrontendFallback || !cur._id) {
        const data = await safeFetchJson(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateType: dbType,
            name: activeTab === "language_confirmation"
              ? "تأكيد اللغة للطالب"
              : "تأكيد اللغة لولي الأمر",
            content: cur.contentAr || cur.content,
            contentAr: cur.contentAr || cur.content,
            contentEn: cur.contentEn || "",
            description: "",
            isDefault: true,
            isActive: true,
            setAsDefault: true,
          }),
        });
        if (data.success) {
          await fetchTemplates();
          setDirty(false);
          toast.success("✅ تم حفظ القالب");
        } else {
          toast.error(data.message || data.error || "فشل الحفظ");
        }
        return;
      }

      payload = {
        id: cur._id,
        content: cur.contentAr || cur.content,
        contentAr: cur.contentAr || cur.content,
        contentEn: cur.contentEn || "",
        setAsDefault: true,
      };
    }
    // ═══════════════════════════════════════════════════════════════
    // 4. Message Templates
    // ═══════════════════════════════════════════════════════════════
    else if (cur.isMessageTemplate) {
      endpoint = "/api/whatsapp/message-templates";

      if (cur.isFrontendFallback || !cur._messageTemplateId) {
        const data = await safeFetchJson(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateType: activeTab,
            contentAr: cur.contentAr || cur.content,
            contentEn: cur.contentEn || "",
            recipientType: getRecipientType(activeTab),
            name: activeTab,
            isDefault: true,
            isActive: true,
          }),
        });
        if (data.success) {
          await fetchTemplates();
          setDirty(false);
          toast.success("✅ تم حفظ القالب");
        } else {
          toast.error(data.message || data.error || "فشل الحفظ");
        }
        return;
      }

      payload = {
        _id: cur._messageTemplateId || cur._id,
        templateType: activeTab,
        contentAr: cur.contentAr || cur.content,
        contentEn: cur.contentEn,
        recipientType: getRecipientType(activeTab),
      };
    }
    // ═══════════════════════════════════════════════════════════════
    // 5. Fallback
    // ═══════════════════════════════════════════════════════════════
    else {
      endpoint = "/api/whatsapp/templates";
      payload = { id: cur._id, content: cur.content, setAsDefault: true };
    }

    // ═══════════════════════════════════════════════════════════════
    // إرسال الطلب
    // ═══════════════════════════════════════════════════════════════
    const data = await safeFetchJson(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (data.success) {
      await fetchTemplates();
      setDirty(false);
      toast.success("✅ تم حفظ القالب");
    } else {
      toast.error(data.message || data.error || "فشل الحفظ");
    }
  } catch (err) {
    console.error("❌ saveTemplate error:", err);
    toast.error("خطأ في الحفظ");
  } finally {
    setSaving(false);
  }
};

  const allVars = getVariablesForTemplate(activeTab, testLanguage);

  const relevantRoles = new Set();
  allVars.forEach(v => {
    if (!v.hasGender) return;
    relevantRoles.add(
      v.genderType === "guardian" ? "guardian"
        : v.genderType === "instructor" ? "instructor"
          : v.genderType === "portfolio_owner" ? "owner"
            : "student"
    );
  });

  const insertVariable = (variable) => {
    const before = textVal.substring(0, cursorPos);
    const lastAt = before.lastIndexOf("@");
    const text = variable.key;
    let newVal, newPos;
    if (lastAt !== -1) { newVal = textVal.substring(0, lastAt) + text + textVal.substring(cursorPos); newPos = lastAt + text.length; }
    else { newVal = textVal.substring(0, cursorPos) + text + textVal.substring(cursorPos); newPos = cursorPos + text.length; }
    updateContent(newVal);
    setShowHints(false);
    setCursorPos(newPos);
    setTimeout(() => { textareaRef.current?.focus(); textareaRef.current?.setSelectionRange(newPos, newPos); }, 0);
  };

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
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedHint(p => (p + 1) % allVars.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedHint(p => (p - 1 + allVars.length) % allVars.length); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertVariable(allVars[selectedHint]); }
    else if (e.key === "Escape") { e.preventDefault(); setShowHints(false); }
  };

  useEffect(() => {
    const handler = (e) => { if (hintsRef.current && !hintsRef.current.contains(e.target)) setShowHints(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openVariablePicker = () => {
    const pos = textareaRef.current ? textareaRef.current.selectionStart : textVal.length;
    setCursorPos(pos);
    setSelectedHint(0);
    setShowHints(true);
    textareaRef.current?.focus();
  };

  const insertAtCaret = (v) => {
    const pos = textareaRef.current ? textareaRef.current.selectionStart : textVal.length;
    setCursorPos(pos);
    insertVariable(v);
  };

  const sendTest = async () => {
    if (!testPhone) { toast.error("أدخل رقم الهاتف"); return; }
    setTesting(true);
    try {
      const data = await safeFetchJson("/api/whatsapp/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: testPhone, messageContent: getPreview(), messageType: activeTab, language: testLanguage }),
      });
      if (data.success) toast.success(`✅ تم الإرسال إلى ${testPhone}`);
      else toast.error(data.message || "فشل الإرسال");
    } catch {
      toast.error("خطأ في الإرسال");
    } finally {
      setTesting(false);
    }
  };

  const filtered = TEMPLATE_TYPES.filter(t => !searchQ || t.label.includes(searchQ));
  const byCategory = filtered.reduce((acc, t) => { if (!acc[t.category]) acc[t.category] = []; acc[t.category].push(t); return acc; }, {});

  if (loading && Object.keys(templates).length === 0) return (
    <div className="flex min-h-[500px] flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6700] to-[#004d59] shadow-xl">
          <MessageCircle className="h-7 w-7 text-white" />
        </div>
        <div className="absolute -inset-1 animate-ping rounded-3xl border-2 border-[#ff6700]/30" />
      </div>
      <p className="animate-pulse text-sm text-slate-500 dark:text-slate-400">جاري تحميل القوالب...</p>
    </div>
  );

  const previewNodes = renderWhatsApp(buildPreview(true));

  const langOptions = [
    { id: "ar", label: "🇸🇦 عربي" },
    { id: "en", label: "🇬🇧 English" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#0f1117]" dir="rtl">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-[#161b27]/95">
        <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
          <div className="flex flex-shrink-0 items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6700] to-[#004d59]">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-none text-slate-900 dark:text-white">قوالب الرسائل</p>
              <p className="mt-1 text-[11px] leading-none text-slate-500 dark:text-slate-400">WhatsApp Templates</p>
            </div>
          </div>

          <div className="mx-1 hidden h-6 w-px flex-shrink-0 bg-slate-200 dark:bg-slate-700 sm:block" />

          <Segmented
            className="flex-shrink-0"
            value={mainTab}
            onChange={handleMainTabChange}
            options={[
              { id: "templates", icon: MessageCircle, label: "القوالب" },
              { id: "variables", icon: Settings, label: "المتغيرات", badge: dbVars.length },
            ]}
          />

          {mainTab === "templates" && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200 lg:hidden ${FOCUS}`}
            >
              {activeType && <activeType.icon className="h-3.5 w-3.5 flex-shrink-0" />}
              <span className="flex-1 truncate text-right">{activeType?.emoji} {activeType?.label}</span>
              {dirty && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#feaf00]" />}
              <Menu className="h-3.5 w-3.5 flex-shrink-0" />
            </button>
          )}

          <button
            type="button"
            aria-label="تحديث"
            title="تحديث القوالب والمتغيرات"
            onClick={() => { fetchTemplates(); fetchVariables(); }}
            className={`mr-auto flex-shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 ${FOCUS}`}
          >
            <RefreshCw className={`h-4 w-4 ${loading || loadingVars ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1">
        {mainTab === "templates" && (
          <TemplateSidebar
            byCategory={byCategory}
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            searchQ={searchQ}
            setSearchQ={setSearchQ}
            templates={templates}
            isOpenMobile={sidebarOpen}
            onCloseMobile={() => setSidebarOpen(false)}
          />
        )}

        <main className="min-w-0 flex-1">
          {mainTab === "variables" && (
            <VariablesTab dbVars={dbVars} setDbVars={setDbVars} loadingVars={loadingVars} />
          )}

          {mainTab === "templates" && (
            <div className="mx-auto w-full max-w-[1400px] p-3 pb-28 sm:p-4 lg:p-6 xl:pb-6">
              {activeType && (
                <div className="mb-4 flex items-start gap-3">
                  <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${C.bg}`}>
                    <activeType.icon className={`h-5 w-5 ${C.onBg}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">{activeType.emoji} {activeType.label}</h1>
                      {activeType.isNew && <span className="rounded-full bg-[#ff6700] px-1.5 py-0.5 text-[10px] font-bold text-white">NEW</span>}
                      {dirty && (
                        <span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/30 dark:text-amber-400">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" /> تعديلات غير محفوظة
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {activeType.type.includes("student") && <Chip tone={C}>👤 للطالب</Chip>}
                      {activeType.type.includes("guardian") && <Chip tone={TONE.secondary}>👨‍👩‍👧 لولي الأمر</Chip>}
                      {activeType.type.includes("instructor") && <Chip tone={TONE.accent}>👨‍🏫 للمدرب</Chip>}
                      {activeType.category === "portfolio" && <Chip tone={TONE.accent}>💼 لصاحب البورتفوليو</Chip>}
                      {activeType.type.includes("group") && <Chip tone={TONE.primary}>👥 بيانات المجموعة</Chip>}
                      {activeType.type.includes("session") && <Chip tone={TONE.secondary}>📅 بيانات الحصة</Chip>}
                      {activeType.category === "offline" && <Chip tone={TONE.accent}>📍 Offline</Chip>}
                      {activeType.category === "makeup" && <Chip tone={TONE.primary}>🎁 تعويضية</Chip>}
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{allVars.length} متغير</span>
                    </div>
                  </div>
                </div>
              )}

              {templates[activeTab]?.isFrontendFallback && (
                <Notice tone={TONE.accent} icon={AlertCircle} title="القالب ده لسه معندوش نسخة محفوظة في قاعدة البيانات">
                  المعروض دلوقتي قيمة افتراضية جاهزة فقط. اضغط <strong>"حفظ التغييرات"</strong> عشان تفعّل القالب فعليًا في النظام.
                </Notice>
              )}

              {isLangConfirmation && (
                <Notice tone={TONE.secondary} icon={Globe} title="قالب باللغة المختارة فقط">
                  القالب ده بيتبعت <strong>باللغة اللي اختارها الطالب فعلاً</strong>.
                </Notice>
              )}

              <div className="mb-3 xl:hidden">
                <Segmented
                  className="w-full [&>button]:flex-1 [&>button]:justify-center"
                  value={mobilePane}
                  onChange={setMobilePane}
                  options={[
                    { id: "edit", icon: Edit, label: "التحرير" },
                    { id: "preview", icon: Eye, label: "المعاينة" },
                  ]}
                />
              </div>

              <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                {/* ── التحرير ── */}
                <div className={`${mobilePane === "edit" ? "block" : "hidden"} min-w-0 space-y-4 xl:block`}>
                  <div className={PANEL}>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                          <Edit className={`h-3.5 w-3.5 ${C.text}`} />
                          تحرير القالب
                        </span>
                        {isSingleContent ? (
                          <Chip tone={TONE.slate}>🌐 رسالة ثنائية اللغة</Chip>
                        ) : (
                          <Segmented size="sm" options={langOptions} value={testLanguage} onChange={setTestLanguage} />
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{textVal.length} حرف</span>
                        <button
                          type="button"
                          onClick={openVariablePicker}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-transform active:scale-95 ${C.bg} ${C.onBg} ${FOCUS}`}
                        >
                          <Zap className="h-3.5 w-3.5" /> إدراج متغير
                        </button>
                      </div>
                    </div>

                    <div className="relative p-4">
                      <textarea
                        ref={textareaRef}
                        value={textVal}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        onClick={e => setCursorPos(e.target.selectionStart)}
                        dir={textDir}
                        placeholder={testLanguage === "ar" ? "اكتب الرسالة... اكتب @ أو اضغط \"إدراج متغير\"" : "Write your message... type @ or use \"Insert variable\""}
                        className={`${INPUT} h-56 resize-y px-4 py-3 text-[15px] leading-8 sm:h-72 xl:h-[26rem]`}
                      />

                      {showHints && allVars.length > 0 && (
                        <div
                          ref={hintsRef}
                          role="listbox"
                          className="fixed z-[9999] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#1a2236]"
                          style={{ top: hintsPos.top, left: hintsPos.left, right: hintsPos.right, maxWidth: "calc(100vw - 16px)" }}
                        >
                          <div className={`flex items-center gap-2 border-b px-3 py-2 ${C.light} ${C.border}`}>
                            <Zap className={`h-3.5 w-3.5 ${C.text}`} />
                            <span className={`text-xs font-bold ${C.text}`}>اختر متغيراً — هيتحط مكانه في النص</span>
                          </div>
                          <div className="no-scrollbar max-h-60 overflow-y-auto">
                            {allVars.map((v, idx) => (
                              <button
                                type="button"
                                role="option"
                                aria-selected={idx === selectedHint}
                                key={v.key}
                                onClick={() => insertVariable(v)}
                                className={`flex w-full items-center gap-3 px-3 py-2.5 text-right transition-colors ${idx === selectedHint ? C.light : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                              >
                                <span className="flex-shrink-0 text-base">{v.icon}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span dir="ltr" className={`font-mono text-[11px] font-bold ${C.text}`}>{v.key}</span>
                                    <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">{v.label}</span>
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-400">مثال:</span>
                                    <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{v.example}</span>
                                    {v.hasGender && <span className="text-[10px] text-slate-400">⚧</span>}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                          <div className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-center text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                            ↑ ↓ للتنقل &bull; Enter للإدراج &bull; Esc للإغلاق
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                      <p className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <Sparkles className="h-3 w-3 flex-shrink-0" /> اكتب @ أو اضغط "إدراج متغير" — القيم بتيجي من الداتابيز، و*نص* بيطلع عريض في واتساب
                      </p>
                      <button
                        type="button"
                        onClick={saveTemplate}
                        disabled={saving}
                        className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold transition-all active:scale-95 ${FOCUS} ${saving ? "cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-700" : `${C.bg} ${C.onBg} hover:opacity-90`}`}
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                      </button>
                    </div>
                  </div>

                  {allVars.length > 0 && (
                    <div className={`${PANEL} p-4`}>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                          <Zap className={`h-3.5 w-3.5 ${C.text}`} />
                          متغيرات القالب — اضغط للإدراج مكان المؤشر
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMainTabChange("variables")}
                          className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold hover:bg-[#ff6700]/10 ${ORANGE_TEXT} ${FOCUS}`}
                        >
                          <Settings className="h-3 w-3" /> تعديل القيم
                        </button>
                      </div>
                      <div className="no-scrollbar flex max-h-32 flex-wrap gap-1.5 overflow-y-auto sm:max-h-none">
                        {allVars.map(v => (
                          <button
                            type="button"
                            key={v.key}
                            title={`${v.key} ← ${v.example}`}
                            onClick={() => insertAtCaret(v)}
                            className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs transition-colors hover:border-[#ff6700]/40 hover:bg-[#ff6700]/5 active:scale-95 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-[#ff6700]/10 ${FOCUS}`}
                          >
                            <span>{v.icon}</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">{v.label}</span>
                            <span className="max-w-[120px] truncate font-normal text-slate-400 dark:text-slate-500">{v.example}</span>
                            {v.hasGender && <span className="text-[10px] text-slate-400">⚧</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`${PANEL} p-4`}>
                    <div className="mb-3 flex items-center gap-2">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${TONE.secondary.bg}`}>
                        <Send className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">إرسال تجريبي</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">— بيبعت المعاينة الحالية بالقيم التجريبية</span>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="tel"
                        value={testPhone}
                        onChange={e => setTestPhone(e.target.value)}
                        placeholder="+201234567890"
                        dir="ltr"
                        className={`${INPUT} flex-1 px-3 py-2`}
                      />
                      <button
                        type="button"
                        onClick={sendTest}
                        disabled={testing}
                        className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50 ${TONE.secondary.bg} hover:opacity-90 ${FOCUS}`}
                      >
                        {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {testing ? "جاري الإرسال..." : "إرسال"}
                      </button>
                    </div>
                  </div>

                  <details className={`${PANEL} group px-4 py-3`}>
                    <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                      <Info className={`h-3.5 w-3.5 ${C.text}`} /> نصائح للتحرير
                      <ChevronDown className="mr-auto h-3.5 w-3.5 text-slate-400 transition-transform group-open:rotate-180" />
                    </summary>
                    <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      <li>• اضغط "إدراج متغير" أو اكتب @ لعرض المتغيرات — القيم من الداتابيز.</li>
                      <li>• المتغيرات اللي عليها ⚧ بتتغير حسب الجنس المختار في المعاينة.</li>
                      <li>• "تعديل القيم" بيفتحلك تبويب المتغيرات لتعديل قيم الجنس.</li>
                      {isSingleContent && <li>• 🌐 القالب ده رسالة واحدة فيها عربي وإنجليزي مع بعض.</li>}
                      {activeType?.category === "offline" && <li>• 📍 قوالب Offline فيها متغيرات الموقع (placeName، address، mapsLink).</li>}
                      {activeType?.category === "makeup" && <li>• 🎁 قوالب الحصة التعويضية بتتبعت لما الأدمن يفعّل جروب تعويضي.</li>}
                    </ul>
                  </details>
                </div>

                {/* ── المعاينة ── */}
                <div className={`${mobilePane === "preview" ? "block" : "hidden"} no-scrollbar min-w-0 space-y-3 xl:sticky xl:top-[72px] xl:block xl:max-h-[calc(100vh-88px)] xl:overflow-y-auto`}>
                  <div className="flex items-center gap-2 px-1">
                    <Eye className={`h-3.5 w-3.5 ${C.text}`} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">معاينة مباشرة</span>
                    <span className="mr-auto flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> بتتحدث وأنت بتكتب
                    </span>
                  </div>

                  <PreviewContext
                    genderContext={genderContext}
                    setGenderContext={setGenderContext}
                    relevantRoles={relevantRoles}
                  />

                  <PhonePreview nodes={previewNodes} dir={textDir} />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {mainTab === "templates" && dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 p-3 xl:hidden">
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-white/95 p-3 shadow-xl backdrop-blur-md dark:border-amber-800/40 dark:bg-[#161b27]/95">
            <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
              <span className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-amber-500" />
              <span className="truncate">لديك تعديلات غير محفوظة</span>
            </span>
            <button
              type="button"
              onClick={saveTemplate}
              disabled={saving}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold ${saving ? "bg-slate-300 text-white" : `${C.bg} ${C.onBg}`} ${FOCUS}`}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "جاري الحفظ..." : "حفظ الآن"}
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        details > summary::-webkit-details-marker { display: none; }
        @media (prefers-reduced-motion: reduce) {
          .animate-pulse, .animate-ping { animation: none !important; }
        }
      `}</style>
    </div>
  );
}