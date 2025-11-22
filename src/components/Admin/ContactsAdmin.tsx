"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
    Search,
    Filter,
    Mail,
    Phone,
    Calendar,
    Clock,
    User,
    Edit,
    Trash2,
    Eye,
    Download,
    RefreshCw,
    CheckCircle,
    XCircle,
    ClockIcon,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

interface Contact {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    specialist: string;
    date: string | null;
    time: string;
    message: string;
    appointmentType: string;
    status: "pending" | "confirmed" | "cancelled" | "completed";
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function ContactsAdmin() {
    const { t } = useI18n();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
    const [viewContact, setViewContact] = useState<Contact | null>(null);

    const loadContacts = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/contact?limit=100", {
                cache: "no-store"
            });
            const json = await res.json();
            if (json.success) {
                setContacts(json.data);
            }
        } catch (err) {
            console.error("Error loading contacts:", err);
            toast.error(t("contacts.loadError"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadContacts();
    }, []);

    const filteredContacts = contacts.filter(contact => {
        const matchesSearch =
            contact.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.phone.includes(searchTerm);

        const matchesStatus = statusFilter === "all" || contact.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // وظيفة التصدير إلى CSV
    const exportToCSV = () => {
        if (filteredContacts.length === 0) {
            toast.error("لا توجد بيانات للتصدير");
            return;
        }

        const headers = [
            'الاسم',
            'البريد الإلكتروني',
            'الهاتف',
            'نوع الموعد',
            'المتخصص',
            'التاريخ',
            'الوقت',
            'الحالة',
            'تاريخ الإنشاء'
        ];

        const csvData = filteredContacts.map(contact => [
            `${contact.firstName} ${contact.lastName}`,
            contact.email,
            contact.phone || 'N/A',
            contact.appointmentType,
            contact.specialist || 'N/A',
            contact.date ? new Date(contact.date).toLocaleDateString('ar-EG') : 'N/A',
            contact.time || 'N/A',
            contact.status,
            new Date(contact.createdAt).toLocaleDateString('ar-EG')
        ]);

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `contacts_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("تم تصدير البيانات بنجاح");
    };

    const updateContactStatus = async (id: string, status: Contact["status"]) => {
        try {
            const res = await fetch(`/api/contact/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });

            if (res.ok) {
                setContacts(prev =>
                    prev.map(contact =>
                        contact._id === id ? { ...contact, status } : contact
                    )
                );
                toast.success(t("contacts.statusUpdated"));
            } else {
                toast.error(t("contacts.updateError"));
            }
        } catch (err) {
            console.error("Error updating contact:", err);
            toast.error(t("contacts.updateError"));
        }
    };

    const deleteContact = async (id: string) => {
        toast(
            (tObj) => (
                <div className="w-404 max-w-full bg-white dark:bg-darkmode text-MidnightNavyText dark:text-white rounded-14 shadow-round-box border-none outline-none dark:border-dark_border p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600 font-bold">
                            !
                        </div>
                        <div className="flex-1">
                            <p className="text-16 font-semibold">
                                {t("contacts.deleteConfirm")}
                            </p>
                            <p className="text-14 mt-1 text-slate-500 dark:text-darktext">
                                {t("contacts.deleteWarning")}
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            className="px-3 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded-14 text-15 hover:opacity-90 border border-PeriwinkleBorder/50"
                            onClick={() => toast.dismiss(tObj.id)}
                        >
                            {t("common.cancel")}
                        </button>
                        <button
                            className="px-3 py-1 bg-red-600 text-white rounded-14 text-15 hover:bg-red-700 shadow-sm"
                            onClick={async () => {
                                toast.dismiss(tObj.id);
                                try {
                                    const res = await fetch(`/api/contact/${id}`, {
                                        method: "DELETE"
                                    });
                                    if (res.ok) {
                                        setContacts(prev => prev.filter(c => c._id !== id));
                                        toast.success(t("contacts.deletedSuccess"));
                                    } else {
                                        toast.error(t("contacts.deleteFailed"));
                                    }
                                } catch (err) {
                                    console.error("Error deleting contact:", err);
                                    toast.error(t("contacts.deleteError"));
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

    // وظيفة عرض تفاصيل الاتصال
    const handleViewContact = (contact: Contact) => {
        setViewContact(contact);
    };

    const getStatusColor = (status: Contact["status"]) => {
        return "px-3 py-2 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-sm";
    };

    const getAppointmentTypeColor = (type: string) => {
        switch (type) {
            case "consultation":
                return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
            case "technical":
                return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
            case "admission":
                return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return t("contactDetails.notAvailable");

        const date = new Date(dateString);
        const language = document.documentElement.dir === 'rtl' ? 'ar-EG' : 'en-US';

        return date.toLocaleDateString(language, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <span className="ml-2">{t("contacts.loading")}</span>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                {/* Header Section */}
                <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm p-6 border border-PowderBlueBorder dark:border-dark_border">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-MidnightNavyText dark:text-white flex items-center gap-3">
                                <Mail className="w-7 h-7 text-primary" />
                                {t("contacts.management")}
                            </h1>
                            <p className="text-sm text-SlateBlueText dark:text-darktext">
                                {t("contacts.managementDescription")}
                            </p>
                        </div>
                        <div className="flex gap-3 mt-4 lg:mt-0">
                            <button
                                onClick={loadContacts}
                                className="bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 hover:bg-IcyBreeze dark:hover:bg-darklight flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                {t("common.refresh")}
                            </button>
                            <button
                                onClick={exportToCSV}
                                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                {t("common.export")}
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
                                    {t("contacts.totalContacts")}
                                </p>
                                <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                                    {contacts.length}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Mail className="w-5 h-5 text-primary" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                                    {t("contacts.pending")}
                                </p>
                                <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                                    {contacts.filter(c => c.status === "pending").length}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <ClockIcon className="w-5 h-5 text-yellow-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                                    {t("contacts.confirmed")}
                                </p>
                                <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                                    {contacts.filter(c => c.status === "confirmed").length}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                                    {t("contacts.today")}
                                </p>
                                <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                                    {contacts.filter(c => {
                                        const today = new Date().toDateString();
                                        const contactDate = new Date(c.createdAt).toDateString();
                                        return contactDate === today;
                                    }).length}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-SlateBlueText dark:text-darktext w-4 h-4" />
                            <input
                                type="text"
                                placeholder={t("contacts.searchPlaceholder")}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-sm"
                            />
                        </div>
                        <div className="flex gap-3">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-sm"
                            >
                                <option value="all">{t("contacts.allStatuses")}</option>
                                <option value="pending">{t("contacts.status.pending")}</option>
                                <option value="confirmed">{t("contacts.status.confirmed")}</option>
                                <option value="cancelled">{t("contacts.status.cancelled")}</option>
                                <option value="completed">{t("contacts.status.completed")}</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Contacts Table */}
                <div className="bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-IcyBreeze dark:bg-dark_input border-b border-PowderBlueBorder dark:border-dark_border">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        {t("contacts.contact")}
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        {t("contacts.appointment")}
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        {t("contacts.dateTime")}
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        {t("contacts.status")}
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-MidnightNavyText dark:text-white uppercase tracking-wider">
                                        {t("common.actions")}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-PowderBlueBorder dark:divide-dark_border">
                                {filteredContacts.map((contact) => (
                                    <tr key={contact._id} className="hover:bg-IcyBreeze dark:hover:bg-dark_input transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                                    <User className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-MidnightNavyText dark:text-white">
                                                        {contact.firstName} {contact.lastName}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext mt-1">
                                                        <Mail className="w-3 h-3" />
                                                        {contact.email}
                                                    </div>
                                                    {contact.phone && (
                                                        <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                                                            <Phone className="w-3 h-3" />
                                                            {contact.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAppointmentTypeColor(contact.appointmentType)}`}>
                                                    {t(`contacts.appointmentType.${contact.appointmentType}`)}
                                                </span>
                                                {contact.specialist && (
                                                    <div className="text-sm text-SlateBlueText dark:text-darktext mt-1">
                                                        {contact.specialist}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-MidnightNavyText dark:text-white">
                                                {formatDate(contact.date)}
                                            </div>
                                            {contact.time && (
                                                <div className="flex items-center gap-1 text-sm text-SlateBlueText dark:text-darktext">
                                                    <Clock className="w-3 h-3" />
                                                    {contact.time}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={contact.status}
                                                onChange={(e) => updateContactStatus(contact._id, e.target.value as Contact["status"])}
                                                className={`px-3 py-1 rounded-full text-xs font-medium border-none outline-none focus:ring-2 focus:ring-primary ${getStatusColor(contact.status)}`}
                                            >
                                                <option value="pending">{t("contacts.status.pending")}</option>
                                                <option value="confirmed">{t("contacts.status.confirmed")}</option>
                                                <option value="cancelled">{t("contacts.status.cancelled")}</option>
                                                <option value="completed">{t("contacts.status.completed")}</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleViewContact(contact)}
                                                    className="p-2 text-SlateBlueText dark:text-darktext hover:text-primary dark:hover:text-primary transition-colors"
                                                    title={t("common.view")}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => deleteContact(contact._id)}
                                                    className="p-2 text-SlateBlueText dark:text-darktext hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                    title={t("common.delete")}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty State */}
                    {filteredContacts.length === 0 && (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-3">
                                {t("contacts.noContacts")}
                            </h3>
                            <p className="text-sm text-SlateBlueText dark:text-darktext">
                                {searchTerm || statusFilter !== "all"
                                    ? t("contacts.noMatchingResults")
                                    : t("contacts.noContactsDescription")
                                }
                            </p>
                        </div>
                    )}
                </div>


            </div>

            {viewContact && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-darkmode rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-MidnightNavyText dark:text-white">
                                {t("contactDetails.title")}
                            </h3>
                            <button
                                onClick={() => setViewContact(null)}
                                className="text-SlateBlueText dark:text-darktext hover:text-red-600 text-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-SlateBlueText dark:text-darktext">
                                        {t("contactDetails.name")}
                                    </label>
                                    <p className="text-MidnightNavyText dark:text-white mt-1">
                                        {viewContact.firstName} {viewContact.lastName}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-SlateBlueText dark:text-darktext">
                                        {t("contactDetails.email")}
                                    </label>
                                    <p className="text-MidnightNavyText dark:text-white mt-1">
                                        {viewContact.email}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-SlateBlueText dark:text-darktext">
                                        {t("contactDetails.phone")}
                                    </label>
                                    <p className="text-MidnightNavyText dark:text-white mt-1">
                                        {viewContact.phone || t("contactDetails.notAvailable")}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-SlateBlueText dark:text-darktext">
                                        {t("contactDetails.appointmentType")}
                                    </label>
                                    <p className="text-MidnightNavyText dark:text-white mt-1">
                                        {t(`contacts.appointmentType.${viewContact.appointmentType}`)}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-SlateBlueText dark:text-darktext">
                                        {t("contactDetails.specialist")}
                                    </label>
                                    <p className="text-MidnightNavyText dark:text-white mt-1">
                                        {viewContact.specialist || t("contactDetails.notSpecified")}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-SlateBlueText dark:text-darktext">
                                        {t("contactDetails.status")}
                                    </label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewContact.status)}`}>
                                            {t(`contacts.status.${viewContact.status}`)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-SlateBlueText dark:text-darktext">
                                        {t("contactDetails.date")}
                                    </label>
                                    <p className="text-MidnightNavyText dark:text-white mt-1">
                                        {formatDate(viewContact.date)}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-SlateBlueText dark:text-darktext">
                                        {t("contactDetails.time")}
                                    </label>
                                    <p className="text-MidnightNavyText dark:text-white mt-1">
                                        {viewContact.time || t("contactDetails.notSpecified")}
                                    </p>
                                </div>
                            </div>

                            {viewContact.message && (
                                <div>
                                    <label className="block text-sm font-medium text-SlateBlueText dark:text-darktext">
                                        {t("contactDetails.message")}
                                    </label>
                                    <p className="text-MidnightNavyText dark:text-white bg-IcyBreeze dark:bg-dark_input p-3 rounded-lg mt-1 whitespace-pre-wrap">
                                        {viewContact.message}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-SlateBlueText dark:text-darktext">
                                        {t("contactDetails.createdAt")}
                                    </label>
                                    <p className="text-MidnightNavyText dark:text-white mt-1">
                                        {new Date(viewContact.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-SlateBlueText dark:text-darktext">
                                        {t("contactDetails.updatedAt")}
                                    </label>
                                    <p className="text-MidnightNavyText dark:text-white mt-1">
                                        {new Date(viewContact.updatedAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
                            <button
                                onClick={() => setViewContact(null)}
                                className="px-4 py-2 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded-lg font-semibold text-sm hover:bg-IcyBreeze dark:hover:bg-darklight transition-all duration-300 border border-PowderBlueBorder dark:border-dark_border"
                            >
                                {t("contactDetails.close")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}