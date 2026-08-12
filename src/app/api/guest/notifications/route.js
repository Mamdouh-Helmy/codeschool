// src/app/api/guest/notifications/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Portfolio from "../../../models/Portfolio";
import ContactMessage from "../../../models/ContactMessage";
import { requireAuth } from "@/utils/authMiddleware";

export async function GET(req) {
  const authCheck = await requireAuth(req);
  if (!authCheck.authorized) return authCheck.response;

  await connectDB();

  const currentUser = authCheck.user;
  const userId = currentUser?.id || currentUser?._id;

  const portfolio = await Portfolio.findOne({ userId }).select("_id").lean();

  if (!portfolio) {
    return NextResponse.json({
      success: true,
      data: { unreadCount: 0, recentMessages: [] },
    });
  }

  const [unreadCount, recentRaw] = await Promise.all([
    ContactMessage.getUnreadCount(portfolio._id),
    ContactMessage.find({ portfolioId: portfolio._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  const recentMessages = recentRaw.map((m) => ({
    _id: m._id,
    name: `${m.senderInfo?.firstName || ""} ${m.senderInfo?.lastName || ""}`.trim(),
    email: m.senderInfo?.email || "",
    message: m.message || "",
    service: m.service || "",
    createdAt: m.createdAt,
  }));

  return NextResponse.json({
    success: true,
    data: { unreadCount, recentMessages },
  });
}