// app/api/groups/[id]/release-links/route.js
// POST → يلغي حجز كل اللينكات المحجوزة في النظام ويرجع عدد اللي اتحررت

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import MeetingLink from "../../../../models/MeetingLink";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

export async function POST(req, { params }) {
  try {
    const { id } = await params;

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid group ID" }, { status: 400 });
    }

    // Find all actively reserved links
    const reservedLinks = await MeetingLink.find({
      isDeleted: false,
      status: "reserved",
      "currentReservation.sessionId": { $exists: true, $ne: null },
      "currentReservation.endTime": { $gte: new Date() },
    });

    if (reservedLinks.length === 0) {
      return NextResponse.json({
        success: true,
        released: 0,
        message: "لا توجد لينكات محجوزة",
      });
    }

    let released = 0;
    let failed = 0;

    for (const link of reservedLinks) {
      try {
        await link.releaseLink();
        released++;
        console.log(`🔓 Released: ${link.name}`);
      } catch (e) {
        failed++;
        console.warn(`⚠️ Could not release ${link.name}:`, e.message);
      }
    }

    return NextResponse.json({
      success: true,
      released,
      failed,
      message: `تم إلغاء حجز ${released} لينك بنجاح${failed > 0 ? ` (فشل ${failed})` : ""}`,
    });

  } catch (error) {
    console.error("❌ release-links error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}