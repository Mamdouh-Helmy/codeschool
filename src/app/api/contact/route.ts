import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Contact from "../../models/Contact";

export const revalidate = 0;

// GET - جلب جميع طلبات الاتصال
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status") || "";

    let filter: any = { isActive: true };
    if (status) {
      filter.status = status;
    }

    const contacts = await Contact.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Contact.countDocuments(filter);

    console.log("✅ Contacts fetched:", contacts.length);

    return NextResponse.json({
      success: true,
      data: contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching contacts:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch contacts",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST - إنشاء طلب اتصال جديد
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    console.log("📦 Received contact payload:", body);

    // التحقق من الحقول المطلوبة
    if (!body.firstName || !body.lastName || !body.email) {
      return NextResponse.json(
        { 
          success: false, 
          message: "First name, last name, and email are required" 
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

    // إنشاء طلب الاتصال
    const newContact = await Contact.create({
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email: body.email.toLowerCase().trim(),
      phone: body.phone?.trim() || "",
      specialist: body.specialist || "",
      date: body.date || null,
      time: body.time || "",
      message: body.message || "",
      appointmentType: body.appointmentType || "consultation",
      status: "pending",
      isActive: true,
    });

    console.log("🆕 Contact created successfully:", newContact._id);

    return NextResponse.json({
      success: true,
      data: newContact,
      message: "Contact request submitted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error creating contact:", error);
    
    // معالجة أخطاء MongoDB المحددة
    if (error instanceof Error && error.message.includes("duplicate key")) {
      return NextResponse.json(
        {
          success: false,
          message: "Contact with this email already exists",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create contact request",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}