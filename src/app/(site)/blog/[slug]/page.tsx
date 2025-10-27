// src/app/(site)/blog/[slug]/page.tsx
import { getApiUrl } from "@/utils/urlUtils";
import { PostContent } from "@/components/Blog/PostContent";
import { Metadata } from "next";

// ✅ توليد الميتاداتا
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const apiUrl = getApiUrl(`/api/blog/${slug}`);

    if (!apiUrl) {
      console.warn("⚠️ generateMetadata: API URL is not configured");
      return {
        title: "Post Not Found | CodeSchool",
        description: "Blog article",
      };
    }

    const res = await fetch(apiUrl, {
      next: { revalidate: 60 },
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const text = await res.text();
    const postData = text ? JSON.parse(text) : {};
    const post = postData.data;

    return {
      title: post ? `${post.title} | CodeSchool` : "Post Not Found",
      description: post?.excerpt || "Blog article",
      openGraph: {
        title: post?.title || "Post Not Found",
        description: post?.excerpt || "Blog article",
        type: "article",
        publishedTime: post?.publishDate,
        authors: post?.author?.name ? [post.author.name] : [],
      },
    };
  } catch (error) {
    console.error("Metadata fetch error:", error);
    return {
      title: "Error Loading Post",
      description: "Unable to fetch post metadata",
    };
  }
}

// ✅ الصفحة الرئيسية (Server Component)
export default async function Post({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <PostContent slug={slug} />;
}