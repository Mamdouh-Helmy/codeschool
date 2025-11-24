"use client";
import { useState } from "react";
import { Plus, Trash2, Star, Edit3 } from "lucide-react";
import { PortfolioFormData, Skill } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

interface SkillsSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

export default function SkillsSection({ data, onChange }: SkillsSectionProps) {
  const { t } = useI18n();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newSkill, setNewSkill] = useState<Skill>({
    name: "",
    level: 50,
    category: "",
    icon: ""
  });

  const addSkill = (): void => {
    if (!newSkill.name.trim()) return;
    const updatedSkills = [...(data.skills || []), { ...newSkill }];
    onChange({ skills: updatedSkills });
    setNewSkill({ name: "", level: 50, category: "", icon: "" });
  };

  const updateSkill = (index: number, field: keyof Skill, value: string | number): void => {
    const updatedSkills = [...(data.skills || [])];
    updatedSkills[index] = { ...updatedSkills[index], [field]: value };
    onChange({ skills: updatedSkills });
  };

  const removeSkill = (index: number): void => {
    const updatedSkills = (data.skills || []).filter((_, i) => i !== index);
    onChange({ skills: updatedSkills });
  };

  const startEditing = (index: number): void => {
    setEditingIndex(index);
  };

  const stopEditing = (): void => {
    setEditingIndex(null);
  };

  const categories = ["Frontend", "Backend", "Database", "DevOps", "Mobile", "Design", "Other"];

  return (
    <div className="space-y-6">
      {/* Add New Skill */}
      <div className="bg-gray-50 dark:bg-dark_input rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          {t("portfolio.skills.addNew")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("portfolio.skills.skillName")}
            </label>
            <input 
              type="text"
              value={newSkill.name}
              onChange={(e) => setNewSkill(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t("portfolio.skills.skillNamePlaceholder")}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkmode dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("portfolio.skills.category")}
            </label>
            <select
              value={newSkill.category}
              onChange={(e) => setNewSkill(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkmode dark:text-white"
            >
              <option value="">{t("portfolio.skills.selectCategory")}</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("portfolio.skills.proficiency")}: {newSkill.level}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={newSkill.level}
              onChange={(e) => setNewSkill(prev => ({ ...prev, level: parseInt(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>{t("portfolio.skills.beginner")}</span>
              <span>{t("portfolio.skills.expert")}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("portfolio.skills.icon")}
            </label>
            <input
              type="text"
              value={newSkill.icon}
              onChange={(e) => setNewSkill(prev => ({ ...prev, icon: e.target.value }))}
              placeholder={t("portfolio.skills.iconPlaceholder")}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkmode dark:text-white"
              maxLength={2}
            />
          </div>
        </div>
        <button
          onClick={addSkill}
          disabled={!newSkill.name.trim()}
          className="w-full bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("portfolio.skills.addSkill")}
        </button>
      </div>

      {/* Skills List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          {t("portfolio.skills.yourSkills")} ({data.skills?.length || 0})
        </h3>
        {(!data.skills || data.skills.length === 0) ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark_input rounded-lg">
            <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t("portfolio.skills.noSkills")}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {data.skills.map((skill, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-white dark:bg-darkmode border border-gray-200 dark:border-dark_border rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  {skill.icon && (
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="text-sm">{skill.icon}</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      {editingIndex === index ? (
                        <input
                          type="text"
                          value={skill.name}
                          onChange={(e) => updateSkill(index, 'name', e.target.value)}
                          className="flex-1 px-3 py-1 border border-gray-300 dark:border-dark_border rounded focus:ring-1 focus:ring-primary dark:bg-dark_input dark:text-white"
                          onBlur={stopEditing}
                          autoFocus
                        />
                      ) : (
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {skill.name}
                        </h4>
                      )}
                      {skill.category && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-dark_input text-gray-600 dark:text-gray-400 rounded text-xs">
                          {skill.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-500"
                            style={{ width: `${skill.level}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-12">
                        {skill.level}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => startEditing(index)}
                    className="p-2 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeSkill(index)}
                    className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}