// src/components/Header/Navigation/menuData.ts
import { HeaderItem } from "@/types/menu";

export const defaultHeaderData: HeaderItem[] = [
  { label: "homepage", href: "/" },
  { label: "schedules", href: "/schedules" },
  { label: "speakers", href: "/speakers" },
  {
    label: "blog",
    href: "/blog",
    submenu: [
      { label: "blogList", href: "/blog" }, 
      { label: "latestArticle", href: "/blog/latest" }, 
    ],
  },
  { label: "contact", href: "/contact" },
  { label: "subscriptions", href: "/subscriptions" },
];

export async function getHeaderData(locale: string = 'en'): Promise<HeaderItem[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/blog?limit=3`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    const posts = data?.data || [];

    const blogSubmenu = [
      { 
        label: "blogList", 
        href: "/blog" 
      },
      ...posts.map((post: any) => ({
        label: post.title,
        href: `/blog/${post.slug}`,
        // إضافة خاصية لتحديد أن هذا عنوان من API ولا يحتاج ترجمة
        isDynamic: true
      })),
    ];

    return [
      { label: "homepage", href: "/" },
      { label: "schedules", href: "/schedules" },
      { label: "speakers", href: "/speakers" },
      {
        label: "blog",
        href: "/blog",
        submenu: blogSubmenu,
      },
      { label: "contact", href: "/contact" },
      { label: "subscriptions", href: "/subscriptions" },
    ];
  } catch (err) {
    console.error("Error fetching blog menu:", err);
    return defaultHeaderData;
  }
}