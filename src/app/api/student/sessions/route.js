import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../models/Student";
import Session from "../../../models/Session";
import Group from "../../../models/Group";
import Course from "../../../models/Course";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type"); // upcoming, past, all
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

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
    const student = await Student.findOne({ authUserId: user.id })
      .select("_id academicInfo.groupIds")
      .lean();

    if (!student) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        pagination: {
          page: 1,
          limit,
          total: 0,
          pages: 0,
        },
      });
    }

    const studentId = student._id;
    const groupIds = student.academicInfo?.groupIds || [];

    if (groupIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        pagination: {
          page: 1,
          limit,
          total: 0,
          pages: 0,
        },
      });
    }

    // بناء الاستعلام
    let query = {
      groupId: { $in: groupIds },
      isDeleted: false,
    };

    if (status && status !== "all") {
      query.status = status;
    }

    const now = new Date();
    if (type === "upcoming") {
      query.scheduledDate = { $gte: now };
      query.status = { $in: ["scheduled", "postponed"] };
    } else if (type === "past") {
      query.scheduledDate = { $lt: now };
      query.status = { $in: ["completed", "cancelled"] };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // حساب العدد الإجمالي
    const total = await Session.countDocuments(query);

    // جلب الجلسات
    const sessions = await Session.find(query)
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
      .sort({ scheduledDate: -1, startTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formattedSessions = sessions.map((session) => {
      // البحث عن حالة الحضور للطالب
      let attendanceStatus = "لم يتم التسجيل";
      if (session.attendance) {
        const attendanceRecord = session.attendance.find(
          (a) => a.studentId.toString() === studentId.toString()
        );
        if (attendanceRecord) {
          attendanceStatus = attendanceRecord.status;
        }
      }

      return {
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
        attendanceStatus: attendanceStatus,
        instructorNotes: session.instructorNotes || "",
        group: {
          id: session.groupId?._id,
          name: session.groupId?.name || "غير محدد",
          code: session.groupId?.code || "غير محدد",
        },
        course: {
          title: session.courseId?.title || "غير محدد",
        },
        metadata: session.metadata || {},
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedSessions,
      count: formattedSessions.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching student sessions:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب جلسات الطالب",
        error: error.message,
      },
      { status: 500 }
    );
  }
}