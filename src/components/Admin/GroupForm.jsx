"use client";
import { useState, useEffect } from "react";
import {
  BookOpen, Users, Calendar, Clock, Save, X,
  User, Bell, CheckCircle, Hash, AlertCircle, ChevronDown,
  ChevronRight, ChevronLeft, Layers, Copy
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";

// ─── Steps config ────────────────────────────────────────────────────────────
const STEPS = [
  { id: "basic",       icon: Hash,       color: "violet"  },
  { id: "instructors", icon: User,       color: "blue"    },
  { id: "schedule",    icon: Calendar,   color: "purple"  },

  { id: "automation",  icon: Bell,       color: "orange"  },
];

const COLOR = {
  violet:  { btn: "from-violet-600 to-purple-600",   dot: "bg-violet-500",   text: "text-violet-600 dark:text-violet-400",   border: "border-violet-200 dark:border-violet-800",   panel: "from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20",   badge: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300",   ring: "ring-violet-400"  },
  blue:    { btn: "from-blue-600 to-indigo-600",     dot: "bg-blue-500",     text: "text-blue-600 dark:text-blue-400",       border: "border-blue-200 dark:border-blue-800",       panel: "from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",       badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",           ring: "ring-blue-400"    },
  purple:  { btn: "from-purple-600 to-fuchsia-600",  dot: "bg-purple-500",   text: "text-purple-600 dark:text-purple-400",   border: "border-purple-200 dark:border-purple-800",   panel: "from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/20", badge: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",   ring: "ring-purple-400"  },

  orange:  { btn: "from-orange-500 to-amber-500",   dot: "bg-orange-500",   text: "text-orange-600 dark:text-orange-400",   border: "border-orange-200 dark:border-orange-800",   panel: "from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20",   badge: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",   ring: "ring-orange-400"  },
};

const inputCls = "w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-dark_input dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm transition-all";
const labelCls = "block text-13 font-medium text-MidnightNavyText dark:text-white mb-1.5";
const selectCls = "w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary";

export default function GroupForm({ initial, onClose, onSaved }) {
  const { t, language } = useI18n();
  const isRTL = language === "ar";

  // ── step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [animDir, setAnimDir] = useState(1);
  const [visible, setVisible] = useState(true);

  const goTo = (next) => {
    if (next === step) return;
    setAnimDir(next > step ? 1 : -1);
    setVisible(false);
    setTimeout(() => { setStep(next); setVisible(true); }, 180);
  };
  const next = () => goTo(Math.min(step + 1, STEPS.length - 1));
  const prev = () => goTo(Math.max(step - 1, 0));

  // ── form state (unchanged) ──────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: initial?.name || "",
    courseId: initial?.courseId?._id || initial?.courseId || "",
    instructors: initial?.instructors?.map(i => i._id || i) || [],
    maxStudents: initial?.maxStudents || 25,
    schedule: {
      startDate: initial?.schedule?.startDate?.split("T")[0] || "",
      daysOfWeek: initial?.schedule?.daysOfWeek || [],
      timeFrom: initial?.schedule?.timeFrom || "18:00",
      timeTo: initial?.schedule?.timeTo || "20:00",
      timezone: initial?.schedule?.timezone || "Africa/Cairo",
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
  });

  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [instructorsLoading, setInstructorsLoading] = useState(true);
  const [selectedCourseCurriculum, setSelectedCourseCurriculum] = useState(null);
  const [showCurriculum, setShowCurriculum] = useState(false);
  const [expandedModules, setExpandedModules] = useState([]);
  const [availableModules, setAvailableModules] = useState([]);

  const daysOfWeek = language === "ar"
    ? ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
    : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const englishDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const getDayNameFromDate = (ds) => { if (!ds) return null; return daysOfWeek[new Date(ds).getDay()]; };
  const getEnglishDayNameFromDate = (ds) => { if (!ds) return null; return englishDays[new Date(ds).getDay()]; };
  const areLessonsDuplicates = (lessons) => { if (!lessons || lessons.length < 2) return false; return lessons.every(l => l.title === lessons[0]?.title); };

  const getUniqueLessonGroups = (lessons) => {
    if (!lessons) return [];
    const groups = [];
    let current = [], currentTitle = null;
    lessons.forEach((lesson, idx) => {
      if (lesson.title !== currentTitle) {
        if (current.length > 0) groups.push({ title: currentTitle, count: current.length, startIndex: idx - current.length, endIndex: idx - 1, lessons: current });
        current = [lesson]; currentTitle = lesson.title;
      } else { current.push(lesson); }
    });
    if (current.length > 0) groups.push({ title: currentTitle, count: current.length, startIndex: lessons.length - current.length, endIndex: lessons.length - 1, lessons: current });
    return groups;
  };

  // ── data loading (unchanged) ────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        const r = await fetch("/api/courses");
        const d = await r.json();
        if (d.success && d.data) setCourses(d.data);
        setCoursesLoading(false);
      } catch { toast.error(t("groups.form.errors.loadCourses")); setCoursesLoading(false); }
      try {
        const r = await fetch("/api/instructor");
        const d = await r.json();
        if (d.success && d.data) setInstructors(d.data);
        setInstructorsLoading(false);
      } catch { toast.error(t("groups.form.errors.loadInstructors")); setInstructorsLoading(false); }
    };
    loadData();
  }, [t]);

  useEffect(() => {
    const loadCurriculum = async () => {
      if (!form.courseId) { setSelectedCourseCurriculum(null); setShowCurriculum(false); setExpandedModules([]); setAvailableModules([]); return; }
      try {
        const r = await fetch(`/api/courses/${form.courseId}`);
        const d = await r.json();
        if (d.success && d.data) {
          setSelectedCourseCurriculum(d.data.curriculum);
          setShowCurriculum(true);
          setAvailableModules(d.data.curriculum || []);
          if (d.data.curriculum?.length > 0) setExpandedModules([0]);
        }
      } catch { toast.error(t("groups.form.errors.loadCurriculum")); }
    };
    loadCurriculum();
  }, [form.courseId, t]);

  // ── handlers (unchanged) ────────────────────────────────────────────────────
  const handleStartDateChange = (ds) => {
    const englishDay = getEnglishDayNameFromDate(ds);
    const firstDay = getDayNameFromDate(ds);
    setForm(prev => ({ ...prev, schedule: { ...prev.schedule, startDate: ds, daysOfWeek: englishDay ? [englishDay] : [] } }));
    if (firstDay) toast.success(t("groups.form.messages.firstDaySelected", { day: firstDay }));
  };

  const onChange = (path, value) => {
    const paths = path.split(".");
    setForm(prev => {
      const n = JSON.parse(JSON.stringify(prev));
      let cur = n;
      for (let i = 0; i < paths.length - 1; i++) cur = cur[paths[i]];
      cur[paths[paths.length - 1]] = value;
      return n;
    });
  };

  const toggleDay = (day) => {
    const englishFirstDay = getEnglishDayNameFromDate(form.schedule.startDate);
    const currentFirstDay = getDayNameFromDate(form.schedule.startDate);
    const dayIndex = daysOfWeek.indexOf(day);
    const englishDay = englishDays[dayIndex];
    if (englishDay === englishFirstDay && form.schedule.daysOfWeek.includes(englishDay)) { toast.error(t("groups.form.errors.cannotRemoveFirstDay", { day: currentFirstDay })); return; }
    setForm(prev => {
      const current = prev.schedule.daysOfWeek;
      const isSel = current.includes(englishDay);
      if (!isSel && current.length >= 3) { toast.error(t("groups.form.errors.maxDays")); return prev; }
      return { ...prev, schedule: { ...prev.schedule, daysOfWeek: isSel ? current.filter(d => d !== englishDay) : [...current, englishDay].sort((a, b) => englishDays.indexOf(a) - englishDays.indexOf(b)) } };
    });
  };

  const toggleInstructor = (id) => setForm(prev => ({ ...prev, instructors: prev.instructors.includes(id) ? prev.instructors.filter(i => i !== id) : [...prev.instructors, id] }));
  const toggleModuleExpand = (idx) => setExpandedModules(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  const isDaySelected = (day) => { const idx = daysOfWeek.indexOf(day); return form.schedule.daysOfWeek.includes(englishDays[idx]); };
  const firstDayName = getDayNameFromDate(form.schedule.startDate);

  // ── sub-components (unchanged logic) ───────────────────────────────────────
  const ModuleSelection = ({ curriculum, selectedModules, setSelectedModules }) => {
    if (!curriculum?.length) return null;
    return (
      <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h4 className="text-sm font-semibold text-MidnightNavyText dark:text-white">{t("groups.form.moduleSelection")}</h4>
        </div>
        <div className="flex gap-4 mb-3">
          {["all", "specific"].map(mode => (
            <label key={mode} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="moduleMode" checked={selectedModules?.mode === mode} onChange={() => setSelectedModules({ mode, selectedModules: [] })} className="w-4 h-4 text-primary" />
              <span className="text-sm text-MidnightNavyText dark:text-white">{t(`groups.form.${mode === "all" ? "allModules" : "specificModules"}`)}</span>
            </label>
          ))}
        </div>
        {selectedModules?.mode === "specific" && (
          <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar p-2 bg-white dark:bg-darkmode rounded-lg">
            {curriculum.map((module, idx) => {
              const isSel = selectedModules?.selectedModules?.includes(idx) || false;
              return (
                <div key={idx} onClick={() => { const cur = selectedModules?.selectedModules || []; setSelectedModules({ ...selectedModules, selectedModules: isSel ? cur.filter(i => i !== idx) : [...cur, idx].sort((a, b) => a - b) }); }}
                  className={`flex items-center gap-3 p-2 border rounded-lg cursor-pointer ${isSel ? "border-primary bg-primary/5" : "border-PowderBlueBorder dark:border-dark_border hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                  <input type="checkbox" checked={isSel} onChange={() => {}} className="w-4 h-4 text-primary rounded" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-MidnightNavyText dark:text-white">{t("groups.form.module")} {idx + 1}: {module.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">{module.lessons?.length || 0} {t("groups.form.lessons")}</span>
                      <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">{module.totalSessions || 3} {t("groups.form.sessions")}</span>
                      {areLessonsDuplicates(module.lessons) && <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full flex items-center gap-1"><Copy className="w-3 h-3" />{t("groups.form.repeatedLessons")}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {selectedModules?.mode === "all"
          ? <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"><p className="text-xs text-green-800 dark:text-green-300">✓ {t("groups.form.allModulesSelected")}: {curriculum.length} {t("groups.form.modules")}, {curriculum.reduce((s, m) => s + (m.totalSessions || 3), 0)} {t("groups.form.totalSessions")}</p></div>
          : selectedModules?.selectedModules?.length > 0
            ? <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><p className="text-xs text-blue-800 dark:text-blue-300">✓ {t("groups.form.selectedModules")}: {selectedModules.selectedModules.length} {t("groups.form.modules")}, {selectedModules.selectedModules.reduce((s, i) => s + (curriculum[i]?.totalSessions || 3), 0)} {t("groups.form.totalSessions")}</p><p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">{t("groups.form.modulesList")}: {selectedModules.selectedModules.map(i => i + 1).join(", ")}</p></div>
            : <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg"><p className="text-xs text-yellow-800 dark:text-yellow-300">⚠️ {t("groups.form.noModulesSelected")}</p></div>
        }
      </div>
    );
  };

  const CurriculumView = ({ curriculum }) => {
    if (!curriculum?.length) return null;
    const totalLessons = curriculum.reduce((s, m) => s + (m.lessons?.length || 0), 0);
    const totalSessions = curriculum.reduce((s, m) => s + (m.totalSessions || 3), 0);
    return (
      <div className="mt-4 p-4 bg-gray-50 dark:bg-dark_input rounded-xl border border-PowderBlueBorder dark:border-dark_border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /><h4 className="text-sm font-semibold text-MidnightNavyText dark:text-white">{t("groups.form.courseStructure")}</h4></div>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{curriculum.length} {t("groups.form.modules")}</span>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          {curriculum.map((module, idx) => {
            const lessonGroups = getUniqueLessonGroups(module.lessons);
            const hasDup = areLessonsDuplicates(module.lessons);
            const isSel = form.moduleSelection.mode === "specific" && form.moduleSelection.selectedModules?.includes(idx);
            return (
              <div key={idx} className="border border-PowderBlueBorder dark:border-dark_border rounded-lg overflow-hidden">
                <div className={`flex items-center gap-2 p-3 cursor-pointer transition-colors ${isSel ? "bg-primary/5 border-l-4 border-primary" : "bg-white dark:bg-darkmode hover:bg-gray-50 dark:hover:bg-gray-800"}`} onClick={() => toggleModuleExpand(idx)}>
                  <button className="flex-shrink-0">{expandedModules.includes(idx) ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}</button>
                  <div className="flex-1 flex items-center gap-2">
                    <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${isSel ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>{idx + 1}</span>
                    <p className="text-sm font-medium text-MidnightNavyText dark:text-white">{module.title}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isSel && <span className="text-[10px] bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">✓ {t("groups.form.selected")}</span>}
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">{module.lessons?.length || 0} {t("groups.form.lessons")}</span>
                    <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">{module.totalSessions || 3} {t("groups.form.sessions")}</span>
                  </div>
                </div>
                {expandedModules.includes(idx) && module.lessons?.length > 0 && (
                  <div className="p-3 bg-gray-50 dark:bg-dark_input border-t border-PowderBlueBorder dark:border-dark_border">
                    <p className="text-[10px] font-medium text-SlateBlueText dark:text-darktext mb-2 flex items-center gap-2">
                      <span>{t("groups.form.lessons")}:</span>
                      {hasDup && <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full flex items-center gap-1"><Copy className="w-3 h-3" />{t("groups.form.repeatedContent")}</span>}
                    </p>
                    <div className="space-y-1.5">
                      {lessonGroups.map((g, gi) => (
                        <div key={gi} className="bg-white dark:bg-darkmode rounded-lg p-2 border border-PowderBlueBorder dark:border-dark_border flex items-start gap-2">
                          <div className="flex-shrink-0 w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center"><span className="text-[8px] font-bold text-primary">{g.startIndex + 1}-{g.endIndex + 1}</span></div>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-MidnightNavyText dark:text-white">{g.title}</p>
                            {g.count > 1 && <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5 flex items-center gap-1"><Copy className="w-3 h-3" />{t("groups.form.repeatedLessonsCount", { count: g.count })}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-[10px] text-blue-800 dark:text-blue-300 flex items-center gap-1">
                        <span className="font-medium">{t("groups.form.sessionDistribution")}:</span>
                        <span className="bg-blue-200 dark:bg-blue-800 px-2 py-0.5 rounded-full">{t("groups.form.sessionsPerModule", { count: module.totalSessions || 3 })}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 pt-3 border-t border-PowderBlueBorder dark:border-dark_border grid grid-cols-3 gap-2">
          {[{ label: t("groups.form.totalModules"), val: curriculum.length, color: "text-primary" }, { label: t("groups.form.totalLessons"), val: totalLessons, color: "text-green-600" }, { label: t("groups.form.totalSessions"), val: totalSessions, color: "text-purple-600" }].map(({ label, val, color }) => (
            <div key={label} className="bg-white dark:bg-darkmode rounded-lg p-2 text-center">
              <p className="text-[10px] text-SlateBlueText dark:text-darktext">{label}</p>
              <p className={`text-base font-bold ${color}`}>{val}</p>
            </div>
          ))}
        </div>
        {initial?.id && (
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("openAddStudents", { detail: { groupId: initial.id } })); }} className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg font-medium text-xs transition-colors flex items-center gap-2 border border-primary/20">
              <span>⏭️</span>{t("groups.form.skipToAddStudents")}
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── submit (unchanged) ──────────────────────────────────────────────────────
  const submit = async () => {
    setLoading(true);
    const toastId = toast.loading(initial ? t("groups.form.messages.updating") : t("groups.form.messages.creating"));
    try {
      if (!form.name || !form.courseId || !form.maxStudents) throw new Error(t("groups.form.errors.requiredFields"));
      if (form.schedule.daysOfWeek.length === 0) throw new Error(t("groups.form.errors.atLeastOneDay"));
      const englishFirstDay = getEnglishDayNameFromDate(form.schedule.startDate);
      if (!form.schedule.daysOfWeek.includes(englishFirstDay)) throw new Error(t("groups.form.errors.firstDayRequired", { day: getDayNameFromDate(form.schedule.startDate) }));
      if (form.moduleSelection.mode === "specific" && (!form.moduleSelection.selectedModules?.length)) throw new Error(t("groups.form.errors.noModulesSelected"));
      const payload = { ...form, maxStudents: parseInt(form.maxStudents) };
      const res = await fetch(initial?.id ? `/api/groups/${initial.id}` : "/api/groups", { method: initial?.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || t("groups.form.errors.saveFailed"));
      toast.success(initial ? t("groups.form.messages.updated") : t("groups.form.messages.created"), { id: toastId });
      onSaved(); onClose();
    } catch (err) { toast.error(err.message || t("groups.form.errors.saveFailed"), { id: toastId }); } finally { setLoading(false); }
  };

  // ── render ──────────────────────────────────────────────────────────────────
  const progress = ((step + 1) / STEPS.length) * 100;
  const cs = STEPS[step];
  const c = COLOR[cs.color];
  const StepIcon = cs.icon;
  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="flex flex-col h-full" dir={isRTL ? "rtl" : "ltr"}>

      {/* ── Progress header ── */}
      <div className="px-5 pt-4 pb-3 border-b border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darkmode">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const dc = COLOR[s.color];
            const done = i < step;
            const active = i === step;
            return (
              <button key={s.id} type="button" onClick={() => goTo(i)}
                className={`flex flex-col items-center gap-1 transition-all ${active ? "scale-110" : "opacity-60 hover:opacity-90"}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all
                  ${done ? `bg-gradient-to-br ${dc.btn} text-white shadow-md`
                    : active ? `bg-gradient-to-br ${dc.btn} text-white shadow-lg ring-2 ring-offset-2 ring-offset-white dark:ring-offset-darkmode ring-${dc.dot.replace("bg-", "")}`
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"}`}>
                  {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-[10px] font-medium hidden sm:block ${active ? dc.text : "text-gray-400 dark:text-gray-600"}`}>
                  {t(`groups.form.step.${s.id}`)}
                </span>
              </button>
            );
          })}
        </div>
        <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-full bg-gradient-to-r ${c.btn} rounded-full transition-all duration-500`} style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[11px] text-SlateBlueText dark:text-darktext mt-1.5 text-center">
          {t("groups.form.step")} {step + 1} / {STEPS.length}
        </p>
      </div>

      {/* ── Slide area ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5" style={{ animation: visible ? `slideIn${animDir > 0 ? "Right" : "Left"} 0.22s cubic-bezier(.22,.68,0,1.2) both` : "none" }}>

          {/* Step header card */}
          <div className={`flex items-center gap-3 mb-5 p-4 rounded-2xl bg-gradient-to-br ${c.panel} border ${c.border}`}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.btn} flex items-center justify-center shadow-md flex-shrink-0`}>
              <StepIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-15 font-bold text-MidnightNavyText dark:text-white">{t(`groups.form.step.${cs.id}.title`)}</h3>
              <p className="text-12 text-SlateBlueText dark:text-darktext">{t(`groups.form.step.${cs.id}.desc`)}</p>
            </div>
          </div>

          {/* ══════════════════════════════════════════ */}
          {/* STEP 0 — Basic Info */}
          {/* ══════════════════════════════════════════ */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>{t("groups.form.name")} *</label>
                <input type="text" value={form.name} onChange={e => onChange("name", e.target.value)} placeholder={t("groups.form.namePlaceholder")} className={inputCls} required />
              </div>

              <div>
                <label className={labelCls}>{t("groups.form.maxStudents")} *</label>
                <input type="number" value={form.maxStudents} onChange={e => onChange("maxStudents", e.target.value)} min="1" className={inputCls} required />
              </div>

              <div>
                <label className={labelCls}>{t("groups.form.course")} *</label>
                {coursesLoading
                  ? <div className={`${inputCls} text-gray-400`}>{t("groups.form.loading.courses")}</div>
                  : (
                    <select value={form.courseId} onChange={e => onChange("courseId", e.target.value)} className={selectCls} required>
                      <option value="">{t("groups.form.selectCourse")}...</option>
                      {courses.map(c => <option key={c._id} value={c._id}>{c.title} ({c.level})</option>)}
                    </select>
                  )}

                {showCurriculum && selectedCourseCurriculum && (
                  <>
                    <ModuleSelection curriculum={selectedCourseCurriculum} selectedModules={form.moduleSelection} setSelectedModules={v => onChange("moduleSelection", v)} />
                    <CurriculumView curriculum={selectedCourseCurriculum} />
                  </>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* STEP 1 — Instructors */}
          {/* ══════════════════════════════════════════ */}
          {step === 1 && (
            <div>
              {instructorsLoading
                ? <div className="text-center py-8 text-sm text-gray-500">{t("groups.form.loading.instructors")}</div>
                : instructors.length === 0
                  ? <div className="text-center py-8 text-sm text-gray-500">{t("groups.form.noInstructors")}</div>
                  : (
                    <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                      {instructors.map(instructor => (
                        <div key={instructor._id} onClick={() => toggleInstructor(instructor._id)}
                          className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${form.instructors.includes(instructor._id) ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20" : "border-PowderBlueBorder dark:border-dark_border hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                          <input type="checkbox" checked={form.instructors.includes(instructor._id)} onChange={() => {}} className="w-4 h-4 text-primary rounded" />
                          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-MidnightNavyText dark:text-white">{instructor.name}</p>
                            <p className="text-xs text-SlateBlueText dark:text-darktext">{instructor.email}</p>
                          </div>
                          {form.instructors.includes(instructor._id) && <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                        </div>
                      ))}
                    </div>
                  )}
              {form.instructors.length > 0 && (
                <div className={`mt-4 p-3 rounded-xl ${c.badge} border ${c.border}`}>
                  <p className="text-xs font-medium">{t("groups.form.selectedInstructors") || "Selected"}: {form.instructors.length}</p>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* STEP 2 — Schedule */}
          {/* ══════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className={labelCls}>{t("groups.form.startDate")} *</label>
                <input type="date" value={form.schedule.startDate} onChange={e => handleStartDateChange(e.target.value)} min={new Date().toISOString().split("T")[0]} className={inputCls} required />
                {firstDayName && <p className="text-xs text-primary mt-1">{t("groups.form.messages.firstDayWillBe", { day: firstDayName })}</p>}
              </div>

              <div>
                <label className={labelCls}>{t("groups.form.daysOfWeek")}</label>
                <div className={`mb-3 p-3 rounded-xl border ${c.border} bg-gradient-to-br ${c.panel} flex items-start gap-2`}>
                  <AlertCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-purple-800 dark:text-purple-300 space-y-1">
                    <p className="font-medium">{t("groups.form.help.scheduleInfo")}:</p>
                    <p>• {language === "ar" ? "اختر من 1 إلى 3 أيام" : "Select 1 to 3 days"}</p>
                    <p>• {language === "ar" ? "اليوم الأول يجب أن يكون" : "First day must be"} <strong>{firstDayName || "---"}</strong></p>
                    <p>• {language === "ar" ? `✓ محدد: ${form.schedule.daysOfWeek.length} يوم` : `✓ Selected: ${form.schedule.daysOfWeek.length} day(s)`}</p>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {daysOfWeek.map(day => {
                    const isFirstDay = day === firstDayName;
                    const isSelected = isDaySelected(day);
                    const isDisabled = !form.schedule.startDate || (isFirstDay && isSelected);
                    return (
                      <button key={day} type="button" onClick={() => toggleDay(day)} disabled={isDisabled}
                        className={`relative px-1 py-2.5 text-xs rounded-xl font-medium transition-all ${isSelected ? `bg-gradient-to-br ${c.btn} text-white shadow-md ${isFirstDay ? "ring-2 ring-offset-1 ring-purple-400" : ""}` : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"} ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                        {language === "ar" ? day.slice(0, 3) : day.slice(0, 3)}
                        {isFirstDay && isSelected && <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-darkmode" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t("groups.form.timeFrom")} *</label>
                  <input type="time" value={form.schedule.timeFrom} onChange={e => onChange("schedule.timeFrom", e.target.value)} className={inputCls} required />
                </div>
                <div>
                  <label className={labelCls}>{t("groups.form.timeTo")} *</label>
                  <input type="time" value={form.schedule.timeTo} onChange={e => onChange("schedule.timeTo", e.target.value)} className={inputCls} required />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* STEP 3 — Automation */}
          {/* ══════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-3">
              {Object.entries({
                whatsappEnabled: t("groups.form.automation.whatsappEnabled"),
                welcomeMessage: t("groups.form.automation.welcomeMessage"),
                reminderEnabled: t("groups.form.automation.reminderEnabled"),
                notifyGuardianOnAbsence: t("groups.form.automation.notifyGuardianOnAbsence"),
                notifyOnSessionUpdate: t("groups.form.automation.notifyOnSessionUpdate"),
                completionMessage: t("groups.form.automation.completionMessage"),
              }).map(([key, lbl]) => (
                <div key={key} className={`flex items-center justify-between p-3 border rounded-xl transition-all ${form.automation[key] ? "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10" : "border-PowderBlueBorder dark:border-dark_border"}`}>
                  <span className="text-sm text-MidnightNavyText dark:text-white">{lbl}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={form.automation[key]} onChange={e => onChange(`automation.${key}`, e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 rounded-full dark:bg-gray-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>
              ))}

              {form.automation.reminderEnabled && (
                <div className="mt-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                  <label className={labelCls}>{t("groups.form.automation.reminderBefore")}</label>
                  <input type="number" value={form.automation.reminderBeforeHours} onChange={e => onChange("automation.reminderBeforeHours", parseInt(e.target.value))} min="1" max="168" className={inputCls} />
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Footer ── */}
      <div className="sticky bottom-0 bg-white dark:bg-darkmode border-t border-PowderBlueBorder dark:border-dark_border px-5 py-4">
        <div className="flex gap-3">
          {step === 0 ? (
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 border border-PowderBlueBorder dark:border-dark_border py-2.5 px-4 rounded-xl font-semibold text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-2 disabled:opacity-50 transition-all text-14">
              <X className="w-4 h-4" />{t("groups.form.cancel")}
            </button>
          ) : (
            <button type="button" onClick={prev} disabled={loading} className="flex-1 border border-PowderBlueBorder dark:border-dark_border py-2.5 px-4 rounded-xl font-semibold text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-2 disabled:opacity-50 transition-all text-14">
              {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {t("common.back")}
            </button>
          )}

          {isLastStep ? (
            <button type="button" onClick={submit} disabled={loading} className={`flex-1 bg-gradient-to-r ${c.btn} text-white py-2.5 px-4 rounded-xl font-semibold shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all text-14`}>
              {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{initial ? t("groups.form.updating") : t("groups.form.creating")}</> : <><Save className="w-4 h-4" />{initial ? t("groups.form.update") : t("groups.form.create")}</>}
            </button>
          ) : (
            <button type="button" onClick={next} className={`flex-1 bg-gradient-to-r ${c.btn} text-white py-2.5 px-4 rounded-xl font-semibold shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all text-14`}>
              {t("common.next")}
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight { from { opacity:0; transform:translateX(32px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideInLeft  { from { opacity:0; transform:translateX(-32px); } to { opacity:1; transform:translateX(0); } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
        .dark .custom-scrollbar::-webkit-scrollbar-track { background: #374151; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; }
        .text-12 { font-size: 0.75rem; }
        .text-13 { font-size: 0.8125rem; }
        .text-14 { font-size: 0.875rem; }
        .text-15 { font-size: 0.9375rem; }
      `}</style>
    </div>
  );
}