// app/api/instructor-dashboard/sessions/[id]/attendance/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Session from "../../../../../models/Session";
import Student from "../../../../../models/Student";
import Course from "../../../../../models/Course";
import User from "../../../../../models/User";
import Group from "../../../../../models/Group";
import { getUserFromRequest } from "@/lib/auth";
import { onAttendanceSubmitted } from "@/app/services/groupAutomation";
import mongoose from "mongoose";

/**
 * ✅ دالة مساعدة: استبدال المتغيرات في الرسالة المخصصة
 */
function processCustomMessageWithVariables(
  message,
  student,
  session,
  group,
  status,
  notes = ""
) {
  if (!message || typeof message !== "string") return message;

  // تحضير المتغيرات
  const guardianName = student.guardianInfo?.name || "ولي الأمر";
  const studentName = student.personalInfo?.fullName || "الطالب";

  // معالجة التاريخ
  let sessionDate = "تاريخ غير صالح";
  try {
    if (session.scheduledDate) {
      const dateObj = new Date(session.scheduledDate);
      if (!isNaN(dateObj.getTime())) {
        sessionDate = dateObj.toLocaleDateString("ar-EG", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
    }
  } catch (dateError) {
    console.log(`⚠️ Error parsing date: ${dateError.message}`);
  }

  // نص الحالة
  const statusAr = {
    absent: "غائب",
    late: "متأخر",
    excused: "معذور",
  };
  const statusText = statusAr[status] || "غير محدد";

  const variables = {
    guardianName,
    studentName,
    sessionName: session.title || "الجلسة",
    sessionNumber: `الجلسة ${session.sessionNumber || ""}`,
    date: sessionDate,
    time: `${session.startTime || ""} - ${session.endTime || ""}`,
    status: statusText,
    groupCode: group.code || "",
    groupName: group.name || "",
    notes: notes || "",
  };

  let processedMessage = message;

  // استبدال المتغيرات الأساسية
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    processedMessage = processedMessage.replace(regex, value);
  });

  // ✅✅✅ **FIX: معالجة المتغير الشرطي {notes ? '...' : ''}** ✅✅✅
  // النمط 1: {notes ? '📝 ملاحظات: {notes}' : ''}
  const notesConditionalRegex1 = /\{notes\s*\?\s*'([^']*)'\s*:\s*'([^']*)'\}/g;
  if (notesConditionalRegex1.test(processedMessage)) {
    processedMessage = processedMessage.replace(
      notesConditionalRegex1,
      (match, ifTrue, ifFalse) => {
        if (notes && notes.trim() !== "") {
          // استبدال {notes} داخل الجزء الشرطي أيضًا
          return ifTrue.replace(/\{notes\}/g, notes);
        } else {
          return ifFalse;
        }
      }
    );
  }

  // النمط 2: {notes ? '...' : ''} بدون علامات تنصيص
  const notesConditionalRegex2 = /\{notes\s*\?\s*([^:]+)\s*:\s*([^}]+)\}/g;
  if (notesConditionalRegex2.test(processedMessage)) {
    processedMessage = processedMessage.replace(
      notesConditionalRegex2,
      (match, ifTrue, ifFalse) => {
        if (notes && notes.trim() !== "") {
          // استبدال {notes} داخل الجزء الشرطي أيضًا
          return ifTrue.replace(/\{notes\}/g, notes).trim();
        } else {
          return ifFalse.trim();
        }
      }
    );
  }

  // النمط 3: {notes ? '...' : ''} مع فواصل أسطر
  const notesConditionalRegex3 = /\{notes\s*\?\s*([^}]+)\s*:\s*([^}]+)\}/gs;
  if (notesConditionalRegex3.test(processedMessage)) {
    processedMessage = processedMessage.replace(
      notesConditionalRegex3,
      (match, ifTrue, ifFalse) => {
        if (notes && notes.trim() !== "") {
          // استبدال {notes} داخل الجزء الشرطي أيضًا
          return ifTrue.replace(/\{notes\}/g, notes);
        } else {
          return ifFalse;
        }
      }
    );
  }

  // ✅ معالجة المتغير الشرطي العام {variable ? '...' : ''}
  const generalConditionalRegex = /\{([^}?]+)\s*\?\s*([^:]+)\s*:\s*([^}]+)\}/g;
  processedMessage = processedMessage.replace(
    generalConditionalRegex,
    (match, variable, ifTrue, ifFalse) => {
      const varValue = variables[variable.trim()];
      if (varValue && varValue.toString().trim() !== "") {
        return ifTrue.trim();
      } else {
        return ifFalse.trim();
      }
    }
  );

  return processedMessage;
}

export async function POST(req, { params }) {
  // ✅ تعريف المتغيرات في النطاق الخارجي
  let processedCustomMessages = {};
  let automationResult = {
    successCount: 0,
    failCount: 0,
    notificationResults: [],
  };

  try {
    const { id } = await params;
    console.log(`\n🎯 ========== ATTENDANCE SUBMISSION START ==========`);
    console.log(`📋 Session ID: ${id}`);

    const user = await getUserFromRequest(req);

    if (!user || user.role !== "instructor") {
      console.log(`❌ Unauthorized: User role is ${user?.role || "none"}`);
      return NextResponse.json(
        {
          success: false,
          error: "غير مصرح لك بتسجيل الحضور. يجب أن تكون مدرساً",
        },
        { status: 403 }
      );
    }

    console.log(`👤 Instructor: ${user.name} (${user.email})`);

    await connectDB();

    const { attendance, customMessages } = await req.json();
    console.log(`📊 Attendance Records: ${attendance?.length || 0}`);
    console.log(
      `💬 Custom Messages: ${
        customMessages ? Object.keys(customMessages).length : 0
      }`
    );

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "معرف الجلسة غير صالح" },
        { status: 400 }
      );
    }

    if (!attendance || !Array.isArray(attendance)) {
      return NextResponse.json(
        {
          success: false,
          error: "بيانات الحضور يجب أن تكون مصفوفة",
          example: [
            { studentId: "...", status: "present" },
            { studentId: "...", status: "absent", notes: "سائح" },
          ],
        },
        { status: 400 }
      );
    }

    const session = await Session.findOne({
      _id: id,
      isDeleted: false,
    }).populate("groupId", "name code instructors automation");

    if (!session) {
      console.log(`❌ Session not found: ${id}`);
      return NextResponse.json(
        { success: false, error: "الجلسة غير موجودة" },
        { status: 404 }
      );
    }

    console.log(`✅ Session found: ${session.title}`);
    const group = session.groupId;
    console.log(`👥 Group: ${group.name} (${group.code})`);

    // التحقق إذا كان المدرس يدرس هذه المجموعة
    const isInstructorOfGroup = group.instructors.some(
      (instructor) => instructor.toString() === user.id
    );

    if (!isInstructorOfGroup) {
      console.log(`❌ Instructor not authorized for this group`);
      return NextResponse.json(
        { success: false, error: "غير مصرح لك بتسجيل حضور لهذه الجلسة" },
        { status: 403 }
      );
    }

    // ✅ السماح للمدرس بأخذ الحضور في أي وقت
    console.log(
      `🎯 Allowing attendance submission at any time for instructors`
    );

    // ✅ التحقق من الطلاب الذين يحتاجون رسائل
    const studentsNeedingMessages = attendance.filter((record) =>
      ["absent", "late", "excused"].includes(record.status)
    );

    console.log(
      `📱 Students needing guardian notification: ${studentsNeedingMessages.length}`
    );

    // ✅ التحقق من أرقام أولياء الأمور فقط إذا كان الأوتوميشن مفعل
    if (
      group.automation?.whatsappEnabled &&
      group.automation?.notifyGuardianOnAbsence
    ) {
      console.log(`🔔 Guardian notifications are enabled for this group`);

      for (const record of studentsNeedingMessages) {
        const student = await Student.findById(record.studentId);

        if (!student) {
          console.log(`⚠️ Student not found: ${record.studentId}`);
          continue;
        }

        const guardianWhatsApp = student.guardianInfo?.whatsappNumber;
        const studentName =
          student.personalInfo?.fullName || student.enrollmentNumber;

        console.log(
          `   📞 ${studentName}: Guardian WhatsApp = ${
            guardianWhatsApp || "NOT SET"
          }`
        );

        if (!guardianWhatsApp) {
          console.log(`❌ Missing guardian WhatsApp for: ${studentName}`);
          // نستمر حتى لو لم يكن هناك رقم واتساب
        }
      }
    } else {
      console.log(`ℹ️ Guardian notifications are disabled for this group`);
    }

    // Prepare attendance records
    const attendanceRecords = attendance.map((record) => ({
      studentId: record.studentId,
      status: record.status,
      notes: record.notes || "",
      markedAt: new Date(),
      markedBy: user.id,
    }));

    console.log(`💾 Saving/updating attendance to database...`);

    // ✅ السماح بتعديل الحضور حتى بعد حفظه
    const updatedSession = await Session.findByIdAndUpdate(
      id,
      {
        $set: {
          attendance: attendanceRecords,
          attendanceTaken: true,
          "metadata.updatedBy": user.id,
          "metadata.updatedAt": new Date(),
        },
      },
      { new: true }
    )
      .populate(
        "attendance.studentId",
        "personalInfo.fullName enrollmentNumber guardianInfo"
      )
      .populate("attendance.markedBy", "name email");

    console.log(
      `✅ Attendance saved/updated successfully for ${attendanceRecords.length} students`
    );

    // ✅ إرسال الرسائل عبر الأوتوميشن مع الرسائل المخصصة
    console.log(`\n📱 ========== WHATSAPP NOTIFICATIONS ==========`);

    if (
      studentsNeedingMessages.length > 0 &&
      group.automation?.whatsappEnabled &&
      group.automation?.notifyGuardianOnAbsence
    ) {
      console.log(
        `📤 Triggering automation for ${studentsNeedingMessages.length} notifications...`
      );

      try {
        // ✅✅✅ **FIX: معالجة الرسائل المخصصة واستبدال المتغيرات قبل الإرسال** ✅✅✅
        processedCustomMessages = {};

        if (customMessages && Object.keys(customMessages).length > 0) {
          console.log(
            `🔄 Processing custom messages with variable replacement...`
          );

          // جلب جميع الطلاب مرة واحدة لتحسين الأداء
          const studentIds = Object.keys(customMessages);
          const students = await Student.find({
            _id: { $in: studentIds },
          })
            .select(
              "personalInfo.fullName guardianInfo communicationPreferences"
            )
            .lean();

          const studentMap = {};
          students.forEach((student) => {
            studentMap[student._id.toString()] = student;
          });

          for (const [studentId, message] of Object.entries(customMessages)) {
            if (message && message.trim() !== "") {
              try {
                const student = studentMap[studentId];

                if (student) {
                  const attendanceRecord = attendance.find(
                    (a) => a.studentId === studentId
                  );
                  const studentStatus = attendanceRecord?.status || "absent";
                  const studentNotes = attendanceRecord?.notes || "";

                  // ✅ استدعاء دالة معالجة الرسالة
                  const processedMessage = processCustomMessageWithVariables(
                    message,
                    student,
                    session,
                    group,
                    studentStatus,
                    studentNotes
                  );

                  processedCustomMessages[studentId] = processedMessage;

                  console.log(
                    `   ✅ Processed message for ${
                      student.personalInfo?.fullName || studentId
                    }:`
                  );
                  console.log(
                    `      Original: ${message
                      .substring(0, 60)
                      .replace(/\n/g, " ")}...`
                  );
                  console.log(
                    `      Processed: ${processedMessage
                      .substring(0, 60)
                      .replace(/\n/g, " ")}...`
                  );
                  console.log(
                    `      Contains variables? ${
                      message.includes("{") ? "YES" : "NO"
                    }`
                  );
                  console.log(
                    `      After processing contains variables? ${
                      processedMessage.includes("{") ? "YES" : "NO"
                    }`
                  );
                } else {
                  console.log(`   ⚠️ Student not found for ID: ${studentId}`);
                  // استخدم الرسالة الأصلية في حالة عدم العثور على الطالب
                  processedCustomMessages[studentId] = message;
                }
              } catch (processError) {
                console.error(
                  `   ❌ Error processing message for student ${studentId}:`,
                  processError.message
                );
                // استخدم الرسالة الأصلية في حالة الخطأ
                processedCustomMessages[studentId] = message;
              }
            }
          }

          console.log(
            `✅ Successfully processed ${
              Object.keys(processedCustomMessages).length
            } custom messages`
          );

          // ✅ سجل عينة من الرسائل المعالجة للتحقق
          const sampleMessages = Object.entries(processedCustomMessages).slice(
            0,
            3
          );
          sampleMessages.forEach(([studentId, msg]) => {
            const student = studentMap[studentId];
            console.log(
              `   📝 Sample processed message for ${
                student?.personalInfo?.fullName || studentId
              }:`
            );
            console.log(
              `      ${msg.substring(0, 100).replace(/\n/g, " ")}...`
            );
          });
        }

        // ✅ إرسال الرسائل المعالجة إلى onAttendanceSubmitted
        automationResult = await onAttendanceSubmitted(
          id,
          processedCustomMessages || {}
        );

        console.log(`✅ Automation completed:`, {
          success: automationResult.success,
          sent: automationResult.successCount,
          failed: automationResult.failCount,
          customMessagesProcessed: Object.keys(processedCustomMessages).length,
          processingDetails: {
            variableReplacement:
              "تم استبدال جميع المتغيرات ({guardianName}, {studentName}, {date}, etc.)",
            conditionalProcessing:
              "تم معالجة المتغيرات الشرطية ({notes ? '...' : ''})",
            sampleProcessed:
              Object.keys(processedCustomMessages).length > 0 ? "نعم" : "لا",
          },
        });
      } catch (automationError) {
        console.error(`❌ Automation error:`, automationError);
        automationResult = {
          success: false,
          error: automationError.message,
          successCount: 0,
          failCount: studentsNeedingMessages.length,
          notificationResults: [],
        };
      }
    } else {
      console.log(
        `ℹ️ No students need guardian notifications or automation is disabled`
      );
    }

    const stats = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter((a) => a.status === "present").length,
      absent: attendanceRecords.filter((a) => a.status === "absent").length,
      late: attendanceRecords.filter((a) => a.status === "late").length,
      excused: attendanceRecords.filter((a) => a.status === "excused").length,
    };

    console.log(`📊 Attendance Stats:`, stats);

    const customMessagesInfo = customMessages
      ? Object.keys(customMessages).length
      : 0;

    console.log(`\n✅ ========== ATTENDANCE SUBMISSION COMPLETE ==========\n`);

    return NextResponse.json({
      success: true,
      message: "تم تسجيل/تحديث الحضور بنجاح",
      data: {
        sessionId: updatedSession._id,
        sessionTitle: updatedSession.title,
        attendance: updatedSession.attendance,
        stats,
      },
      automation: {
        completed: automationResult.success !== false,
        action:
          studentsNeedingMessages.length > 0
            ? "تم إرسال إشعارات لأولياء الأمور عبر الواتساب"
            : "لم تكن هناك حاجة لإرسال إشعارات",
        customMessagesUsed: customMessagesInfo,
        notificationsSent: automationResult.successCount || 0,
        notificationsFailed: automationResult.failCount || 0,
        details: automationResult.notificationResults || [],
        error: automationResult.error || null,
        processingInfo: {
          customMessagesProcessed: Object.keys(processedCustomMessages).length,
          variableReplacement:
            "تم استبدال جميع المتغيرات مثل {guardianName}, {studentName}, {date}, إلخ",
          conditionalProcessing:
            "تم معالجة المتغيرات الشرطية مثل {notes ? '...' : ''}",
        },
      },
    });
  } catch (error) {
    console.error(`\n❌ ========== ATTENDANCE SUBMISSION ERROR ==========`);
    console.error("Error:", error);
    console.error("Stack:", error.stack);

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
        error: error.message || "فشل في تسجيل الحضور",
      },
      { status: 500 }
    );
  }
}

export async function GET(req, { params }) {
  try {
    console.log(`\n📋 ========== GET ATTENDANCE FOR SESSION ==========`);

    const user = await getUserFromRequest(req);

    if (!user || user.role !== "instructor") {
      return NextResponse.json(
        { success: false, error: "غير مصرح لك بالوصول. يجب أن تكون مدرساً" },
        { status: 403 }
      );
    }

    console.log(`👤 Instructor: ${user.name}`);

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "معرف الجلسة غير صالح" },
        { status: 400 }
      );
    }

    // ✅ Fetch session with all required populations
    const session = await Session.findOne({ _id: id, isDeleted: false })
      .populate(
        "attendance.studentId",
        "personalInfo.fullName personalInfo.email enrollmentNumber guardianInfo.name guardianInfo.whatsappNumber"
      )
      .populate("attendance.markedBy", "name email")
      .populate("groupId", "name code instructors automation")
      .populate("courseId", "title")
      .lean();

    if (!session) {
      console.log(`❌ Session not found: ${id}`);
      return NextResponse.json(
        { success: false, error: "الجلسة غير موجودة" },
        { status: 404 }
      );
    }

    console.log(`✅ Session found: ${session.title}`);
    console.log(`📅 Session Date: ${session.scheduledDate}`);
    console.log(`⏰ Session Time: ${session.startTime} - ${session.endTime}`);
    console.log(`📊 Session Status: ${session.status}`);
    console.log(`🎯 Attendance Taken: ${session.attendanceTaken}`);
    console.log(`📚 Course: ${session.courseId?.title || "N/A"}`);

    // التحقق إذا كان المدرس يدرس هذه المجموعة
    const isInstructorOfGroup = session.groupId.instructors.some(
      (instructor) => instructor.toString() === user.id
    );

    if (!isInstructorOfGroup) {
      console.log(`❌ Instructor not authorized for this group`);
      return NextResponse.json(
        { success: false, error: "غير مصرح لك بالوصول إلى حضور هذه الجلسة" },
        { status: 403 }
      );
    }

    // جلب جميع الطلاب في المجموعة
    const students = await Student.find({
      "academicInfo.groupIds": session.groupId._id,
      isDeleted: false,
      "enrollmentInfo.status": "Active",
    })
      .select(
        "personalInfo.fullName personalInfo.email enrollmentNumber guardianInfo"
      )
      .lean();

    console.log(`👥 Total students in group: ${students.length}`);

    // إنشاء map للحضور الحالي
    const attendanceMap = {};
    if (session.attendance && session.attendance.length > 0) {
      session.attendance.forEach((record) => {
        if (record.studentId) {
          attendanceMap[record.studentId._id.toString()] = {
            status: record.status,
            notes: record.notes,
            markedAt: record.markedAt,
            markedBy: record.markedBy,
          };
        }
      });
    }

    // دمج معلومات الطلاب مع الحضور
    const attendanceRecords = students.map((student) => {
      const existingAttendance = attendanceMap[student._id.toString()];

      return {
        studentId: student._id,
        fullName: student.personalInfo?.fullName,
        email: student.personalInfo?.email,
        enrollmentNumber: student.enrollmentNumber,
        guardianInfo: student.guardianInfo,
        attendance: existingAttendance || {
          status: "pending",
          notes: "",
          markedAt: null,
          markedBy: null,
        },
      };
    });

    const stats = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter(
        (s) => s.attendance.status === "present"
      ).length,
      absent: attendanceRecords.filter((s) => s.attendance.status === "absent")
        .length,
      late: attendanceRecords.filter((s) => s.attendance.status === "late")
        .length,
      excused: attendanceRecords.filter(
        (s) => s.attendance.status === "excused"
      ).length,
      pending: attendanceRecords.filter(
        (s) => s.attendance.status === "pending"
      ).length,
    };

    // ✅ دائماً true للمدرسين
    const canTakeAttendance = true;

    console.log(`📊 Attendance Stats:`, stats);
    console.log(
      `🎯 Can take attendance: ${canTakeAttendance} (Always allowed)`
    );

    // ✅ Return session as complete object matching frontend interface
    return NextResponse.json({
      success: true,
      data: {
        session: {
          _id: session._id,
          title: session.title,
          scheduledDate: session.scheduledDate,
          startTime: session.startTime,
          endTime: session.endTime,
          status: session.status,
          attendanceTaken: session.attendanceTaken,
          groupId: {
            _id: session.groupId._id,
            name: session.groupId.name,
            code: session.groupId.code,
            automation: session.groupId.automation,
          },
          courseId: session.courseId
            ? {
                _id: session.courseId._id,
                title: session.courseId.title,
              }
            : undefined,
        },
        attendance: attendanceRecords,
        stats,
        canTakeAttendance: true,
        automation: {
          whatsappEnabled: session.groupId.automation?.whatsappEnabled || false,
          notifyGuardianOnAbsence:
            session.groupId.automation?.notifyGuardianOnAbsence || false,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching attendance:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "فشل في جلب سجل الحضور",
      },
      { status: 500 }
    );
  }
}
