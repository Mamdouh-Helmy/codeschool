import type { MetadataRoute } from "next";

const BASE = "https://codeschool.online";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/about", "/curriculum", "/contact", "/schedules",
    "/speakers", "/subscriptions", "/webinars", "/blog"].map((p) => ({
    url: `${BASE}${p}`,
    lastModified: new Date(),
  }));
}