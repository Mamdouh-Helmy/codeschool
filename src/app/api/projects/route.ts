import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Project from "../../models/Project";
import mongoose from "mongoose";

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "200");

    let projects = await Project.find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    console.log("✅ Projects from DB:", projects.length);

    return NextResponse.json({
      success: true,
      data: projects,
      pagination: {
        page,
        limit,
        total: projects.length,
        totalPages: Math.ceil(projects.length / limit),
        hasNext: page * limit < projects.length,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching projects:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch projects",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    console.log("📦 Received payload:", body);

    if (!body.title || !body.description) {
      return NextResponse.json(
        { success: false, message: "Title and description are required" },
        { status: 400 }
      );
    }

    const newProject = await Project.create({
      title: body.title,
      description: body.description,
      image: body.image,
      video: body.video,
      portfolioLink: body.portfolioLink,
      technologies: body.technologies || [],
      featured: body.featured || false,
      isActive: body.isActive !== undefined ? body.isActive : true,
      student: body.student || {
        id: new mongoose.Types.ObjectId(),
        name: "Student",
        email: "student@example.com",
        role: "student",
      },
    });

    console.log("🆕 Project created successfully:", newProject._id);

    return NextResponse.json({
      success: true,
      data: newProject,
      message: "Project created successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching projects:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch projects",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
