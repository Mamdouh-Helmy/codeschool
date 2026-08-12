// src/app/api/guest/notifications/mark-read/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Portfolio from "../../../../models/Portfolio";
import ContactMessage from "../../../../models/ContactMessage";
import { requireAuth } from "@/utils/authMiddleware";

export async function PATCH(req) {
  const authCheck = await requireAuth(req);
  if (!authCheck.authorized) return authCheck.response;

  await connectDB();

  const currentUser = authCheck.user;
  const userId = currentUser?.id || currentUser?._id;

  const portfolio = await Portfolio.findOne({ userId }).select("_id").lean();
  if (!portfolio) {
    return NextResponse.json({ success: true, data: { modified: 0 } });
  }

  const result = await ContactMessage.markAllAsRead(portfolio._id);

  return NextResponse.json({
    success: true,
    data: { modified: result.modifiedCount || 0 },
  });
}