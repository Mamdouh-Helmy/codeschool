import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import User from "../../../models/User";
import Portfolio from "../../../models/Portfolio";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/utils/authMiddleware"; // للتحقق من صلاحية الأدمن

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_]+$/;

function validatePayload({ name, email, password, username }) {
  console.log("🔍 [ADMIN] Validating payload:", { 
    name: name ? "✓" : "✗", 
    email: email ? "✓" : "✗", 
    password: password ? "***" : "✗", 
    username: username || 'auto-generate' 
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
      errors.username = "Username can only contain letters, numbers and underscores";
    }
  }
  
  return errors;
}

async function checkUsernameAvailability(username) {
  if (!username) return { available: true };
  
  try {
    const existingUser = await User.findOne({ 
      username: username.toLowerCase().trim() 
    });
    
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
    
    console.log("🔎 Checking username availability:", username);
    
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

// دالة لإنشاء بورتفليو افتراضي
async function createDefaultPortfolio(userId, userName, username) {
  try {
    console.log("🔄 Creating default portfolio for user:", username);
    
    const defaultPortfolio = await Portfolio.create({
      userId,
      title: `${userName}'s Portfolio`,
      description: `Welcome to ${userName}'s professional portfolio. Explore my skills, projects, and experience.`,
      skills: [
        {
          name: "JavaScript",
          level: 75,
          category: "Frontend",
          icon: "🟨"
        },
        {
          name: "React",
          level: 70,
          category: "Frontend", 
          icon: "⚛️"
        },
        {
          name: "Node.js",
          level: 65,
          category: "Backend",
          icon: "🟢"
        },
        {
          name: "HTML/CSS",
          level: 85,
          category: "Frontend",
          icon: "🎨"
        }
      ],
      projects: [
        {
          title: "Portfolio Website",
          description: "A modern and responsive portfolio website to showcase my work and skills.",
          technologies: ["Next.js", "React", "Tailwind CSS"],
          status: "completed",
          featured: true,
          startDate: new Date(),
          endDate: new Date()
        },
        {
          title: "E-commerce Platform",
          description: "Full-stack e-commerce application with user authentication and payment processing.",
          technologies: ["React", "Node.js", "MongoDB", "Stripe"],
          status: "in-progress",
          featured: false,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      ],
      socialLinks: {
        github: `https://github.com/${username}`,
        linkedin: `https://linkedin.com/in/${username}`,
        twitter: `https://twitter.com/${username}`
      },
      contactInfo: {
        email: "",
        phone: "",
        location: "Add your location"
      },
      isPublished: true,
      views: 0,
      settings: {
        theme: "dark",
        layout: "standard"
      }
    });

    console.log("✅ Default portfolio created successfully");
    return defaultPortfolio;
  } catch (error) {
    console.error("❌ Error creating default portfolio:", error);
    throw error;
  }
}

export async function POST(req) {
  try {
    console.log("🚀 ============ [ADMIN] USER CREATION STARTED ============");
    
    // التحقق من صلاحية الأدمن
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      console.log('❌ Admin authorization failed');
      return authCheck.response;
    }

    const adminUser = authCheck.user;
    console.log('✅ Admin verified:', adminUser.email);

    const body = await req.json();
    const { name, email, password, role, username } = body;

    console.log("📝 [ADMIN] Registration data received:", { 
      name: name ? "✓" : "✗", 
      email: email ? "✓" : "✗",
      password: password ? "***" : "✗",
      username: username || 'auto-generate',
      role: role || 'student',
      requestedBy: adminUser.email
    });

    // التحقق من البيانات
    const errors = validatePayload({ name, email, password, username });
    if (Object.keys(errors).length) {
      console.error("❌ Validation errors:", errors);
      return NextResponse.json({ 
        success: false, 
        message: "Validation failed", 
        errors 
      }, { status: 400 });
    }

    console.log("🔌 Connecting to database...");
    await connectDB();
    console.log("✅ Database connected");

    // التحقق من البريد الإلكتروني الموجود
    console.log("🔎 Checking for existing user with email:", email.toLowerCase());
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log("❌ Email already registered");
      return NextResponse.json({ 
        success: false, 
        message: "Email already registered",
        existingUserId: existingUser._id 
      }, { status: 409 });
    }

    // التحقق من username إذا تم توفيره
    if (username && username.trim() !== "") {
      console.log("🔎 Checking username availability:", username);
      const usernameCheck = await checkUsernameAvailability(username);
      if (!usernameCheck.available) {
        console.log("❌ Username already taken");
        return NextResponse.json({
          success: false,
          message: "Username is already taken",
          errors: { username: "This username is already registered" }
        }, { status: 409 });
      }
    }

    // تشفير كلمة المرور
    console.log("🔑 Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("✅ Password hashed");

    // توليد username إذا لم يتم توفيره
    let finalUsername = username && username.trim() !== "" 
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
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      console.log("✅ QR Code generated successfully");

    } catch (qrError) {
      console.error("❌ QR generation failed:", qrError);
      qrCodeImage = "";
    }

    // إنشاء المستخدم (بدون تفعيل middleware المعقد)
    console.log("👤 Creating user in database...");
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      username: finalUsername,
      password: hashedPassword,
      role: role || "student",
      qrCode: qrCodeImage,
      qrCodeData: portfolioUrl,
      emailVerified: true, // مفعل مباشرة من الأدمن
      metadata: {
        createdBy: adminUser.id,
        createdAt: new Date(),
        isAdminCreated: true
      }
    });

    await newUser.save();
    console.log("🎉 User created successfully:", newUser._id);

    // إنشاء بورتفليو افتراضي تلقائياً
    try {
      console.log("📁 Creating default portfolio...");
      await createDefaultPortfolio(newUser._id, newUser.name, newUser.username);
      console.log("✅ Default portfolio created");
    } catch (portfolioError) {
      console.error("⚠️ Could not create default portfolio:", portfolioError);
      // نستمر حتى لو فشل إنشاء البورتفليو
    }

    // إعداد رد النجاح
    const userResponse = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
      qrCode: newUser.qrCode,
      portfolioUrl: portfolioUrl,
      profileUrl: `/portfolio/${newUser.username}`,
      createdAt: newUser.createdAt,
      createdBy: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name
      }
    };

    console.log("✅ ============ [ADMIN] USER CREATION COMPLETED ============");
    console.log("📋 User registered successfully by admin");

    return NextResponse.json({ 
      success: true, 
      message: "User created successfully with default portfolio", 
      user: userResponse 
    }, { status: 201 });
    
  } catch (error) {
    console.error("💥 ============ [ADMIN] USER CREATION ERROR ============");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message = field === 'username' 
        ? 'Username is already taken' 
        : 'Email is already registered';
      
      console.error("❌ Duplicate key error:", { field, message });
      
      return NextResponse.json({ 
        success: false, 
        message,
        errors: { [field]: message }
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      success: false, 
      message: "Internal server error",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// GET: الحصول على سجل إنشاء المستخدمين بواسطة الأدمن
export async function GET(req) {
  try {
    // التحقق من صلاحية الأدمن
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // جلب آخر المستخدمين الذين تم إنشاؤهم بواسطة الأدمن
    const adminCreatedUsers = await User.find({
      'metadata.isAdminCreated': true
    })
      .sort({ 'metadata.createdAt': -1 })
      .limit(limit)
      .select('name email username role metadata.createdAt metadata.createdBy')
      .populate('metadata.createdBy', 'name email')
      .lean();

    return NextResponse.json({
      success: true,
      message: "Admin-created users retrieved successfully",
      data: adminCreatedUsers,
      count: adminCreatedUsers.length
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching admin-created users:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch admin-created users",
        error: error.message 
      },
      { status: 500 }
    );
  }
}