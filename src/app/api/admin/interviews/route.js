// /app/api/admin/interviews/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Interview from "../../../models/Interview";
import Student from "../../../models/Student";
import User from "../../../models/User";
import Group from "../../../models/Group";
import Session from "../../../models/Session";
import MeetingLink from "../../../models/MeetingLink";
import { requireAdmin } from "@/utils/authMiddleware";
import { sendInterviewWelcome } from "../../../services/interviewAutomation";

// ─── GET /api/admin/interviews ────────────────────────────────────────────────
export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));
    const status = searchParams.get("status");
    const q = (searchParams.get("search") || "").trim();

    const filter = { isDeleted: false };
    if (status) filter.status = status;

    const total = await Interview.countDocuments(filter);
    const interviews = await Interview.find(filter)
      .populate("studentId", "personalInfo.fullName personalInfo.whatsappNumber enrollmentNumber studentType")
      .populate("instructorId", "name email profile.phone")
      .sort({ scheduledDate: -1, startTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formatted = interviews.map((i) => ({
      id: i._id,
      title: i.title,
      scheduledDate: i.scheduledDate,
      startTime: i.startTime,
      endTime: i.endTime,
      status: i.status,
      deliveryMode: i.deliveryMode,
      meetingLink: i.meetingLink,
      meetingPlatform: i.meetingPlatform,
      locationDetails: i.locationDetails,
      student: i.studentId
        ? {
            id: i.studentId._id,
            name: i.studentId.personalInfo?.fullName,
            enrollmentNumber: i.studentId.enrollmentNumber,
            studentType: i.studentId.studentType,
          }
        : null,
      instructor: i.instructorId
        ? { id: i.instructorId._id, name: i.instructorId.name, email: i.instructorId.email }
        : null,
      evaluation: i.evaluation,
      createdAt: i.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("❌ GET interviews:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── POST /api/admin/interviews ───────────────────────────────────────────────
export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const body = await req.json();
    const {
      studentId,
      instructorId,
      title,
      scheduledDate,
      startTime,
      endTime,
      deliveryMode = "online",
      meetingLinkId = null,
      location,
      locationDetails,
      sendWelcome = true,
    } = body;

    // ─── Validation ─────────────────────────────────────────────────────
    if (!studentId || !instructorId || !title || !scheduledDate || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["online", "offline"].includes(deliveryMode)) {
      return NextResponse.json(
        { success: false, error: "Invalid deliveryMode" },
        { status: 400 }
      );
    }

    if (deliveryMode === "offline") {
      const loc = locationDetails || {};
      const hasLoc = loc.placeName?.trim() || loc.address?.trim() || (loc.lat != null && loc.lng != null);
      if (!hasLoc) {
        return NextResponse.json(
          { success: false, error: "Offline interview requires location" },
          { status: 400 }
        );
      }
    }

    // ─── Check student / instructor exist ───────────────────────────────
    const [student, instructor] = await Promise.all([
      Student.findOne({ _id: studentId, isDeleted: false }).lean(),
      User.findById(instructorId).select("name email profile").lean(),
    ]);

    if (!student) return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    if (!instructor) return NextResponse.json({ success: false, error: "Instructor not found" }, { status: 404 });

    // ─── Schedule representation ────────────────────────────────────────
    const dayName = new Date(scheduledDate).toLocaleDateString("en-US", { weekday: "long" });
    const interviewDate = new Date(scheduledDate);

    // ─── 1. Duplicate title ─────────────────────────────────────────────
    const duplicate = await Interview.findOne({
      title: { $regex: `^${title.trim()}$`, $options: "i" },
      isDeleted: false,
    }).lean();
    if (duplicate) {
      return NextResponse.json(
        { success: false, error: `يوجد مقابلة بنفس الاسم "${title}" بالفعل` },
        { status: 409 }
      );
    }

    // ─── 2. Conflict with other Interviews (student or instructor) ──────
    const sameDayInterviews = await Interview.find({
      isDeleted: false,
      status: { $in: ["scheduled", "postponed"] },
      scheduledDate: {
        $gte: new Date(interviewDate.toDateString()),
        $lt: new Date(new Date(interviewDate).setDate(interviewDate.getDate() + 1)),
      },
      $or: [{ studentId }, { instructorId }],
    }).lean();

    const timeOverlap = (aStart, aEnd, bStart, bEnd) => {
      const s1 = aStart.replace(":", "");
      const e1 = aEnd.replace(":", "");
      const s2 = bStart.replace(":", "");
      const e2 = bEnd.replace(":", "");
      return !(e1 <= s2 || s1 >= e2);
    };

    const interviewConflict = sameDayInterviews.find((iv) =>
      timeOverlap(startTime, endTime, iv.startTime, iv.endTime)
    );
    if (interviewConflict) {
      return NextResponse.json(
        {
          success: false,
          error: `يوجد تعارض مع مقابلة أخرى "${interviewConflict.title}" في نفس الوقت`,
          conflictType: "interview",
        },
        { status: 409 }
      );
    }

    // ─── 3. Conflict with student's group sessions ──────────────────────
    const studentGroupIds = (student.academicInfo?.groupIds || []).map((g) => g.toString());
    if (studentGroupIds.length > 0) {
      const studentSessions = await Session.find({
        groupId: { $in: studentGroupIds },
        isDeleted: false,
        status: { $in: ["scheduled", "postponed"] },
        scheduledDate: {
          $gte: new Date(interviewDate.toDateString()),
          $lt: new Date(new Date(interviewDate).setDate(interviewDate.getDate() + 1)),
        },
      }).select("title startTime endTime groupId").lean();

      const sConf = studentSessions.find((s) => timeOverlap(startTime, endTime, s.startTime, s.endTime));
      if (sConf) {
        return NextResponse.json(
          {
            success: false,
            error: `الطالب عنده سيشن "${sConf.title}" في نفس الوقت`,
            conflictType: "student_session",
          },
          { status: 409 }
        );
      }
    }

    // ─── 4. Conflict with instructor's group sessions ───────────────────
    const instructorGroups = await Group.find({
      "instructors.userId": instructorId,
      isDeleted: false,
      status: { $in: ["active", "draft"] },
    })
      .select("_id name")
      .lean();

    if (instructorGroups.length > 0) {
      const iGroupIds = instructorGroups.map((g) => g._id);
      const instructorSessions = await Session.find({
        groupId: { $in: iGroupIds },
        isDeleted: false,
        status: { $in: ["scheduled", "postponed"] },
        scheduledDate: {
          $gte: new Date(interviewDate.toDateString()),
          $lt: new Date(new Date(interviewDate).setDate(interviewDate.getDate() + 1)),
        },
      }).select("title startTime endTime groupId").lean();

      const iConf = instructorSessions.find((s) => timeOverlap(startTime, endTime, s.startTime, s.endTime));
      if (iConf) {
        return NextResponse.json(
          {
            success: false,
            error: `المدرس عنده سيشن "${iConf.title}" في نفس الوقت`,
            conflictType: "instructor_session",
          },
          { status: 409 }
        );
      }
    }

    // ─── 5. Meeting link check (online only) ────────────────────────────
    let finalMeetingLink = "";
    let finalPlatform = null;

    if (deliveryMode === "online") {
      if (!meetingLinkId || !mongoose.Types.ObjectId.isValid(meetingLinkId)) {
        return NextResponse.json(
          { success: false, error: "لازم تختار لينك للانترفيو الأونلاين" },
          { status: 400 }
        );
      }

      const link = await MeetingLink.findOne({ _id: meetingLinkId, isDeleted: false });
      if (!link) {
        return NextResponse.json({ success: false, error: "Link not found" }, { status: 404 });
      }

      // Check conflict using the same logic
      const newSchedule = {
        daysOfWeek: [dayName],
        timeFrom: startTime,
        timeTo: endTime,
      };

      const { findScheduleConflict } = await import("../../../../utils/checkMeetingLinks");
      const conflict = findScheduleConflict(link.toObject(), newSchedule, null);

      if (conflict) {
        return NextResponse.json(
          {
            success: false,
            error: "اللينك ده محجوز لمقابلة أو جروب في نفس الوقت — اختر لينك تاني",
            conflictType: "link",
            conflict,
          },
          { status: 409 }
        );
      }

      finalMeetingLink = link.link;
      finalPlatform = link.platform;
    }

    // ─── Create interview ───────────────────────────────────────────────
    const interview = await Interview.create({
      studentId,
      instructorId,
      title: title.trim(),
      scheduledDate: interviewDate,
      startTime,
      endTime,
      deliveryMode,
      status: "scheduled",
      meetingLinkId: deliveryMode === "online" ? meetingLinkId : null,
      meetingLink: finalMeetingLink,
      meetingPlatform: finalPlatform,
      location: deliveryMode === "offline" ? (location || "").trim() : "",
      locationDetails: deliveryMode === "offline" ? locationDetails : null,
      evaluation: { interviewNumber: 1 },
      metadata: { createdBy: authCheck.user.id },
    });

    // ─── Reserve meeting link ───────────────────────────────────────────
    if (deliveryMode === "online" && meetingLinkId) {
      try {
        const link = await MeetingLink.findById(meetingLinkId);
        if (link) {
          const start = new Date(interviewDate);
          const [sh, sm] = startTime.split(":").map(Number);
          start.setHours(sh, sm, 0, 0);

          const end = new Date(interviewDate);
          const [eh, em] = endTime.split(":").map(Number);
          end.setHours(eh, em, 0, 0);

          await link.reserveForSession(
            interview._id,        // sessionId = interviewId
            interview._id,        // groupId   = interviewId (as unique key)
            start,
            end,
            authCheck.user.id,
            { daysOfWeek: [dayName], timeFrom: startTime, timeTo: endTime }
          );

          // Tag reservation as interview so checks can distinguish if needed
          await MeetingLink.updateOne(
            { _id: link._id, "reservations.groupId": interview._id },
            { $set: { "reservations.$.reservationType": "interview" } }
          );
        }
      } catch (e) {
        console.error("⚠️ Failed to reserve link for interview:", e.message);
      }
    }

    // ─── Send welcome ───────────────────────────────────────────────────
    if (sendWelcome) {
      try {
        await sendInterviewWelcome(interview._id.toString());
      } catch (e) {
        console.error("⚠️ Welcome failed:", e.message);
      }
    }

    return NextResponse.json(
      { success: true, data: interview },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ POST interviews:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}