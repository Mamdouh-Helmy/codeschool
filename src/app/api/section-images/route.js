import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SectionImage from "../../models/SectionImage";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const sectionName = searchParams.get("sectionName");
    const activeOnly = searchParams.get("activeOnly") !== "false";

    let query = {};

    if (activeOnly) {
      query.isActive = true;
    }

    if (sectionName) {
      query.sectionName = sectionName;
    }

    const images = await SectionImage.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: images,
      message: "Images fetched successfully",
    });
  } catch (error) {
    console.error("Fetch section images error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch images" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { sectionName, imageUrl, imageAlt, description, displayOrder } = body;

    // التحقق من الحقول المطلوبة
    if (!sectionName || !imageUrl || !imageAlt) {
      return NextResponse.json(
        {
          success: false,
          message: "Section name, image URL and alt text are required",
        },
        { status: 400 }
      );
    }

    const newImage = await SectionImage.create({
      sectionName,
      imageUrl,
      imageAlt,
      description: description || "",
      displayOrder: displayOrder || 0,
      isActive: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: newImage,
        message: "Image added successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create section image error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to create image" },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      id,
      sectionName,
      imageUrl,
      imageAlt,
      description,
      displayOrder,
      isActive,
    } = body;

    // التحقق من وجود الـ ID
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Image ID is required for update" },
        { status: 400 }
      );
    }

    // التحقق من الحقول المطلوبة
    if (!sectionName || !imageUrl || !imageAlt) {
      return NextResponse.json(
        {
          success: false,
          message: "Section name, image URL and alt text are required",
        },
        { status: 400 }
      );
    }

    // البحث عن الصورة الحالية
    const existingImage = await SectionImage.findById(id);
    if (!existingImage) {
      return NextResponse.json(
        { success: false, message: "Image not found" },
        { status: 404 }
      );
    }

    // تحديث الصورة
    const updatedImage = await SectionImage.findByIdAndUpdate(
      id,
      {
        sectionName,
        imageUrl,
        imageAlt,
        description: description || "",
        displayOrder: displayOrder || 0,
        isActive: isActive !== undefined ? isActive : existingImage.isActive,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      data: updatedImage,
      message: "Image updated successfully",
    });
  } catch (error) {
    console.error("Update section image error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return NextResponse.json(
        { success: false, message: "Validation error", errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update image" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Image ID is required for deletion" },
        { status: 400 }
      );
    }

    // البحث عن الصورة
    const existingImage = await SectionImage.findById(id);
    if (!existingImage) {
      return NextResponse.json(
        { success: false, message: "Image not found" },
        { status: 404 }
      );
    }

    // حذف الصورة
    await SectionImage.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Delete section image error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete image" },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Image ID is required for update" },
        { status: 400 }
      );
    }

    // التحقق من وجود الصورة
    const existingImage = await SectionImage.findById(id);
    if (!existingImage) {
      return NextResponse.json(
        { success: false, message: "Image not found" },
        { status: 404 }
      );
    }

    // التحديث الجزئي
    const updatedImage = await SectionImage.findByIdAndUpdate(
      id,
      {
        ...updateFields,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      data: updatedImage,
      message: "Image updated successfully",
    });
  } catch (error) {
    console.error("Patch section image error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return NextResponse.json(
        { success: false, message: "Validation error", errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update image" },
      { status: 500 }
    );
  }
}
