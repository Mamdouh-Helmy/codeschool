import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Newsletter from "../../models/Newsletter";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    console.log("📧 Received newsletter subscription:", body);

    // التحقق من وجود الإيميل
    if (!body.email) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Email is required" 
        },
        { status: 400 }
      );
    }

    // التحقق من صحة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Please provide a valid email address" 
        },
        { status: 400 }
      );
    }

    // التحقق إذا كان الإيميل مسجل مسبقاً
    const existingSubscriber = await Newsletter.findOne({ 
      email: body.email.toLowerCase().trim(),
      isActive: true 
    });

    if (existingSubscriber) {
      return NextResponse.json(
        { 
          success: false, 
          message: "This email is already subscribed to our newsletter" 
        },
        { status: 400 }
      );
    }

    // إنشاء اشتراك جديد
    const newSubscription = await Newsletter.create({
      email: body.email.toLowerCase().trim(),
      isActive: true,
      subscribedAt: new Date(),
    });

    console.log("✅ New newsletter subscription:", newSubscription.email);

    return NextResponse.json({
      success: true,
      data: newSubscription,
      message: "Successfully subscribed to newsletter!",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error subscribing to newsletter:", error);
    
    // معالجة أخطاء MongoDB المحددة
    if (error instanceof Error && error.message.includes("duplicate key")) {
      return NextResponse.json(
        {
          success: false,
          message: "This email is already subscribed",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to subscribe to newsletter",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// GET - جلب جميع المشتركين (لأغراض الإدارة)
export async function GET(request: NextRequest) {
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

    const subscribers = await Newsletter.find(filter)
      .sort({ subscribedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Newsletter.countDocuments(filter);

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
    console.error("❌ Error fetching subscribers:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch subscribers",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE - حذف مشترك
export async function DELETE(request: NextRequest) {
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

    const deletedSubscriber = await Newsletter.findByIdAndUpdate(
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
      message: "Subscriber deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting subscriber:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete subscriber",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}