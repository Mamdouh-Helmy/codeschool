// app/api/groups/[id]/details/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import Session from "../../../../models/Session";
import InstructorRate from "../../../../models/InstructorRate"; // ✅ NEW
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

// ─── Helpers (NEW) ───────────────────────────────────────────────────────────
const toMin = (t) => {
  if (!t || typeof t !== "string" || !t.includes(":")) return null;
  const [h, m] = t.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

// مدة السيشن بالدقايق: الأولوية للـ payroll → الوقت الفعلي → الوقت المجدول
function sessionMinutes(s) {
  if (s.payroll?.durationMinutes > 0) return s.payroll.durationMinutes;
  const st = toMin(s.actualStartTime || s.startTime);
  const en = toMin(s.actualEndTime || s.endTime);
  return st != null && en != null && en > st ? en - st : 0;
}

// السعر السارِي وقت السيشن (in-memory عشان منعملش query لكل سيشن)
function rateAt(rateDoc, date) {
  if (!rateDoc) return null;
  const history = [...(rateDoc.history || [])].sort(
    (a, b) => new Date(a.effectiveFrom) - new Date(b.effectiveFrom),
  );
  if (history.length === 0) {
    return {
      hourlyRate: rateDoc.hourlyRate || 0,
      transportationAllowance: rateDoc.transportationAllowance || 0,
    };
  }
  const t = new Date(date).getTime();
  const match = history.find((h) => {
    const from = new Date(h.effectiveFrom).getTime();
    const to = h.effectiveTo ? new Date(h.effectiveTo).getTime() : Infinity;
    return t >= from && t < to;
  });
  const picked = match || history[0];
  return {
    hourlyRate: picked.hourlyRate || 0,
    transportationAllowance: picked.transportationAllowance || 0,
  };
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export async function GET(req, { params }) {
  try {
    const { id: groupId } = await params;

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID" },
        { status: 400 },
      );
    }

    await connectDB();

    // ══════════════════════════════════════════════
    // 1. جلب بيانات المجموعة
    // ✅ NEW: بنجيب creditSystem للطلاب (الباقة الحالية بس)
    // ══════════════════════════════════════════════
    const group = await Group.findOne({ _id: groupId, isDeleted: false })
      .populate({ path: "instructors.userId", select: "name email gender profile" })
      .populate({
        path: "students",
        select:
          "personalInfo.fullName personalInfo.whatsappNumber enrollmentNumber creditSystem.currentPackage creditSystem.status",
      })
      .populate({ path: "courseId", select: "title level" })
      .lean();

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 },
      );
    }

    // ══════════════════════════════════════════════
    // 2. جلب كل الحصص مع الحضور الكامل
    // ══════════════════════════════════════════════
    const sessions = await Session.find({
      groupId: new mongoose.Types.ObjectId(groupId),
      isDeleted: false,
    })
      .populate({
        path: "attendance.studentId",
        select: "personalInfo.fullName enrollmentNumber",
      })
      .sort({ scheduledDate: 1 })
      .lean();

    // ══════════════════════════════════════════════
    // 3. إحصائيات الحصص
    // ══════════════════════════════════════════════
    const total = sessions.length;
    const completed = sessions.filter((s) => s.status === "completed").length;
    const scheduled = sessions.filter((s) => s.status === "scheduled").length;
    const cancelled = sessions.filter((s) => s.status === "cancelled").length;
    const postponed = sessions.filter((s) => s.status === "postponed").length;
    const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const sessionsWithAtt = sessions.filter(
      (s) => s.status === "completed" && s.attendanceTaken && s.attendance?.length > 0,
    );
    let avgAttPct = 0;
    if (sessionsWithAtt.length > 0) {
      const total_att_sum = sessionsWithAtt.reduce((acc, s) => {
        const presentCount = s.attendance.filter(
          (a) => a.status === "present" || a.status === "late",
        ).length;
        return acc + (s.attendance.length > 0 ? (presentCount / s.attendance.length) * 100 : 0);
      }, 0);
      avgAttPct = Math.round(total_att_sum / sessionsWithAtt.length);
    }

    // ══════════════════════════════════════════════
    // 4. بناء قائمة الحصص
    // ══════════════════════════════════════════════
    const sessionsList = sessions.map((s) => {
      const d = new Date(s.scheduledDate);
      const att = s.attendance || [];
      return {
        id: s._id.toString(),
        title: s.title || `حصة ${s.sessionNumber}`,
        moduleNumber: (s.moduleIndex ?? 0) + 1,
        sessionNumber: s.sessionNumber,
        date: d.toISOString().split("T")[0],
        dayName: d.toLocaleDateString("en-US", { weekday: "long" }),
        startTime: s.startTime || "",
        endTime: s.endTime || "",
        status: s.status,
        attendanceTaken: !!s.attendanceTaken,
        isComplimentary: !!s.isComplimentary,
        meetingLink: s.meetingLink || null,
        meetingPlatform: s.meetingPlatform || null, // ✅ كانت ناقصة والـ UI بيستخدمها
        recordingLink: s.recordingLink || null,
        instructorNotes: s.instructorNotes || "", // ✅ كانت ناقصة والـ UI بيستخدمها
        summary: {
          total: att.length,
          present: att.filter((a) => a.status === "present").length,
          absent: att.filter((a) => a.status === "absent").length,
          late: att.filter((a) => a.status === "late").length,
          excused: att.filter((a) => a.status === "excused").length,
        },
        attendanceRecords: att.map((a) => ({
          studentId: (a.studentId?._id || a.studentId || "").toString(),
          status: a.status,
          notes: a.notes || "",
        })),
      };
    });

    // ══════════════════════════════════════════════
    // 5. إحصائيات كل طالب + الباقة (NEW)
    // ══════════════════════════════════════════════
    const doneSessions = sessionsList.filter(
      (s) => s.status === "completed" && s.attendanceTaken,
    );
    const nowMs = Date.now();

    const studentsData = (group.students || []).map((student) => {
      const sid = student._id.toString();
      let present = 0;
      let absent = 0;
      let late = 0;
      let excused = 0;
      const log = [];

      doneSessions.forEach((sess) => {
        const record = sess.attendanceRecords.find((r) => r.studentId === sid);
        const status = record ? record.status : "absent";
        if (status === "present") present++;
        else if (status === "absent") absent++;
        else if (status === "late") late++;
        else if (status === "excused") excused++;
        log.push({
          sessionId: sess.id,
          title: sess.title,
          moduleNumber: sess.moduleNumber,
          sessionNumber: sess.sessionNumber,
          date: sess.date,
          dayName: sess.dayName,
          startTime: sess.startTime,
          status,
          sessionStatus: sess.status,
        });
      });

      sessionsList
        .filter((s) => s.status === "cancelled" || s.status === "postponed")
        .forEach((sess) => {
          log.push({
            sessionId: sess.id,
            title: sess.title,
            moduleNumber: sess.moduleNumber,
            sessionNumber: sess.sessionNumber,
            date: sess.date,
            dayName: sess.dayName,
            startTime: sess.startTime,
            status: sess.status,
            sessionStatus: sess.status,
          });
        });

      sessionsList
        .filter((s) => s.status === "scheduled")
        .forEach((sess) => {
          log.push({
            sessionId: sess.id,
            title: sess.title,
            moduleNumber: sess.moduleNumber,
            sessionNumber: sess.sessionNumber,
            date: sess.date,
            dayName: sess.dayName,
            startTime: sess.startTime,
            status: "upcoming",
            sessionStatus: sess.status,
          });
        });

      log.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

      const totalDone = present + absent + late + excused;
      const attended = present + late;
      const attendancePct = totalDone > 0 ? Math.round((attended / totalDone) * 100) : 0;

      // ✅ NEW: ملخص الباقة الحالية
      const pkg = student.creditSystem?.currentPackage || null;
      const totalHours = pkg?.totalHours || 0;
      const remainingHours = pkg?.remainingHours || 0;
      const credit = {
        hasPackage: !!pkg,
        packageId: pkg?._id ? pkg._id.toString() : null,
        packagePlanId: pkg?.packagePlanId ? pkg.packagePlanId.toString() : null,
        packageName: pkg?.packageName || pkg?.packageType || "",
        months: pkg?.months || 0,
        totalHours: round2(totalHours),
        remainingHours: round2(remainingHours),
        usedHours: round2(Math.max(0, totalHours - remainingHours)),
        price: pkg?.price || 0,
        startDate: pkg?.startDate || null,
        endDate: pkg?.endDate || null,
        isExpired: pkg?.endDate ? new Date(pkg.endDate).getTime() < nowMs : false,
        status: student.creditSystem?.status || "no_package",
      };

      return {
        id: sid,
        name: student.personalInfo?.fullName || "بدون اسم",
        enrollment: student.enrollmentNumber || "—",
        whatsapp: student.personalInfo?.whatsappNumber || null,
        attendance: { present, absent, late, excused, totalDone, attended, attendancePct },
        credit,
        log,
      };
    });

    // ══════════════════════════════════════════════
    // 6. المدرسين + ساعاتهم وحسابهم لحد دلوقتي (NEW)
    //   - الدقايق = مجموع مدة السيشنات المكتملة في الجروب ده
    //   - الحساب = دقايق/60 × السعر السارِي وقت كل سيشن
    //   - بدل الانتقال: بيتحسب لكل سيشن أوفلاين (اضبطه لو منطق الـ payroll عندك مختلف)
    // ══════════════════════════════════════════════
    const instructorIds = (group.instructors || [])
      .map((e) => e.userId?._id)
      .filter(Boolean);

    const rateDocs = instructorIds.length
      ? await InstructorRate.find({ instructorId: { $in: instructorIds } }).lean()
      : [];
    const rateMap = {};
    rateDocs.forEach((r) => {
      rateMap[r.instructorId.toString()] = r;
    });

    const completedSessions = sessions.filter((s) => s.status === "completed");
    const groupIsOffline = group.deliveryMode === "offline";

    const normalizedInstructors = (group.instructors || []).map((entry) => {
      const inst = entry.userId || {};
      const userId = inst._id ? inst._id.toString() : "";
      const rateDoc = rateMap[userId] || null;

      let minutes = 0;
      let hourlyEarnings = 0;
      let transportation = 0;

      completedSessions.forEach((s) => {
        const mins = sessionMinutes(s);
        if (mins <= 0) return;
        minutes += mins;
        const r = rateAt(rateDoc, s.scheduledDate);
        if (!r) return;
        hourlyEarnings += (mins / 60) * r.hourlyRate;
        const isOffline = (s.deliveryMode || (groupIsOffline ? "offline" : "online")) === "offline";
        if (isOffline) transportation += r.transportationAllowance;
      });

      // ✅ FIX: الوقت المنسوب للمدرس = countTime بتاعه (بيتراكم وقت حساب كل سيشن)
      // عشان مدرس اتضاف متأخر ما يتحسبلوش سيشنات قبل انضمامه.
      // الحساب = الساعات الفعلية × متوسط سعر الساعة الفعلي على سيشنات الجروب.
      const workedMinutes = Math.round((entry.countTime || 0) * 60);
      const sessionsHours = minutes / 60;
      const avgRate =
        sessionsHours > 0 ? hourlyEarnings / sessionsHours : rateDoc?.hourlyRate || 0;
      const workedHourlyEarnings = (workedMinutes / 60) * avgRate;
      const share = minutes > 0 ? Math.min(1, workedMinutes / minutes) : 0;
      const workedTransportation = transportation * share;

      return {
        id: userId, // ← userId._id كـ string (للحذف)
        name: inst.name || "",
        email: inst.email || "",
        gender: inst.gender || "male",
        phone: inst.profile?.phone || null,
        countTime: entry.countTime || 0,
        stats: {
          sessionsCount: Math.round(completedSessions.length * share),
          minutes: workedMinutes,
          hasRate: !!rateDoc,
          hourlyRate: rateDoc?.hourlyRate || 0,
          currency: rateDoc?.currency || "EGP",
          hourlyEarnings: round2(workedHourlyEarnings),
          transportation: round2(workedTransportation),
          totalEarnings: round2(workedHourlyEarnings + workedTransportation),
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        group: {
          id: group._id.toString(),
          name: group.name,
          code: group.code,
          status: group.status,
          maxStudents: group.maxStudents,
          currentStudentsCount: group.currentStudentsCount || 0,
          deliveryMode: group.deliveryMode || "online",
          course: {
            title: group.courseId?.title || group.courseSnapshot?.title || "—",
            level: group.courseId?.level || group.courseSnapshot?.level || "—",
            modulesCount: group.courseSnapshot?.curriculumModulesCount || 0,
            totalLessons: group.courseSnapshot?.totalLessons || 0,
            totalSessions: group.courseSnapshot?.totalSessions || 0,
          },
          schedule: {
            startDate: group.schedule?.startDate || null,
            daysOfWeek: group.schedule?.daysOfWeek || [],
            timeFrom: group.schedule?.timeFrom || "",
            timeTo: group.schedule?.timeTo || "",
          },
          instructors: normalizedInstructors,
        },

        stats: {
          sessions: { total, completed, scheduled, cancelled, postponed, progressPct },
          attendance: { avgPct: avgAttPct, sessionsWithAttendance: sessionsWithAtt.length },
          students: { total: group.students?.length || 0, maxSlots: group.maxStudents },
        },

        sessions: sessionsList,
        students: studentsData,
      },
    });
  } catch (error) {
    console.error("❌ /api/groups/[id]/details error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}