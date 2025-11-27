import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SectionImageHero from "../../../models/SectionImageHero";
import mongoose from "mongoose";

export const revalidate = 0;

// GET - جلب صورة قسم محددة
export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "معرف صورة قسم غير صالح" },
        { status: 400 }
      );
    }

    const image = await SectionImageHero.findById(id);

    if (!image) {
      return NextResponse.json(
        { success: false, message: "صورة القسم غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: image 
    });

  } catch (error) {
    console.error("❌ Error fetching section image:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "فشل في جلب صورة القسم",
        error: error.message
      },
      { status: 500 }
    );
  }
}

// PUT - تحديث صورة قسم
export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "معرف صورة قسم غير صالح" },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    const updatedImage = await SectionImageHero.findByIdAndUpdate(
      id,
      { 
        ...body, 
        updatedAt: new Date() 
      },
      { new: true, runValidators: true }
    );

    if (!updatedImage) {
      return NextResponse.json(
        { success: false, message: "صورة القسم غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedImage,
      message: "تم تحديث صورة القسم بنجاح",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error updating section image:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحديث صورة القسم",
        error: error.message
      },
      { status: 500 }
    );
  }
}

// DELETE - حذف صورة قسم
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "معرف صورة قسم غير صالح" },
        { status: 400 }
      );
    }

    const deletedImage = await SectionImageHero.findByIdAndDelete(id);

    if (!deletedImage) {
      return NextResponse.json(
        { success: false, message: "صورة القسم غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id },
      message: "تم حذف صورة القسم بنجاح",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error deleting section image:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في حذف صورة القسم",
        error: error.message
      },
      { status: 500 }
    );
  }
}