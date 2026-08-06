// app/api/meeting-links/[id]/full/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import MeetingLink from "../../../../models/MeetingLink";
import Session from "../../../../models/Session";
import Group from "../../../../models/Group";
import mongoose from "mongoose";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid meeting link ID" },
        { status: 400 }
      );
    }

    // 1. Get the meeting link
    const link = await MeetingLink.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!link) {
      return NextResponse.json(
        { success: false, error: "Meeting link not found" },
        { status: 404 }
      );
    }

    // 2. Get all sessions that use this link (even if soft-deleted)
    const linkedSessions = await Session.find({
      meetingLinkId: new mongoose.Types.ObjectId(id),
    })
      .populate("groupId", "name code schedule status")
      .lean();

    // 3. Collect unique group IDs from linked sessions
    const groupIds = [
      ...new Set(
        linkedSessions
          .map((s) => s.groupId?._id?.toString())
          .filter(Boolean)
      ),
    ];

    if (groupIds.length === 0) {
      // No groups using this link
      return NextResponse.json({
        success: true,
        data: {
          link: {
            _id: link._id,
            name: link.name,
            link: link.link,
            platform: link.platform,
            status: link.status,
            capacity: link.capacity,
            durationLimit: link.durationLimit,
            credentials: {
              username: link.credentials?.username,
              hasPassword: !!link.credentials?.password,
            },
            allowedDays: link.allowedDays || [],
            allowedTimeSlots: link.allowedTimeSlots || [],
          },
          stats: {
            totalUses: link.stats?.totalUses || 0,
            totalHours: link.stats?.totalHours || 0,
            averageDuration: link.stats?.averageUsageDuration || 0,
            lastUsed: link.stats?.lastUsed || null,
          },
          currentReservation: null,
          groups: [],
          usageSummary: {
            totalGroups: 0,
            totalSessions: 0,
            uniqueGroups: 0,
            sessionsByStatus: { scheduled: 0, completed: 0, cancelled: 0, postponed: 0 },
          },
          metadata: link.metadata || {},
        },
      });
    }

    // 4. For each group, fetch ALL sessions (including soft-deleted)
    const groupDetails = [];
    const now = new Date();

    for (const groupId of groupIds) {
      const group = await Group.findById(groupId)
        .populate("courseId", "title level")
        .lean();

      if (!group) continue;

      const allGroupSessions = await Session.find({
        groupId: new mongoose.Types.ObjectId(groupId),
      })
        .sort({ scheduledDate: 1, sessionNumber: 1 })
        .lean();

      const sessionsWithLinkFlag = allGroupSessions.map((s) => ({
        sessionId: s._id,
        sessionNumber: s.sessionNumber,
        moduleIndex: s.moduleIndex,
        title: s.title,
        scheduledDate: s.scheduledDate,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        isCancelled: s.status === "cancelled",
        isCompleted: s.status === "completed",
        isPostponed: s.status === "postponed",
        attendanceTaken: s.attendanceTaken,
        meetingLink: s.meetingLink,
        meetingLinkId: s.meetingLinkId,
        hasLink: s.meetingLinkId?.toString() === id,
        isDeleted: s.isDeleted || false,
      }));

      const sortedSessions = sessionsWithLinkFlag.sort(
        (a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)
      );

      const firstSession = sortedSessions[0];
      const lastSession = sortedSessions[sortedSessions.length - 1];
      const groupSchedule = group.schedule || {};

      const currentReservation = link.currentReservation;
      const isCurrentlyReserved =
        currentReservation?.groupId?.toString() === groupId;
      const isReservationExpired = currentReservation?.endTime
        ? new Date(currentReservation.endTime) < now
        : false;

      groupDetails.push({
        groupId: groupId,
        groupName: group.name || "Unknown Group",
        groupCode: group.code || "",
        groupStatus: group.status || "unknown",
        courseTitle: group.courseId?.title || "Unknown Course",
        courseLevel: group.courseId?.level || "",
        schedule: {
          daysOfWeek: groupSchedule.daysOfWeek || [],
          timeFrom: groupSchedule.timeFrom || null,
          timeTo: groupSchedule.timeTo || null,
          startDate: groupSchedule.startDate || null,
          timezone: groupSchedule.timezone || "Africa/Cairo",
        },
        activePeriod: {
          firstSessionDate: firstSession?.scheduledDate || null,
          lastSessionDate: lastSession?.scheduledDate || null,
          totalSessions: sortedSessions.length,
          activeSessions: sortedSessions.filter((s) => s.status === "scheduled").length,
          completedSessions: sortedSessions.filter((s) => s.status === "completed").length,
          cancelledSessions: sortedSessions.filter((s) => s.status === "cancelled").length,
        },
        sessions: sortedSessions,
        reservation: {
          isCurrentlyReserved: isCurrentlyReserved,
          isReservationExpired: isReservationExpired,
          reservedAt: currentReservation?.reservedAt || null,
          reservedBy: currentReservation?.reservedBy || null,
          reservedDays: currentReservation?.daysOfWeek || [],
          reservedTimeFrom: currentReservation?.timeFrom || null,
          reservedTimeTo: currentReservation?.timeTo || null,
        },
        scheduleCompatibility: {
          daysMatch:
            JSON.stringify((groupSchedule.daysOfWeek || []).sort()) ===
            JSON.stringify((currentReservation?.daysOfWeek || []).sort()),
          timeMatch:
            groupSchedule.timeFrom === currentReservation?.timeFrom &&
            groupSchedule.timeTo === currentReservation?.timeTo,
        },
      });
    }

    // 5. Build usage summary
    const allSessionsFlat = groupDetails.flatMap((g) => g.sessions);
    const usageSummary = {
      totalGroups: groupDetails.length,
      totalSessions: allSessionsFlat.length,
      uniqueGroups: groupIds.length,
      sessionsByStatus: {
        scheduled: allSessionsFlat.filter((s) => s.status === "scheduled").length,
        completed: allSessionsFlat.filter((s) => s.status === "completed").length,
        cancelled: allSessionsFlat.filter((s) => s.status === "cancelled").length,
        postponed: allSessionsFlat.filter((s) => s.status === "postponed").length,
      },
    };

    // ✅ FIX: بناء currentReservation فقط إذا كانت البيانات مكتملة
    let currentReservation = null;
    if (link.currentReservation) {
      const hasValidData = link.currentReservation.sessionId ||
        (link.currentReservation.groupId &&
          link.currentReservation.startTime &&
          link.currentReservation.endTime);
      if (hasValidData) {
        currentReservation = {
          sessionId: link.currentReservation.sessionId,
          groupId: link.currentReservation.groupId,
          groupName: groupDetails.find(
            (g) => g.groupId === link.currentReservation.groupId?.toString()
          )?.groupName || null,
          startTime: link.currentReservation.startTime,
          endTime: link.currentReservation.endTime,
          daysOfWeek: link.currentReservation.daysOfWeek || [],
          timeFrom: link.currentReservation.timeFrom,
          timeTo: link.currentReservation.timeTo,
          reservedAt: link.currentReservation.reservedAt,
          reservedBy: link.currentReservation.reservedBy,
          isExpired: link.currentReservation.endTime
            ? new Date(link.currentReservation.endTime) < new Date()
            : false,
        };
      }
    }

    const response = {
      link: {
        _id: link._id,
        name: link.name,
        link: link.link,
        platform: link.platform,
        status: link.status,
        capacity: link.capacity,
        durationLimit: link.durationLimit,
        credentials: {
          username: link.credentials?.username,
          hasPassword: !!link.credentials?.password,
        },
        allowedDays: link.allowedDays || [],
        allowedTimeSlots: link.allowedTimeSlots || [],
      },
      stats: {
        totalUses: link.stats?.totalUses || 0,
        totalHours: link.stats?.totalHours || 0,
        averageDuration: link.stats?.averageUsageDuration || 0,
        lastUsed: link.stats?.lastUsed || null,
      },
      currentReservation: currentReservation, // ✅ استخدم المتغير الجديد
      groups: groupDetails,
      usageSummary,
      metadata: link.metadata || {},
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("❌ Error in GET /api/meeting-links/[id]/full:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}