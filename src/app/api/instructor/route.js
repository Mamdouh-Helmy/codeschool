// app/api/instructor/route.js
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "../../models/User";
import Portfolio from "../../models/Portfolio";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_]+$/;

function validatePayload({ name, email, password, username }) {
  console.log("🔍 Validating payload:", {
    name,
    email,
    password: password ? "***" : "missing",
    username,
  });

  const errors = {};

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    errors.name = "Name is required and must be at least 2 characters";
  }

  if (!email || !emailRegex.test(email)) {
    errors.email = "A valid email is required";
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  if (username && username.trim() !== "") {
    if (username.length < 3 || username.length > 20) {
      errors.username = "Username must be between 3 and 20 characters";
    } else if (!usernameRegex.test(username)) {
      errors.username =
        "Username can only contain letters, numbers and underscores";
    }
  }

  return errors;
}

async function checkUsernameAvailability(username) {
  if (!username) return { available: true };

  try {
    const existingUser = await User.findOne({
      username: username.toLowerCase().trim(),
    });

    return {
      available: !existingUser,
      existingUser: existingUser ? existingUser.email : null,
    };
  } catch (error) {
    console.error("Error checking username availability:", error);
    return { available: false, error: error.message };
  }
}

async function generateUsernameFromName(name) {
  try {
    console.log("🔧 Generating username from name:", name);

    const baseUsername = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 15);

    if (!baseUsername || baseUsername.length < 3) {
      const fallbackUsername = `instructor${Date.now().toString().slice(-6)}`;
      console.log("📛 Name too short, using fallback:", fallbackUsername);
      return fallbackUsername;
    }

    let username = baseUsername;
    let counter = 1;

    console.log("🔎 Checking username availability:", username);

    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter}`;
      counter++;

      if (counter > 10) {
        const uniqueUsername = `instructor${Date.now().toString().slice(-8)}`;
        console.log("🔄 Too many attempts, using unique:", uniqueUsername);
        return uniqueUsername;
      }
    }

    console.log("✅ Username generated:", username);
    return username;
  } catch (error) {
    console.error("❌ Error generating username:", error);
    return `instructor${Date.now().toString().slice(-8)}`;
  }
}

async function createDefaultPortfolio(userId, userName, username) {
  try {
    console.log("🔄 Creating default portfolio for instructor:", username);

    const defaultPortfolio = await Portfolio.create({
      userId,
      title: `${userName}'s Teaching Portfolio`,
      description: `Welcome to ${userName}'s teaching portfolio. Explore my courses, teaching experience, and educational content.`,
      skills: [
        {
          name: "Teaching",
          level: 85,
          category: "Education",
          icon: "👨‍🏫",
        },
        {
          name: "Curriculum Design",
          level: 80,
          category: "Education",
          icon: "📚",
        },
        {
          name: "Student Engagement",
          level: 90,
          category: "Education",
          icon: "🎯",
        },
        {
          name: "Assessment",
          level: 75,
          category: "Education",
          icon: "📝",
        },
      ],
      projects: [
        {
          title: "Interactive Learning Platform",
          description:
            "Developed engaging online courses with interactive content and assessments.",
          technologies: [
            "Education Technology",
            "E-Learning",
            "Student Success",
          ],
          status: "completed",
          featured: true,
          startDate: new Date(),
          endDate: new Date(),
        },
        {
          title: "Student Success Program",
          description:
            "Created comprehensive program to improve student outcomes and engagement.",
          technologies: ["Mentoring", "Academic Support", "Progress Tracking"],
          status: "in-progress",
          featured: false,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      ],
      socialLinks: {
        github: `https://github.com/${username}`,
        linkedin: `https://linkedin.com/in/${username}`,
        twitter: `https://twitter.com/${username}`,
      },
      contactInfo: {
        email: "",
        phone: "",
        location: "Add your location",
      },
      isPublished: true,
      views: 0,
      settings: {
        theme: "dark",
        layout: "standard",
      },
    });

    console.log("✅ Default portfolio created successfully");
    return defaultPortfolio;
  } catch (error) {
    console.error("❌ Error creating default portfolio:", error);
    throw error;
  }
}

// GET - جلب قائمة المدرسين
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const query = { role: "instructor" };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    const totalInstructors = await User.countDocuments(query);

    const instructors = await User.find(query)
      .select("_id name email username image profile isActive createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    console.log("✅ Instructors fetched:", instructors.length);

    return NextResponse.json({
      success: true,
      data: instructors,
      pagination: {
        page,
        limit,
        totalInstructors,
        totalPages: Math.ceil(totalInstructors / limit),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching instructors:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch instructors",
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}

// POST - إضافة مدرس جديد
export async function POST(request) {
  try {
    console.log("🚀 ============ INSTRUCTOR CREATION STARTED ============");

    const body = await request.json();
    const { name, email, password, username, phone, image } = body;

    console.log("📝 Instructor data received:", {
      name: name ? "✓" : "✗",
      email: email ? "✓" : "✗",
      password: password ? "***" : "✗",
      username: username || "auto-generate",
      phone: phone || "not provided",
      image: image || "default",
    });

    // التحقق من البيانات
    const errors = validatePayload({ name, email, password, username });
    if (Object.keys(errors).length) {
      console.error("❌ Validation errors:", errors);
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors,
        },
        { status: 400 },
      );
    }

    console.log("🔌 Connecting to database...");
    await connectDB();
    console.log("✅ Database connected");

    // التحقق من البريد الإلكتروني الموجود
    console.log(
      "🔎 Checking for existing user with email:",
      email.toLowerCase(),
    );
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log("❌ Email already registered");
      return NextResponse.json(
        {
          success: false,
          message: "Email already registered",
        },
        { status: 409 },
      );
    }

    // التحقق من username إذا تم توفيره
    if (username && username.trim() !== "") {
      console.log("🔎 Checking username availability:", username);
      const usernameCheck = await checkUsernameAvailability(username);
      if (!usernameCheck.available) {
        console.log("❌ Username already taken");
        return NextResponse.json(
          {
            success: false,
            message: "Username is already taken",
            errors: { username: "This username is already registered" },
          },
          { status: 409 },
        );
      }
    }

    // تشفير كلمة المرور
    console.log("🔑 Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("✅ Password hashed");

    // توليد username إذا لم يتم توفيره
    let finalUsername =
      username && username.trim() !== ""
        ? username.toLowerCase().trim()
        : await generateUsernameFromName(name);

    console.log("🎯 Final username:", finalUsername);

    let qrCodeImage = "";
    let portfolioUrl = "";

    try {
      // إنشاء رابط البورتفليو
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      portfolioUrl = `${baseUrl}/portfolio/${finalUsername}`;

      console.log("🔗 Portfolio URL:", portfolioUrl);
      console.log("🎨 Generating QR Code...");

      // توليد QR Code
      qrCodeImage = await QRCode.toDataURL(portfolioUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      console.log("✅ QR Code generated successfully");
    } catch (qrError) {
      console.error("❌ QR generation failed:", qrError);
      qrCodeImage = "";
    }

    // إنشاء المدرس
    console.log("👨‍🏫 Creating instructor in database...");
    const newInstructor = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      username: finalUsername,
      password: hashedPassword,
      role: "instructor",
      image: image || "/images/default-avatar.jpg",
      qrCode: qrCodeImage,
      qrCodeData: portfolioUrl,
      emailVerified: true,
      isActive: true,
      profile: {
        phone: phone || "",
        bio: "",
        jobTitle: "Instructor",
        company: "",
        website: "",
        location: "",
      },
    });

    await newInstructor.save();
    console.log("🎉 Instructor created successfully:", newInstructor._id);

    // إنشاء بورتفليو افتراضي تلقائياً
    try {
      console.log("📁 Creating default portfolio...");
      await createDefaultPortfolio(
        newInstructor._id,
        newInstructor.name,
        newInstructor.username,
      );
      console.log("✅ Default portfolio created");
    } catch (portfolioError) {
      console.error("⚠️ Could not create default portfolio:", portfolioError);
    }

    // إعداد رد النجاح
    const instructorResponse = {
      id: newInstructor._id,
      name: newInstructor.name,
      email: newInstructor.email,
      username: newInstructor.username,
      role: newInstructor.role,
      image: newInstructor.image,
      qrCode: newInstructor.qrCode,
      portfolioUrl: portfolioUrl,
      profileUrl: `/portfolio/${newInstructor.username}`,
      profile: newInstructor.profile,
      isActive: newInstructor.isActive,
      createdAt: newInstructor.createdAt,
    };

    console.log("✅ ============ INSTRUCTOR CREATION COMPLETED ============");
    console.log("📋 Instructor created successfully");

    return NextResponse.json(
      {
        success: true,
        message: "Instructor created successfully with default portfolio",
        data: instructorResponse,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("💥 ============ INSTRUCTOR CREATION ERROR ============");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message =
        field === "username"
          ? "Username is already taken"
          : "Email is already registered";

      console.error("❌ Duplicate key error:", { field, message });

      return NextResponse.json(
        {
          success: false,
          message,
          errors: { [field]: message },
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
