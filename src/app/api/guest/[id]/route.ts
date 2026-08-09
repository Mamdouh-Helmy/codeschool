// app/api/guest/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "../../../models/User";
import Portfolio from "../../../models/Portfolio";
import QRCode from "qrcode";

const ALLOWED_ROLES = ["guest", "student", "instructor"];

async function generateUsernameFromName(name: string) {
  try {
    const baseUsername = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 15);

    if (!baseUsername || baseUsername.length < 3) {
      return `user${Date.now().toString().slice(-6)}`;
    }

    let username = baseUsername;
    let counter = 1;

    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter}`;
      counter++;
      if (counter > 10) return `user${Date.now().toString().slice(-8)}`;
    }
    return username;
  } catch (error) {
    console.error("❌ Error generating username:", error);
    return `user${Date.now().toString().slice(-8)}`;
  }
}

// ✅ لو اتترقّى لـ instructor لازم ياخد بالظبط نفس الـ default بتاع البورتفوليو
// (username + QR + بورتفوليو افتراضي) زي اللي بيحصل وقت إنشاء انستراكتور جديد
async function ensureInstructorDefaults(user: any) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (!user.username) {
    user.username = await generateUsernameFromName(user.name);
  }

  const portfolioUrl = `${baseUrl}/portfolio/${user._id}`; // ✅ _id دايماً
  try {
    user.qrCode = await QRCode.toDataURL(portfolioUrl, {
      width: 200,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
    });
    user.qrCodeData = portfolioUrl;
  } catch (qrError) {
    console.error("❌ QR generation failed on promotion:", qrError);
  }

  const existingPortfolio = await Portfolio.findOne({ userId: user._id });
  if (!existingPortfolio) {
    try {
      await Portfolio.create({
        userId: user._id,
        title: `${user.name}'s Teaching Portfolio`,
        description: `Welcome to ${user.name}'s teaching portfolio.`,
        skills: [
          { name: "Teaching", level: 85, category: "Education", icon: "👨‍🏫" },
          { name: "Curriculum Design", level: 80, category: "Education", icon: "📚" },
          { name: "Student Engagement", level: 90, category: "Education", icon: "🎯" },
          { name: "Assessment", level: 75, category: "Education", icon: "📝" },
        ],
        projects: [
          {
            title: "Interactive Learning Platform",
            description: "Developed engaging online courses with interactive content.",
            technologies: ["Education Technology", "E-Learning", "Student Success"],
            status: "completed",
            featured: true,
            startDate: new Date(),
            endDate: new Date(),
          },
        ],
        socialLinks: {},
        contactInfo: { email: "", phone: "", location: "" },
        isPublished: true,
        views: 0,
        settings: { theme: "dark", layout: "standard" },
      });
    } catch (portfolioError) {
      console.error("⚠️ Could not create default portfolio on promotion:", portfolioError);
    }
  }

  return portfolioUrl;
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const guest = await User.findOne({ _id: id, role: "guest" })
      .select("_id name email username image gender language authProvider profile isActive createdAt");

    if (!guest) {
      return NextResponse.json({ success: false, message: "Guest not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: guest });
  } catch (error) {
    console.error("❌ Error fetching guest:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch guest", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const body = await request.json();
    const { name, phone, image, gender, language, isActive, role } = body;

    // ✅ بنجيبه بشرط إنه لسه guest — أي حد اتترقى قبل كده مش هيظهر هنا
    const user = await User.findOne({ _id: id, role: "guest" });
    if (!user) {
      return NextResponse.json({ success: false, message: "Guest not found" }, { status: 404 });
    }

    if (name && name.trim())    user.name     = name.trim();
    if (language !== undefined) user.language = language === "en" ? "en" : "ar";
    if (image !== undefined)    user.image    = image?.trim() || "/images/default-avatar.jpg";
    if (typeof isActive === "boolean") user.isActive = isActive;

    if (phone !== undefined) {
      user.profile       = user.profile || {};
      user.profile.phone = phone?.trim() || "";
    }

    if (gender === "" || gender === null) {
      user.gender = undefined;
    } else if (gender === "male" || gender === "female") {
      user.gender = gender;
    }

    let portfolioUrl: string | null = null;

    // ── ترقية الرول ────────────────────────────────────────────────────────
    if (role && role !== user.role) {
      if (!ALLOWED_ROLES.includes(role)) {
        return NextResponse.json({ success: false, message: "Invalid role" }, { status: 400 });
      }

      user.role = role;

      // ✅ خد بالك هنا بالظبط: instructor لازم ياخد default البورتفوليو
      if (role === "instructor") {
        portfolioUrl = await ensureInstructorDefaults(user);
      }
    }

    user.markModified("profile");
    await user.save({ validateBeforeSave: false });

    const updatedUser = await User.findById(id)
      .select("_id name email username image gender language authProvider profile isActive role qrCode createdAt");

    return NextResponse.json({
      success: true,
      message: "Guest updated successfully",
      data: updatedUser,
      ...(portfolioUrl && { portfolioUrl }),
    });
  } catch (error) {
    console.error("❌ Error updating guest:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update guest", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ─── DELETE ─────────────────────────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const guest = await User.findOneAndDelete({ _id: id, role: "guest" });
    if (!guest) {
      return NextResponse.json({ success: false, message: "Guest not found" }, { status: 404 });
    }

    // ✅ تنضيف أي بورتفوليو يتيم لو كان اتعمل قبل كده وبعدين رجع guest تاني
    await Portfolio.findOneAndDelete({ userId: id }).catch(() => null);

    return NextResponse.json({ success: true, message: "Guest deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting guest:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete guest", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}