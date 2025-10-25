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
} from "lucide-react";
import Modal from "./Modal";
import BlogForm from "./BlogForm";

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  body: string;
  image: string;
  imageAlt: string;
  category: string;
  excerpt: string;
  publishDate: string;
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  tags: string[];
  featured: boolean;
  readTime: number;
  status: "draft" | "published";
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function BlogsAdmin() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);

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
      toast.error("Failed to load blogs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  const onSaved = async () => {
    await loadBlogs();
    toast.success("Blog post saved successfully");
  };

  const onEdit = (blog: BlogPost) => {
    setEditing(blog);
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    toast(
      (t) => (
        <div className="w-404 max-w-full bg-white dark:bg-darkmode text-MidnightNavyText dark:text-white rounded-14 shadow-round-box border-none outline-none dark:border-dark_border p-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600 font-bold">
              !
            </div>
            <div className="flex-1">
              <p className="text-16 font-semibold">
                Are you sure you want to delete this blog post?
              </p>
              <p className="text-14 mt-1 text-slate-500 dark:text-darktext">
                This action cannot be undone and will remove the post permanently.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              className="px-3 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded-14 text-15 hover:opacity-90 border border-PeriwinkleBorder/50"
              onClick={() => toast.dismiss(t.id)}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1 bg-red-600 text-white rounded-14 text-15 hover:bg-red-700 shadow-sm"
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  const res = await fetch(
                    `/api/blog/${encodeURIComponent(id)}`,
                    {
                      method: "DELETE",
                    }
                  );
                  if (res.ok) {
                    setBlogs((prev) => prev.filter((b) => b._id !== id));
                    toast.success("Blog post deleted successfully");
                  } else {
                    toast.error("Failed to delete the blog post");
                  }
                } catch (err) {
                  console.error("Error deleting blog:", err);
                  toast.error("Error deleting blog post");
                }
              }}
            >
              Delete
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
              Blog Management
            </h1>
            <p className="text-sm text-SlateBlueText dark:text-darktext max-w-2xl">
              Create, edit, and manage your blog posts. Publish engaging content for your audience.
            </p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="mt-4 lg:mt-0 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Blog Post
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                Total Posts
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
                Published
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
                Total Views
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
                Avg. Read Time
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {blogs.length > 0
                  ? Math.round(blogs.reduce((acc, b) => acc + b.readTime, 0) / blogs.length)
                  : 0} min
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
          const statusColors = {
            published: "bg-Aquamarine/20 text-Salem dark:bg-Aquamarine/30",
            scheduled: "bg-LightYellow/20 text-amber-700 dark:bg-LightYellow/30",
            draft: "bg-SlateBlueText/20 text-SlateBlueText dark:bg-darktext/30",
          };

          const statusText = {
            published: "Published",
            scheduled: "Scheduled",
            draft: "Draft",
          };

          return (
            <div
              key={blog._id}
              className={`relative rounded-xl border overflow-hidden transition-all duration-300 hover:shadow-md ${
                status === "published"
                  ? "border-primary bg-gradient-to-br from-primary/5 to-primary/10"
                  : "border-PowderBlueBorder bg-white dark:bg-darkmode dark:border-dark_border"
              }`}
            >
              {/* Blog Image */}
              {blog.image && (
                <div className="h-40 bg-gray-200 dark:bg-dark_input overflow-hidden">
                  <img
                    src={blog.image}
                    alt={blog.imageAlt || blog.title}
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

                {/* Blog Header */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-2 line-clamp-2">
                    {blog.title}
                  </h3>
                  <p className="text-sm text-SlateBlueText dark:text-darktext line-clamp-2">
                    {blog.excerpt}
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
                    <span>{blog.readTime} min read</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                    <User className="w-4 h-4" />
                    <span>{blog.author?.name || "Unknown Author"}</span>
                  </div>
                </div>

                {/* Category & Tags */}
                {blog.category && (
                  <div className="mb-3">
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                      {blog.category}
                    </span>
                  </div>
                )}

                {/* Tags */}
                {blog.tags && blog.tags.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {blog.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                      {blog.tags.length > 3 && (
                        <span className="px-2 py-1 bg-PaleCyan dark:bg-dark_input text-SlateBlueText dark:text-darktext rounded text-xs">
                          +{blog.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-SlateBlueText dark:text-darktext mb-4">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{blog.viewCount} views</span>
                  </div>
                  {blog.featured && (
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>Featured</span>
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
                      Edit
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => onDelete(blog._id)}
                      className="bg-SlateBlueText/10 hover:bg-SlateBlueText/20 dark:bg-darktext/20 dark:hover:bg-darktext/30 text-SlateBlueText dark:text-darktext py-2 px-3 rounded-lg font-semibold text-xs transition-transform transition-colors transition-shadow duration-300 hover:scale-105 active:scale-100 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-SlateBlueText/20 flex items-center justify-center gap-2 group"
                    >
                      <Trash2 className="w-3 h-3 transition-transform duration-300 group-hover:rotate-12" />
                      Delete
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
            No blog posts yet
          </h3>
          <p className="text-sm text-SlateBlueText dark:text-darktext mb-6 max-w-md mx-auto">
            Create your first blog post to start sharing knowledge and engaging with your audience.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Create Your First Post
          </button>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={open}
        title={editing ? "Edit Blog Post" : "Create New Blog Post"}
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