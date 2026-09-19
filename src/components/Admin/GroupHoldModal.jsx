// components/admin/GroupHoldModal.jsx
"use client";

import { useState, useEffect } from "react";
import {
  PauseCircle,
  Clock,
  Layers,
  Infinity as InfinityIcon,
  Loader2,
  Calendar,
  Check,
  Minus,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import { useI18n } from "@/i18n/I18nProvider";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400";

const DAY_PRESETS = [3, 7, 14, 30];

// ─────────────────────────────────────────────────────────────────────────
// Stepper: number input with − / + buttons
// ─────────────────────────────────────────────────────────────────────────
function Stepper({ value, onChange, min, max, unit, label }) {
  const num = parseInt(value, 10);
  const current = Number.isNaN(num) ? 0 : num;
  const clamp = (n) => Math.min(max, Math.max(min, n));

  const stepBtn = `w-10 h-10 grid place-items-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors ${FOCUS} focus-visible:ring-inset`;

  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <button
          type="button"
          aria-label={`${label} −`}
          disabled={current <= min}
          onClick={() => onChange(String(clamp(current - 1)))}
          className={stepBtn}
        >
          <Minus className="w-4 h-4" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onChange(String(clamp(current || min)))}
          className={`w-16 h-10 text-center text-base font-bold tabular-nums bg-transparent text-gray-900 dark:text-white border-x border-gray-200 dark:border-gray-700 ${FOCUS} focus-visible:ring-inset [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
        />
        <button
          type="button"
          aria-label={`${label} +`}
          disabled={current >= max}
          onClick={() => onChange(String(clamp(current + 1)))}
          className={stepBtn}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Session row for the "until a specific session" picker
// ─────────────────────────────────────────────────────────────────────────
function SessionRow({ session, selected, onSelect, isAr, tr }) {
  const locale = isAr ? "ar-EG" : "en-US";
  const d = new Date(session.scheduledDate);
  const day = d.toLocaleDateString(locale, { day: "2-digit" });
  const month = d.toLocaleDateString(locale, { month: "short" });
  const weekday = d.toLocaleDateString(locale, { weekday: "short" });

  const meta = [
    `${tr("groups.hold.module")} ${(session.moduleIndex ?? 0) + 1}`,
    `${tr("groups.hold.session")} ${session.sessionNumber ?? 1}`,
    session.startTime,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-start transition-colors ${FOCUS} ${
        selected
          ? "border-amber-400 bg-amber-50 dark:bg-amber-500/10"
          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60"
      }`}
    >
      <span
        className={`w-12 shrink-0 rounded-lg py-1.5 text-center leading-tight ${
          selected
            ? "bg-amber-500 text-amber-950"
            : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        }`}
      >
        <span className="block text-base font-bold tabular-nums">{day}</span>
        <span className="block text-xs">{month}</span>
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-gray-900 dark:text-white truncate">
          {session.title}
        </span>
        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          {weekday} · {meta}
        </span>
      </span>
      {selected && (
        <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────
export default function GroupHoldModal({
  groupId,
  groupName,
  onClose,
  onSaved,
}) {
  const { t, language } = useI18n();
  const isAr = language === "ar";

  // Translate a key, with optional {placeholder} interpolation
  const tr = (key, vars = {}) => {
    let str = t(key) || key;
    Object.entries(vars).forEach(([k, v]) => {
      str = str.split(`{${k}}`).join(String(v));
    });
    return str;
  };

  // ── State ────────────────────────────────────────────────────────────
  const [holdType, setHoldType] = useState("duration");
  const [holdDays, setHoldDays] = useState("7");
  const [holdSessionsCount, setHoldSessionsCount] = useState("1");
  const [holdUntilSessionId, setHoldUntilSessionId] = useState("");
  const [reason, setReason] = useState("");
  const [shiftSessions, setShiftSessions] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Upcoming sessions ────────────────────────────────────────────────
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsFailed, setSessionsFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/hold`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!active) return;
        if (json.success) {
          setSessions(json.data?.upcomingSessions || []);
        } else {
          setSessionsFailed(true);
        }
      } catch (err) {
        console.error("Failed to load sessions:", err);
        if (active) setSessionsFailed(true);
      } finally {
        if (active) setLoadingSessions(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [groupId]);

  // ── Derived ──────────────────────────────────────────────────────────
  const daysNum = parseInt(holdDays, 10);
  const sessionsNum = parseInt(holdSessionsCount, 10);
  const selectedSession = sessions.find((s) => s._id === holdUntilSessionId);

  const isValid =
    holdType === "duration"
      ? daysNum >= 1 && daysNum <= 365
      : holdType === "sessions"
        ? sessionsNum >= 1 && sessionsNum <= 100
        : holdType === "until_session"
          ? Boolean(holdUntilSessionId)
          : true;

  const summary = (() => {
    switch (holdType) {
      case "duration":
        return daysNum >= 1
          ? tr("groups.hold.summary.duration", { days: daysNum })
          : null;
      case "sessions":
        return sessionsNum >= 1
          ? tr("groups.hold.summary.sessions", { count: sessionsNum })
          : null;
      case "until_session":
        return selectedSession
          ? tr("groups.hold.summary.untilSession", {
              title: selectedSession.title,
            })
          : tr("groups.hold.summary.pickSession");
      default:
        return tr("groups.hold.summary.indefinite");
    }
  })();

  // ── Submit ───────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isValid) {
      toast.error(
        holdType === "until_session"
          ? tr("groups.hold.selectSession")
          : holdType === "sessions"
            ? tr("groups.hold.invalidSessions")
            : tr("groups.hold.invalidDays"),
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        holdType,
        holdDays: holdType === "duration" ? daysNum : 0,
        holdSessionsCount: holdType === "sessions" ? sessionsNum : 0,
        holdUntilSessionId:
          holdType === "until_session" ? holdUntilSessionId : null,
        reason,
        shiftSessions,
      };

      const res = await fetch(`/api/groups/${groupId}/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(tr("groups.hold.success"));
        onSaved?.();
        onClose?.();
      } else {
        toast.error(json.error || tr("groups.hold.failed"));
      }
    } catch (err) {
      console.error(err);
      toast.error(tr("groups.hold.connectionError"));
    } finally {
      setSaving(false);
    }
  };

  // ── Options ──────────────────────────────────────────────────────────
  const OPTIONS = [
    {
      value: "duration",
      icon: Clock,
      title: tr("groups.hold.type.duration.title"),
      desc: tr("groups.hold.type.duration.desc"),
    },
    {
      value: "sessions",
      icon: Layers,
      title: tr("groups.hold.type.sessions.title"),
      desc: tr("groups.hold.type.sessions.desc"),
    },
    {
      value: "until_session",
      icon: Calendar,
      title: tr("groups.hold.type.untilSession.title"),
      desc: tr("groups.hold.type.untilSession.desc"),
    },
    {
      value: "indefinite",
      icon: InfinityIcon,
      title: tr("groups.hold.type.indefinite.title"),
      desc: tr("groups.hold.type.indefinite.desc"),
    },
  ];

  const consequences = [
    tr("groups.hold.effect.noMessages"),
    tr("groups.hold.effect.noCredit"),
    tr("groups.hold.effect.noAttendance"),
  ];

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div dir={isAr ? "rtl" : "ltr"} className="space-y-5">
      {/* Group + what pausing means */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 shrink-0 rounded-full grid place-items-center bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">
            <PauseCircle className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold text-gray-900 dark:text-white truncate">
              {groupName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {tr("groups.hold.pausedTitle")}
            </p>
          </div>
        </div>
        <ul className="flex flex-wrap gap-1.5 mt-3">
          {consequences.map((c) => (
            <li
              key={c}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            >
              {c}
            </li>
          ))}
        </ul>
      </div>

      {/* Hold type — radio list, selected option reveals its own control */}
      <div
        role="radiogroup"
        aria-label={tr("groups.hold.type.label")}
        className="space-y-2"
      >
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = holdType === opt.value;
          const hasControl = active && opt.value !== "indefinite";

          return (
            <div
              key={opt.value}
              className={`rounded-2xl border transition-colors ${
                active
                  ? "border-amber-400 bg-amber-50/50 dark:bg-amber-500/5"
                  : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
              }`}
            >
              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setHoldType(opt.value)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl text-start ${FOCUS}`}
              >
                <span
                  className={`w-9 h-9 shrink-0 rounded-xl grid place-items-center transition-colors ${
                    active
                      ? "bg-amber-500 text-amber-950"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                    {opt.title}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {opt.desc}
                  </span>
                </span>
                <span
                  className={`w-5 h-5 shrink-0 rounded-full border-2 grid place-items-center transition-colors ${
                    active
                      ? "border-amber-500 bg-amber-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {active && (
                    <Check
                      className="w-3 h-3 text-amber-950"
                      strokeWidth={3}
                    />
                  )}
                </span>
              </button>

              {hasControl && (
                <div className="border-t border-amber-200/70 dark:border-amber-500/15 p-3.5">
                  {/* Duration */}
                  {opt.value === "duration" && (
                    <div className="space-y-3">
                      <Stepper
                        value={holdDays}
                        onChange={setHoldDays}
                        min={1}
                        max={365}
                        unit={tr("groups.hold.unit.days")}
                        label={tr("groups.hold.daysCount")}
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {DAY_PRESETS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setHoldDays(String(d))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${FOCUS} ${
                              daysNum === d
                                ? "border-amber-400 bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-300"
                                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                            }`}
                          >
                            {d} {tr("groups.hold.unit.days")}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sessions count */}
                  {opt.value === "sessions" && (
                    <Stepper
                      value={holdSessionsCount}
                      onChange={setHoldSessionsCount}
                      min={1}
                      max={100}
                      unit={tr("groups.hold.unit.sessions")}
                      label={tr("groups.hold.sessionsCount")}
                    />
                  )}

                  {/* Until session */}
                  {opt.value === "until_session" && (
                    <div className="space-y-2">
                      {loadingSessions ? (
                        <div className="space-y-1.5" aria-busy="true">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="h-[58px] rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
                            />
                          ))}
                        </div>
                      ) : sessionsFailed ? (
                        <p className="text-sm text-red-600 dark:text-red-400 text-center py-4">
                          {tr("groups.hold.loadFailed")}
                        </p>
                      ) : sessions.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                          {tr("groups.hold.noSessions")}
                        </p>
                      ) : (
                        <div
                          role="radiogroup"
                          aria-label={tr("groups.hold.targetSession")}
                          className="max-h-60 overflow-y-auto space-y-1.5 -m-1 p-1"
                        >
                          {sessions.map((s) => (
                            <SessionRow
                              key={s._id}
                              session={s}
                              selected={holdUntilSessionId === s._id}
                              onSelect={() => setHoldUntilSessionId(s._id)}
                              isAr={isAr}
                              tr={tr}
                            />
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {tr("groups.hold.shiftNote")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reason */}
      <div>
        <label
          htmlFor="hold-reason"
          className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 block"
        >
          {tr("groups.hold.reason")}{" "}
          <span className="font-normal text-gray-400">
            ({tr("groups.hold.reasonOptional")})
          </span>
        </label>
        <textarea
          id="hold-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder={tr("groups.hold.reasonPlaceholder")}
          className={`w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 resize-none ${FOCUS}`}
        />
      </div>

      {/* Shift sessions — switch */}
      <label className="flex items-center justify-between gap-4 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-gray-900 dark:text-white">
            {tr("groups.hold.shift.title")}
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {tr("groups.hold.shift.desc")}
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={shiftSessions}
          onChange={(e) => setShiftSessions(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={`relative shrink-0 w-11 h-6 rounded-full bg-gray-300 dark:bg-gray-700 peer-checked:bg-amber-500 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-gray-900 transition-colors after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform ${
            isAr
              ? "peer-checked:after:-translate-x-5"
              : "peer-checked:after:translate-x-5"
          }`}
        />
      </label>

      {/* Summary + actions */}
      <div className="space-y-3 pt-1">
        <p
          aria-live="polite"
          className="text-sm text-gray-700 dark:text-gray-300 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 px-3.5 py-2.5"
        >
          {summary}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={`flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors ${FOCUS}`}
          >
            {t("common.cancel") || (isAr ? "إلغاء" : "Cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !isValid}
            className={`flex-[1.4] py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-sm disabled:opacity-40 disabled:hover:bg-amber-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 ${FOCUS}`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {tr("groups.hold.activating")}
              </>
            ) : (
              <>
                <PauseCircle className="w-4 h-4" />
                {tr("groups.hold.activate")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}