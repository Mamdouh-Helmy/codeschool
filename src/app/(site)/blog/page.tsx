// src/app/blog/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import BlogCard from "@/components/SharedComponent/Blog/blogCard";
import TagsSystem from "@/components/Blog/TagsSystem";
import { useI18n } from "@/i18n/I18nProvider";
import { Filter, X } from "lucide-react";
import HeroSub from "@/components/SharedComponent/HeroSub";
import TicketSection from "@/components/Home/TicketSection";
import { useLocale } from "@/app/context/LocaleContext";
import { Blog } from "@/types/blog";
import { getApiUrl } from "@/utils/urlUtils";

interface ApiResponse {
  success: boolean;
  data?: Blog[];
  message?: string;
  pagination?: {
    total: number;
    page: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface BreadcrumbLink {
  href: string;
  text: string;
}

export default function BlogPage() {
  const { t } = useI18n();
  const { locale } = useLocale();
  const searchParams = useSearchParams();

  const [selectedTag, setSelectedTag] = useState<string>("");
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const breadcrumbLinks: BreadcrumbLink[] = [
    { href: "/", text: locale === "ar" ? "الرئيسية" : "Home" },
    { href: "/blog", text: locale === "ar" ? "المدونة" : "Blog" },
  ];

  const getDescription = (): string => {
    if (selectedTag) {
      return locale === "ar"
        ? `المقالات الموسومة بـ "${selectedTag}"`
        : `Posts tagged with "${selectedTag}"`;
    }
    return locale === "ar"
      ? "اكتشف ثروة من المواد الثاقبة المصممة بدقة لتزويدك بفهم شامل لأحدث الاتجاهات."
      : "Discover a wealth of insightful materials meticulously crafted to provide you with a comprehensive understanding of the latest trends.";
  };

  // ✅ مصدر الحقيقة الوحيد لـ selectedTag هو الـ URL.
  // ده بيحل مشكلة عدم مزامنة الـ state لما المستخدم يرجع لـ /blog من غير tag.
  useEffect(() => {
    const tag = searchParams.get("tag") || "";
    setSelectedTag(tag);
  }, [searchParams]);

  // ✅ جلب المقالات - مفصول تماماً عن أي state تاني غير selectedTag و locale
  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("status", "published");
      params.set("lang", locale);
      if (selectedTag) {
        params.set("tag", selectedTag);
      }

      const apiUrl = `${getApiUrl("/api/blog")}?${params.toString()}`;
      console.log("🔍 Fetching from:", apiUrl);

      const res = await fetch(apiUrl, { cache: "no-store" });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data: ApiResponse = await res.json();
      console.log("📦 API Response:", data);

      if (data.success && data.data) {
        setBlogs(data.data);
        console.log(`✅ Found ${data.data.length} posts with tag: "${selectedTag}"`);
      } else {
        setBlogs([]);
        setError(data.message || "Failed to load blogs");
      }
    } catch (err) {
      console.error("💥 Fetch error:", err);
      setError("Failed to fetch blog posts");
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTag, locale]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  const clearFilter = () => {
    setSelectedTag("");
    window.history.pushState({}, "", `/blog?lang=${locale}`);
  };

  const getErrorMessage = (): string => {
    if (selectedTag) {
      return locale === "ar"
        ? `لا توجد مقالات موسومة بـ "${selectedTag}"`
        : `No posts found with tag "${selectedTag}"`;
    }
    return locale === "ar" ? "لم يتم العثور على مقالات" : "No articles found";
  };

  return (
    <>
      <HeroSub
        title={locale === "ar" ? "المدونة" : "Blog"}
        description={getDescription()}
        breadcrumbLinks={breadcrumbLinks}
      />

      <section className="dark:bg-darkmode py-12">
        <div className="container mx-auto">
          {/* Filter Section */}
          <div className="mb-8">
            <div className="bg-white dark:bg-darkmode rounded-xl p-6 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-MidnightNavyText dark:text-white">
                    {t("blog.filterByTag") || "Filter by Tag"}
                  </h2>
                </div>

                {selectedTag && (
                  <button
                    onClick={clearFilter}
                    className="flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-500 rounded-lg text-sm hover:bg-red-500/20 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    {t("common.clear") || "Clear Filter"}
                  </button>
                )}
              </div>

              <TagsSystem
                selectedTags={selectedTag ? [selectedTag] : []}
                onTagsChange={(tags) => {
                  if (tags.length > 0) {
                    const newTag = tags[0];
                    setSelectedTag(newTag);
                    window.history.pushState(
                      {},
                      "",
                      `/blog?tag=${encodeURIComponent(newTag)}&lang=${locale}`,
                    );
                  } else {
                    clearFilter();
                  }
                }}
                isFilter={true}
              />

              {selectedTag && (
                <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-primary font-medium">
                    {locale === "ar" ? "عرض المقالات الموسومة بـ" : "Showing posts tagged with"}:
                    <span className="font-bold"> "{selectedTag}"</span>
                  </p>
                  <p className="text-sm text-SlateBlueText dark:text-gray-400 mt-1">
                    {blogs.length}{" "}
                    {blogs.length === 1
                      ? locale === "ar"
                        ? "مقال"
                        : "post"
                      : locale === "ar"
                        ? "مقالات"
                        : "posts"}{" "}
                    {locale === "ar" ? "تم العثور عليها" : "found"}
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-500 font-medium">
                    {locale === "ar" ? "خطأ:" : "Error:"} {error}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Blog Posts */}
          <div className="mb-12">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-SlateBlueText dark:text-gray-400 mt-4">
                  {t("common.loading") || "Loading..."}
                </p>
              </div>
            ) : blogs.length > 0 ? (
              <div className="grid grid-cols-12 gap-7">
                {blogs.map((blog, i) => (
                  <div
                    key={blog._id || i}
                    className="w-full lg:col-span-4 md:col-span-6 col-span-12"
                    data-aos="fade-up"
                    data-aos-delay="200"
                    data-aos-duration="1000"
                  >
                    <BlogCard blog={blog} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border">
                <p className="text-SlateBlueText dark:text-gray-400 text-lg">
                  {getErrorMessage()}
                </p>
                {selectedTag && (
                  <button
                    onClick={clearFilter}
                    className="mt-4 bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    {locale === "ar" ? "عرض جميع المقالات" : "Show All Posts"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <TicketSection />
    </>
  );
}