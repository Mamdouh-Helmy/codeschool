"use client";
import { useState } from "react";
import { Plus, Trash2, Edit3, Briefcase, Building2, Calendar } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { PortfolioFormData, ExperienceItem } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

interface ExperienceSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

type ExperienceDraft = Omit<ExperienceItem, "id">;
const EMPTY: ExperienceDraft = { company: "", position: "", duration: "" };

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="pf-group">
      <label className="pf-label">{icon}{label}</label>
      {children}
    </div>
  );
}

export default function ExperienceSection({ data, onChange }: ExperienceSectionProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<ExperienceDraft>(EMPTY);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const experience = data.experience || [];

  const push = () => {
    if (!draft.company.trim() || !draft.position.trim()) return;
    onChange({ experience: [...experience, { ...draft }] as ExperienceItem[] });
    setDraft(EMPTY);
  };

  const remove = (i: number) =>
    onChange({ experience: experience.filter((_, idx) => idx !== i) });

  const patch = (i: number, field: keyof ExperienceDraft, val: string) => {
    const next = [...experience];
    next[i] = { ...next[i], [field]: val };
    onChange({ experience: next });
  };

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="space-y-6">

        {/* ── Add New ── */}
        <div className="bg-gray-50 dark:bg-dark_input rounded-xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            {t("portfolio.experience.addNew") || "Add Work Experience"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={t("portfolio.experience.position") || "Position"} icon={<Briefcase size={13} />}>
              <div className="pf-wrap"><div className="pf-surface">
                <input
                  type="text"
                  value={draft.position}
                  onChange={(e) => setDraft((p) => ({ ...p, position: e.target.value }))}
                  placeholder="e.g. Senior Frontend Developer"
                  className="pf-input"
                />
              </div></div>
            </Field>

            <Field label={t("portfolio.experience.company") || "Company"} icon={<Building2 size={13} />}>
              <div className="pf-wrap"><div className="pf-surface">
                <input
                  type="text"
                  value={draft.company}
                  onChange={(e) => setDraft((p) => ({ ...p, company: e.target.value }))}
                  placeholder="e.g. Acme Inc."
                  className="pf-input"
                />
              </div></div>
            </Field>
          </div>

          <Field label={t("portfolio.experience.duration") || "Duration"} icon={<Calendar size={13} />}>
            <div className="pf-wrap"><div className="pf-surface">
              <input
                type="text"
                value={draft.duration}
                onChange={(e) => setDraft((p) => ({ ...p, duration: e.target.value }))}
                placeholder="e.g. 2022 — Present"
                className="pf-input"
              />
            </div></div>
          </Field>

          <button
            onClick={push}
            disabled={!draft.company.trim() || !draft.position.trim()}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={15} />
            {t("portfolio.experience.addNew") || "Add Experience"}
          </button>
        </div>

        {/* ── List ── */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            {t("portfolio.experience.yourExperience") || "Your Experience"} ({experience.length})
          </h3>

          {experience.length === 0 ? (
            <div className="text-center py-10 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-dark_input rounded-xl">
              <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{t("portfolio.experience.noExperience") || "No experience added yet"}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {experience.map((item, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-darkmode border border-gray-200 dark:border-dark_border rounded-xl p-4"
                >
                  {editingIdx === i ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="pf-wrap"><div className="pf-surface">
                          <input
                            type="text"
                            value={item.position}
                            onChange={(e) => patch(i, "position", e.target.value)}
                            className="pf-input"
                            placeholder="Position"
                          />
                        </div></div>
                        <div className="pf-wrap"><div className="pf-surface">
                          <input
                            type="text"
                            value={item.company}
                            onChange={(e) => patch(i, "company", e.target.value)}
                            className="pf-input"
                            placeholder="Company"
                          />
                        </div></div>
                      </div>
                      <div className="pf-wrap"><div className="pf-surface">
                        <input
                          type="text"
                          value={item.duration}
                          onChange={(e) => patch(i, "duration", e.target.value)}
                          className="pf-input"
                          placeholder="Duration"
                        />
                      </div></div>
                      <button
                        onClick={() => setEditingIdx(null)}
                        className="px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold"
                      >
                        {t("common.save") || "Save"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{item.position}</h4>
                        <p className="text-xs text-primary font-medium mt-0.5">{item.company}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.duration}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <button
                              onClick={() => setEditingIdx(i)}
                              className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/8 transition-colors"
                            >
                              <Edit3 size={14} />
                            </button>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content className="pf-tooltip-content" side="top" sideOffset={4}>Edit</Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <button
                              onClick={() => remove(i)}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content className="pf-tooltip-content" side="top" sideOffset={4}>Remove</Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Tooltip.Provider>
  );
}