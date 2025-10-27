// src/components/SharedComponent/Blog/blogCard.tsx
"use client";

import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Blog } from "@/types/blog";
import { useI18n } from "@/i18n/I18nProvider";

const BlogCard = ({ blog }: { blog: Blog }) => {
  const { t } = useI18n();
  const { title, image, excerpt, slug, publishDate, createdAt } = blog;

  const getImageSrc = () => {
    if (!image) return "/images/blog/blog_1.png";

    if (image.startsWith("data:image")) {
      return image; // base64
    }

    // لو URL كامل
    if (image.startsWith("http://") || image.startsWith("https://")) {
      return image;
    }

    // غير كده relative path
    return image.startsWith("/") ? image : `/${image}`;
  };

  const getAuthorImageSrc = () => {
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
      : t("common.none");

  const imageSrc = getImageSrc();

  return (
    <div className="group relative bg-transparent">
      <div className="mb-8 overflow-hidden rounded-2xl">
        <Link
          href={`/blog/${slug || "#"}`}
          aria-label={t("blog.cover")}
          className="block"
        >
          <img
            src={imageSrc}
            alt={title || t("blog.imageAlt")}
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
          {t("blog.article")}
        </span>
      </div>

      <div>
        <h3>
          <Link
            href={`/blog/${slug || "#"}`}
            className="mb-4 inline-block font-semibold text-black hover:text-primary dark:text-white dark:hover:text-primary text-[22px] leading-[2rem]"
          >
            {title || t("blog.untitled")}
          </Link>
        </h3>

        <div className="flex items-center gap-3 mb-2">
          {blog.author?.avatar && (
            <div className="w-8 h-8 rounded-full overflow-hidden">
              <img
                src={getAuthorImageSrc()}
                alt={blog.author?.name || t("blog.author")}
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
            {blog.author?.name && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t("blog.by")} {blog.author.name}
              </span>
            )}
          </div>
        </div>

        {excerpt && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {excerpt}
          </p>
        )}
      </div>
    </div>
  );
};

export default BlogCard;
