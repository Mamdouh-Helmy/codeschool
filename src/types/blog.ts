export type Author = {
  name: string;
  avatar?: string;
};



// src/types/blog.ts
export interface BlogAuthor {
  name_ar?: string;
  name_en?: string;
  email?: string;
  avatar?: string;
  role?: string;
}

export interface Blog {
  _id: string;
  title_ar?: string;
  title_en?: string;
  body_ar?: string;
  body_en?: string;
  excerpt_ar?: string;
  excerpt_en?: string;
  imageAlt_ar?: string;
  imageAlt_en?: string;
  category_ar?: string;
  category_en?: string;
  image?: string;
  slug: string;
  publishDate?: string;
  createdAt?: string;
  author?: BlogAuthor;
  tags_ar?: string[];
  tags_en?: string[];
  featured?: boolean;
  readTime?: number;
  status: "draft" | "published";
  viewCount?: number;
}