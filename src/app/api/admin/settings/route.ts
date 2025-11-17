import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SiteSettings from "../../../models/SiteSettings";

export async function GET() {
  try {
    await connectDB();
    
    const settings = await SiteSettings.findOne({});
    
    if (!settings) {
      // إنشاء إعدادات افتراضية إذا لم تكن موجودة
      const defaultSettings = await SiteSettings.create({
        siteName: "Code School",
        siteDescription: "منصة تعليم البرمجة للشباب",
        language: "ar",
        timezone: "Africa/Cairo",
        contactEmail: "info@codeschool.com",
        currency: "EGP",
        taxRate: 14,
      });
      
      return NextResponse.json({
        success: true,
        data: defaultSettings,
      });
    }
    
    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    let settings = await SiteSettings.findOne({});
    
    if (settings) {
      // تحديث الإعدادات الموجودة
      settings = await SiteSettings.findOneAndUpdate(
        {},
        { $set: body },
        { new: true }
      );
    } else {
      // إنشاء إعدادات جديدة
      settings = await SiteSettings.create(body);
    }
    
    return NextResponse.json({
      success: true,
      data: settings,
      message: "Settings saved successfully",
    });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save settings" },
      { status: 500 }
    );
  }
}