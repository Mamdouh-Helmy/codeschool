import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SectionImageHero from "../../../models/SectionImageHero";

// PUT - تحديث الصورة
export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const updatedImage = await SectionImageHero.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updatedImage) {
      return NextResponse.json(
        {
          success: false,
          message: "لم يتم العثور على الصورة",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedImage,
      message: "تم تحديث الصورة بنجاح",
    });
  } catch (error) {
    console.error("❌ Error updating image:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحديث الصورة",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE - حذف الصورة
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = params;

    const deletedImage = await SectionImageHero.findByIdAndDelete(id);

    if (!deletedImage) {
      return NextResponse.json(
        {
          success: false,
          message: "لم يتم العثور على الصورة",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم حذف الصورة بنجاح",
    });
  } catch (error) {
    console.error("❌ Error deleting image:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في حذف الصورة",
        error: error.message,
      },
      { status: 500 }
    );
  }
}