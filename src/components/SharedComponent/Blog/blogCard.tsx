// src/components/SharedComponent/Blog/blogCard.tsx
"use client";

import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Blog } from "@/types/blog";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";

// ✅ استخدام نوع Blog مباشرة بدلاً من ExtendedBlog
const BlogCard = ({ blog }: { blog: Blog }) => {
  const { t } = useI18n();
  const { locale } = useLocale();
  
  // ✅ اختيار البيانات بناءً على اللغة
  const title = locale === 'ar' ? blog.title_ar : blog.title_en;
  const excerpt = locale === 'ar' ? blog.excerpt_ar : blog.excerpt_en;
  const authorName = locale === 'ar' ? blog.author?.name_ar : blog.author?.name_en;
  const category = locale === 'ar' ? blog.category_ar : blog.category_en;

  const { image, slug, publishDate, createdAt } = blog;

  const getImageSrc = (): string => {
    if (!image) return "/images/blog/blog_1.png";

    if (image.startsWith("data:image")) {
      return image;
    }

    if (image.startsWith("http://") || image.startsWith("https://")) {
      return image;
    }

    return image.startsWith("/") ? image : `/${image}`;
  };

  const getAuthorImageSrc = (): string => {
    const avatar = blog.author?.avatar;
    if (!avatar) return "/images/default-avatar.jpg";

    if (avatar.startsWith("data:image")) {
      return avatar;
    }

    if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
      return avatar;
    }

    return avatar.startsWith("/") ? avatar : `/${avatar}`;
  };

  const postDate = publishDate || createdAt || "";
  const formattedDate =
    postDate && !isNaN(new Date(postDate).getTime())
      ? format(new Date(postDate), "dd MMM yyyy")
      : t("common.none") || "No date";

  const imageSrc = getImageSrc();

  return (
    <div className="group relative bg-transparent">
      <div className="mb-8 overflow-hidden rounded-2xl">
        <Link
          href={`/blog/${slug || "#"}`}
          aria-label={t("blog.cover") || "Blog cover"}
          className="block"
        >
          <img
            src={imageSrc}
            alt={title || t("blog.imageAlt") || "Blog image"}
            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110"
            width={408}
            height={272}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = "/images/blog/blog_1.png";
            }}
          />
        </Link>
      </div>

      <div className="absolute top-0 bg-primary py-2 ml-4 mt-4 px-5 rounded-lg shadow">
        <span className="text-white font-medium text-sm">
          {category || t("blog.article") || "Article"}
        </span>
      </div>

      <div>
        <h3>
          <Link
            href={`/blog/${slug || "#"}`}
            className="mb-4 inline-block font-semibold text-black hover:text-primary dark:text-white dark:hover:text-primary text-[22px] leading-[2rem]"
          >
            {title || t("blog.untitled") || "Untitled"}
          </Link>
        </h3>

        <div className="flex items-center gap-3 mb-2">
          {blog.author?.avatar && (
            <div className="w-8 h-8 rounded-full overflow-hidden">
              <img
                src={getAuthorImageSrc()}
                alt={authorName || t("blog.author") || "Author"}
                width={32}
                height={32}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/images/default-avatar.jpg";
                }}
                loading="lazy"
              />
            </div>
          )}
          <div className="flex-1">
            <span className="text-sm font-semibold leading-loose text-SereneGray block">
              {formattedDate}
            </span>
            {authorName && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t("blog.by") || "by"} {authorName}
              </span>
            )}
          </div>
        </div>

        {/* {excerpt && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {excerpt}
          </p>
        )} */}
      </div>
    </div>
  );
};

export default BlogCard;