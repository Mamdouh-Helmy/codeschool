"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { BlogPost, BlogFilters } from "@/lib/types";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";

const DynamicBlog = () => {
  const { t } = useI18n();
  const { formatDate } = useLocale();

  const [filters, setFilters] = useState<BlogFilters>({
    search: "",
    category: "",
    tags: [],
    featured: undefined,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"api" | "fallback">("api");

  // ✅ جلب المقالات من الـ API الحقيقي
  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: "6",
        });

        if (filters.search) params.append("search", filters.search);
        if (filters.category) params.append("category", filters.category);
        if (filters.featured !== undefined)
          params.append("featured", String(filters.featured));
        if (filters.tags?.length) params.append("tags", filters.tags.join(","));

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || ""}/api/blog?${params.toString()}`,
          { cache: "no-store" }
        );

        const text = await res.text();
        let data: any = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          console.warn("⚠️ DynamicBlog: response was not JSON");
          data = {};
        }

        if (data?.data) {
          setPosts(data.data);
          setPagination(data.pagination || { totalPages: 1, hasNext: false, hasPrev: false });
          setSource("api");
        } else {
          setPosts([]);
          setSource("fallback");
        }
      } catch (err) {
        console.error("Error fetching blog posts:", err);
        setError("Failed to load blog posts");
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, [filters, currentPage]);

  // الفئات والوسوم
  const categories = [
    "Tutorial",
    "Career",
    "Design",
    "DevOps",
    "Mobile Development",
    "Technology",
    "Data Science",
  ];

  const popularTags = [
    "Web Development",
    "React",
    "JavaScript",
    "Python",
    "Career",
    "Tutorial",
    "Design",
    "Mobile Development",
  ];

  // إدارة الفلاتر
  const handleFilterChange = (key: keyof BlogFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };

  const handleTagToggle = (tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags?.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...(prev.tags || []), tag],
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      category: "",
      tags: [],
      featured: undefined,
    });
    setCurrentPage(1);
  };

  const formatDateLocalized = (dateString: string) =>
    formatDate(dateString, { year: "numeric", month: "long", day: "numeric" });

  const getCategoryColor = (category: string) => {
    const colors = {
      Tutorial: "bg-blue-100 text-blue-800",
      Career: "bg-green-100 text-green-800",
      Design: "bg-purple-100 text-purple-800",
      DevOps: "bg-orange-100 text-orange-800",
      "Mobile Development": "bg-pink-100 text-pink-800",
      Technology: "bg-gray-100 text-gray-800",
      "Data Science": "bg-indigo-100 text-indigo-800",
    };
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  // ✅ حالة التحميل
  if (loading) {
    return (
      <section className="bg-LightSkyBlue dark:bg-darklight py-20">
        <div className="container">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              {t("blog.loading") || "Loading blog posts..."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  // ✅ حالة الخطأ
  if (error) {
    return (
      <section className="bg-LightSkyBlue dark:bg-darklight py-20">
        <div className="container text-center text-red-500">{error}</div>
      </section>
    );
  }

  // ✅ نفس التصميم تماماً (بدون أي حذف)
  return (
    <section className="bg-LightSkyBlue dark:bg-darklight py-20">
      <div className="container">
        {source === "fallback" && (
          <div className="rounded-xl border border-yellow-500/40 bg-yellow-50 px-4 py-3 text-sm text-yellow-700 dark:border-yellow-500/40 dark:bg-yellow-500/10 dark:text-yellow-200 mb-8">
            ⚠️ {t("blog.cachedNotice") || "Displaying cached blog posts. Some content may be outdated."}
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-16">
          <h2 
            data-aos="fade-up" 
            data-aos-delay="200" 
            data-aos-duration="1000"
            className="text-4xl md:text-5xl font-bold text-MidnightNavyText dark:text-white mb-4"
          >
            {t('blog.latest') || 'Latest Blog Posts'}
          </h2>
          <p 
            data-aos="fade-up" 
            data-aos-delay="300" 
            data-aos-duration="1000"
            className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto"
          >
            {t('blog.subtitle') || 'Stay updated with the latest insights, tutorials, and trends in technology and programming.'}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-darkmode rounded-2xl shadow-lg p-6 mb-12">
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('blog.search') || 'Search'}</label>
              <input
                type="text"
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder={t('blog.searchPlaceholder') || 'Search posts...'}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('blog.category') || 'Category'}</label>
              <select
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">{t('blog.allCategories') || 'All Categories'}</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('blog.featured') || 'Featured'}</label>
              <select
                value={filters.featured === undefined ? '' : filters.featured.toString()}
                onChange={(e) => handleFilterChange('featured', e.target.value === '' ? undefined : e.target.value === 'true')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">{t('blog.allPosts') || 'All Posts'}</option>
                <option value="true">{t('blog.featuredOnly') || 'Featured Only'}</option>
                <option value="false">{t('blog.notFeatured') || 'Not Featured'}</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                {t('blog.clearFilters') || 'Clear Filters'}
              </button>
            </div>
          </div>

          {/* Popular Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('blog.popularTags') || 'Popular Tags'}</label>
            <div className="flex flex-wrap gap-2">
              {popularTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors duration-200 ${
                    filters.tags?.includes(tag)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {posts.map((post: BlogPost, index: number) => (
            <article
              key={post.id}
              data-aos="fade-up"
              data-aos-delay={`${index * 100 + 400}`}
              data-aos-duration="1000"
              className="bg-white dark:bg-darkmode rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer"
              onClick={() => setSelectedPost(post)}
            >
              {/* Featured Badge */}
              {post.featured && (
                <div className="absolute top-4 left-4 z-10">
                  <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Featured
                  </span>
                </div>
              )}

              {/* Post Image */}
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={post.image}
                  alt={post.imageAlt || post.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Post Content */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(post.category)}`}>
                    {post.category}
                  </span>
                  <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {post.readTime} {t('blog.minRead') || 'min read'}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-MidnightNavyText dark:text-white mb-3 group-hover:text-primary transition-colors duration-200 line-clamp-2">
                  {post.title}
                </h3>

                <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                  {post.excerpt}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Image
                      src={post.author.avatar || "/images/authors/default.jpg"}
                      alt={post.author.name}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                    <div>
                      <p className="text-sm font-medium text-MidnightNavyText dark:text-white">
                        {post.author.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDateLocalized(post.publishDate || post.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {post.viewCount}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-4">
                  {post.tags.slice(0, 3).map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {post.tags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded">
                      +{post.tags.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Empty State */}
        {posts.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No posts found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Try adjusting your filters or check back later for new content.
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center items-center space-x-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={!pagination.hasPrev}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              Previous
            </button>
            
            <div className="flex space-x-2">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg transition-colors duration-200 ${
                    page === currentPage
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
              disabled={!pagination.hasNext}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              Next
            </button>
          </div>
        )}

        {/* Blog Post Modal */}
        {selectedPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-darkmode rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(selectedPost.category)}`}>
                        {selectedPost.category}
                      </span>
                      {selectedPost.featured && (
                        <span className="px-2 py-1 bg-primary text-white text-xs rounded-full">
                          Featured
                        </span>
                      )}
                    </div>
                    <h1 className="text-3xl font-bold text-MidnightNavyText dark:text-white mb-4">
                      {selectedPost.title}
                    </h1>
                    <div className="flex items-center space-x-6 text-gray-500 dark:text-gray-400 mb-6">
                      <div className="flex items-center space-x-2">
                        <Image
                          src={selectedPost.author.avatar || "/images/authors/default.jpg"}
                          alt={selectedPost.author.name}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                        <div>
                          <p className="font-medium text-MidnightNavyText dark:text-white">
                            {selectedPost.author.name}
                          </p>
                          <p className="text-sm">
                            {formatDate(selectedPost.publishDate || selectedPost.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    <span>{selectedPost.readTime} {t('blog.minRead') || 'min read'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>{selectedPost.viewCount} {t('blog.views') || 'views'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl ml-4"
                  >
                    ×
                  </button>
                </div>

                <div className="relative h-64 mb-8 rounded-lg overflow-hidden">
                  <Image
                    src={selectedPost.image}
                    alt={selectedPost.imageAlt || selectedPost.title}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <div dangerouslySetInnerHTML={{ __html: selectedPost.body }} />
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap gap-2">
                    {selectedPost.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default DynamicBlog;

