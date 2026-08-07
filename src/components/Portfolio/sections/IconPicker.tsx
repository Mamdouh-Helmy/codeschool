"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import * as simpleIcons from "simple-icons";
import { Icon } from "@iconify/react";
import { Search, X, Loader2, Upload } from "lucide-react";
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
  const [remoteResults, setRemoteResults] = useState<string[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // نتايج simple-icons المحلية (فورية، من غير نت)
  const localFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_ICONS.slice(0, 60);
    return ALL_ICONS.filter(
      (i) => i.title.toLowerCase().includes(q) || i.slug.includes(q)
    ).slice(0, 60);
  }, [query]);

  // ✅ بحث موسّع عبر Iconify (+150 مكتبة أيقونات) — بيشتغل بس لو فيه query
  // ونديله فرصة يكمّل النتايج المحلية بدل ما نستنى عليه لوحده
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setRemoteResults([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setRemoteLoading(true);
      try {
        const res = await fetch(
          `https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=48`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setRemoteResults(data.icons || []);
      } catch (e) {
        if ((e as any).name !== "AbortError") setRemoteResults([]);
      } finally {
        setRemoteLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "skill-icons");
      const res = await fetch("/api/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        onChange(data.imageUrl);
        setOpen(false);
        setQuery("");
      }
    } catch (e) {
      console.error("Icon upload failed:", e);
    } finally {
      setUploading(false);
    }
  };

  const hasQuery = query.trim().length > 0;
  const noResults = hasQuery && !remoteLoading && localFiltered.length === 0 && remoteResults.length === 0;

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
        <div className="absolute z-50 mt-2 w-72 max-h-96 bg-white dark:bg-darkmode border border-gray-200 dark:border-dark_border rounded-xl shadow-xl p-3 flex flex-col gap-2">
          <div className="pf-wrap">
            <div className="pf-surface flex items-center gap-2 px-2">
              <Search size={14} className="text-gray-400 flex-shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="دور على أي تقنية أو أداة... React, Figma, Docker"
                className="pf-input py-2"
              />
              {remoteLoading && <Loader2 size={13} className="animate-spin text-gray-400 flex-shrink-0" />}
              {query && !remoteLoading && (
                <button type="button" onClick={() => setQuery("")}>
                  <X size={14} className="text-gray-400" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-6 gap-1 overflow-y-auto pr-1" style={{ maxHeight: 220 }}>
            {/* نتايج simple-icons المحلية الأول (أسرع) */}
            {localFiltered.map((i) => (
              <button
                key={`local-${i.slug}`}
                type="button"
                title={i.title}
                onClick={() => { onChange(i.slug); setOpen(false); setQuery(""); }}
                className={`w-10 h-10 rounded-lg flex items-center justify-center hover:bg-primary/10 transition-colors ${
                  value === i.slug ? "bg-primary/15 ring-1 ring-primary" : ""
                }`}
              >
                <SkillIcon name={i.slug} size={18} />
              </button>
            ))}

            {/* ✅ نتايج iconify الإضافية (بتغطي حاجات مش موجودة في simple-icons) */}
            {remoteResults
              .filter((slug) => !localFiltered.some((l) => l.slug === slug.split(":")[1]))
              .map((iconName) => (
                <button
                  key={`remote-${iconName}`}
                  type="button"
                  title={iconName}
                  onClick={() => { onChange(iconName); setOpen(false); setQuery(""); }}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center hover:bg-primary/10 transition-colors ${
                    value === iconName ? "bg-primary/15 ring-1 ring-primary" : ""
                  }`}
                >
                  <Icon icon={iconName} width={18} height={18} />
                </button>
              ))}

            {!hasQuery && localFiltered.length === 0 && (
              <p className="col-span-6 text-center text-xs text-gray-400 py-4">مفيش نتايج</p>
            )}
          </div>

          {/* ✅ لو محدش لاقى حاجة، أو عايز صورة مخصصة، ارفعها يدوي */}
          {(noResults || hasQuery) && (
            <div className="pt-1 border-t border-gray-200 dark:border-dark_border">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 text-xs py-2 mt-2 rounded-lg border border-dashed border-gray-300 dark:border-dark_border hover:border-primary hover:text-primary text-gray-500"
              >
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {uploading ? "بيترفع..." : noResults ? "مفيش نتيجة؟ ارفع صورة بنفسك" : "أو ارفع صورة مخصصة"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}