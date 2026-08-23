// /app/api/cron/module-overview/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { checkAndSendModuleOverviewNotifications } from "../../../services/groupAutomation";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectDB();
    const result = await checkAndSendModuleOverviewNotifications();

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("❌ Error in module-overview cron:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}