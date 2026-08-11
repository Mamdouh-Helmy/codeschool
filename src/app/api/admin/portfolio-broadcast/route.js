// /src/app/api/admin/portfolio-broadcast/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Portfolio from "../../../models/Portfolio";
import { sendPortfolioMessage } from "../../../services/portfolioNotifications";
import { requireAdmin } from "@/utils/authMiddleware";

export async function POST(req) {
  const authCheck = await requireAdmin(req);
  if (!authCheck.authorized) return authCheck.response;

  await connectDB();

  const portfolios = await Portfolio.find({})
    .populate("userId", "name profile gender language isActive");

  let sent = 0, failed = 0, skipped = 0;
  const results = [];

  for (const portfolio of portfolios) {
    const owner = portfolio.userId;

    if (!owner || !owner.isActive) {
      skipped++;
      results.push({
        portfolioId: portfolio._id,
        status: "skipped",
        reason: !owner ? "orphan_portfolio" : "inactive_user",
      });
      continue;
    }

    const updateLink = `${process.env.NEXTAUTH_URL}/portfolio/${owner._id}`;

    // ✅ الرقم من الـ User الأول، ولو فاضي ناخد من contactInfo بتاع البورتفوليو
    const phone = owner.profile?.phone || portfolio.contactInfo?.phone;

    const result = await sendPortfolioMessage(
      "portfolio_update_broadcast",
      owner,
      { updateLink },
      phone, // ✅ override
    );

    if (result.skipped) {
      skipped++;
      results.push({ userId: owner._id, name: owner.name, status: "skipped", reason: result.reason });
    } else if (result.success) {
      sent++;
      results.push({ userId: owner._id, name: owner.name, status: "sent" });
    } else {
      failed++;
      results.push({ userId: owner._id, name: owner.name, status: "failed" });
    }
  }

  return NextResponse.json({ success: true, total: portfolios.length, sent, failed, skipped, results });
}