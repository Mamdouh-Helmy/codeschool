// /app/api/student/notifications/seen/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../../models/Student";

const MAX_SEEN_IDS = 300;

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالوصول", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.ids)
      ? body.ids.map(String).filter(Boolean).slice(0, MAX_SEEN_IDS)
      : [];
    const all = body.all === true;

    if (ids.length === 0 && !all) {
      return NextResponse.json({ success: true, updated: false });
    }

    await connectDB();

    const update = {};
    if (ids.length > 0) {
      update.$push = {
        "notificationsSeen.ids": { $each: ids, $slice: -MAX_SEEN_IDS },
      };
    }
    if (all) {
      update.$set = { "notificationsSeen.seenAt": new Date() };
    }

    const result = await Student.updateOne({ authUserId: user.id }, update);

    return NextResponse.json({
      success: true,
      updated: result.modifiedCount > 0,
    });
  } catch (error) {
    console.error("❌ [Notifications Seen]", error);
    return NextResponse.json(
      { success: false, message: "فشل في تحديث الإشعارات", error: error.message },
      { status: 500 }
    );
  }
}