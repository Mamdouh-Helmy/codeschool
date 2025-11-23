import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogSubscriber from "../../../models/BlogSubscriber";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Valid email is required" },
        { status: 400 }
      );
    }

    // التحقق إذا كان الإيميل مشترك مسبقاً
    const existingSubscriber = await BlogSubscriber.findOne({ email });
    if (existingSubscriber) {
      return NextResponse.json(
        { success: false, message: "Email already subscribed" },
        { status: 400 }
      );
    }

    // إنشاء مشترك جديد
    const newSubscriber = await BlogSubscriber.create({
      email,
      subscribedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to newsletter",
      data: newSubscriber,
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to subscribe" },
      { status: 500 }
    );
  }
}

// GET - جلب جميع مشتركي المدونة
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";

    let filter: any = { isActive: true };
    
    if (search) {
      filter.email = { $regex: search, $options: "i" };
    }

    const subscribers = await BlogSubscriber.find(filter)
      .sort({ subscribedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await BlogSubscriber.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: subscribers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching blog subscribers:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch blog subscribers",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE - حذف مشترك في المدونة
export async function DELETE(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Subscriber ID is required" },
        { status: 400 }
      );
    }

    const deletedSubscriber = await BlogSubscriber.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!deletedSubscriber) {
      return NextResponse.json(
        { success: false, message: "Subscriber not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Blog subscriber deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting blog subscriber:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete blog subscriber",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}