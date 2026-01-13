// app/api/instructors/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "../../models/User";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Build query
    const query: any = { role: "instructor" };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    // Get total count
    const totalInstructors = await User.countDocuments(query);

    // Get instructors with pagination
    const instructors = await User.find(query)
      .select("_id name email username image profile isActive createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    console.log("✅ Instructors fetched:", instructors.length);

    return NextResponse.json({
      success: true,
      data: instructors,
      pagination: {
        page,
        limit,
        totalInstructors,
        totalPages: Math.ceil(totalInstructors / limit),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching instructors:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch instructors",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
