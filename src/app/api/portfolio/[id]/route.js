// app/api/portfolio/[id]/route.js
import { NextResponse } from "next/server";
import Portfolio from "../../../models/Portfolio";
import User from "../../../models/User";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";

export async function GET(req, context) {
  try {
    await connectDB();

    const { params } = context;
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Portfolio ID is required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid portfolio ID" },
        { status: 400 }
      );
    }

    const portfolio = await Portfolio.findById(id).populate(
      "userId",
      "name email image username role profile socialLinks"
    );

    if (!portfolio) {
      return NextResponse.json(
        { success: false, message: "Portfolio not found" },
        { status: 404 }
      );
    }

    if (!portfolio.isPublished) {
      return NextResponse.json(
        { success: false, message: "This portfolio is not published yet" },
        { status: 403 }
      );
    }

    const user = portfolio.userId;

    // ✅ الداتا بترجع خام زي ما هي مخزنة في الداتابيز.
    // كل حسابات الـ stats (سنين خبرة، عدد مشاريع مكتملة، عدد مهارات، كومنتس)
    // بتتعمل في lib/fetchPortfolio.ts عشان يكون فيه مصدر واحد بس للمنطق ده.
    const portfolioData = {
      _id: portfolio._id,
      title: portfolio.title,
      description: portfolio.description,
      ownerRole: portfolio.ownerRole || user?.profile?.jobTitle || "",
      ownerImage: portfolio.ownerImage || user?.image || "",
      cvUrl: portfolio.cvUrl || "",
      skills: portfolio.skills || [],
      projects: portfolio.projects || [],
      certificates: portfolio.certificates || [],
      experience: portfolio.experience || [],
      education: portfolio.education || [],
      services: portfolio.services || [],
      stats: portfolio.stats || { yearsOfExperience: 0, codeCommits: 0 },
      socialLinks: portfolio.socialLinks || {},
      contactInfo: portfolio.contactInfo || {},
      isPublished: portfolio.isPublished,
      views: portfolio.views,
      settings: portfolio.settings || { theme: "dark", layout: "standard" },
      userId: {
        _id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        username: user.username,
        role: user.role,
        profile: user.profile || {},
      },
      createdAt: portfolio.createdAt,
      updatedAt: portfolio.updatedAt,
    };

    Portfolio.findByIdAndUpdate(id, { $inc: { views: 1 } }).exec();

    return NextResponse.json({ success: true, portfolio: portfolioData });
  } catch (error) {
    console.error("❌ Get public portfolio error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}