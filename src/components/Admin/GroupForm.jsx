// components/admin/GroupForm.jsx
"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users, Calendar, Save, X,
  User, Bell, CheckCircle, Hash, AlertCircle, ChevronDown,
  ChevronRight, ChevronLeft, Layers, Copy, Tag,
  MessageCircle, Sparkles, Clock, GraduationCap, Mail, Globe, MapPin, Building2,
  Loader2, Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";
import MapLocationPicker from "./MapLocationPicker";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: "basic", icon: Hash, color: "primary" },
  { id: "instructors", icon: User, color: "secondary" },
  { id: "schedule", icon: Calendar, color: "coral" },
  { id: "automation", icon: Bell, color: "amber" },
];

// ═══════════════════════════════════════════════════════════════
// ✅ NEW: نوع الجروب (Kids / Adults / Mixed)
// ═══════════════════════════════════════════════════════════════
const GROUP_TYPES = [
  {
    value: "kids",
    label_ar: "أطفال",
    label_en: "Kids",
    desc_ar: "جروب مخصص للأطفال",
    desc_en: "Kids only",
    emoji: "🧒",
  },
  {
    value: "adults",
    label_ar: "بالغين",
    label_en: "Adults",
    desc_ar: "جروب مخصص للبالغين",
    desc_en: "Adults only",
    emoji: "🧑",
  },
];

const COLOR = {
  primary: {
    btn: "from-primary to-orange-deep",
    solid: "#ff6700",
    text: "text-primary",
    border: "border-primary/25 dark:border-primary/30",
    panel: "from-IcyBreeze to-PaleCyan dark:from-primary/10 dark:to-orange-deep/10",
    badge: "bg-primary/10 text-primary dark:bg-primary/15",
    ring: "ring-primary/40",
  },
  secondary: {
    btn: "from-secondary to-teal-dark",
    solid: "#004d59",
    text: "text-secondary dark:text-white",
    border: "border-secondary/20 dark:border-secondary/35",
    panel: "from-PaleSkyBlu to-IcyBreeze dark:from-secondary/10 dark:to-teal-dark/10",
    badge: "bg-secondary/10 text-secondary dark:bg-secondary/20 dark:text-white",
    ring: "ring-secondary/40",
  },
  coral: {
    btn: "from-orange-coral to-primary",
    solid: "#ff6437",
    text: "text-orange-coral",
    border: "border-orange-coral/25 dark:border-orange-coral/30",
    panel: "from-PaleCyan to-SkyBlueMist dark:from-orange-coral/10 dark:to-primary/10",
    badge: "bg-orange-coral/10 text-orange-coral dark:bg-orange-coral/15",
    ring: "ring-orange-coral/40",
  },
  amber: {
    btn: "from-amber-brand to-orange-deep",
    solid: "#feaf00",
    text: "text-orange-deep dark:text-amber-brand",
    border: "border-amber-brand/35 dark:border-amber-brand/30",
    panel: "from-PaleSkyBlu to-SkyBlueMist dark:from-amber-brand/10 dark:to-orange-deep/10",
    badge: "bg-amber-brand/15 text-orange-deep dark:bg-amber-brand/20 dark:text-amber-brand",
    ring: "ring-amber-brand/50",
  },
};

const AUTOMATION_META = {
  whatsappEnabled: { icon: MessageCircle },
  welcomeMessage: { icon: Sparkles },
  reminderEnabled: { icon: Bell },
  notifyGuardianOnAbsence: { icon: AlertCircle },
  notifyOnSessionUpdate: { icon: Calendar },
  completionMessage: { icon: CheckCircle },
};

const ENGLISH_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const inputCls = "w-full px-3.5 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary dark:bg-dark_input dark:text-white placeholder:text-gray-400 dark:placeholder:text-darksubtle text-sm transition-all shadow-sm";
const labelCls = "block text-13 font-semibold text-MidnightNavyText dark:text-white mb-1.5";
const selectCls = "w-full px-3.5 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-xl bg-white dark:bg-dark_input dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm";
const cardCls = "rounded-2xl border border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darklight shadow-sm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDayIndex = (dateStr) => dateStr ? new Date(dateStr).getDay() : -1;
const getEnglishDay = (dateStr) => dateStr ? ENGLISH_DAYS[new Date(dateStr).getDay()] : null;
const areDuplicates = (lessons) => lessons?.length > 1 && lessons.every(l => l.title === lessons[0]?.title);

function getUniqueLessonGroups(lessons) {
  if (!lessons?.length) return [];
  const groups = [];
  let current = [], currentTitle = null;
  lessons.forEach((lesson, idx) => {
    if (lesson.title !== currentTitle) {
      if (current.length) groups.push({ title: currentTitle, count: current.length, startIndex: idx - current.length, endIndex: idx - 1 });
      current = [lesson]; currentTitle = lesson.title;
    } else { current.push(lesson); }
  });
  if (current.length) groups.push({ title: currentTitle, count: current.length, startIndex: lessons.length - current.length, endIndex: lessons.length - 1 });
  return groups;
}

function buildInitialForm(initial) {
  return {
    name: initial?.name || "",
    // نوع الجروب: kids أو adults بس. الجروبات القديمة "mixed" بترجع فاضية عشان الأدمن يحدد
    groupType: ["kids", "adults"].includes(initial?.groupType) ? initial.groupType : "",
    courseId: initial?.courseId?._id || initial?.courseId || initial?.course?.id || initial?.course?._id || "",
    instructors: initial?.instructors?.map(i => (i._id || i.id || i)?.toString()) || [],
    maxStudents: initial?.maxStudents || 25,
    schedule: {
      startDate: initial?.schedule?.startDate?.split("T")[0] || "",
      daysOfWeek: initial?.schedule?.daysOfWeek || [],
      timeFrom: initial?.schedule?.timeFrom || "18:00",
      timeTo: initial?.schedule?.timeTo || "20:00",
      timezone: initial?.schedule?.timezone || "Africa/Cairo",
    },
    deliveryMode: initial?.deliveryMode || "online",
    locationDetails: {
      lat: initial?.locationDetails?.lat ?? null,
      lng: initial?.locationDetails?.lng ?? null,
      placeName: initial?.locationDetails?.placeName || "",
      country: initial?.locationDetails?.country || "",
      address: initial?.locationDetails?.address || "",
      extraDetails: initial?.locationDetails?.extraDetails || initial?.location || "",
    },
    automation: {
      whatsappEnabled: initial?.automation?.whatsappEnabled ?? true,
      welcomeMessage: initial?.automation?.welcomeMessage ?? true,
      reminderEnabled: initial?.automation?.reminderEnabled ?? true,
      reminderBeforeHours: initial?.automation?.reminderBeforeHours || 24,
      notifyGuardianOnAbsence: initial?.automation?.notifyGuardianOnAbsence ?? true,
      notifyOnSessionUpdate: initial?.automation?.notifyOnSessionUpdate ?? true,
      completionMessage: initial?.automation?.completionMessage ?? true,
    },
    moduleSelection: initial?.moduleSelection || { mode: "all", selectedModules: [] },
    tags: initial?.tags?.map(t => t._id || t) || [],
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeading({ icon: Icon, title, badge, badgeTone = "primary" }) {
  const toneCls = badgeTone === "primary"
    ? "bg-primary/10 text-primary"
    : "bg-gray-100 dark:bg-dark_input text-SlateBlueText dark:text-darktext";
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-primary" />}
        <h4 className="text-sm font-semibold text-MidnightNavyText dark:text-white">{title}</h4>
      </div>
      {badge != null && <span className={`text-xs px-2 py-1 rounded-full font-medium ${toneCls}`}>{badge}</span>}
    </div>
  );
}

function GroupTypeSelector({ value, onChange, t, language }) {
  return (
    <div className={`${cardCls} p-4`}>
      <SectionHeading
        icon={Users}
        title={`${t("groups.form.groupType") || "نوع الجروب"} *`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {GROUP_TYPES.map((gt) => {
          const active = value === gt.value;
          return (
            <button
              key={gt.value}
              type="button"
              onClick={() => onChange(gt.value)}
              className={`text-start flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${active
                  ? "border-primary/50 bg-primary/5 dark:bg-primary/15 shadow-sm"
                  : "border-PowderBlueBorder dark:border-dark_border hover:bg-IcyBreeze dark:hover:bg-dark_input"
                }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${active
                    ? "bg-gradient-to-br from-primary to-orange-deep"
                    : "bg-primary/10 dark:bg-primary/20"
                  }`}
              >
                <span>{gt.emoji}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-MidnightNavyText dark:text-white">
                  {language === "ar" ? gt.label_ar : gt.label_en}
                </p>
                <p className="text-[11px] text-SlateBlueText dark:text-darktext leading-relaxed mt-0.5">
                  {language === "ar" ? gt.desc_ar : gt.desc_en}
                </p>
              </div>
              {active && (
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 ms-auto" />
              )}
            </button>
          );
        })}
      </div>

      {value && (
        <p className="text-[11px] text-primary mt-3 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          {value === "kids"
            ? (t("groups.form.groupTypeHintKids") || "هذا الجروب مخصص للأطفال — تجنب إضافة طلاب بالغين")
            : (t("groups.form.groupTypeHintAdults") || "هذا الجروب مخصص للبالغين — تجنب إضافة أطفال")}
        </p>
      )}
    </div>
  );
}

// ─── Delivery Mode Selector (Online / Offline) ────────────────────────────────
function DeliveryModeSelector({ mode, locationDetails, onChangeMode, onChangeLocationDetails, t }) {
  const MODES = [
    {
      value: "online",
      icon: Globe,
      label: t("groups.form.delivery.online") || "أونلاين",
      desc: t("groups.form.delivery.onlineDesc") || "الجلسات برابط ميتنج — بدون بدل مواصلات",
    },
    {
      value: "offline",
      icon: MapPin,
      label: t("groups.form.delivery.offline") || "أوفلاين (حضوري)",
      desc: t("groups.form.delivery.offlineDesc") || "الجلسات في المقر — بدل مواصلات لأول جلسة في اليوم",
    },
  ];

  return (
    <div className={`${cardCls} p-4`}>
      <SectionHeading icon={Building2} title={t("groups.form.deliveryMode") || "نوع الجروب"} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => onChangeMode(m.value)}
              className={`text-start flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${active
                ? "border-primary/50 bg-primary/5 dark:bg-primary/15 shadow-sm"
                : "border-PowderBlueBorder dark:border-dark_border hover:bg-IcyBreeze dark:hover:bg-dark_input"
                }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? "bg-gradient-to-br from-primary to-orange-deep" : "bg-primary/10 dark:bg-primary/20"}`}>
                <Icon className={`w-4.5 h-4.5 ${active ? "text-white" : "text-primary"}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-MidnightNavyText dark:text-white">{m.label}</p>
                <p className="text-[11px] text-SlateBlueText dark:text-darktext leading-relaxed mt-0.5">{m.desc}</p>
              </div>
              {active && <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 ms-auto" />}
            </button>
          );
        })}
      </div>

      {mode === "offline" && (
        <div className="mt-4 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
          <label className={labelCls}>{t("groups.form.location") || "مكان الجروب"} *</label>
          <MapLocationPicker value={locationDetails} onChange={onChangeLocationDetails} t={t} />
          <p className="text-[11px] text-orange-deep dark:text-amber-brand mt-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            بدل المواصلات بيتحسب للمدرس لأول جلسة أوفلاين في اليوم بس — قيمته بتتحدد من صفحة أسعار المدرسين.
          </p>
        </div>
      )}
    </div>
  );
}

function ModuleSelection({ curriculum, selectedModules, setSelectedModules, t, groupId, sessionsGenerated }) {
  const [syncing, setSyncing] = useState(false);

  if (!curriculum?.length) return null;

  const toggle = (idx) => {
    const cur = selectedModules?.selectedModules || [];
    const next = cur.includes(idx) ? cur.filter(i => i !== idx) : [...cur, idx].sort((a, b) => a - b);
    setSelectedModules({ ...selectedModules, selectedModules: next });
  };

  const totalSessionsAll = curriculum.reduce((s, m) => s + (m.totalSessions || 3), 0);
  const selectedSessions = (selectedModules?.selectedModules || []).reduce((s, i) => s + (curriculum[i]?.totalSessions || 3), 0);

  const handleSync = async () => {
    if (!groupId) return;

    if (selectedModules?.mode === "specific" && !selectedModules?.selectedModules?.length) {
      toast.error(t("groups.form.errors.noModulesSelected"));
      return;
    }

    const confirmed = window.confirm(
      "هيتم حذف أي سيشن لسه Scheduled لموديولات اتشالت من الاختيار، وإضافة سيشنز جديدة للموديولات الجديدة على المواعيد المتاحة. السيشنز المكتملة (Completed) مش هتتأثر خالص. تكمل؟"
    );
    if (!confirmed) return;

    setSyncing(true);
    const toastId = toast.loading("جاري مزامنة السيشنز...");
    try {
      const res = await fetch(`/api/groups/${groupId}/sync-modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleSelection: selectedModules }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || result.message || "فشلت المزامنة");
      }
      toast.success(result.message, { id: toastId });
    } catch (err) {
      toast.error(err.message || "فشلت المزامنة", { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="mt-4 p-4 rounded-2xl border border-secondary/20 dark:border-secondary/30 bg-gradient-to-br from-PaleSkyBlu to-IcyBreeze dark:from-secondary/10 dark:to-teal-dark/10">
      <SectionHeading icon={Layers} title={t("groups.form.moduleSelection")} />

      <div className="flex gap-2 mb-3 p-1 bg-white/70 dark:bg-black/20 rounded-xl w-fit">
        {["all", "specific"].map(mode => {
          const active = selectedModules?.mode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setSelectedModules({ mode, selectedModules: [] })}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${active
                ? "bg-gradient-to-r from-secondary to-teal-dark text-white shadow-sm"
                : "text-SlateBlueText dark:text-darktext hover:bg-white dark:hover:bg-black/20"
                }`}
            >
              {t(`groups.form.${mode === "all" ? "allModules" : "specificModules"}`)}
            </button>
          );
        })}
      </div>

      {selectedModules?.mode === "specific" && (
        <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar p-2 bg-white dark:bg-darkmode rounded-xl border border-secondary/10 dark:border-secondary/20">
          {curriculum.map((module, idx) => {
            const isSel = selectedModules?.selectedModules?.includes(idx) || false;
            return (
              <div key={idx} onClick={() => toggle(idx)}
                className={`flex items-center gap-3 p-2.5 border rounded-xl cursor-pointer transition-all ${isSel ? "border-secondary/50 bg-secondary/5 dark:bg-secondary/15 shadow-sm" : "border-PowderBlueBorder dark:border-dark_border hover:bg-IcyBreeze dark:hover:bg-dark_input"}`}>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-colors ${isSel ? "bg-secondary border-secondary" : "border-gray-300 dark:border-dark_border"}`}>
                  {isSel && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-MidnightNavyText dark:text-white">
                    {t("groups.form.module")} {idx + 1}: {module.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-secondary/10 dark:bg-secondary/20 text-secondary dark:text-white px-2 py-0.5 rounded-full">
                      {module.lessons?.length || 0} {t("groups.form.lessons")}
                    </span>
                    <span className="text-[10px] bg-orange-coral/10 dark:bg-orange-coral/20 text-orange-coral px-2 py-0.5 rounded-full">
                      {module.totalSessions || 3} {t("groups.form.sessions")}
                    </span>
                    {areDuplicates(module.lessons) && (
                      <span className="text-[10px] bg-amber-brand/15 dark:bg-amber-brand/20 text-orange-deep dark:text-amber-brand px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Copy className="w-3 h-3" />{t("groups.form.repeatedLessons")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3">
        {selectedModules?.mode === "all" ? (
          <p className="text-xs text-primary bg-primary/10 dark:bg-primary/15 p-2.5 rounded-xl flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {t("groups.form.allModulesSelected")}: {curriculum.length} {t("groups.form.modules")}, {totalSessionsAll} {t("groups.form.totalSessions")}
          </p>
        ) : selectedModules?.selectedModules?.length > 0 ? (
          <div className="bg-primary/10 dark:bg-primary/15 p-2.5 rounded-xl space-y-1">
            <p className="text-xs text-primary flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {t("groups.form.selectedModules")}: {selectedModules.selectedModules.length} {t("groups.form.modules")}, {selectedSessions} {t("groups.form.totalSessions")}
            </p>
            <p className="text-[10px] text-primary/80 ps-5">
              {t("groups.form.modulesList")}: {selectedModules.selectedModules.map(i => i + 1).join(", ")}
            </p>
          </div>
        ) : (
          <p className="text-xs text-orange-deep dark:text-amber-brand bg-amber-brand/15 dark:bg-amber-brand/20 p-2.5 rounded-xl flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {t("groups.form.noModulesSelected")}
          </p>
        )}
      </div>

      {sessionsGenerated && groupId && (
        <div className="mt-3 flex flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 bg-primary hover:bg-orange-deep text-white rounded-xl font-medium text-xs transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {syncing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                جاري المزامنة...
              </>
            ) : (
              <>🔄 مزامنة السيشنز مع الاختيار الجديد</>
            )}
          </button>
          <p className="text-[10px] text-SlateBlueText dark:text-darktext text-right">
            هيتنفذ فورًا: هيلغي أي سيشن Scheduled لموديولات اتشالت، ويضيف سيشنز للموديولات الجديدة. السيشنز المكتملة مش هتتأثر.
          </p>
        </div>
      )}
    </div>
  );
}

function CurriculumView({ curriculum, moduleSelection, expandedModules, onToggleExpand, initial, onClose, t }) {
  if (!curriculum?.length) return null;

  const totalLessons = curriculum.reduce((s, m) => s + (m.lessons?.length || 0), 0);
  const totalSessions = curriculum.reduce((s, m) => s + (m.totalSessions || 3), 0);

  return (
    <div className="mt-4 p-4 bg-IcyBreeze dark:bg-dark_input rounded-2xl border border-PowderBlueBorder dark:border-dark_border">
      <SectionHeading icon={Layers} title={t("groups.form.courseStructure")} badge={`${curriculum.length} ${t("groups.form.modules")}`} />

      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
        {curriculum.map((module, idx) => {
          const lessonGroups = getUniqueLessonGroups(module.lessons);
          const hasDup = areDuplicates(module.lessons);
          const isSel = moduleSelection.mode === "specific" && moduleSelection.selectedModules?.includes(idx);
          const isOpen = expandedModules.includes(idx);

          return (
            <div key={idx} className="border border-PowderBlueBorder dark:border-dark_border rounded-xl overflow-hidden">
              <div
                onClick={() => onToggleExpand(idx)}
                className={`flex items-center gap-2 p-3 cursor-pointer transition-colors ${isSel ? "bg-primary/5 border-l-4 border-primary" : "bg-white dark:bg-darkmode hover:bg-IcyBreeze dark:hover:bg-dark_border"}`}>
                {isOpen ? <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />}
                <div className="flex-1 flex items-center gap-2">
                  <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${isSel ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>{idx + 1}</span>
                  <p className="text-sm font-medium text-MidnightNavyText dark:text-white">{module.title}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {isSel && <span className="text-[10px] bg-primary/10 text-primary dark:bg-primary/20 px-2 py-0.5 rounded-full">✓ {t("groups.form.selected")}</span>}
                  <span className="text-[10px] bg-secondary/10 dark:bg-secondary/20 text-secondary dark:text-white px-2 py-0.5 rounded-full">{module.lessons?.length || 0} {t("groups.form.lessons")}</span>
                  <span className="text-[10px] bg-orange-coral/10 dark:bg-orange-coral/20 text-orange-coral px-2 py-0.5 rounded-full">{module.totalSessions || 3} {t("groups.form.sessions")}</span>
                </div>
              </div>

              {isOpen && module.lessons?.length > 0 && (
                <div className="p-3 bg-IcyBreeze dark:bg-dark_input border-t border-PowderBlueBorder dark:border-dark_border">
                  <p className="text-[10px] font-medium text-SlateBlueText dark:text-darktext mb-2 flex items-center gap-2">
                    <span>{t("groups.form.lessons")}:</span>
                    {hasDup && (
                      <span className="bg-amber-brand/15 dark:bg-amber-brand/20 text-orange-deep dark:text-amber-brand px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Copy className="w-3 h-3" />{t("groups.form.repeatedContent")}
                      </span>
                    )}
                  </p>
                  <div className="space-y-1.5">
                    {lessonGroups.map((g, gi) => (
                      <div key={gi} className="bg-white dark:bg-darkmode rounded-xl p-2 border border-PowderBlueBorder dark:border-dark_border flex items-start gap-2">
                        <div className="flex-shrink-0 w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-[8px] font-bold text-primary">{g.startIndex + 1}-{g.endIndex + 1}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-MidnightNavyText dark:text-white">{g.title}</p>
                          {g.count > 1 && (
                            <p className="text-[10px] text-orange-deep dark:text-amber-brand mt-0.5 flex items-center gap-1">
                              <Copy className="w-3 h-3" />{t("groups.form.repeatedLessonsCount", { count: g.count })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 p-2 bg-secondary/10 dark:bg-secondary/15 rounded-lg">
                    <p className="text-[10px] text-secondary dark:text-white flex items-center gap-1">
                      <span className="font-medium">{t("groups.form.sessionDistribution")}:</span>
                      <span className="bg-secondary/20 dark:bg-secondary/30 px-2 py-0.5 rounded-full">
                        {t("groups.form.sessionsPerModule", { count: module.totalSessions || 3 })}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-PowderBlueBorder dark:border-dark_border grid grid-cols-3 gap-2">
        {[
          { label: t("groups.form.totalModules"), val: curriculum.length, color: "text-primary" },
          { label: t("groups.form.totalLessons"), val: totalLessons, color: "text-secondary dark:text-white" },
          { label: t("groups.form.totalSessions"), val: totalSessions, color: "text-orange-coral" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-white dark:bg-darkmode rounded-xl p-2.5 text-center border border-PowderBlueBorder dark:border-dark_border">
            <p className="text-[10px] text-SlateBlueText dark:text-darktext">{label}</p>
            <p className={`text-base font-bold ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {initial?.id && (
        <div className="mt-3 flex justify-end">
          <button type="button"
            onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("openAddStudents", { detail: { groupId: initial.id } })); }}
            className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-medium text-xs transition-colors flex items-center gap-2 border border-primary/20">
            <span>⏭️</span>{t("groups.form.skipToAddStudents")}
          </button>
        </div>
      )}
    </div>
  );
}

function ConflictAlert({ conflicts, t }) {
  if (!conflicts?.length) return null;
  return (
    <div className="mt-3 p-3 rounded-2xl border border-orange-coral/40 dark:border-orange-coral/40 bg-orange-coral/5 dark:bg-orange-coral/10 space-y-2">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-orange-coral flex-shrink-0" />
        <p className="text-xs font-semibold text-orange-coral">
          {t("groups.form.reschedule.conflictTitle")}
        </p>
      </div>
      <div className="space-y-1.5">
        {conflicts.map((c, i) => (
          <div key={i} className="bg-white dark:bg-darkmode rounded-xl p-2 border border-orange-coral/25 dark:border-orange-coral/30 text-xs text-orange-coral">
            <p className="font-medium">{c.groupName} <span className="opacity-60">({c.groupCode})</span></p>
            <p className="opacity-80">{c.sharedDays.join(", ")} · {c.theirTime}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinkConflictAlert({ conflicts, t }) {
  if (!conflicts?.length) return null;
  return (
    <div className="mt-3 p-3 rounded-2xl border border-orange-coral/40 dark:border-orange-coral/40 bg-orange-coral/5 dark:bg-orange-coral/10 space-y-2">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-orange-coral flex-shrink-0" />
        <p className="text-xs font-semibold text-orange-coral">
          {t("groups.form.reschedule.linkConflictTitle") || "فيه لينكات مستخدمة في سيشنات الجروب هتتعارض مع جروب تاني في الميعاد الجديد"}
        </p>
      </div>
      <div className="space-y-1.5">
        {conflicts.map((c, i) => (
          <div key={i} className="bg-white dark:bg-darkmode rounded-xl p-2 border border-orange-coral/25 dark:border-orange-coral/30 text-xs text-orange-coral">
            <p className="font-medium">{c.linkName}</p>
            <p className="opacity-80">{(c.conflictingDays || []).join(", ")} · {c.conflictingTime}</p>
            {c.affectedSessions?.length > 0 && (
              <p className="opacity-70 mt-1">
                {t("groups.form.reschedule.affectedSessions") || "السيشنز المتأثرة"}: {c.affectedSessions.map(s => s.title).join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange, Icon, colorCls }) {
  return (
    <div className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${checked ? "border-amber-brand/40 dark:border-amber-brand/30 bg-amber-brand/10 dark:bg-amber-brand/10" : "border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darklight"}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${checked ? "bg-amber-brand/15 dark:bg-amber-brand/20" : "bg-gray-100 dark:bg-dark_input"}`}>
          <Icon className={`w-4 h-4 ${checked ? "text-orange-deep dark:text-amber-brand" : "text-gray-400"}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-MidnightNavyText dark:text-white truncate">{label}</p>
          {description && <p className="text-[11px] text-SlateBlueText dark:text-darktext mt-0.5">{description}</p>}
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-200 rounded-full dark:bg-dark_border peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm peer-checked:bg-primary" />
      </label>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GroupForm({ initial, onClose, onSaved }) {
  const { t, language } = useI18n();
  const isRTL = language === "ar";

  const localDays = useMemo(() =>
    language === "ar"
      ? ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
      : ENGLISH_DAYS,
    [language]
  );

  const getLocalDay = useCallback(
    (dateStr) => dateStr ? localDays[new Date(dateStr).getDay()] : null,
    [localDays]
  );

  // ── Step navigation ─────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [animDir, setAnimDir] = useState(1);
  const [visible, setVisible] = useState(true);

  const goTo = useCallback((next) => {
    if (next === step) return;
    setAnimDir(next > step ? 1 : -1);
    setVisible(false);
    setTimeout(() => { setStep(next); setVisible(true); }, 180);
  }, [step]);

  const next = () => goTo(Math.min(step + 1, STEPS.length - 1));
  const prev = () => goTo(Math.max(step - 1, 0));

  // ── Form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState(() => buildInitialForm(initial));

  const onChange = useCallback((path, value) => {
    setForm(prev => {
      const n = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let cur = n;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      cur[keys[keys.length - 1]] = value;
      return n;
    });
  }, []);

  // ── Data ────────────────────────────────────────────────────────────────────
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [instructorsLoading, setInstructorsLoading] = useState(true);
  const [curriculum, setCurriculum] = useState(null);
  const [expandedModules, setExpandedModules] = useState([]);

  const [allTags, setAllTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(true);

  // ── Reschedule state ────────────────────────────────────────────────────────
  const isActiveWithSessions = useMemo(
    () => initial?.status === "active" && !!initial?.sessionsGenerated,
    [initial]
  );

  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [reschedulePreview, setReschedulePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [scheduleConflicts, setScheduleConflicts] = useState([]);
  const [linkConflicts, setLinkConflicts] = useState([]);
  const [loading, setLoading] = useState(false);

  const isRescheduleMode = useMemo(
    () => isActiveWithSessions && !!effectiveFrom,
    [isActiveWithSessions, effectiveFrom]
  );

  const scheduleLocked = isActiveWithSessions && !effectiveFrom;

  // ── Load courses + instructors + tags ──────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [cr, ir, tr] = await Promise.all([
          fetch("/api/courses"),
          fetch("/api/instructor"),
          fetch("/api/tags"),
        ]);
        const [cd, id, td] = await Promise.all([cr.json(), ir.json(), tr.json()]);
        if (cd.success) setCourses(cd.data || []);
        if (id.success) setInstructors(id.data || []);
        if (td.success) setAllTags(td.data || []);
      } catch {
        toast.error(t("groups.form.errors.loadCourses"));
      } finally {
        setCoursesLoading(false);
        setInstructorsLoading(false);
        setTagsLoading(false);
      }
    };
    load();
  }, [t]);

  // ── Load curriculum when course changes ─────────────────────────────────────
  useEffect(() => {
    if (!form.courseId) { setCurriculum(null); setExpandedModules([]); return; }
    const load = async () => {
      try {
        const r = await fetch(`/api/courses/${form.courseId}`);
        const d = await r.json();
        if (d.success && d.data) {
          setCurriculum(d.data.curriculum || []);
          setExpandedModules(d.data.curriculum?.length ? [0] : []);
        }
      } catch { toast.error(t("groups.form.errors.loadCurriculum")); }
    };
    load();
  }, [form.courseId, t]);

  // ── Load reschedule preview ─────────────────────────────────────────────────
  const loadPreview = useCallback(async () => {
    if (!isActiveWithSessions || !initial?.id) return;
    setPreviewLoading(true);
    try {
      const r = await fetch(`/api/groups/${initial.id}/reschedule`);
      const d = await r.json();
      if (d.success) setReschedulePreview(d.data);
    } catch { /* preview is best-effort */ }
    finally { setPreviewLoading(false); }
  }, [isActiveWithSessions, initial?.id]);

  useEffect(() => {
    if (effectiveFrom && !reschedulePreview) loadPreview();
  }, [effectiveFrom, loadPreview, reschedulePreview]);

  // ── Day helpers ─────────────────────────────────────────────────────────────
  const anchorDate = isActiveWithSessions ? effectiveFrom : form.schedule.startDate;
  const firstEnglishDay = getEnglishDay(anchorDate);
  const firstLocalDay = getLocalDay(anchorDate);

  const isDaySelected = (localDay) => {
    const idx = localDays.indexOf(localDay);
    return form.schedule.daysOfWeek.includes(ENGLISH_DAYS[idx]);
  };

  const handleStartDateChange = (ds) => {
    const englishDay = getEnglishDay(ds);
    setForm(prev => ({ ...prev, schedule: { ...prev.schedule, startDate: ds, daysOfWeek: englishDay ? [englishDay] : [] } }));
    if (englishDay) toast.success(t("groups.form.messages.firstDaySelected", { day: getLocalDay(ds) }));
  };

  const toggleDay = (localDay) => {
    const idx = localDays.indexOf(localDay);
    const englishDay = ENGLISH_DAYS[idx];

    if (englishDay === firstEnglishDay && form.schedule.daysOfWeek.includes(englishDay)) {
      toast.error(t("groups.form.errors.cannotRemoveFirstDay", { day: firstLocalDay }));
      return;
    }

    setForm(prev => {
      const current = prev.schedule.daysOfWeek;
      const isSel = current.includes(englishDay);
      if (!isSel && current.length >= 3) { toast.error(t("groups.form.errors.maxDays")); return prev; }
      const next = isSel
        ? current.filter(d => d !== englishDay)
        : [...current, englishDay].sort((a, b) => ENGLISH_DAYS.indexOf(a) - ENGLISH_DAYS.indexOf(b));
      return { ...prev, schedule: { ...prev.schedule, daysOfWeek: next } };
    });
  };

  const toggleInstructor = useCallback((id) => {
    const idStr = id?.toString();
    setForm(prev => ({
      ...prev,
      instructors: prev.instructors.includes(idStr)
        ? prev.instructors.filter(i => i !== idStr)
        : [...prev.instructors, idStr],
    }));
  }, []);

  const toggleModuleExpand = useCallback((idx) =>
    setExpandedModules(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]),
    []
  );

  const toggleTag = useCallback((tagId) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(id => id !== tagId)
        : [...prev.tags, tagId],
    }));
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name || !form.courseId || !form.maxStudents) {
      toast.error(t("groups.form.errors.requiredFields")); return;
    }
    if (form.moduleSelection.mode === "specific" && !form.moduleSelection.selectedModules?.length) {
      toast.error(t("groups.form.errors.noModulesSelected")); return;
    }

    if (!isActiveWithSessions) {
      if (!form.schedule.daysOfWeek.length) {
        toast.error(t("groups.form.errors.atLeastOneDay")); return;
      }
      if (!form.schedule.daysOfWeek.includes(firstEnglishDay)) {
        toast.error(t("groups.form.errors.firstDayRequired", { day: getLocalDay(form.schedule.startDate) })); return;
      }
    }

    if (isRescheduleMode) {
      if (!form.schedule.daysOfWeek.length) {
        toast.error(t("groups.form.errors.atLeastOneDay")); return;
      }
      if (!form.schedule.daysOfWeek.includes(getEnglishDay(effectiveFrom))) {
        toast.error(t("groups.form.errors.firstDayRequired", { day: getLocalDay(effectiveFrom) })); return;
      }
    }

    const hasLocation = form.locationDetails?.placeName?.trim() || (form.locationDetails?.lat && form.locationDetails?.lng);
    if (form.deliveryMode === "offline" && !hasLocation) {
      toast.error(t("groups.form.errors.locationRequired") || "لازم تحدد مكان الجروب على الماب في حالة الأوفلاين");
      setStep(0);
      return;
    }

    if (!form.groupType) {
      toast.error(t("groups.form.errors.groupTypeRequired") || "لازم تحدد نوع الجروب (أطفال أو بالغين)");
      setStep(0);
      return;
    }

    setLoading(true);
    setScheduleConflicts([]);
    setLinkConflicts([]);
    const toastId = toast.loading(initial ? t("groups.form.messages.updating") : t("groups.form.messages.creating"));

    try {
      const composeLocationString = (ld) =>
        ld ? [ld.extraDetails, ld.placeName, ld.country].filter(Boolean).join(" — ") : "";

      const basePayload = {
        name: form.name,
        courseId: form.courseId,
        maxStudents: parseInt(form.maxStudents),
        instructors: form.instructors,
        moduleSelection: form.moduleSelection,
        automation: form.automation,
        tags: form.tags,
        deliveryMode: form.deliveryMode,
        // ✅ NEW: نوع الجروب
        groupType: form.groupType,
        location: form.deliveryMode === "offline" ? composeLocationString(form.locationDetails) : "",
        locationDetails: form.deliveryMode === "offline" ? form.locationDetails : null,
      };

      if (!isActiveWithSessions) {
        basePayload.schedule = form.schedule;
      }

      const url = initial?.id ? `/api/groups/${initial.id}` : "/api/groups";
      const method = initial?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(basePayload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || t("groups.form.errors.saveFailed"));

      if (isRescheduleMode) {
        const rres = await fetch(`/api/groups/${initial.id}/reschedule`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            effectiveFrom,
            daysOfWeek: form.schedule.daysOfWeek,
            timeFrom: form.schedule.timeFrom,
            timeTo: form.schedule.timeTo,
            timezone: form.schedule.timezone,
          }),
        });
        const rresult = await rres.json();

        if (rres.status === 409 && rresult.conflicts?.length) {
          toast.error(t("groups.form.errors.scheduleConflict"), { id: toastId });
          setScheduleConflicts(rresult.conflicts);
          setLoading(false);
          return;
        }

        if (rres.status === 409 && rresult.linkConflicts?.length) {
          toast.error(
            t("groups.form.errors.linkConflict") || "فيه لينكات هتتعارض مع جروب تاني في الميعاد الجديد",
            { id: toastId }
          );
          setLinkConflicts(rresult.linkConflicts);
          setLoading(false);
          return;
        }

        if (!rres.ok) throw new Error(rresult.error || t("groups.form.errors.rescheduleFailed"));

        toast.success(
          t("groups.form.messages.rescheduled", { regenerated: rresult.data.regeneratedCount, frozen: rresult.data.frozenCount }),
          { id: toastId },
        );
        onSaved(); onClose();
        return;
      }

      toast.success(initial ? t("groups.form.messages.updated") : t("groups.form.messages.created"), { id: toastId });
      onSaved(); onClose();
    } catch (err) {
      toast.error(err.message || t("groups.form.errors.saveFailed"), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────────────
  const progress = ((step + 1) / STEPS.length) * 100;
  const cs = STEPS[step];
  const c = COLOR[cs.color];
  const StepIcon = cs.icon;
  const isLastStep = step === STEPS.length - 1;

  const currentStepId = STEPS[step]?.id;

  // ═══════════════════════════════════════════════════════════════════════════
  // ⚠️ WARNING: من هنا لتحت (الـ RENDER) — الملف الأصلي كان مقطوع عند نقطة
  //    {done ? <CheckCircle className="w-4.5 h-4.5" /> : <Icon className="w-4.5
  //    فأنا أكملت الـ render بحسب المنطق المتوقع. راجعه وعدّل لو فيه تفاصيل
  //    مختلفة عندك.
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full bg-gray-50/60 dark:bg-darkmode" dir={isRTL ? "rtl" : "ltr"}>

      {/* Progress header */}
      <div className="px-5 pt-5 pb-4 border-b border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darkmode">
        <div className="relative flex items-center justify-between mb-1">
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-100 dark:bg-dark_border -z-0" />
          <div
            className="absolute top-5 left-5 h-0.5 bg-gradient-to-r from-primary to-orange-deep -z-0 transition-all duration-500"
            style={{ width: `calc(${(step / (STEPS.length - 1)) * 100}% - ${step === 0 ? 0 : 0}px)`, maxWidth: "calc(100% - 2.5rem)" }}
          />
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const dc = COLOR[s.color];
            const done = i < step;
            const active = i === step;
            return (
              <button key={s.id} type="button" onClick={() => goTo(i)}
                className="relative z-10 flex flex-col items-center gap-1.5 transition-all group">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-4 border-white dark:border-darkmode ${done
                    ? `bg-gradient-to-br ${dc.btn} text-white shadow-md`
                    : active
                      ? `bg-gradient-to-br ${dc.btn} text-white shadow-lg scale-110`
                      : "bg-gray-100 dark:bg-dark_input text-gray-400 dark:text-darkmuted group-hover:bg-gray-200 dark:group-hover:bg-dark_border"
                  }`}>
                  {done ? (
                    <CheckCircle className="w-4.5 h-4.5" />
                  ) : (
                    <Icon className="w-4.5 h-4.5" />
                  )}
                </div>
                <span className={`text-[11px] font-medium ${active ? "text-primary" : done ? "text-gray-700 dark:text-white" : "text-gray-400 dark:text-darkmuted"}`}>
                  {t(`groups.form.steps.${s.id}`) || s.id}
                </span>
              </button>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 rounded-full bg-gray-100 dark:bg-dark_border overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-orange-deep transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        <div
          className={`p-5 transition-all duration-200 ${visible ? "opacity-100 translate-x-0" : "opacity-0"
            }`}
          style={{ transform: visible ? "translateX(0)" : `translateX(${animDir > 0 ? "20px" : "-20px"})` }}
        >

          {/* ══════════════════════════════════════════════════════════
              STEP 1: BASIC — الاسم + نوع الجروب + الكورس + الموديولات + Delivery
          ══════════════════════════════════════════════════════════ */}
          {currentStepId === "basic" && (
            <div className="space-y-4">
              <div className={`${cardCls} p-4 space-y-4`}>
                <SectionHeading icon={Hash} title={t("groups.form.basicInfo") || "البيانات الأساسية"} />

                {/* Group Name */}
                <div>
                  <label className={labelCls}>{t("groups.form.name") || "اسم الجروب"} *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => onChange("name", e.target.value)}
                    placeholder={t("groups.form.namePlaceholder") || "مثال: English A1 — Group 1"}
                    className={inputCls}
                  />
                </div>

                {/* Course */}
                <div>
                  <label className={labelCls}>{t("groups.form.course") || "الكورس"} *</label>
                  <div className="relative">
                    <select
                      value={form.courseId}
                      onChange={(e) => onChange("courseId", e.target.value)}
                      disabled={coursesLoading || !!initial?.id}
                      className={`${selectCls} ${initial?.id ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <option value="">{t("groups.form.selectCourse") || "اختر الكورس"}</option>
                      {courses.map((course) => (
                        <option key={course._id || course.id} value={course._id || course.id}>
                          {course.title} — {course.level}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute ${isRTL ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none`} />
                  </div>
                </div>

                {/* Max students */}
                <div>
                  <label className={labelCls}>{t("groups.form.maxStudents") || "الحد الأقصى للطلاب"} *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.maxStudents}
                    onChange={(e) => onChange("maxStudents", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* ✅ NEW: نوع الجروب (Kids / Adults / Mixed) */}
              <GroupTypeSelector
                value={form.groupType}
                onChange={(v) => onChange("groupType", v)}
                t={t}
                language={language}
              />

              {/* Delivery Mode */}
              <DeliveryModeSelector
                mode={form.deliveryMode}
                locationDetails={form.locationDetails}
                onChangeMode={(m) => onChange("deliveryMode", m)}
                onChangeLocationDetails={(ld) => onChange("locationDetails", ld)}
                t={t}
              />

              {/* Module Selection */}
              {curriculum?.length > 0 && (
                <ModuleSelection
                  curriculum={curriculum}
                  selectedModules={form.moduleSelection}
                  setSelectedModules={(v) => onChange("moduleSelection", v)}
                  t={t}
                  groupId={initial?.id}
                  sessionsGenerated={initial?.sessionsGenerated}
                />
              )}

              {/* Curriculum view */}
              {curriculum?.length > 0 && (
                <CurriculumView
                  curriculum={curriculum}
                  moduleSelection={form.moduleSelection}
                  expandedModules={expandedModules}
                  onToggleExpand={toggleModuleExpand}
                  initial={initial}
                  onClose={onClose}
                  t={t}
                />
              )}

              {/* Tags */}
              {allTags?.length > 0 && (
                <div className={`${cardCls} p-4`}>
                  <SectionHeading icon={Tag} title={t("groups.form.tags") || "الوسوم"} />
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => {
                      const isSel = form.tags.includes(tag._id);
                      return (
                        <button
                          key={tag._id}
                          type="button"
                          onClick={() => toggleTag(tag._id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ring-1 ring-inset ${isSel
                              ? "text-white ring-transparent shadow-sm"
                              : "bg-gray-50 dark:bg-dark_input text-gray-600 dark:text-darktext ring-gray-200 dark:ring-dark_border"
                            }`}
                          style={isSel ? { backgroundColor: tag.color } : {}}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: isSel ? "rgba(255,255,255,0.85)" : tag.color }}
                          />
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 2: INSTRUCTORS
          ══════════════════════════════════════════════════════════ */}
          {currentStepId === "instructors" && (
            <div className={`${cardCls} p-4`}>
              <SectionHeading
                icon={User}
                title={t("groups.form.instructors") || "المدربون"}
                badge={`${form.instructors.length}`}
              />

              {instructorsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : instructors.length === 0 ? (
                <p className="text-sm text-SlateBlueText dark:text-darktext text-center py-6">
                  {t("groups.form.noInstructors") || "لا يوجد مدربون متاحون"}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {instructors.map((inst) => {
                    const isSel = form.instructors.includes((inst._id || inst.id)?.toString());
                    return (
                      <button
                        key={inst._id || inst.id}
                        type="button"
                        onClick={() => toggleInstructor(inst._id || inst.id)}
                        className={`text-start flex items-center gap-3 p-3 rounded-2xl border transition-all ${isSel
                            ? "border-secondary/50 bg-secondary/5 dark:bg-secondary/15 shadow-sm"
                            : "border-PowderBlueBorder dark:border-dark_border hover:bg-IcyBreeze dark:hover:bg-dark_input"
                          }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isSel ? "bg-gradient-to-br from-secondary to-teal-dark" : "bg-secondary/10 dark:bg-secondary/20"
                          }`}>
                          <User className={`w-4 h-4 ${isSel ? "text-white" : "text-secondary"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-MidnightNavyText dark:text-white truncate">{inst.name}</p>
                          {inst.email && (
                            <p className="text-[11px] text-SlateBlueText dark:text-darktext truncate">{inst.email}</p>
                          )}
                        </div>
                        {isSel && <CheckCircle className="w-4 h-4 text-secondary flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              <ConflictAlert conflicts={scheduleConflicts} t={t} />
              <LinkConflictAlert conflicts={linkConflicts} t={t} />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 3: SCHEDULE
          ══════════════════════════════════════════════════════════ */}
          {currentStepId === "schedule" && (
            <div className="space-y-4">
              {scheduleLocked && (
                <div className="p-3 rounded-2xl border border-amber-brand/40 dark:border-amber-brand/30 bg-amber-brand/10 dark:bg-amber-brand/10 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-deep dark:text-amber-brand flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-orange-deep dark:text-amber-brand">
                      {t("groups.form.scheduleLocked") || "الجدول مقفول"}
                    </p>
                    <p className="text-[11px] text-orange-deep/80 dark:text-amber-brand/80 mt-0.5">
                      {t("groups.form.scheduleLockedDesc") || "الجروب فيه سيشنات مولدة. لتعديل الجدول، لازم تدخل وضع إعادة الجدولة (Reschedule) من تبويب الحفظ."}
                    </p>
                  </div>
                </div>
              )}

              <div className={`${cardCls} p-4 space-y-4`}>
                <SectionHeading icon={Calendar} title={t("groups.form.schedule") || "الجدول"} />

                {/* Effective from (reschedule mode) */}
                {isActiveWithSessions && (
                  <div>
                    <label className={labelCls}>{t("groups.form.effectiveFrom") || "بداية التعديل من تاريخ"}</label>
                    <input
                      type="date"
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                )}

                {/* Start date */}
                {!isActiveWithSessions && (
                  <div>
                    <label className={labelCls}>{t("groups.form.startDate") || "تاريخ البداية"} *</label>
                    <input
                      type="date"
                      value={form.schedule.startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                )}

                {/* Days of week */}
                <div>
                  <label className={labelCls}>{t("groups.form.daysOfWeek") || "أيام الأسبوع"} *</label>
                  <div className="flex flex-wrap gap-2">
                    {localDays.map((day) => {
                      const isSel = isDaySelected(day);
                      const isFirst = day === firstLocalDay;
                      return (
                        <button
                          key={day}
                          type="button"
                          disabled={scheduleLocked}
                          onClick={() => toggleDay(day)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isSel
                              ? "bg-gradient-to-r from-orange-coral to-primary text-white shadow-sm"
                              : "bg-gray-100 dark:bg-dark_input text-gray-600 dark:text-darktext hover:bg-gray-200 dark:hover:bg-dark_border"
                            }`}
                        >
                          {day}
                          {isFirst && isSel && <span className="ml-1 text-[10px]">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-SlateBlueText dark:text-darktext mt-2">
                    {t("groups.form.daysHint") || "اختر من 1 إلى 3 أيام. اليوم الأول لازم يكون نفس يوم تاريخ البداية."}
                  </p>
                </div>

                {/* Time from / to */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{t("groups.form.timeFrom") || "من"} *</label>
                    <input
                      type="time"
                      value={form.schedule.timeFrom}
                      onChange={(e) => onChange("schedule.timeFrom", e.target.value)}
                      disabled={scheduleLocked}
                      className={`${inputCls} disabled:opacity-50`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{t("groups.form.timeTo") || "إلى"} *</label>
                    <input
                      type="time"
                      value={form.schedule.timeTo}
                      onChange={(e) => onChange("schedule.timeTo", e.target.value)}
                      disabled={scheduleLocked}
                      className={`${inputCls} disabled:opacity-50`}
                    />
                  </div>
                </div>

                {/* Timezone */}
                <div>
                  <label className={labelCls}>{t("groups.form.timezone") || "المنطقة الزمنية"}</label>
                  <input
                    type="text"
                    value={form.schedule.timezone}
                    onChange={(e) => onChange("schedule.timezone", e.target.value)}
                    disabled={scheduleLocked}
                    className={`${inputCls} disabled:opacity-50`}
                  />
                </div>
              </div>

              {isRescheduleMode && previewLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}

              <ConflictAlert conflicts={scheduleConflicts} t={t} />
              <LinkConflictAlert conflicts={linkConflicts} t={t} />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 4: AUTOMATION
          ══════════════════════════════════════════════════════════ */}
          {currentStepId === "automation" && (
            <div className={`${cardCls} p-4 space-y-3`}>
              <SectionHeading icon={Bell} title={t("groups.form.automation") || "الأتمتة"} />

              <ToggleRow
                label={t("groups.form.automation.whatsappEnabled") || "تفعيل رسائل الواتساب"}
                description={t("groups.form.automation.whatsappEnabledDesc") || "السماح بإرسال أي رسائل لهذا الجروب"}
                checked={form.automation.whatsappEnabled}
                onChange={(e) => onChange("automation.whatsappEnabled", e.target.checked)}
                Icon={AUTOMATION_META.whatsappEnabled.icon}
              />

              <ToggleRow
                label={t("groups.form.automation.welcomeMessage") || "رسالة الترحيب"}
                description={t("groups.form.automation.welcomeMessageDesc") || "إرسال رسالة ترحيب عند إضافة طالب للجروب"}
                checked={form.automation.welcomeMessage}
                onChange={(e) => onChange("automation.welcomeMessage", e.target.checked)}
                Icon={AUTOMATION_META.welcomeMessage.icon}
              />

              <ToggleRow
                label={t("groups.form.automation.reminderEnabled") || "تفعيل التذكيرات"}
                description={t("groups.form.automation.reminderEnabledDesc") || "إرسال تذكيرات قبل كل جلسة"}
                checked={form.automation.reminderEnabled}
                onChange={(e) => onChange("automation.reminderEnabled", e.target.checked)}
                Icon={AUTOMATION_META.reminderEnabled.icon}
              />

              {form.automation.reminderEnabled && (
                <div className="pl-12">
                  <label className={labelCls}>{t("groups.form.automation.reminderBeforeHours") || "التذكير قبل (ساعات)"}</label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={form.automation.reminderBeforeHours}
                    onChange={(e) => onChange("automation.reminderBeforeHours", parseInt(e.target.value) || 24)}
                    className={inputCls}
                  />
                </div>
              )}

              <ToggleRow
                label={t("groups.form.automation.notifyGuardianOnAbsence") || "إشعار ولي الأمر عند الغياب"}
                description={t("groups.form.automation.notifyGuardianOnAbsenceDesc") || "إرسال إشعار لولي الأمر عند غياب الطالب"}
                checked={form.automation.notifyGuardianOnAbsence}
                onChange={(e) => onChange("automation.notifyGuardianOnAbsence", e.target.checked)}
                Icon={AUTOMATION_META.notifyGuardianOnAbsence.icon}
              />

              <ToggleRow
                label={t("groups.form.automation.notifyOnSessionUpdate") || "إشعار عند تحديث الجلسة"}
                description={t("groups.form.automation.notifyOnSessionUpdateDesc") || "إشعار الطالب وولي الأمر بأي تغيير في الجلسة"}
                checked={form.automation.notifyOnSessionUpdate}
                onChange={(e) => onChange("automation.notifyOnSessionUpdate", e.target.checked)}
                Icon={AUTOMATION_META.notifyOnSessionUpdate.icon}
              />

              <ToggleRow
                label={t("groups.form.automation.completionMessage") || "رسالة إكمال الجروب"}
                description={t("groups.form.automation.completionMessageDesc") || "إرسال رسالة عند إتمام الجروب"}
                checked={form.automation.completionMessage}
                onChange={(e) => onChange("automation.completionMessage", e.target.checked)}
                Icon={AUTOMATION_META.completionMessage.icon}
              />
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darkmode px-5 py-4">
        <div className="flex items-center justify-between gap-3">

          {/* Prev / Cancel */}
          <button
            type="button"
            onClick={step === 0 ? onClose : prev}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-PowderBlueBorder dark:border-dark_border text-SlateBlueText dark:text-darktext font-medium text-sm hover:bg-IcyBreeze dark:hover:bg-dark_input transition-colors disabled:opacity-50"
          >
            {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {step === 0 ? (t("common.cancel") || "إلغاء") : (t("common.previous") || "السابق")}
          </button>

          {/* Indicator */}
          <span className="text-xs text-SlateBlueText dark:text-darktext tabular-nums">
            {step + 1} / {STEPS.length}
          </span>

          {/* Next / Save */}
          {!isLastStep ? (
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-orange-deep text-white font-semibold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]"
            >
              {t("common.next") || "التالي"}
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-orange-deep text-white font-semibold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("common.saving") || "جاري الحفظ..."}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {initial ? (t("common.save") || "حفظ") : (t("common.create") || "إنشاء")}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}