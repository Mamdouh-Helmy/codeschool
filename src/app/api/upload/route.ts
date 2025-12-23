import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    console.log("📤 POST /api/upload - Starting upload...");

    // إنشاء مجلد uploads إذا لم يكن موجوداً
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
      console.log("📁 Created uploads directory");
    }

    // استقبال البيانات
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "لم يتم رفع ملف" },
        { status: 400 }
      );
    }

    console.log(`📄 File received: ${file.name} (${file.size} bytes)`);

    // التحقق من نوع الملف
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      console.log(`❌ File type not allowed: ${file.type}`);
      return NextResponse.json(
        { 
          success: false, 
          message: "نوع الملف غير مدعوم. يرجى استخدام صورة (JPEG, PNG, WebP, GIF)" 
        },
        { status: 400 }
      );
    }

    // التحقق من حجم الملف (5MB كحد أقصى)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      console.log(`❌ File too large: ${file.size} bytes`);
      return NextResponse.json(
        { 
          success: false, 
          message: "حجم الملف كبير جداً. الحد الأقصى 5MB" 
        },
        { status: 400 }
      );
    }

    // توليد اسم فريد للملف
    const fileExt = path.extname(file.name);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = path.join(uploadDir, fileName);

    console.log(`🔄 Saving file as: ${fileName}`);

    // تحويل الملف إلى buffer وحفظه
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // إرجاع رابط الملف
    const fileUrl = `/uploads/${fileName}`;

    console.log(`✅ File uploaded successfully: ${fileUrl}`);

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: fileName,
      originalName: file.name,
      size: file.size,
      message: "تم رفع الصورة بنجاح"
    });

  } catch (error: any) {
    console.error("💥 Upload error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "حدث خطأ أثناء رفع الملف",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}