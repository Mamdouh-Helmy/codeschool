// app/api/section-images/route.js
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
      .sort({ createdAt: -1 })
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
    const { 
      sectionName, 
      imageUrl, 
      imageAlt, 
      description 
    } = body;

    console.log("🔍 POST Request Body:", body);

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

    // التحقق من أن القسم صحيح
    if (!["ticket-section", "event-ticket"].includes(sectionName)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid section name",
        },
        { status: 400 }
      );
    }

    // تحضير بيانات الإنشاء
    const createData = {
      sectionName,
      imageUrl,
      imageAlt,
      description: description || "",
      isActive: true,
    };

    console.log("📝 Creating with data:", createData);

    const newImage = await SectionImage.create(createData);

    console.log("✅ Created image:", newImage);

    return NextResponse.json(
      {
        success: true,
        data: newImage,
        message: "Image added successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Create section image error:", error);
    
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return NextResponse.json(
        { success: false, message: "Validation error", errors },
        { status: 400 }
      );
    }

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
      isActive,
    } = body;

    console.log("🔍 PUT Request Body:", body);

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

    // التحقق من أن القسم صحيح
    if (!["ticket-section", "event-ticket"].includes(sectionName)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid section name",
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

    // تحضير بيانات التحديث
    const updateData = {
      sectionName,
      imageUrl,
      imageAlt,
      description: description || "",
      isActive: isActive !== undefined ? isActive : existingImage.isActive,
    };

    console.log("📝 Updating with data:", updateData);

    // تحديث الصورة
    const updatedImage = await SectionImage.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    console.log("✅ Updated image:", updatedImage);

    return NextResponse.json({
      success: true,
      data: updatedImage,
      message: "Image updated successfully",
    });
  } catch (error) {
    console.error("❌ Update section image error:", error);

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

    // منع تحديث الحقول غير المسموحة
    const allowedUpdates = ["imageUrl", "imageAlt", "description", "isActive"];
    const filteredUpdates = {};
    for (const key of allowedUpdates) {
      if (updateFields[key] !== undefined) {
        filteredUpdates[key] = updateFields[key];
      }
    }

    // التحديث الجزئي
    const updatedImage = await SectionImage.findByIdAndUpdate(
      id,
      {
        ...filteredUpdates,
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