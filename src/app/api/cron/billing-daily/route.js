//api/cron/billing-daily/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { runDailyBillingCron } from "@/lib/billing";

export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const result = await runDailyBillingCron();

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("❌ /api/cron/billing-daily:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}