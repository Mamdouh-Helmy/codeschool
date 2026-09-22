// /api/sessions/[id]/attendance/route.js
// ✅ منطق الخصم:
// - أول ما تتسجل حالة حضور لطالب في السيشن دي (أي حالة: حاضر/غايب/متأخر/معتذر)
//   → يتخصم ساعتين مرة واحدة بس.
// - أي تعديل بعد كده على نفس الطالب في نفس السيشن (يقلبها لأي حالة تانية)
//   → مفيش أي خصم أو إرجاع تاني. الساعتين ثابتة زي ما هي.
// - ✅ NEW: لو السيشن دي isComplimentary (حصة تعويضية/Makeup) → بيتسجل الحضور
//   عادي تمامًا، بس من غير أي خصم من رصيد الطالب خالص. المدرس بياخد حقه
//   عادي من خلال processSessionPayroll لما السيشن تتحدد completed — مفيش
//   أي علاقة بين الاستثناء ده وبين مرتب المدرس.
//
// ✅ HOLD GUARD:
// - منع تسجيل الحضور على أي سيشن مقفولة بسبب الـ Hold
// - indefinite / duration → كل السيشنات مقفولة
// - sessions → أول N سيشنات (بترتيب moduleIndex → sessionNumber) مقفولة
// - until_session → من أول الجروب لحد السيشن المستهدفة (شاملة) مقفولة

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Session from "../../../../models/Session";
import Student from "../../../../models/Student";
import Group from "../../../../models/Group";
import { requireAdmin } from "@/utils/authMiddleware";
import {
  onAttendanceSubmitted,
  sendLowBalanceAlerts,
  disableZeroBalanceNotifications,
} from "../../../../services/groupAutomation";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HOURS_PER_SESSION = 2;

// ═══════════════════════════════════════════════════════════════════════════
// ✅ HOLD GUARD — منطق مركزي واحد
// ═══════════════════════════════════════════════════════════════════════════

/**
 * بيرتّب السيشنات بنفس ترتيب الباك اند:
 *   moduleIndex ASC → sessionNumber ASC → scheduledDate ASC
 */
function sortSessionsForHold(sessions) {
  return [...sessions].sort((a, b) => {
    if (a.moduleIndex !== b.moduleIndex) return a.moduleIndex - b.moduleIndex;
    if (a.sessionNumber !== b.sessionNumber)
      return a.sessionNumber - b.sessionNumber;
    return new Date(a.scheduledDate) - new Date(b.scheduledDate);
  });
}

/**
 * 🔒 هل السيشن دي مقفولة بسبب الـ Hold؟
 */
function isSessionLockedByHold(sessionId, group, allSessions) {
  if (!group?.hold?.isHeld) return false;
  const hold = group.hold;
  if (!hold) return false;

  const sessionIdStr = String(sessionId);

  // سيشنات تاريخية — مش بتتأثر بالـ Hold
  const mySession = allSessions.find((s) => String(s._id) === sessionIdStr);
  if (mySession?.status === "completed") return false;

  // indefinite / duration → كل الجلسات مقفولة
  if (hold.holdType === "indefinite" || hold.holdType === "duration") {
    return true;
  }

  // باقي الأنواع بتعتمد على ترتيب السيشنات
  const sorted = sortSessionsForHold(allSessions);
  const myIndex = sorted.findIndex((s) => String(s._id) === sessionIdStr);
  if (myIndex === -1) return false;

  // sessions: N سيشنات الأولى
  if (hold.holdType === "sessions") {
    const consumed = hold.holdSessionsConsumed || 0;
    // لو لسه مفيش أي سيشن اتاستهلكت → كل السيشنات مقفولة
    if (consumed === 0) return true;
    return myIndex < consumed;
  }

  // until_session: من أول الترتيب لحد السيشن المستهدفة (شاملة)
  if (hold.holdType === "until_session") {
    const targetId = hold.holdUntilSessionId;
    if (!targetId) return true;
    const targetIndex = sorted.findIndex(
      (s) => String(s._id) === String(targetId),
    );
    if (targetIndex === -1) return true;
    return myIndex <= targetIndex;
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// POST — حفظ الحضور
// ═══════════════════════════════════════════════════════════════════════════
export async function POST(req, { params }) {
  try {
    const { id } = await params;

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;
    const adminUser = authCheck.user;

    await connectDB();

    const { attendance, customMessages } = await req.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid session ID format" },
        { status: 400 },
      );
    }

    // ✅ populate hold + status
    const session = await Session.findOne({
      _id: id,
      isDeleted: false,
    }).populate({
      path: "groupId",
      select: "name code hold status",
    });
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    }

    const group = session.groupId;

    // ═══════════════════════════════════════════════════════════════════
    // ✅ HOLD GUARD — منع تسجيل الحضور على سيشن مقفولة
    // ═══════════════════════════════════════════════════════════════════
    if (group?.hold?.isHeld) {
      // جيب كل سيشنات الجروب للترتيب
      const allSessions = await Session.find({
        groupId: group._id,
        isDeleted: false,
      })
        .select("_id moduleIndex sessionNumber scheduledDate status")
        .lean();

      const locked = isSessionLockedByHold(id, group, allSessions);

      if (locked) {
        console.log(
          `⏭️ [HOLD GUARD] Blocked attendance POST for locked session ${id} — ${group.hold.holdType}`,
        );
        return NextResponse.json(
          {
            success: false,
            error: "السيشن دي مقفولة بسبب الـ Hold — مينفعش تسجل حضور",
            code: "SESSION_ON_HOLD",
          },
          { status: 403 },
        );
      }
    }

    // ✅ NEW: الحصة التعويضية (Makeup) — بيتسجل الحضور عادي، بس من غير أي
    // خصم من رصيد الطالب خالص. مفيش أي تأثير على مرتب المدرس (ده بيتحسب
    // عادي من processSessionPayroll لما السيشن تتحدد completed).
    const isComplimentary = !!session.isComplimentary;

    // ── مين اللي أصلاً متسجل له حضور في السيشن دي قبل الحفظة الحالية ─────────
    const alreadyRecordedStudentIds = new Set(
      (session.attendance || []).map((record) => record.studentId.toString()),
    );

    const creditDeductions = [];
    const lowBalanceStudents = [];
    const zeroBalanceStudents = [];

    for (const record of attendance) {
      const studentId = record.studentId?.toString();
      const newStatus = record.status;

      // ✅ لو الطالب ده أصلاً متسجل له حضور في السيشن دي من قبل → متلمسش الرصيد
      if (alreadyRecordedStudentIds.has(studentId)) continue;

      // ✅ الحصة التعويضية: نسجل الحضور من غير أي خصم من رصيد الطالب،
      // ونتخطى كل منطق الخصم والتنبيهات (low balance / zero balance) لأنها
      // كلها مبنية على خصم فعلي حصل، وده مش الحال هنا.
      if (isComplimentary) continue;

      // ✅ أول مرة يتسجل له حضور في السيشن دي → اخصم ساعتين
      const student = await Student.findById(studentId);
      if (!student?.creditSystem?.currentPackage) continue;

      const deductionResult = await student.deductCreditHours({
        hours: HOURS_PER_SESSION,
        sessionId: session._id,
        groupId: group._id,
        sessionTitle: session.title,
        groupName: group.name,
        attendanceStatus: newStatus,
        notes: `Attendance recorded: ${newStatus}`,
      });

      if (!deductionResult.success) continue;

      const remainingHours = deductionResult.remainingHours;

      creditDeductions.push({
        studentId,
        action: "deduct",
        hoursDeducted: HOURS_PER_SESSION,
        remainingHours,
        reason: `First record for this session: ${newStatus}`,
      });

            const previousBalance = remainingHours + HOURS_PER_SESSION;

      // ✅ عتبة 2 ساعة → قالب "4h" (التنبيه المبدئي)
      if (previousBalance > 2 && remainingHours <= 2 && remainingHours > 0) {
        lowBalanceStudents.push({
          studentId,
          student,
          remainingHours,
          alertType: "4h",
        });
      }

      // ✅ عتبة الصفر → قالب "2h" (التنبيه العاجل)
      if (remainingHours <= 0) {
        lowBalanceStudents.push({
          studentId,
          student,
          remainingHours: 0,
          alertType: "2h",
        });
        zeroBalanceStudents.push({ studentId, student, remainingHours: 0 });
      }
    }

    // ── إرسال تنبيهات الرصيد المنخفض ────────────────────────────────────────
    if (lowBalanceStudents.length > 0) {
      try {
        await sendLowBalanceAlerts(lowBalanceStudents);
      } catch (err) {
        console.error("Low balance alerts error:", err);
      }
    }

    if (zeroBalanceStudents.length > 0) {
      try {
        await disableZeroBalanceNotifications(zeroBalanceStudents);
      } catch (err) {
        console.error("Disable notifications error:", err);
      }
    }

    // ── حفظ الحضور الجديد على الجلسة ────────────────────────────────────────
    const attendanceRecords = attendance.map((record) => ({
      studentId: record.studentId,
      status: record.status,
      notes: record.notes || "",
      markedAt: new Date(),
      markedBy: adminUser.id,
    }));

    const updatedSession = await Session.findByIdAndUpdate(
      id,
      {
        $set: {
          attendance: attendanceRecords,
          attendanceTaken: true,
          "metadata.updatedBy": adminUser.id,
          "metadata.updatedAt": new Date(),
        },
      },
      { new: true },
    );

    // ── إشعارات الغياب/التأخير/الاعتذار ─────────────────────────────────────
    // ✅ الحصة التعويضية برضو بتاخد إشعارات غياب/تأخير عادي لو حصلت — ده
    // مستقل تمامًا عن الرصيد، فمحدش لمسه هنا.
    let automationResult = { successCount: 0, failCount: 0 };
    const studentsNeedingMessages = attendance.filter((r) =>
      ["absent", "late", "excused"].includes(r.status),
    );

    if (studentsNeedingMessages.length > 0) {
      try {
        automationResult = await onAttendanceSubmitted(
          id,
          customMessages || {},
        );
      } catch (err) {
        console.error("Automation error:", err);
      }
    }

    const stats = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter((a) => a.status === "present").length,
      absent: attendanceRecords.filter((a) => a.status === "absent").length,
      late: attendanceRecords.filter((a) => a.status === "late").length,
      excused: attendanceRecords.filter((a) => a.status === "excused").length,
    };

    return NextResponse.json({
      success: true,
      message: "Attendance submitted successfully",
      data: {
        sessionId: updatedSession._id,
        sessionTitle: updatedSession.title,
        stats,
      },
      isComplimentary,
      creditUpdates: {
        deductions: creditDeductions,
        lowBalanceAlerts: lowBalanceStudents.length,
        zeroBalanceAlerts: zeroBalanceStudents.length,
      },
      automation: {
        completed: automationResult.success !== false,
        notificationsSent: automationResult.successCount || 0,
        notificationsFailed: automationResult.failCount || 0,
        customMessagesUsed: Object.keys(customMessages || {}).length,
      },
    });
  } catch (error) {
    console.error("Attendance POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET — جلب بيانات الحضور + Hold info
// ═══════════════════════════════════════════════════════════════════════════
export async function GET(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { id } = await params;

    // ✅ جيب session + hold + status في الجروب
    const session = await Session.findOne({ _id: id, isDeleted: false })
      .populate("groupId", "name code hold status")
      .populate("attendance.studentId", "_id")
      .lean();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    }

    const group = session.groupId;

    // ═══════════════════════════════════════════════════════════════════
    // ✅ HOLD GUARD — نحدد هل السيشن دي مقفولة؟
    // ═══════════════════════════════════════════════════════════════════
    let sessionLocked = false;
    let holdInfo = null;

    if (group?.hold?.isHeld) {
      const allSessions = await Session.find({
        groupId: group._id,
        isDeleted: false,
      })
        .select("_id moduleIndex sessionNumber scheduledDate status")
        .lean();

      sessionLocked = isSessionLockedByHold(id, group, allSessions);

      holdInfo = {
        isHeld: true,
        holdType: group.hold.holdType || null,
        holdDays: group.hold.holdDays || 0,
        holdSessionsCount: group.hold.holdSessionsCount || 0,
        holdSessionsConsumed: group.hold.holdSessionsConsumed || 0,
        holdUntilSessionId: group.hold.holdUntilSessionId || null,
        holdStartDate: group.hold.holdStartDate || null,
        holdEndDate: group.hold.holdEndDate || null,
        holdReason: group.hold.holdReason || "",
      };
    }

    // جيب طلاب الجروب
    const groupStudents = await Student.find({
      "academicInfo.groupIds": group._id,
      isDeleted: false,
    })
      .select(
        "personalInfo guardianInfo communicationPreferences enrollmentNumber creditSystem",
      )
      .lean();

    const attendanceMap = new Map();
    const attendance = [];
    (session.attendance || []).forEach((record) => {
      if (!record.studentId) return;
      const studentId = record.studentId._id.toString();
      attendanceMap.set(studentId, {
        status: record.status,
        notes: record.notes || "",
      });
      attendance.push({
        studentId: record.studentId._id,
        status: record.status,
        notes: record.notes || "",
        markedAt: record.markedAt,
        markedBy: record.markedBy,
      });
    });

    const students = groupStudents.map((student) => {
      const attendanceRecord = attendanceMap.get(student._id.toString());

      const creditSystem = student.creditSystem || {
        currentPackage: null,
        status: "no_package",
        stats: {
          totalHoursPurchased: 0,
          totalHoursUsed: 0,
          totalHoursRemaining: 0,
        },
      };
      if (!creditSystem.currentPackage) {
        creditSystem.currentPackage = {
          remainingHours: 0,
          totalHours: 0,
          packageType: null,
          status: "inactive",
        };
      }

      return {
        _id: student._id,
        id: student._id,
        enrollmentNumber: student.enrollmentNumber || "",
        personalInfo: student.personalInfo || {},
        guardianInfo: student.guardianInfo || {},
        communicationPreferences: student.communicationPreferences || {
          preferredLanguage: "ar",
        },
        creditSystem,
        attendanceStatus: attendanceRecord?.status || null,
        attendanceNotes: attendanceRecord?.notes || "",
      };
    });

    const stats = {
      total: students.length,
      present: attendance.filter((a) => a.status === "present").length,
      absent: attendance.filter((a) => a.status === "absent").length,
      late: attendance.filter((a) => a.status === "late").length,
      excused: attendance.filter((a) => a.status === "excused").length,
    };

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session._id,
        sessionTitle: session.title,
        scheduledDate: session.scheduledDate,
        attendanceTaken: session.attendanceTaken || false,
        // ✅ NEW: الفرونت محتاجها عشان يعرض بادج "حصة تعويضية" ويخفي منطق
        // الرصيد/التنبيهات في الواجهة بدل ما يفضل يحاول يحسبه من غير داعي
        isComplimentary: !!session.isComplimentary,
        attendance,
        students,
        stats,
        group: {
          _id: group._id,
          name: group.name,
          code: group.code,
          status: group.status || null,
          isOnHold: !!group.hold?.isHeld,
          hold: holdInfo,
        },
        // ✅ الحقلين دول بس هما اللي المودال محتاجهم
        sessionLocked,
      },
    });
  } catch (error) {
    console.error("Attendance GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
