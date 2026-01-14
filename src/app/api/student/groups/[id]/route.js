import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../../models/Student";
import Group from "../../../../models/Group";
import Session from "../../../../models/Session";
import Course from "../../../../models/Course";
import mongoose from "mongoose";

export async function GET(req, { params }) {
  try {
    await connectDB();

    // ✅ حل مشكلة Next.js 14: استخدام await مع params
    const { id } = await params;
    const groupId = id;

    if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json(
        { success: false, message: "معرف المجموعة غير صالح" },
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

    // جلب الطالب المرتبط بالمستخدم
    const student = await Student.findOne({ 
      authUserId: user.id,
      "academicInfo.groupIds": groupId,
      isDeleted: false,
    }).lean();

    if (!student) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالوصول لهذه المجموعة" },
        { status: 403 }
      );
    }

    const studentId = student._id;

    // ✅ حل مشكلة Course Schema: استيراد Course واستخدامه
    // جلب تفاصيل المجموعة مع populate صحيح
    const group = await Group.findById(groupId)
      .populate({
        path: "courseId",
        model: Course,
        select: "title level description"
      })
      .populate("instructors", "name email")
      .lean();

    if (!group || group.isDeleted) {
      return NextResponse.json(
        { success: false, message: "المجموعة غير موجودة" },
        { status: 404 }
      );
    }

    // جلب جميع جلسات المجموعة
    const sessions = await Session.find({
      groupId: groupId,
      isDeleted: false,
    })
      .sort({ scheduledDate: 1, startTime: 1 })
      .lean();

    // حساب إحصائيات الجلسات
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === "completed").length;
    const upcomingSessions = sessions.filter(s => {
      const sessionDate = new Date(s.scheduledDate);
      const now = new Date();
      return sessionDate >= now && s.status === "scheduled";
    }).length;

    // حساب نسبة الحضور للطالب في هذه المجموعة
    let attendedSessions = 0;
    let totalSessionsWithAttendance = 0;

    sessions.forEach((session) => {
      if (session.attendanceTaken && session.attendance) {
        totalSessionsWithAttendance++;
        const attendanceRecord = session.attendance.find(
          (a) => a.studentId.toString() === studentId.toString()
        );
        if (attendanceRecord?.status === "present") {
          attendedSessions++;
        }
      }
    });

    const attendanceRate = totalSessionsWithAttendance > 0
      ? Math.round((attendedSessions / totalSessionsWithAttendance) * 100)
      : 0;

    // العثور على الجلسة التالية
    const now = new Date();
    const nextSession = sessions.find(s => {
      const sessionDate = new Date(s.scheduledDate);
      return sessionDate >= now && s.status === "scheduled";
    });

    // تنسيق جلسات المجموعة حسب الموديول
    const sessionsByModule = {};
    sessions.forEach((session) => {
      const moduleKey = session.moduleIndex;
      if (!sessionsByModule[moduleKey]) {
        sessionsByModule[moduleKey] = {
          moduleIndex: session.moduleIndex,
          moduleNumber: session.moduleIndex + 1,
          sessions: [],
        };
      }

      let attendanceStatus = "لم يتم التسجيل";
      if (session.attendance) {
        const attendanceRecord = session.attendance.find(
          (a) => a.studentId.toString() === studentId.toString()
        );
        if (attendanceRecord) {
          attendanceStatus = attendanceRecord.status;
        }
      }

      sessionsByModule[moduleKey].sessions.push({
        id: session._id,
        title: session.title,
        description: session.description || "",
        scheduledDate: session.scheduledDate,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        sessionNumber: session.sessionNumber,
        lessonIndexes: session.lessonIndexes || [],
        attendanceTaken: session.attendanceTaken || false,
        attendanceStatus: attendanceStatus,
        meetingLink: session.meetingLink || "",
        recordingLink: session.recordingLink || "",
      });
    });

    // تحويل إلى مصفوفة ومرتبة
    const modulesArray = Object.values(sessionsByModule).sort(
      (a, b) => a.moduleIndex - b.moduleIndex
    );

    // ✅ التأكد من أن course موجود
    const courseData = group.courseId ? {
      id: group.courseId._id,
      title: group.courseId.title || "غير محدد",
      level: group.courseId.level || "غير محدد",
      description: group.courseId.description || "",
    } : {
      id: null,
      title: "غير محدد",
      level: "غير محدد",
      description: "",
    };

    const response = {
      success: true,
      data: {
        id: group._id,
        name: group.name,
        code: group.code,
        status: group.status,
        course: courseData,
        instructors: group.instructors || [],
        schedule: {
          startDate: group.schedule?.startDate,
          daysOfWeek: group.schedule?.daysOfWeek || [],
          timeFrom: group.schedule?.timeFrom,
          timeTo: group.schedule?.timeTo,
          timezone: group.schedule?.timezone || "Africa/Cairo",
        },
        pricing: {
          price: group.pricing?.price || 0,
          paymentType: group.pricing?.paymentType || "full",
          installmentPlan: group.pricing?.installmentPlan || null,
        },
        stats: {
          totalSessions,
          completedSessions,
          upcomingSessions,
          attendanceRate,
          attendedSessions,
          totalSessionsWithAttendance,
          currentStudentsCount: group.currentStudentsCount || 0,
          maxStudents: group.maxStudents || 0,
        },
        nextSession: nextSession ? {
          id: nextSession._id,
          title: nextSession.title,
          scheduledDate: nextSession.scheduledDate,
          startTime: nextSession.startTime,
          endTime: nextSession.endTime,
          status: nextSession.status,
          meetingLink: nextSession.meetingLink || "",
        } : null,
        modules: modulesArray,
        allSessions: sessions.map(s => ({
          id: s._id,
          title: s.title,
          scheduledDate: s.scheduledDate,
          startTime: s.startTime,
          endTime: s.endTime,
          status: s.status,
          moduleIndex: s.moduleIndex,
          sessionNumber: s.sessionNumber,
        })),
        automation: group.automation || {},
        metadata: group.metadata || {},
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Error fetching group details:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب تفاصيل المجموعة",
        error: error.message,
      },
      { status: 500 }
    );
  }
}