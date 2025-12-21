"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  User,
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  BookOpen,
  Star,
  Target,
  TrendingUp,
  Hash,
  AlertCircle,
  Info,
  MoreHorizontal,
  FileText,
  UserPlus
} from "lucide-react";
import Modal from "./Modal";
import StudentForm from "./StudentForm";
import { useI18n } from "@/i18n/I18nProvider";

export default function StudentAdmin() {
  const { t } = useI18n();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    level: "",
    source: "",
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalStudents: 0,
    totalPages: 1
  });

  // دالة لتنسيق التاريخ
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  // تحميل الطلاب مع الفلاتر
  const loadStudents = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: filters.page,
        limit: filters.limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.level && { level: filters.level }),
        ...(filters.source && { source: filters.source })
      });

      const res = await fetch(`/api/allStudents?${queryParams}`, {
        cache: "no-store",
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      const json = await res.json();
      console.log("API Response:", json);

      if (json.success) {
        setStudents(json.data || []);

        if (json.pagination) {
          setPagination({
            page: json.pagination.page || 1,
            limit: json.pagination.limit || 10,
            totalStudents: json.pagination.totalStudents || (json.data?.length || 0),
            totalPages: json.pagination.totalPages || 1
          });
        } else {
          setPagination(prev => ({
            ...prev,
            totalStudents: json.data?.length || 0
          }));
        }
      } else {
        toast.error(json.message || t("students.loadError"));
      }
    } catch (err) {
      console.error("Error loading students:", err);
      toast.error(t("students.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [filters.page, filters.status, filters.level, filters.source]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const onSaved = async () => {
    await loadStudents();
    toast.success(t("students.savedSuccess"));
  };

  const onEdit = (student) => {
    setEditingStudent(student);
    setModalOpen(true);
  };

  const onView = async (id) => {
    try {
      const res = await fetch(`/api/allStudents/${id}`);
      const json = await res.json();

      if (json.success) {
        setEditingStudent(json.data);
        setModalOpen(true);
      }
    } catch (err) {
      console.error("Error viewing student:", err);
      toast.error(t("students.loadError"));
    }
  };

  const onDelete = async (id, name) => {
    toast(
      (toastInstance) => (
        <div className="w-404 max-w-full bg-white dark:bg-darkmode rounded-14 shadow-round-box p-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600 font-bold">
              !
            </div>
            <div className="flex-1">
              <p className="text-16 font-semibold">
                {t("common.delete")} {t("common.student")}
              </p>
              <p className="text-14 mt-1 text-slate-500 dark:text-darktext">
                {t("students.deleteConfirm")} <strong>{name}</strong>? {t("students.deleteWarning")}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              className="px-3 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded-14 text-15 hover:opacity-90 border border-PeriwinkleBorder/50"
              onClick={() => toast.dismiss(toastInstance.id)}
            >
              {t("common.cancel")}
            </button>
            <button
              className="px-3 py-1 bg-red-600 text-white rounded-14 text-15 hover:bg-red-700 shadow-sm"
              onClick={async () => {
                toast.dismiss(toastInstance.id);
                try {
                  const res = await fetch(`/api/allStudents/${id}`, {
                    method: "DELETE",
                  });

                  if (res.ok) {
                    await loadStudents();
                    toast.success(t("students.deletedSuccess"));
                  } else {
                    const error = await res.json();
                    toast.error(error.message || t("students.deleteFailed"));
                  }
                } catch (err) {
                  console.error("Error deleting student:", err);
                  toast.error(t("students.deleteError"));
                }
              }}
            >
              {t("common.delete")}
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: "top-center" }
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'Suspended': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'Graduated': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Dropped': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'Beginner': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Intermediate': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'Advanced': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Safe calculation functions
  const getActiveStudentsCount = () => {
    return students.filter(s => s.enrollmentInfo?.status === 'Active').length;
  };

  const getGraduatedCount = () => {
    return students.filter(s => s.enrollmentInfo?.status === 'Graduated').length;
  };

  const getAvgCourses = () => {
    if (students.length === 0) return 0;
    const totalCourses = students.reduce((acc, s) =>
      acc + (s.academicInfo?.currentCourses?.length || 0), 0
    );
    return Math.round(totalCourses / students.length);
  };

  if (loading && students.length === 0) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* Header Section */}
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm p-4 md:p-6 border border-PowderBlueBorder dark:border-dark_border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1 md:space-y-2">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 md:w-7 md:h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-MidnightNavyText dark:text-white">
                  {t("students.management")}
                </h1>
                <p className="text-xs md:text-sm text-SlateBlueText dark:text-darktext">
                  {t("students.managementDescription")}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingStudent(null);
              setModalOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 md:px-6 md:py-3 rounded-lg font-semibold text-xs md:text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 w-full md:w-auto justify-center"
          >
            <UserPlus className="w-4 h-4" />
            {t("students.addNew")}
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                {t("students.stats.total")}
              </p>
              <p className="text-lg md:text-2xl font-bold text-MidnightNavyText dark:text-white mt-0.5">
                {pagination.totalStudents || students.length}
              </p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                {t("students.stats.active")}
              </p>
              <p className="text-lg md:text-2xl font-bold text-MidnightNavyText dark:text-white mt-0.5">
                {getActiveStudentsCount()}
              </p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                {t("students.stats.graduated")}
              </p>
              <p className="text-lg md:text-2xl font-bold text-MidnightNavyText dark:text-white mt-0.5">
                {getGraduatedCount()}
              </p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                {t("students.stats.avgCourses")}
              </p>
              <p className="text-lg md:text-2xl font-bold text-MidnightNavyText dark:text-white mt-0.5">
                {getAvgCourses()}
              </p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-darkmode rounded-xl p-3 md:p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="space-y-3 md:space-y-0 md:flex md:items-center md:gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t("students.searchPlaceholder")}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white w-full"
              >
                <option value="">{t("students.allStatuses")}</option>
                <option value="Active">{t("students.status.active")}</option>
                <option value="Suspended">{t("students.status.suspended")}</option>
                <option value="Graduated">{t("students.status.graduated")}</option>
                <option value="Dropped">{t("students.status.dropped")}</option>
              </select>
            </div>

            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="px-3 py-2 text-sm border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            >
              <option value="">{t("students.allLevels")}</option>
              <option value="Beginner">{t("students.level.beginner")}</option>
              <option value="Intermediate">{t("students.level.intermediate")}</option>
              <option value="Advanced">{t("students.level.advanced")}</option>
            </select>

            <button
              onClick={() => loadStudents()}
              className="px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden md:inline">{t("students.refresh")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border shadow-sm overflow-hidden">
        <div className="overflow-x-auto -mx-2 md:mx-0">
          <div className="min-w-full inline-block align-middle">
            <table className="min-w-full divide-y divide-PowderBlueBorder dark:divide-dark_border">
              <thead className="bg-gray-50 dark:bg-dark_input">
                <tr>
                  <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      {t("students.table.student")}
                    </div>
                  </th>
                  <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" />
                      {t("students.table.enrollment")}
                    </div>
                  </th>
                  <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      {t("students.table.status")}
                    </div>
                  </th>
                  <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {t("students.table.level")}
                    </div>
                  </th>
                  <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {t("students.table.contact")}
                    </div>
                  </th>
                  <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {t("students.table.enrolled")}
                    </div>
                  </th>
                  <th className="py-2.5 px-3 md:px-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <MoreHorizontal className="w-3.5 h-3.5" />
                      {t("students.table.actions")}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-PowderBlueBorder dark:divide-dark_border">
                {students.map((student) => (
                  <tr key={student.id || student._id} className="hover:bg-gray-50 dark:hover:bg-dark_input transition-colors">
                    <td className="py-2.5 px-3 md:px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-MidnightNavyText dark:text-white truncate max-w-[120px] md:max-w-none">
                            {student.personalInfo?.fullName || 'N/A'}
                          </p>
                          <p className="text-xs text-SlateBlueText dark:text-darktext truncate max-w-[120px] md:max-w-none">
                            {student.personalInfo?.email || t("students.table.noEmail")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 md:px-4">
                      <div className="flex items-center gap-1.5">
                        <Hash className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded truncate max-w-[80px] md:max-w-none">
                          {student.enrollmentNumber || t("students.table.enrollmentNumber")}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 md:px-4">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${
                          student.enrollmentInfo?.status === 'Active' ? 'bg-green-500' :
                          student.enrollmentInfo?.status === 'Suspended' ? 'bg-yellow-500' :
                          student.enrollmentInfo?.status === 'Graduated' ? 'bg-blue-500' :
                          student.enrollmentInfo?.status === 'Dropped' ? 'bg-red-500' : 'bg-gray-500'
                        }`} />
                        <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${getStatusColor(student.enrollmentInfo?.status)}`}>
                          {student.enrollmentInfo?.status?.charAt(0) || 'U'}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 md:px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${getLevelColor(student.academicInfo?.level)}`}>
                        {student.academicInfo?.level?.charAt(0) || 'U'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 md:px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate max-w-[80px] md:max-w-none">
                            {student.personalInfo?.phone || t("students.table.noPhone")}
                          </span>
                        </div>
                        {student.personalInfo?.whatsappNumber && (
                          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <span className="text-xs">✓</span>
                            <span className="hidden md:inline">WhatsApp</span>
                            <span className="md:hidden">WA</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 md:px-4">
                      <div className="flex items-center gap-1.5 text-xs text-SlateBlueText dark:text-darktext">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span>
                          {student.createdAt ? formatDate(student.createdAt) :
                            student.metadata?.createdAt ? formatDate(student.metadata.createdAt) : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 md:px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onView(student.id || student._id)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title={t("common.view")}
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </button>
                        <button
                          onClick={() => onEdit(student)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title={t("common.edit")}
                        >
                          <Edit className="w-3.5 h-3.5 text-primary" />
                        </button>
                        <button
                          onClick={() => onDelete(student.id || student._id, student.personalInfo?.fullName || t("common.student"))}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title={t("common.delete")}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {students.length === 0 && !loading && (
          <div className="text-center py-8 md:py-12 px-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
              <Users className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
            <h3 className="text-base md:text-lg font-bold text-MidnightNavyText dark:text-white mb-1 md:mb-2">
              {t("students.noStudents")}
            </h3>
            <p className="text-xs md:text-sm text-SlateBlueText dark:text-darktext mb-4 md:mb-6 max-w-md mx-auto">
              {filters.search || filters.status || filters.level || filters.source
                ? t("students.noMatchingResults")
                : t("students.noStudentsDescription")}
            </p>
            {!filters.search && !filters.status && !filters.level && !filters.source && (
              <button
                onClick={() => setModalOpen(true)}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 md:px-8 md:py-3 rounded-lg font-semibold text-xs md:text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
              >
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {t("students.createFirstButton")}
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-3 md:px-4 py-3 border-t border-PowderBlueBorder dark:border-dark_border">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
              <div className="text-xs text-SlateBlueText dark:text-darktext">
                {t("students.pagination.showing")} <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> {t("students.pagination.to")}{" "}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.totalStudents)}
                </span>{" "}
                {t("students.pagination.of")} <span className="font-medium">{pagination.totalStudents || students.length}</span> {t("students.pagination.students")}
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <button
                  onClick={() => handleFilterChange('page', 1)}
                  disabled={pagination.page === 1}
                  className="p-1.5 md:p-2 border border-PowderBlueBorder dark:border-dark_border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark_input"
                  title="First page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
                <button
                  onClick={() => handleFilterChange('page', pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-1.5 md:p-2 border border-PowderBlueBorder dark:border-dark_border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark_input"
                  title="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
                <span className="px-2 md:px-3 py-1 text-xs md:text-sm">
                  {t("students.pagination.page")} {pagination.page} {t("students.pagination.of")} {pagination.totalPages}
                </span>
                <button
                  onClick={() => handleFilterChange('page', pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-1.5 md:p-2 border border-PowderBlueBorder dark:border-dark_border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark_input"
                  title="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
                <button
                  onClick={() => handleFilterChange('page', pagination.totalPages)}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-1.5 md:p-2 border border-PowderBlueBorder dark:border-dark_border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark_input"
                  title="Last page"
                >
                  <ChevronsRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        title={editingStudent ? t("studentForm.updateStudent") : t("studentForm.createStudent")}
        onClose={() => {
          setModalOpen(false);
          setEditingStudent(null);
        }}
        size="lg"
      >
        <StudentForm
          initial={editingStudent}
          onClose={() => {
            setModalOpen(false);
            setEditingStudent(null);
          }}
          onSaved={onSaved}
        />
      </Modal>
    </div>
  );
}