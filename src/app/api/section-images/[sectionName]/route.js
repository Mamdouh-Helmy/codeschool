// app/api/section-images/[sectionName]/route.js

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SectionImage from "../../../models/SectionImage";

export async function GET(req, { params }) {
  try {
    await connectDB();

    // Next.js 15+
    const { sectionName } = await params;

    // التحقق من صحة اسم القسم
    if (!["ticket-section", "event-ticket"].includes(sectionName)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid section name",
        },
        {
          status: 400,
        }
      );
    }

    // البحث عن الصورة النشطة فقط
    const image = await SectionImage.findOne({
      sectionName,
      isActive: true,
    });

    if (!image) {
      return NextResponse.json(
        {
          success: false,
          message: "Image not found for this section",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: image,
        message: "Image fetched successfully",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Fetch section image error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch image",
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}