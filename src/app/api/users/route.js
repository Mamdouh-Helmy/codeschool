// app/api/users/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "../../models/User";
import { requireAdmin } from "@/utils/authMiddleware";

export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const limit = parseInt(searchParams.get("limit") || "100");

    const query = { isActive: true };
    if (role) query.role = role;

    const users = await User.find(query)
      .select("name email role gender language profile")
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: users.map(u => ({ ...u, id: u._id })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}