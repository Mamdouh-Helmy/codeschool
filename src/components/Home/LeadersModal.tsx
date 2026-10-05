"use client";
import React, { useMemo } from "react";
import Modal from "@/components/Common/Modal";
import { useI18n } from "@/i18n/I18nProvider";
import { Project } from "./YoungStars";

// مشروع واحد لكل طالب
const getLeaders = (projects: Project[]) => {
  const map = new Map<string, Project>();
  for (const project of projects) {
    const key = project.student?.id || project.student?.email || project._id;
    if (!map.has(key)) map.set(key, project);
  }
  return Array.from(map.values());
};

const LeaderCard = ({
  project,
  onSelect,
}: {
  project: Project;
  onSelect: (p: Project) => void;
}) => {
  const { t } = useI18n();

  return (
    <button
      type="button"
      onClick={() => onSelect(project)}
      className="group relative overflow-hidden rounded-2xl border border-secondary/10 bg-white p-2.5 text-start shadow-md transition-all duration-300 active:scale-[0.98] dark:bg-darkmode sm:p-4 md:hover:-translate-y-1 md:hover:border-primary/30 md:hover:shadow-xl"
    >
      <div className="relative mb-2.5 aspect-square w-full overflow-hidden rounded-xl sm:mb-3">
        <img
          src={project.image || "/images/default-avatar.jpg"}
          alt={project.student?.name || project.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 md:group-hover:scale-105"
        />
        <div className="absolute inset-0 hidden bg-gradient-to-t from-secondary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:block" />
      </div>

      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-MidnightNavyText dark:text-white sm:text-lg">
          {project.student?.name || t("youngStars.unknownStudent")}
        </h3>
        <p className="mt-0.5 line-clamp-2 text-xs text-SlateBlueText dark:text-gray-400 sm:mt-1 sm:text-sm">
          {project.title || t("youngStars.noTitle")}
        </p>
      </div>

      {/* موبايل: نص ثابت بدل الـ hover */}
      <span className="mt-2 inline-block text-xs font-semibold text-primary md:hidden">
        {t("youngStars.viewProject")}
      </span>

      {/* ديسكتوب: overlay عند الـ hover */}
      <div className="absolute inset-0 hidden items-center justify-center rounded-2xl bg-secondary/50 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100 md:flex">
        <span className="rounded-xl bg-primary px-4 py-2 font-medium text-white shadow-lg">
          {t("youngStars.viewProject")}
        </span>
      </div>
    </button>
  );
};

export default function LeadersModal({
  open,
  onClose,
  projects,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  onSelect: (p: Project) => void;
}) {
  const { t } = useI18n();
  const leaders = useMemo(() => getLeaders(projects), [projects]);

  return (
    <Modal open={open} title={t("youngStars.meetMoreLeaders")} onClose={onClose}>
      {leaders.length === 0 ? (
        <p className="py-6 text-center text-lg text-SlateBlueText">
          {t("youngStars.noLeaders")}
        </p>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-3 sm:mt-4 sm:gap-6 md:grid-cols-3">
          {leaders.map((project) => (
            <LeaderCard key={project._id} project={project} onSelect={onSelect} />
          ))}
        </div>
      )}
    </Modal>
  );
}