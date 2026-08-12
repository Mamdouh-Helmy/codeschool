"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import GuestSidebar from "../GuestSidebar";
import GuestHeader from "../GuestHeader";
import {
  Mail,
  Search,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  X,
  Phone,
  Reply,
  Calendar,
  Tag,
  Inbox,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { useLocale } from "@/app/context/LocaleContext";

// ── Types ──────────────────────────────────────────────

interface GuestUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  image?: string | null;
}

interface ContactMessage {
  _id: string;
  senderInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  service?: string;
  message: string;
  createdAt: string;
  replied?: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const SERVICE_LABELS: Record<string, { ar: string; en: string }> = {
  web: { ar: "تطوير مواقع", en: "Web Development" },
  uiux: { ar: "تصميم UI/UX", en: "UI/UX Design" },
  logo: { ar: "تصميم لوجو", en: "Logo Design" },
  seo: { ar: "تحسين محركات البحث", en: "SEO" },
};

// ── Skeleton ──

const MessagesSkeleton = ({ isRTL }: { isRTL: boolean }) => (
  <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#0a0f17]">
    <div className="flex">
      <div className="w-64 h-screen bg-white dark:bg-[#161b22] border-l border-gray-200 dark:border-[#30363d] hidden lg:block" />
      <main className="flex-1 min-w-0 p-6 lg:p-8">
        <div className="h-10 w-48 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#161b22] rounded-2xl p-5 h-24 animate-pulse" />
          ))}
        </div>
      </main>
    </div>
  </div>
);

// ── Main Component ──

export default function GuestMessages() {
  const { locale } = useLocale();
  const isRTL = locale === "ar";
  const router = useRouter();
  const { data: session, status } = useSession();

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  // ── Reply state ──
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [replySent, setReplySent] = useState(false);

  // ── Delete state ──
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const user: GuestUser | null = session?.user
    ? {
        id: (session.user as any).id,
        name: session.user.name || undefined,
        email: session.user.email || undefined,
        role: (session.user as any).role,
        image: session.user.image || null,
      }
    : null;

  const fetchMessages = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);
        setError("");

        const params = new URLSearchParams({
          page: String(page),
          limit: "10",
        });
        if (search) params.set("search", search);
        if (serviceFilter) params.set("service", serviceFilter);

        const res = await fetch(`/api/guest/messages?${params.toString()}`, {
          credentials: "include",
        });
        const response = await res.json();

        if (!res.ok || !response.success) throw new Error(response.message || "Error");
        setMessages(response.data || []);
        setPagination(response.pagination);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search, serviceFilter]
  );

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/");
      return;
    }
    fetchMessages();
    // Visiting this page counts as "seen" — clear the unread badge in the Header
    fetch("/api/guest/notifications/mark-read", { method: "PATCH", credentials: "include" }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page, search, serviceFilter]);

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      router.push("/");
    } catch (e) {}
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(isRTL ? "ar-EG" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getServiceLabel = (service?: string) => {
    if (!service) return null;
    const entry = SERVICE_LABELS[service];
    return entry ? (isRTL ? entry.ar : entry.en) : service;
  };

  const getSenderName = (m: ContactMessage) =>
    `${m.senderInfo?.firstName || ""} ${m.senderInfo?.lastName || ""}`.trim() || (isRTL ? "بدون اسم" : "Unnamed");

  // ── Open / close modal (resets reply + delete state each time) ──
  const openMessage = (m: ContactMessage) => {
    setSelectedMessage(m);
    setShowReplyBox(false);
    setReplyText("");
    setReplyError("");
    setReplySent(false);
    setConfirmDelete(false);
    setDeleteError("");
  };

  const closeMessageModal = () => {
    setSelectedMessage(null);
    setShowReplyBox(false);
    setReplyText("");
    setReplyError("");
    setReplySent(false);
    setSendingReply(false);
    setConfirmDelete(false);
    setDeleting(false);
    setDeleteError("");
  };

  // ── Send reply from inside the dashboard (real email, not mailto:) ──
  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    try {
      setSendingReply(true);
      setReplyError("");

      const res = await fetch(`/api/guest/messages/${selectedMessage._id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          replyMessage: replyText.trim(),
          locale: isRTL ? "ar" : "en",
        }),
      });
      const response = await res.json();

      if (!res.ok || !response.success) throw new Error(response.message || "Error");

      setReplySent(true);
      setMessages((prev) =>
        prev.map((m) => (m._id === selectedMessage._id ? { ...m, replied: true } : m))
      );
      setSelectedMessage((prev) => (prev ? { ...prev, replied: true } : prev));
    } catch (err: any) {
      setReplyError(err.message);
    } finally {
      setSendingReply(false);
    }
  };

  // ── Delete the currently open message ──
  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;
    try {
      setDeleting(true);
      setDeleteError("");

      const res = await fetch(`/api/guest/messages/${selectedMessage._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const response = await res.json();

      if (!res.ok || !response.success) throw new Error(response.message || "Error");

      const deletedId = selectedMessage._id;
      setMessages((prev) => prev.filter((m) => m._id !== deletedId));
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      closeMessageModal();
    } catch (err: any) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  };

  if (status === "loading" || (loading && messages.length === 0 && !error)) {
    return <MessagesSkeleton isRTL={isRTL} />;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#0a0f17] flex relative" dir={isRTL ? "rtl" : "ltr"}>
      {refreshing && (
        <div className={`fixed top-4 ${isRTL ? "left-4" : "right-4"} z-50 text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2`}
          style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-bold">{isRTL ? "جاري التحديث..." : "Refreshing..."}</span>
        </div>
      )}

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div
        className={`fixed lg:static inset-y-0 ${isRTL ? "right-0" : "left-0"} z-50 transform transition-all duration-500
          ${sidebarOpen ? "translate-x-0" : (isRTL ? "translate-x-full" : "-translate-x-full") + " lg:translate-x-0"}
          flex-shrink-0`}
      >
        <GuestSidebar user={user} onLogout={handleLogout} messagesCount={pagination.total} />
      </div>

      <main className="flex-1 min-w-0 transition-all duration-300">
        <GuestHeader
          user={user || {}}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onRefresh={() => fetchMessages(true)}
          onLogout={handleLogout}
        />

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-[#e6edf3] flex items-center gap-2">
                <Mail className="w-6 h-6" style={{ color: "#ff6700" }} />
                {isRTL ? "الرسائل" : "Messages"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-[#8b949e] mt-1">
                {isRTL
                  ? `${pagination.total} رسالة وصلتلك من زوار بورتفوليوك`
                  : `${pagination.total} messages received from your portfolio visitors`}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={isRTL ? "بحث بالاسم أو الإيميل أو نص الرسالة..." : "Search by name, email, or message..."}
                className={`w-full px-4 ${isRTL ? "pr-10" : "pl-10"} py-2.5 text-sm rounded-xl
                  bg-white dark:bg-[#161b22]
                  border border-gray-200 dark:border-[#30363d]
                  text-gray-900 dark:text-[#e6edf3]
                  placeholder:text-gray-400
                  outline-none transition-all
                  focus:ring-2 focus:border-[#ff6700]`}
                style={{ "--tw-ring-color": "#ff670030" } as React.CSSProperties}
              />
              <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
            </form>

            <select
              value={serviceFilter}
              onChange={(e) => {
                setServiceFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2.5 text-sm rounded-xl bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] text-gray-900 dark:text-[#e6edf3] outline-none focus:ring-2 focus:border-[#ff6700]"
            >
              <option value="">{isRTL ? "كل الخدمات" : "All services"}</option>
              {Object.entries(SERVICE_LABELS).map(([key, val]) => (
                <option key={key} value={key}>
                  {isRTL ? val.ar : val.en}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 mb-6">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Messages list */}
          {messages.length > 0 ? (
            <div className="space-y-3">
              {messages.map((m) => (
                <button
                  key={m._id}
                  onClick={() => openMessage(m)}
                  className="w-full text-left flex items-start gap-4 p-5 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 dark:border-[#30363d] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black shadow-md"
                    style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}
                  >
                    {getSenderName(m).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-black text-sm text-gray-900 dark:text-[#e6edf3]">{getSenderName(m)}</p>
                      <span className="text-xs text-gray-400 dark:text-[#6e7681] flex items-center gap-1 flex-shrink-0">
                        <Calendar className="w-3 h-3" />
                        {formatDate(m.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-[#8b949e] mt-1 line-clamp-2">{m.message}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {m.service && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: "#ff670015", color: "#ff6700", border: "1px solid #ff670025" }}
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {getServiceLabel(m.service)}
                        </span>
                      )}
                      {m.replied && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {isRTL ? "تم الرد" : "Replied"}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400 dark:text-[#6e7681]">{m.senderInfo?.email}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            !loading &&
            !error && (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto bg-gray-100 dark:bg-[#21262d] rounded-full flex items-center justify-center mb-4">
                  <Inbox className="w-10 h-10 text-gray-400 dark:text-[#6e7681]" />
                </div>
                <p className="text-gray-500 dark:text-[#8b949e]">
                  {search || serviceFilter
                    ? (isRTL ? "مفيش رسائل مطابقة للبحث" : "No messages match your search")
                    : (isRTL ? "لسه مفيش رسائل وصلتلك" : "No messages yet")}
                </p>
              </div>
            )
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#ff6700]/40 transition-colors"
              >
                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              <span className="text-sm font-bold text-gray-600 dark:text-[#8b949e] px-3">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 rounded-lg bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#ff6700]/40 transition-colors"
              >
                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Message Detail Modal ── */}
      {selectedMessage && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={closeMessageModal}
        >
          <div
            className="relative bg-white dark:bg-[#161b22] rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#30363d] rounded-t-2xl"
              style={{ background: "linear-gradient(135deg, #004d5908, #ff670008)" }}
            >
              <h3 className="font-black text-gray-900 dark:text-[#e6edf3]">
                {isRTL ? "تفاصيل الرسالة" : "Message Details"}
              </h3>
              <div className="flex items-center gap-1">
                {/* Delete trigger in the header */}
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleting}
                  title={isRTL ? "مسح الرسالة" : "Delete message"}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={closeMessageModal}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#21262d] transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-[#8b949e]" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* ── Delete confirmation banner ── */}
              {confirmDelete && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                  <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">
                    {isRTL ? "متأكد إنك عاوز تمسح الرسالة دي؟" : "Are you sure you want to delete this message?"}
                  </p>
                  <p className="text-xs text-red-500/80 dark:text-red-400/70 mb-3">
                    {isRTL ? "الإجراء ده مش هيتراجع عنه." : "This action cannot be undone."}
                  </p>
                  {deleteError && (
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 mb-3">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {deleteError}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteMessage}
                      disabled={deleting}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500 text-white text-sm font-black hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {deleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      {deleting
                        ? (isRTL ? "جاري المسح..." : "Deleting...")
                        : (isRTL ? "تأكيد المسح" : "Confirm Delete")}
                    </button>
                    <button
                      onClick={() => {
                        setConfirmDelete(false);
                        setDeleteError("");
                      }}
                      disabled={deleting}
                      className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-[#30363d] text-gray-500 dark:text-[#8b949e] text-sm hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors disabled:opacity-50"
                    >
                      {isRTL ? "إلغاء" : "Cancel"}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}
                >
                  {getSenderName(selectedMessage).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-gray-900 dark:text-[#e6edf3]">{getSenderName(selectedMessage)}</p>
                  <p className="text-xs text-gray-400 dark:text-[#6e7681] flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {formatDate(selectedMessage.createdAt)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-[#8b949e]">
                  <Mail className="w-4 h-4 flex-shrink-0" style={{ color: "#ff6700" }} />
                  <a href={`mailto:${selectedMessage.senderInfo?.email}`} className="hover:underline break-all">
                    {selectedMessage.senderInfo?.email}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-[#8b949e]">
                  <Phone className="w-4 h-4 flex-shrink-0" style={{ color: "#004d59" }} />
                  <a href={`tel:${selectedMessage.senderInfo?.phoneNumber}`} className="hover:underline" dir="ltr">
                    {selectedMessage.senderInfo?.phoneNumber}
                  </a>
                </div>
                {selectedMessage.service && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-[#8b949e]">
                    <Tag className="w-4 h-4 flex-shrink-0" style={{ color: "#feaf00" }} />
                    <span>{getServiceLabel(selectedMessage.service)}</span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-[#6e7681] uppercase tracking-wide mb-2">
                  {isRTL ? "الرسالة" : "Message"}
                </p>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#0d1117] border border-gray-100 dark:border-[#30363d] text-sm text-gray-700 dark:text-[#e6edf3] whitespace-pre-wrap leading-relaxed">
                  {selectedMessage.message}
                </div>
              </div>

              {/* ── Reply block ── */}
              <div>
                {selectedMessage.replied && !replySent && !showReplyBox && (
                  <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isRTL ? "رديت على الرسالة دي قبل كده" : "You've already replied to this message"}
                  </p>
                )}

                {replySent ? (
                  <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black">
                    <CheckCircle2 className="w-4 h-4" />
                    {isRTL ? "تم إرسال الرد بنجاح" : "Reply sent successfully"}
                  </div>
                ) : showReplyBox ? (
                  <div className="space-y-3">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={4}
                      placeholder={isRTL ? "اكتب ردك هنا..." : "Write your reply here..."}
                      className="w-full px-4 py-3 text-sm rounded-xl bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 outline-none focus:ring-2 focus:border-[#ff6700] resize-none"
                      style={{ "--tw-ring-color": "#ff670030" } as React.CSSProperties}
                      autoFocus
                    />
                    {replyError && (
                      <p className="text-xs text-red-500 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {replyError}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSendReply}
                        disabled={sendingReply || !replyText.trim()}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-black hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}
                      >
                        {sendingReply ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Reply className="w-4 h-4" />
                        )}
                        {sendingReply
                          ? (isRTL ? "جاري الإرسال..." : "Sending...")
                          : (isRTL ? "إرسال الرد" : "Send Reply")}
                      </button>
                      <button
                        onClick={() => {
                          setShowReplyBox(false);
                          setReplyError("");
                        }}
                        disabled={sendingReply}
                        className="px-4 py-3 rounded-xl border border-gray-200 dark:border-[#30363d] text-gray-500 dark:text-[#8b949e] hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors disabled:opacity-50"
                      >
                        {isRTL ? "إلغاء" : "Cancel"}
                      </button>
                    </div>
                    <a
                      href={`mailto:${selectedMessage.senderInfo?.email}?subject=${encodeURIComponent(
                        isRTL ? "رد على رسالتك" : "Re: Your message"
                      )}`}
                      className="block text-center text-xs text-gray-400 dark:text-[#6e7681] hover:underline"
                    >
                      {isRTL ? "أو افتح تطبيق الإيميل بتاعك" : "or open your email app instead"}
                    </a>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowReplyBox(true)}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-black hover:shadow-lg transition-all"
                    style={{ background: "linear-gradient(135deg, #004d59, #ff6700)" }}
                  >
                    <Reply className="w-4 h-4" />
                    {isRTL ? "الرد على الرسالة" : "Reply to Message"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}