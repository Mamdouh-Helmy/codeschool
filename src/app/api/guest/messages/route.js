// /src/app/api/guest/messages/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Portfolio from "../../../models/Portfolio";
import ContactMessage from "../../../models/ContactMessage";
// ⚠️ نفس الافتراض بتاع dashboard/route.js — راجع الملاحظة هناك
import { requireAuth } from "@/utils/authMiddleware";

export async function GET(req) {
  const authCheck = await requireAuth(req);
  if (!authCheck.authorized) return authCheck.response;

  await connectDB();

  const currentUser = authCheck.user;
  const userId = currentUser?.id || currentUser?._id;

  const { searchParams } = new URL(req.url);
  const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10"), 1), 50);
  const search = (searchParams.get("search") || "").trim();
  const service = (searchParams.get("service") || "").trim();

  const portfolio = await Portfolio.findOne({ userId }).select("_id").lean();

  if (!portfolio) {
    return NextResponse.json({
      success: true,
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    });
  }

  const query = { portfolioId: portfolio._id };
  if (service) query.service = service;
  if (search) {
    query.$or = [
      { "senderInfo.firstName": { $regex: search, $options: "i" } },
      { "senderInfo.lastName": { $regex: search, $options: "i" } },
      { "senderInfo.email": { $regex: search, $options: "i" } },
      { message: { $regex: search, $options: "i" } },
    ];
  }

  const total = await ContactMessage.countDocuments(query);
  const messages = await ContactMessage.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return NextResponse.json({
    success: true,
    data: messages,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
}