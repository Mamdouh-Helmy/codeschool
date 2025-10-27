// src/components/Blog/BlogList.tsx
"use client";
import React, { useEffect, useState } from "react";
import BlogCard from "@/components/SharedComponent/Blog/blogCard";
import { useI18n } from "@/i18n/I18nProvider";

const BlogList: React.FC = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || ""}/api/blog?page=1&limit=9`,
          { cache: "no-store" }
        );

        const text = await res.text();
        let data: any = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          console.warn("⚠️ BlogList: response was not JSON");
          data = {};
        }

        if (data?.data) {
          setPosts(data.data);
        } else {
          setPosts([]);
        }
      } catch (error) {
        console.error("Error fetching blog posts:", error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  if (loading) return <p className="text-center py-10">{t("blog.loading")}</p>;
  if (posts.length === 0)
    return <p className="text-center py-10">{t("blog.noArticles")}</p>;

  return (
    <section
      className="flex flex-wrap justify-center pt-8 dark:bg-darkmode pb-0"
      id="blog"
    >
      <div className="container mx-auto">
        <div className="grid grid-cols-12 gap-7">
          {posts.map((blog, i) => (
            <div
              key={i}
              className="w-full lg:col-span-4 md:col-span-6 col-span-12"
              data-aos="fade-up"
              data-aos-delay="200"
              data-aos-duration="1000"
            >
              <BlogCard blog={blog} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogList;