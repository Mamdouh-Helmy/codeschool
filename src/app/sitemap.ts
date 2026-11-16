import type { MetadataRoute } from "next";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "@/app/models/BlogPost";

export const revalidate = 3600; // يتحدّث كل ساعة

const BASE = "https://codeschool.online";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    "", "/about", "/curriculum", "/contact", "/schedules",
    "/speakers", "/subscriptions", "/webinars", "/blog",
  ].map((p) => ({
    url: `${BASE}${p}`,
    lastModified: new Date(),
  }));

  let posts: MetadataRoute.Sitemap = [];
  try {
    await connectDB();
    const docs = await BlogPost.find({
      status: "published",
      slug: { $exists: true, $ne: "" },
    })
      .select("slug updatedAt")
      .lean();

    posts = docs.map((d: any) => ({
      url: `${BASE}/blog/${encodeURIComponent(d.slug)}`,
      lastModified: d.updatedAt ? new Date(d.updatedAt) : new Date(),
    }));
  } catch (e) {
    console.error("sitemap: blog fetch failed", e);
    // الصفحات الثابتة تفضل شغالة حتى لو الداتابيز وقعت
  }

  return [...staticPages, ...posts];
}