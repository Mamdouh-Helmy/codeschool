// /src/app/api/admin/portfolio-broadcast/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Portfolio from "../../../models/Portfolio";
import { sendPortfolioMessage, resolveOwnerPhone } from "../../../services/portfolioNotifications";
import { requireAdmin } from "@/utils/authMiddleware";

const BROADCAST_TYPE = "portfolio_update_broadcast";

// ============================================================
// ✅ GET — قائمة كل أصحاب البورتفوليو + حالة آخر رسالة اتبعتلهم
// ============================================================
export async function GET(req) {
  const authCheck = await requireAdmin(req);
  if (!authCheck.authorized) return authCheck.response;

  await connectDB();

  const portfolios = await Portfolio.find({})
    .select("userId title contactInfo")
    .populate("userId", "name email role profile gender language isActive notificationHistory")
    .lean();

  const recipients = [];

  for (const portfolio of portfolios) {
    const owner = portfolio.userId;
    if (!owner) continue;

    const phone = owner.profile?.phone || portfolio.contactInfo?.phone || null;

    const broadcastHistory = (owner.notificationHistory || []).filter(
      (n) => n.messageType === BROADCAST_TYPE,
    );
    const lastBroadcast = broadcastHistory.sort(
      (a, b) => new Date(b.sentAt) - new Date(a.sentAt),
    )[0];

    recipients.push({
      userId: owner._id,
      portfolioId: portfolio._id,
      name: owner.name,
      email: owner.email,
      role: owner.role,
      isActive: owner.isActive,
      hasPhone: !!phone,
      lastSentAt: lastBroadcast?.sentAt || null,
      lastSentStatus: lastBroadcast?.status || null,
      totalTimesSent: broadcastHistory.filter((n) => n.status === "sent").length,
    });
  }

  return NextResponse.json({ success: true, data: recipients, count: recipients.length });
}

// ============================================================
// ✅ POST — إرسال حسب الاختيار (كل الناس / role معين / أشخاص محددين)
// ============================================================
export async function POST(req) {
  const authCheck = await requireAdmin(req);
  if (!authCheck.authorized) return authCheck.response;

  await connectDB();

  const body = await req.json();
  const {
    target = "all",
    role,
    userIds = [],
    skipAlreadySent = false,
  } = body;

  const portfolios = await Portfolio.find({})
    .populate("userId", "name profile gender language isActive role notificationHistory");

  let targetPortfolios = portfolios.filter((p) => p.userId);

  if (target === "role" && role) {
    targetPortfolios = targetPortfolios.filter((p) => p.userId.role === role);
  } else if (target === "specific") {
    if (!userIds.length) {
      return NextResponse.json(
        { success: false, message: "لازم تختار شخص واحد على الأقل" },
        { status: 400 },
      );
    }
    const idSet = new Set(userIds.map(String));
    targetPortfolios = targetPortfolios.filter((p) => idSet.has(String(p.userId._id)));
  }

  let sent = 0, failed = 0, skipped = 0;
  const results = [];

  for (const portfolio of targetPortfolios) {
    const owner = portfolio.userId;

    if (!owner.isActive) {
      skipped++;
      results.push({ userId: owner._id, name: owner.name, status: "skipped", reason: "inactive_user" });
      continue;
    }

    if (skipAlreadySent) {
      const alreadySent = (owner.notificationHistory || []).some(
        (n) => n.messageType === BROADCAST_TYPE && n.status === "sent",
      );
      if (alreadySent) {
        skipped++;
        results.push({ userId: owner._id, name: owner.name, status: "skipped", reason: "already_sent" });
        continue;
      }
    }

    // ✅ التصحيح: portfolio._id مش owner._id
    const updateLink = `${process.env.NEXTAUTH_URL}/portfolio/${portfolio._id}`;

    const phone = await resolveOwnerPhone(owner, portfolio);

    const result = await sendPortfolioMessage(BROADCAST_TYPE, owner, { updateLink }, phone);

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

  return NextResponse.json({
    success: true,
    total: targetPortfolios.length,
    sent,
    failed,
    skipped,
    results,
  });
}