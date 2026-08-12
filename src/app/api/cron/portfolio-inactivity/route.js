// /src/app/api/cron/portfolio-inactivity/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Portfolio from "../../../models/Portfolio";
import { sendPortfolioMessage, resolveOwnerPhone } from "../../../services/portfolioNotifications";

const INACTIVITY_DAYS = 30;
const REMINDER_TYPE = "portfolio_inactivity_reminder";

function isAuthorizedRequest(req, searchParams) {
  const authHeader = req.headers.get("authorization");
  const querySecret = searchParams.get("secret");
  return (
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    querySecret === process.env.CRON_SECRET
  );
}

// ============================================================
// ✅ GET — استعراض فقط: مين اتبعتله، مين مستني، مين معندوش رقم
// بيستبعد أي بورتفوليو صاحبه اتمسح (orphan) خالص من العرض
// ============================================================
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  if (!isAuthorizedRequest(req, searchParams)) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  await connectDB();

  const cutoff = new Date(Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000);

  const portfolios = await Portfolio.find({})
    .select("userId title contactInfo updatedAt metadata")
    .populate("userId", "name email role profile gender language isActive")
    .lean();

  const details = [];
  let orphanCount = 0;

  for (const portfolio of portfolios) {
    const owner = portfolio.userId;

    // ✅ استبعاد نهائي: لو صاحب البورتفوليو اتمسح، متعرضهوش خالص كصف
    if (!owner) {
      orphanCount++;
      continue;
    }

    let status;
    let reason = null;

    if (!owner.isActive) {
      status = "skipped";
      reason = "inactive_user";
    } else if (portfolio.updatedAt > cutoff) {
      status = "not_due"; // ✅ لسه مش عدى عليه 30 يوم
    } else {
      const phone = owner.profile?.phone || portfolio.contactInfo?.phone || null;
      const lastSent = portfolio.metadata?.lastInactivityReminderSentAt || null;
      const alreadySentRecently = lastSent && new Date(lastSent) > cutoff;

      if (!phone) {
        status = "pending";
      } else if (alreadySentRecently) {
        status = "sent_recently";
      } else {
        status = "pending";
      }
    }

    details.push({
      portfolioId: portfolio._id,
      userId: owner._id,
      name: owner.name,
      email: owner.email,
      role: owner.role,
      title: portfolio.title,
      hasPhoneOnFile: !!(owner.profile?.phone || portfolio.contactInfo?.phone),
      lastUpdatedAt: portfolio.updatedAt,
      lastReminderSentAt: portfolio.metadata?.lastInactivityReminderSentAt || null,
      status, // "sent_recently" | "pending" | "not_due" | "skipped"
      reason,
    });
  }

  const summary = {
    total: details.length,
    sentRecently: details.filter((d) => d.status === "sent_recently").length,
    pending: details.filter((d) => d.status === "pending").length,
    notDue: details.filter((d) => d.status === "not_due").length,
    skipped: details.filter((d) => d.status === "skipped").length,
    noPhone: details.filter((d) => d.status === "pending" && !d.hasPhoneOnFile).length,
    orphanCount, // ✅ عدد اليتامى بس كرقم، من غير ما يظهروا في details
  };

  return NextResponse.json({ success: true, summary, details });
}

// ============================================================
// ✅ POST — التنفيذ الفعلي (ده اللي الـ cron هيضرب عليه)
// ============================================================
export async function POST(req) {
  const { searchParams } = new URL(req.url);
  if (!isAuthorizedRequest(req, searchParams)) {
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
  const results = [];

  for (const portfolio of portfolios) {
    const owner = portfolio.userId;

    if (!owner || !owner.isActive) {
      skipped++;
      results.push({
        portfolioId: portfolio._id,
        title: portfolio.title,
        status: "skipped",
        reason: !owner ? "orphan_portfolio" : "inactive_user",
      });
      continue;
    }

    const portfolioLink = `${process.env.NEXTAUTH_URL}/portfolio/${portfolio._id}`;
    const phone = await resolveOwnerPhone(owner, portfolio);

    const result = await sendPortfolioMessage(
      REMINDER_TYPE,
      owner,
      { portfolioLink },
      phone,
    );

    if (result.success) {
      portfolio.metadata = portfolio.metadata || {};
      portfolio.metadata.lastInactivityReminderSentAt = new Date();
      await portfolio.save();
      sent++;
      results.push({ portfolioId: portfolio._id, name: owner.name, status: "sent" });
    } else if (result.skipped) {
      skipped++;
      results.push({ portfolioId: portfolio._id, name: owner.name, status: "skipped", reason: result.reason });
    } else {
      failed++;
      results.push({ portfolioId: portfolio._id, name: owner.name, status: "failed" });
    }
  }

  return NextResponse.json({
    success: true,
    checked: portfolios.length,
    sent,
    skipped,
    failed,
    results,
  });
}