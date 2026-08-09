// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "../../../models/User";
import Portfolio from "../../../models/Portfolio";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";

const ALLOWED_ROLES = ["admin", "marketing", "student", "instructor", "guest"];

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

// ✅ لو أي يوزر (من أي دور) اتترقّى لـ instructor لازم ياخد بالظبط نفس
// الـ default بتاع البورتفوليو (username + QR + بورتفوليو افتراضي)
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

    const user = await User.findById(id).select(
      "_id name email username image gender language authProvider role profile isActive createdAt qrCode qrCodeData notificationHistory"
    );

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const userObj: any = user.toObject();

    // ✅ آخر 5 تنبيهات اتبعتت لليوزر ده (لو موجودة) — من غير ما نجيب الأرشيف كله
    userObj.recentNotifications = (userObj.notificationHistory || []).slice(-5).reverse();
    delete userObj.notificationHistory;

    // ✅ لو انستراكتور، هات ملخص البورتفوليو بتاعته
    if (user.role === "instructor") {
      const portfolio = await Portfolio.findOne({ userId: id }).select(
        "title isPublished views skills projects certificates"
      );
      userObj.portfolioSummary = portfolio
        ? {
            title: portfolio.title,
            isPublished: portfolio.isPublished,
            views: portfolio.views,
            skillsCount: portfolio.skills?.length || 0,
            projectsCount: portfolio.projects?.length || 0,
            certificatesCount: portfolio.certificates?.length || 0,
            portfolioUrl: `/portfolio/${id}`,
          }
        : null;
    }

    return NextResponse.json({ success: true, data: userObj });
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch user", error: error instanceof Error ? error.message : "Unknown error" },
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
    const { name, username, phone, image, gender, language, isActive, role, password } = body;

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
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

    // username
    if (username && username.trim()) {
      const cleanUsername = username.toLowerCase().trim();
      const existing = await User.findOne({ username: cleanUsername, _id: { $ne: id } });
      if (existing) {
        return NextResponse.json(
          { success: false, message: "Username already exists" },
          { status: 400 }
        );
      }
      user.username = cleanUsername;
    }

    // ── تغيير الباسورد (اختياري) ────────────────────────────────────────────
    if (password && password.trim()) {
      if (password.length < 6) {
        return NextResponse.json(
          { success: false, message: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }
      user.password     = await bcrypt.hash(password, 10);
      user.authProvider = "credentials"; // بقى عنده باسورد يدوي من الأدمن
    }

    let portfolioUrl: string | null = null;

    // ── تغيير الرول ─────────────────────────────────────────────────────────
    if (role && role !== user.role) {
      if (!ALLOWED_ROLES.includes(role)) {
        return NextResponse.json({ success: false, message: "Invalid role" }, { status: 400 });
      }

      // ✅ حماية بسيطة: منمنعش آخر أدمن في النظام يترقّى لدور تاني
      if (user.role === "admin") {
        const adminCount = await User.countDocuments({ role: "admin" });
        if (adminCount <= 1) {
          return NextResponse.json(
            { success: false, message: "Cannot change the role of the last remaining admin" },
            { status: 400 }
          );
        }
      }

      user.role = role;

      // ✅ instructor لازم ياخد default البورتفوليو
      if (role === "instructor") {
        portfolioUrl = await ensureInstructorDefaults(user);
      }
    }

    user.markModified("profile");
    await user.save({ validateBeforeSave: false });

    const updatedUser = await User.findById(id).select(
      "_id name email username image gender language authProvider role profile isActive createdAt qrCode"
    );

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
      ...(portfolioUrl && { portfolioUrl }),
    });
  } catch (error) {
    console.error("❌ Error updating user:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update user", error: error instanceof Error ? error.message : "Unknown error" },
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

    const target = await User.findById(id);
    if (!target) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // ✅ حماية: منمنعش حذف آخر أدمن في النظام
    if (target.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, message: "Cannot delete the last remaining admin account" },
          { status: 400 }
        );
      }
    }

    await User.findByIdAndDelete(id);

    // ✅ تنضيف أي بورتفوليو مرتبط بالحساب ده (لو كان انستراكتور)
    await Portfolio.findOneAndDelete({ userId: id }).catch(() => null);

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete user", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}