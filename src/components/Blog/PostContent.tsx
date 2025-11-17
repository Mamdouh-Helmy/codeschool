// src/components/Blog/PostContent.tsx
"use client";

import { format } from "date-fns";
import TicketSection from "@/components/Home/TicketSection";
import { getApiUrl } from "@/utils/urlUtils";
import ImageWithFallback from "@/components/UI/ImageWithFallback";
import BlogImageWithFallback from "@/components/UI/BlogImageWithFallback";
import { useI18n } from "@/i18n/I18nProvider";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ✅ استيراد المكونات الجديدة
import EmailSubscription from "./EmailSubscription";
import SocialSharing from "./SocialSharing";
import TagsSystem from "./TagsSystem";

// ✅ دالة مساعدة لمعالجة الصور
const getImageSrc = (image: string | undefined, fallback: string) => {
  if (!image) return fallback;

  if (image.startsWith("data:image")) {
    return image;
  }

  if (image.startsWith("http")) {
    return image;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const cleanPath = image.startsWith("/") ? image : `/${image}`;

  return `${baseUrl}${cleanPath}`;
};

export function PostContent({ slug }: { slug: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPost() {
      try {
        const apiUrl = getApiUrl(`/api/blog/${slug}`);
        if (!apiUrl) throw new Error("API URL is not configured");

        const res = await fetch(apiUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        setPost(data?.data);
      } catch (err) {
        console.error("Error fetching post:", err);
        setError(t("blog.errorLoading"));
      } finally {
        setLoading(false);
      }
    }

    fetchPost();
  }, [slug, t]);

  // دالة للتعامل مع اختيار التاج في الـ TagsSystem
  const handleTagsChange = (tags: string[]) => {
    if (tags.length > 0) {
      router.push(`/blog?tag=${encodeURIComponent(tags[0])}`);
    }
  };

  if (loading) {
    return (
      <div className="pt-32 md:pt-44 text-center">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="pt-32 md:pt-44 text-center">
        <h2 className="text-xl md:text-2xl font-bold text-red-500">{t("blog.notFound")}</h2>
        <p className="text-gray-500 mt-2 text-sm md:text-base">
          {error || t("blog.notFoundDescription")}
        </p>
      </div>
    );
  }

  const formattedDate = post.publishDate
    ? format(new Date(post.publishDate), "dd MMM yyyy")
    : t("common.none");

  const authorAvatar = getImageSrc(
    post.author?.avatar,
    "/images/default-avatar.jpg"
  );

  const mainImage = getImageSrc(
    post.image,
    "/images/blog/blog_1.png"
  );

  // إنشاء URL كامل للمشاركة
  const currentUrl = typeof window !== 'undefined'
    ? window.location.href
    : `${process.env.NEXT_PUBLIC_BASE_URL}/blog/${slug}`;

  return (
    <>
      {/* ===== Header Section ===== */}
      <section className="relative pt-32 md:pt-44">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
            <div className="md:col-span-8">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-0">
                <span className="text-sm md:text-base text-midnight_text font-medium dark:text-white pr-4 sm:pr-7 border-r border-solid border-gray dark:border-white w-fit">
                  {formattedDate}
                </span>
                <span className="text-sm md:text-base text-midnight_text font-medium dark:text-white sm:pl-7 pl-0 w-fit">
                  {post.viewCount || 0} {t("blog.views")}
                </span>
              </div>
              <h2 className="text-midnight_text dark:text-white pt-4 md:pt-7 text-xl sm:text-2xl md:text-3xl font-bold leading-tight">
                {post.title || t("blog.untitled")}
              </h2>
            </div>

            <div className="md:col-span-4 pt-4 md:pt-0">
              <div className="flex items-center justify-start md:justify-center gap-4 md:gap-6">
                <ImageWithFallback
                  src={authorAvatar}
                  alt={post.author?.name || t("blog.author")}
                  width={50}
                  height={50}
                  className="rounded-full object-cover w-12 h-12 md:w-14 md:h-14"
                  fallbackSrc="/images/default-avatar.jpg"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-base md:text-lg leading-[1.2] font-bold text-midnight_text dark:text-white block truncate">
                    {post.author?.name || t("blog.unknownAuthor")}
                  </span>
                  <p className="text-sm md:text-md text-gray dark:text-white truncate">
                    {post.author?.role || t("blog.author")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Body Section ===== */}
      <section className="dark:bg-darkmode py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap justify-center">
            <div className="w-full px-0 sm:px-4">
              <div className="z-20 mb-8 md:mb-16 overflow-hidden rounded-xl md:rounded-3xl">
                <BlogImageWithFallback
                  src={mainImage}
                  alt={post.imageAlt || post.title || t("blog.imageAlt")}
                  width={1200}
                  height={600}
                  className="w-full h-48 sm:h-64 md:h-80 lg:h-96 xl:h-[520px] object-cover"
                  fallbackSrc="/images/blog/blog_1.png"
                />
              </div>

              <div className="w-full lg:w-10/12 xl:w-8/12 mx-auto">
                {post.body ? (
                  <div
                    className="prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none
                      prose-headings:break-words
                      prose-p:break-words
                      prose-li:break-words
                      prose-img:rounded-lg
                      prose-img:w-full
                      prose-img:h-auto"
                    dangerouslySetInnerHTML={{
                      __html: post.body,
                    }}
                  ></div>
                ) : (
                  <p className="text-center text-gray-500 text-sm md:text-base">
                    {t("blog.noContent")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Blog Features Section ===== */}
      <section className="dark:bg-darkmode py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* المحتوى الرئيسي */}
            <div className="lg:col-span-2 space-y-6 md:space-y-8">
              {/* Social Sharing */}
              <SocialSharing
                title={post.title}
                url={currentUrl}
              />

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="bg-IcyBreeze dark:bg-dark_input rounded-lg p-4 md:p-6 border border-PowderBlueBorder dark:border-dark_border">
                  <h3 className="text-base md:text-lg font-semibold text-MidnightNavyText dark:text-white mb-3 md:mb-4">
                    {t("blog.tags") || "Tags"}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 md:px-3 py-1 md:py-1.5 bg-primary/10 text-primary dark:bg-primary/20 rounded-lg text-xs md:text-sm font-medium hover:bg-primary hover:text-white transition-all duration-200 cursor-pointer break-words max-w-full"
                        onClick={() => {
                          router.push(`/blog?tag=${encodeURIComponent(tag)}`);
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4 md:space-y-6">
              <EmailSubscription />

              {/* Popular Tags Sidebar */}
              <div className="bg-IcyBreeze dark:bg-dark_input rounded-lg p-4 md:p-6 border border-PowderBlueBorder dark:border-dark_border">
                <h3 className="text-base md:text-lg font-semibold text-MidnightNavyText dark:text-white mb-3 md:mb-4">
                  {t("blog.popularTags") || "Popular Tags"}
                </h3>
                <TagsSystem
                  selectedTags={[]}
                  onTagsChange={handleTagsChange}
                  isFilter={true}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <TicketSection />
    </>
  );
}