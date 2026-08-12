// /src/app/api/cron/portfolio-inactivity/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Portfolio from "../../../models/Portfolio";
import { sendPortfolioMessage, resolveOwnerPhone } from "../../../services/portfolioNotifications";

const INACTIVITY_DAYS = 30;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const authHeader = req.headers.get("authorization");
  const querySecret = searchParams.get("secret");

  const isAuthorized =
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    querySecret === process.env.CRON_SECRET;

  if (!isAuthorized) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  await connectDB();

  const cutoff = new Date(Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000);

  const portfolios = await Portfolio.find({
    updatedAt: { $lte: cutoff },
    $or: [
      { "metadata.lastInactivityReminderSentAt": null },
      { "metadata.lastInactivityReminderSentAt": { $lte: cutoff } },
    ],
  }).populate("userId", "name profile gender language isActive role");

  let sent = 0,
    skipped = 0,
    failed = 0;
  const skipReasons = [];

  for (const portfolio of portfolios) {
    const owner = portfolio.userId;

    if (!owner || !owner.isActive) {
      skipped++;
      skipReasons.push({
        portfolioId: portfolio._id,
        title: portfolio.title,
        hasOwner: !!owner,
        isActive: owner?.isActive,
      });
      continue;
    }

    // ✅ التصحيح: portfolio._id مش owner._id — عشان الـ route بيدوّر بـ Portfolio.findById
    const portfolioLink = `${process.env.NEXTAUTH_URL}/portfolio/${portfolio._id}`;

    const phone = await resolveOwnerPhone(owner, portfolio);

    const result = await sendPortfolioMessage(
      "portfolio_inactivity_reminder",
      owner,
      { portfolioLink },
      phone,
    );

    if (result.success) {
      portfolio.metadata = portfolio.metadata || {};
      portfolio.metadata.lastInactivityReminderSentAt = new Date();
      await portfolio.save();
      sent++;
    } else if (result.skipped) {
      skipped++;
      skipReasons.push({
        portfolioId: portfolio._id,
        title: portfolio.title,
        reason: result.reason,
      });
    } else {
      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    checked: portfolios.length,
    sent,
    skipped,
    failed,
    skipReasons,
  });
}