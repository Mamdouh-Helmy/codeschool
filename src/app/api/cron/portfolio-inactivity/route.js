// /src/app/api/cron/portfolio-inactivity/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Portfolio from "../../../models/Portfolio";
import { sendPortfolioMessage } from "../../../services/portfolioNotifications";

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
      { "metadata.lastInactivityReminderSentAt": { $lte: cutoff } }, // كل شهر بس مش أكتر
    ],
  }).populate("userId", "name profile gender language isActive role");

  let sent = 0,
    skipped = 0,
    failed = 0;

  for (const portfolio of portfolios) {
    const owner = portfolio.userId;
    if (!owner || !owner.isActive || owner.role !== "instructor") {
      skipped++;
      continue;
    }

    const portfolioLink = `${process.env.NEXTAUTH_URL}/portfolio/${owner._id}`;

    const result = await sendPortfolioMessage(
      "portfolio_inactivity_reminder",
      owner,
      {
        portfolioLink,
      },
    );

    if (result.success) {
      portfolio.metadata = portfolio.metadata || {};
      portfolio.metadata.lastInactivityReminderSentAt = new Date();
      await portfolio.save();
      sent++;
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
  });
}
