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
  MapPin,
  Globe,
  Link,
  Image,
} from "lucide-react";
import Modal from "./Modal";
import EventForm from "./EventForm";

interface Event {
  _id: string; // تغيير إلى _id
  id?: string; // إضافة id اختياري
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  location: string;
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

export default function EventAdmin() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);

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

  // التحقق من حالة الحدث
  const getEventStatus = (event: Event) => {
    const now = new Date();
    const eventDate = new Date(`${event.date}T${event.time}`);

    if (!event.isActive) return "inactive";
    if (eventDate < now) return "expired";

    // التحقق من فترة التسجيل
    if (event.registrationStart && event.registrationEnd) {
      const regStart = new Date(event.registrationStart);
      const regEnd = new Date(event.registrationEnd);
      if (now < regStart) return "upcoming";
      if (now > regEnd) return "registration-closed";
    }

    return "active";
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/events", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setEvents(json.data);
      }
    } catch (err) {
      console.error("Error loading events:", err);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const onSaved = async () => {
    await loadEvents();
    toast.success("Event saved successfully");
  };

  const onEdit = (event: Event) => {
    setEditing(event);
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
                Are you sure you want to delete this event?
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
                    `/api/events?id=${encodeURIComponent(id)}`,
                    {
                      method: "DELETE",
                    }
                  );
                  if (res.ok) {
                    setEvents((prev) => prev.filter((e) => e._id !== id));
                    toast.success("Event deleted successfully");
                  } else {
                    toast.error("Failed to delete the event");
                  }
                } catch (err) {
                  console.error("Error deleting event:", err);
                  toast.error("Error deleting event");
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
              <Calendar className="w-7 h-7 text-primary" />
              Events Management
            </h1>
            <p className="text-sm text-SlateBlueText dark:text-darktext max-w-2xl">
              Manage your events, workshops, and conferences. Schedule sessions, manage speakers, and track registrations for both online and in-person events.
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
            Add New Event
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                Total Events
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {events.length}
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
                Active Events
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {events.filter((e) => e.isActive).length}
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
                Total Speakers
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {events.reduce(
                  (acc, e) => acc + (e.speakers?.length || 0),
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
                Avg. Attendees
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {events.length > 0
                  ? Math.round(
                      events.reduce((acc, e) => acc + e.currentAttendees, 0) /
                        events.length
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

      {/* Events Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => {
          const status = getEventStatus(event);
          const statusColors = {
            active: "bg-Aquamarine/20 text-Salem dark:bg-Aquamarine/30",
            upcoming: "bg-LightYellow/20 text-amber-700 dark:bg-LightYellow/30",
            expired:
              "bg-SlateBlueText/20 text-SlateBlueText dark:bg-darktext/30",
            "registration-closed": "bg-red-100 text-red-700 dark:bg-red-900/30",
            inactive: "bg-gray-200 text-gray-700 dark:bg-gray-700",
          };

          const statusText = {
            active: "Active",
            upcoming: "Upcoming",
            expired: "Expired",
            "registration-closed": "Registration Closed",
            inactive: "Inactive",
          };

          return (
            <div
              key={event._id} // استخدام _id كـ key
              className={`relative rounded-xl border overflow-hidden transition-all duration-300 hover:shadow-md ${
                status === "active"
                  ? "border-primary bg-gradient-to-br from-primary/5 to-primary/10"
                  : "border-PowderBlueBorder bg-white dark:bg-darkmode dark:border-dark_border"
              }`}
            >
              {/* Event Image */}
              {event.image && (
                <div className="h-40 bg-gray-200 dark:bg-dark_input overflow-hidden">
                  <img
                    src={event.image}
                    alt={event.title}
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

                {/* Event Header */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-2 line-clamp-2">
                    {event.title}
                  </h3>
                  <p className="text-sm text-SlateBlueText dark:text-darktext line-clamp-2">
                    {event.description}
                  </p>
                </div>

                {/* Schedule Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                    <Clock className="w-4 h-4" />
                    <span>
                      {formatTime(event.time)} • {event.duration}min
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                    <MapPin className="w-4 h-4" />
                    <span className={!event.location ? "text-gray-400" : ""}>
                      {event.location || "Location not specified"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                    <User className="w-4 h-4" />
                    <span>{event.instructor}</span>
                  </div>
                </div>

                {/* Speakers */}
                {event.speakers && event.speakers.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-MidnightNavyText dark:text-white mb-2">
                      Speakers ({event.speakers.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {event.speakers.slice(0, 3).map((speaker, index) => (
                        <span
                          key={`${event._id}-speaker-${index}`} // key فريد للمتحدث
                          className="px-2 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded text-xs"
                        >
                          {speaker.name}
                        </span>
                      ))}
                      {event.speakers.length > 3 && (
                        <span className="px-2 py-1 bg-PaleCyan dark:bg-dark_input text-SlateBlueText dark:text-darktext rounded text-xs">
                          +{event.speakers.length - 3}
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
                      {event.currentAttendees}/{event.maxAttendees} attendees
                    </span>
                  </div>
                  {event.crmRegistrationUrl && (
                    <div className="flex items-center gap-1">
                      <Link className="w-3 h-3" />
                      <span>CRM Linked</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {event.tags && event.tags.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {event.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={`${event._id}-tag-${index}`} // key فريد للـ tag
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
                      onClick={() => onEdit(event)}
                      className="w-full bg-primary hover:bg-primary/90 text-white py-2 px-3 rounded-lg font-semibold text-sm transition-transform transition-shadow duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary/30 flex items-center justify-center gap-2 group"
                    >
                      <Edit className="w-3 h-3 transition-transform duration-300 group-hover:-translate-y-0.5" />
                      Edit
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => onDelete(event._id)} // استخدام _id للحذف
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
      {events.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-3">
            No events yet
          </h3>
          <p className="text-sm text-SlateBlueText dark:text-darktext mb-6 max-w-md mx-auto">
            Create your first event to start engaging with attendees and organizing memorable experiences.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Create Your First Event
          </button>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={open}
        title={editing ? "Edit Event" : "Create New Event"}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
      >
        <EventForm
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