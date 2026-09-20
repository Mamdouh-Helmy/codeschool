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

  if (hold.holdType === "indefinite" || hold.holdType === "duration") return true;
  if (!Array.isArray(allGroupSessions) || allGroupSessions.length === 0) return true;

  const sorted = sortSessionsForHold(allGroupSessions);
  const myIndex = sorted.findIndex((s) => String(s._id) === String(session._id));
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

/** ✅ بيجيب سيشنات الجروب ويحدد هل السيشن دي مقفولة (مكان واحد بدل 3 نسخ) */
async function resolveSessionLock(session, group) {
  if (!group?.hold?.isHeld) return false;

  const allGroupSessions = await Session.find({
    groupId: group._id,
    isDeleted: false,
  })
    .select("_id moduleIndex sessionNumber scheduledDate status")
    .lean();

  return isSessionLockedByHold(
    {
      _id: session._id,
      moduleIndex: session.moduleIndex,
      sessionNumber: session.sessionNumber,
      status: session.status,
    },
    group,
    allGroupSessions,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ✅ AUTH / OWNERSHIP HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const json = (body, status = 200) => NextResponse.json(body, { status });

/**
 * ✅ FIX (SECURITY): الملف ده كان بيتحقق بس إن فيه user مسجل دخول، من غير
 * فحص الدور ولا إن المدرس مسؤول عن جروب السيشن. يعني أي مستخدم كان يقدر
 * يشوف بيانات الطلاب وأرقام أولياء الأمور أو يسجل حضور/يخصم رصيد لأي سيشن.
 */
function checkRole(user) {
  if (!user) return json({ success: false, error: "غير مصرح بالوصول" }, 401);
  if (user.role !== "instructor" && user.role !== "admin") {
    return json({ success: false, error: "هذه الصفحة للمدرسين فقط", code: "FORBIDDEN" }, 403);
  }
  return null;
}

function checkGroupOwnership(user, group) {
  if (user.role === "admin") return null;
  const isOwner = group?.instructors?.some(
    (i) => String(i.userId) === String(user.id),
  );
  return isOwner
    ? null
    : json({ success: false, error: "مش مدرس هذا الجروب", code: "FORBIDDEN_GROUP" }, 403);
}

function getGroupStudentIdSet(group) {
  return new Set((group?.students || []).map((s) => String(s.studentId || s)));
}

async function parseBody(req) {
  const text = await req.text();
  return text ? JSON.parse(text) : {};
}

// ─── Constants ───────────────────────────────────────────
const VALID_STATUSES = ["present", "late", "absent", "excused"];
const DEDUCT_STATUSES = VALID_STATUSES;
const NOTIFY_STATUSES = ["absent", "late", "excused"];
const CREDIT_DEDUCTION = 2;

const SESSION_POPULATE = {
  path: "groupId",
  select: "name code students instructors hold status",
};

/**
 * ✅ تحميل السيشن + صلاحيات المستخدم عليها.
 * بيرجع { session } لو تمام، أو { error: NextResponse } لو لأ.
 */
async function loadAuthorizedSession(req, id, { lean = false } = {}) {
  const user = await getUserFromRequest(req);
  const roleError = checkRole(user);
  if (roleError) return { error: roleError };

  await connectDB();

  let query = Session.findById(id).populate(SESSION_POPULATE);
  if (lean) query = query.lean();
  const session = await query;

  if (!session) return { error: json({ success: false, error: "Session not found" }, 404) };

  const ownershipError = checkGroupOwnership(user, session.groupId);
  if (ownershipError) return { error: ownershipError };

  return { user, session };
}

// ─── Helper: صلاحية الجروب / السيشن لتسجيل الحضور ────────
async function checkGroupAvailability(session) {
  const group = session?.groupId;
  if (!group?._id) return { ok: false, error: "Session has no group" };

  if (!group.hold?.isHeld) {
    if (group.status !== "active" && group.status !== "completed") {
      return {
        ok: false,
        code: "GROUP_NOT_ACTIVE",
        error: `الجروب حالته "${group.status}" — مينفعش تسجل حضور`,
      };
    }
    return { ok: true };
  }

  if (await resolveSessionLock(session, group)) {
    return {
      ok: false,
      code: "SESSION_ON_HOLD",
      error: "السيشن دي مقفولة بسبب الـ Hold — مينفعش تسجل حضور",
    };
  }

  return { ok: true };
}

const holdBlockedResponse = () =>
  json(
    { success: false, error: "السيشن دي مقفولة بسبب الـ Hold", code: "SESSION_ON_HOLD" },
    403,
  );

// ─── GET ─────────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const { session, error } = await loadAuthorizedSession(req, id, { lean: true });
    if (error) return error;

    const group = session.groupId;
    const isOnHold = !!group?.hold?.isHeld;
    const sessionLocked = isOnHold ? await resolveSessionLock(session, group) : false;

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
      const absenceCount = (s.whatsappMessages || []).filter(
        (m) => m.messageType === "absence_notification",
      ).length;

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
        guardianPhone: s.guardianInfo?.phone || s.guardianInfo?.whatsappNumber || "",
        guardianRelationship: s.guardianInfo?.relationship || "father",
        preferredLanguage: s.communicationPreferences?.preferredLanguage || "ar",
        credits: s.creditSystem?.currentPackage?.remainingHours ?? 0,
        creditStatus: s.creditSystem?.status || "no_package",
        absenceCount,
        currentStatus: existingAttendance[s._id.toString()] || null,
      };
    });

    return json({
      success: true,
      data: {
        session,
        students: studentsWithAttendance,
        groupIsOnHold: isOnHold,
        sessionLocked,
        groupHold: group?.hold || null,
        isComplimentary: session.isComplimentary === true,
        makeupInfo: session.makeupInfo || null,
      },
    });
  } catch (error) {
    console.error("❌ GET attendance error:", error);
    return json({ success: false, error: error.message }, 500);
  }
}

// ─── POST (preview template أو إرسال فوري) ────────────────
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const { session, error } = await loadAuthorizedSession(req, id, { lean: true });
    if (error) return error;

    let body;
    try {
      body = await parseBody(req);
    } catch {
      return json({ success: false, error: "Invalid JSON" }, 400);
    }

    const { attendanceStatus, studentId, extraData = {}, sendNow = false } = body;

    if (!studentId || !attendanceStatus) {
      return json({ success: false, error: "studentId and attendanceStatus are required" }, 400);
    }
    if (!VALID_STATUSES.includes(attendanceStatus)) {
      return json({ success: false, error: "Invalid attendanceStatus" }, 400);
    }

    // ✅ الطالب لازم يكون في جروب السيشن
    if (!getGroupStudentIdSet(session.groupId).has(String(studentId))) {
      return json({ success: false, error: "الطالب ده مش في جروب السيشن" }, 403);
    }

    if (await resolveSessionLock(session, session.groupId)) {
      return holdBlockedResponse();
    }

    // 🆕 sendNow: إرسال فوري لرسالة الواتساب بس
    if (sendNow) {
      try {
        await sendAbsenceNotifications(id, [{ studentId, status: attendanceStatus }]);
        return json({ success: true, data: { sent: true } });
      } catch (sendError) {
        console.error("❌ [sendNow] notification error:", sendError);
        return json(
          { success: false, error: sendError.message || "Failed to send notification" },
          500,
        );
      }
    }

    const student = await Student.findById(studentId)
      .select("personalInfo guardianInfo communicationPreferences enrollmentNumber creditSystem")
      .lean();
    if (!student) return json({ success: false, error: "Student not found" }, 404);

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
      sessionTitle: session.title || "",
      scheduledDate: session.scheduledDate || null,
      startTime: session.startTime || "",
      endTime: session.endTime || "",
      groupName: session.groupId?.name || "",
      groupCode: session.groupId?.code || "",
      meetingLink: session.meetingLink || "",
    };

    return json({
      success: true,
      data: {
        guardian: templates?.guardian
          ? { content: templates.guardian.content, isFallback: templates.guardian.isFallback }
          : null,
        metadata,
      },
    });
  } catch (error) {
    console.error("❌ POST attendance preview error:", error);
    return json({ success: false, error: error.message }, 500);
  }
}

// ─── PATCH (save attendance + credits) ───────────────────
export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const { session, error } = await loadAuthorizedSession(req, id);
    if (error) return error;

    let body;
    try {
      body = await parseBody(req);
    } catch {
      return json({ success: false, error: "Invalid JSON" }, 400);
    }

    const { attendanceRecords } = body;
    if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      return json({ success: false, error: "attendanceRecords array is required" }, 400);
    }

    // ✅ كل سجل لازم يكون حالته صحيحة وطالبه في جروب السيشن
    const groupStudentIds = getGroupStudentIdSet(session.groupId);
    const invalidRecord = attendanceRecords.find(
      (r) => !r?.studentId || !VALID_STATUSES.includes(r.status) || !groupStudentIds.has(String(r.studentId)),
    );
    if (invalidRecord) {
      return json(
        { success: false, error: "سجل حضور غير صالح أو طالب مش في جروب السيشن", code: "INVALID_RECORD" },
        400,
      );
    }

    const availability = await checkGroupAvailability(session);
    if (!availability.ok) {
      return json(
        { success: false, error: availability.error, code: availability.code },
        403,
      );
    }

    // ✅ الحصة التعويضية: بيتسجل الحضور عادي بس من غير أي خصم/refund/تنبيهات رصيد
    const isComplimentarySession = session.isComplimentary === true;

    console.log(`📋 [Attendance PATCH] Session ${id} | isComplimentary: ${isComplimentarySession}`);

    const oldStatusSnapshot = {};
    session.attendance.forEach((a) => {
      oldStatusSnapshot[a.studentId?.toString()] = a.status;
    });

    const students = await Student.find({
      _id: { $in: attendanceRecords.map((r) => r.studentId) },
    });
    const studentMap = Object.fromEntries(students.map((s) => [s._id.toString(), s]));

    const results = [];
    const notifyList = [];

    for (const record of attendanceRecords) {
      const { studentId, status: newStatus } = record;
      const oldStatus = oldStatusSnapshot[studentId] || null;

      if (oldStatus === newStatus) {
        results.push({ studentId, oldStatus, newStatus, action: "no_change", creditAction: "nothing" });
        continue;
      }

      const existing = session.attendance.find((a) => a.studentId?.toString() === studentId);
      if (existing) existing.status = newStatus;
      else session.attendance.push({ studentId, status: newStatus });

      const wasDeducting = oldStatus !== null && DEDUCT_STATUSES.includes(oldStatus);
      const willDeduct = DEDUCT_STATUSES.includes(newStatus);

      let creditAction = "nothing";
      if (!wasDeducting && willDeduct) creditAction = "deduct";
      if (wasDeducting && !willDeduct) creditAction = "refund";
      if (isComplimentarySession) creditAction = "skipped_complimentary";

      const student = studentMap[studentId];
      const creditPayload = {
        hours: CREDIT_DEDUCTION,
        sessionId: id,
        sessionTitle: session.title || "",
        groupId: session.groupId?._id,
        groupName: session.groupId?.name || "",
      };

      if (student && creditAction === "deduct") {
        await student.deductCreditHours({
          ...creditPayload,
          attendanceStatus: newStatus,
          notes: `Attendance: ${oldStatus || "none"} → ${newStatus}`,
        });
      } else if (student && creditAction === "refund") {
        await student.addCreditHours({
          ...creditPayload,
          reason: `Attendance changed: ${oldStatus} → ${newStatus}`,
        });
      } else if (student && creditAction === "skipped_complimentary") {
        console.log(`🎁 [Make-up] Skipping credit deduction for student ${studentId}`);
      }

      results.push({ studentId, oldStatus, newStatus, action: "updated", creditAction });

      if (NOTIFY_STATUSES.includes(newStatus)) {
        notifyList.push({ studentId, status: newStatus });
      }
    }

    // ✅ تنبيهات الرصيد — بنتخطاها للحصص التعويضية
    const lowBalanceStudents = [];
    const zeroBalanceStudents = [];

    if (!isComplimentarySession) {
      for (const record of results) {
        if (record.action !== "updated" || record.creditAction !== "deduct") continue;

        const student = studentMap[record.studentId];
        if (!student?.creditSystem?.currentPackage) continue;

        const remainingHours = student.creditSystem.currentPackage.remainingHours || 0;
        const previousBalance = remainingHours + CREDIT_DEDUCTION;
        const base = { studentId: record.studentId, student, remainingHours };

        if (previousBalance > 4 && remainingHours <= 4 && remainingHours > 2) {
          lowBalanceStudents.push({ ...base, alertType: "4h" });
        }
        if (previousBalance > 2 && remainingHours <= 2 && remainingHours > 0) {
          lowBalanceStudents.push({ ...base, alertType: "2h" });
        }
        if (remainingHours <= 0) {
          zeroBalanceStudents.push({ ...base, remainingHours: 0 });
        }
      }
    } else {
      console.log(`🎁 [Make-up] Skipping balance alerts for session ${id}`);
    }

      if (lowBalanceStudents.length > 0) {
      try {
        await sendLowBalanceAlerts(lowBalanceStudents, id);
      } catch (err) {
        console.error("⚠️ Low balance alerts error:", err.message);
      }
    }

    if (zeroBalanceStudents.length > 0) {
      try {
        await disableZeroBalanceNotifications(zeroBalanceStudents, id);
      } catch (err) {
        console.error("⚠️ Zero balance notifications error:", err.message);
      }
    }

    session.attendanceTaken = true;
    if (session.earlyAccess?.enabled && !session.earlyAccess?.consumedAt) {
      session.earlyAccess.consumedAt = new Date();
    }
    await session.save();

    // ── HOLD: استهلاك أو فكّ تلقائي ─────────────────────────────────────
    try {
      const groupId = session.groupId?._id || session.groupId;
      const groupDoc = groupId ? await Group.findById(groupId) : null;

      if (groupDoc?.hold?.isHeld) {
        if (groupDoc.hold.holdType === "sessions") {
          const consumeResult = await groupDoc.consumeHoldSession();
          if (consumeResult.autoReleased) {
            console.log(`✅ Hold auto-released for group ${groupDoc.code} (sessions consumed)`);
          }
        }
        if (groupDoc.hold.holdType === "until_session") {
          const releaseResult = await groupDoc.checkAndReleaseUntilSessionHold(session._id);
          if (releaseResult?.released) {
            console.log(`✅ Hold auto-released for group ${groupDoc.code} (target session consumed)`);
          }
        }
      }
    } catch (holdErr) {
      console.warn("⚠️ Could not process hold consumption/release:", holdErr.message);
    }

    if (notifyList.length) {
      await sendAbsenceNotifications(id, notifyList);
    }

    return json({
      success: true,
      data: {
        results,
        creditUpdates: {
          lowBalanceAlerts: lowBalanceStudents.length,
          zeroBalanceAlerts: zeroBalanceStudents.length,
        },
        isComplimentary: isComplimentarySession,
      },
    });
  } catch (error) {
    console.error("❌ PATCH attendance error:", error);
    return json({ success: false, error: error.message }, 500);
  }
}