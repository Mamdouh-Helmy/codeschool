"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";
import toast from "react-hot-toast";

// ─── Icons ────────────────────────────────────────────────────────────────
const Icon = {
  Users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  ),
  Check: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  UserPlus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  ),
  Eye: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Zap: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  X: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  ),
  Loader: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  Link: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  Calendar: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  ),
  School: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 6 8-4 8 4" /><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2" />
      <path d="M14 22v-4a2 2 0 0 0-4 0v4" /><path d="M18 5v17" /><path d="M6 5v17" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  ),
  MapPin: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Alert: () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  ),
  BookOpen: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
};

// ─── Avatar ──────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: "#EDE9FF", text: "#5B4FCF" },
  { bg: "#E0F5EE", text: "#0D6B50" },
  { bg: "#FAE8E5", text: "#922E18" },
  { bg: "#F5EBF8", text: "#8A3FA8" },
  { bg: "#E4F0FD", text: "#1459A0" },
];

function getInitials(name = "") {
  const parts = String(name || "").trim().split(" ").filter(Boolean);
  if (parts.length >= 2) return parts[0][0] + parts[1][0];
  return parts[0]?.[0] || "؟";
}

function getAvatarColor(name = "") {
  let hash = 0;
  const s = String(name || "");
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const safe = (v) => (v === undefined || v === null ? "" : String(v));

// ✅ Helper: build maps link for offline
function buildMapsLink(group) {
  const loc = group?.locationDetails || {};
  if (loc.lat != null && loc.lng != null) {
    return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
  }
  if (loc.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`;
  }
  if (loc.placeName || group?.location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.placeName || group.location)}`;
  }
  return "";
}

// ✅ Helper: كشف إذا كان النص بتاع ولي الأمر وليس الطالب
const GUARDIAN_MARKERS = [
  "{guardianSalutation",
  "{guardianSalutation_ar}",
  "{guardianSalutation_en}",
  "{childTitle}",
  "{guardianName}",
];
const STUDENT_MARKERS = [
  "{salutation_ar}",
  "{salutation_en}",
  "{studentSalutation}",
  "{studentName}",
];

function looksLikeGuardianContent(text) {
  if (!text) return false;
  const hasGuardian = GUARDIAN_MARKERS.some((m) => text.includes(m));
  const hasStudent = STUDENT_MARKERS.some((m) => text.includes(m));
  return hasGuardian && !hasStudent;
}

// ─── Main Component ──────────────────────────────────────────────────────
export default function AddStudentsToGroup({ groupId, onClose, onStudentAdded }) {
  const { locale } = useLocale();
  const { t } = useI18n();

  const [students, setStudents] = useState([]);
  const [group, setGroup] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  const [courseModule, setCourseModule] = useState({
    title: "",
    description: "",
  });

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [studentMessage, setStudentMessage] = useState("");
  const [guardianMessage, setGuardianMessage] = useState("");
  const [moduleOverviewMessage, setModuleOverviewMessage] = useState("");

  const [studentPreview, setStudentPreview] = useState("");
  const [guardianPreview, setGuardianPreview] = useState("");
  const [moduleOverviewPreview, setModuleOverviewPreview] = useState("");

  const [showStudentHints, setShowStudentHints] = useState(false);
  const [showGuardianHints, setShowGuardianHints] = useState(false);
  const [showModuleOverviewHints, setShowModuleOverviewHints] = useState(false);
  const [selectedHintIndex, setSelectedHintIndex] = useState(0);

  const [studentCursor, setStudentCursor] = useState(0);
  const [guardianCursor, setGuardianCursor] = useState(0);
  const [moduleOverviewCursor, setModuleOverviewCursor] = useState(0);

  const [dbVars, setDbVars] = useState({});
  const [loadingVars, setLoadingVars] = useState(false);
  const [supervisorGender, setSupervisorGender] = useState("male");

  const [templates, setTemplates] = useState({
    studentMaleAr: "", studentMaleEn: "",
    studentFemaleAr: "", studentFemaleEn: "",
    guardianFatherAr: "", guardianFatherEn: "",
    guardianMotherAr: "", guardianMotherEn: "",
    moduleOverviewAr: "", moduleOverviewEn: "",
  });

  const saveTimer = useRef(null);
  const templateId = useRef(null);
  const studentTextareaRef = useRef(null);
  const guardianTextareaRef = useRef(null);
  const moduleOverviewTextareaRef = useRef(null);
  const studentHintsRef = useRef(null);
  const guardianHintsRef = useRef(null);
  const moduleOverviewHintsRef = useRef(null);

  const isRTL = locale === "ar";

  // ─── Helpers ─────────────────────────────────────────────────────────
  const getGenderFlags = useCallback((student) => {
    if (!student) return { isMale: true, isFather: true };
    const gender = String(student?.personalInfo?.gender || "Male").toLowerCase();
    const relationship = String(student?.guardianInfo?.relationship || "father").toLowerCase();
    return { isMale: gender !== "female", isFather: relationship !== "mother" };
  }, []);

  const buildInstructorsNames = (instructors, language = "ar") => {
    if (!Array.isArray(instructors) || !instructors.length) return "";
    const names = instructors.map(i => i?.userId?.name || i?.name).filter(Boolean);
    if (!names.length) return "";
    if (names.length === 1) return names[0];
    if (language === "ar") {
      return names.length === 2 ? `${names[0]} و ${names[1]}` : names.slice(0, -1).join(" / ") + " / " + names.at(-1);
    }
    return names.length === 2 ? `${names[0]} & ${names[1]}` : names.slice(0, -1).join(", ") + " & " + names.at(-1);
  };

  const fetchDbVariables = async () => {
    setLoadingVars(true);
    try {
      const res = await fetch("/api/whatsapp/template-variables");
      const data = await res.json();
      if (data.success && data.data) {
        const map = {};
        data.data.forEach(v => { if (v?.key) map[v.key] = v; });
        setDbVars(map);
      }
    } catch (err) {
      console.error("❌ Error fetching template variables:", err);
    } finally {
      setLoadingVars(false);
    }
  };

  const resolveVar = useCallback((key, lang = "ar", genderContext = {}) => {
    const v = dbVars[key];
    if (!v) return null;
    try {
      const { studentGender = "Male", guardianType = "father", instructorGender = "male" } = genderContext || {};
      const isMale = String(studentGender).toLowerCase() !== "female";
      const isFather = String(guardianType).toLowerCase() !== "mother";
      const isMaleInstructor = String(instructorGender).toLowerCase() !== "female";
      if (v.hasGender) {
        if (v.genderType === "student") {
          return lang === "ar"
            ? (isMale ? v.valueMaleAr : v.valueFemaleAr) || v.valueAr || null
            : (isMale ? v.valueMaleEn : v.valueFemaleEn) || v.valueEn || null;
        }
        if (v.genderType === "guardian") {
          return lang === "ar"
            ? (isFather ? v.valueFatherAr : v.valueMotherAr) || v.valueAr || null
            : (isFather ? v.valueFatherEn : v.valueMotherEn) || v.valueEn || null;
        }
        if (v.genderType === "instructor") {
          return lang === "ar"
            ? (isMaleInstructor ? v.valueMaleAr : v.valueFemaleAr) || v.valueAr || null
            : (isMaleInstructor ? v.valueMaleEn : v.valueFemaleEn) || v.valueEn || null;
        }
      }
      return lang === "ar" ? (v.valueAr || null) : (v.valueEn || null);
    } catch (err) {
      console.warn("⚠️ resolveVar error:", key, err);
      return null;
    }
  }, [dbVars]);

  // ✅ getStudentContext
  const getStudentContext = useCallback(() => {
    if (!selectedStudent) return null;
    try {
      const lang = selectedStudent?.communicationPreferences?.preferredLanguage || "ar";
      const studentGender = selectedStudent?.personalInfo?.gender || "Male";
      const guardianType = selectedStudent?.guardianInfo?.relationship || "father";
      const genderCtx = { studentGender, guardianType, instructorGender: supervisorGender };
      const { isMale, isFather } = getGenderFlags(selectedStudent);

      const studentFullName = safe(selectedStudent?.personalInfo?.fullName);
      const guardianFullName = safe(selectedStudent?.guardianInfo?.name);

      const studentNickAr = safe(selectedStudent?.personalInfo?.nickname?.ar) || studentFullName.split(" ")[0] || "الطالب";
      const studentNickEn = safe(selectedStudent?.personalInfo?.nickname?.en) || studentFullName.split(" ")[0] || "Student";
      const guardianNickAr = safe(selectedStudent?.guardianInfo?.nickname?.ar) || guardianFullName.split(" ")[0] || "ولي الأمر";
      const guardianNickEn = safe(selectedStudent?.guardianInfo?.nickname?.en) || guardianFullName.split(" ")[0] || "Guardian";

      const studentNick = lang === "ar" ? studentNickAr : studentNickEn;
      const guardianNick = lang === "ar" ? guardianNickAr : guardianNickEn;

      const salutationBaseAr = resolveVar("salutation_ar", "ar", genderCtx) || (isMale ? "عزيزي الطالب" : "عزيزتي الطالبة");
      const salutationBaseEn = resolveVar("salutation_en", "en", genderCtx) || "Dear student";
      const guardianSalutationBaseAr = resolveVar("guardianSalutation_ar", "ar", genderCtx) || (isFather ? "عزيزي الأستاذ" : "عزيزتي السيدة");
      const guardianSalutationBaseEn = resolveVar("guardianSalutation_en", "en", genderCtx) || (isFather ? "Dear Mr." : "Dear Mrs.");
      const childTitleAr = resolveVar("childTitle", "ar", genderCtx) || (isMale ? "ابنك" : "ابنتك");
      const childTitleEn = resolveVar("childTitle", "en", genderCtx) || (isMale ? "your son" : "your daughter");
      const childTitle = lang === "ar" ? childTitleAr : childTitleEn;

      const salutationAr = `${salutationBaseAr} ${studentNickAr}`;
      const salutationEn = `${salutationBaseEn} ${studentNickEn}`;
      const guardianSalutationAr = `${guardianSalutationBaseAr} ${guardianNickAr}`;
      const guardianSalutationEn = `${guardianSalutationBaseEn} ${guardianNickEn}`;

      return {
        lang, studentGender, guardianType, isMale, isFather,
        studentNick, guardianNick, childTitle,
        studentSalutation: lang === "ar" ? salutationAr : salutationEn,
        guardianSalutation: lang === "ar" ? guardianSalutationAr : guardianSalutationEn,
        salutationAr, salutationEn,
        guardianSalutationAr, guardianSalutationEn,
        childTitleAr, childTitleEn,
        supervisorNameValue: safe(resolveVar("supervisorName", lang, genderCtx)),
        isOffline,
      };
    } catch (err) {
      console.error("❌ getStudentContext error:", err);
      return null;
    }
  }, [selectedStudent, resolveVar, getGenderFlags, supervisorGender, isOffline]);

  // ✅ buildReplacementsMap — كل المتغيرات متاحة دايماً
  const buildReplacementsMap = useCallback(() => {
    const ctx = getStudentContext();
    if (!ctx || !group) return {};

    try {
      const {
        lang, isMale, isFather, studentNick, guardianNick, childTitle,
        salutationAr, salutationEn, guardianSalutationAr, guardianSalutationEn,
        childTitleAr, childTitleEn,
        supervisorNameValue,
      } = ctx;

      const startDate = group?.schedule?.startDate
        ? new Date(group.schedule.startDate).toLocaleDateString(
            lang === "ar" ? "ar-EG" : "en-US",
            { weekday: "long", year: "numeric", month: "long", day: "numeric" }
          )
        : "";

      const instructorNames = buildInstructorsNames(group?.instructors, lang);

      const moduleTitleValue =
        courseModule?.title ||
        group?.courseSnapshot?.currentModuleTitle ||
        group?.courseSnapshot?.title ||
        "";

      const moduleDescriptionValue = courseModule?.description || "";

      // Location data (Offline)
      const loc = group?.locationDetails || {};
      const placeName = loc.placeName || group?.location || "";
      const address = loc.address || loc.extraDetails || "";
      const mapsLink = isOffline ? buildMapsLink(group) : "";

      // Meeting link (Online only)
      const meetingLink = !isOffline ? safe(group?.firstMeetingLink) : "";

      // Smart block
      const sessionLocationBlock = isOffline
        ? [
            placeName && `📍 ${lang === "ar" ? "المكان" : "Location"}: ${placeName}`,
            address && `📌 ${lang === "ar" ? "العنوان" : "Address"}: ${address}`,
            mapsLink && `🗺️ ${lang === "ar" ? "اللوكيشن" : "Maps"}: ${mapsLink}`,
          ].filter(Boolean).join("\n")
        : meetingLink
          ? `🔗 ${lang === "ar" ? "رابط الجلسة" : "Meeting Link"}: ${meetingLink}`
          : "";

      return {
        // ── Student vars ──────────────────────────────────────────
        "{salutation_ar}": safe(salutationAr) || (isMale ? `عزيزي الطالب ${studentNick}` : `عزيزتي الطالبة ${studentNick}`),
        "{salutation_en}": safe(salutationEn) || `Dear student ${studentNick}`,
        "{studentSalutation}": safe(lang === "ar" ? salutationAr : salutationEn),
        "{studentName}": safe(studentNick),
        "{studentFullName}": safe(selectedStudent?.personalInfo?.fullName),

        // ── Guardian vars ─────────────────────────────────────────
        "{guardianSalutation}": safe(lang === "ar" ? guardianSalutationAr : guardianSalutationEn),
        "{guardianSalutation_ar}": safe(guardianSalutationAr) || (isFather ? `عزيزي الأستاذ ${guardianNick}` : `عزيزتي السيدة ${guardianNick}`),
        "{guardianSalutation_en}": safe(guardianSalutationEn) || `${isFather ? "Dear Mr." : "Dear Mrs."} ${guardianNick}`,
        "{guardianName}": safe(guardianNick),
        "{guardianFullName}": safe(selectedStudent?.guardianInfo?.name),
        "{childTitle}": safe(childTitle),
        "{childTitle_ar}": safe(childTitleAr),
        "{childTitle_en}": safe(childTitleEn),

        // ── Common ────────────────────────────────────────────────
        "{groupName}": safe(group?.name),
        "{groupCode}": safe(group?.code),
        "{courseName}": safe(group?.courseSnapshot?.title),
        "{startDate}": safe(startDate),
        "{timeFrom}": safe(group?.schedule?.timeFrom),
        "{timeTo}": safe(group?.schedule?.timeTo),
        "{instructor}": safe(instructorNames),
        "{moduleTitle}": safe(moduleTitleValue),
        "{moduleDescription}": safe(moduleDescriptionValue),
        "{supervisorName}": safe(supervisorNameValue),

        // ── Online ────────────────────────────────────────────────
        "{firstMeetingLink}": meetingLink,
        "{meetingLink}": meetingLink,

        // ── Offline ───────────────────────────────────────────────
        "{placeName}": isOffline ? safe(placeName) : "",
        "{address}": isOffline ? safe(address) : "",
        "{mapsLink}": isOffline ? safe(mapsLink) : "",

        // ── Smart block ───────────────────────────────────────────
        "{sessionLocationBlock}": sessionLocationBlock,
      };
    } catch (err) {
      console.error("❌ buildReplacementsMap error:", err);
      return {};
    }
  }, [getStudentContext, group, courseModule, isOffline, selectedStudent]);

  // ✅ replaceVars
  const replaceVars = useCallback((msg) => {
    if (!msg || !selectedStudent || !group) return safe(msg);
    try {
      const map = buildReplacementsMap();
      if (!map || typeof map !== "object") return safe(msg);

      let result = String(msg);
      for (const [key, value] of Object.entries(map)) {
        if (value === undefined || value === null) continue;
        try {
          result = result.replace(
            new RegExp(key.replace(/[{}]/g, "\\$&"), "g"),
            String(value)
          );
        } catch (innerErr) {
          console.warn("⚠️ Failed to replace", key, innerErr);
        }
      }
      return result;
    } catch (err) {
      console.error("❌ replaceVars error:", err);
      return safe(msg);
    }
  }, [selectedStudent, group, buildReplacementsMap]);

  // ✅ getStudentVariables
  const getStudentVariables = useCallback(() => {
    const ctx = getStudentContext();
    if (!ctx || !group) return [];
    const map = buildReplacementsMap();
    const lang = ctx.lang;

    const base = [
      { key: "{salutation_ar}", icon: "👋", label: lang === "ar" ? "تحية الطالب (عربي)" : "Student Salutation (AR)", example: map["{salutation_ar}"] },
      { key: "{salutation_en}", icon: "👋", label: lang === "ar" ? "تحية الطالب (إنجليزي)" : "Student Salutation (EN)", example: map["{salutation_en}"] },
      { key: "{studentSalutation}", icon: "👋", label: lang === "ar" ? "تحية الطالب (موحّدة)" : "Student Salutation", example: map["{studentSalutation}"] },
      { key: "{studentName}", icon: "👤", label: lang === "ar" ? "اسم الطالب" : "Student Name", example: map["{studentName}"] },
      { key: "{groupName}", icon: "👥", label: lang === "ar" ? "اسم المجموعة" : "Group Name", example: map["{groupName}"] },
      { key: "{courseName}", icon: "📚", label: lang === "ar" ? "اسم الكورس" : "Course Name", example: map["{courseName}"] },
      { key: "{startDate}", icon: "📅", label: lang === "ar" ? "تاريخ البدء" : "Start Date", example: map["{startDate}"] },
      { key: "{timeFrom}", icon: "⏰", label: lang === "ar" ? "وقت البداية" : "Time From", example: map["{timeFrom}"] },
      { key: "{timeTo}", icon: "⏰", label: lang === "ar" ? "وقت النهاية" : "Time To", example: map["{timeTo}"] },
      { key: "{instructor}", icon: "👨‍🏫", label: lang === "ar" ? "المدرب/المدربين" : "Instructor(s)", example: map["{instructor}"] },
      { key: "{sessionLocationBlock}", icon: "🧩", label: lang === "ar" ? "بلوك الموقع/الرابط (تلقائي)" : "Location/Link Block (auto)", example: map["{sessionLocationBlock}"] },
    ];

    if (isOffline) {
      return [
        ...base,
        { key: "{placeName}", icon: "📍", label: lang === "ar" ? "اسم المكان" : "Location Name", example: map["{placeName}"] },
        { key: "{address}", icon: "📌", label: lang === "ar" ? "العنوان" : "Address", example: map["{address}"] },
        { key: "{mapsLink}", icon: "🗺️", label: lang === "ar" ? "رابط الخريطة" : "Maps Link", example: map["{mapsLink}"] || (lang === "ar" ? "غير متاح" : "N/A") },
      ];
    }

    return [
      ...base,
      { key: "{firstMeetingLink}", icon: "🔗", label: lang === "ar" ? "رابط الجلسة الأولى" : "First Session Link", example: map["{firstMeetingLink}"] || (lang === "ar" ? "سيُضاف قريباً" : "Coming soon") },
      { key: "{meetingLink}", icon: "🔗", label: lang === "ar" ? "رابط الجلسة (alias)" : "Meeting Link (alias)", example: map["{meetingLink}"] || (lang === "ar" ? "سيُضاف قريباً" : "Coming soon") },
    ];
  }, [getStudentContext, buildReplacementsMap, group, isOffline]);

  // ✅ getGuardianVariables
  const getGuardianVariables = useCallback(() => {
    const ctx = getStudentContext();
    if (!ctx || !group) return [];
    const map = buildReplacementsMap();
    const lang = ctx.lang;

    const base = [
      { key: "{guardianSalutation}", icon: "👋", label: lang === "ar" ? "تحية ولي الأمر" : "Guardian Salutation", example: map["{guardianSalutation}"] },
      { key: "{guardianSalutation_ar}", icon: "👋", label: lang === "ar" ? "تحية ولي الأمر (عربي)" : "Guardian Salutation (AR)", example: map["{guardianSalutation_ar}"] },
      { key: "{guardianSalutation_en}", icon: "👋", label: lang === "ar" ? "تحية ولي الأمر (إنجليزي)" : "Guardian Salutation (EN)", example: map["{guardianSalutation_en}"] },
      { key: "{guardianName}", icon: "👤", label: lang === "ar" ? "اسم ولي الأمر" : "Guardian Name", example: map["{guardianName}"] },
      { key: "{studentName}", icon: "👶", label: lang === "ar" ? "اسم الطالب" : "Student Name", example: map["{studentName}"] },
      { key: "{childTitle}", icon: "👨‍👦", label: lang === "ar" ? "ابنك/ابنتك" : "Child Title", example: map["{childTitle}"] },
      { key: "{groupName}", icon: "👥", label: lang === "ar" ? "اسم المجموعة" : "Group Name", example: map["{groupName}"] },
      { key: "{courseName}", icon: "📚", label: lang === "ar" ? "اسم الكورس" : "Course Name", example: map["{courseName}"] },
      { key: "{startDate}", icon: "📅", label: lang === "ar" ? "تاريخ البدء" : "Start Date", example: map["{startDate}"] },
      { key: "{timeFrom}", icon: "⏰", label: lang === "ar" ? "وقت البداية" : "Time From", example: map["{timeFrom}"] },
      { key: "{timeTo}", icon: "⏰", label: lang === "ar" ? "وقت النهاية" : "Time To", example: map["{timeTo}"] },
      { key: "{instructor}", icon: "👨‍🏫", label: lang === "ar" ? "المدرب/المدربين" : "Instructor(s)", example: map["{instructor}"] },
      { key: "{moduleTitle}", icon: "📘", label: lang === "ar" ? "عنوان الموديول" : "Module Title", example: map["{moduleTitle}"] || (lang === "ar" ? "عنوان الموديول" : "Module Title") },
      { key: "{moduleDescription}", icon: "📝", label: lang === "ar" ? "وصف الموديول" : "Module Description", example: map["{moduleDescription}"] || (lang === "ar" ? "وصف الموديول" : "Module Description") },
      { key: "{supervisorName}", icon: "🎓", label: lang === "ar" ? "اسم المشرف" : "Supervisor Name", example: map["{supervisorName}"] },
      { key: "{sessionLocationBlock}", icon: "🧩", label: lang === "ar" ? "بلوك الموقع/الرابط (تلقائي)" : "Location/Link Block (auto)", example: map["{sessionLocationBlock}"] },
    ];

    if (isOffline) {
      return [
        ...base,
        { key: "{placeName}", icon: "📍", label: lang === "ar" ? "اسم المكان" : "Location Name", example: map["{placeName}"] },
        { key: "{address}", icon: "📌", label: lang === "ar" ? "العنوان" : "Address", example: map["{address}"] },
        { key: "{mapsLink}", icon: "🗺️", label: lang === "ar" ? "رابط الخريطة" : "Maps Link", example: map["{mapsLink}"] || (lang === "ar" ? "غير متاح" : "N/A") },
      ];
    }

    return [
      ...base,
      { key: "{firstMeetingLink}", icon: "🔗", label: lang === "ar" ? "رابط الجلسة الأولى" : "First Session Link", example: map["{firstMeetingLink}"] || (lang === "ar" ? "سيُضاف قريباً" : "Coming soon") },
      { key: "{meetingLink}", icon: "🔗", label: lang === "ar" ? "رابط الجلسة (alias)" : "Meeting Link (alias)", example: map["{meetingLink}"] || (lang === "ar" ? "سيُضاف قريباً" : "Coming soon") },
    ];
  }, [getStudentContext, buildReplacementsMap, group, isOffline]);

  // ✅ getModuleOverviewVariables
  const getModuleOverviewVariables = useCallback(() => {
    const ctx = getStudentContext();
    if (!ctx || !group) return [];
    const map = buildReplacementsMap();
    const lang = ctx.lang;

    const base = [
      { key: "{guardianSalutation}", icon: "👋", label: lang === "ar" ? "تحية ولي الأمر" : "Guardian Salutation", example: map["{guardianSalutation}"] },
      { key: "{guardianSalutation_ar}", icon: "👋", label: lang === "ar" ? "تحية ولي الأمر (عربي)" : "Guardian Salutation (AR)", example: map["{guardianSalutation_ar}"] },
      { key: "{guardianSalutation_en}", icon: "👋", label: lang === "ar" ? "تحية ولي الأمر (إنجليزي)" : "Guardian Salutation (EN)", example: map["{guardianSalutation_en}"] },
      { key: "{guardianName}", icon: "👤", label: lang === "ar" ? "اسم ولي الأمر" : "Guardian Name", example: map["{guardianName}"] },
      { key: "{studentName}", icon: "👶", label: lang === "ar" ? "اسم الطالب" : "Student Name", example: map["{studentName}"] },
      { key: "{childTitle}", icon: "👨‍👦", label: lang === "ar" ? "ابنك/ابنتك" : "Child Title", example: map["{childTitle}"] },
      { key: "{moduleTitle}", icon: "📘", label: lang === "ar" ? "عنوان الموديول" : "Module Title", example: map["{moduleTitle}"] || courseModule?.title || (lang === "ar" ? "عنوان الموديول" : "Module Title") },
      { key: "{moduleDescription}", icon: "📝", label: lang === "ar" ? "وصف الموديول" : "Module Description", example: map["{moduleDescription}"] || courseModule?.description || (lang === "ar" ? "وصف الموديول" : "Module Description") },
      { key: "{courseName}", icon: "📚", label: lang === "ar" ? "اسم الكورس" : "Course Name", example: map["{courseName}"] },
      { key: "{groupName}", icon: "👥", label: lang === "ar" ? "اسم المجموعة" : "Group Name", example: map["{groupName}"] },
      { key: "{supervisorName}", icon: "🎓", label: lang === "ar" ? "اسم المشرف" : "Supervisor Name", example: map["{supervisorName}"] },
      { key: "{sessionLocationBlock}", icon: "🧩", label: lang === "ar" ? "بلوك الموقع/الرابط (تلقائي)" : "Location/Link Block (auto)", example: map["{sessionLocationBlock}"] },
    ];

    if (isOffline) {
      return [
        ...base,
        { key: "{placeName}", icon: "📍", label: lang === "ar" ? "اسم المكان" : "Location Name", example: map["{placeName}"] },
        { key: "{address}", icon: "📌", label: lang === "ar" ? "العنوان" : "Address", example: map["{address}"] },
        { key: "{mapsLink}", icon: "🗺️", label: lang === "ar" ? "رابط الخريطة" : "Maps Link", example: map["{mapsLink}"] || (lang === "ar" ? "غير متاح" : "N/A") },
      ];
    }

    return base;
  }, [getStudentContext, buildReplacementsMap, group, courseModule, isOffline]);

  const pickTemplateSlot = useCallback((student, type) => {
    if (!student) return { ar: "", en: "" };
    const { isMale, isFather } = getGenderFlags(student);
    if (type === "student") {
      return isMale
        ? { ar: safe(templates?.studentMaleAr), en: safe(templates?.studentMaleEn) }
        : { ar: safe(templates?.studentFemaleAr), en: safe(templates?.studentFemaleEn) };
    }
    if (type === "guardian") {
      return isFather
        ? { ar: safe(templates?.guardianFatherAr), en: safe(templates?.guardianFatherEn) }
        : { ar: safe(templates?.guardianMotherAr), en: safe(templates?.guardianMotherEn) };
    }
    return { ar: safe(templates?.moduleOverviewAr), en: safe(templates?.moduleOverviewEn) };
  }, [templates, getGenderFlags]);

  // ─── Load Data ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!groupId) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const [groupRes, studentsRes, templateOnlineRes, templateOfflineRes, moduleOverviewRes] = await Promise.all([
          fetch(`/api/groups/${groupId}`),
          fetch("/api/allStudents?status=Active&limit=1000"),
          fetch(`/api/whatsapp/group-templates?type=group_welcome`),
          fetch(`/api/whatsapp/group-templates?type=group_welcome_offline`),
          fetch(`/api/whatsapp/message-templates?type=module_overview&default=true`),
        ]);

        // ── Group ────────────────────────────────────────────────────
        const groupData = await groupRes.json();
        let groupDeliveryMode = "online";

        if (groupData.success) {
          setGroup(groupData.data);
          groupDeliveryMode = groupData.data?.deliveryMode || "online";
          setIsOffline(groupDeliveryMode === "offline");

          const groupInfo = groupData.data;
          const curriculum =
            groupInfo?.courseId?.curriculum ||
            groupInfo?.courseSnapshot?.curriculum ||
            [];

          if (Array.isArray(curriculum) && curriculum.length > 0) {
            const firstModule = curriculum[0];
            setCourseModule({
              title: firstModule?.title || "",
              description: firstModule?.description || "",
            });
          } else {
            const courseId = groupInfo?.courseId?._id || groupInfo?.courseId;
            if (courseId) {
              try {
                const courseRes = await fetch(`/api/courses/${courseId}`);
                const courseData = await courseRes.json();
                if (courseData.success && Array.isArray(courseData.data?.curriculum) && courseData.data.curriculum.length > 0) {
                  const firstModule = courseData.data.curriculum[0];
                  setCourseModule({
                    title: firstModule?.title || "",
                    description: firstModule?.description || "",
                  });
                }
              } catch (courseErr) {
                console.warn("⚠️ Could not fetch course for module data:", courseErr);
              }
            }
          }
        }

        // ── Students ──────────────────────────────────────────────────
        const studentsData = await studentsRes.json();
        if (studentsData.success) {
          const groupStudentIds = (groupData.data?.students || []).map(s => String(s._id || s.id || s));
          setStudents(studentsData.data.filter(s => !groupStudentIds.includes(String(s._id || s.id))));
        }

        // ═══════════════════════════════════════════════════════════════
        // ── ✅ اختار القالب الصح حسب الحالة + Defensive Reading + Auto-Swap
        // ═══════════════════════════════════════════════════════════════
        const templateData = groupDeliveryMode === "offline"
          ? await templateOfflineRes.json()
          : await templateOnlineRes.json();

        if (templateData.success && templateData.data) {
          const d = Array.isArray(templateData.data) ? templateData.data[0] : templateData.data;
          templateId.current = d._id;

          // ✅ قراءة بأسماء متعددة (defensive)
          const pick = (...keys) => {
            for (const k of keys) {
              const v = d?.[k];
              if (typeof v === "string" && v.trim()) return v;
            }
            return "";
          };

          // قراءة خام
          let studentMaleAr = pick("studentMaleContentAr", "studentContentAr");
          let studentMaleEn = pick("studentMaleContentEn", "studentContentEn");
          let studentFemaleAr = pick("studentFemaleContentAr", "studentContentAr");
          let studentFemaleEn = pick("studentFemaleContentEn", "studentContentEn");
          let guardianFatherAr = pick("guardianFatherContentAr", "guardianContentAr");
          let guardianFatherEn = pick("guardianFatherContentEn", "guardianContentEn");
          let guardianMotherAr = pick("guardianMotherContentAr", "guardianContentAr");
          let guardianMotherEn = pick("guardianMotherContentEn", "guardianContentEn");

          // 🔍 Debug log
          console.log("📥 [Group Template] Read from DB:", {
            studentMaleAr: studentMaleAr?.slice(0, 80),
            studentMaleEn: studentMaleEn?.slice(0, 80),
            guardianFatherAr: guardianFatherAr?.slice(0, 80),
            guardianFatherEn: guardianFatherEn?.slice(0, 80),
            studentLooksLikeGuardian: looksLikeGuardianContent(studentMaleAr),
            guardianLooksLikeGuardian: looksLikeGuardianContent(guardianFatherAr),
          });

          // 🔄 Auto-Swap: لو الطالب فيه guardian markers والـ guardian مفيهوش
          if (
            looksLikeGuardianContent(studentMaleAr) &&
            !looksLikeGuardianContent(guardianFatherAr)
          ) {
            console.warn("🔄 [Group Template] Swapping Student ↔ Guardian (AR) — DB has them reversed");
            [studentMaleAr, guardianFatherAr] = [guardianFatherAr, studentMaleAr];
            [studentFemaleAr, guardianMotherAr] = [guardianMotherAr, studentFemaleAr];
          }
          if (
            looksLikeGuardianContent(studentMaleEn) &&
            !looksLikeGuardianContent(guardianFatherEn)
          ) {
            console.warn("🔄 [Group Template] Swapping Student ↔ Guardian (EN) — DB has them reversed");
            [studentMaleEn, guardianFatherEn] = [guardianFatherEn, studentMaleEn];
            [studentFemaleEn, guardianMotherEn] = [guardianMotherEn, studentFemaleEn];
          }

          setTemplates({
            studentMaleAr,
            studentMaleEn,
            studentFemaleAr,
            studentFemaleEn,
            guardianFatherAr,
            guardianFatherEn,
            guardianMotherAr,
            guardianMotherEn,
            moduleOverviewAr: "",
            moduleOverviewEn: "",
          });
        }

        // ── Module Overview ───────────────────────────────────────────
        if (moduleOverviewRes.ok) {
          const moData = await moduleOverviewRes.json();
          if (moData.success && Array.isArray(moData.data) && moData.data.length > 0) {
            const mo = moData.data[0];
            setTemplates(prev => ({
              ...prev,
              moduleOverviewAr: mo.contentAr || "",
              moduleOverviewEn: mo.contentEn || "",
            }));
          }
        }
      } catch (err) {
        console.error("Error loading:", err);
        toast.error("فشل تحميل البيانات");
      } finally {
        setLoading(false);
      }
    };
    loadData();
    fetchDbVariables();
  }, [groupId]);

  useEffect(() => {
    if (!selectedStudent) return;
    try {
      const lang = selectedStudent?.communicationPreferences?.preferredLanguage || "ar";
      const studentSlot = pickTemplateSlot(selectedStudent, "student");
      const guardianSlot = pickTemplateSlot(selectedStudent, "guardian");
      const moduleOverviewSlot = pickTemplateSlot(selectedStudent, "moduleOverview");
      setStudentMessage(lang === "ar" ? studentSlot.ar : studentSlot.en);
      setGuardianMessage(lang === "ar" ? guardianSlot.ar : guardianSlot.en);
      setModuleOverviewMessage(lang === "ar" ? moduleOverviewSlot.ar : moduleOverviewSlot.en);
    } catch (err) {
      console.error("❌ Template pick error:", err);
    }
  }, [selectedStudent, templates, pickTemplateSlot]);

  useEffect(() => {
    if (selectedStudent && group) {
      setStudentPreview(safe(replaceVars(studentMessage)));
      setGuardianPreview(safe(replaceVars(guardianMessage)));
      setModuleOverviewPreview(safe(replaceVars(moduleOverviewMessage)));
    }
  }, [studentMessage, guardianMessage, moduleOverviewMessage, selectedStudent, group, replaceVars, supervisorGender, courseModule]);

  const autoSave = useCallback((type, content) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!templateId.current || !selectedStudent) return;
      try {
        const lang = selectedStudent?.communicationPreferences?.preferredLanguage || "ar";
        const { isMale, isFather } = getGenderFlags(selectedStudent);
        let fieldKey;
        if (type === "student") {
          fieldKey = isMale
            ? (lang === "ar" ? "studentMaleContentAr" : "studentMaleContentEn")
            : (lang === "ar" ? "studentFemaleContentAr" : "studentFemaleContentEn");
        } else if (type === "guardian") {
          fieldKey = isFather
            ? (lang === "ar" ? "guardianFatherContentAr" : "guardianFatherContentEn")
            : (lang === "ar" ? "guardianMotherContentAr" : "guardianMotherContentEn");
        } else {
          fieldKey = lang === "ar" ? "moduleOverviewContentAr" : "moduleOverviewContentEn";
        }

        await fetch("/api/whatsapp/group-templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: templateId.current, [fieldKey]: safe(content), setAsDefault: true }),
        });
      } catch (err) {
        console.error("Save error:", err);
      }
    }, 3000);
  }, [selectedStudent, getGenderFlags]);

  const insertVariable = (variable, type) => {
    try {
      const textarea = type === "student" ? studentTextareaRef.current : type === "guardian" ? guardianTextareaRef.current : moduleOverviewTextareaRef.current;
      const currentValue = type === "student" ? studentMessage : type === "guardian" ? guardianMessage : moduleOverviewMessage;
      const cursorPos = type === "student" ? studentCursor : type === "guardian" ? guardianCursor : moduleOverviewCursor;
      const textBefore = String(currentValue || "").substring(0, cursorPos);
      const lastAt = textBefore.lastIndexOf("@");
      let newValue, newCursorPos;
      if (lastAt !== -1) {
        newValue = String(currentValue).substring(0, lastAt) + variable.key + String(currentValue).substring(cursorPos);
        newCursorPos = lastAt + variable.key.length;
      } else {
        newValue = String(currentValue).substring(0, cursorPos) + variable.key + String(currentValue).substring(cursorPos);
        newCursorPos = cursorPos + variable.key.length;
      }
      if (type === "student") { setStudentMessage(newValue); setShowStudentHints(false); setStudentCursor(newCursorPos); }
      else if (type === "guardian") { setGuardianMessage(newValue); setShowGuardianHints(false); setGuardianCursor(newCursorPos); }
      else { setModuleOverviewMessage(newValue); setShowModuleOverviewHints(false); setModuleOverviewCursor(newCursorPos); }
      autoSave(type, newValue);
      setTimeout(() => { textarea?.focus(); textarea?.setSelectionRange(newCursorPos, newCursorPos); }, 0);
    } catch (err) {
      console.error("❌ insertVariable error:", err);
    }
  };

  const handleTextareaChange = (e, type) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    if (type === "student") { setStudentMessage(value); setStudentCursor(cursorPos); }
    else if (type === "guardian") { setGuardianMessage(value); setGuardianCursor(cursorPos); }
    else { setModuleOverviewMessage(value); setModuleOverviewCursor(cursorPos); }
    autoSave(type, value);
    const lastAt = value.substring(0, cursorPos).lastIndexOf("@");
    const setShow = type === "student" ? setShowStudentHints : type === "guardian" ? setShowGuardianHints : setShowModuleOverviewHints;
    if (lastAt !== -1 && lastAt === cursorPos - 1) { setShow(true); setSelectedHintIndex(0); }
    else if (lastAt === -1) setShow(false);
  };

  const handleKeyDown = (e, type) => {
    const variables = type === "student" ? getStudentVariables() : type === "guardian" ? getGuardianVariables() : getModuleOverviewVariables();
    const show = type === "student" ? showStudentHints : type === "guardian" ? showGuardianHints : showModuleOverviewHints;
    const setShow = type === "student" ? setShowStudentHints : type === "guardian" ? setShowGuardianHints : setShowModuleOverviewHints;
    if (!show || !variables.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedHintIndex(p => (p + 1) % variables.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedHintIndex(p => (p - 1 + variables.length) % variables.length); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertVariable(variables[selectedHintIndex], type); }
    else if (e.key === "Escape") { e.preventDefault(); setShow(false); }
  };

  useEffect(() => {
    const handler = (e) => {
      if (studentHintsRef.current && !studentHintsRef.current.contains(e.target)) setShowStudentHints(false);
      if (guardianHintsRef.current && !guardianHintsRef.current.contains(e.target)) setShowGuardianHints(false);
      if (moduleOverviewHintsRef.current && !moduleOverviewHintsRef.current.contains(e.target)) setShowModuleOverviewHints(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const handleAdd = async () => {
    if (!selectedStudent) { toast.error("اختر طالباً أولاً"); return; }
    setAdding(true);
    const loadingToast = toast.loading("جاري الإضافة...");
    try {
      const res = await fetch(`/api/groups/${groupId}/add-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: String(selectedStudent._id || selectedStudent.id),
          studentMessage: replaceVars(studentMessage),
          guardianMessage: replaceVars(guardianMessage),
          moduleOverviewMessage: replaceVars(moduleOverviewMessage),
          sendWhatsApp: true,
          isOffline,
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("تم إضافة الطالب بنجاح", { id: loadingToast });
        setStudents(prev => prev.filter(s => String(s._id || s.id) !== String(selectedStudent._id || selectedStudent.id)));
        setSelectedStudent(null);
        if (onStudentAdded) onStudentAdded();
      } else {
        toast.error(result?.error || "فشلت الإضافة", { id: loadingToast });
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("فشلت الإضافة", { id: loadingToast });
    } finally {
      setAdding(false);
    }
  };

  // ─── Sub-components ───────────────────────────────────────────────────
  const HintsDropdown = ({ vars, type, show, hintsRef }) => {
    if (!show || !vars.length) return null;
    const lang = getStudentContext()?.lang || "ar";
    return (
      <div
        ref={hintsRef}
        className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-[fadeIn_.15s_ease-out]"
        style={{ top: "100%" }}
      >
        <div className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/60 border-b border-gray-100 dark:border-gray-700">
          <Icon.Zap />
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {lang === "ar" ? "المتغيرات المتاحة" : "Available Variables"}
          </span>
        </div>
        <div className="max-h-52 overflow-y-auto scroll-thin">
          {vars.map((v, i) => (
            <button
              key={v.key}
              type="button"
              onClick={() => insertVariable(v, type)}
              className={`w-full px-3 py-2.5 flex items-start gap-2.5 transition-colors
                ${i === selectedHintIndex ? "bg-violet-50 dark:bg-violet-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800"}
                ${lang === "ar" ? "text-right" : "text-left"}`}
            >
              <span className="text-base shrink-0 mt-0.5">{v.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <code className="text-xs font-mono text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded-md">
                    {v.key}
                  </code>
                  <span className="text-xs text-gray-400">{v.label}</span>
                </div>
                {v.example && (
                  <p className="text-xs mt-1 text-gray-500 dark:text-gray-400 truncate">
                    → {v.example}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
          ↑↓ {lang === "ar" ? "تنقل · Enter إدراج · Esc إغلاق" : "navigate · Enter insert · Esc close"}
        </div>
      </div>
    );
  };

  const MessageCard = ({ step, title, badge, subtitle, accentClass, previewHeaderClass, textareaRef, hintsRef, value, type, showHints, vars, preview }) => {
    const lang = getStudentContext()?.lang || "ar";
    return (
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50/60 to-transparent dark:from-gray-800/30">
          <div className="flex items-center gap-2.5">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white dark:ring-gray-900 ${accentClass}`}>
              {step}
            </span>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</span>
            {badge && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
        </div>

        <div className="p-4 space-y-3">
          {type === "moduleOverview" && courseModule?.title && (
            <div className="mb-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
              <span className="text-blue-500 mt-0.5 flex-shrink-0"><Icon.BookOpen /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                  {lang === "ar" ? "الموديول الحالي:" : "Current Module:"}{" "}
                  <span className="font-bold">{courseModule.title}</span>
                </p>
                {courseModule.description && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 line-clamp-2">
                    {courseModule.description}
                  </p>
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Icon.Zap />
            {lang === "ar"
              ? <>اكتب <code className="mx-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-gray-500">@</code> لإدراج متغير</>
              : <>Type <code className="mx-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-gray-500">@</code> to insert a variable</>}
          </p>

          <div className="relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => handleTextareaChange(e, type)}
              onKeyDown={(e) => handleKeyDown(e, type)}
              dir={lang === "ar" ? "rtl" : "ltr"}
              rows={5}
              placeholder={lang === "ar" ? "اكتب رسالتك هنا..." : "Write your message here..."}
              className="w-full px-3.5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 resize-none leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-300 dark:focus:border-violet-600 focus:shadow-md transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600"
            />
            <HintsDropdown vars={vars} type={type} show={showHints} hintsRef={hintsRef} />
          </div>

          <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-inner">
            <div className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium ${previewHeaderClass}`}>
              <Icon.Eye />
              <span>{lang === "ar" ? "معاينة" : "Preview"}</span>
            </div>
            <div
              className="px-3 py-2.5 text-xs leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre-line max-h-28 overflow-y-auto scroll-thin bg-white dark:bg-gray-900"
              dir={lang === "ar" ? "rtl" : "ltr"}
            >
              {preview || <span className="text-gray-300 dark:text-gray-600 italic">{lang === "ar" ? "لا توجد معاينة بعد" : "No preview yet"}</span>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Guards ───────────────────────────────────────────────────────────
  if (loading || loadingVars) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
        <p className="text-sm text-gray-400">جاري التحميل...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
        <Icon.Alert />
        <p className="text-sm">المجموعة غير موجودة</p>
      </div>
    );
  }

  // ─── Render values ────────────────────────────────────────────────────
  const currentCount = group.currentStudentsCount || group.students?.length || 0;
  const maxStudents = group.maxStudents || 0;
  const isFull = currentCount >= maxStudents;
  const available = maxStudents - currentCount;

  const filteredStudents = students.filter(s => {
    const name = String(s?.personalInfo?.fullName || "").toLowerCase();
    const email = String(s?.personalInfo?.email || "").toLowerCase();
    const q = String(search || "").toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const ctx = getStudentContext();
  const lang = ctx?.lang || "ar";
  const studentVars = getStudentVariables();
  const guardianVars = getGuardianVariables();
  const moduleOverviewVars = getModuleOverviewVariables();
  const instructorNamesDisplay = buildInstructorsNames(group?.instructors, locale === "ar" ? "ar" : "en");

  return (
    <div className="space-y-5" dir={isRTL ? "rtl" : "ltr"}>

      {/* ── Group Card ── */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
        <div className="p-4 flex items-start gap-3.5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-white dark:ring-gray-900 ${
            isOffline
              ? "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-900/20 text-emerald-600 dark:text-emerald-400"
              : "bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/40 dark:to-violet-900/20 text-violet-600 dark:text-violet-400"
          }`}>
            {isOffline ? <Icon.MapPin /> : <Icon.Users />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug mb-0.5">
              {group.name}
            </h3>
            <p className="text-xs text-gray-400 mb-2.5">
              {group.courseSnapshot?.title}
              {group.code && <span className="mx-1.5 text-gray-200 dark:text-gray-700">·</span>}
              <span className="font-mono">{group.code}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {isOffline && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
                  <Icon.MapPin />
                  {locale === "ar" ? "أوفلاين (حضوري)" : "Offline"}
                </span>
              )}

              {Array.isArray(group.instructors) && group.instructors.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium">
                  <Icon.School />
                  {instructorNamesDisplay}
                </span>
              )}
              {group.schedule?.timeFrom && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  <Icon.Calendar />
                  {group.schedule.timeFrom} — {group.schedule.timeTo}
                </span>
              )}
              {!isOffline && group.firstMeetingLink && (
                <a
                  href={group.firstMeetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:underline"
                >
                  <Icon.Link />
                  {locale === "ar" ? "رابط الجلسة" : "Session link"}
                </a>
              )}
            </div>

            {isOffline && (
              <div className="mt-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs space-y-0.5">
                {group.locationDetails?.placeName && (
                  <p className="text-emerald-800 dark:text-emerald-300">
                    📍 <strong>{group.locationDetails.placeName}</strong>
                  </p>
                )}
                {group.locationDetails?.address && (
                  <p className="text-emerald-700 dark:text-emerald-400">
                    📌 {group.locationDetails.address}
                  </p>
                )}
                {buildMapsLink(group) && (
                  <a
                    href={buildMapsLink(group)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    🗺️ {locale === "ar" ? "عرض على الخريطة" : "View on map"}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
          {[
            { value: currentCount, label: locale === "ar" ? "الحاليون" : "Current", color: "text-violet-600 dark:text-violet-400" },
            { value: maxStudents, label: locale === "ar" ? "الحد الأقصى" : "Maximum", color: "text-gray-500" },
            { value: available, label: locale === "ar" ? "متاح" : "Available", color: available > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500" },
          ].map((s) => (
            <div key={s.label} className="py-3 text-center hover:bg-white dark:hover:bg-gray-800/40 transition-colors">
              <div className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <span className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? "right-3.5" : "left-3.5"}`}>
          <Icon.Search />
        </span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={locale === "ar" ? "ابحث باسم الطالب أو البريد..." : "Search by name or email..."}
          className={`w-full py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-300 focus:shadow-md transition-all
            ${isRTL ? "pr-9 pl-4" : "pl-9 pr-4"}`}
        />
      </div>

      {/* ── Students List ── */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/60 dark:to-gray-800/20 border-b border-gray-100 dark:border-gray-800">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Icon.Users />
            {locale === "ar" ? "الطلاب المتاحون" : "Available students"}
          </span>
          <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">{filteredStudents.length}</span>
        </div>

        <div className="relative">
          <div className="max-h-72 overflow-y-auto scroll-thin divide-y divide-gray-50 dark:divide-gray-800">
            {filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-300 dark:text-gray-600">
                <Icon.Users />
                <p className="text-sm">{locale === "ar" ? "لا يوجد طلاب متاحين" : "No available students"}</p>
              </div>
            ) : (
              filteredStudents.map(student => {
                const sid = String(student._id || student.id);
                const isSelected = selectedStudent && String(selectedStudent._id || selectedStudent.id) === sid;
                const name = student.personalInfo?.fullName || "";
                const avatarColor = getAvatarColor(name);
                const sLang = student.communicationPreferences?.preferredLanguage || "ar";
                const sGender = String(student.personalInfo?.gender || "Male").toLowerCase();
                const sRelation = String(student.guardianInfo?.relationship || "father").toLowerCase();

                return (
                  <div
                    key={sid}
                    onClick={() => {
                      if (isFull && !isSelected) return;
                      setSelectedStudent(isSelected ? null : student);
                    }}
                    className={`relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150
                      ${isSelected
                        ? "bg-violet-50 dark:bg-violet-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                      }
                      ${isFull && !isSelected ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    {isSelected && <div className="absolute inset-y-0 start-0 w-1 bg-violet-500" />}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ring-2 ring-white dark:ring-gray-900 shadow-sm"
                      style={{ background: avatarColor.bg, color: avatarColor.text }}
                    >
                      {getInitials(name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{name}</p>
                      </div>
                      <p className="text-xs text-gray-400 truncate mb-1.5">{student.personalInfo?.email}</p>
                      <div className="flex gap-1.5 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium
                          ${sLang === "ar"
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300"
                            : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300"}`}>
                          {sLang === "ar" ? "عربي" : "EN"}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium
                          ${sGender === "female"
                            ? "bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300"
                            : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300"}`}>
                          {sGender === "female" ? (locale === "ar" ? "أنثى" : "Female") : (locale === "ar" ? "ذكر" : "Male")}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded-md bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 font-medium">
                          {sRelation === "mother" ? (locale === "ar" ? "أم" : "Mother") : (locale === "ar" ? "أب" : "Father")}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-violet-500 flex-shrink-0">
                        <Icon.Check />
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Messages Section ── */}
      {selectedStudent && ctx && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
            <span className="text-xs font-semibold text-gray-400 px-1">
              {lang === "ar" ? "رسائل الترحيب" : "Welcome messages"}
            </span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
          </div>

          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {selectedStudent.personalInfo?.fullName}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                ${lang === "ar"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300"
                  : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300"}`}>
                {lang === "ar" ? "الرسائل بالعربية" : "Messages in English"}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                ${ctx.isMale ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300" : "bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300"}`}>
                {ctx.isMale ? (lang === "ar" ? "ذكر" : "Male") : (lang === "ar" ? "أنثى" : "Female")}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 font-medium">
                {ctx.isFather ? (lang === "ar" ? "أب" : "Father") : (lang === "ar" ? "أم" : "Mother")}
              </span>
              {isOffline && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 font-medium">
                  {locale === "ar" ? "أوفلاين" : "Offline"}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-1 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-300 dark:text-gray-600">{lang === "ar" ? "تحية الطالب:" : "Student greeting:"}</span>
                <span className="text-violet-600 dark:text-violet-400 font-medium">{ctx.studentSalutation}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-300 dark:text-gray-600">{lang === "ar" ? "تحية ولي الأمر:" : "Guardian greeting:"}</span>
                <span className="text-violet-600 dark:text-violet-400 font-medium">{ctx.guardianSalutation}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-300 dark:text-gray-600">{lang === "ar" ? "ابنك/ابنتك:" : "Child title:"}</span>
                <span className="text-violet-600 dark:text-violet-400 font-medium">{ctx.childTitle}</span>
              </div>
              {Array.isArray(group.instructors) && group.instructors.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-300 dark:text-gray-600">{lang === "ar" ? "المدرب:" : "Instructor:"}</span>
                  <span className="text-violet-600 dark:text-violet-400 font-medium">{buildInstructorsNames(group.instructors, lang)}</span>
                </div>
              )}
            </div>
          </div>

          <MessageCard
            step="1"
            title={lang === "ar" ? "رسالة الطالب" : "Student Message"}
            badge={ctx.isMale ? (lang === "ar" ? "ذكر" : "Male") : (lang === "ar" ? "أنثى" : "Female")}
            subtitle={lang === "ar" ? "للطالب مباشرة" : "Directly to student"}
            accentClass="bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
            previewHeaderClass="bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400"
            textareaRef={studentTextareaRef}
            hintsRef={studentHintsRef}
            value={studentMessage}
            type="student"
            showHints={showStudentHints}
            vars={studentVars}
            preview={studentPreview}
          />

          <MessageCard
            step="2"
            title={lang === "ar" ? "رسالة ولي الأمر" : "Guardian Message"}
            badge={ctx.isFather ? (lang === "ar" ? "أب" : "Father") : (lang === "ar" ? "أم" : "Mother")}
            subtitle={lang === "ar" ? "لولي أمر الطالب" : "To student's guardian"}
            accentClass="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
            previewHeaderClass="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
            textareaRef={guardianTextareaRef}
            hintsRef={guardianHintsRef}
            value={guardianMessage}
            type="guardian"
            showHints={showGuardianHints}
            vars={guardianVars}
            preview={guardianPreview}
          />

          {/* Message 3: Module Overview */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50/60 to-transparent dark:from-gray-800/30">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white dark:ring-gray-900 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">3</span>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {lang === "ar" ? "نظرة عامة على الموديول" : "Module Overview"}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 font-medium">
                  {lang === "ar" ? "لولي الأمر" : "To Guardian"}
                </span>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {courseModule?.title && (
                <div className="mb-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5 flex-shrink-0"><Icon.BookOpen /></span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      {lang === "ar" ? "الموديول الحالي:" : "Current Module:"}{" "}
                      <span className="font-bold">{courseModule.title}</span>
                    </p>
                    {courseModule.description && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 line-clamp-2">
                        {courseModule.description}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                <Icon.School />
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-1">
                  {lang === "ar" ? "جنس المشرف" : "Supervisor gender"}
                  <code className="mx-1 px-1.5 py-0.5 rounded bg-white dark:bg-gray-700 font-mono text-gray-400 text-xs">
                    {"{supervisorName}"}
                  </code>
                </span>
                <div className="flex gap-1 p-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                  {["male", "female"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setSupervisorGender(g)}
                      className={`text-xs px-3 py-1 rounded-md transition-all font-medium
                        ${supervisorGender === g
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm"
                          : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
                    >
                      {g === "male" ? (lang === "ar" ? "ذكر" : "Male") : (lang === "ar" ? "أنثى" : "Female")}
                    </button>
                  ))}
                </div>
                {ctx.supervisorNameValue && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {ctx.supervisorNameValue}
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <Icon.Zap />
                {lang === "ar"
                  ? <>اكتب <code className="mx-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-gray-500">@</code> لإدراج متغير</>
                  : <>Type <code className="mx-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-gray-500">@</code> to insert a variable</>}
              </p>

              <div className="relative">
                <textarea
                  ref={moduleOverviewTextareaRef}
                  value={moduleOverviewMessage}
                  onChange={(e) => handleTextareaChange(e, "moduleOverview")}
                  onKeyDown={(e) => handleKeyDown(e, "moduleOverview")}
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  rows={5}
                  placeholder={lang === "ar"
                    ? "مثال: {guardianSalutation}، سيتناول {moduleTitle}... المشرف: {supervisorName}"
                    : "e.g. {guardianSalutation}, this module covers {moduleTitle}... Supervisor: {supervisorName}"}
                  className="w-full px-3.5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 resize-none leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-300 dark:focus:border-emerald-600 focus:shadow-md transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />
                <HintsDropdown vars={moduleOverviewVars} type="moduleOverview" show={showModuleOverviewHints} hintsRef={moduleOverviewHintsRef} />
              </div>

              <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-inner">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <Icon.Eye />
                  <span>{lang === "ar" ? "معاينة" : "Preview"}</span>
                </div>
                <div
                  className="px-3 py-2.5 text-xs leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre-line max-h-28 overflow-y-auto scroll-thin bg-white dark:bg-gray-900"
                  dir={lang === "ar" ? "rtl" : "ltr"}
                >
                  {moduleOverviewPreview || <span className="text-gray-300 dark:text-gray-600 italic">{lang === "ar" ? "لا توجد معاينة بعد" : "No preview yet"}</span>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={onClose}
          disabled={adding}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm transition-all disabled:opacity-40"
        >
          <Icon.X />
          {locale === "ar" ? "إلغاء" : "Cancel"}
        </button>

        <button
          onClick={handleAdd}
          disabled={!selectedStudent || !studentMessage.trim() || !guardianMessage.trim() || isFull || adding}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-600 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-violet-600/20 hover:shadow-lg active:scale-[0.98]"
        >
          {adding ? (
            <>
              <Icon.Loader />
              {locale === "ar" ? "جاري الإضافة..." : "Adding..."}
            </>
          ) : (
            <>
              <Icon.UserPlus />
              {locale === "ar"
                ? `إضافة${selectedStudent ? ` ${selectedStudent.personalInfo?.fullName?.split(" ")[0]}` : " الطالب"}`
                : `Add${selectedStudent ? ` ${selectedStudent.personalInfo?.fullName?.split(" ")[0]}` : " student"}`
              }
            </>
          )}
        </button>
      </div>

      <style jsx global>{`
        .scroll-thin {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 0, 0, 0.18) transparent;
        }
        .scroll-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scroll-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scroll-thin::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.18);
          border-radius: 999px;
        }
        .scroll-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }
        :global(.dark) .scroll-thin {
          scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
        }
        :global(.dark) .scroll-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.18);
        }
        :global(.dark) .scroll-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}