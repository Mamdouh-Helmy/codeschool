export type Author = {
  name: string;
  avatar?: string;
};

export type Blog = {
  id?: number;
  title?: string;
  slug?: string;
  excerpt?: string;
  coverImage?: string;
  date: string;
  publishDate?: string;
  createdAt?: string;
  image?: string;
  author?: Author;
};
