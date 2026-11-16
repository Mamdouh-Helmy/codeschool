import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/", "/admin", "/dashboard", "/marketing",
          "/instructor", "/guest", "/portfolio/builder", "/portfolio/scanner",
        ],
      },
    ],
    sitemap: "https://codeschool.online/sitemap.xml",
  };
}