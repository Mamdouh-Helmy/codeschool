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
  Globe,
  Star,
  Zap,
  Package,
  CheckCircle,
  Calendar,
  Clock,
  Languages,
} from "lucide-react";
import Modal from "./Modal";
import SectionImageHeroForm from "./SectionImageHeroForm";
import { useI18n } from "@/i18n/I18nProvider";

interface SectionImageHero {
  _id: string;
  language: string;
  imageUrl: string;
  secondImageUrl?: string;
  imageAlt?: string;
  secondImageAlt?: string;
  heroTitleAr?: string;
  heroDescriptionAr?: string;
  instructor1Ar?: string;
  instructor1RoleAr?: string;
  instructor2Ar?: string;
  instructor2RoleAr?: string;
  heroTitleEn?: string;
  heroDescriptionEn?: string;
  instructor1En?: string;
  instructor1RoleEn?: string;
  instructor2En?: string;
  instructor2RoleEn?: string;
  welcomeTitleAr?: string;
  welcomeSubtitle1Ar?: string;
  welcomeSubtitle2Ar?: string;
  welcomeFeature1Ar?: string;
  welcomeFeature2Ar?: string;
  welcomeFeature3Ar?: string;
  welcomeFeature4Ar?: string;
  welcomeFeature5Ar?: string;
  welcomeFeature6Ar?: string;
  welcomeTitleEn?: string;
  welcomeSubtitle1En?: string;
  welcomeSubtitle2En?: string;
  welcomeFeature1En?: string;
  welcomeFeature2En?: string;
  welcomeFeature3En?: string;
  welcomeFeature4En?: string;
  welcomeFeature5En?: string;
  welcomeFeature6En?: string;
  discount: number;
  happyParents: string;
  graduates: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface Filters {
  language: string;
  status: string;
}

const SectionImagesAdminHero: React.FC = () => {
  const { t } = useI18n();
  const [images, setImages] = useState<SectionImageHero[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [open, setOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<SectionImageHero | null>(null);
  const [filters, setFilters] = useState<Filters>({
    language: "",
    status: ""
  });

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const loadImages = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch("/api/section-images-hero", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setImages(json.data);
      }
    } catch (err) {
      console.error("Error loading images:", err);
      toast.error(t('sectionImages.failedToLoad') || "Failed to load images");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  const onSaved = async (): Promise<void> => {
    await loadImages();
    toast.success(t('sectionImages.savedSuccess') || "Image saved successfully");
  };

  const onEdit = (image: SectionImageHero): void => {
    setEditing(image);
    setOpen(true);
  };

  const onDelete = async (id: string): Promise<void> => {
    const deleteConfirm = t('sectionImages.deleteConfirm') || "Are you sure you want to delete this image?";
    const deleteWarning = t('sectionImages.deleteWarning') || "This action cannot be undone.";
    const cancelText = t('common.cancel') || "Cancel";
    const deleteText = t('common.delete') || "Delete";
    const deletedSuccess = t('sectionImages.deletedSuccess') || "Image deleted successfully";
    const deleteFailed = t('sectionImages.deleteFailed') || "Failed to delete the image";
    const deleteError = t('sectionImages.deleteError') || "Error deleting image";

    toast(
      (toastInstance: { id: string }) => (
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
                    `/api/section-images-hero/${encodeURIComponent(id)}`,
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

  const toggleStatus = async (id: string, currentStatus: boolean): Promise<void> => {
    try {
      const res = await fetch(`/api/section-images-hero/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (res.ok) {
        setImages(prev => prev.map(img =>
          img._id === id ? { ...img, isActive: !currentStatus } : img
        ));
        toast.success(t('sectionImages.statusUpdated') || "Status updated successfully");
      } else {
        toast.error(t('sectionImages.statusUpdateFailed') || "Failed to update status");
      }
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error(t('sectionImages.statusUpdateFailed') || "Failed to update status");
    }
  };

  const filteredImages = images.filter(image => {
    if (filters.language && image.language !== filters.language) return false;
    if (filters.status === "active" && !image.isActive) return false;
    if (filters.status === "inactive" && image.isActive) return false;
    return true;
  });

  const stats = {
    total: images.length,
    active: images.filter(img => img.isActive).length,
    arabic: images.filter(img => img.language === "ar").length,
    english: images.filter(img => img.language === "en").length,
  };

  const getLanguageLabel = (lang: string): string => {
    return lang === "ar" ? "العربية" : "English";
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
              <Image className="w-7 h-7 text-primary" />
              {t('sectionImages.management') || "Images Management"}
            </h1>
            <p className="text-sm text-SlateBlueText dark:text-darktext max-w-2xl">
              {t('sectionImages.managementDescription') || "Manage website images and content for different languages. Each language has its own image and content."}
            </p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            disabled={images.length >= 2}
            className={`mt-4 lg:mt-0 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 ${images.length >= 2
                ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-primary hover:bg-primary/90 text-white"
              }`}
          >
            <Plus className="w-4 h-4" />
            {t('sectionImages.addNew') || "Add New Image"}
            {images.length >= 2 && (
              <span className="ml-2 text-xs">(حد أقصى صورتين)</span>
            )}
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                {t('sectionImages.totalImages') || "Total Images"}
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {stats.total}/2
              </p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
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
                {stats.active}
              </p>
            </div>
            <div className="w-10 h-10 bg-ElectricAqua/10 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-ElectricAqua" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                {t('sectionImages.arabicImages') || "Arabic Version"}
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {stats.arabic > 0 ? "✓" : "✗"}
              </p>
            </div>
            <div className="w-10 h-10 bg-Aquamarine/10 rounded-lg flex items-center justify-center">
              <Languages className="w-5 h-5 text-Aquamarine" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                {t('sectionImages.englishImages') || "English Version"}
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {stats.english > 0 ? "✓" : "✗"}
              </p>
            </div>
            <div className="w-10 h-10 bg-LightYellow/10 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-LightYellow" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
              {t('common.language') || "Language"}
            </label>
            <select
              value={filters.language}
              onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value }))}
              className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            >
              <option value="">{t('sectionImages.allLanguages') || "All Languages"}</option>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
              {t('common.status') || "Status"}
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white"
            >
              <option value="">{t('sectionImages.allStatuses') || "All Statuses"}</option>
              <option value="active">{t('sectionImages.status.active') || "Active"}</option>
              <option value="inactive">{t('sectionImages.status.inactive') || "Inactive"}</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ language: "", status: "" })}
              className="w-full bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white py-2 px-4 rounded-lg font-semibold text-sm border border-PowderBlueBorder dark:border-dark_border hover:bg-IcyBreeze dark:hover:bg-darklight transition-colors"
            >
              {t('sectionImages.clearFilters') || "Clear Filters"}
            </button>
          </div>
        </div>
      </div>

      {/* Images Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
        {filteredImages.map((image) => (
          <div
            key={image._id}
            className={`relative rounded-xl border p-6 transition-all duration-300 hover:shadow-md ${image.isActive
                ? "border-Aquamarine bg-gradient-to-br from-Aquamarine/5 to-Aquamarine/10"
                : "border-PowderBlueBorder bg-white dark:bg-darkmode dark:border-dark_border"
              }`}
          >
            {/* Status Badge */}
            <div className="absolute top-4 right-4">
              <button
                onClick={() => toggleStatus(image._id, image.isActive)}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors ${image.isActive
                    ? "bg-Aquamarine/20 text-Salem dark:bg-Aquamarine/30 hover:bg-Aquamarine/30"
                    : "bg-SlateBlueText/20 text-SlateBlueText dark:bg-darktext/30 hover:bg-SlateBlueText/30"
                  }`}
              >
                {image.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {image.isActive ? (t('sectionImages.status.active') || "Active") : (t('sectionImages.status.inactive') || "Inactive")}
              </button>
            </div>

            {/* Language Badge */}
            <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold ${image.language === "ar"
                ? "bg-primary/20 text-primary"
                : "bg-LightYellow/20 text-LightYellow"
              }`}>
              {getLanguageLabel(image.language)}
            </div>

            {/* Image Preview */}
            <div className="mb-4 rounded-lg overflow-hidden h-40 bg-gray-100 dark:bg-dark_input">
              {image.imageUrl ? (
                <img
                  src={image.imageUrl}
                  alt={image.imageAlt || "Section image"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-SlateBlueText dark:text-darktext">
                  <Image className="w-8 h-8" />
                </div>
              )}
            </div>

            {/* Image Info */}
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-1">
                  {getLanguageLabel(image.language)} Version
                </h3>
                <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                  <Globe className="w-3 h-3" />
                  <span>Language: {image.language.toUpperCase()}</span>
                  <span>•</span>
                  <span>Order: {image.displayOrder}</span>
                </div>
              </div>

              {image.imageAlt && (
                <p className="text-sm text-SlateBlueText dark:text-darktext line-clamp-2">
                  {image.imageAlt}
                </p>
              )}

              {/* Additional Images */}
              {image.secondImageUrl && (
                <div className="flex items-center gap-2 text-xs text-SlateBlueText dark:text-darktext">
                  <Image className="w-3 h-3" />
                  <span>+1 additional image</span>
                </div>
              )}

              {/* Dates */}
              <div className="flex items-center gap-2 text-xs text-SlateBlueText dark:text-darktext">
                <Calendar className="w-3 h-3" />
                <span>Created: {formatDate(image.createdAt)}</span>
              </div>

              {image.updatedAt !== image.createdAt && (
                <div className="flex items-center gap-2 text-xs text-Aquamarine">
                  <Clock className="w-3 h-3" />
                  <span>Updated: {formatDate(image.updatedAt)}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => onEdit(image)}
                className="flex-1 bg-primary hover:bg-primary/90 text-white py-2 px-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Edit className="w-3 h-3" />
                {t('common.edit') || "Edit"}
              </button>

              <button
                onClick={() => onDelete(image._id)}
                className="px-3 bg-[#27343f] hover:bg-[#33414c] text-white py-2 rounded-lg font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3 h-3" />
              </button>
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
            {images.length === 0
              ? (t('sectionImages.noImages') || "No images yet")
              : (t('sectionImages.noResults') || "No matching images found")
            }
          </h3>
          <p className="text-sm text-SlateBlueText dark:text-darktext mb-6 max-w-md mx-auto">
            {images.length === 0
              ? (t('sectionImages.createFirst') || "Create your first image for Arabic or English language.")
              : (t('sectionImages.tryDifferentSearch') || "Try adjusting your search criteria or filters.")
            }
          </p>
          {images.length === 0 && (
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
        <SectionImageHeroForm
          initial={editing}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          onSaved={onSaved}
          existingLanguages={images.map(img => img.language)}
        />
      </Modal>
    </div>
  );
};

export default SectionImagesAdminHero;