// components/admin/InstancePicker.jsx
"use client";
import React, { useState } from "react";
import { CaretDown, DeviceMobile, SlidersHorizontal } from "@phosphor-icons/react";

export const INSTANCE_META = {
  main: {
    label: "الرئيسي",
    grad: "from-sky-500 to-cyan-400",
    soft: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    border: "border-sky-500/50 bg-sky-500/5 ring-1 ring-sky-500/30",
  },
  eval: {
    label: "التقييم",
    grad: "from-violet-500 to-fuchsia-400",
    soft: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    border: "border-violet-500/50 bg-violet-500/5 ring-1 ring-violet-500/30",
  },
  unknown: {
    label: "غير معروف",
    grad: "from-slate-400 to-slate-500",
    soft: "bg-gray-500/10 text-gray-600 dark:text-gray-300",
    border: "border-gray-400/50",
  },
};

const TYPE_LABEL = { student: "الطلبة", guardian: "أولياء الأمور", instructor: "المدرسين" };
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

const isConfigured = (instances, key) => {
  if (!instances?.length) return true; // لو الداتا لسه ماجتش
  return instances.find((i) => i.key === key)?.configured !== false;
};

export default function InstancePicker({
  instances = [],
  value,
  onChange,
  byType,
  onByTypeChange,
  activeTypes = [],
}) {
  const [open, setOpen] = useState(false);
  const customCount = Object.values(byType).filter(Boolean).length;

  const setType = (type, key) => {
    const next = { ...byType };
    if (key) next[type] = key;
    else delete next[type];
    onByTypeChange(next);
  };

  return (
    <div className="space-y-2.5 rounded-2xl border border-PowderBlueBorder bg-white p-3 dark:border-dark_border dark:bg-darklight">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <DeviceMobile size={16} weight="duotone" />
        </span>
        <p className="text-xs font-bold text-MidnightNavyText dark:text-white">يبعت من أنهي رقم؟</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {["main", "eval"].map((key) => {
          const meta = INSTANCE_META[key];
          const info = instances.find((i) => i.key === key);
          const ok = isConfigured(instances, key);
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              disabled={!ok}
              aria-pressed={active}
              onClick={() => onChange(key)}
              className={`relative rounded-xl border p-2.5 text-start transition-all disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS} ${
                active
                  ? meta.border
                  : "border-PowderBlueBorder bg-white hover:border-primary/40 dark:border-dark_border dark:bg-dark_input"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`} />
                <span className="text-xs font-bold text-MidnightNavyText dark:text-white">{info?.label || meta.label}</span>
              </div>
              <p className="mt-1 text-[10px] text-gray-400" dir="ltr">
                {ok ? info?.idHint || "—" : "مش متضبط"}
              </p>
            </button>
          );
        })}
      </div>

      {activeTypes.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-[11px] font-semibold text-gray-500 hover:text-primary ${FOCUS}`}
          >
            <SlidersHorizontal size={13} weight="bold" />
            تخصيص لكل فئة
            {customCount > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">{customCount}</span>
            )}
            <CaretDown size={14} weight="bold" className={`ms-auto transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div className="space-y-1.5">
              {activeTypes.map((type) => (
                <div
                  key={type}
                  className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-inset ring-PowderBlueBorder dark:bg-dark_input dark:ring-dark_border"
                >
                  <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-200">
                    {TYPE_LABEL[type] || type}
                  </span>
                  <div className="inline-flex rounded-lg bg-PaleSkyBlu p-0.5 dark:bg-darkmode">
                    {[
                      { id: "", label: "افتراضي" },
                      { id: "main", label: "الرئيسي" },
                      { id: "eval", label: "التقييم" },
                    ].map((o) => {
                      const on = (byType[type] || "") === o.id;
                      const disabled = o.id && !isConfigured(instances, o.id);
                      return (
                        <button
                          key={o.id || "default"}
                          type="button"
                          disabled={disabled}
                          onClick={() => setType(type, o.id)}
                          className={`rounded-md px-2 py-1 text-[10px] font-bold transition disabled:opacity-30 ${FOCUS} ${
                            on
                              ? "bg-white text-MidnightNavyText shadow-sm dark:bg-gray-600 dark:text-white"
                              : "text-gray-500"
                          }`}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}