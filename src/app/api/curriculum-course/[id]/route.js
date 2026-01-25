import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";

const Curriculum =
  mongoose.models.Curriculum ||
  mongoose.model(
    "Curriculum",
    mongoose.Schema(
      {
        title: String,
        description: String,
        modules: Array,
        level: String,
        grade: String,
        subject: String,
        duration: String,
        createdBy: Object,
      },
      { timestamps: true },
    ),
  );

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = params;

    const curriculum = await Curriculum.findById(id).lean();

    if (!curriculum) {
      return NextResponse.json(
        {
          success: false,
          error: "Curriculum not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: curriculum,
    });
  } catch (error) {
    console.error("Error fetching curriculum:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = params;

    const body = await request.json();
    const { title, description, modules, level, grade, subject, duration } =
      body;

    const curriculum = await Curriculum.findByIdAndUpdate(
      id,
      {
        title,
        description,
        modules,
        level,
        grade,
        subject,
        duration,
      },
      { new: true, runValidators: true },
    ).lean();

    if (!curriculum) {
      return NextResponse.json(
        {
          success: false,
          error: "Curriculum not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: curriculum,
      message: "Curriculum updated successfully",
    });
  } catch (error) {
    console.error("Error updating curriculum:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = params;

    const curriculum = await Curriculum.findByIdAndDelete(id);

    if (!curriculum) {
      return NextResponse.json(
        {
          success: false,
          error: "Curriculum not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Curriculum deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting curriculum:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
