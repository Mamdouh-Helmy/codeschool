import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Project from "../../../models/Project"; // عدّل الاسم لو مختلف
import mongoose from "mongoose";

// GET - جلب مشروع محدد
export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname; // /api/projects/:id
  const id = pathname.split("/").pop(); // آخر جزء في المسار هو الـ id

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid project ID" }, { status: 400 });
  }

  try {
    await connectDB();
    const project = await Project.findById(id);

    if (!project) {
      return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch project",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// PUT - تحديث مشروع
export async function PUT(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const id = pathname.split("/").pop();

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid project ID" }, { status: 400 });
  }

  try {
    await connectDB();
    const body = await request.json();
    const updatedProject = await Project.findByIdAndUpdate(id, { ...body, updatedAt: new Date() }, { new: true, runValidators: true });

    if (!updatedProject) {
      return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedProject, message: "Project updated successfully" });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update project",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE - حذف مشروع
export async function DELETE(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const id = pathname.split("/").pop();

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid project ID" }, { status: 400 });
  }

  try {
    await connectDB();
    const deletedProject = await Project.findByIdAndUpdate(id, { isActive: false, updatedAt: new Date() }, { new: true });

    if (!deletedProject) {
      return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete project",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
