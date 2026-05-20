"use client";
import { useState } from "react";
import { Plus, Trash2, Star, Edit3, Check } from "lucide-react";
import * as Select from "@radix-ui/react-select";
import * as Slider from "@radix-ui/react-slider";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ChevronDown } from "lucide-react";
import { PortfolioFormData, Skill } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

interface SkillsSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

const CATEGORIES = ["Frontend", "Backend", "Database", "DevOps", "Mobile", "Design", "Other"];

const EMPTY: Skill = { name: "", level: 50, category: "", icon: "" };

/* ─── Small reusable Field wrapper ──────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pf-group">
      <label className="pf-label">{label}</label>
      {children}
    </div>
  );
}

export default function SkillsSection({ data, onChange }: SkillsSectionProps) {
  const { t } = useI18n();
  const [draft, setDraft]           = useState<Skill>(EMPTY);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const skills = data.skills || [];

  const push = () => {
    if (!draft.name.trim()) return;
    onChange({ skills: [...skills, { ...draft }] });
    setDraft(EMPTY);
  };

  const remove = (i: number) =>
    onChange({ skills: skills.filter((_, idx) => idx !== i) });

  const patch = (i: number, field: keyof Skill, val: string | number) => {
    const next = [...skills];
    next[i] = { ...next[i], [field]: val };
    onChange({ skills: next });
  };

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="space-y-6">

        {/* ── Add New Skill ── */}
        <div className="bg-gray-50 dark:bg-dark_input rounded-xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            {t("portfolio.skills.addNew")}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Name */}
            <Field label={t("portfolio.skills.skillName")}>
              <div className="pf-wrap">
                <div className="pf-surface">
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                    placeholder={t("portfolio.skills.skillNamePlaceholder")}
                    className="pf-input"
                  />
                </div>
              </div>
            </Field>

            {/* Category — Radix Select */}
            <Field label={t("portfolio.skills.category")}>
              <div className="pf-wrap">
                <div className="pf-surface">
                  <Select.Root
                    value={draft.category}
                    onValueChange={(v) => setDraft((p) => ({ ...p, category: v }))}
                  >
                    <Select.Trigger className="pf-select-trigger" aria-label="Category">
                      <Select.Value placeholder={t("portfolio.skills.selectCategory")} />
                      <Select.Icon>
                        <ChevronDown className="pf-select-chevron" />
                      </Select.Icon>
                    </Select.Trigger>

                    <Select.Portal>
                      <Select.Content className="pf-select-content" position="popper" sideOffset={4}>
                        <Select.Viewport className="pf-select-viewport">
                          {CATEGORIES.map((c) => (
                            <Select.Item key={c} value={c} className="pf-select-item">
                              <Select.ItemText>{c}</Select.ItemText>
                              <Select.ItemIndicator className="pf-select-item-indicator">
                                <Check size={13} />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>
              </div>
            </Field>
          </div>

          {/* Proficiency — Radix Slider */}
          <div className="pf-group">
            <div className="flex items-center justify-between">
              <label className="pf-label">{t("portfolio.skills.proficiency")}</label>
              <span className="text-sm font-semibold" style={{ color: "var(--pf-primary)" }}>
                {draft.level}%
              </span>
            </div>
            <Slider.Root
              className="pf-slider-root"
              min={0} max={100} step={1}
              value={[draft.level]}
              onValueChange={([v]) => setDraft((p) => ({ ...p, level: v }))}
            >
              <Slider.Track className="pf-slider-track">
                <Slider.Range className="pf-slider-range" />
              </Slider.Track>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <Slider.Thumb className="pf-slider-thumb" aria-label="Skill level" />
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="pf-tooltip-content" side="top" sideOffset={6}>
                    {draft.level}%
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Slider.Root>
            <div className="flex justify-between text-xs" style={{ color: "var(--pf-placeholder)" }}>
              <span>{t("portfolio.skills.beginner")}</span>
              <span>{t("portfolio.skills.expert")}</span>
            </div>
          </div>

          {/* Icon emoji */}
          <Field label={t("portfolio.skills.icon")}>
            <div className="pf-wrap" style={{ maxWidth: 120 }}>
              <div className="pf-surface">
                <input
                  type="text"
                  value={draft.icon}
                  onChange={(e) => setDraft((p) => ({ ...p, icon: e.target.value }))}
                  placeholder="⚛"
                  className="pf-input text-center text-xl"
                  maxLength={2}
                />
              </div>
            </div>
          </Field>

          <button
            onClick={push}
            disabled={!draft.name.trim()}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={15} />
            {t("portfolio.skills.addSkill")}
          </button>
        </div>

        {/* ── Skills List ── */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            {t("portfolio.skills.yourSkills")} ({skills.length})
          </h3>

          {skills.length === 0 ? (
            <div className="text-center py-10 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-dark_input rounded-xl">
              <Star className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{t("portfolio.skills.noSkills")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {skills.map((skill, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-darkmode border border-gray-200 dark:border-dark_border rounded-xl p-4 flex items-center gap-4"
                >
                  {/* Icon */}
                  {skill.icon ? (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
                      {skill.icon}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-dark_input flex items-center justify-center flex-shrink-0">
                      <Star size={16} className="text-gray-400" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {editingIdx === i ? (
                        <div className="pf-wrap flex-1">
                          <div className="pf-surface">
                            <input
                              autoFocus
                              type="text"
                              value={skill.name}
                              onChange={(e) => patch(i, "name", e.target.value)}
                              onBlur={() => setEditingIdx(null)}
                              className="pf-input py-1"
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {skill.name}
                        </span>
                      )}
                      {skill.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark_input text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {skill.category}
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-3">
                      <div className="pf-progress-track flex-1">
                        <div className="pf-progress-fill" style={{ width: `${skill.level}%` }} />
                      </div>
                      <span className="text-sm font-semibold flex-shrink-0" style={{ color: "var(--pf-primary)", minWidth: "3rem" }}>
                        {skill.level}%
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <button
                          onClick={() => setEditingIdx(i)}
                          className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/8 transition-colors"
                        >
                          <Edit3 size={15} />
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content className="pf-tooltip-content" side="top" sideOffset={4}>
                          Edit name
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>

                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <button
                          onClick={() => remove(i)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content className="pf-tooltip-content" side="top" sideOffset={4}>
                          Remove skill
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Tooltip.Provider>
  );
}