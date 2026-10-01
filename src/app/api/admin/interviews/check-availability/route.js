// /app/api/admin/interviews/check-availability/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Interview from "../../../../models/Interview";
import Student from "../../../../models/Student";
import User from "../../../../models/User";
import Group from "../../../../models/Group";
import Session from "../../../../models/Session";
import MeetingLink from "../../../../models/MeetingLink";
import { requireAdmin } from "@/utils/authMiddleware";
import { findScheduleConflict } from "../../../../../utils/checkMeetingLinks";

function timeOverlap(aStart, aEnd, bStart, bEnd) {
  const s1 = aStart.replace(":", "");
  const e1 = aEnd.replace(":", "");
  const s2 = bStart.replace(":", "");
  const e2 = bEnd.replace(":", "");
  return !(e1 <= s2 || s1 >= e2);
}

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
      deliveryMode,
      excludeInterviewId = null,
    } = body;

    const result = {
      titleConflict: null,
      interviewConflict: null,
      studentSessionConflict: null,
      instructorSessionConflict: null,
      linkConflict: null,
    };

    if (!scheduledDate || !startTime || !endTime) {
      return NextResponse.json({ success: true, data: result });
    }

    const interviewDate = new Date(scheduledDate);
    const dayStart = new Date(interviewDate.toDateString());
    const dayEnd = new Date(new Date(interviewDate).setDate(interviewDate.getDate() + 1));

    // 1. Title
    if (title && title.trim()) {
      const dupQuery = {
        title: { $regex: `^${title.trim()}$`, $options: "i" },
        isDeleted: false,
      };
      if (excludeInterviewId) dupQuery._id = { $ne: excludeInterviewId };
      const dup = await Interview.findOne(dupQuery).lean();
      if (dup) result.titleConflict = { title: dup.title, id: dup._id };
    }

    // 2. Other interviews (student OR instructor)
    if (studentId || instructorId) {
      const or = [];
      if (studentId) or.push({ studentId });
      if (instructorId) or.push({ instructorId });

      const q = {
        isDeleted: false,
        status: { $in: ["scheduled", "postponed"] },
        scheduledDate: { $gte: dayStart, $lt: dayEnd },
        $or: or,
      };
      if (excludeInterviewId) q._id = { $ne: excludeInterviewId };

      const same = await Interview.find(q)
        .select("title startTime endTime scheduledDate")
        .lean();
      const conf = same.find((i) => timeOverlap(startTime, endTime, i.startTime, i.endTime));
      if (conf) result.interviewConflict = conf;
    }

    // 3. Student group sessions
    if (studentId) {
      const student = await Student.findById(studentId).select("academicInfo.groupIds").lean();
      const gIds = (student?.academicInfo?.groupIds || []).map(String);
      if (gIds.length) {
        const sSessions = await Session.find({
          groupId: { $in: gIds },
          isDeleted: false,
          status: { $in: ["scheduled", "postponed"] },
          scheduledDate: { $gte: dayStart, $lt: dayEnd },
        }).select("title startTime endTime").lean();
        const c = sSessions.find((s) => timeOverlap(startTime, endTime, s.startTime, s.endTime));
        if (c) result.studentSessionConflict = c;
      }
    }

    // 4. Instructor group sessions
    if (instructorId) {
      const gs = await Group.find({
        "instructors.userId": instructorId,
        isDeleted: false,
        status: { $in: ["active", "draft"] },
      }).select("_id").lean();
      if (gs.length) {
        const gIds = gs.map((g) => g._id);
        const iSessions = await Session.find({
          groupId: { $in: gIds },
          isDeleted: false,
          status: { $in: ["scheduled", "postponed"] },
          scheduledDate: { $gte: dayStart, $lt: dayEnd },
        }).select("title startTime endTime").lean();
        const c = iSessions.find((s) => timeOverlap(startTime, endTime, s.startTime, s.endTime));
        if (c) result.instructorSessionConflict = c;
      }
    }

    // 5. Link conflicts — returns list of conflicting link ids
    if (deliveryMode === "online") {
      const dayName = interviewDate.toLocaleDateString("en-US", { weekday: "long" });
      const newSchedule = { daysOfWeek: [dayName], timeFrom: startTime, timeTo: endTime };

      const links = await MeetingLink.find({
        isDeleted: false,
        status: { $in: ["available", "reserved", "in_use"] },
      }).select("name link reservations").lean();

      const conflictingIds = [];
      for (const link of links) {
        const c = findScheduleConflict(link, newSchedule, null);
        if (c) conflictingIds.push(link._id.toString());
      }
      result.conflictingLinkIds = conflictingIds;
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("❌ check-availability:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}