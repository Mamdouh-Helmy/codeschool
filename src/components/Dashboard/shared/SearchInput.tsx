// components/Dashboard/shared/SearchInput.tsx
"use client";
import { Icon } from "@iconify/react";
import { useI18n } from "@/i18n/I18nProvider";
import { useEffect, useRef, useState } from "react";

type Props = {
  defaultValue?: string;
  onChange?: (value: string) => void;
  onDebouncedChange?: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
};

const SearchInput = ({
  defaultValue = "",
  onChange,
  onDebouncedChange,
  placeholder,
  debounceMs = 300,
  className = "",
  autoFocus = false,
}: Props) => {
  const { t } = useI18n();
  const [internal, setInternal] = useState(defaultValue);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setInternal(defaultValue);
  }, [defaultValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternal(val);
    onChange?.(val);
    if (onDebouncedChange) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onDebouncedChange(val), debounceMs);
    }
  };

  const clear = () => {
    setInternal("");
    onChange?.("");
    onDebouncedChange?.("");
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return (
    <div
      className={`relative flex h-9 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 shadow-sm transition-all focus-within:border-[#ff6700] focus-within:ring-2 focus-within:ring-[#ff6700]/15 dark:border-dark_border dark:bg-darkmode ${className}`}
    >
      <Icon icon="ion:search-outline" className="h-4 w-4 shrink-0 text-slate-400" />
      <input
        type="search"
        value={internal}
        onChange={handleChange}
        placeholder={placeholder || t("input.searchPlaceholder")}
        autoFocus={autoFocus}
        className="w-full border-none bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-darktext"
      />
      {internal && (
        <button
          type="button"
          onClick={clear}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-darklight"
          aria-label={t("common.clearAll")}
        >
          <Icon icon="ion:close" className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

export default SearchInput;