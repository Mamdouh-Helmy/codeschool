"use client";
import { useState, useEffect, useCallback } from "react";
import {
    Link as LinkIcon,
    Globe,
    Lock,
    Calendar,
    Clock,
    Users,
    AlertCircle,
    Eye,
    EyeOff,
    Save,
    X,
    Plus,
    Trash2
} from "lucide-react";
import toast from "react-hot-toast";

export default function MeetingLinkForm({ initial, onClose, onSaved }) {
    const daysOfWeek = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ];

    const platforms = [
        { value: "zoom", label: "Zoom", icon: "🔷" },
        { value: "google_meet", label: "Google Meet", icon: "🔴" },
        { value: "microsoft_teams", label: "Microsoft Teams", icon: "🔵" },
        { value: "other", label: "Other", icon: "🔗" },
    ];

    const statusOptions = [
        { value: "available", label: "Available", color: "bg-green-100 text-green-800", description: "Available for reservation" },
        { value: "reserved", label: "Reserved", color: "bg-blue-100 text-blue-800", description: "Currently reserved for a session" },
        { value: "in_use", label: "In Use", color: "bg-purple-100 text-purple-800", description: "Currently being used in an active session" },
        { value: "maintenance", label: "Maintenance", color: "bg-yellow-100 text-yellow-800", description: "Under maintenance, not available" },
        { value: "inactive", label: "Inactive", color: "bg-gray-100 text-gray-800", description: "Permanently inactive" },
    ];

    const [form, setForm] = useState(() => ({
        name: initial?.name || "",
        link: initial?.link || "",
        platform: initial?.platform || "zoom",
        credentials: {
            username: initial?.credentials?.username || "",
            password: initial?.credentials?.password || "",
        },
        capacity: initial?.capacity || 100,
        durationLimit: initial?.durationLimit || 120,
        status: initial?.status || "available",
        allowedDays: initial?.allowedDays || [...daysOfWeek],
        allowedTimeSlots: initial?.allowedTimeSlots || [],
        notes: initial?.metadata?.notes || initial?.notes || "",
    }));

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [newTimeSlot, setNewTimeSlot] = useState({ startTime: "08:00", endTime: "22:00" });
    const [timeSlotError, setTimeSlotError] = useState("");

    const onChange = useCallback((path, value) => {
        const paths = path.split(".");
        setForm((prev) => {
            const newForm = JSON.parse(JSON.stringify(prev));
            let current = newForm;
            for (let i = 0; i < paths.length - 1; i++) {
                current = current[paths[i]];
            }
            current[paths[paths.length - 1]] = value;
            return newForm;
        });
    }, []);

    const onCredentialsChange = useCallback((field, value) => {
        setForm((prev) => ({
            ...prev,
            credentials: {
                ...prev.credentials,
                [field]: value,
            },
        }));
    }, []);

    const toggleDay = useCallback((day) => {
        setForm((prev) => {
            const currentDays = prev.allowedDays;
            const isSelected = currentDays.includes(day);

            if (isSelected && currentDays.length === 1) {
                toast.error("At least one day must be selected");
                return prev;
            }

            return {
                ...prev,
                allowedDays: isSelected
                    ? currentDays.filter((d) => d !== day)
                    : [...currentDays, day],
            };
        });
    }, []);

    const addTimeSlot = useCallback(() => {
        const { startTime, endTime } = newTimeSlot;

        if (startTime >= endTime) {
            setTimeSlotError("End time must be after start time");
            return;
        }

        const hasOverlap = form.allowedTimeSlots.some(
            (slot) =>
                (startTime >= slot.startTime && startTime < slot.endTime) ||
                (endTime > slot.startTime && endTime <= slot.endTime)
        );

        if (hasOverlap) {
            setTimeSlotError("Time slot overlaps with existing slot");
            return;
        }

        setTimeSlotError("");

        setForm((prev) => ({
            ...prev,
            allowedTimeSlots: [...prev.allowedTimeSlots, { startTime, endTime }],
        }));

        setNewTimeSlot({ startTime: "08:00", endTime: "22:00" });
    }, [form.allowedTimeSlots, newTimeSlot]);

    const removeTimeSlot = useCallback((index) => {
        setForm((prev) => ({
            ...prev,
            allowedTimeSlots: prev.allowedTimeSlots.filter((_, i) => i !== index),
        }));
    }, []);

    const validateForm = useCallback(() => {
        if (!form.name.trim()) {
            toast.error("Meeting link name is required");
            return false;
        }

        if (!form.link.trim()) {
            toast.error("Meeting link URL is required");
            return false;
        }

        // Basic URL validation
        const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/;
        if (!urlPattern.test(form.link)) {
            toast.error("Please enter a valid URL");
            return false;
        }

        if (form.capacity < 1) {
            toast.error("Capacity must be at least 1");
            return false;
        }

        if (form.durationLimit < 30) {
            toast.error("Minimum duration is 30 minutes");
            return false;
        }

        if (form.allowedDays.length === 0) {
            toast.error("At least one day must be selected");
            return false;
        }

        return true;
    }, [form]);

    const generatePassword = useCallback(() => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        onCredentialsChange("password", password);
    }, [onCredentialsChange]);

    const getPlatformPlaceholder = useCallback(() => {
        switch (form.platform) {
            case "zoom":
                return "https://zoom.us/j/1234567890";
            case "google_meet":
                return "https://meet.google.com/abc-defg-hij";
            case "microsoft_teams":
                return "https://teams.microsoft.com/l/meetup-join/...";
            default:
                return "https://example.com/meeting-link";
        }
    }, [form.platform]);

    const getStatusColorClass = (statusValue) => {
        switch (statusValue) {
            case 'available': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'reserved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'in_use': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            case 'maintenance': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const getStatusDescription = (statusValue) => {
        const status = statusOptions.find(s => s.value === statusValue);
        return status ? status.description : "";
    };

    // ✅ FIX: دالة السابميت المعدلة
    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const toastId = toast.loading(
            initial ? "Updating meeting link..." : "Creating meeting link..."
        );

        try {
            if (!validateForm()) {
                toast.dismiss(toastId);
                setLoading(false);
                return;
            }

            // ✅ FIX: استخدام id بشكل صحيح
            const meetingLinkId = initial?.id || initial?._id;
            
            // Prepare payload
            const payload = {
                ...form,
                capacity: parseInt(form.capacity),
                durationLimit: parseInt(form.durationLimit),
            };

            console.log("📤 Sending payload:", payload);
            console.log("📤 Meeting Link ID:", meetingLinkId);

            const method = meetingLinkId ? "PUT" : "POST";
            const url = meetingLinkId ? `/api/meeting-links/${meetingLinkId}` : "/api/meeting-links";

            console.log("📤 API URL:", url);
            console.log("📤 Method:", method);

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await res.json();
            console.log("📥 API Response:", result);

            if (!res.ok) {
                throw new Error(result.error || "Failed to save meeting link");
            }

            toast.success(
                meetingLinkId ? "Meeting link updated successfully" : "Meeting link created successfully",
                { id: toastId }
            );

            if (onSaved) onSaved();
            if (onClose) onClose();
        } catch (err) {
            console.error("❌ Error saving meeting link:", err);
            toast.error(err.message || "Failed to save meeting link", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const handleNewTimeSlotChange = (field, value) => {
        setNewTimeSlot(prev => ({ ...prev, [field]: value }));
    };

    return (
        <form onSubmit={submit} className="space-y-6 pr-2">
            {/* Basic Information */}
            <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Globe className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                        Basic Information
                    </h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
                            Meeting Link Name *
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => onChange("name", e.target.value)}
                            placeholder="e.g., Zoom Room A, Google Meet Room 1"
                            className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
                                Platform *
                            </label>
                            <select
                                value={form.platform}
                                onChange={(e) => onChange("platform", e.target.value)}
                                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                                required
                            >
                                {platforms.map((platform) => (
                                    <option key={platform.value} value={platform.value}>
                                        {platform.icon} {platform.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
                                Status *
                            </label>
                            <select
                                value={form.status}
                                onChange={(e) => onChange("status", e.target.value)}
                                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                                required
                            >
                                {statusOptions.map((status) => (
                                    <option key={status.value} value={status.value}>
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                            <div className="mt-2 flex items-start gap-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getStatusColorClass(form.status)}`}>
                                    {statusOptions.find(s => s.value === form.status)?.label || "Unknown"}
                                </span>
                                <p className="text-xs text-gray-500 flex-1">
                                    {getStatusDescription(form.status)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
                            Meeting Link URL *
                        </label>
                        <div className="flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-gray-400" />
                            <input
                                type="url"
                                value={form.link}
                                onChange={(e) => onChange("link", e.target.value)}
                                placeholder={getPlatformPlaceholder()}
                                className="flex-1 px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                                required
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Credentials */}
            <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                        Meeting Credentials
                    </h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
                            Username
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                <span className="text-sm">👤</span>
                            </div>
                            <input
                                type="text"
                                value={form.credentials.username}
                                onChange={(e) => onCredentialsChange("username", e.target.value)}
                                placeholder="e.g., admin, host, meeting.user"
                                className="flex-1 px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
                            Password
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={form.credentials.password}
                                    onChange={(e) => onCredentialsChange("password", e.target.value)}
                                    placeholder="Enter meeting password"
                                    className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={generatePassword}
                                className="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
                            >
                                Generate
                            </button>
                        </div>
                        {form.credentials.password && (
                            <div className="mt-2 text-xs text-gray-500">
                                Password strength: {form.credentials.password.length >= 12 ? "Strong" :
                                    form.credentials.password.length >= 8 ? "Medium" : "Weak"}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Capacity & Duration */}
            <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                        Capacity & Duration
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
                            Maximum Participants
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={form.capacity}
                                onChange={(e) => onChange("capacity", e.target.value)}
                                min="1"
                                max="1000"
                                className="flex-1 px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                            />
                            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                <Users className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Maximum number of participants allowed in the meeting
                        </p>
                    </div>

                    <div>
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
                            Maximum Duration (minutes)
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={form.durationLimit}
                                onChange={(e) => onChange("durationLimit", e.target.value)}
                                min="30"
                                max="1440"
                                step="30"
                                className="flex-1 px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                            />
                            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                <Clock className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Maximum session duration (30-1440 minutes)
                        </p>
                    </div>
                </div>
            </div>

            {/* Availability Schedule */}
            <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                        Availability Schedule
                    </h3>
                </div>

                <div className="space-y-4">
                    {/* Days of Week */}
                    <div>
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
                            Available Days
                        </label>
                        <div className="grid grid-cols-7 gap-2">
                            {daysOfWeek.map((day) => {
                                const isSelected = form.allowedDays.includes(day);
                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleDay(day)}
                                        className={`px-2 py-2 text-xs rounded-lg font-medium transition-all ${isSelected
                                                ? "bg-primary text-white"
                                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                            }`}
                                    >
                                        {day.slice(0, 3)}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Select days when this meeting link is available
                        </p>
                        <div className="mt-2">
                            <span className="text-xs text-gray-500">
                                Selected: {form.allowedDays.length} days
                            </span>
                        </div>
                    </div>

                    {/* Time Slots */}
                    <div>
                        <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
                            Allowed Time Slots (Optional)
                        </label>

                        <div className="space-y-3">
                            {/* Add new time slot */}
                            <div className="flex items-center gap-2">
                                <div className="flex-1 grid grid-cols-2 gap-2">
                                    <input
                                        type="time"
                                        value={newTimeSlot.startTime}
                                        onChange={(e) => handleNewTimeSlotChange("startTime", e.target.value)}
                                        className="px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                                    />
                                    <input
                                        type="time"
                                        value={newTimeSlot.endTime}
                                        onChange={(e) => handleNewTimeSlotChange("endTime", e.target.value)}
                                        className="px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg dark:bg-dark_input dark:text-white"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={addTimeSlot}
                                    className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-1 whitespace-nowrap"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add
                                </button>
                            </div>

                            {timeSlotError && (
                                <div className="text-sm text-red-600 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {timeSlotError}
                                </div>
                            )}

                            {/* List of time slots */}
                            {form.allowedTimeSlots.length > 0 ? (
                                <div className="space-y-2">
                                    {form.allowedTimeSlots.map((slot, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm">
                                                    {slot.startTime} - {slot.endTime}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeTimeSlot(index)}
                                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-sm text-gray-500">
                                    No time restrictions. Available all day on selected days.
                                </div>
                            )}
                        </div>

                        <p className="text-xs text-gray-500 mt-2">
                            Specify time slots when this meeting link is available. Leave empty for all-day availability.
                        </p>
                    </div>
                </div>
            </div>

            {/* Notes */}
            <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <AlertCircle className="w-4 h-4" />
                    </div>
                    <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
                        Additional Notes
                    </h3>
                </div>

                <div>
                    <textarea
                        value={form.notes}
                        onChange={(e) => onChange("notes", e.target.value)}
                        placeholder="Add any notes or instructions about this meeting link..."
                        rows="3"
                        className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white resize-none"
                    />
                </div>
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-white dark:bg-darkmode pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white py-3 px-4 rounded-lg font-semibold text-13 hover:bg-gray-50 dark:hover:bg-dark_input flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
                    >
                        <X className="w-4 h-4" />
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white py-3 px-4 rounded-lg font-semibold text-13 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                {initial ? "Updating..." : "Creating..."}
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {initial ? "Update Meeting Link" : "Create Meeting Link"}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
}