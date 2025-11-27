// components/BlogsAdmin.tsx
"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Calendar,
  Edit,
  Trash2,
  Plus,
  FileText,
  Eye,
  Clock,
  Tag,
  User,
  TrendingUp,
  BookOpen,
  Zap,
  CheckCircle,
  Languages,
} from "lucide-react";
import Modal from "./Modal";
import BlogForm from "./BlogForm";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";

interface BlogPost {
  _id: string;
  title_ar: string;
  title_en: string;
  slug: string;
  body_ar: string;
  body_en: string;
  image: string;
  imageAlt_ar: string;
  imageAlt_en: string;
  category_ar: string;
  category_en: string;
  excerpt_ar: string;
  excerpt_en: string;
  publishDate: string;
  author: {
    name_ar: string;
    name_en: string;
    avatar: string;
    role: string;
  };
  tags_ar: string[];
  tags_en: string[];
  featured: boolean;
  readTime: number;
  status: "draft" | "published";
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function BlogsAdmin() {
  const { t } = useI18n();
  const { locale } = useLocale();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [displayLanguage, setDisplayLanguage] = useState<"ar" | "en">(locale as "ar" | "en");

  // دالة لتنسيق التاريخ
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // الحصول على حالة المقال
  const getBlogStatus = (blog: BlogPost) => {
    const now = new Date();
    const publishDate = new Date(blog.publishDate);

    if (blog.status === "draft") return "draft";
    if (publishDate > now) return "scheduled";
    return "published";
  };

  // دالة لاختيار البيانات بناءً على اللغة المحددة
  const getLocalizedData = (blog: BlogPost) => {
    return {
      title: displayLanguage === "ar" ? blog.title_ar : blog.title_en,
      excerpt: displayLanguage === "ar" ? blog.excerpt_ar : blog.excerpt_en,
      category: displayLanguage === "ar" ? blog.category_ar : blog.category_en,
      authorName: displayLanguage === "ar" ? blog.author.name_ar : blog.author.name_en,
      tags: displayLanguage === "ar" ? blog.tags_ar : blog.tags_en,
      imageAlt: displayLanguage === "ar" ? blog.imageAlt_ar : blog.imageAlt_en,
    };
  };

  const loadBlogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/blog", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setBlogs(json.data);
      }
    } catch (err) {
      console.error("Error loading blogs:", err);
      toast.error(t('blog.failedToLoad') || "Failed to load blogs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  const onSaved = async () => {
    await loadBlogs();
    toast.success(t('blog.savedSuccess') || "Blog post saved successfully");
  };

  const onEdit = (blog: BlogPost) => {
    setEditing(blog);
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    const deleteConfirm = t('blog.deleteConfirm') || "Are you sure you want to delete this blog post?";
    const deleteWarning = t('blog.deleteWarning') || "This action cannot be undone and will remove the post permanently.";
    const cancelText = t('common.cancel') || "Cancel";
    const deleteText = t('common.delete') || "Delete";
    const deletedSuccess = t('blog.deletedSuccess') || "Blog post deleted successfully";
    const deleteFailed = t('blog.deleteFailed') || "Failed to delete the blog post";
    const deleteError = t('blog.deleteError') || "Error deleting blog post";

    toast(
      (toastInstance) => (
        <div className="w-404 max-w-full bg-white dark:bg-darkmode text-MidnightNavyText dark:text-white rounded-14 shadow-round-box border-none outline-none dark:border-dark_border p-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600 font-bold">
              !
            </div>
            <div className="flex-1">
              <p className="text-16 font-semibold">
                {deleteConfirm}
              </p>
              <p className="text-14 mt-1 text-slate-500 dark:text-darktext">
                {deleteWarning}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              className="px-3 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded-14 text-15 hover:opacity-90 border border-PeriwinkleBorder/50"
              onClick={() => toast.dismiss(toastInstance.id)}
            >
              {cancelText}
            </button>
            <button
              className="px-3 py-1 bg-red-600 text-white rounded-14 text-15 hover:bg-red-700 shadow-sm"
              onClick={async () => {
                toast.dismiss(toastInstance.id);
                try {
                  const res = await fetch(
                    `/api/blog/${encodeURIComponent(id)}`,
                    {
                      method: "DELETE",
                    }
                  );
                  if (res.ok) {
                    setBlogs((prev) => prev.filter((b) => b._id !== id));
                    toast.success(deletedSuccess);
                  } else {
                    toast.error(deleteFailed);
                  }
                } catch (err) {
                  console.error("Error deleting blog:", err);
                  toast.error(deleteError);
                }
              }}
            >
              {deleteText}
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: "top-center" }
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm p-6 border border-PowderBlueBorder dark:border-dark_border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-MidnightNavyText dark:text-white flex items-center gap-3">
              <FileText className="w-7 h-7 text-primary" />
              {t('blog.management') || "Blog Management"}
            </h1>
            <p className="text-sm text-SlateBlueText dark:text-darktext max-w-2xl">
              {t('blog.managementDescription') || "Create, edit, and manage your blog posts. Publish engaging content for your audience."}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4 lg:mt-0">
            {/* Language Selector */}
            <div className="flex items-center gap-2 bg-IcyBreeze dark:bg-dark_input rounded-lg p-1">
              <button
                onClick={() => setDisplayLanguage("ar")}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${displayLanguage === "ar"
                    ? "bg-primary text-white"
                    : "text-SlateBlueText dark:text-darktext hover:text-MidnightNavyText dark:hover:text-white"
                  }`}
              >
                العربية
              </button>
              <button
                onClick={() => setDisplayLanguage("en")}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${displayLanguage === "en"
                    ? "bg-primary text-white"
                    : "text-SlateBlueText dark:text-darktext hover:text-MidnightNavyText dark:hover:text-white"
                  }`}
              >
                English
              </button>
            </div>

            <button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('blog.addNew') || "New Blog Post"}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                {t('blog.totalPosts') || "Total Posts"}
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {blogs.length}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                {t('blog.published') || "Published"}
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {blogs.filter((b) => b.status === "published").length}
              </p>
            </div>
            <div className="w-10 h-10 bg-ElectricAqua/10 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 text-ElectricAqua" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                {t('blog.totalViews') || "Total Views"}
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {blogs.reduce((acc, b) => acc + b.viewCount, 0)}
              </p>
            </div>
            <div className="w-10 h-10 bg-Aquamarine/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-Aquamarine" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                {t('blog.avgReadTime') || "Avg. Read Time"}
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {blogs.length > 0
                  ? Math.round(blogs.reduce((acc, b) => acc + b.readTime, 0) / blogs.length)
                  : 0} {t('common.minRead') || "min"}
              </p>
            </div>
            <div className="w-10 h-10 bg-LightYellow/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-LightYellow" />
            </div>
          </div>
        </div>
      </div>

      {/* Blogs Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {blogs.map((blog) => {
          const status = getBlogStatus(blog);
          const localized = getLocalizedData(blog);

          const statusColors = {
            published: "bg-Aquamarine/20 text-Salem dark:bg-Aquamarine/30",
            scheduled: "bg-LightYellow/20 text-amber-700 dark:bg-LightYellow/30",
            draft: "bg-SlateBlueText/20 text-SlateBlueText dark:bg-darktext/30",
          };

          const statusText = {
            published: t('blog.status.published') || "Published",
            scheduled: t('blog.status.scheduled') || "Scheduled",
            draft: t('blog.status.draft') || "Draft",
          };

          return (
            <div
              key={blog._id}
              className={`relative rounded-xl border overflow-hidden transition-all duration-300 hover:shadow-md ${status === "published"
                  ? "border-primary bg-gradient-to-br from-primary/5 to-primary/10"
                  : "border-PowderBlueBorder bg-white dark:bg-darkmode dark:border-dark_border"
                }`}
            >
              {/* Blog Image */}
              {blog.image && (
                <div className="h-40 bg-gray-200 dark:bg-dark_input overflow-hidden">
                  <img
                    src={blog.image}
                    alt={localized.imageAlt || localized.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6">
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${statusColors[status]}`}
                  >
                    <CheckCircle className="w-3 h-3" />
                    {statusText[status]}
                  </span>
                </div>

                {/* Language Indicator */}
                <div className="absolute top-4 left-4">
                  <div className="flex items-center gap-1 bg-white/90 dark:bg-darkmode/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs">
                    <Languages className="w-3 h-3" />
                    <span className="font-medium">{displayLanguage.toUpperCase()}</span>
                  </div>
                </div>

                {/* Blog Header */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-2 line-clamp-2">
                    {localized.title}
                  </h3>
                  <p className="text-sm text-SlateBlueText dark:text-darktext line-clamp-2">
                    {localized.excerpt}
                  </p>
                </div>

                {/* Meta Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(blog.publishDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                    <Clock className="w-4 h-4" />
                    <span>{blog.readTime} {t('common.minRead') || "min read"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                    <User className="w-4 h-4" />
                    <span>{localized.authorName || t('common.author') || "Unknown Author"}</span>
                  </div>
                </div>

                {/* Category & Tags */}
                {localized.category && (
                  <div className="mb-3">
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                      {localized.category}
                    </span>
                  </div>
                )}

                {/* Tags */}
                {localized.tags && localized.tags.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {localized.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                      {localized.tags.length > 3 && (
                        <span className="px-2 py-1 bg-PaleCyan dark:bg-dark_input text-SlateBlueText dark:text-darktext rounded text-xs">
                          +{localized.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-SlateBlueText dark:text-darktext mb-4">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{blog.viewCount} {t('common.views') || "views"}</span>
                  </div>
                  {blog.featured && (
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>{t('blog.featured') || "Featured"}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Edit */}
                    <button
                      onClick={() => onEdit(blog)}
                      className="w-full bg-primary hover:bg-primary/90 text-white py-2 px-3 rounded-lg font-semibold text-sm transition-transform transition-shadow duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary/30 flex items-center justify-center gap-2 group"
                    >
                      <Edit className="w-3 h-3 transition-transform duration-300 group-hover:-translate-y-0.5" />
                      {t('common.edit') || "Edit"}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => onDelete(blog._id)}
                      className="bg-SlateBlueText/10 hover:bg-SlateBlueText/20 dark:bg-darktext/20 dark:hover:bg-darktext/30 text-SlateBlueText dark:text-darktext py-2 px-3 rounded-lg font-semibold text-xs transition-transform transition-colors transition-shadow duration-300 hover:scale-105 active:scale-100 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-SlateBlueText/20 flex items-center justify-center gap-2 group"
                    >
                      <Trash2 className="w-3 h-3 transition-transform duration-300 group-hover:rotate-12" />
                      {t('common.delete') || "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {blogs.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-3">
            {t('blog.noPosts') || "No blog posts yet"}
          </h3>
          <p className="text-sm text-SlateBlueText dark:text-darktext mb-6 max-w-md mx-auto">
            {t('blog.createFirst') || "Create your first blog post to start sharing knowledge and engaging with your audience."}
          </p>
          <button
            onClick={() => setOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            {t('blog.createFirstButton') || "Create Your First Post"}
          </button>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={open}
        title={editing ? (t('blog.editPost') || "Edit Blog Post") : (t('blog.createPost') || "Create New Blog Post")}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
      >
        <BlogForm
          initial={editing}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          onSaved={onSaved}
        />
      </Modal>
    </div>
  );
}