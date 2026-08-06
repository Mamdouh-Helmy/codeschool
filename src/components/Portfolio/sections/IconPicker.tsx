"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import * as simpleIcons from "simple-icons";
import { Search, X } from "lucide-react";
import SkillIcon from "./SkillIcon";

// نجهز index خفيف مرة واحدة بس: [{slug, title}]
const ALL_ICONS = Object.values(simpleIcons)
  .filter((i: any) => i?.slug && i?.title)
  .map((i: any) => ({ slug: i.slug, title: i.title }));

interface IconPickerProps {
  value: string;
  onChange: (slug: string) => void;
}

export default function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_ICONS.slice(0, 60);
    return ALL_ICONS.filter(
      (i) => i.title.toLowerCase().includes(q) || i.slug.includes(q)
    ).slice(0, 100);
  }, [query]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-14 h-14 rounded-lg border border-gray-200 dark:border-dark_border flex items-center justify-center hover:border-primary transition-colors bg-white dark:bg-dark_input"
      >
        {value ? <SkillIcon name={value} size={24} /> : <Search size={18} className="text-gray-400" />}
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-72 max-h-80 bg-white dark:bg-darkmode border border-gray-200 dark:border-dark_border rounded-xl shadow-xl p-3 flex flex-col gap-2">
          <div className="pf-wrap">
            <div className="pf-surface flex items-center gap-2 px-2">
              <Search size={14} className="text-gray-400 flex-shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="دور على تقنية... React, Node, Docker"
                className="pf-input py-2"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")}>
                  <X size={14} className="text-gray-400" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-6 gap-1 overflow-y-auto pr-1" style={{ maxHeight: 220 }}>
            {filtered.map((i) => (
              <button
                key={i.slug}
                type="button"
                title={i.title}
                onClick={() => {
                  onChange(i.slug);
                  setOpen(false);
                  setQuery("");
                }}
                className={`w-10 h-10 rounded-lg flex items-center justify-center hover:bg-primary/10 transition-colors ${
                  value === i.slug ? "bg-primary/15 ring-1 ring-primary" : ""
                }`}
              >
                <SkillIcon name={i.slug} size={18} />
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-6 text-center text-xs text-gray-400 py-4">مفيش نتايج</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}