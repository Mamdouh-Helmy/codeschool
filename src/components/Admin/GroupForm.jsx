// components/admin/GroupForm.jsx
"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users, Calendar, Save, X,
  User, Bell, CheckCircle, Hash, AlertCircle, ChevronDown,
  ChevronRight, ChevronLeft, Layers, Copy, Tag,
  MessageCircle, Sparkles, Clock, GraduationCap, Mail,
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";

// ─── Constants ────────────────────────────────────────────────────────────────
// Every color below is one of the 4 brand hues defined in tailwind.config.js:
//   primary (#ff6700 orange) · secondary (#004d59 teal) · orange-coral (#ff6437) · amber-brand (#feaf00)
// plus the project's own neutral/dark tokens (PowderBlueBorder, IcyBreeze, darkmode,
// darklight, dark_input, dark_border, darktext, darkmuted, darksubtle). No outside
// palette (blue/purple/violet/indigo/fuchsia/green/red/yellow) is used anywhere.

const STEPS = [
  { id: "basic", icon: Hash, color: "primary" },
  { id: "instructors", icon: User, color: "secondary" },
  { id: "schedule", icon: Calendar, color: "coral" },
  { id: "automation", icon: Bell, color: "amber" },
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

// ✅ جديد: تنبيه تعارض اللينكات (شكل بيانات مختلف عن ConflictAlert بتاع الجروبات)
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
  const [linkConflicts, setLinkConflicts] = useState([]); // ✅ جديد: تعارض اللينكات
  const [loading, setLoading] = useState(false);

  const isRescheduleMode = useMemo(
    () => isActiveWithSessions && !!effectiveFrom,
    [isActiveWithSessions, effectiveFrom]
  );

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

    setLoading(true);
    setScheduleConflicts([]); // ✅ تصفير التعارضات القديمة قبل كل محاولة جديدة
    setLinkConflicts([]);     // ✅
    const toastId = toast.loading(initial ? t("groups.form.messages.updating") : t("groups.form.messages.creating"));

    try {
      const basePayload = {
        name: form.name,
        courseId: form.courseId,
        maxStudents: parseInt(form.maxStudents),
        instructors: form.instructors,
        moduleSelection: form.moduleSelection,
        automation: form.automation,
        tags: form.tags,
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

        // ✅ تعارض جروبات تانية (الجدول العام)
        if (rres.status === 409 && rresult.conflicts?.length) {
          toast.error(t("groups.form.errors.scheduleConflict"), { id: toastId });
          setScheduleConflicts(rresult.conflicts);
          setLoading(false);
          return;
        }

        // ✅ تعارض لينكات مستخدمة فعليًا في سيشنات الجروب
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-gray-50/60 dark:bg-darkmode" dir={isRTL ? "rtl" : "ltr"}>

      {/* Progress header */}
      <div className="px-5 pt-5 pb-4 border-b border-PowderBlueBorder dark:border-dark_border bg-white dark:bg-darkmode">
        <div className="relative flex items-center justify-between mb-1">
          {/* connecting rail */}
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
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-4 border-white dark:border-darkmode ${done ? `bg-gradient-to-br ${dc.btn} text-white shadow-md` :
                    active ? `bg-gradient-to-br ${dc.btn} text-white shadow-lg scale-110` :
                      "bg-gray-100 dark:bg-dark_input text-gray-400 dark:text-darkmuted group-hover:bg-gray-200 dark:group-hover:bg-dark_border"
                  }`}>
                  {done ? <CheckCircle className="w-4.5 h-4.5" /> : <Icon className="w-4.5 h-4.5" />}
                </div>
                <span className={`text-[10px] font-semibold hidden sm:block transition-colors ${active ? dc.text : "text-gray-400 dark:text-darksubtle"}`}>
                  {t(`groups.form.step.${s.id}`)}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-SlateBlueText dark:text-darktext mt-2 text-center font-medium">
          {t("groups.form.step")} {step + 1} {isRTL ? "من" : "of"} {STEPS.length}
        </p>
      </div>

      {/* Slide area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 max-w-2xl mx-auto" style={{ animation: visible ? `slideIn${animDir > 0 ? "Right" : "Left"} 0.22s cubic-bezier(.22,.68,0,1.2) both` : "none" }}>

          {/* Step header */}
          <div className={`flex items-center gap-3 mb-5 p-4 rounded-2xl bg-gradient-to-br ${c.panel} border ${c.border}`}>
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${c.btn} flex items-center justify-center shadow-md flex-shrink-0`}>
              <StepIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-15 font-bold text-MidnightNavyText dark:text-white">{t(`groups.form.step.${cs.id}.title`)}</h3>
              <p className="text-12 text-SlateBlueText dark:text-darktext">{t(`groups.form.step.${cs.id}.desc`)}</p>
            </div>
          </div>

          {/* ── Step 0: Basic Info ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div className={`${cardCls} p-4 space-y-4`}>
                <div>
                  <label className={labelCls}>{t("groups.form.name")} *</label>
                  <input type="text" value={form.name} onChange={e => onChange("name", e.target.value)}
                    placeholder={t("groups.form.namePlaceholder")} className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{t("groups.form.maxStudents")} *</label>
                    <div className="relative">
                      <Users className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                      <input type="number" value={form.maxStudents} onChange={e => onChange("maxStudents", e.target.value)}
                        min="1" className={`${inputCls} ps-9`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>{t("groups.form.course")} *</label>
                    {coursesLoading ? (
                      <div className={`${inputCls} text-gray-400`}>{t("groups.form.loading.courses")}</div>
                    ) : (
                      <div className="relative">
                        <GraduationCap className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                        <select value={form.courseId} onChange={e => onChange("courseId", e.target.value)} className={`${selectCls} ps-9`}>
                          <option value="">{t("groups.form.selectCourse")}...</option>
                          {courses.map(course => <option key={course._id} value={course._id}>{course.title} ({course.level})</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {curriculum && (
                <>
                  <ModuleSelection
                    curriculum={curriculum}
                    selectedModules={form.moduleSelection}
                    setSelectedModules={v => onChange("moduleSelection", v)}
                    t={t}
                    groupId={initial?.id}
                    sessionsGenerated={initial?.sessionsGenerated}
                  />
                  <CurriculumView curriculum={curriculum} moduleSelection={form.moduleSelection}
                    expandedModules={expandedModules} onToggleExpand={toggleModuleExpand}
                    initial={initial} onClose={onClose} t={t} />
                </>
              )}

              {/* Tags Selection */}
              <div className={`${cardCls} p-4`}>
                <SectionHeading icon={Tag} title={t("groups.form.tags") || "Tags"}
                  badge={form.tags.length > 0 ? form.tags.length : null} />
                {tagsLoading ? (
                  <div className={`${inputCls} text-gray-400`}>{t("groups.form.loading.tags") || "Loading tags..."}</div>
                ) : allTags.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-darksubtle py-2">
                    {t("groups.form.noTags") || "No tags available"}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tagItem) => {
                      const selected = form.tags.includes(tagItem._id);
                      return (
                        <button
                          key={tagItem._id}
                          type="button"
                          onClick={() => toggleTag(tagItem._id)}
                          style={selected ? { backgroundColor: tagItem.color, borderColor: tagItem.color } : { borderColor: tagItem.color }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border flex items-center gap-1.5 ${selected
                              ? "text-white shadow-sm"
                              : "bg-white dark:bg-darklight text-gray-600 dark:text-gray-300 hover:bg-IcyBreeze dark:hover:bg-dark_input"
                            }`}
                        >
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ backgroundColor: selected ? "rgba(255,255,255,0.85)" : tagItem.color }}
                          />
                          {tagItem.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 1: Instructors ── */}
          {step === 1 && (
            <div className={`${cardCls} p-4`}>
              {instructorsLoading ? (
                <div className="text-center py-8 text-sm text-gray-500">{t("groups.form.loading.instructors")}</div>
              ) : instructors.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">{t("groups.form.noInstructors")}</div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto custom-scrollbar">
                  {instructors.map(instructor => {
                    const id = instructor._id?.toString();
                    const isSel = form.instructors.includes(id);
                    return (
                      <div key={instructor._id} onClick={() => toggleInstructor(id)}
                        className={`relative flex items-center gap-3 p-3 border rounded-2xl cursor-pointer transition-all ${isSel ? "border-secondary/50 bg-secondary/5 dark:bg-secondary/15 shadow-sm" : "border-PowderBlueBorder dark:border-dark_border hover:bg-IcyBreeze dark:hover:bg-dark_input"}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isSel ? "bg-gradient-to-br from-secondary to-teal-dark" : "bg-secondary/10 dark:bg-secondary/20"}`}>
                          <User className={`w-4.5 h-4.5 ${isSel ? "text-white" : "text-secondary dark:text-white"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-MidnightNavyText dark:text-white truncate">{instructor.name}</p>
                          <p className="text-xs text-SlateBlueText dark:text-darktext flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 flex-shrink-0" />{instructor.email}
                          </p>
                        </div>
                        {isSel && <CheckCircle className="w-4.5 h-4.5 text-secondary dark:text-white flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {form.instructors.length > 0 && (
                <div className={`mt-4 p-3 rounded-xl ${c.badge} border ${c.border} flex items-center gap-2`}>
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-xs font-medium">{t("groups.form.selectedInstructors")}: {form.instructors.length}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Schedule ── */}
          {step === 2 && (
            <div className="space-y-4">

              {isActiveWithSessions && (
                <div className="p-4 rounded-2xl border border-amber-brand/40 dark:border-amber-brand/30 bg-amber-brand/10 dark:bg-amber-brand/10 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-deep dark:text-amber-brand flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-orange-deep dark:text-amber-brand">
                      <p className="font-semibold">{t("groups.form.reschedule.warningTitle")}</p>
                      <p className="mt-1 text-xs">{t("groups.form.reschedule.warningDesc")}</p>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>{t("groups.form.reschedule.effectiveFrom")}</label>
                    <input type="date" value={effectiveFrom}
                      onChange={e => {
                        setEffectiveFrom(e.target.value);
                        setScheduleConflicts([]);
                        setLinkConflicts([]); // ✅ تصفير تعارض اللينكات كمان لما يغيّر الميعاد
                      }}
                      min={new Date().toISOString().split("T")[0]} className={inputCls} />
                    <p className="text-[11px] text-SlateBlueText dark:text-darktext mt-1">
                      سيب الحقل ده فاضي لو مش عاوز تغيّر الميعاد — باقي البيانات (زي المدرسين) هتتحفظ عادي.
                    </p>
                    {effectiveFrom && (
                      <p className="text-xs text-orange-deep dark:text-amber-brand mt-1">
                        {t("groups.form.reschedule.firstDayWillBe", { day: getLocalDay(effectiveFrom) })}
                      </p>
                    )}
                  </div>

                  {effectiveFrom && (
                    <div className="text-xs rounded-xl bg-white dark:bg-darkmode border border-amber-brand/30 dark:border-amber-brand/30 p-3 space-y-1">
                      {previewLoading ? (
                        <p className="text-gray-500">{t("groups.form.reschedule.loadingPreview")}</p>
                      ) : reschedulePreview ? (
                        <>
                          <p className="text-primary">
                            ✓ {t("groups.form.reschedule.frozenCount", { count: reschedulePreview.completedCount })}
                          </p>
                          <p className="text-orange-deep dark:text-amber-brand">
                            🔄 {t("groups.form.reschedule.affectedCount", { count: reschedulePreview.affectedCount })}
                          </p>
                          {reschedulePreview.affectedCount === 0 && (
                            <p className="text-gray-500">{t("groups.form.reschedule.nothingToChange")}</p>
                          )}
                        </>
                      ) : (
                        <button type="button" onClick={loadPreview}
                          className="text-primary underline text-xs">
                          {t("groups.form.reschedule.loadPreview")}
                        </button>
                      )}
                    </div>
                  )}

                  <ConflictAlert conflicts={scheduleConflicts} t={t} />
                  <LinkConflictAlert conflicts={linkConflicts} t={t} /> {/* ✅ جديد */}
                </div>
              )}

              <div className={`${cardCls} p-4`}>
                <label className={labelCls}>
                  {t("groups.form.startDate")} {!isActiveWithSessions && "*"}
                </label>
                <input type="date" value={form.schedule.startDate}
                  onChange={e => !isActiveWithSessions && handleStartDateChange(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  disabled={isActiveWithSessions}
                  className={`${inputCls} ${isActiveWithSessions ? "opacity-60 cursor-not-allowed" : ""}`} />
                {!isActiveWithSessions && firstLocalDay && (
                  <p className="text-xs text-primary mt-1.5 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />{t("groups.form.messages.firstDayWillBe", { day: firstLocalDay })}
                  </p>
                )}
              </div>

              <div className={`${cardCls} p-4`}>
                <label className={labelCls}>{t("groups.form.daysOfWeek")}</label>
                <div className={`mb-3 p-3 rounded-xl border ${c.border} bg-gradient-to-br ${c.panel} flex items-start gap-2`}>
                  <AlertCircle className="w-4 h-4 text-orange-coral mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-orange-coral space-y-1">
                    <p className="font-medium">{t("groups.form.help.scheduleInfo")}:</p>
                    <p>• {language === "ar" ? "اختر من 1 إلى 3 أيام" : "Select 1 to 3 days"}</p>
                    <p>• {language === "ar" ? "اليوم الأول يجب أن يكون" : "First day must be"} <strong>{firstLocalDay || "---"}</strong></p>
                    <p>• {language === "ar" ? `✓ محدد: ${form.schedule.daysOfWeek.length} يوم` : `✓ Selected: ${form.schedule.daysOfWeek.length} day(s)`}</p>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {localDays.map(day => {
                    const isFirst = day === firstLocalDay;
                    const isSel = isDaySelected(day);
                    const isDisabled = !anchorDate || (isFirst && isSel);
                    return (
                      <button key={day} type="button" onClick={() => toggleDay(day)} disabled={isDisabled}
                        className={`relative px-1 py-3 text-xs rounded-2xl font-medium transition-all
                          ${isSel ? `bg-gradient-to-br ${c.btn} text-white shadow-md ${isFirst ? `ring-2 ring-offset-1 ${c.ring}` : ""}` : "bg-gray-100 dark:bg-dark_input text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark_border"}
                          ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:-translate-y-0.5"}`}>
                        {day.slice(0, 3)}
                        {isFirst && isSel && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full border-2 border-white dark:border-darkmode" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`${cardCls} p-4`}>
                <label className={labelCls}>
                  <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{t("groups.form.timeFrom")} — {t("groups.form.timeTo")} *</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input type="time" value={form.schedule.timeFrom}
                    onChange={e => onChange("schedule.timeFrom", e.target.value)} className={inputCls} />
                  <input type="time" value={form.schedule.timeTo}
                    onChange={e => onChange("schedule.timeTo", e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Automation ── */}
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
                <ToggleRow
                  key={key}
                  label={lbl}
                  checked={form.automation[key]}
                  onChange={e => onChange(`automation.${key}`, e.target.checked)}
                  Icon={AUTOMATION_META[key]?.icon || Bell}
                />
              ))}

              {form.automation.reminderEnabled && (
                <div className="mt-1 p-4 bg-amber-brand/10 dark:bg-amber-brand/10 rounded-2xl border border-amber-brand/30 dark:border-amber-brand/30">
                  <label className={labelCls}>{t("groups.form.automation.reminderBefore")}</label>
                  <input type="number" value={form.automation.reminderBeforeHours}
                    onChange={e => onChange("automation.reminderBeforeHours", parseInt(e.target.value))}
                    min="1" max="168" className={inputCls} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white dark:bg-darkmode border-t border-PowderBlueBorder dark:border-dark_border px-5 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        <div className="flex gap-3 max-w-2xl mx-auto">
          {step === 0 ? (
            <button type="button" onClick={onClose} disabled={loading}
              className="flex-1 border border-PowderBlueBorder dark:border-dark_border py-2.5 px-4 rounded-xl font-semibold text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-dark_input flex items-center justify-center gap-2 disabled:opacity-50 transition-all text-14">
              <X className="w-4 h-4" />{t("groups.form.cancel")}
            </button>
          ) : (
            <button type="button" onClick={prev} disabled={loading}
              className="flex-1 border border-PowderBlueBorder dark:border-dark_border py-2.5 px-4 rounded-xl font-semibold text-MidnightNavyText dark:text-white hover:bg-gray-50 dark:hover:bg-dark_input flex items-center justify-center gap-2 disabled:opacity-50 transition-all text-14">
              {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {t("common.back")}
            </button>
          )}

          {isLastStep ? (
            <button type="button" onClick={handleSubmit}
              disabled={loading}
              className={`flex-1 bg-gradient-to-r ${c.btn} text-white py-2.5 px-4 rounded-xl font-semibold shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all text-14`}>
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isRescheduleMode ? t("groups.form.reschedule.saving") : initial ? t("groups.form.updating") : t("groups.form.creating")}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isRescheduleMode ? t("groups.form.reschedule.confirmButton") : initial ? t("groups.form.update") : t("groups.form.create")}
                </>
              )}
            </button>
          ) : (
            <button type="button" onClick={next}
              className={`flex-1 bg-gradient-to-r ${c.btn} text-white py-2.5 px-4 rounded-xl font-semibold shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all text-14`}>
              {t("common.next")}
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight { from { opacity:0; transform:translateX(32px);  } to { opacity:1; transform:translateX(0); } }
        @keyframes slideInLeft  { from { opacity:0; transform:translateX(-32px); } to { opacity:1; transform:translateX(0); } }
        .custom-scrollbar::-webkit-scrollbar       { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background:#f1f1f1; border-radius:4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background:#888;    border-radius:4px; }
        .dark .custom-scrollbar::-webkit-scrollbar-track { background:#21262d; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background:#30363d; }
        .text-12 { font-size:0.75rem;    }
        .text-13 { font-size:0.8125rem;  }
        .text-14 { font-size:0.875rem;   }
        .text-15 { font-size:0.9375rem;  }
      `}</style>
    </div>
  );
}