"use client";
import { useState, useEffect } from "react";
import {
  BookOpen,
  Users,
  Calendar,
  Clock,
  DollarSign,
  Save,
  X,
  User,
  Bell,
  CheckCircle,
  Hash,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";

export default function GroupForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    courseId: initial?.courseId?._id || initial?.courseId || "",
    instructors: initial?.instructors?.map(i => i._id || i) || [],
    maxStudents: initial?.maxStudents || 25,
    schedule: {
      startDate: initial?.schedule?.startDate?.split('T')[0] || "",
      daysOfWeek: initial?.schedule?.daysOfWeek || [],
      timeFrom: initial?.schedule?.timeFrom || "18:00",
      timeTo: initial?.schedule?.timeTo || "20:00",
      timezone: initial?.schedule?.timezone || "Africa/Cairo"
    },
    pricing: {
      price: initial?.pricing?.price || 0,
      paymentType: initial?.pricing?.paymentType || "full",
      installmentPlan: initial?.pricing?.installmentPlan || {
        numberOfInstallments: 0,
        amountPerInstallment: 0
      }
    },
    automation: {
      whatsappEnabled: initial?.automation?.whatsappEnabled !== undefined ? initial.automation.whatsappEnabled : true,
      welcomeMessage: initial?.automation?.welcomeMessage !== undefined ? initial.automation.welcomeMessage : true,
      reminderEnabled: initial?.automation?.reminderEnabled !== undefined ? initial.automation.reminderEnabled : true,
      reminderBeforeHours: initial?.automation?.reminderBeforeHours || 24,
      notifyGuardianOnAbsence: initial?.automation?.notifyGuardianOnAbsence !== undefined ? initial.automation.notifyGuardianOnAbsence : true,
      notifyOnSessionUpdate: initial?.automation?.notifyOnSessionUpdate !== undefined ? initial.automation.notifyOnSessionUpdate : true,
      completionMessage: initial?.automation?.completionMessage !== undefined ? initial.automation.completionMessage : true
    }
  });

  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [instructorsLoading, setInstructorsLoading] = useState(true);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // ✅ Helper: Get day name from date
  const getDayNameFromDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return daysOfWeek[date.getDay()];
  };

  // Load courses and instructors
  useEffect(() => {
    const loadData = async () => {
      try {
        const coursesRes = await fetch('/api/courses');
        if (!coursesRes.ok) {
          throw new Error(`Failed to fetch courses: ${coursesRes.status}`);
        }
        const coursesData = await coursesRes.json();
        if (coursesData.success && coursesData.data) {
          setCourses(coursesData.data);
        }
        setCoursesLoading(false);
      } catch (err) {
        console.error("❌ Error loading courses:", err);
        toast.error("Failed to load courses");
        setCoursesLoading(false);
      }

      try {
        const instructorsRes = await fetch('/api/instructor');
        if (!instructorsRes.ok) {
          throw new Error(`Failed to fetch instructors: ${instructorsRes.status}`);
        }
        const instructorsData = await instructorsRes.json();
        if (instructorsData.success && instructorsData.data) {
          setInstructors(instructorsData.data);
        }
        setInstructorsLoading(false);
      } catch (err) {
        console.error("❌ Error loading instructors:", err);
        toast.error("Failed to load instructors");
        setInstructorsLoading(false);
      }
    };

    loadData();
  }, []);

  // ✅ Handle startDate change - auto-select first day
  const handleStartDateChange = (dateString) => {
    const firstDay = getDayNameFromDate(dateString);
    
    setForm(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        startDate: dateString,
        daysOfWeek: firstDay ? [firstDay] : [] // ✅ Auto-select first day
      }
    }));

    if (firstDay) {
      toast.success(`First day (${firstDay}) auto-selected. Please select 2 more days.`);
    }
  };

  const onChange = (path, value) => {
    const paths = path.split('.');
    setForm(prev => {
      const newForm = JSON.parse(JSON.stringify(prev));
      let current = newForm;
      for (let i = 0; i < paths.length - 1; i++) {
        current = current[paths[i]];
      }
      current[paths[paths.length - 1]] = value;
      return newForm;
    });
  };

  const toggleDay = (day) => {
    const firstDay = getDayNameFromDate(form.schedule.startDate);

    // ✅ Prevent removing first day
    if (day === firstDay && form.schedule.daysOfWeek.includes(day)) {
      toast.error(`Cannot remove ${day} (first day based on start date)`);
      return;
    }

    setForm(prev => {
      const currentDays = prev.schedule.daysOfWeek;
      const isSelected = currentDays.includes(day);

      // ✅ If trying to add and already have 3 days
      if (!isSelected && currentDays.length >= 3) {
        toast.error("Maximum 3 days allowed");
        return prev;
      }

      return {
        ...prev,
        schedule: {
          ...prev.schedule,
          daysOfWeek: isSelected
            ? currentDays.filter(d => d !== day)
            : [...currentDays, day]
        }
      };
    });
  };

  const toggleInstructor = (instructorId) => {
    setForm(prev => ({
      ...prev,
      instructors: prev.instructors.includes(instructorId)
        ? prev.instructors.filter(id => id !== instructorId)
        : [...prev.instructors, instructorId]
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const toastId = toast.loading(initial ? "Updating group..." : "Creating group...");

    try {
      // Validation
      if (!form.name || !form.courseId || !form.maxStudents) {
        throw new Error("Please fill all required fields");
      }

      // ✅ Validate exactly 3 days
      if (form.schedule.daysOfWeek.length !== 3) {
        throw new Error("Please select exactly 3 days (including start date day)");
      }

      // ✅ Validate first day matches startDate
      const firstDay = getDayNameFromDate(form.schedule.startDate);
      if (!form.schedule.daysOfWeek.includes(firstDay)) {
        throw new Error(`First day must be ${firstDay} (based on start date)`);
      }

      // Prepare data
      const payload = {
        ...form,
        maxStudents: parseInt(form.maxStudents),
        pricing: {
          ...form.pricing,
          price: parseFloat(form.pricing.price)
        }
      };

      const method = initial?.id ? "PUT" : "POST";
      const url = initial?.id ? `/api/groups/${initial.id}` : "/api/groups";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to save group");
      }

      toast.success(initial ? "Group updated successfully!" : "Group created successfully!", {
        id: toastId
      });

      onSaved();
      onClose();
    } catch (err) {
      console.error("Error saving group:", err);
      toast.error(err.message || "Failed to save group", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Get first day from startDate
  const firstDayName = getDayNameFromDate(form.schedule.startDate);

  return (
    <form onSubmit={submit} className="space-y-6 pr-2">
      {/* Basic Info */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Hash className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
            Basic Information
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
              Group Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onChange('name', e.target.value)}
              placeholder="Frontend Development - Batch 7"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
              Course *
            </label>
            {coursesLoading ? (
              <div className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-gray-50 dark:bg-dark_input">
                <span className="text-sm text-gray-500">Loading courses...</span>
              </div>
            ) : (
              <select
                value={form.courseId}
                onChange={(e) => onChange('courseId', e.target.value)}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                required
                disabled={coursesLoading}
              >
                <option value="">Select a course...</option>
                {courses.map(course => (
                  <option key={course._id} value={course._id}>
                    {course.title} ({course.level})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
              Maximum Students *
            </label>
            <input
              type="number"
              value={form.maxStudents}
              onChange={(e) => onChange('maxStudents', e.target.value)}
              min="1"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
              required
            />
          </div>
        </div>
      </div>

      {/* Instructors */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
            Instructors
          </h3>
        </div>

        {instructorsLoading ? (
          <div className="text-center py-4">
            <span className="text-sm text-gray-500">Loading instructors...</span>
          </div>
        ) : instructors.length === 0 ? (
          <div className="text-center py-4 text-sm text-gray-500">
            No instructors available
          </div>
        ) : (
          <div className="space-y-2">
            {instructors.map(instructor => (
              <div
                key={instructor._id}
                className="flex items-center gap-3 p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                onClick={() => toggleInstructor(instructor._id)}
              >
                <input
                  type="checkbox"
                  checked={form.instructors.includes(instructor._id)}
                  onChange={() => {}}
                  className="w-4 h-4 text-primary rounded focus:ring-primary"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-MidnightNavyText dark:text-white">
                    {instructor.name}
                  </p>
                  <p className="text-xs text-SlateBlueText dark:text-darktext">
                    {instructor.email}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
            Schedule
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
              Start Date *
            </label>
            <input
              type="date"
              value={form.schedule.startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
              required
            />
            {firstDayName && (
              <p className="text-xs text-primary mt-1">
                First day will be: {firstDayName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
              Days of Week * (Select exactly 3 days)
            </label>
            
            {/* ✅ Info message */}
            <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">3 Days Schedule:</p>
                <p>• Day 1: Lessons 1-2 (First Session)</p>
                <p>• Day 2: Lessons 3-4 (Second Session)</p>
                <p>• Day 3: Lessons 5-6 (Third Session)</p>
                <p className="mt-1 text-blue-600 dark:text-blue-400">
                  Selected: {form.schedule.daysOfWeek.length}/3 days
                  {firstDayName && ` (${firstDayName} is required)`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {daysOfWeek.map(day => {
                const isFirstDay = day === firstDayName;
                const isSelected = form.schedule.daysOfWeek.includes(day);
                const isDisabled = !form.schedule.startDate || (isFirstDay && isSelected);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    disabled={isDisabled}
                    className={`px-2 py-2 text-xs rounded-lg font-medium transition-all relative ${
                      isSelected
                        ? isFirstDay
                          ? 'bg-primary text-white ring-2 ring-primary ring-offset-2'
                          : 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {day.slice(0, 3)}
                    {isFirstDay && isSelected && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-darkmode"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
                Time From *
              </label>
              <input
                type="time"
                value={form.schedule.timeFrom}
                onChange={(e) => onChange('schedule.timeFrom', e.target.value)}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
                Time To *
              </label>
              <input
                type="time"
                value={form.schedule.timeTo}
                onChange={(e) => onChange('schedule.timeTo', e.target.value)}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
            Pricing
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
              Price (EGP) *
            </label>
            <input
              type="number"
              value={form.pricing.price}
              onChange={(e) => onChange('pricing.price', e.target.value)}
              min="0"
              step="0.01"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
              Payment Type
            </label>
            <select
              value={form.pricing.paymentType}
              onChange={(e) => onChange('pricing.paymentType', e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
            >
              <option value="full">Full Payment</option>
              <option value="installments">Installments</option>
            </select>
          </div>
        </div>
      </div>

      {/* Automation */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
            <Bell className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
            WhatsApp Automation
          </h3>
        </div>

        <div className="space-y-3">
          {Object.entries({
            whatsappEnabled: "Enable WhatsApp automation",
            welcomeMessage: "Send welcome message to new students",
            reminderEnabled: "Send session reminders",
            notifyGuardianOnAbsence: "Notify guardians of absent students",
            notifyOnSessionUpdate: "Notify on session changes",
            completionMessage: "Send completion message"
          }).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg">
              <span className="text-sm text-MidnightNavyText dark:text-white">{label}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.automation[key]}
                  onChange={(e) => onChange(`automation.${key}`, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
              </label>
            </div>
          ))}

          {form.automation.reminderEnabled && (
            <div>
              <label className="block text-13 font-medium text-MidnightNavyText dark:text-white mb-2">
                Reminder Before (hours)
              </label>
              <input
                type="number"
                value={form.automation.reminderBeforeHours}
                onChange={(e) => onChange('automation.reminderBeforeHours', parseInt(e.target.value))}
                min="1"
                max="168"
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white"
              />
            </div>
          )}
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
                {initial ? "Update Group" : "Create Group"}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}