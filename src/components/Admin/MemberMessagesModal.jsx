// components/admin/MemberMessagesModal.jsx
"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CheckCheck,
  Clock,
  Copy,
  GraduationCap,
  Info,
  Loader2,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Send,
  UserCheck,
  Users,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import {
  GENDER_INLINE_EXAMPLE,
  MAX_MESSAGE_LENGTH,
  RECIPIENT_TYPE,
  VARIABLES,
  VARIABLE_CATEGORIES,
  composeMessage,
  findInapplicableVariables,
  findUnknownVariables,
  getVariableSupport,
  isVariableApplicable,
} from "@/utils/groupMessageShared";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_META = {
  [RECIPIENT_TYPE.STUDENT]: {
    label: "الطالب",
    grad: "from-sky-500 to-cyan-400",
    soft: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    Icon: GraduationCap,
  },
  [RECIPIENT_TYPE.GUARDIAN]: {
    label: "ولي الأمر",
    grad: "from-violet-500 to-fuchsia-400",
    soft: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    Icon: Users,
  },
  [RECIPIENT_TYPE.INSTRUCTOR]: {
    label: "المدرس",
    grad: "from-amber-500 to-orange-400",
    soft: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    Icon: UserCheck,
  },
};

const EMPTY_OVERRIDES = {
  student: { ar: "", en: "" },
  guardian: { ar: "", en: "" },
  instructor: { ar: "", en: "" },
};

const LANG_OPTIONS = [
  { id: "auto", label: "تلقائي (لغة المستلم)" },
  { id: "ar", label: "🇸🇦 عربي" },
  { id: "en", label: "🇬🇧 English" },
];

const INPUT =
  "w-full px-3 py-2 text-sm border border-gray-200 dark:border-dark_border rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all bg-white dark:bg-dark_input dark:text-white";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_RULES = [
  [/^custom$|^group_custom_message$/, "رسالة مخصصة"],
  [/reminder_24h/, "تذكير قبل 24 ساعة"],
  [/reminder_15min|reminder_1h/, "تذكير قبل 15 دقيقة"],
  [/reminder_30min/, "تذكير قبل 30 دقيقة"],
  [/pre_attendance/, "تأكيد الحضور"],
  [/absence/, "إشعار غياب"],
  [/late_notification/, "إشعار تأخير"],
  [/excused/, "غياب بعذر"],
  [/evaluation/, "تقرير / تقييم"],
  [/credit/, "تنبيه رصيد"],
  [/welcome|language_selection|language_confirmation/, "ترحيب / اللغة"],
  [/cancelled/, "إلغاء حصة"],
  [/postponed/, "تأجيل حصة"],
  [/completion/, "إتمام الكورس"],
  [/makeup/, "حصة تعويضية"],
  [/module_overview/, "نظرة على الموديول"],
  [/recording/, "تسجيل الحصة"],
  [/supervisor/, "تعريف بالمشرف"],
];

const typeLabel = (type) => {
  const hit = TYPE_RULES.find(([re]) => re.test(String(type || "")));
  return hit ? hit[1] : String(type || "رسالة");
};

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("ar-EG-u-nu-latn", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Cairo",
    });
  } catch {
    return "—";
  }
};

const langChip = (l) => (l === "en" ? "EN" : l === "bilingual" ? "عربي + EN" : "عربي");
const recipientName = (r) => r.names?.[r.language] || r.fullName || "—";

// ─── Small pieces ─────────────────────────────────────────────────────────────

function Avatar({ role, name, size = "h-9 w-9" }) {
  const meta = ROLE_META[role] || ROLE_META.student;
  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-sm ${meta.grad}`}
    >
      {(name || "?").charAt(0)}
    </span>
  );
}

function StatusIcon({ status }) {
  if (status === "failed") return <XCircle className="h-3.5 w-3.5 text-rose-500" />;
  if (status === "pending") return <Clock className="h-3.5 w-3.5 text-amber-500" />;
  return <CheckCheck className="h-3.5 w-3.5 text-sky-500" />;
}

function HistoryItem({ item, onResend, showRole }) {
  const [open, setOpen] = useState(false);
  const meta = ROLE_META[item.role] || ROLE_META.student;
  const long = item.content.length > 220 || item.content.split("\n").length > 5;
  const isRtl = item.language !== "en";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.content);
      toast.success("اتنسخت");
    } catch {
      toast.error("مقدرتش أنسخ");
    }
  };

  return (
    <li className="rounded-2xl border border-gray-100 bg-white p-3 dark:border-dark_border dark:bg-darklight">
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        {showRole && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${meta.soft}`}>
            <meta.Icon className="h-3 w-3" />
            {meta.label}
          </span>
        )}
        <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-600 dark:bg-dark_input dark:text-gray-300">
          {typeLabel(item.type)}
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500 dark:bg-dark_input dark:text-gray-400">
          {langChip(item.language)}
        </span>
        {item.number && (
          <span dir="ltr" className="text-gray-400">
            {item.number}
          </span>
        )}
        <span className="mr-auto flex items-center gap-1 text-gray-400">
          <StatusIcon status={item.status} />
          {fmtDate(item.sentAt)}
        </span>
      </div>

      <div
        dir={isRtl ? "rtl" : "ltr"}
        className={`rounded-xl bg-[#efeae2]/60 px-3 py-2 text-[13px] leading-relaxed text-[#111b21] dark:bg-[#0b141a] dark:text-[#e9edef] ${
          !open && long ? "max-h-28 overflow-hidden" : ""
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{item.content || "—"}</p>
      </div>

      {item.status === "failed" && item.error && (
        <p className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-300">سبب الفشل: {item.error}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {long && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 ${FOCUS}`}
          >
            {open ? "إخفاء" : "عرض الكل"}
          </button>
        )}
        <button
          type="button"
          onClick={copy}
          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-dark_input ${FOCUS}`}
        >
          <Copy className="h-3 w-3" /> نسخ
        </button>
        <button
          type="button"
          onClick={() => onResend(item)}
          disabled={!item.content}
          className={`mr-auto inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary transition hover:bg-primary/15 disabled:opacity-40 ${FOCUS}`}
        >
          <RotateCcw className="h-3 w-3" /> إعادة إرسال
        </button>
      </div>
    </li>
  );
}

function PhonePreview({ recipient, preview }) {
  const dir = !preview || preview.language !== "en" ? "rtl" : "ltr";
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-dark_border">
      <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2 text-white dark:bg-[#202c33]">
        {recipient ? (
          <Avatar role={recipient.type} name={recipientName(recipient)} size="h-7 w-7" />
        ) : (
          <span className="h-7 w-7 rounded-full bg-white/20" />
        )}
        <p className="truncate text-xs font-bold">{recipient ? recipientName(recipient) : "—"}</p>
      </div>
      <div
        className="min-h-[96px] bg-[#efeae2] p-3 dark:bg-[#0b141a]"
        style={{ backgroundImage: "radial-gradient(rgba(120,120,120,0.12) 1px, transparent 1px)", backgroundSize: "16px 16px" }}
      >
        {preview ? (
          <div
            dir={dir}
            className="max-w-[94%] rounded-xl bg-white px-3 py-2 text-[13px] leading-relaxed text-[#111b21] shadow-sm dark:bg-[#005c4b] dark:text-[#e9edef]"
          >
            <p className="whitespace-pre-wrap break-words">{preview.text}</p>
          </div>
        ) : (
          <p className="py-6 text-center text-xs text-gray-500">اكتب الرسالة عشان تظهر المعاينة</p>
        )}
      </div>
    </div>
  );
}

function Notice({ tone = "amber", children }) {
  const tones = {
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200",
    rose: "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200",
    sky: "border-sky-500/25 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  };
  const Icon = tone === "sky" ? Info : AlertTriangle;
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-relaxed ${tones[tone]}`}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * kind: "student" | "instructor"
 * memberId: studentId أو userId للمدرس
 */
export default function MemberMessagesModal({ groupId, kind, memberId, memberName, onClose }) {
  const [state, setState] = useState({ loading: true, error: null, group: null, recipients: [], messages: [], total: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [scope, setScope] = useState("group"); // group | all
  const [roleFilter, setRoleFilter] = useState("all");

  const [recipientKey, setRecipientKey] = useState("");
  const [lang, setLang] = useState("auto");
  const [text, setText] = useState("");
  const [raw, setRaw] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  const composerRef = useRef(null);
  const textareaRef = useRef(null);
  const firstLoad = useRef(true);

  const load = useCallback(
    async (nextScope) => {
      if (firstLoad.current) setState((s) => ({ ...s, loading: true }));
      else setRefreshing(true);
      try {
        const qs = new URLSearchParams({ kind, id: memberId, scope: nextScope });
        const res = await fetch(`/api/groups/${groupId}/member-messages?${qs}`, { cache: "no-store" });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "فشل تحميل الرسائل");
        setState({
          loading: false,
          error: null,
          group: json.data.group,
          recipients: json.data.recipients,
          messages: json.data.messages,
          total: json.data.totalMessages,
        });
        setRecipientKey((cur) => cur || json.data.recipients.find((r) => r.hasPhone)?.key || json.data.recipients[0]?.key || "");
      } catch (err) {
        setState((s) => ({ ...s, loading: false, error: err.message }));
      } finally {
        firstLoad.current = false;
        setRefreshing(false);
      }
    },
    [groupId, kind, memberId],
  );

  useEffect(() => {
    load(scope);
  }, [load, scope]);

  const { group, recipients, messages } = state;
  const hasGuardian = recipients.some((r) => r.type === RECIPIENT_TYPE.GUARDIAN);

  const recipient = recipients.find((r) => r.key === recipientKey) || null;
  const effectiveLang = recipient ? (lang === "auto" ? recipient.language : lang) : "ar";

  const visibleMessages = useMemo(
    () => (roleFilter === "all" ? messages : messages.filter((m) => m.role === roleFilter)),
    [messages, roleFilter],
  );

  const templates = useMemo(
    () => ({ contentAr: text, contentEn: text, overrides: EMPTY_OVERRIDES }),
    [text],
  );

  const preview = useMemo(() => {
    if (!recipient || !group || !text.trim()) return null;
    if (raw) return { text, language: effectiveLang };
    try {
      return composeMessage({ ...recipient, language: effectiveLang }, group, templates);
    } catch {
      return null;
    }
  }, [recipient, group, text, raw, effectiveLang, templates]);

  const unknownVars = useMemo(() => (raw ? [] : findUnknownVariables(text)), [raw, text]);
  const inapplicableVars = useMemo(
    () => (raw || !group ? [] : findInapplicableVariables(text, group)),
    [raw, text, group],
  );

  const canSend =
    !!recipient?.hasPhone && !!text.trim() && unknownVars.length === 0 && inapplicableVars.length === 0 && !sending;

  const sections = useMemo(() => {
    if (!group || !recipient) return [];
    return VARIABLE_CATEGORIES.map((cat) => ({
      cat,
      items: VARIABLES.filter((v) => v.category === cat.id && isVariableApplicable(v, group)).filter(
        (v) => getVariableSupport(v, [recipient.type]) !== "none",
      ),
    })).filter((s) => s.items.length);
  }, [group, recipient]);

  const insertText = (snippet) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? start;
    setRaw(false); // إدراج متغير = رسالة قالب
    setText(text.slice(0, start) + snippet + text.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  };

  const handleResend = (item) => {
    const target = recipients.find((r) => r.type === item.role) || recipients[0];
    if (target) setRecipientKey(target.key);
    setText(item.content);
    setRaw(true);
    setLang("auto");
    setConfirming(false);
    toast("اتحطت الرسالة في المحرر — راجعها وابعتها", { icon: "✏️" });
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSend = async () => {
    setConfirming(false);
    setSending(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/member-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientKey, content: text, language: lang, raw }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل الإرسال");
      toast.success(`اتبعتت لـ ${json.data.name || recipientName(recipient)}`);
      setText("");
      setRaw(false);
      await load(scope);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const kindMeta = ROLE_META[kind === "instructor" ? RECIPIENT_TYPE.INSTRUCTOR : RECIPIENT_TYPE.STUDENT];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-darkmode/60 p-3 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !sending && onClose()}
    >
      <div
        dir="rtl"
        className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 shadow-2xl dark:border-dark_border dark:bg-darkmode"
      >
        {/* header */}
        <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-5 py-3.5 dark:border-dark_border dark:bg-darklight">
          <Avatar role={kind === "instructor" ? RECIPIENT_TYPE.INSTRUCTOR : RECIPIENT_TYPE.STUDENT} name={memberName} size="h-10 w-10" />
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-2 truncate text-base font-black text-gray-900 dark:text-white">
              <MessageSquare className="h-4 w-4 text-primary" />
              رسائل {memberName}
            </h3>
            <p className="text-[11px] text-gray-500">
              <span className={`rounded-full px-2 py-0.5 font-semibold ${kindMeta.soft}`}>{kindMeta.label}</span>
              {group && <span className="mr-2">{group.name}</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={() => load(scope)}
            disabled={refreshing}
            title="تحديث"
            className={`rounded-xl p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark_input ${FOCUS}`}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className={`rounded-xl p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark_input ${FOCUS}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {state.loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-gray-400">جاري تحميل الرسائل…</p>
          </div>
        ) : state.error ? (
          <p className="flex-1 p-10 text-center text-sm text-rose-600">{state.error}</p>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_400px]">
            {/* ── History ── */}
            <section className="flex min-h-0 flex-col rounded-2xl border border-gray-100 bg-white dark:border-dark_border dark:bg-darkmode">
              <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-3 dark:border-dark_border">
                <h4 className="text-sm font-black text-gray-900 dark:text-white">
                  السجل <span className="text-xs font-medium text-gray-400">({visibleMessages.length})</span>
                </h4>

                <div className="mr-auto inline-flex rounded-xl bg-gray-100 p-0.5 dark:bg-dark_input">
                  {[
                    ["group", "الجروب ده"],
                    ["all", "كل الرسائل"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setScope(id)}
                      className={`rounded-[10px] px-3 py-1 text-[11px] font-bold transition ${FOCUS} ${
                        scope === id ? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white" : "text-gray-500"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {kind === "student" && hasGuardian && (
                  <div className="inline-flex rounded-xl bg-gray-100 p-0.5 dark:bg-dark_input">
                    {[
                      ["all", "الكل"],
                      [RECIPIENT_TYPE.STUDENT, "الطالب"],
                      [RECIPIENT_TYPE.GUARDIAN, "ولي الأمر"],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setRoleFilter(id)}
                        className={`rounded-[10px] px-3 py-1 text-[11px] font-bold transition ${FOCUS} ${
                          roleFilter === id ? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white" : "text-gray-500"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {visibleMessages.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-16 text-center">
                    <MessageSquare className="h-9 w-9 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm text-gray-400">مفيش رسائل {scope === "group" ? "للجروب ده" : ""} لحد دلوقتي</p>
                    {scope === "group" && (
                      <button
                        type="button"
                        onClick={() => setScope("all")}
                        className={`text-xs font-bold text-primary hover:underline ${FOCUS}`}
                      >
                        اعرض كل رسائله
                      </button>
                    )}
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {visibleMessages.map((m) => (
                      <HistoryItem key={m.id} item={m} onResend={handleResend} showRole={kind === "student" && hasGuardian} />
                    ))}
                  </ul>
                )}
                {state.total > state.messages.length && (
                  <p className="pt-3 text-center text-[11px] text-gray-400">
                    معروض آخر {state.messages.length} رسالة من {state.total}
                  </p>
                )}
              </div>
            </section>

            {/* ── Composer ── */}
            <aside ref={composerRef} className="min-h-0 space-y-3 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-4 dark:border-dark_border dark:bg-darkmode">
              <h4 className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
                <Send className="h-4 w-4 text-primary" /> رسالة جديدة
              </h4>

              {/* recipient */}
              <div>
                <p className="mb-1.5 text-[11px] font-bold text-gray-500">إلى</p>
                <div className="grid gap-1.5">
                  {recipients.map((r) => {
                    const meta = ROLE_META[r.type];
                    const active = r.key === recipientKey;
                    return (
                      <button
                        key={r.key}
                        type="button"
                        disabled={!r.hasPhone}
                        onClick={() => setRecipientKey(r.key)}
                        className={`flex items-center gap-2.5 rounded-xl border p-2 text-right transition disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS} ${
                          active
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-gray-200 hover:border-primary/40 dark:border-dark_border"
                        }`}
                      >
                        <Avatar role={r.type} name={recipientName(r)} size="h-8 w-8" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold text-gray-900 dark:text-white">{recipientName(r)}</span>
                          <span className="block text-[10px] text-gray-500">
                            {meta.label} · {r.language === "en" ? "English" : "عربي"}
                          </span>
                        </span>
                        {r.hasPhone ? (
                          <span dir="ltr" className="text-[10px] text-gray-400">
                            {r.phoneHint}
                          </span>
                        ) : (
                          <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600">بدون رقم</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* language */}
              <div>
                <p className="mb-1.5 text-[11px] font-bold text-gray-500">لغة الرسالة</p>
                <div className="inline-flex w-full rounded-xl bg-gray-100 p-0.5 dark:bg-dark_input">
                  {LANG_OPTIONS.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setLang(o.id)}
                      className={`flex-1 rounded-[10px] px-2 py-1.5 text-[11px] font-bold transition ${FOCUS} ${
                        lang === o.id ? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white" : "text-gray-500"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-gray-400">
                  اللغة بتحدد التحية والاسم وعنوان الابن/الابنة، مش بتترجم النص.
                </p>
              </div>

              {/* editor */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[11px] font-bold text-gray-500">النص</p>
                  <span className="text-[10px] tabular-nums text-gray-400">
                    {text.length}/{MAX_MESSAGE_LENGTH}
                  </span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  dir={effectiveLang === "ar" ? "rtl" : "ltr"}
                  maxLength={MAX_MESSAGE_LENGTH}
                  placeholder={
                    effectiveLang === "ar"
                      ? "اكتب الرسالة هنا… واستخدم المتغيرات زي {salutation}"
                      : "Write the message here… use variables like {salutation}"
                  }
                  className={`${INPUT} h-40 resize-y leading-7`}
                />
                <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-[11px] text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={raw}
                    onChange={(e) => setRaw(e.target.checked)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  إرسال النص كما هو (من غير تعويض المتغيرات)
                </label>
              </div>

              {unknownVars.length > 0 && (
                <Notice tone="rose">
                  متغيرات غير معروفة: <span dir="ltr" className="font-mono">{unknownVars.join(" ")}</span>
                </Notice>
              )}
              {inapplicableVars.length > 0 && (
                <Notice tone="rose">
                  متغيرات مش مناسبة لنوع الجروب: <span dir="ltr" className="font-mono">{inapplicableVars.join(" ")}</span>
                </Notice>
              )}
              {raw && text.trim() && (
                <Notice tone="sky">
                  النص هيتبعت بالظبط زي ما هو. لو بتبعته لشخص تاني (مثلًا من الطالب لولي الأمر) راجع التحية والأسماء.
                </Notice>
              )}

              {/* variables */}
              {!raw && sections.length > 0 && (
                <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-dark_border">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                    <Zap className="h-3.5 w-3.5 text-primary" /> اضغط على متغير لإدراجه
                  </p>
                  {sections.map(({ cat, items }) => (
                    <div key={cat.id} className="flex flex-wrap items-center gap-1">
                      <span className="w-full text-[10px] font-bold text-gray-400">
                        {cat.icon} {cat.label}
                      </span>
                      {items.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => insertText(`{${v.key}}`)}
                          title={`{${v.key}}`}
                          className={`inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700 transition hover:border-primary/40 hover:bg-primary/5 active:scale-95 dark:border-dark_border dark:bg-dark_input dark:text-gray-200 ${FOCUS}`}
                        >
                          <span>{v.icon}</span>
                          {v.label}
                        </button>
                      ))}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => insertText(GENDER_INLINE_EXAMPLE)}
                    title="بيختار الكلمة حسب جنس المستلم"
                    className={`inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary ${FOCUS}`}
                  >
                    ⚧ {GENDER_INLINE_EXAMPLE}
                  </button>
                </div>
              )}

              {/* preview */}
              <div>
                <p className="mb-1.5 text-[11px] font-bold text-gray-500">المعاينة (زي ما هتوصل)</p>
                <PhonePreview recipient={recipient} preview={preview} />
              </div>

              {/* send */}
              {confirming ? (
                <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    هتبعت لـ {recipient ? recipientName(recipient) : "—"} ({recipient ? ROLE_META[recipient.type].label : ""})؟
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSend}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-bold text-white ${FOCUS}`}
                    >
                      <Send className="h-3.5 w-3.5" /> أكّد الإرسال
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      className={`rounded-lg bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600 dark:bg-dark_input dark:text-gray-200 ${FOCUS}`}
                    >
                      رجوع
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={!canSend}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-orange-deep py-3 text-sm font-semibold text-white shadow-md shadow-primary/25 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? "جاري الإرسال…" : "إرسال"}
                </button>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}