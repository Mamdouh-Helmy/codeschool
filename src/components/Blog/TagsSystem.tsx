// src/components/Blog/TagsSystem.tsx
"use client";
import { useState, useEffect } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { Tag, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface TagsSystemProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  allTags?: string[];
  isFilter?: boolean;
}

export default function TagsSystem({ 
  selectedTags, 
  onTagsChange, 
  allTags = [],
  isFilter = false
}: TagsSystemProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [availableTags, setAvailableTags] = useState<string[]>(allTags);
  const [loading, setLoading] = useState(true);

  // جلب جميع التاجات من الـ API
  useEffect(() => {
    const fetchAllTags = async () => {
      try {
        setLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const response = await fetch(`${baseUrl}/api/blog/tags`);
        const data = await response.json();
        
        console.log('📋 Tags API Response:', data);
        
        if (data.success) {
          setAvailableTags(data.tags);
        } else {
          console.error('Failed to fetch tags:', data.message);
        }
      } catch (error) {
        console.error("Error fetching tags:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllTags();
  }, []);

  const addTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  // دالة واحدة للتعامل مع التاجات
  const handleTagClick = (tag: string) => {
    if (isFilter) {
      // في وضع الفلترة: اذهب إلى صفحة المدونة مع التاج
      console.log(`🎯 Filtering by tag: ${tag}`);
      router.push(`/blog?tag=${encodeURIComponent(tag)}`);
    } else {
      // في وضع الإضافة: أضف التاج للقائمة المختارة
      addTag(tag);
    }
  };

  const popularTags = availableTags.slice(0, 15);

  // حساب عدد المقالات لكل تاج
  const getTagCount = (tag: string) => {
    return availableTags.filter(t => t === tag).length;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="flex flex-wrap gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded w-20"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selected Tags - تظهر فقط في وضع الإضافة */}
      {!isFilter && selectedTags.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
            {t("blogForm.addedTags") || "Selected Tags"}:
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-primary/10 text-primary dark:bg-primary/20 px-3 py-1.5 rounded-lg text-sm"
              >
                <Tag className="w-3 h-3" />
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-primary hover:text-primary/70 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popular Tags */}
      {popularTags.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
            {isFilter 
              ? (t("blog.popularTags") || "Popular Tags")
              : (t("blog.tags") || "Tags")
            }:
          </label>
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleTagClick(tag)}
                disabled={!isFilter && selectedTags.includes(tag)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-1 ${
                  !isFilter && selectedTags.includes(tag)
                    ? "bg-primary text-white cursor-not-allowed"
                    : "bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white hover:bg-primary hover:text-white cursor-pointer"
                }`}
              >
                {tag}
                {/* {isFilter && (
                  <span className="ml-1 text-xs opacity-70">
                    ({getTagCount(tag)})
                  </span>
                )} */}
              </button>
            ))}
          </div>
        </div>
      )}

      {availableTags.length === 0 && !loading && (
        <p className="text-sm text-SlateBlueText dark:text-darktext">
          {t("blog.noTags") || "No tags available"}
        </p>
      )}
    </div>
  );
}