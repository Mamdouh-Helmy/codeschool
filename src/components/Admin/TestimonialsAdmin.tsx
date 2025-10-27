"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  User,
  Star,
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  Award,
  Users,
  TrendingUp,
  Filter,
  Search,
} from "lucide-react";
import Modal from "./Modal";
import TestimonialForm from "./TestimonialForm";

interface Testimonial {
  _id: string;
  userId: string;
  studentName: string;
  studentImage: string;
  courseId: string;
  courseTitle: string;
  rating: number;
  comment: string;
  featured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TestimonialsAdmin() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFeatured, setFilterFeatured] = useState<boolean | null>(null);

  // دالة لتنسيق التاريخ
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // تحميل التوصيات
  const loadTestimonials = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/testimonials?limit=100", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setTestimonials(json.data);
      }
    } catch (err) {
      console.error("Error loading testimonials:", err);
      toast.error("Failed to load testimonials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTestimonials();
  }, []);

  const onSaved = async () => {
    await loadTestimonials();
    toast.success("Testimonial saved successfully");
  };

  const onEdit = (testimonial: Testimonial) => {
    setEditing(testimonial);
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
                Are you sure you want to delete this testimonial?
              </p>
              <p className="text-14 mt-1 text-slate-500 dark:text-darktext">
                This action cannot be undone.
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
                    `/api/testimonials?id=${encodeURIComponent(id)}`,
                    {
                      method: "DELETE",
                    }
                  );
                  if (res.ok) {
                    setTestimonials((prev) => prev.filter((t) => t._id !== id));
                    toast.success("Testimonial deleted successfully");
                  } else {
                    toast.error("Failed to delete the testimonial");
                  }
                } catch (err) {
                  console.error("Error deleting testimonial:", err);
                  toast.error("Error deleting testimonial");
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

 
const filteredTestimonials = testimonials.filter((testimonial) => {
  const searchTermLower = searchTerm.toLowerCase();
  
  const matchesSearch = 
    (testimonial.studentName?.toLowerCase() || '').includes(searchTermLower) ||
    (testimonial.courseTitle?.toLowerCase() || '').includes(searchTermLower) ||
    (testimonial.comment?.toLowerCase() || '').includes(searchTermLower);
  
  const matchesFeatured = filterFeatured === null || testimonial.featured === filterFeatured;
  
  return matchesSearch && matchesFeatured;
});
 
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < rating
            ? "text-yellow-400 fill-yellow-400"
            : "text-gray-300 dark:text-gray-600"
        }`}
      />
    ));
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
              <MessageSquare className="w-7 h-7 text-primary" />
              Testimonials Management
            </h1>
            <p className="text-sm text-SlateBlueText dark:text-darktext max-w-2xl">
              Manage student testimonials and reviews. Showcase positive feedback to build trust with potential students.
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
            Add New Testimonial
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                Total Testimonials
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {testimonials.length}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                Featured
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {testimonials.filter((t) => t.featured).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-ElectricAqua/10 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-ElectricAqua" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                Avg. Rating
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {testimonials.length > 0
                  ? (testimonials.reduce((acc, t) => acc + t.rating, 0) / testimonials.length).toFixed(1)
                  : "0.0"}
              </p>
            </div>
            <div className="w-10 h-10 bg-Aquamarine/10 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-Aquamarine fill-Aquamarine" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                Active
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {testimonials.filter((t) => t.isActive).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-LightYellow/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-LightYellow" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-darkmode rounded-xl p-6 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-SlateBlueText dark:text-darktext w-4 h-4" />
              <input
                type="text"
                placeholder="Search testimonials by student, course, or comment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-sm"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterFeatured(null)}
              className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                filterFeatured === null
                  ? "bg-primary text-white"
                  : "bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white border border-PowderBlueBorder dark:border-dark_border"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterFeatured(true)}
              className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                filterFeatured === true
                  ? "bg-ElectricAqua text-white"
                  : "bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white border border-PowderBlueBorder dark:border-dark_border"
              }`}
            >
              <Award className="w-4 h-4" />
              Featured
            </button>
            <button
              onClick={() => setFilterFeatured(false)}
              className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                filterFeatured === false
                  ? "bg-Aquamarine text-white"
                  : "bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white border border-PowderBlueBorder dark:border-dark_border"
              }`}
            >
              Regular
            </button>
          </div>
        </div>
      </div>

      {/* Testimonials Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredTestimonials.map((testimonial) => (
          <div
            key={testimonial._id}
            className={`relative rounded-xl border overflow-hidden transition-all duration-300 hover:shadow-md ${
              testimonial.featured
                ? "border-primary bg-gradient-to-br from-primary/5 to-primary/10"
                : "border-PowderBlueBorder bg-white dark:bg-darkmode dark:border-dark_border"
            }`}
          >
            <div className="p-6">
              {/* Status Badges */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                {testimonial.featured && (
                  <span className="px-3 py-1 bg-ElectricAqua/20 text-ElectricAqua dark:bg-ElectricAqua/30 rounded-full text-xs font-semibold flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    Featured
                  </span>
                )}
                {!testimonial.isActive && (
                  <span className="px-3 py-1 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full text-xs font-semibold">
                    Inactive
                  </span>
                )}
              </div>

              {/* Student Info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-PaleCyan dark:bg-dark_input flex items-center justify-center overflow-hidden">
                  {testimonial.studentImage ? (
                    <img
                      src={testimonial.studentImage}
                      alt={testimonial.studentName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-SlateBlueText dark:text-darktext" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-MidnightNavyText dark:text-white">
                    {testimonial.studentName}
                  </h3>
                  {testimonial.courseTitle && (
                    <p className="text-sm text-SlateBlueText dark:text-darktext">
                      {testimonial.courseTitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1">
                  {renderStars(testimonial.rating)}
                </div>
                <span className="text-sm font-medium text-MidnightNavyText dark:text-white">
                  {testimonial.rating}.0
                </span>
              </div>

              {/* Comment */}
              <div className="mb-4">
                <p className="text-sm text-SlateBlueText dark:text-darktext line-clamp-4">
                  "{testimonial.comment}"
                </p>
              </div>

              {/* Meta Info */}
              <div className="flex items-center justify-between text-xs text-SlateBlueText dark:text-darktext mb-4">
                <span>{formatDate(testimonial.createdAt)}</span>
                {testimonial.courseId && (
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded">
                    Course
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {/* Edit */}
                  <button
                    onClick={() => onEdit(testimonial)}
                    className="w-full bg-primary hover:bg-primary/90 text-white py-2 px-3 rounded-lg font-semibold text-sm transition-transform transition-shadow duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary/30 flex items-center justify-center gap-2 group"
                  >
                    <Edit className="w-3 h-3 transition-transform duration-300 group-hover:-translate-y-0.5" />
                    Edit
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => onDelete(testimonial._id)}
                    className="bg-SlateBlueText/10 hover:bg-SlateBlueText/20 dark:bg-darktext/20 dark:hover:bg-darktext/30 text-SlateBlueText dark:text-darktext py-2 px-3 rounded-lg font-semibold text-xs transition-transform transition-colors transition-shadow duration-300 hover:scale-105 active:scale-100 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-SlateBlueText/20 flex items-center justify-center gap-2 group"
                  >
                    <Trash2 className="w-3 h-3 transition-transform duration-300 group-hover:rotate-12" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTestimonials.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-3">
            No testimonials found
          </h3>
          <p className="text-sm text-SlateBlueText dark:text-darktext mb-6 max-w-md mx-auto">
            {searchTerm || filterFeatured !== null
              ? "Try adjusting your search or filters to see more results."
              : "Start collecting student feedback to build trust and showcase your platform's value."}
          </p>
          {(searchTerm || filterFeatured !== null) ? (
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterFeatured(null);
              }}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
            >
              <Filter className="w-4 h-4" />
              Clear Filters
            </button>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Create Your First Testimonial
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={open}
        title={editing ? "Edit Testimonial" : "Create New Testimonial"}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
      >
        <TestimonialForm
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