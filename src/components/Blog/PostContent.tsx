// src/components/Blog/PostContent.tsx
"use client";

import { format } from "date-fns";
import TicketSection from "@/components/Home/TicketSection";
import { getApiUrl } from "@/utils/urlUtils";
import ImageWithFallback from "@/components/UI/ImageWithFallback";
import BlogImageWithFallback from "@/components/UI/BlogImageWithFallback";
import { useI18n } from "@/i18n/I18nProvider";
import { useState, useEffect } from "react";

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

  if (loading) {
    return (
      <div className="pt-44 text-center">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="pt-44 text-center">
        <h2 className="text-2xl font-bold text-red-500">{t("blog.notFound")}</h2>
        <p className="text-gray-500 mt-2">
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

  return (
    <>
      {/* ===== Header Section ===== */}
      <section className="relative pt-44">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-12 grid-cols-1 items-center">
            <div className="col-span-8">
              <div className="flex flex-col sm:flex-row">
                <span className="text-base text-midnight_text font-medium dark:text-white pr-7 border-r border-solid border-gray dark:border-white w-fit">
                  {formattedDate}
                </span>
                <span className="text-base text-midnight_text font-medium dark:text-white sm:pl-7 pl-0 w-fit">
                  {post.viewCount || 0} {t("blog.views")}
                </span>
              </div>
              <h2 className="text-midnight_text dark:text-white pt-7 text-2xl font-bold">
                {post.title || t("blog.untitled")}
              </h2>
            </div>

            <div className="flex items-center md:justify-center justify-start gap-6 col-span-4 pt-4 md:pt-0">
              <ImageWithFallback
                src={authorAvatar}
                alt={post.author?.name || t("blog.author")}
                width={50}
                height={50}
                className="rounded-full object-cover"
                fallbackSrc="/images/default-avatar.jpg"
              />
              <div>
                <span className="text-[18px] leading-[1.2] font-bold text-midnight_text dark:text-white">
                  {post.author?.name || t("blog.unknownAuthor")}
                </span>
                <p className="text-md text-gray dark:text-white">
                  {post.author?.role || t("blog.author")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Body Section ===== */}
      <section className="dark:bg-darkmode py-0">
        <div className="container mx-auto">
          <div className="flex flex-wrap justify-center">
            <div className="w-full px-4">
              <div className="z-20 mb-16 overflow-hidden rounded">
                <BlogImageWithFallback
                  src={mainImage}
                  alt={post.imageAlt || post.title || t("blog.imageAlt")}
                  width={700}
                  height={350}
                  className="h-full w-full object-cover rounded-3xl"
                  fallbackSrc="/images/blog/blog_1.png"
                />
              </div>

              <div className="w-full lg:w-8/12 mx-auto">
                {post.body ? (
                  <div
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: post.body,
                    }}
                  ></div>
                ) : (
                  <p className="text-center text-gray-500">
                    {t("blog.noContent")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <TicketSection />
    </>
  );
}