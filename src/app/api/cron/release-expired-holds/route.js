// app/api/cron/release-expired-holds/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../models/Group";

export async function GET(req) {
  // ✅ حماية بـ CRON_SECRET
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error("❌ CRON_SECRET is not configured");
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    await connectDB();

    console.log(`\n🕐 [CRON] Auto-releasing expired holds...`);

    const result = await Group.autoReleaseExpiredHolds();

    console.log(
      `\n✅ [CRON] Released ${result.count} expired hold(s)`,
    );

    return NextResponse.json({
      success: true,
      releasedCount: result.count,
      released: result.released,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ [CRON] Error auto-releasing holds:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}