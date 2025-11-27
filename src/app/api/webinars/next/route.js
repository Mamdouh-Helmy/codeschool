// app/api/webinars/next/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Webinar from "../../../models/Webinar";

export const revalidate = 60;

export async function GET() {
  try {
    await connectDB();
    
    const now = new Date();
    
    // نستخدم startOf اليوم علشان نقارن من بداية اليوم
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // جلب أول ويبنار قادم (من اليوم فصاعداً)
    const nextWebinar = await Webinar.findOne({
      $or: [
        { 
          date: { 
            $gt: today.toISOString().split('T')[0] 
          } 
        },
        { 
          date: today.toISOString().split('T')[0],
          time: { $gte: now.toTimeString().split(' ')[0] } // نتحقق من الوقت إذا كان نفس اليوم
        }
      ],
      isActive: true
    }).sort({ date: 1, time: 1 }); // ترتيب حسب التاريخ ثم الوقت

    if (!nextWebinar) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No upcoming webinars found"
      });
    }

    // نضيف formattedDate إذا مش موجود في المودل
    const webinarWithFormattedDate = {
      ...nextWebinar.toObject(),
      formattedDate: nextWebinar.formattedDate || formatDate(nextWebinar.date),
      formattedTime: nextWebinar.formattedTime || formatTime(nextWebinar.time)
    };

    return NextResponse.json({
      success: true,
      data: webinarWithFormattedDate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("GET /api/webinars/next error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch next webinar" 
      },
      { status: 500 }
    );
  }
}

// دالة مساعدة لتنسيق التاريخ
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// دالة مساعدة لتنسيق الوقت
function formatTime(timeString) {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}