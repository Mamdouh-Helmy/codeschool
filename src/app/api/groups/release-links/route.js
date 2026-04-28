// app/api/groups/release-links/route.js
// POST → إلغاء حجز لينكات محددة
// Body: { linkIds?: string[] } — لو فاضي → يلغي كل المحجوزين

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import MeetingLink from "../../../models/MeetingLink";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const body = await req.json().catch(() => ({}));
    const { linkIds } = body;

    const query = {
      isDeleted: false,
      status: "reserved",
      "currentReservation.sessionId": { $exists: true },
      "currentReservation.endTime": { $gte: new Date() },
    };

    if (Array.isArray(linkIds) && linkIds.length > 0) {
      const validIds = linkIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length === 0) {
        return NextResponse.json(
          { success: false, error: "No valid link IDs provided" },
          { status: 400 },
        );
      }
      query._id = { $in: validIds };
    }

    const linksToRelease = await MeetingLink.find(query);

    if (linksToRelease.length === 0) {
      return NextResponse.json({
        success: true,
        released: 0,
        message: "No reserved links found to release",
      });
    }

    const results = [];
    for (const link of linksToRelease) {
      try {
        await link.releaseLink();
        results.push({ id: link._id, name: link.name, success: true });
      } catch (e) {
        results.push({ id: link._id, name: link.name, success: false, error: e.message });
      }
    }

    const releasedCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      released: releasedCount,
      failed: results.filter((r) => !r.success).length,
      results,
      message: `Released ${releasedCount} link(s) successfully`,
    });
  } catch (error) {
    console.error("❌ Error releasing links:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}