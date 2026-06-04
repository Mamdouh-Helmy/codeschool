import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import User from "../../models/User";
import Portfolio from "../../models/Portfolio";
import Verification from "../../models/Verification";
import { connectDB } from "@/lib/mongodb";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_]+$/;

function validatePayload({ name, email, password, username }) {
  console.log("🔍 Validating payload:", { name, email, password: password ? "***" : "missing", username });
  
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

async function checkUsernameAvailability(username) {
  if (!username) return { available: true };
  try {
    const existingUser = await User.findOne({ username: username.toLowerCase().trim() });
    return {
      available: !existingUser,
      existingUser: existingUser ? existingUser.email : null
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
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15);

    if (!baseUsername || baseUsername.length < 3) {
      const fallbackUsername = `user${Date.now().toString().slice(-6)}`;
      console.log("📛 Name too short, using fallback:", fallbackUsername);
      return fallbackUsername;
    }

    let username = baseUsername;
    let counter = 1;

    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter}`;
      counter++;
      if (counter > 10) {
        const uniqueUsername = `user${Date.now().toString().slice(-8)}`;
        console.log("🔄 Too many attempts, using unique:", uniqueUsername);
        return uniqueUsername;
      }
    }

    console.log("✅ Username generated:", username);
    return username;
  } catch (error) {
    console.error("❌ Error generating username:", error);
    return `user${Date.now().toString().slice(-8)}`;
  }
}

async function createDefaultPortfolio(userId, userName, username) {
  try {
    console.log("🔄 Creating default portfolio for user:", username);
    const defaultPortfolio = await Portfolio.create({
      userId,
      title: `${userName}'s Portfolio`,
      description: `Welcome to ${userName}'s professional portfolio. Explore my skills, projects, and experience.`,
      skills: [
        { name: "JavaScript", level: 75, category: "Frontend", icon: "🟨" },
        { name: "React",      level: 70, category: "Frontend", icon: "⚛️" },
        { name: "Node.js",    level: 65, category: "Backend",  icon: "🟢" },
        { name: "HTML/CSS",   level: 85, category: "Frontend", icon: "🎨" },
      ],
      projects: [
        {
          title: "Portfolio Website",
          description: "A modern and responsive portfolio website to showcase my work and skills.",
          technologies: ["Next.js", "React", "Tailwind CSS"],
          status: "completed",
          featured: true,
          startDate: new Date(),
          endDate: new Date(),
          images: [],
        },
        {
          title: "E-commerce Platform",
          description: "Full-stack e-commerce application with user authentication and payment processing.",
          technologies: ["React", "Node.js", "MongoDB", "Stripe"],
          status: "in-progress",
          featured: false,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          images: [],
        },
      ],
      socialLinks: {
        github:   `https://github.com/${username}`,
        linkedin: `https://linkedin.com/in/${username}`,
        twitter:  `https://twitter.com/${username}`,
      },
      contactInfo: { email: "", phone: "", location: "Add your location" },
      isPublished: true,
      views: 0,
      settings: { theme: "dark", layout: "standard" },
    });

    console.log("✅ Default portfolio created successfully:", defaultPortfolio._id);
    return defaultPortfolio;
  } catch (error) {
    console.error("❌ Error creating default portfolio:", error);
    throw error;
  }
}

export async function POST(req) {
  try {
    console.log("🚀 ============ REGISTRATION STARTED ============");

    const body = await req.json();
    const { name, email, password, role, username } = body;

    console.log("📝 Registration data received:", {
      name:     name     ? "✓" : "✗",
      email:    email    ? "✓" : "✗",
      password: password ? "***" : "✗",
      username: username || 'auto-generate',
      role:     role     || 'student',
    });

    // ── Validate ───────────────────────────────────────────────────────────
    const errors = validatePayload({ name, email, password, username });
    if (Object.keys(errors).length) {
      console.error("❌ Validation errors:", errors);
      return NextResponse.json({ success: false, message: "Validation failed", errors }, { status: 400 });
    }

    console.log("🔌 Connecting to database...");
    await connectDB();
    console.log("✅ Database connected");

    // ── Check email verified ───────────────────────────────────────────────
    const existingVerification = await Verification.findOne({
      email: email.toLowerCase(),
      verified: true,
    });
    if (!existingVerification) {
      console.log("❌ Email not verified yet");
      return NextResponse.json({
        success: false,
        message: "Email not verified. Please complete verification first.",
      }, { status: 400 });
    }

    // ── Check duplicate email ──────────────────────────────────────────────
    console.log("🔎 Checking for existing user with email:", email.toLowerCase());
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log("❌ Email already registered");
      return NextResponse.json({ success: false, message: "Email already registered" }, { status: 409 });
    }

    // ── Check duplicate username ───────────────────────────────────────────
    if (username && username.trim() !== "") {
      console.log("🔎 Checking username availability:", username);
      const usernameCheck = await checkUsernameAvailability(username);
      if (!usernameCheck.available) {
        console.log("❌ Username already taken");
        return NextResponse.json({
          success: false,
          message: "Username is already taken",
          errors: { username: "This username is already registered" },
        }, { status: 409 });
      }
    }

    // ── Hash password ──────────────────────────────────────────────────────
    console.log("🔑 Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("✅ Password hashed");

    // ── Final username ─────────────────────────────────────────────────────
    const finalUsername = username && username.trim() !== ""
      ? username.toLowerCase().trim()
      : await generateUsernameFromName(name);
    console.log("🎯 Final username:", finalUsername);

    // ── Create user ────────────────────────────────────────────────────────
    console.log("👤 Creating user in database...");
    const newUser = new User({
      name:          name.trim(),
      email:         email.toLowerCase(),
      username:      finalUsername,
      password:      hashedPassword,
      role:          role || "student",
      qrCode:        "",
      qrCodeData:    "",
      emailVerified: true,
    });
    await newUser.save();
    console.log("🎉 User created successfully:", newUser._id);

    // ── Create default portfolio ───────────────────────────────────────────
    let portfolioId = null;
    try {
      console.log("📁 Creating default portfolio...");
      const portfolio = await createDefaultPortfolio(newUser._id, newUser.name, newUser.username);
      portfolioId = portfolio._id;
      console.log("✅ Default portfolio created:", portfolioId);
    } catch (portfolioError) {
      console.error("⚠️ Could not create default portfolio:", portfolioError);
    }

    // ── Generate QR with portfolio _id ─────────────────────────────────────
    let qrCodeImage = "";
    const baseUrl    = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const portfolioUrl = portfolioId
      ? `${baseUrl}/portfolio/${portfolioId}`
      : `${baseUrl}/portfolio/${newUser._id}`;

    try {
      console.log("🔗 Portfolio URL:", portfolioUrl);
      console.log("🎨 Generating QR Code...");
      qrCodeImage = await QRCode.toDataURL(portfolioUrl, {
        width:  200,
        margin: 2,
        color:  { dark: '#000000', light: '#FFFFFF' },
      });
      console.log("✅ QR Code generated successfully");
    } catch (qrError) {
      console.error("❌ QR generation failed:", qrError);
    }

    // ── Update user with QR ────────────────────────────────────────────────
    await User.findByIdAndUpdate(newUser._id, {
      qrCode:     qrCodeImage,
      qrCodeData: portfolioUrl,
    });

    // ── Cleanup verification ───────────────────────────────────────────────
    try {
      await Verification.deleteOne({ email: email.toLowerCase() });
      console.log("🧹 Verification record cleaned up");
    } catch (cleanupError) {
      console.error("⚠️ Could not clean up verification:", cleanupError);
    }

    // ── Response ───────────────────────────────────────────────────────────
    const userResponse = {
      id:           newUser._id,
      name:         newUser.name,
      email:        newUser.email,
      username:     newUser.username,
      role:         newUser.role,
      qrCode:       qrCodeImage,
      portfolioUrl: portfolioUrl,
      profileUrl:   `/portfolio/${portfolioId || newUser._id}`,
      createdAt:    newUser.createdAt,
    };

    console.log("✅ ============ REGISTRATION COMPLETED ============");

    return NextResponse.json({
      success: true,
      message: "User registered successfully with default portfolio",
      user:    userResponse,
    }, { status: 201 });

  } catch (error) {
    console.error("💥 ============ REGISTRATION ERROR ============");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);

    if (error.code === 11000) {
      const field   = Object.keys(error.keyPattern)[0];
      const message = field === 'username'
        ? 'Username is already taken'
        : 'Email is already registered';
      console.error("❌ Duplicate key error:", { field, message });
      return NextResponse.json({
        success: false,
        message,
        errors: { [field]: message },
      }, { status: 409 });
    }

    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}