// components/admin/MeetingLinksCheckModal.jsx
"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, MapPin, ExternalLink, Info, AlertTriangle, Check } from "lucide-react";
import toast from "react-hot-toast";

// ── Shared building blocks ──────────────────────────────────────────────

// Overlay بيتعمل render في document.body عشان يملا الشاشة طول وعرض
// بغض النظر عن أي transform / filter / z-index في الـ layout بتاع الأدمن
function ModalOverlay({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // منع سكرول الصفحة اللي ورا المودال
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex h-[100dvh] w-screen items-center justify-center bg-black/50 p-4">
      {children}
    </div>,
    document.body,
  );
}

function ModalHeader({ eyebrow, title, onClose }) {
  return (
    <div className="flex items-start justify-between gap-4 bg-secondary px-6 py-5">
      <div>
        <p className="text-[11px] font-medium text-white/55">{eyebrow}</p>
        <h2 className="mt-1 text-base font-bold text-white">{title}</h2>
      </div>
      <button
        onClick={onClose}
        className="rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function StatBlock({ value, label, tone = "default" }) {
  const toneClass = {
    default: "text-gray-800 dark:text-gray-100",
    accent: "text-secondary dark:text-teal-300",
    warn: "text-amber-700 dark:text-amber-300",
    muted: "text-gray-300 dark:text-gray-600",
  }[tone];
  return (
    <div className="flex flex-col items-center gap-0.5 px-2 py-3.5">
      <span className={`text-xl font-bold tabular-nums ${toneClass}`}>{value}</span>
      <span className="text-[11px] text-gray-400">{label}</span>
    </div>
  );
}

function LinkSection({ label, children }) {
  return (
    <div className="pt-4 first:pt-3">
      <p className="px-6 pb-1.5 text-[11px] font-medium text-gray-400">{label}</p>
      <div>{children}</div>
    </div>
  );
}

function LinkRow({ link, status, selected, onToggle }) {
  const idStr = (link._id || link.id)?.toString();
  const isReserved = status === "reserved";
  const isPreselected = status === "preselected";

  const inner = (
    <>
      <span
        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 peer-focus-visible:ring-offset-1 ${
          isReserved
            ? "border-amber-brand/50 bg-amber-brand/10"
            : selected
            ? "border-primary bg-primary"
            : "border-gray-300 dark:border-dark_border"
        }`}
      >
        {selected && !isReserved && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
            {link.name}
          </span>
          {isPreselected && (
            <span className="flex-shrink-0 rounded-full bg-orange-coral/10 px-2 py-0.5 text-[10px] font-semibold text-orange-coral">
              مُقترح
            </span>
          )}
        </span>
        <span className="mt-1 flex items-center gap-2">
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-dark_input dark:text-gray-400">
            {link.platform}
          </span>
          <span className="truncate font-mono text-[11px] text-gray-400">{link.link}</span>
        </span>
      </span>

      {isReserved && (
        <span className="flex-shrink-0 text-end text-[11px]">
          <span className="block font-semibold text-amber-700 dark:text-amber-300">محجوز</span>
          <span className="mt-0.5 block text-gray-400">
            {(link.reservedDays || []).join("، ")}
          </span>
        </span>
      )}
    </>
  );

  if (isReserved) {
    return (
      <div className="flex cursor-not-allowed items-center gap-3 px-6 py-3 opacity-70">
        {inner}
      </div>
    );
  }

  return (
    <label className="flex cursor-pointer items-center gap-3 px-6 py-3 transition hover:bg-gray-50 dark:hover:bg-dark_input/60">
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(idStr)}
        className="peer sr-only"
      />
      {inner}
    </label>
  );
}

function ToggleRow({ checked, onChange, title, description }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 px-6 py-3">
      <span>
        <span className="block text-xs font-medium text-gray-700 dark:text-gray-200">
          {title}
        </span>
        {description && (
          <span className="mt-0.5 block text-[11px] text-gray-400">{description}</span>
        )}
      </span>
      <span className="relative inline-flex h-5 w-9 flex-shrink-0 items-center">
        <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
        <span className="absolute inset-0 rounded-full bg-gray-200 transition-colors peer-checked:bg-primary dark:bg-dark_border" />
        <span
          className={`absolute start-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4 rtl:-translate-x-4" : ""
          }`}
        />
      </span>
    </label>
  );
}

// ── Main component ───────────────────────────────────────────────────────

export default function MeetingLinksCheckModal({ isOpen, groupId, onClose, onConfirm }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedLinks, setSelectedLinks] = useState([]);
  const [forceActivate, setForceActivate] = useState(false);
  const [releaseReserved, setReleaseReserved] = useState(false);

  // ── Fetch preview ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !groupId) return;

    const fetchPreview = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/groups/${groupId}/activate`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        const json = await res.json();
        if (json.success) {
          setData(json.data);

          // لو فيه لينكات مختارة مسبقًا من فورم الحصة التعويضية → اختارها تلقائيًا
          if (json.data.preselectedLinkIds?.length > 0) {
            setSelectedLinks(
              json.data.preselectedLinkIds.map((lid) => lid.toString()),
            );
          }
        } else {
          toast.error(json.error || "فشل تحميل البيانات");
        }
      } catch (err) {
        console.error("Fetch preview error:", err);
        toast.error("خطأ في الاتصال");
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [isOpen, groupId]);

  // ── Reset on close ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setSelectedLinks([]);
      setForceActivate(false);
      setReleaseReserved(false);
    }
  }, [isOpen]);

  const toggleLink = (linkId) => {
    const idStr = linkId?.toString();
    setSelectedLinks((prev) =>
      prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr],
    );
  };

  const handleConfirm = () => {
    if (data?.isOffline) {
      onConfirm(false, false, [], []);
      return;
    }

    if (!forceActivate && selectedLinks.length === 0) {
      toast.error("اختر لينك واحد على الأقل أو فعّل الخيار المتقدم");
      return;
    }

    const availableLinks = [
      ...(data?.preselectedLinks || []),
      ...(data?.availableLinks || []),
    ];
    onConfirm(forceActivate, releaseReserved, selectedLinks, availableLinks);
  };

  if (!isOpen) return null;

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <ModalOverlay>
        <div className="w-full max-w-sm rounded-xl bg-white px-8 py-10 text-center shadow-xl dark:bg-darklight">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
          <p className="mt-4 text-sm text-gray-400">جاري فحص الجدول واللينكات...</p>
        </div>
      </ModalOverlay>
    );
  }

  if (!data) return null;

  // ═════════════════════════════════════════════════════════════════════
  // OFFLINE
  // ═════════════════════════════════════════════════════════════════════
  if (data.isOffline) {
    const loc = data.locationInfo || {};
    const hasMaps = !!loc.mapsLink;

    return (
      <ModalOverlay>
        <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl dark:bg-darklight">
          <ModalHeader eyebrow="تفعيل جروب" title="جروب حضوري (أوفلاين)" onClose={onClose} />

          <div className="space-y-5 px-6 py-5">
            <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              مفيش لينكات لهذا الجروب — الطلاب والمدرس هيستقبلوا اسم المكان والعنوان ولينك
              الخريطة بدل لينك الاجتماع.
            </p>

            <div className="overflow-hidden rounded-lg border border-gray-100 dark:border-dark_border">
              <div className="flex items-start gap-3 border-b border-gray-100 px-4 py-3 dark:border-dark_border">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-secondary dark:text-teal-300" />
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400">المكان</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    {loc.placeName || "— غير محدد —"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 px-4 py-3">
                <span className="h-4 w-4 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-gray-400">العنوان</p>
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    {loc.address || "— غير محدد —"}
                  </p>
                  {hasMaps && (
                    <a
                      href={loc.mapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      فتح على الخريطة
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>عدد السيشنات المتوقع توليدها</span>
              <span className="text-base font-bold tabular-nums text-gray-800 dark:text-gray-100">
                {data.totalSessions}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 dark:border-dark_border">
            <button
              onClick={onClose}
              className="rounded text-sm font-medium text-gray-500 transition hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:text-gray-400 dark:hover:text-gray-200"
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirm}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              تفعيل الجروب
            </button>
          </div>
        </div>
      </ModalOverlay>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // ONLINE
  // ═════════════════════════════════════════════════════════════════════
  const {
    totalSessions,
    availableLinksCount,
    reservedLinksCount,
    hasNoLinks,
    hasAvailableLinks,
    availableLinks = [],
    reservedLinks = [],
    preselectedLinks = [],
    isMakeupGroup = false,
  } = data;

  const canProceed = forceActivate || selectedLinks.length > 0;

  return (
    <ModalOverlay>
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-darklight">
        <ModalHeader
          eyebrow={isMakeupGroup ? "حصة تعويضية" : "تفعيل جروب"}
          title={isMakeupGroup ? "اختيار لينك الحصة التعويضية" : "فحص لينكات الاجتماع"}
          onClose={onClose}
        />

        <div className="grid grid-cols-3 divide-x divide-gray-100 rtl:divide-x-reverse border-b border-gray-100 dark:divide-dark_border dark:border-dark_border">
          <StatBlock value={totalSessions} label="سيشن متوقع" />
          <StatBlock
            value={availableLinksCount + preselectedLinks.length}
            label="لينك متاح"
            tone="accent"
          />
          <StatBlock
            value={reservedLinksCount}
            label="محجوز"
            tone={reservedLinksCount > 0 ? "warn" : "muted"}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {hasNoLinks && (
            <div className="mx-6 mt-4 flex gap-3 border-s-4 border-rose-400 bg-rose-50/60 px-4 py-3 text-xs leading-relaxed text-rose-700 dark:bg-rose-900/10 dark:text-rose-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>
                مفيش أي لينك في النظام. السيشنات هتتولد من غير لينكات — تقدر تضيف لينكات وتعيد
                التفعيل بعدين.
              </p>
            </div>
          )}

          {!hasNoLinks && !hasAvailableLinks && preselectedLinks.length === 0 && (
            <div className="mx-6 mt-4 flex gap-3 border-s-4 border-amber-brand bg-amber-50/60 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-900/10 dark:text-amber-300">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>
                كل اللينكات متعارضة مع الجدول. فك الحجز عن اللينكات المتعارضة تحت، أو فعّل
                الجروب من غير لينكات.
              </p>
            </div>
          )}

          {preselectedLinks.length > 0 && (
            <LinkSection label="مُقترحة تلقائيًا">
              {preselectedLinks.map((link) => {
                const idStr = (link._id || link.id)?.toString();
                return (
                  <LinkRow
                    key={idStr}
                    link={link}
                    status="preselected"
                    selected={selectedLinks.includes(idStr)}
                    onToggle={toggleLink}
                  />
                );
              })}
            </LinkSection>
          )}

          {availableLinks.length > 0 && (
            <LinkSection label="متاحة">
              {availableLinks.map((link) => {
                const idStr = (link._id || link.id)?.toString();
                return (
                  <LinkRow
                    key={idStr}
                    link={link}
                    status="available"
                    selected={selectedLinks.includes(idStr)}
                    onToggle={toggleLink}
                  />
                );
              })}
            </LinkSection>
          )}

          {reservedLinks.length > 0 && (
            <LinkSection label="محجوزة">
              {reservedLinks.map((link) => (
                <LinkRow key={link.id} link={link} status="reserved" />
              ))}
            </LinkSection>
          )}

          <div className="mt-2 divide-y divide-gray-100 border-t border-gray-100 dark:divide-dark_border dark:border-dark_border">
            <ToggleRow
              checked={releaseReserved}
              onChange={(e) => setReleaseReserved(e.target.checked)}
              title="فك الحجز عن اللينكات المتعارضة"
              description="تلقائيًا قبل التفعيل"
            />
            <ToggleRow
              checked={forceActivate}
              onChange={(e) => setForceActivate(e.target.checked)}
              title="تفعيل من غير لينكات"
              description="السيشنات هتتولد من غير لينك اجتماع"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 dark:border-dark_border">
          <button
            onClick={onClose}
            className="rounded text-sm font-medium text-gray-500 transition hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:text-gray-400 dark:hover:text-gray-200"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canProceed}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30"
          >
            تفعيل الجروب
            {selectedLinks.length > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[11px] tabular-nums">
                {selectedLinks.length}
              </span>
            )}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}