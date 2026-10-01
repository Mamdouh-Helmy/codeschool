// /app/api/admin/interviews/[id]/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Interview from "../../../../models/Interview";
import MeetingLink from "../../../../models/MeetingLink";
import { requireAdmin } from "@/utils/authMiddleware";

// GET
export async function GET(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;
    await connectDB();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const interview = await Interview.findById(id)
      .populate("studentId")
      .populate("instructorId", "name email profile")
      .lean();

    if (!interview) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: interview });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PUT
export async function PUT(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;
    await connectDB();

    const { id } = await params;
    const body = await req.json();

    const interview = await Interview.findById(id);
    if (!interview) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    // Simple updates (title, times, location, notes, status)
    const allowed = ["title", "startTime", "endTime", "scheduledDate", "location", "locationDetails", "instructorNotes", "status", "evaluation"];
    for (const k of allowed) {
      if (body[k] !== undefined) interview[k] = body[k];
    }
    interview.metadata.lastModifiedBy = authCheck.user.id;
    await interview.save();

    return NextResponse.json({ success: true, data: interview });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE (soft)
export async function DELETE(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;
    await connectDB();

    const { id } = await params;
    const interview = await Interview.findById(id);
    if (!interview) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    // Release meeting link
    if (interview.meetingLinkId) {
      try {
        const link = await MeetingLink.findById(interview.meetingLinkId);
        if (link) await link.releaseReservation(interview._id, null, "interview");
      } catch (e) {
        console.error("⚠️ Link release failed:", e.message);
      }
    }

    interview.isDeleted = true;
    interview.deletedAt = new Date();
    interview.status = "cancelled";
    await interview.save();

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}