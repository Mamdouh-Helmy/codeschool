// app/api/marketing/route.js
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
      return `marketing${Date.now().toString().slice(-6)}`;
    }

    let username = baseUsername;
    let counter  = 1;

    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter}`;
      counter++;
      if (counter > 10) {
        return `marketing${Date.now().toString().slice(-8)}`;
      }
    }

    return username;
  } catch (error) {
    console.error("❌ Error generating username:", error);
    return `marketing${Date.now().toString().slice(-8)}`;
  }
}

async function createDefaultPortfolio(userId, userName) {
  try {
    const defaultPortfolio = await Portfolio.create({
      userId,
      title:       `${userName}'s Marketing Portfolio`,
      description: `Welcome to ${userName}'s marketing portfolio.`,
      skills: [
        { name: "Digital Marketing",    level: 90, category: "Marketing", icon: "📱" },
        { name: "Social Media Strategy",level: 85, category: "Marketing", icon: "📲" },
        { name: "Content Creation",     level: 88, category: "Marketing", icon: "✍️" },
        { name: "Brand Management",     level: 82, category: "Marketing", icon: "🎨" },
      ],
      projects: [
        {
          title:        "Brand Awareness Campaign",
          description:  "Developed comprehensive digital marketing campaign that increased brand awareness by 150%.",
          technologies: ["Social Media", "Content Marketing", "Analytics"],
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

    const query = { role: "marketing" };
    if (search) {
      query.$or = [
        { name:     { $regex: search, $options: "i" } },
        { email:    { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    const totalMarketing = await User.countDocuments(query);
    const marketingUsers = await User.find(query)
      .select("_id name email username image profile isActive createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: marketingUsers,
      pagination: {
        page,
        limit,
        totalMarketing,
        totalPages: Math.ceil(totalMarketing / limit),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching marketing users:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch marketing users", error: error.message },
      { status: 500 }
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, username, phone, image } = body;

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

    // ── Create user first (need _id for portfolio URL) ─────────────────────
    const newMarketing = new User({
      name:          name.trim(),
      email:         email.toLowerCase(),
      username:      finalUsername,
      password:      hashedPassword,
      role:          "marketing",
      image:         image || "/images/default-avatar.jpg",
      qrCode:        "",
      qrCodeData:    "",
      emailVerified: true,
      isActive:      true,
      profile: {
        phone:    phone || "",
        bio:      "",
        jobTitle: "Marketing Specialist",
        company:  "",
        website:  "",
        location: "",
      },
    });

    await newMarketing.save();

    // ── Generate QR with _id-based URL ─────────────────────────────────────
    const baseUrl      = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const portfolioUrl = `${baseUrl}/portfolio/${newMarketing._id}`;  // ✅ _id دايماً
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

    // ── Update user with QR ────────────────────────────────────────────────
    newMarketing.qrCode     = qrCodeImage;
    newMarketing.qrCodeData = portfolioUrl;
    await newMarketing.save();

    // ── Create default portfolio ───────────────────────────────────────────
    try {
      await createDefaultPortfolio(newMarketing._id, newMarketing.name);
    } catch (portfolioError) {
      console.error("⚠️ Could not create default portfolio:", portfolioError);
    }

    // ── Response ───────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        message: "Marketing user created successfully with default portfolio",
        data: {
          id:           newMarketing._id,
          name:         newMarketing.name,
          email:        newMarketing.email,
          username:     newMarketing.username,
          role:         newMarketing.role,
          image:        newMarketing.image,
          qrCode:       newMarketing.qrCode,
          portfolioUrl: portfolioUrl,
          profileUrl:   `/portfolio/${newMarketing._id}`,  // ✅ _id دايماً
          profile:      newMarketing.profile,
          isActive:     newMarketing.isActive,
          createdAt:    newMarketing.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("💥 MARKETING USER CREATION ERROR:", error);

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