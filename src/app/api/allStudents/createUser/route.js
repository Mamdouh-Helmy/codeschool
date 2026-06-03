// app/api/allStudents/createUser/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import User from "../../../models/User";
import Portfolio from "../../../models/Portfolio";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/utils/authMiddleware";

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
      return `user${Date.now().toString().slice(-6)}`;
    }

    let username = baseUsername;
    let counter = 1;

    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter}`;
      counter++;
      if (counter > 10) {
        return `user${Date.now().toString().slice(-8)}`;
      }
    }

    return username;
  } catch (error) {
    console.error("❌ Error generating username:", error);
    return `user${Date.now().toString().slice(-8)}`;
  }
}

async function createDefaultPortfolio(userId, userName) {
  try {
    const defaultPortfolio = await Portfolio.create({
      userId,
      title: `${userName}'s Portfolio`,
      description: `Welcome to ${userName}'s professional portfolio.`,
      skills: [
        { name: "JavaScript", level: 75, category: "Frontend", icon: "🟨" },
        { name: "React",      level: 70, category: "Frontend", icon: "⚛️" },
        { name: "Node.js",    level: 65, category: "Backend",  icon: "🟢" },
        { name: "HTML/CSS",   level: 85, category: "Frontend", icon: "🎨" },
      ],
      projects: [
        {
          title: "Portfolio Website",
          description: "A modern and responsive portfolio website.",
          technologies: ["Next.js", "React", "Tailwind CSS"],
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

    return defaultPortfolio;
  } catch (error) {
    console.error("❌ Error creating default portfolio:", error);
    throw error;
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    const body      = await req.json();
    const { name, email, password, role, username } = body;

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
        { success: false, message: "Email already registered", existingUserId: existingUser._id },
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
    const newUser = new User({
      name:          name.trim(),
      email:         email.toLowerCase(),
      username:      finalUsername,
      password:      hashedPassword,
      role:          role || "student",
      qrCode:        "",
      qrCodeData:    "",
      emailVerified: true,
      metadata: {
        createdBy:        adminUser.id,
        createdAt:        new Date(),
        isAdminCreated:   true,
      },
    });

    await newUser.save();

    // ── Generate QR with _id-based URL ─────────────────────────────────────
    const baseUrl      = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const portfolioUrl = `${baseUrl}/portfolio/${newUser._id}`;  // ✅ _id دايماً
    let qrCodeImage    = "";

    try {
      qrCodeImage = await QRCode.toDataURL(portfolioUrl, {
        width: 200,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
      });
    } catch (qrError) {
      console.error("❌ QR generation failed:", qrError);
    }

    // ── Update user with QR ────────────────────────────────────────────────
    newUser.qrCode     = qrCodeImage;
    newUser.qrCodeData = portfolioUrl;
    await newUser.save();

    // ── Create default portfolio ───────────────────────────────────────────
    try {
      await createDefaultPortfolio(newUser._id, newUser.name);
    } catch (portfolioError) {
      console.error("⚠️ Could not create default portfolio:", portfolioError);
    }

    // ── Response ───────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        message: "User created successfully with default portfolio",
        user: {
          id:           newUser._id,
          name:         newUser.name,
          email:        newUser.email,
          username:     newUser.username,
          role:         newUser.role,
          qrCode:       newUser.qrCode,
          portfolioUrl: portfolioUrl,
          profileUrl:   `/portfolio/${newUser._id}`,  // ✅ _id دايماً
          createdAt:    newUser.createdAt,
          createdBy: {
            id:    adminUser.id,
            email: adminUser.email,
            name:  adminUser.name,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("💥 USER CREATION ERROR:", error);

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

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const users = await User.find({ "metadata.isAdminCreated": true })
      .sort({ "metadata.createdAt": -1 })
      .limit(limit)
      .select("name email username role metadata.createdAt metadata.createdBy")
      .populate("metadata.createdBy", "name email")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Admin-created users retrieved successfully",
      data:  users,
      count: users.length,
    });
  } catch (error) {
    console.error("Error fetching admin-created users:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch admin-created users", error: error.message },
      { status: 500 }
    );
  }
}