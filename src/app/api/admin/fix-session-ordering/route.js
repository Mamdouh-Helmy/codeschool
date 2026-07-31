
// src/app/api/admin/fix-session-ordering/route.js
// ⚠️ TEMPORARY ROUTE — NO AUTH — امسح الملف ده بعد الاستخدام مباشرة
//
// GET  -> تقرير فحص فقط (dry-run)، مفيهوش أي تعديل على الداتابيز
// POST -> يطبق التصحيح فعليًا (body: { adminId } مطلوب)

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../models/Group";
import Session from "../../../models/Session";
import { rescheduleGroupSessions } from "../../../../utils/sessionGenerator";

const dayMap = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

function nextOccurrence(daysOfWeek, from = new Date()) {
  const wanted = daysOfWeek.map((d) => dayMap[d]);
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 8; i++) {
    if (wanted.includes(d.getDay())) return d;
    d.setDate(d.getDate() + 1);
  }
  return from;
}

async function analyzeGroups() {
  const groups = await Group.find({
    isDeleted: false,
    status: { $in: ["active"] },
  }).populate("courseId");

  const report = [];
  let brokenCount = 0;
  let flaggedCompletedCount = 0;

  for (const group of groups) {
    const sessions = await Session.find({
      groupId: group._id,
      isDeleted: false,
    }).sort({ moduleIndex: 1, sessionNumber: 1 });

    if (sessions.length === 0) continue;

    let broken = false;
    for (let i = 1; i < sessions.length; i++) {
      if (new Date(sessions[i].scheduledDate) < new Date(sessions[i - 1].scheduledDate)) {
        broken = true;
        break;
      }
    }

    const completed = sessions.filter((s) => s.status === "completed");
    const flaggedCompleted = [];
    for (let i = 1; i < completed.length; i++) {
      if (new Date(completed[i].scheduledDate) < new Date(completed[i - 1].scheduledDate)) {
        flaggedCompleted.push({
          title: completed[i].title,
          date: completed[i].scheduledDate,
          beforeTitle: completed[i - 1].title,
          beforeDate: completed[i - 1].scheduledDate,
        });
      }
    }
    if (flaggedCompleted.length > 0) flaggedCompletedCount += flaggedCompleted.length;

    if (broken) brokenCount++;

    report.push({
      groupId: group._id.toString(),
      groupName: group.name,
      broken,
      totalSessions: sessions.length,
      completedSessions: completed.length,
      flaggedCompleted,
    });
  }

  return {
    totalGroups: groups.length,
    brokenGroups: brokenCount,
    flaggedCompletedCount,
    report,
  };
}

export async function GET() {
  try {
    await connectDB();
    const result = await analyzeGroups();

    return NextResponse.json(
      {
        success: true,
        mode: "dry-run",
        message:
          result.brokenGroups === 0
            ? "كل الجروبات ترتيبها سليم، مفيش حاجة تتصلح"
            : `فيه ${result.brokenGroups} جروب ترتيبهم متلخبط. استخدم POST مع { adminId } عشان تصلحهم`,
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Fix Session Ordering (GET) Error:", error);
    return NextResponse.json(
      { success: false, message: "فشل في فحص الترتيب", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();

    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const { adminId } = body;

    if (!adminId) {
      return NextResponse.json(
        { success: false, message: "لازم تبعت adminId في الـ body" },
        { status: 400 }
      );
    }

    const groups = await Group.find({
      isDeleted: false,
      status: { $in: ["active"] },
    }).populate("courseId");

    let fixedGroups = 0;
    let skipped = 0;
    const details = [];

    for (const group of groups) {
      const sessions = await Session.find({
        groupId: group._id,
        isDeleted: false,
      }).sort({ moduleIndex: 1, sessionNumber: 1 });

      if (sessions.length === 0) continue;

      let broken = false;
      for (let i = 1; i < sessions.length; i++) {
        if (new Date(sessions[i].scheduledDate) < new Date(sessions[i - 1].scheduledDate)) {
          broken = true;
          break;
        }
      }

      if (!broken) {
        skipped++;
      } else {
        const effectiveFrom = nextOccurrence(group.schedule.daysOfWeek, new Date());

        const result = await rescheduleGroupSessions(
          group._id,
          group,
          {
            effectiveFrom,
            daysOfWeek: group.schedule.daysOfWeek,
            timeFrom: group.schedule.timeFrom,
            timeTo: group.schedule.timeTo,
            timezone: group.schedule.timezone,
          },
          adminId,
        );

        fixedGroups++;
        details.push({ groupName: group.name, regenerated: result.regenerated });
      }

      await Session.updateMany(
        { groupId: group._id, isDeleted: false, pendingReschedule: { $exists: true } },
        { $unset: { pendingReschedule: "" } },
      );
    }

    return NextResponse.json(
      {
        success: true,
        mode: "applied",
        message: `اتصلح ${fixedGroups} جروب، ${skipped} كانوا سليمين`,
        fixedGroups,
        skipped,
        details,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Fix Session Ordering (POST) Error:", error);
    return NextResponse.json(
      { success: false, message: "فشل في تطبيق التصحيح", error: error.message },
      { status: 500 }
    );
  }
}
