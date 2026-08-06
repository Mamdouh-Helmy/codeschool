// app/api/portfolio/route.js
import { NextResponse } from "next/server";
import Portfolio from "../../models/Portfolio";
import User from "../../models/User";
import { connectDB } from "@/lib/mongodb";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { getUserFromRequest } from "@/lib/auth"; // ✅ next-auth aware helper

/**
 * معالجة الشهادات قبل الحفظ:
 * - أي صورة base64 → ترفعها على Cloudinary وترجع URL
 * - أي صورة URL موجودة → تبقى كما هي
 */
async function processCertificates(certificates = []) {
  const processed = [];
  for (const cert of certificates) {
    let imageUrl = cert.image?.url || "";
    if (imageUrl && imageUrl.startsWith("data:")) {
      imageUrl = await uploadToCloudinary(imageUrl, "portfolio-certificates");
    }
    processed.push({
      ...cert,
      image: {
        url: imageUrl,
        alt: cert.image?.alt || cert.title || "",
      },
    });
  }
  return processed;
}

// GET - الحصول على البورتفليو
export async function GET(req) {
  try {
    await connectDB();

    // ✅ next-auth session cookie بدل Bearer header
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const portfolio = await Portfolio.findOne({ userId: user.id }).populate(
      "userId",
      "name email image role username profile socialLinks",
    );

    if (!portfolio) {
      return NextResponse.json(
        { success: false, message: "Portfolio not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, portfolio });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

// POST - إنشاء بورتفليو جديد
export async function POST(req) {
  try {
    await connectDB();

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();

    const existing = await Portfolio.findOne({ userId: user.id });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Portfolio already exists" },
        { status: 400 },
      );
    }

    const dbUser = await User.findById(user.id);
    const userName = dbUser?.name || "User";

    const certificates = await processCertificates(body.certificates || []);

    const portfolio = await Portfolio.create({
      userId: user.id,
      title: body.title || `${userName}'s Portfolio`,
      description: body.description || "",
      ownerRole: body.ownerRole || "",
      ownerImage: body.ownerImage || "",
      cvUrl: body.cvUrl || "",
      skills: body.skills || [],
      projects: body.projects || [],
      certificates,
      experience: body.experience || [],
      education: body.education || [],
      services: body.services || [],
      stats: body.stats || { yearsOfExperience: 0, codeCommits: 0 },
      socialLinks: body.socialLinks || {},
      contactInfo: body.contactInfo || {},
      settings: body.settings || { theme: "dark", layout: "standard" },
    });

    await portfolio.populate("userId", "name email image role username");

    return NextResponse.json(
      {
        success: true,
        message: "Portfolio created successfully",
        portfolio,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

// PUT - تحديث البورتفليو
export async function PUT(req) {
  try {
    await connectDB();

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();

    delete body._id;
    delete body.userId;
    delete body.createdAt;
    delete body.updatedAt;
    delete body.__v;

    if (Array.isArray(body.certificates)) {
      body.certificates = await processCertificates(body.certificates);
    }

    const portfolio = await Portfolio.findOneAndUpdate(
      { userId: user.id },
      { $set: body },
      { new: true, runValidators: true },
    ).populate("userId", "name email image role username");

    if (!portfolio) {
      return NextResponse.json(
        { success: false, message: "Portfolio not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Portfolio updated successfully",
      portfolio,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

// DELETE - حذف البورتفليو
export async function DELETE(req) {
  try {
    await connectDB();

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const portfolio = await Portfolio.findOneAndDelete({ userId: user.id });

    if (!portfolio) {
      return NextResponse.json(
        { success: false, message: "Portfolio not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Portfolio deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}