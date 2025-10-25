"use client";
import { useState, useEffect } from "react";
import {
  Calendar,
  FileText,
  Image,
  Tag,
  User,
  Upload,
  X,
  Save,
  Rocket,
  Plus,
  Trash2,
  Eye,
  Clock,
  Mail,
  Shield,
} from "lucide-react";

interface Props {
  initial?: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function BlogForm({ initial, onClose, onSaved }: Props) {
  // دالة لتحويل التاريخ من ISO إلى تنسيق date
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const [form, setForm] = useState(() => ({
    title: initial?.title || "",
    body: initial?.body || "",
    image: initial?.image || "",
    imageAlt: initial?.imageAlt || "",
    category: initial?.category || "",
    excerpt: initial?.excerpt || "",
    publishDate: formatDateForInput(initial?.publishDate),
    author: {
      name: initial?.author?.name || "",
      email: initial?.author?.email || "",
      avatar: initial?.author?.avatar || "",
      role: initial?.author?.role || "Author",
    },
    tags: initial?.tags || [],
    featured: initial?.featured || false,
    status: initial?.status || "draft",
  }));

  const [tags, setTags] = useState<string[]>(initial?.tags || []);
  const [newTagInput, setNewTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [authorAvatarPreview, setAuthorAvatarPreview] = useState("");

  // معاينة الصور
  useEffect(() => {
    if (form.image) {
      setImagePreview(form.image);
    }
    if (form.author.avatar) {
      setAuthorAvatarPreview(form.author.avatar);
    }
  }, [form.image, form.author.avatar]);

  const onChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onChangeAuthor = (field: string, value: any) => {
    setForm((prev) => ({ 
      ...prev, 
      author: { ...prev.author, [field]: value } 
    }));
  };

  // إضافة tag جديد
  const addTag = () => {
    const tag = newTagInput.trim();
    if (tag && !tags.includes(tag)) {
      const updatedTags = [...tags, tag];
      setTags(updatedTags);
      setNewTagInput("");
      onChange("tags", updatedTags);
    }
  };

  // حذف tag
  const removeTag = (index: number) => {
    const updatedTags = tags.filter((_, i) => i !== index);
    setTags(updatedTags);
    onChange("tags", updatedTags);
  };

  // إدخال بالزر Enter للـ tags
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  // معالجة رفع صورة المقال
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        onChange("image", result);
      };
      reader.readAsDataURL(file);
    }
  };

  // معالجة رفع صورة المؤلف
  const handleAuthorAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setAuthorAvatarPreview(result);
        onChangeAuthor("avatar", result);
      };
      reader.readAsDataURL(file);
    }
  };

  // توليد excerpt تلقائياً من النص
  const generateExcerpt = (body: string) => {
    const plain = body.replace(/<[^>]*>/g, "");
    return plain.length > 150 ? plain.substring(0, 150) + "..." : plain;
  };

  // عند تغيير النص، توليد excerpt تلقائياً
  const handleBodyChange = (value: string) => {
    onChange("body", value);
    if (!form.excerpt || form.excerpt === generateExcerpt(form.body)) {
      onChange("excerpt", generateExcerpt(value));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...form,
        tags,
        publishDate: form.publishDate
          ? new Date(form.publishDate).toISOString()
          : new Date().toISOString(),
      };

      console.log("Sending blog payload:", payload);

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required. Please log in.");
      }

      const method = initial?._id ? "PUT" : "POST";
      const url = initial?._id
        ? `/api/blog/${encodeURIComponent(initial._id)}`
        : "/api/blog";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();

      if (!res.ok) {
        let errorMessage = `HTTP error! status: ${res.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // إذا كان الرد ناجحاً، تابع
      try {
        const result = JSON.parse(responseText);
        if (result.success) {
          onSaved();
          onClose();
        } else {
          throw new Error(result.message || "Operation failed");
        }
      } catch (parseError) {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      console.error("Error:", err);
      alert(`An error occurred: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6 ">
      {/* Basic Information */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              Blog Information
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              Basic details about the blog post
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <FileText className="w-3 h-3 text-primary" />
            Title *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="Enter blog post title"
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <FileText className="w-3 h-3 text-primary" />
            Excerpt
          </label>
          <textarea
            value={form.excerpt}
            onChange={(e) => onChange("excerpt", e.target.value)}
            rows={2}
            placeholder="Brief description of the blog post (auto-generated from content)"
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 resize-none transition-all duration-200"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <FileText className="w-3 h-3 text-primary" />
            Category
          </label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => onChange("category", e.target.value)}
            placeholder="e.g., Technology, Business, Design"
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
          />
        </div>
      </div>

      {/* Author Information */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-Aquamarine/10 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-Aquamarine" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              Author Information
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              Details about the author of this blog post
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <User className="w-3 h-3 text-Aquamarine" />
              Author Name *
            </label>
            <input
              type="text"
              value={form.author.name}
              onChange={(e) => onChangeAuthor("name", e.target.value)}
              placeholder="Author name"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Mail className="w-3 h-3 text-Aquamarine" />
              Author Email
            </label>
            <input
              type="email"
              value={form.author.email}
              onChange={(e) => onChangeAuthor("email", e.target.value)}
              placeholder="author@example.com"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Shield className="w-3 h-3 text-Aquamarine" />
              Author Role
            </label>
            <select
              value={form.author.role}
              onChange={(e) => onChangeAuthor("role", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            >
              <option value="Author">Author</option>
              <option value="Editor">Editor</option>
              <option value="Contributor">Contributor</option>
              <option value="Admin">Admin</option>
              <option value="Guest">Guest Writer</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Image className="w-3 h-3 text-Aquamarine" />
              Author Avatar
            </label>
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <input
                  type="text"
                  value={form.author.avatar}
                  onChange={(e) => onChangeAuthor("avatar", e.target.value)}
                  placeholder="Avatar URL or upload file"
                  className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                />
                <div className="mt-2">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-Aquamarine/10 text-Aquamarine rounded-lg text-12 cursor-pointer hover:bg-Aquamarine/20 transition-colors">
                    <Upload className="w-3 h-3" />
                    Upload Avatar
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAuthorAvatarUpload}
                      className="hidden"
                    />
                  </label>
                  {authorAvatarPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        onChangeAuthor("avatar", "");
                        setAuthorAvatarPreview("");
                      }}
                      className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-12 cursor-pointer hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
              
              {authorAvatarPreview && (
                <div className="w-16 h-16 border border-PowderBlueBorder rounded-full overflow-hidden">
                  <img
                    src={authorAvatarPreview}
                    alt="Author Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-LightYellow/10 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-LightYellow" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              Content
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              Main content of the blog post (HTML/Markdown supported)
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
            Body Content *
          </label>
          <textarea
            value={form.body}
            onChange={(e) => handleBodyChange(e.target.value)}
            rows={8}
            placeholder="Write your blog post content here... HTML and Markdown are supported."
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 resize-none transition-all duration-200 font-mono"
            required
          />
        </div>
      </div>

      {/* Media */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-ElectricAqua/10 rounded-lg flex items-center justify-center">
            <Image className="w-4 h-4 text-ElectricAqua" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              Media
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              Featured image for the blog post
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
            Featured Image
          </label>

          <div className="flex gap-4 items-start">
            <div className="flex-1">
              <input
                type="text"
                value={form.image}
                onChange={(e) => onChange("image", e.target.value)}
                placeholder="Image URL or upload file"
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              />
              <div className="mt-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-12 cursor-pointer hover:bg-primary/20 transition-colors">
                  <Upload className="w-3 h-3" />
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("image", "");
                      setImagePreview("");
                    }}
                    className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-12 cursor-pointer hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </button>
                )}
              </div>
            </div>

            {imagePreview && (
              <div className="w-20 h-20 border border-PowderBlueBorder rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Blog Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
            Image Alt Text
          </label>
          <input
            type="text"
            value={form.imageAlt}
            onChange={(e) => onChange("imageAlt", e.target.value)}
            placeholder="Description of the image for accessibility"
            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
          />
        </div>
      </div>

      {/* باقي الأقسام تبقى كما هي (Schedule & Settings, Tags, Action Buttons) */}
      {/* Schedule & Settings */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              Schedule & Settings
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              Publishing options and post settings
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Calendar className="w-3 h-3 text-primary" />
              Publish Date
            </label>
            <input
              type="date"
              value={form.publishDate}
              onChange={(e) => onChange("publishDate", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Eye className="w-3 h-3 text-primary" />
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => onChange("status", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
          <label className="flex items-center space-x-3 p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-IcyBreeze dark:hover:bg-dark_input transition-all duration-200 cursor-pointer group">
            <div className="w-8 h-8 bg-Aquamarine/10 rounded flex items-center justify-center group-hover:bg-Aquamarine/20 transition-colors">
              <Eye className="w-3 h-3 text-Aquamarine" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => onChange("featured", e.target.checked)}
                  className="w-4 h-4 text-Aquamarine focus:ring-Aquamarine border-PowderBlueBorder rounded"
                />
                <span className="text-13 font-medium text-MidnightNavyText dark:text-white">
                  Featured Post
                </span>
              </div>
              <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">
                Highlight this post as featured on the blog homepage
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Tag className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              Tags
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              Add tags for better categorization and search
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyPress={handleTagKeyPress}
                placeholder="Enter a tag (e.g., React, JavaScript, Web Development)"
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              />
            </div>
            <button
              type="button"
              onClick={addTag}
              disabled={!newTagInput.trim()}
              className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-13 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {tags.length > 0 && (
            <div className="space-y-2">
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white">
                Added Tags:
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white px-3 py-2 rounded-lg text-13"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-11 text-SlateBlueText dark:text-darktext">
            Press Enter or click Add to include multiple tags
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 hover:bg-IcyBreeze dark:hover:bg-darklight hover:shadow-md flex items-center justify-center gap-2"
        >
          <X className="w-3 h-3" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : initial ? (
            <>
              <Save className="w-3 h-3" />
              Update Post
            </>
          ) : (
            <>
              <Rocket className="w-3 h-3" />
              Create Post
            </>
          )}
        </button>
      </div>
    </form>
  );
}