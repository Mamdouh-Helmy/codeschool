"use client";
import React, { useMemo } from "react";
import Modal from "@/components/Common/Modal";
import { useI18n } from "@/i18n/I18nProvider";
import { Project } from "./YoungStars";

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

  // ✅ Memoized leaders list لمنع إعادة الحساب
  const leaders = useMemo(() => {
    const leadersMap = new Map();
    
    projects.forEach((p) => {
      const key = p.student?.id || p.student?.email || p._id;
      if (!leadersMap.has(key)) {
        leadersMap.set(key, { student: p.student, sampleProject: p });
      }
    });
    
    return Array.from(leadersMap.values()).map((v) => v.sampleProject);
  }, [projects]);

  // ✅ Memoized render للـ leaders
  const renderLeaders = useMemo(() => {
    if (leaders.length === 0) {
      return (
        <p className="text-center text-SlateBlueText py-6 text-lg">
          {t("youngStars.noLeaders")}
        </p>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4">
        {leaders.map((p) => (
          <button
            key={p._id}
            onClick={() => onSelect(p)}
            className="group relative bg-white dark:bg-darkmode rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-4 text-left border border-transparent hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label={`View ${p.student?.name || "Student"}'s project`}
          >
            {/* صورة القائد */}
            <div className="relative w-full aspect-square overflow-hidden rounded-xl mb-3">
              <img
                src={p.image || "/images/default-avatar.jpg"}
                alt={p.title || "leader"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* تفاصيل القائد */}
            <div>
              <h3 className="font-semibold text-lg text-MidnightNavyText dark:text-white truncate">
                {p.student?.name || t("youngStars.unknownStudent")}
              </h3>
              <p className="text-sm text-SlateBlueText dark:text-gray-400 mt-1 line-clamp-2">
                {p.title || t("youngStars.noTitle")}
              </p>
            </div>

            {/* زر عرض المشروع عند Hover */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300">
              <span className="bg-primary text-white px-4 py-2 rounded-xl font-medium shadow-lg">
                {t("youngStars.viewProject")}
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  }, [leaders, t, onSelect]);

  return (
    <Modal
      open={open}
      title={t("youngStars.meetMoreLeaders")}
      onClose={onClose}
      widthClass="max-w-6xl"
    >
      {renderLeaders}
    </Modal>
  );
}