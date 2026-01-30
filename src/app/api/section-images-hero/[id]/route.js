import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SectionImageHero from "../../../models/SectionImageHero";
import mongoose from "mongoose";

// GET - جلب صورة محددة
export async function GET(request, { params }) {
  try {
    await connectDB();

    // ✅ FIX: Await the params
    const { id } = await params;

    console.log(`📖 GET /api/section-images-hero/${id}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "معرف الصورة غير صالح",
        },
        { status: 400 },
      );
    }

    const image = await SectionImageHero.findById(id);

    if (!image) {
      return NextResponse.json(
        {
          success: false,
          message: "لم يتم العثور على الصورة",
        },
        { status: 404 },
      );
    }

    console.log(`✅ Image fetched: ${id}`);
    return NextResponse.json({
      success: true,
      data: image,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching image:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب الصورة",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

// PUT - تحديث الصورة
export async function PUT(request, { params }) {
  try {
    await connectDB();

    // ✅ FIX: Await the params
    const { id } = await params;

    console.log(`✏️ PUT /api/section-images-hero/${id}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "معرف الصورة غير صالح",
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    console.log("📥 Update data received");

    // التحقق من وجود الصورة
    const existingImage = await SectionImageHero.findById(id);
    if (!existingImage) {
      return NextResponse.json(
        {
          success: false,
          message: "لم يتم العثور على الصورة",
        },
        { status: 404 },
      );
    }

    // منع تغيير اللغة إذا تم توفيرها في البيانات
    if (body.language && body.language !== existingImage.language) {
      return NextResponse.json(
        {
          success: false,
          message: "لا يمكن تغيير اللغة عند التعديل. يمكنك حذف وإنشاء جديد.",
        },
        { status: 400 },
      );
    }

    const updateData = {
      ...body,
      updatedAt: new Date(),
    };

    // تنظيف البيانات (إزالة الحقول الفارغة للسلاسل النصية)
    if (updateData.imageUrl && typeof updateData.imageUrl === "string") {
      updateData.imageUrl = updateData.imageUrl.trim();
    }

    if (
      updateData.secondImageUrl &&
      typeof updateData.secondImageUrl === "string"
    ) {
      updateData.secondImageUrl = updateData.secondImageUrl.trim();
    }

    if (updateData.imageAlt && typeof updateData.imageAlt === "string") {
      updateData.imageAlt = updateData.imageAlt.trim();
    }

    if (
      updateData.secondImageAlt &&
      typeof updateData.secondImageAlt === "string"
    ) {
      updateData.secondImageAlt = updateData.secondImageAlt.trim();
    }

    const updatedImage = await SectionImageHero.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        context: "query",
      },
    );

    if (!updatedImage) {
      return NextResponse.json(
        {
          success: false,
          message: "فشل في تحديث الصورة",
        },
        { status: 500 },
      );
    }

    console.log(`✅ Image updated: ${id}`);
    return NextResponse.json({
      success: true,
      data: updatedImage,
      message: "تم تحديث الصورة بنجاح",
    });
  } catch (error) {
    console.error("❌ Error updating image:", error);

    // معالجة أخطاء التحقق
    if (error.name === "ValidationError") {
      const errors = {};
      for (const field in error.errors) {
        errors[field] = error.errors[field].message;
      }

      return NextResponse.json(
        {
          success: false,
          message: "فشل التحقق من البيانات",
          errors: errors,
        },
        { status: 400 },
      );
    }

    // معالجة أخطاء التكرار
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        {
          success: false,
          message: `القيمة مكررة للحقل: ${field}`,
          field: field,
          value: error.keyValue[field],
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحديث الصورة",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

// DELETE - حذف الصورة
export async function DELETE(request, { params }) {
  try {
    await connectDB();

    // ✅ FIX: Await the params
    const { id } = await params;

    console.log(`🗑️ DELETE /api/section-images-hero/${id}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "معرف الصورة غير صالح",
        },
        { status: 400 },
      );
    }

    const deletedImage = await SectionImageHero.findByIdAndDelete(id);

    if (!deletedImage) {
      return NextResponse.json(
        {
          success: false,
          message: "لم يتم العثور على الصورة",
        },
        { status: 404 },
      );
    }

    console.log(`✅ Image deleted: ${id}`);
    return NextResponse.json({
      success: true,
      message: "تم حذف الصورة بنجاح",
      data: {
        id: deletedImage._id,
        language: deletedImage.language,
        deletedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("❌ Error deleting image:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في حذف الصورة",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

// PATCH - تحديث جزئي للصورة
export async function PATCH(request, { params }) {
  try {
    await connectDB();

    // ✅ FIX: Await the params
    const { id } = await params;

    console.log(`🔄 PATCH /api/section-images-hero/${id}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "معرف الصورة غير صالح",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    // التحقق من وجود الصورة
    const existingImage = await SectionImageHero.findById(id);
    if (!existingImage) {
      return NextResponse.json(
        {
          success: false,
          message: "لم يتم العثور على الصورة",
        },
        { status: 404 },
      );
    }

    // منع تغيير اللغة
    if (body.language && body.language !== existingImage.language) {
      return NextResponse.json(
        {
          success: false,
          message: "لا يمكن تغيير اللغة",
        },
        { status: 400 },
      );
    }

    const updateData = {
      ...body,
      updatedAt: new Date(),
    };

    const updatedImage = await SectionImageHero.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedImage) {
      return NextResponse.json(
        {
          success: false,
          message: "فشل في تحديث الصورة",
        },
        { status: 500 },
      );
    }

    console.log(`✅ Image partially updated: ${id}`);
    return NextResponse.json({
      success: true,
      data: updatedImage,
      message: "تم تحديث الصورة بنجاح",
    });
  } catch (error) {
    console.error("❌ Error patching image:", error);

    if (error.name === "ValidationError") {
      const errors = {};
      for (const field in error.errors) {
        errors[field] = error.errors[field].message;
      }

      return NextResponse.json(
        {
          success: false,
          message: "فشل التحقق من البيانات",
          errors: errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحديث الصورة",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
