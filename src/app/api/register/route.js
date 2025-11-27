// app/api/register/route.js
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
  
  const existingUser = await User.findOne({ 
    username: username.toLowerCase().trim() 
  });
  
  return {
    available: !existingUser,
    existingUser: existingUser ? existingUser.email : null
  };
}

async function generateUsernameFromName(name) {
  const baseUsername = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 15);
  
  let username = baseUsername;
  let counter = 1;
  
  while (await User.findOne({ username })) {
    username = `${baseUsername}${counter}`;
    counter++;
    
    if (counter > 100) {
      throw new Error('Could not generate unique username');
    }
  }
  
  return username;
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
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // منذ شهر
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // خلال شهر
        }
      ],
      socialLinks: {
        github: `https://github.com/${username}`,
        linkedin: `https://linkedin.com/in/${username}`,
        twitter: `https://twitter.com/${username}`
      },
      contactInfo: {
        email: "", // سيتم تعبئته لاحقاً
        phone: "",
        location: "Add your location"
      },
      isPublished: true,
      views: 0,
      settings: {
        theme: "dark", // 🔥 السمة المظلمة كإعداد افتراضي
        layout: "standard"
      }
    });

    console.log("✅ Default portfolio created successfully with dark theme");
    return defaultPortfolio;
  } catch (error) {
    console.error("❌ Error creating default portfolio:", error);
    throw error;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, password, role, username } = body;

    console.log("🚀 Starting registration for:", email, "Username:", username || 'auto-generate');

    const errors = validatePayload({ name, email, password, username });
    if (Object.keys(errors).length) {
      return NextResponse.json({ 
        success: false, 
        message: "Validation failed", 
        errors 
      }, { status: 400 });
    }

    await connectDB();

    const existingVerification = await Verification.findOne({
      email: email.toLowerCase()
    });

    if (existingVerification) {
      return NextResponse.json({ 
        success: false, 
        message: "Email not verified. Please complete verification first." 
      }, { status: 400 });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        message: "Email already registered" 
      }, { status: 409 });
    }

    if (username && username.trim() !== "") {
      const usernameCheck = await checkUsernameAvailability(username);
      if (!usernameCheck.available) {
        return NextResponse.json({
          success: false,
          message: "Username is already taken",
          errors: { username: "This username is already registered" }
        }, { status: 409 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("🔑 Password hashed, generating user data...");

    let finalUsername = username && username.trim() !== "" 
      ? username.toLowerCase().trim() 
      : await generateUsernameFromName(name);

    console.log("✅ Username generated:", finalUsername);

    let qrCodeImage = "";
    let portfolioUrl = "";

    try {
      // 🔥 إنشاء رابط البورتفليو مباشرة
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      portfolioUrl = `${baseUrl}/portfolio/${finalUsername}`;

      console.log("🔗 Generating QR Code with portfolio URL:", portfolioUrl);

      // توليد QR Code يحتوي على رابط البورتفليو مباشرة
      qrCodeImage = await QRCode.toDataURL(portfolioUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      console.log("✅ QR Code generated successfully with portfolio link");

    } catch (qrError) {
      console.error("❌ QR generation failed:", qrError);
    }

    // إنشاء المستخدم
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      username: finalUsername,
      password: hashedPassword,
      role: role || "student",
      qrCode: qrCodeImage,
      qrCodeData: portfolioUrl, // 🔥 حفظ رابط البورتفليو بدلاً من التوكن
      profile: {
        jobTitle: "Developer",
        bio: `Welcome to ${name.trim()}'s portfolio`
      }
    });

    console.log("🎉 User created successfully:", {
      id: newUser._id,
      username: newUser.username
    });

    // 🔥 إنشاء بورتفليو افتراضي تلقائياً بعد التسجيل
    try {
      await createDefaultPortfolio(newUser._id, newUser.name, newUser.username);
      console.log("🎯 Default portfolio with dark theme created automatically");
    } catch (portfolioError) {
      console.error("⚠️ Could not create default portfolio:", portfolioError);
      // نستمر حتى لو فشل إنشاء البورتفليو
    }

    if ((!newUser.qrCode || !newUser.qrCodeData) && qrCodeImage) {
      console.log("🔄 QR code not saved in create, using updateOne...");
      try {
        await User.updateOne(
          { _id: newUser._id },
          { 
            $set: { 
              qrCode: qrCodeImage, 
              qrCodeData: portfolioUrl 
            } 
          }
        );
        
        console.log("📝 QR Code updated successfully");
        
      } catch (updateError) {
        console.error("❌ QR Code update failed:", updateError);
      }
    }

    const userResponse = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
      qrCode: newUser.qrCode,
      portfolioUrl: portfolioUrl, // 🔥 إضافة رابط البورتفليو في الرد
      profileUrl: `/portfolio/${newUser.username}`,
      createdAt: newUser.createdAt,
    };

    console.log("✅ Registration completed successfully for:", userResponse.email);
    console.log("🔗 Portfolio URL:", userResponse.portfolioUrl);

    return NextResponse.json({ 
      success: true, 
      message: "User registered successfully with default portfolio", 
      user: userResponse 
    }, { status: 201 });
    
  } catch (error) {
    console.error("💥 Register error:", error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message = field === 'username' 
        ? 'Username is already taken' 
        : 'Email is already registered';
      
      return NextResponse.json({ 
        success: false, 
        message,
        errors: { [field]: message }
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      success: false, 
      message: "Internal server error" 
    }, { status: 500 });
  }
}