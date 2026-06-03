import { NextResponse } from "next/server";
import Portfolio from "../../../models/Portfolio";
import { connectDB } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";

export async function GET(req) {
  try {
    await connectDB();

    const token = await getToken({ req });
    if (!token || token.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page   = parseInt(searchParams.get("page")  || "1");
    const limit  = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const skip   = (page - 1) * limit;

    // ── Query ──────────────────────────────────────────────────────────────
    const query = {};

    if (status) {
      query.isPublished = status === "published";
    }

    // ── Find + count ───────────────────────────────────────────────────────
    let portfoliosQuery = Portfolio.find(query)
      .populate("userId", "name email username role image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const [portfolios, total] = await Promise.all([
      portfoliosQuery,
      Portfolio.countDocuments(query),
    ]);

    // ── Filter by search (بعد populate عشان نقدر نسرش في userId.name) ──────
    const filtered = search
      ? portfolios.filter((p) => {
          const titleMatch = p.title?.toLowerCase().includes(search.toLowerCase());
          const nameMatch  = p.userId?.name?.toLowerCase().includes(search.toLowerCase());
          return titleMatch || nameMatch;
        })
      : portfolios;

    // ── Format (portfolioUrl بالـ _id) ────────────────────────────────────
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const formatted = filtered.map((p) => ({
      _id:         p._id,
      title:       p.title,
      description: p.description,
      isPublished: p.isPublished,
      views:       p.views,
      settings:    p.settings,
      createdAt:   p.createdAt,
      updatedAt:   p.updatedAt,
      portfolioUrl: `${baseUrl}/portfolio/${p._id}`,  // ✅ _id دايماً
      userId: p.userId
        ? {
            _id:      p.userId._id,
            name:     p.userId.name,
            email:    p.userId.email,
            username: p.userId.username,
            role:     p.userId.role,
            image:    p.userId.image,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      portfolios: formatted,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin get portfolios error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}