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

    console.log("🔍 Searching for portfolio with id:", id);

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Portfolio ID is required" },
        { status: 400 }
      );
    }

    // التأكد إن الـ id صالح ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid portfolio ID" },
        { status: 400 }
      );
    }

    // البحث عن البورتفليو المنشور مباشرة بالـ _id
    const portfolio = await Portfolio.findOne({
      _id: id,
      isPublished: true,
    }).populate("userId", "name email image username role profile socialLinks");

    console.log(
      "📁 Published portfolio found:",
      portfolio ? portfolio.title : "No published portfolio found"
    );

    if (!portfolio) {
      const anyPortfolio = await Portfolio.findById(id);
      return NextResponse.json(
        {
          success: false,
          message: anyPortfolio
            ? "Portfolio exists but is not published"
            : "No portfolio found with this ID",
          hasUnpublished: !!anyPortfolio,
        },
        { status: 404 }
      );
    }

    const user = portfolio.userId;

    const portfolioData = {
      _id: portfolio._id,
      title: portfolio.title,
      description: portfolio.description,
      skills: portfolio.skills || [],
      projects: portfolio.projects || [],
      certificates: portfolio.certificates || [],
      socialLinks: portfolio.socialLinks || {},
      contactInfo: portfolio.contactInfo || {},
      isPublished: portfolio.isPublished,
      views: portfolio.views,
      settings: portfolio.settings || { theme: "light", layout: "standard" },
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

    // increment views
    await Portfolio.findByIdAndUpdate(id, {
      $inc: { views: 1 },
    });

    return NextResponse.json({ success: true, portfolio: portfolioData });
  } catch (error) {
    console.error("❌ Get public portfolio error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}