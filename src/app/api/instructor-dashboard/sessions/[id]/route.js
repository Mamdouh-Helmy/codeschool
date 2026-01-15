import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Session from "../../../../models/Session";
import Group from "../../../../models/Group";
import Course from "../../../../models/Course";
import Student from "../../../../models/Student";
import { getUserFromRequest } from "@/lib/auth";
import { onSessionStatusChanged } from "@/app/services/groupAutomation";
import mongoose from "mongoose";

// ✅ تم إزالة جميع القيود - المدرس يمكنه التعديل في أي وقت وأي حالة
function canEditSession(session, user) {
  return true; // ✅ يمكن التعديل دائمًا
}

function canCancelSession(session, user) {
  return true; // ✅ يمكن الإلغاء دائمًا
}

function canPostponeSession(session, user) {
  return true; // ✅ يمكن التأجيل دائمًا
}

function canCompleteSession(session, user) {
  return true; // ✅ يمكن الإكمال دائمًا
}

function canRescheduleSession(session, user) {
  return true; // ✅ يمكن إعادة الجدولة دائمًا
}

async function getSessionNavigation(currentSession) {
  try {
    // الجلسات السابقة (بنفس المجموعة)
    const previousSessions = await Session.find({
      groupId: currentSession.groupId,
      scheduledDate: { $lt: currentSession.scheduledDate },
      isDeleted: false,
    })
      .sort({ scheduledDate: -1 })
      .limit(3)
      .select("_id title scheduledDate status")
      .lean();

    // الجلسات التالية (بنفس المجموعة)
    const nextSessions = await Session.find({
      groupId: currentSession.groupId,
      scheduledDate: { $gt: currentSession.scheduledDate },
      isDeleted: false,
    })
      .sort({ scheduledDate: 1 })
      .limit(3)
      .select("_id title scheduledDate status")
      .lean();

    return {
      previousSessions,
      nextSessions,
    };
  } catch (error) {
    console.error("Error getting session navigation:", error);
    return {
      previousSessions: [],
      nextSessions: [],
    };
  }
}

// دالة مساعدة لجلب تفاصيل حضور الطلاب
async function getStudentAttendance(session) {
  try {
    // إذا كان الحضور مسجلاً بالفعل
    if (session.attendance && session.attendance.length > 0) {
      const attendanceWithDetails = await Promise.all(
        session.attendance.map(async (record) => {
          const student = await Student.findById(record.studentId)
            .select(
              "personalInfo.fullName personalInfo.email personalInfo.whatsappNumber enrollmentNumber guardianInfo"
            )
            .lean();

          return {
            studentId:
              record.studentId?._id?.toString() || record.studentId?.toString(),
            fullName: student?.personalInfo?.fullName || "غير معروف",
            email: student?.personalInfo?.email || "",
            enrollmentNumber: student?.enrollmentNumber || "",
            whatsappNumber: student?.personalInfo?.whatsappNumber,
            guardianInfo: student?.guardianInfo || {},
            attendance: {
              status: record.status || "pending",
              notes: record.notes || "",
              markedAt: record.markedAt || null,
              markedBy: record.markedBy || null,
            },
          };
        })
      );

      return attendanceWithDetails;
    } else {
      // إذا لم يكن هناك حضور مسجل، اجلب جميع الطلاب في المجموعة
      const students = await Student.find({
        "academicInfo.groupIds": session.groupId._id,
        isDeleted: false,
      })
        .select(
          "personalInfo.fullName personalInfo.email personalInfo.whatsappNumber enrollmentNumber guardianInfo"
        )
        .lean();

      return students.map((student) => ({
        studentId: student._id.toString(),
        fullName: student.personalInfo?.fullName || "غير معروف",
        email: student.personalInfo?.email || "",
        enrollmentNumber: student.enrollmentNumber || "",
        whatsappNumber: student.personalInfo?.whatsappNumber,
        guardianInfo: student.guardianInfo || {},
        attendance: {
          status: "pending",
          notes: "",
          markedAt: null,
          markedBy: null,
        },
      }));
    }
  } catch (error) {
    console.error("Error getting student attendance:", error);
    return [];
  }
}

// GET: Fetch single session
export async function GET(req, { params }) {
  try {
    console.log(`\n📋 ========== INSTRUCTOR GET SESSION DETAILS ==========`);

    const user = await getUserFromRequest(req);

    if (!user || user.role !== "instructor") {
      return NextResponse.json(
        { success: false, error: "غير مصرح لك بالوصول. يجب أن تكون مدرساً" },
        { status: 403 }
      );
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "معرف الجلسة غير صالح" },
        { status: 400 }
      );
    }

    console.log(`🔍 Fetching session: ${id}`);
    console.log(`👤 Instructor: ${user.name}`);

    const session = await Session.findOne({ _id: id, isDeleted: false })
      .populate("groupId", "name code instructors automation")
      .populate("courseId", "title")
      .populate(
        "attendance.studentId",
        "personalInfo.fullName enrollmentNumber"
      )
      .populate("attendance.markedBy", "name email")
      .populate("metadata.createdBy", "name email");

    if (!session) {
      console.log(`❌ Session not found: ${id}`);
      return NextResponse.json(
        { success: false, error: "الجلسة غير موجودة" },
        { status: 404 }
      );
    }

    console.log(`✅ Session found: ${session.title}`);
    console.log(`👥 Group: ${session.groupId.name} (${session.groupId.code})`);

    // التحقق إذا كان المدرس يدرس هذه المجموعة
    const isInstructorOfGroup = session.groupId.instructors.some(
      (instructor) => instructor.toString() === user.id
    );

    if (!isInstructorOfGroup) {
      console.log(
        `❌ Instructor ${user.name} is not teaching group ${session.groupId.name}`
      );
      return NextResponse.json(
        { success: false, error: "غير مصرح لك بالوصول إلى هذه الجلسة" },
        { status: 403 }
      );
    }

    // التحقق من الصلاحيات
    const now = new Date();
    const sessionDate = new Date(session.scheduledDate);
    const [hours, minutes] = session.startTime.split(":").map(Number);
    sessionDate.setHours(hours, minutes, 0, 0);

    const hoursBefore = (sessionDate - now) / (1000 * 60 * 60);
    const isPast = sessionDate < now;
    const isUpcoming = hoursBefore > 0 && hoursBefore <= 48;

    // ✅ السماح بأخذ الحضور في أي حالة (حتى لو كانت مكتملة)
    const canTakeAttendance = !session.attendanceTaken;

    // جلب تفاصيل الحضور
    const studentAttendance = await getStudentAttendance(session);

    // حساب إحصائيات الحضور
    const attendanceStats = {
      total: studentAttendance.length,
      present: studentAttendance.filter(
        (s) => s.attendance.status === "present"
      ).length,
      absent: studentAttendance.filter((s) => s.attendance.status === "absent")
        .length,
      late: studentAttendance.filter((s) => s.attendance.status === "late")
        .length,
      excused: studentAttendance.filter(
        (s) => s.attendance.status === "excused"
      ).length,
      pending: studentAttendance.filter(
        (s) => s.attendance.status === "pending"
      ).length,
    };

    // جلب الجلسات السابقة والتالية
    const navigation = await getSessionNavigation(session);

    // ✅ الصلاحيات المطلقة للمدرس
    const permissions = {
      canTakeAttendance,
      canEdit: true, // ✅ يمكن التعديل دائمًا
      canCancel: true, // ✅ يمكن الإلغاء دائمًا
      canPostpone: true, // ✅ يمكن التأجيل دائمًا
      canComplete: true, // ✅ يمكن الإكمال دائمًا
      canReschedule: true, // ✅ يمكن إعادة الجدولة دائمًا
      canDelete: false, // ✅ لا يمكن الحذف (فقط الإلغاء)
    };

    // تحضير كائن الجلسة النهائي
    const sessionData = {
      _id: session._id,
      title: session.title,
      description: session.description || "",
      scheduledDate: session.scheduledDate,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      moduleIndex: session.moduleIndex,
      sessionNumber: session.sessionNumber,
      lessonIndexes: session.lessonIndexes,
      attendanceTaken: session.attendanceTaken,
      meetingLink: session.meetingLink || "",
      recordingLink: session.recordingLink || "",
      instructorNotes: session.instructorNotes || "",
      groupId: {
        _id: session.groupId._id,
        name: session.groupId.name,
        code: session.groupId.code,
        automation: session.groupId.automation || {
          whatsappEnabled: false,
          notifyGuardianOnAbsence: false,
          notifyOnSessionUpdate: false,
        },
      },
      courseId: {
        _id: session.courseId._id,
        title: session.courseId.title,
        level: session.courseId.level || "",
      },
      attendance: session.attendance || [],
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      permissions: permissions,
      metadata: {
        isPast,
        isUpcoming,
        hoursUntil: hoursBefore,
        attendanceStats: {
          total: attendanceStats.total,
          present: attendanceStats.present,
          absent: attendanceStats.absent,
          late: attendanceStats.late,
          excused: attendanceStats.excused,
        },
      },
      automation: {
        whatsappEnabled: session.groupId.automation?.whatsappEnabled || false,
        notifyGuardianOnAbsence:
          session.groupId.automation?.notifyGuardianOnAbsence || false,
        notifyOnSessionUpdate:
          session.groupId.automation?.notifyOnSessionUpdate || false,
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        session: sessionData,
        studentAttendance,
        attendanceStats,
        navigation,
        permissions,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching session:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "فشل في جلب الجلسة",
      },
      { status: 500 }
    );
  }
}

// PUT: Update session with custom message support
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    console.log(`\n✏️ ========== INSTRUCTOR UPDATE SESSION ==========`);
    console.log(`📋 Session ID: ${id}`);

    const user = await getUserFromRequest(req);

    if (!user || user.role !== "instructor") {
      return NextResponse.json(
        { success: false, error: "غير مصرح لك بالتعديل. يجب أن تكون مدرساً" },
        { status: 403 }
      );
    }

    console.log(`👤 Instructor: ${user.name} (${user.email})`);

    await connectDB();

    const updateData = await req.json();
    console.log(`📦 Update data:`, {
      status: updateData.status,
      hasCustomMessage: !!updateData.customMessage,
      hasProcessedMessage: !!updateData.processedMessage,
      meetingLink: updateData.meetingLink ? "Provided" : "Not provided",
      recordingLink: updateData.recordingLink ? "Provided" : "Not provided",
      instructorNotes: updateData.instructorNotes ? "Provided" : "Not provided",
    });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "معرف الجلسة غير صالح" },
        { status: 400 }
      );
    }

    // جلب الجلسة الحالية للتحقق
    const existingSession = await Session.findOne({
      _id: id,
      isDeleted: false,
    }).populate("groupId", "instructors automation");

    if (!existingSession) {
      console.log(`❌ Session not found: ${id}`);
      return NextResponse.json(
        { success: false, error: "الجلسة غير موجودة" },
        { status: 404 }
      );
    }

    console.log(`✅ Session found: ${existingSession.title}`);
    console.log(`📊 Current status: ${existingSession.status}`);
    console.log(`📊 Attendance taken: ${existingSession.attendanceTaken}`);

    // التحقق إذا كان المدرس يدرس هذه المجموعة
    const isInstructorOfGroup = existingSession.groupId.instructors.some(
      (instructor) => instructor.toString() === user.id
    );

    if (!isInstructorOfGroup) {
      console.log(`❌ Instructor not authorized for this group`);
      return NextResponse.json(
        { success: false, error: "غير مصرح لك بتعديل هذه الجلسة" },
        { status: 403 }
      );
    }

    const oldStatus = existingSession.status;
    const newStatus = updateData.status;

    console.log(`🔄 Status change: ${oldStatus} → ${newStatus}`);

    // ✅ إزالة جميع القيود - يمكن التعديل في أي وقت وأي حالة

    // ✅ إنشاء payload للتحديث
    const updatePayload = {
      meetingLink: updateData.meetingLink || existingSession.meetingLink || "",
      recordingLink:
        updateData.recordingLink || existingSession.recordingLink || "",
      instructorNotes:
        updateData.instructorNotes || existingSession.instructorNotes || "",
      "metadata.updatedBy": user.id,
      "metadata.updatedAt": new Date(),
    };

    // تحديث الحالة إذا تم توفيرها
    if (
      newStatus &&
      ["scheduled", "completed", "cancelled", "postponed"].includes(newStatus)
    ) {
      updatePayload.status = newStatus;

      // ✅ إذا كانت الحالة تتغير من "completed" إلى حالة أخرى، نزيل الحضور المسجل
      if (
        oldStatus === "completed" &&
        newStatus !== "completed" &&
        existingSession.attendanceTaken
      ) {
        console.log(
          `🔄 Removing attendance for status change from completed to ${newStatus}`
        );
        updatePayload.attendanceTaken = false;
        updatePayload.attendance = [];
      }

      // ✅ إذا كانت الحالة تتغير إلى "completed" ولدينا حضور مسجل، نحتفظ به
      if (newStatus === "completed" && existingSession.attendanceTaken) {
        console.log(`✅ Keeping attendance for completed session`);
        updatePayload.attendanceTaken = true;
      }
    }

    // ✅ حفظ الرسالة المخصصة في السيشن (اختياري)
    if (
      (newStatus === "cancelled" ||
        newStatus === "postponed" ||
        newStatus === "scheduled") &&
      updateData.customMessage
    ) {
      updatePayload.customStatusMessage = updateData.customMessage;
      updatePayload.processedStatusMessage = updateData.processedMessage;
      console.log("💾 Saving custom message to session record");
    }

    const updatedSession = await Session.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    })
      .populate("groupId", "name code automation")
      .populate("courseId", "title");

    console.log(`✅ Session updated: ${updatedSession.title}`);
    console.log(`📊 New status: ${updatedSession.status}`);
    console.log(`📊 Attendance taken: ${updatedSession.attendanceTaken}`);

    // ✅ Trigger automation if status changed
    if (
      newStatus &&
      oldStatus !== newStatus &&
      (newStatus === "cancelled" ||
        newStatus === "postponed" ||
        newStatus === "scheduled") &&
      updatedSession.groupId.automation?.whatsappEnabled &&
      updatedSession.groupId.automation?.notifyOnSessionUpdate
    ) {
      // استخدم الرسالة المعالجة (المخصصة مع تعويض المتغيرات)
      const messageToSend = updateData.processedMessage || "";

      console.log(`🔄 Triggering automation for ${newStatus}...`);
      console.log(
        `📱 WhatsApp notifications enabled: ${updatedSession.groupId.automation.whatsappEnabled}`
      );
      console.log(
        `🔔 Session update notifications: ${updatedSession.groupId.automation.notifyOnSessionUpdate}`
      );

      // غير متزامن (async) - لا تنتظر الانتهاء
      setTimeout(async () => {
        try {
          console.log(`📤 Starting WhatsApp notifications...`);
          const automationResult = await onSessionStatusChanged(
            id,
            newStatus,
            messageToSend // ✅ مرر الرسالة المخصصة
          );
          console.log("✅ Automation completed:", {
            success: automationResult.success,
            sent: automationResult.successCount,
            failed: automationResult.failCount,
          });
        } catch (automationError) {
          console.error("❌ Automation failed:", automationError);
          // لا نرجع خطأ هنا لأن التحديث نجح بالفعل
        }
      }, 500);

      // Response فوري للمستخدم
      return NextResponse.json({
        success: true,
        message: "تم تحديث الجلسة بنجاح",
        data: {
          session: updatedSession,
          automation: {
            triggered: true,
            action: `إرسال إشعار ${
              newStatus === "cancelled"
                ? "إلغاء"
                : newStatus === "postponed"
                ? "تأجيل"
                : "جدولة"
            } للطلاب عبر الواتساب`,
            status: "processing",
            customMessageUsed: !!updateData.customMessage,
            timestamp: new Date(),
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "تم تحديث الجلسة بنجاح",
      data: {
        session: updatedSession,
      },
    });
  } catch (error) {
    console.error("❌ Error updating session:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors || {})
        .map((err) => err.message)
        .join("; ");

      return NextResponse.json(
        {
          success: false,
          error: "فشل في التحقق من البيانات",
          details: messages,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "فشل في تحديث الجلسة",
      },
      { status: 500 }
    );
  }
}
