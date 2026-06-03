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
      errors.username = "Username can only contain letters, numbers and underscores";
    }
  }

  return errors;
}

async function generateUsernameFromName(name) {
  try {
    const baseUsername = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 15);

    if (!baseUsername || baseUsername.length < 3) {
      return `instructor${Date.now().toString().slice(-6)}`;
    }

    let username = baseUsername;
    let counter  = 1;

    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter}`;
      counter++;
      if (counter > 10) {
        return `instructor${Date.now().toString().slice(-8)}`;
      }
    }

    return username;
  } catch (error) {
    console.error("❌ Error generating username:", error);
    return `instructor${Date.now().toString().slice(-8)}`;
  }
}

async function createDefaultPortfolio(userId, userName) {
  try {
    const defaultPortfolio = await Portfolio.create({
      userId,
      title:       `${userName}'s Teaching Portfolio`,
      description: `Welcome to ${userName}'s teaching portfolio.`,
      skills: [
        { name: "Teaching",          level: 85, category: "Education", icon: "👨‍🏫" },
        { name: "Curriculum Design", level: 80, category: "Education", icon: "📚" },
        { name: "Student Engagement",level: 90, category: "Education", icon: "🎯" },
        { name: "Assessment",        level: 75, category: "Education", icon: "📝" },
      ],
      projects: [
        {
          title:        "Interactive Learning Platform",
          description:  "Developed engaging online courses with interactive content.",
          technologies: ["Education Technology", "E-Learning", "Student Success"],
          status:       "completed",
          featured:     true,
          startDate:    new Date(),
          endDate:      new Date(),
        },
      ],
      socialLinks: {},
      contactInfo: { email: "", phone: "", location: "" },
      isPublished:  true,
      views:        0,
      settings:     { theme: "dark", layout: "standard" },
    });

    return defaultPortfolio;
  } catch (error) {
    console.error("❌ Error creating default portfolio:", error);
    throw error;
  }
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page   = parseInt(searchParams.get("page")  || "1");
    const limit  = parseInt(searchParams.get("limit") || "10");

    const query = { role: "instructor" };
    if (search) {
      query.$or = [
        { name:     { $regex: search, $options: "i" } },
        { email:    { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    const totalInstructors = await User.countDocuments(query);
    const instructors = await User.find(query)
      .select("_id name email username image gender language profile isActive createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

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
    return NextResponse.json(
      { success: false, message: "Failed to fetch instructors", error: error.message },
      { status: 500 }
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, username, phone, image, gender, language } = body;

    // ── Validate ───────────────────────────────────────────────────────────
    const errors = validatePayload({ name, email, password, username });
    if (Object.keys(errors).length) {
      return NextResponse.json(
        { success: false, message: "Validation failed", errors },
        { status: 400 }
      );
    }

    await connectDB();

    // ── Check duplicate email ──────────────────────────────────────────────
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email already registered" },
        { status: 409 }
      );
    }

    // ── Check duplicate username (if provided) ─────────────────────────────
    if (username && username.trim() !== "") {
      const taken = await User.findOne({ username: username.toLowerCase().trim() });
      if (taken) {
        return NextResponse.json(
          { success: false, message: "Username is already taken", errors: { username: "This username is already registered" } },
          { status: 409 }
        );
      }
    }

    // ── Hash password ──────────────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 10);

    // ── Final username ─────────────────────────────────────────────────────
    const finalUsername =
      username && username.trim() !== ""
        ? username.toLowerCase().trim()
        : await generateUsernameFromName(name);

    // ── Create instructor first (need _id for portfolio URL) ───────────────
    const instructorData = {
      name:          name.trim(),
      email:         email.toLowerCase().trim(),
      username:      finalUsername,
      password:      hashedPassword,
      role:          "instructor",
      emailVerified: true,
      isActive:      true,
      language:      language === "en" ? "en" : "ar",
      qrCode:        "",
      qrCodeData:    "",
      profile: {
        bio:      "",
        jobTitle: "Instructor",
        company:  "",
        website:  "",
        location: "",
        phone:    phone && phone.trim() ? phone.trim() : "",
      },
    };

    if (image && image.trim()) {
      instructorData.image = image.trim();
    }
    if (gender && (gender === "male" || gender === "female")) {
      instructorData.gender = gender;
    }

    const newInstructor = new User(instructorData);
    await newInstructor.save();

    // ── Generate QR with _id-based URL ─────────────────────────────────────
    const baseUrl      = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const portfolioUrl = `${baseUrl}/portfolio/${newInstructor._id}`;  // ✅ _id دايماً
    let qrCodeImage    = "";

    try {
      qrCodeImage = await QRCode.toDataURL(portfolioUrl, {
        width:  200,
        margin: 2,
        color:  { dark: "#000000", light: "#FFFFFF" },
      });
    } catch (qrError) {
      console.error("❌ QR generation failed:", qrError);
    }

    // ── Update instructor with QR ──────────────────────────────────────────
    newInstructor.qrCode     = qrCodeImage;
    newInstructor.qrCodeData = portfolioUrl;
    await newInstructor.save();

    // ── Create default portfolio ───────────────────────────────────────────
    try {
      await createDefaultPortfolio(newInstructor._id, newInstructor.name);
    } catch (portfolioError) {
      console.error("⚠️ Could not create default portfolio:", portfolioError);
    }

    // ── Fetch saved data ───────────────────────────────────────────────────
    const savedInstructor = await User.findById(newInstructor._id)
      .select("_id name email username image gender language profile isActive createdAt qrCode")
      .lean();

    // ── Response ───────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        message: "Instructor created successfully with default portfolio",
        data: {
          id:           savedInstructor._id,
          name:         savedInstructor.name,
          email:        savedInstructor.email,
          username:     savedInstructor.username,
          role:         "instructor",
          image:        savedInstructor.image,
          gender:       savedInstructor.gender,
          language:     savedInstructor.language,
          qrCode:       savedInstructor.qrCode,
          portfolioUrl: portfolioUrl,
          profileUrl:   `/portfolio/${savedInstructor._id}`,  // ✅ _id دايماً
          profile:      savedInstructor.profile,
          isActive:     savedInstructor.isActive,
          createdAt:    savedInstructor.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("💥 INSTRUCTOR CREATION ERROR:", error);

    if (error.code === 11000) {
      const field   = Object.keys(error.keyPattern || {})[0] || "unknown";
      const message = field === "username"
        ? "Username is already taken"
        : "Email is already registered";
      return NextResponse.json(
        { success: false, message, errors: { [field]: message } },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}