// app/api/instructor/sessions/[id]/attendance/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import {
  getAttendanceTemplatesForFrontend,
  sendAbsenceNotifications,
  sendLowBalanceAlerts,
  disableZeroBalanceNotifications,
} from "../../../../../services/groupAutomation";
import Session from "../../../../../models/Session";
import Student from "../../../../../models/Student";
import Group from "../../../../../models/Group";

// ═══════════════════════════════════════════════════════════════════════════
// ✅ HOLD HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function sortSessionsForHold(sessions) {
  return [...sessions].sort((a, b) => {
    if (a.moduleIndex !== b.moduleIndex) return a.moduleIndex - b.moduleIndex;
    if (a.sessionNumber !== b.sessionNumber) return a.sessionNumber - b.sessionNumber;
    return new Date(a.scheduledDate) - new Date(b.scheduledDate);
  });
}

function isSessionLockedByHold(session, group, allGroupSessions) {
  if (!group?.hold?.isHeld) return false;
  if (session?.status === "completed") return false;

  const hold = group.hold;

  if (hold.holdType === "indefinite" || hold.holdType === "duration") {
    return true;
  }

  if (!Array.isArray(allGroupSessions) || allGroupSessions.length === 0) {
    return true;
  }

  const sorted = sortSessionsForHold(allGroupSessions);
  const myId = String(session._id);
  const myIndex = sorted.findIndex((s) => String(s._id) === myId);
  if (myIndex === -1) return false;

  if (hold.holdType === "sessions") {
    const consumed = hold.holdSessionsConsumed || 0;
    if (consumed === 0) return true;
    return myIndex < consumed;
  }

  if (hold.holdType === "until_session") {
    const targetId = hold.holdUntilSessionId;
    if (!targetId) return true;
    const targetIndex = sorted.findIndex((s) => String(s._id) === String(targetId));
    if (targetIndex === -1) return true;
    return myIndex <= targetIndex;
  }

  return false;
}

// ─── Constants ───────────────────────────────────────────
const DEDUCT_STATUSES = ["present", "late", "absent", "excused"];
const CREDIT_DEDUCTION = 2;

// ─── Helper: التحقق من صلاحية الجروب / السيشن (مش على Hold)
async function checkGroupAvailability(session) {
  const groupId = session?.groupId?._id || session?.groupId;
  if (!groupId) return { ok: false, error: "Session has no group" };

  const group = await Group.findById(groupId)
    .select("name code status hold")
    .lean();

  if (!group) return { ok: false, error: "Group not found" };

  if (!group.hold?.isHeld) {
    // مفيش Hold — نتحقق من حالة الجروب بس
    if (group.status !== "active" && group.status !== "completed") {
      return {
        ok: false,
        code: "GROUP_NOT_ACTIVE",
        error: `الجروب حالته "${group.status}" — مينفعش تسجل حضور`,
        group,
      };
    }
    return { ok: true, group };
  }

  // ✅ فيه Hold — نفحص لو السيشن دي بالتحديد مقفولة
  const allGroupSessions = await Session.find({
    groupId: group._id,
    isDeleted: false,
  })
    .select("_id moduleIndex sessionNumber scheduledDate status")
    .lean();

  const sessionIsLocked = isSessionLockedByHold(
    {
      _id: session._id,
      moduleIndex: session.moduleIndex,
      sessionNumber: session.sessionNumber,
      status: session.status,
    },
    group,
    allGroupSessions
  );

  if (sessionIsLocked) {
    return {
      ok: false,
      code: "SESSION_ON_HOLD",
      error: "السيشن دي مقفولة بسبب الـ Hold — مينفعش تسجل حضور",
      group,
    };
  }

  // ✅ الجروب على Hold، بس السيشن دي مش مقفولة → نكمل عادي
  return { ok: true, group, sessionIsLocked: false };
}

// ─── GET ─────────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    await connectDB();
    const { id } = await params;

    const session = await Session.findById(id)
      .populate({
        path: "groupId",
        select: "name code students instructors hold status",
      })
      .lean();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    }

    const group = session.groupId;
    const isOnHold = !!group?.hold?.isHeld;

    // ✅ نحدد لو السيشن دي بالتحديد مقفولة
    let sessionLocked = false;
    if (isOnHold) {
      const allGroupSessions = await Session.find({
        groupId: group._id,
        isDeleted: false,
      })
        .select("_id moduleIndex sessionNumber scheduledDate status")
        .lean();

      sessionLocked = isSessionLockedByHold(
        {
          _id: session._id,
          moduleIndex: session.moduleIndex,
          sessionNumber: session.sessionNumber,
          status: session.status,
        },
        group,
        allGroupSessions
      );
    }

    const studentIds = (group?.students || []).map((s) => s.studentId || s);

    const students = await Student.find({ _id: { $in: studentIds } })
      .select(
        "_id enrollmentNumber personalInfo.fullName personalInfo.gender personalInfo.nickname " +
          "guardianInfo.name guardianInfo.phone guardianInfo.whatsappNumber guardianInfo.relationship guardianInfo.nickname " +
          "communicationPreferences.preferredLanguage creditSystem.currentPackage.remainingHours creditSystem.status whatsappMessages",
      )
      .lean();

    const existingAttendance = {};
    (session.attendance || []).forEach((a) => {
      existingAttendance[a.studentId?.toString()] = a.status;
    });

    const studentsWithAttendance = students.map((s) => {
      const absenceMessages = (s.whatsappMessages || []).filter(
        (m) => m.messageType === "absence_notification",
      );

      return {
        _id: s._id,
        name: s.personalInfo?.fullName || "بدون اسم",
        enrollmentNumber: s.enrollmentNumber || "",

        nicknameAr: s.personalInfo?.nickname?.ar?.trim() || "",
        nicknameEn: s.personalInfo?.nickname?.en?.trim() || "",

        guardianNicknameAr: s.guardianInfo?.nickname?.ar?.trim() || "",
        guardianNicknameEn: s.guardianInfo?.nickname?.en?.trim() || "",

        gender: s.personalInfo?.gender || "male",

        guardianName: s.guardianInfo?.name || "",
        guardianPhone:
          s.guardianInfo?.phone || s.guardianInfo?.whatsappNumber || "",
        guardianRelationship: s.guardianInfo?.relationship || "father",

        preferredLanguage:
          s.communicationPreferences?.preferredLanguage || "ar",
        credits: s.creditSystem?.currentPackage?.remainingHours ?? 0,
        creditStatus: s.creditSystem?.status || "no_package",

        absenceCount: absenceMessages.length,
        currentStatus: existingAttendance[s._id.toString()] || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        session,
        students: studentsWithAttendance,
        groupIsOnHold: isOnHold,
        sessionLocked, // ✅ جديد — هل السيشن دي بالتحديد مقفولة؟
        groupHold: group?.hold || null,
      },
    });
  } catch (error) {
    console.error("❌ GET attendance error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// ─── POST (preview template أو إرسال فوري) ────────────────
export async function POST(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    await connectDB();
    const { id } = await params;

    let body = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON" },
        { status: 400 },
      );
    }

    const {
      attendanceStatus,
      studentId,
      extraData = {},
      sendNow = false,
    } = body;

    if (!studentId || !attendanceStatus) {
      return NextResponse.json(
        {
          success: false,
          error: "studentId and attendanceStatus are required",
        },
        { status: 400 },
      );
    }

    // ✅ افحص هل السيشن دي بالتحديد مقفولة
    const sessionCheck = await Session.findById(id)
      .populate({ path: "groupId", select: "hold status name code" })
      .lean();

    if (sessionCheck?.groupId?.hold?.isHeld) {
      const allGroupSessions = await Session.find({
        groupId: sessionCheck.groupId._id,
        isDeleted: false,
      })
        .select("_id moduleIndex sessionNumber scheduledDate status")
        .lean();

      const sessionIsLocked = isSessionLockedByHold(
        {
          _id: sessionCheck._id,
          moduleIndex: sessionCheck.moduleIndex,
          sessionNumber: sessionCheck.sessionNumber,
          status: sessionCheck.status,
        },
        sessionCheck.groupId,
        allGroupSessions
      );

      if (sessionIsLocked) {
        return NextResponse.json(
          {
            success: false,
            error: "السيشن دي مقفولة بسبب الـ Hold",
            code: "SESSION_ON_HOLD",
          },
          { status: 403 },
        );
      }
    }

    // 🆕 sendNow: إرسال فوري لرسالة الواتساب بس
    if (sendNow) {
      try {
        await sendAbsenceNotifications(id, [
          { studentId, status: attendanceStatus },
        ]);
        return NextResponse.json({ success: true, data: { sent: true } });
      } catch (sendError) {
        console.error("❌ [sendNow] notification error:", sendError);
        return NextResponse.json(
          {
            success: false,
            error: sendError.message || "Failed to send notification",
          },
          { status: 500 },
        );
      }
    }

    const [student, session] = await Promise.all([
      Student.findById(studentId)
        .select(
          "personalInfo guardianInfo communicationPreferences enrollmentNumber creditSystem",
        )
        .lean(),
      Session.findById(id)
        .populate({ path: "groupId", select: "name code" })
        .lean(),
    ]);

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student not found" },
        { status: 404 },
      );
    }

    const templates = await getAttendanceTemplatesForFrontend(
      attendanceStatus,
      studentId,
      extraData,
    );

    const metadata = {
      language: student.communicationPreferences?.preferredLanguage || "ar",
      gender: student.personalInfo?.gender || "male",
      relationship: student.guardianInfo?.relationship || "father",

      studentFullName: student.personalInfo?.fullName || "",
      guardianFullName: student.guardianInfo?.name || "",

      studentNicknameAr: student.personalInfo?.nickname?.ar?.trim() || "",
      studentNicknameEn: student.personalInfo?.nickname?.en?.trim() || "",
      guardianNicknameAr: student.guardianInfo?.nickname?.ar?.trim() || "",
      guardianNicknameEn: student.guardianInfo?.nickname?.en?.trim() || "",

      enrollmentNumber: student.enrollmentNumber || "",

      sessionTitle: session?.title || "",
      scheduledDate: session?.scheduledDate || null,
      startTime: session?.startTime || "",
      endTime: session?.endTime || "",
      groupName: session?.groupId?.name || "",
      groupCode: session?.groupId?.code || "",
      meetingLink: session?.meetingLink || "",
    };

    return NextResponse.json({
      success: true,
      data: {
        guardian: templates?.guardian
          ? {
              content: templates.guardian.content,
              isFallback: templates.guardian.isFallback,
            }
          : null,
        metadata,
      },
    });
  } catch (error) {
    console.error("❌ POST attendance preview error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// ─── PATCH (save attendance + credits) ───────────────────
export async function PATCH(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    await connectDB();
    const { id } = await params;

    let body = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON" },
        { status: 400 },
      );
    }

    const { attendanceRecords } = body;

    if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: "attendanceRecords array is required" },
        { status: 400 },
      );
    }

    const session = await Session.findById(id).populate({
      path: "groupId",
      select: "name instructors students hold status",
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    }

    // ✅ افحص هل السيشن دي مقفولة
    const availability = await checkGroupAvailability(session);
    if (!availability.ok) {
      return NextResponse.json(
        {
          success: false,
          error: availability.error,
          code: availability.code,
        },
        { status: 403 },
      );
    }

    // 📌 oldStatusSnapshot من الـ DB الفعلي
    const oldStatusSnapshot = {};
    session.attendance.forEach((a) => {
      oldStatusSnapshot[a.studentId?.toString()] = a.status;
    });

    const studentIds = attendanceRecords.map((r) => r.studentId);
    const students = await Student.find({ _id: { $in: studentIds } });
    const studentMap = {};
    students.forEach((s) => {
      studentMap[s._id.toString()] = s;
    });

    const results = [];
    const notifyList = [];

    for (const record of attendanceRecords) {
      const { studentId, status: newStatus } = record;
      const oldStatus = oldStatusSnapshot[studentId] || null;

      if (oldStatus === newStatus) {
        results.push({
          studentId,
          oldStatus,
          newStatus,
          action: "no_change",
          creditAction: "nothing",
        });
        continue;
      }

      const existing = session.attendance.find(
        (a) => a.studentId?.toString() === studentId,
      );
      if (existing) {
        existing.status = newStatus;
      } else {
        session.attendance.push({ studentId, status: newStatus });
      }

      const wasDeducting =
        oldStatus !== null && DEDUCT_STATUSES.includes(oldStatus);
      const willDeduct = DEDUCT_STATUSES.includes(newStatus);

      let creditAction = "nothing";
      if (!wasDeducting && willDeduct) creditAction = "deduct";
      if (wasDeducting && !willDeduct) creditAction = "refund";

      const student = studentMap[studentId];
      if (student && creditAction !== "nothing") {
        if (creditAction === "deduct") {
          await student.deductCreditHours({
            hours: CREDIT_DEDUCTION,
            sessionId: id,
            sessionTitle: session.title || "",
            groupId: session.groupId?._id,
            groupName: session.groupId?.name || "",
            attendanceStatus: newStatus,
            notes: `Attendance: ${oldStatus || "none"} → ${newStatus}`,
          });
        } else {
          await student.addCreditHours({
            hours: CREDIT_DEDUCTION,
            sessionId: id,
            sessionTitle: session.title || "",
            groupId: session.groupId?._id,
            groupName: session.groupId?.name || "",
            reason: `Attendance changed: ${oldStatus} → ${newStatus}`,
          });
        }
      }

      results.push({
        studentId,
        oldStatus,
        newStatus,
        action: "updated",
        creditAction,
      });

      if (["absent", "late", "excused"].includes(newStatus)) {
        notifyList.push({ studentId, status: newStatus });
      }
    }

    // ✅ تجميع طلاب تنبيهات الرصيد
    const lowBalanceStudents = [];
    const zeroBalanceStudents = [];

    for (const record of results) {
      if (record.action !== "updated") continue;

      const student = studentMap[record.studentId];
      if (!student?.creditSystem?.currentPackage) continue;

      const remainingHours =
        student.creditSystem.currentPackage.remainingHours || 0;

      const wasDeductedNow = record.creditAction === "deduct";
      const previousBalance = wasDeductedNow
        ? remainingHours + CREDIT_DEDUCTION
        : remainingHours;

      if (
        wasDeductedNow &&
        previousBalance > 4 &&
        remainingHours <= 4 &&
        remainingHours > 2
      ) {
        lowBalanceStudents.push({
          studentId: record.studentId,
          student,
          remainingHours,
          alertType: "4h",
        });
      }

      if (
        wasDeductedNow &&
        previousBalance > 2 &&
        remainingHours <= 2 &&
        remainingHours > 0
      ) {
        lowBalanceStudents.push({
          studentId: record.studentId,
          student,
          remainingHours,
          alertType: "2h",
        });
      }

      if (remainingHours <= 0) {
        zeroBalanceStudents.push({
          studentId: record.studentId,
          student,
          remainingHours: 0,
        });
      }
    }

    if (lowBalanceStudents.length > 0) {
      try {
        await sendLowBalanceAlerts(lowBalanceStudents);
      } catch (err) {
        console.error("⚠️ Low balance alerts error:", err.message);
      }
    }

    if (zeroBalanceStudents.length > 0) {
      try {
        await disableZeroBalanceNotifications(zeroBalanceStudents);
      } catch (err) {
        console.error("⚠️ Zero balance notifications error:", err.message);
      }
    }

    session.attendanceTaken = true;

    if (session.earlyAccess?.enabled && !session.earlyAccess?.consumedAt) {
      session.earlyAccess.consumedAt = new Date();
    }

    await session.save();

    // ═══════════════════════════════════════════════════════════════════
    // ✅ HOLD — استهلاك أو فكّ تلقائي
    // ═══════════════════════════════════════════════════════════════════
    try {
      const groupId = session.groupId?._id || session.groupId;
      if (groupId) {
        const groupDoc = await Group.findById(groupId);

        if (groupDoc?.hold?.isHeld) {
          // 🎯 sessions: استهلك سيشن
          if (groupDoc.hold.holdType === "sessions") {
            const consumeResult = await groupDoc.consumeHoldSession();
            if (consumeResult.autoReleased) {
              console.log(
                `✅ Hold auto-released for group ${groupDoc.code} (sessions consumed)`,
              );
            }
          }

          // 🎯 until_session: افحص لو السيشن دي هي المستهدفة
          if (groupDoc.hold.holdType === "until_session") {
            const releaseResult =
              await groupDoc.checkAndReleaseUntilSessionHold(session._id);
            if (releaseResult?.released) {
              console.log(
                `✅ Hold auto-released for group ${groupDoc.code} (target session consumed)`,
              );
            }
          }
        }
      }
    } catch (holdErr) {
      console.warn(
        "⚠️ Could not process hold consumption/release:",
        holdErr.message,
      );
    }

    if (notifyList.length) {
      await sendAbsenceNotifications(id, notifyList);
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        creditUpdates: {
          lowBalanceAlerts: lowBalanceStudents.length,
          zeroBalanceAlerts: zeroBalanceStudents.length,
        },
      },
    });
  } catch (error) {
    console.error("❌ PATCH attendance error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}