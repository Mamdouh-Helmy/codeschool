import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../../models/Student";
import Session from "../../../../models/Session";
import Group from "../../../../models/Group";
import Course from "../../../../models/Course";
import mongoose from "mongoose";

export async function GET(req, { params }) {
  try {
    await connectDB();

    // ✅ حل مشكلة Next.js 14: استخدام await مع params
    const { id } = await params;
    const sessionId = id;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return NextResponse.json(
        { success: false, message: "معرف الجلسة غير صالح" },
        { status: 400 }
      );
    }

    // الحصول على المستخدم من التوكن
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          message: "غير مصرح بالوصول",
          code: "UNAUTHORIZED"
        },
        { status: 401 }
      );
    }

    // التحقق من أن الجلسة موجودة
    const session = await Session.findById(sessionId)
      .populate({
        path: "groupId",
        model: Group,
        select: "name code"
      })
      .populate({
        path: "courseId",
        model: Course,
        select: "title"
      })
      .lean();

    if (!session || session.isDeleted) {
      return NextResponse.json(
        { success: false, message: "الجلسة غير موجودة" },
        { status: 404 }
      );
    }

    // جلب الطالب المرتبط بالمستخدم
    const student = await Student.findOne({ 
      authUserId: user.id,
      "academicInfo.groupIds": session.groupId._id,
      isDeleted: false,
    }).lean();

    if (!student) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالوصول لهذه الجلسة" },
        { status: 403 }
      );
    }

    const studentId = student._id;

    // العثور على حالة الحضور
    let attendanceRecord = null;
    if (session.attendance) {
      attendanceRecord = session.attendance.find(
        (a) => a.studentId.toString() === studentId.toString()
      );
    }

    // التحقق من الجلسات السابقة واللاحقة
    const [previousSession, nextSession] = await Promise.all([
      Session.findOne({
        groupId: session.groupId._id,
        scheduledDate: { $lt: session.scheduledDate },
        isDeleted: false,
      })
        .select("title scheduledDate startTime status")
        .sort({ scheduledDate: -1 })
        .lean(),
      Session.findOne({
        groupId: session.groupId._id,
        scheduledDate: { $gt: session.scheduledDate },
        isDeleted: false,
      })
        .select("title scheduledDate startTime status")
        .sort({ scheduledDate: 1 })
        .lean(),
    ]);

    // جلب سجل الواتساب لهذه الجلسة
    const studentWithMessages = await Student.findById(studentId)
      .select("whatsappMessages")
      .lean();

    const sessionMessages = studentWithMessages?.whatsappMessages?.filter(
      (msg) => msg.metadata?.sessionId?.toString() === sessionId
    ) || [];

    const response = {
      success: true,
      data: {
        id: session._id,
        title: session.title,
        description: session.description || "",
        scheduledDate: session.scheduledDate,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        meetingLink: session.meetingLink || "",
        recordingLink: session.recordingLink || "",
        moduleIndex: session.moduleIndex,
        sessionNumber: session.sessionNumber,
        lessonIndexes: session.lessonIndexes || [],
        attendanceTaken: session.attendanceTaken || false,
        attendanceRecord: attendanceRecord ? {
          status: attendanceRecord.status,
          notes: attendanceRecord.notes || "",
          markedAt: attendanceRecord.markedAt,
        } : null,
        instructorNotes: session.instructorNotes || "",
        group: {
          id: session.groupId?._id || null,
          name: session.groupId?.name || "غير محدد",
          code: session.groupId?.code || "غير محدد",
        },
        course: {
          title: session.courseId?.title || "غير محدد",
        },
        navigation: {
          previous: previousSession ? {
            id: previousSession._id,
            title: previousSession.title,
            date: previousSession.scheduledDate,
            time: previousSession.startTime,
            status: previousSession.status,
          } : null,
          next: nextSession ? {
            id: nextSession._id,
            title: nextSession.title,
            date: nextSession.scheduledDate,
            time: nextSession.startTime,
            status: nextSession.status,
          } : null,
        },
        whatsappMessages: sessionMessages.map(msg => ({
          id: msg._id,
          type: msg.messageType,
          content: msg.messageContent,
          status: msg.status,
          sentAt: msg.sentAt,
          language: msg.language,
        })),
        metadata: session.metadata || {},
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching session details:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب تفاصيل الجلسة",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// دالة للانضمام للجلسة
export async function POST(req, { params }) {
  try {
    await connectDB();

    // ✅ حل مشكلة Next.js 14: استخدام await مع params
    const { id } = await params;
    const sessionId = id;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return NextResponse.json(
        { success: false, message: "معرف الجلسة غير صالح" },
        { status: 400 }
      );
    }

    // الحصول على المستخدم من التوكن
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          message: "غير مصرح بالوصول",
          code: "UNAUTHORIZED"
        },
        { status: 401 }
      );
    }

    const session = await Session.findById(sessionId).lean();

    if (!session || session.isDeleted) {
      return NextResponse.json(
        { success: false, message: "الجلسة غير موجودة" },
        { status: 404 }
      );
    }

    // التحقق من أن الجلسة مجدولة ولها رابط
    if (session.status !== "scheduled") {
      return NextResponse.json(
        { 
          success: false, 
          message: "الجلسة غير متاحة للانضمام حالياً",
          details: `حالة الجلسة: ${session.status}`
        },
        { status: 400 }
      );
    }

    if (!session.meetingLink) {
      return NextResponse.json(
        { 
          success: false, 
          message: "لا يوجد رابط للاجتماع متاح حالياً",
          details: "سيتم إضافة الرابط قريباً"
        },
        { status: 400 }
      );
    }

    // التحقق من الوقت (يمكن الانضمام قبل 15 دقيقة من البدء)
    const sessionDateTime = new Date(session.scheduledDate);
    const [hours, minutes] = session.startTime.split(":").map(Number);
    sessionDateTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const fifteenMinutesBefore = new Date(sessionDateTime.getTime() - 15 * 60000);

    if (now < fifteenMinutesBefore) {
      return NextResponse.json(
        { 
          success: false, 
          message: "لم يحن وقت الانضمام بعد",
          details: `يمكنك الانضمام بعد ${Math.ceil((fifteenMinutesBefore - now) / 60000)} دقيقة`
        },
        { status: 400 }
      );
    }

    // إذا تأخر أكثر من ساعة عن وقت البداية
    const oneHourAfter = new Date(sessionDateTime.getTime() + 60 * 60000);
    if (now > oneHourAfter) {
      return NextResponse.json(
        { 
          success: false, 
          message: "انتهى وقت الانضمام للجلسة",
          details: "لقد فاتك وقت الجلسة"
        },
        { status: 400 }
      );
    }

    // تسجيل محاولة الدخول
    return NextResponse.json({
      success: true,
      data: {
        meetingLink: session.meetingLink,
        message: "يمكنك الانضمام الآن",
        sessionTitle: session.title,
        sessionTime: `${session.startTime} - ${session.endTime}`,
      },
    });

  } catch (error) {
    console.error("Error joining session:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في الانضمام للجلسة",
        error: error.message,
      },
      { status: 500 }
    );
  }
}