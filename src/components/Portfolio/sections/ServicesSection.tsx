"use client";
import { useState } from "react";
import { Plus, Trash2, Edit3, Wrench, Link as LinkIcon, Hash } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { PortfolioFormData, ServiceItem } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

interface ServicesSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

type ServiceDraft = Omit<ServiceItem, "id">;
const EMPTY: ServiceDraft = { num: "", title: "", description: "", href: "/contact" };

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="pf-group">
      <label className="pf-label">{icon}{label}</label>
      {children}
    </div>
  );
}

export default function ServicesSection({ data, onChange }: ServicesSectionProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<ServiceDraft>(EMPTY);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const services = data.services || [];

  const push = () => {
    if (!draft.title.trim()) return;
    const num = draft.num.trim() || String(services.length + 1).padStart(2, "0");
    onChange({ services: [...services, { ...draft, num }] as ServiceItem[] });
    setDraft(EMPTY);
  };

  const remove = (i: number) =>
    onChange({ services: services.filter((_, idx) => idx !== i) });

  const patch = (i: number, field: keyof ServiceDraft, val: string) => {
    const next = [...services];
    next[i] = { ...next[i], [field]: val };
    onChange({ services: next });
  };

  return (
    <Tooltip.Provider delayDuration={300}>
      <div className="space-y-6">

        {/* ── Add New ── */}
        <div className="bg-gray-50 dark:bg-dark_input rounded-xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            {t("portfolio.services.addNew") || "Add Service"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] gap-4">
            <Field label={t("portfolio.services.num") || "No."} icon={<Hash size={13} />}>
              <div className="pf-wrap"><div className="pf-surface">
                <input
                  type="text"
                  value={draft.num}
                  onChange={(e) => setDraft((p) => ({ ...p, num: e.target.value }))}
                  placeholder="01"
                  className="pf-input"
                  maxLength={3}
                />
              </div></div>
            </Field>

            <Field label={t("portfolio.services.title") || "Service Title"} icon={<Wrench size={13} />}>
              <div className="pf-wrap"><div className="pf-surface">
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Web Development"
                  className="pf-input"
                />
              </div></div>
            </Field>
          </div>

          <Field label={t("portfolio.services.description") || "Description"}>
            <div className="pf-wrap"><div className="pf-surface">
              <textarea
                value={draft.description}
                onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                placeholder="Brief description of the service..."
                className="pf-textarea"
              />
            </div></div>
          </Field>

          <Field label={t("portfolio.services.href") || "Link (optional)"} icon={<LinkIcon size={13} />}>
            <div className="pf-wrap"><div className="pf-surface">
              <input
                type="text"
                value={draft.href}
                onChange={(e) => setDraft((p) => ({ ...p, href: e.target.value }))}
                placeholder="/contact"
                className="pf-input"
              />
            </div></div>
          </Field>

          <button
            onClick={push}
            disabled={!draft.title.trim()}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={15} />
            {t("portfolio.services.addNew") || "Add Service"}
          </button>
        </div>

        {/* ── List ── */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            {t("portfolio.services.yourServices") || "Your Services"} ({services.length})
          </h3>

          {services.length === 0 ? (
            <div className="text-center py-10 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-dark_input rounded-xl">
              <Wrench className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{t("portfolio.services.noServices") || "No services added yet"}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {services.map((item, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-darkmode border border-gray-200 dark:border-dark_border rounded-xl p-4"
                >
                  {editingIdx === i ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-[80px_1fr] gap-3">
                        <div className="pf-wrap"><div className="pf-surface">
                          <input
                            type="text"
                            value={item.num}
                            onChange={(e) => patch(i, "num", e.target.value)}
                            className="pf-input"
                            placeholder="No."
                          />
                        </div></div>
                        <div className="pf-wrap"><div className="pf-surface">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => patch(i, "title", e.target.value)}
                            className="pf-input"
                            placeholder="Title"
                          />
                        </div></div>
                      </div>
                      <div className="pf-wrap"><div className="pf-surface">
                        <textarea
                          value={item.description}
                          onChange={(e) => patch(i, "description", e.target.value)}
                          className="pf-textarea"
                          rows={2}
                          placeholder="Description"
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
                      <div className="flex gap-3">
                        <span className="text-2xl font-extrabold text-gray-200 dark:text-gray-700">{item.num}</span>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{item.title}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                        </div>
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