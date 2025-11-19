import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Project from "../../../models/Project";
import mongoose from "mongoose";

export const revalidate = 0;

// GET (لو حابب تضيفه)
export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const id = pathname.split("/").pop();

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
    return NextResponse.json({ success: false, message: "Failed to fetch project" }, { status: 500 });
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
    const updated = await Project.findByIdAndUpdate(id, { ...body, updatedAt: new Date() }, { new: true });

    if (!updated) {
      return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Project updated successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json({ success: false, message: "Failed to update project" }, { status: 500 });
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
    const deleted = await Project.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { id },
      message: "Project deleted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json({ success: false, message: "Failed to delete project" }, { status: 500 });
  }
}
