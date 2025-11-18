"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Image,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  Upload,
  Search,
  Filter,
} from "lucide-react";
import Modal from "./Modal";
import SectionImagesAdminForm from "./SectionImagesAdminForm";
import { useI18n } from "@/i18n/I18nProvider";

interface SectionImage {
  _id: string;
  sectionName: string;
  imageUrl: string;
  imageAlt: string;
  description: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function SectionImagesAdmin() {
  const { t } = useI18n();
  const [images, setImages] = useState<SectionImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SectionImage | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
      if (diffDays === 0) {
        return t('common.today') || "Today";
      } else if (diffDays === 1) {
        return t('common.yesterday') || "Yesterday";
      } else {
        return `${diffDays} ${t('common.daysAgo') || "days ago"}`;
      }
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDetailedDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      full: date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const loadImages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/section-images", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setImages(json.data);
      }
    } catch (err) {
      console.error("Error loading section images:", err);
      toast.error(t('sectionImages.failedToLoad') || "Failed to load images");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  const onSaved = async () => {
    await loadImages();
    toast.success(t('sectionImages.savedSuccess') || "Image saved successfully");
  };

  const onEdit = (image: SectionImage) => {
    setEditing(image);
    setOpen(true);
  };

  const toggleImageStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/section-images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentStatus })
      });

      const result = await res.json();
      
      if (result.success) {
        setImages(images.map(img => 
          img._id === id ? { ...img, isActive: !currentStatus } : img
        ));
        toast.success(t('sectionImages.statusUpdated') || "Status updated successfully");
      }
    } catch (err) {
      console.error("Failed to toggle image status:", err);
      toast.error(t('sectionImages.statusUpdateFailed') || "Failed to update status");
    }
  };

  const onDelete = async (id: string) => {
    const deleteConfirm = t('sectionImages.deleteConfirm') || "Are you sure you want to delete this image?";
    const deleteWarning = t('sectionImages.deleteWarning') || "This action cannot be undone.";
    const cancelText = t('common.cancel') || "Cancel";
    const deleteText = t('common.delete') || "Delete";
    const deletedSuccess = t('sectionImages.deletedSuccess') || "Image deleted successfully";
    const deleteFailed = t('sectionImages.deleteFailed') || "Failed to delete the image";
    const deleteError = t('sectionImages.deleteError') || "Error deleting image";

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
                    `/api/section-images?id=${encodeURIComponent(id)}`,
                    {
                      method: "DELETE",
                    }
                  );
                  if (res.ok) {
                    setImages((prev) => prev.filter((p) => p._id !== id));
                    toast.success(deletedSuccess);
                  } else {
                    toast.error(deleteFailed);
                  }
                } catch (err) {
                  console.error("Error deleting image:", err);
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

  // Filter images based on search and filters
  const filteredImages = images.filter(image => {
    const matchesSearch = image.sectionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         image.imageAlt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         image.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && image.isActive) ||
                         (statusFilter === "inactive" && !image.isActive);

    return matchesSearch && matchesStatus;
  });

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
              <Image className="w-7 h-7 text-primary" />
              {t('sectionImages.management') || "Section Images Management"}
            </h1>
            <p className="text-sm text-SlateBlueText dark:text-darktext max-w-2xl">
              {t('sectionImages.managementDescription') || "Manage images for different sections of your website. Upload and organize images for ticket sections, event pages, and more."}
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
            {t('sectionImages.addNew') || "Add New Image"}
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                {t('sectionImages.totalImages') || "Total Images"}
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {images.length}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Image className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                {t('sectionImages.activeImages') || "Active Images"}
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {images.filter((p) => p.isActive).length}
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
                {t('sectionImages.inactiveImages') || "Inactive Images"}
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {images.filter((p) => !p.isActive).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <EyeOff className="w-5 h-5 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-SlateBlueText w-4 h-4" />
              <input
                type="text"
                placeholder={t('sectionImages.searchPlaceholder') || "Search by section name, alt text, or description..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            >
              <option value="all">{t('sectionImages.allStatuses') || "All Statuses"}</option>
              <option value="active">{t('sectionImages.active') || "Active"}</option>
              <option value="inactive">{t('sectionImages.inactive') || "Inactive"}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Images Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredImages.map((image) => (
          <div
            key={image._id}
            className={`relative rounded-xl border p-6 transition-all duration-300 hover:shadow-md ${
              image.isActive
                ? "border-Aquamarine bg-gradient-to-br from-Aquamarine/5 to-Aquamarine/10"
                : "border-PowderBlueBorder bg-white dark:bg-darkmode dark:border-dark_border opacity-70"
            }`}
          >
            {/* Status Badge */}
            <div className="absolute top-4 right-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                  image.isActive
                    ? "bg-Aquamarine/20 text-Salem dark:bg-Aquamarine/30"
                    : "bg-SlateBlueText/20 text-SlateBlueText dark:bg-darktext/30"
                }`}
              >
                {image.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {image.isActive ? (t('sectionImages.status.active') || "Active") : (t('sectionImages.status.inactive') || "Inactive")}
              </span>
            </div>

            {/* Image Preview */}
            <div className="mb-4 rounded-lg overflow-hidden h-40 bg-gray-100 dark:bg-dark_input mt-8">
              <img
                src={image.imageUrl}
                alt={image.imageAlt}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Image Info */}
            <div className="mb-4">
              <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-2 line-clamp-2">
                {image.sectionName}
              </h3>
              <p className="text-sm text-SlateBlueText dark:text-darktext line-clamp-2 mb-2">
                {image.imageAlt}
              </p>
              {image.description && (
                <p className="text-xs text-SlateBlueText dark:text-darktext line-clamp-2">
                  {image.description}
                </p>
              )}
            </div>

            {/* Date Info */}
            <div className="flex items-center gap-2 text-xs text-SlateBlueText dark:text-darktext mb-4">
              <Calendar className="w-3 h-3" />
              <span>{formatDetailedDate(image.createdAt).date}</span>
              <Clock className="w-3 h-3 ml-1" />
              <span>{formatDetailedDate(image.createdAt).time}</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {/* Edit */}
                <button
                  onClick={() => onEdit(image)}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-2 px-3 rounded-lg font-semibold text-sm transition-transform transition-shadow duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary/30 flex items-center justify-center gap-2 group"
                >
                  <Edit className="w-3 h-3 transition-transform duration-300 group-hover:-translate-y-0.5" />
                  {t('common.edit') || "Edit"}
                </button>

                {/* Toggle Status / Delete */}
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => toggleImageStatus(image._id, image.isActive)}
                    className={`py-2 px-2 rounded-lg font-semibold text-xs transition-all duration-300 flex items-center justify-center gap-1 ${
                      image.isActive
                        ? "bg-orange-500 hover:bg-orange-600 text-white"
                        : "bg-green-500 hover:bg-green-600 text-white"
                    }`}
                  >
                    {image.isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => onDelete(image._id)}
                    className="bg-red-500 hover:bg-red-600 text-white py-2 px-2 rounded-lg font-semibold text-xs transition-all duration-300 flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredImages.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Image className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-3">
            {searchTerm || statusFilter !== "all" 
              ? (t('sectionImages.noResults') || "No images found")
              : (t('sectionImages.noImages') || "No images yet")}
          </h3>
          <p className="text-sm text-SlateBlueText dark:text-darktext mb-6 max-w-md mx-auto">
            {searchTerm || statusFilter !== "all"
              ? (t('sectionImages.tryDifferentSearch') || "Try adjusting your search criteria or filters.")
              : (t('sectionImages.createFirst') || "Create your first section image to enhance your website's visual appeal.")}
          </p>
          {(searchTerm || statusFilter !== "all") ? (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
            >
              <Filter className="w-4 h-4" />
              {t('sectionImages.clearFilters') || "Clear Filters"}
            </button>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              {t('sectionImages.createFirstButton') || "Create Your First Image"}
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={open}
        title={editing ? (t('sectionImages.editImage') || "Edit Image") : (t('sectionImages.createImage') || "Create New Image")}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
      >
        <SectionImagesAdminForm
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