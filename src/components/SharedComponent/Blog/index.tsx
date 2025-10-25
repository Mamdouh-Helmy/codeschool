"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import BlogCard from "./blogCard";

const Blog: React.FC = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || ""}/api/blog?page=1&limit=3`,
          { cache: "no-store" }
        );

        const text = await res.text();
        let data: any = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          console.warn("⚠️ Blog: response was not JSON", text);
        }

        setPosts(data?.data || []);
      } catch (error) {
        console.error("Error fetching blog posts:", error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  if (loading) return <p className="text-center py-10">Loading blogs...</p>;
  if (posts.length === 0)
    return <p className="text-center py-10">No blog posts found.</p>;

  return (
    <section
      className="flex flex-wrap justify-center py-24 dark:bg-darklight border-t border-border dark:border-dark_border"
      id="blog"
    >
      <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md">
        <div className="flex items-baseline justify-between flex-wrap">
          <h2
            className="sm:mb-11 mb-3 text-4xl font-bold text-SlateBlueText dark:text-white"
            data-aos="fade-right"
            data-aos-delay="200"
            data-aos-duration="1000"
          >
            Latest blog & news
          </h2>
          <Link
            href="/blog"
            className="flex items-center gap-3 text-base text-SlateBlueText dark:text-white hover:dark:text-primary font-medium hover:text-primary sm:pb-0 pb-3"
            data-aos="fade-left"
            data-aos-delay="200"
            data-aos-duration="1000"
          >
            View More
            <span>
              <Icon icon="solar:arrow-right-outline" width="30" height="30" />
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-12 gap-7">
          {posts.map((blog, i) => (
            <div
              key={i}
              className="w-full md:col-span-4 col-span-6"
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

export default Blog;
