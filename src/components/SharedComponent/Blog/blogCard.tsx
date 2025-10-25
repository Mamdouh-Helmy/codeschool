import React from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { Blog } from "@/types/blog";

const BlogCard = ({ blog }: { blog: Blog }) => {
  const { title, image, excerpt, slug, publishDate, createdAt } = blog;

  // ✅ معالجة الصور المخزنة كـ base64 أو URLs
  const getImageSrc = () => {
    if (!image) return "/images/blog/blog_1.png";
    
    // إذا كانت الصورة base64
    if (image.startsWith("data:image")) {
      return image;
    }
    
    // إذا كانت مسار URL
    const fixedImagePath = image.startsWith("/") 
      ? image 
      : `/${image}`;
    
    return fixedImagePath;
  };

  // ✅ معالجة صورة المؤلف إذا كانت موجودة
  const getAuthorImageSrc = () => {
    if (!blog.author?.avatar) return "/images/default-avatar.jpg";
    
    if (blog.author.avatar.startsWith("data:image")) {
      return blog.author.avatar;
    }
    
    const fixedAvatarPath = blog.author.avatar.startsWith("/")
      ? blog.author.avatar
      : `/${blog.author.avatar}`;
    
    return fixedAvatarPath;
  };

  // 🗓️ تحديد التاريخ
  const postDate = publishDate || createdAt || "";
  const formattedDate =
    postDate && !isNaN(new Date(postDate).getTime())
      ? format(new Date(postDate), "dd MMM yyyy")
      : "N/A";

  const imageSrc = getImageSrc();

  return (
    <div className="group relative bg-transparent">
      {/* صورة المقال */}
      <div className="mb-8 overflow-hidden rounded-2xl">
        <Link
          href={`/blog/${slug || "#"}`}
          aria-label="blog cover"
          className="block"
        >
          <Image
            src={imageSrc}
            alt={title || "Blog image"}
            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110"
            width={408}
            height={272}
            quality={100}
            priority={false}
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              target.src = "/images/blog/blog_1.png";
            }}
          />
        </Link>
      </div>

      {/* تصنيف ثابت مؤقتًا */}
      <div className="absolute top-0 bg-primary py-2 ml-4 mt-4 px-5 rounded-lg shadow">
        <span className="text-white font-medium text-sm">Article</span>
      </div>

      {/* تفاصيل المقال */}
      <div>
        <h3>
          <Link
            href={`/blog/${slug || "#"}`}
            className="mb-4 inline-block font-semibold text-black hover:text-primary dark:text-white dark:hover:text-primary text-[22px] leading-[2rem]"
          >
            {title || "Untitled Post"}
          </Link>
        </h3>

        {/* معلومات المؤلف والتاريخ */}
        <div className="flex items-center gap-3 mb-2">
          {blog.author?.avatar && (
            <div className="w-8 h-8 rounded-full overflow-hidden">
              <Image
                src={getAuthorImageSrc()}
                alt={blog.author?.name || "Author"}
                width={32}
                height={32}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.src = "/images/default-avatar.jpg";
                }}
              />
            </div>
          )}
          <div className="flex-1">
            <span className="text-sm font-semibold leading-loose text-SereneGray block">
              {formattedDate}
            </span>
            {blog.author?.name && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                By {blog.author.name}
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