"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Calendar,
  Clock,
  User,
  Users,
  Plus,
  Edit,
  Trash2,
  Star,
  Zap,
  Package,
  TrendingUp,
  CheckCircle,
  Video,
  Globe,
  Link,
  Image,
} from "lucide-react";
import Modal from "./Modal";
import WebinarForm from "./WebinarForm";
import { useI18n } from "@/i18n/I18nProvider";

interface Webinar {
  _id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  image: string;
  instructor: string;
  instructorImage: string;
  crmRegistrationUrl: string;
  maxAttendees: number;
  currentAttendees: number;
  tags: string[];
  speakers: Array<{
    name: string;
    role: string;
    image: string;
  }>;
  registrationStart: string;
  registrationEnd: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function WebinarAdmin() {
  const { t } = useI18n();
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Webinar | null>(null);

  // دالة لتنسيق التاريخ
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // التحقق من حالة الندوة
  const getWebinarStatus = (webinar: Webinar) => {
    const now = new Date();
    const webinarDate = new Date(`${webinar.date}T${webinar.time}`);

    if (!webinar.isActive) return "inactive";
    if (webinarDate < now) return "expired";

    // التحقق من فترة التسجيل
    if (webinar.registrationStart && webinar.registrationEnd) {
      const regStart = new Date(webinar.registrationStart);
      const regEnd = new Date(webinar.registrationEnd);
      if (now < regStart) return "upcoming";
      if (now > regEnd) return "registration-closed";
    }

    return "active";
  };

  const loadWebinars = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/webinars", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setWebinars(json.data);
      }
    } catch (err) {
      console.error("Error loading webinars:", err);
      toast.error(t('webinar.failedToLoad') || "Failed to load webinars");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWebinars();
  }, []);

  const onSaved = async () => {
    await loadWebinars();
    toast.success(t('webinar.savedSuccess') || "Webinar saved successfully");
  };

  const onEdit = (webinar: Webinar) => {
    setEditing(webinar);
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    // الحل: استخدام النصوص المترجمة مباشرة خارج دالة toast
    const deleteConfirm = t('webinar.deleteConfirm') || "Are you sure you want to delete this webinar?";
    const deleteWarning = t('webinar.deleteWarning') || "This action cannot be undone.";
    const cancelText = t('common.cancel') || "Cancel";
    const deleteText = t('common.delete') || "Delete";
    const deletedSuccess = t('webinar.deletedSuccess') || "Webinar deleted successfully";
    const deleteFailed = t('webinar.deleteFailed') || "Failed to delete the webinar";
    const deleteError = t('webinar.deleteError') || "Error deleting webinar";

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
                    `/api/webinars?id=${encodeURIComponent(id)}`,
                    {
                      method: "DELETE",
                    }
                  );
                  if (res.ok) {
                    setWebinars((prev) => prev.filter((w) => w._id !== id));
                    toast.success(deletedSuccess);
                  } else {
                    toast.error(deleteFailed);
                  }
                } catch (err) {
                  console.error("Error deleting webinar:", err);
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
              <Video className="w-7 h-7 text-primary" />
              {t('webinar.management') || "Webinars Management"}
            </h1>
            <p className="text-sm text-SlateBlueText dark:text-darktext max-w-2xl">
              {t('webinar.managementDescription') || "Manage online webinars and conferences. Schedule sessions, manage speakers, and track registrations."}
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
            {t('webinar.addNew') || "Add New Webinar"}
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                {t('webinar.totalWebinars') || "Total Webinars"}
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {webinars.length}
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
                {t('webinar.activeWebinars') || "Active Webinars"}
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {webinars.filter((w) => w.isActive).length}
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
                {t('webinar.totalSpeakers') || "Total Speakers"}
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {webinars.reduce(
                  (acc, w) => acc + (w.speakers?.length || 0),
                  0
                )}
              </p>
            </div>
            <div className="w-10 h-10 bg-Aquamarine/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-Aquamarine" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                {t('webinar.avgAttendees') || "Avg. Attendees"}
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {webinars.length > 0
                  ? Math.round(
                      webinars.reduce((acc, w) => acc + w.currentAttendees, 0) /
                        webinars.length
                    )
                  : 0}
              </p>
            </div>
            <div className="w-10 h-10 bg-LightYellow/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-LightYellow" />
            </div>
          </div>
        </div>
      </div>

      {/* Webinars Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {webinars.map((webinar) => {
          const status = getWebinarStatus(webinar);
          const statusColors = {
            active: "bg-Aquamarine/20 text-Salem dark:bg-Aquamarine/30",
            upcoming: "bg-LightYellow/20 text-amber-700 dark:bg-LightYellow/30",
            expired:
              "bg-SlateBlueText/20 text-SlateBlueText dark:bg-darktext/30",
            "registration-closed": "bg-red-100 text-red-700 dark:bg-red-900/30",
            inactive: "bg-gray-200 text-gray-700 dark:bg-gray-700",
          };

          const statusText = {
            active: t('webinar.status.active') || "Active",
            upcoming: t('webinar.status.upcoming') || "Upcoming",
            expired: t('webinar.status.expired') || "Expired",
            "registration-closed": t('webinar.status.registrationClosed') || "Registration Closed",
            inactive: t('webinar.status.inactive') || "Inactive",
          };

          return (
            <div
              key={webinar._id}
              className={`relative rounded-xl border overflow-hidden transition-all duration-300 hover:shadow-md ${
                status === "active"
                  ? "border-primary bg-gradient-to-br from-primary/5 to-primary/10"
                  : "border-PowderBlueBorder bg-white dark:bg-darkmode dark:border-dark_border"
              }`}
            >
              {/* Webinar Image */}
              {webinar.image && (
                <div className="h-40 bg-gray-200 dark:bg-dark_input overflow-hidden">
                  <img
                    src={webinar.image}
                    alt={webinar.title}
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

                {/* Webinar Header */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-2 line-clamp-2">
                    {webinar.title}
                  </h3>
                  <p className="text-sm text-SlateBlueText dark:text-darktext line-clamp-2">
                    {webinar.description}
                  </p>
                </div>

                {/* Schedule Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(webinar.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                    <Clock className="w-4 h-4" />
                    <span>
                      {formatTime(webinar.time)} • {webinar.duration}min
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                    <User className="w-4 h-4" />
                    <span>{webinar.instructor}</span>
                  </div>
                </div>

                {/* Speakers */}
                {webinar.speakers && webinar.speakers.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                      {t('webinar.speakers') || "Speakers"} ({webinar.speakers.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {webinar.speakers.slice(0, 3).map((speaker, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded text-xs"
                        >
                          {speaker.name}
                        </span>
                      ))}
                      {webinar.speakers.length > 3 && (
                        <span className="px-2 py-1 bg-PaleCyan dark:bg-dark_input text-SlateBlueText dark:text-darktext rounded text-xs">
                          +{webinar.speakers.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Registration Info */}
                <div className="flex items-center justify-between text-xs text-SlateBlueText dark:text-darktext mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>
                      {webinar.currentAttendees}/{webinar.maxAttendees} {t('webinar.attendees') || "attendees"}
                    </span>
                  </div>
                  {webinar.crmRegistrationUrl && (
                    <div className="flex items-center gap-1">
                      <Link className="w-3 h-3" />
                      <span>{t('webinar.crmLinked') || "CRM Linked"}</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {webinar.tags && webinar.tags.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {webinar.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Edit */}
                    <button
                      onClick={() => onEdit(webinar)}
                      className="w-full bg-primary hover:bg-primary/90 text-white py-2 px-3 rounded-lg font-semibold text-sm transition-transform transition-shadow duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary/30 flex items-center justify-center gap-2 group"
                    >
                      <Edit className="w-3 h-3 transition-transform duration-300 group-hover:-translate-y-0.5" />
                      {t('common.edit') || "Edit"}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => onDelete(webinar._id)}
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
      {webinars.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-3">
            {t('webinar.noWebinars') || "No webinars yet"}
          </h3>
          <p className="text-sm text-SlateBlueText dark:text-darktext mb-6 max-w-md mx-auto">
            {t('webinar.createFirst') || "Create your first webinar to start engaging with students and sharing knowledge."}
          </p>
          <button
            onClick={() => setOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            {t('webinar.createFirstButton') || "Create Your First Webinar"}
          </button>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={open}
        title={editing ? t('webinar.editWebinar') || "Edit Webinar" : t('webinar.createWebinar') || "Create New Webinar"}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
      >
        <WebinarForm
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