// /src/app/api/admin/portfolio-broadcast/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "../../../models/User";
import { sendPortfolioMessage } from "../../../services/portfolioNotifications";
import { requireAdmin } from "@/utils/authMiddleware";

export async function POST(req) {
  const authCheck = await requireAdmin(req);
  if (!authCheck.authorized) return authCheck.response;

  await connectDB();

  const instructors = await User.find({
    role: "instructor",
    isActive: true,
    "profile.phone": { $exists: true, $ne: "" },
  }).select("name profile gender language");

  let sent = 0, failed = 0, skipped = 0;
  const results = [];

  for (const owner of instructors) {
    const updateLink = `${process.env.NEXTAUTH_URL}/portfolio/${owner._id}`;

    const result = await sendPortfolioMessage("portfolio_update_broadcast", owner, {
      updateLink,
    });

    if (result.skipped) skipped++;
    else if (result.success) sent++;
    else failed++;

    results.push({ userId: owner._id, name: owner.name, status: result.success ? "sent" : result.skipped ? "skipped" : "failed" });
  }

  return NextResponse.json({ success: true, total: instructors.length, sent, failed, skipped, results });
}