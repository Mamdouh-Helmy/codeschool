// app/api/guest/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "../../models/User";
import bcrypt from "bcryptjs";

const emailRegex    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_]+$/;

// ✅ بيهرّب رموز الـ regex الخاصة عشان البحث يشتغل صح مع قيم فيها
// + . * ? ^ $ إلخ (زي إيميلات الـ Gmail aliases user+test@gmail.com)
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
    let counter  = 1;

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

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search       = searchParams.get("search")       || "";
    const authProvider = searchParams.get("authProvider") || "";
    const status       = searchParams.get("status")       || ""; // "active" | "inactive"
    const language     = searchParams.get("language")     || "";
    const page          = parseInt(searchParams.get("page")  || "1");
    const limit         = parseInt(searchParams.get("limit") || "10");

    const query = { role: "guest" };

    // ✅ الإصلاح 1: تهريب الـ regex قبل استخدامه في البحث
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name:     { $regex: safeSearch, $options: "i" } },
        { email:    { $regex: safeSearch, $options: "i" } },
        { username: { $regex: safeSearch, $options: "i" } },
      ];
    }

    // ✅ الإصلاح 2: جيست قدام اتسجلوا قبل ما authProvider يتضاف للسكيما —
    // الحقل مش موجود عندهم خالص. $in بيطابق null والحقل الغير موجود مع بعض.
    if (["credentials", "google", "github"].includes(authProvider)) {
      query.authProvider =
        authProvider === "credentials"
          ? { $in: ["credentials", null] }
          : authProvider;
    }

    if (status === "active")   query.isActive = true;
    if (status === "inactive") query.isActive = false;
    if (["ar", "en"].includes(language)) query.language = language;

    const filteredCount = await User.countDocuments(query);
    const guests = await User.find(query)
      .select("_id name email username image gender language authProvider profile isActive createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // ✅ إحصائيات عامة لكل الجيست (مش بس نتيجة الفلتر الحالي)
    const [globalTotal, activeCount, providerAgg] = await Promise.all([
      User.countDocuments({ role: "guest" }),
      User.countDocuments({ role: "guest", isActive: true }),
      User.aggregate([
        { $match: { role: "guest" } },
        {
          $group: {
            // ✅ الإصلاح 3: نفس منطق الفلتر فوق — أي جيست قديم من غير
            // الحقل يتحسب "credentials" بدل ما يقع في باكت _id: null
            // منفصل ويختفي بالكامل من الإحصائية
            _id: { $ifNull: ["$authProvider", "credentials"] },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const byProvider = { credentials: 0, google: 0, github: 0 };
    providerAgg.forEach((p) => {
      if (p._id && byProvider[p._id] !== undefined) byProvider[p._id] = p.count;
    });

    return NextResponse.json({
      success: true,
      data: guests,
      pagination: {
        page,
        limit,
        totalGuests: filteredCount,
        totalPages: Math.ceil(filteredCount / limit),
      },
      stats: {
        total:    globalTotal,
        active:   activeCount,
        inactive: globalTotal - activeCount,
        byProvider,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching guests:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch guests", error: error.message },
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

    // ── Final username (اختياري بس بنولده لو الأدمن مسابهوش فاضي) ──────────
    const finalUsername =
      username && username.trim() !== ""
        ? username.toLowerCase().trim()
        : await generateUsernameFromName(name);

    // ── Create guest ────────────────────────────────────────────────────────
    // ✅ role دايماً "guest" هنا، ومفيش بورتفوليو/QR لأن الجيست لسه مالوش دور محدد
    const guestData = {
      name:          name.trim(),
      email:         email.toLowerCase().trim(),
      username:      finalUsername,
      password:      hashedPassword,
      role:          "guest",
      authProvider:  "credentials",
      emailVerified: true,
      isActive:      true,
      language:      language === "en" ? "en" : "ar",
      qrCode:        "",
      qrCodeData:    "",
      profile: {
        bio:      "",
        jobTitle: "",
        company:  "",
        website:  "",
        location: "",
        phone:    phone && phone.trim() ? phone.trim() : "",
      },
    };

    if (image && image.trim()) {
      guestData.image = image.trim();
    }
    if (gender && (gender === "male" || gender === "female")) {
      guestData.gender = gender;
    }

    const newGuest = new User(guestData);
    await newGuest.save();

    // ── Fetch saved data ───────────────────────────────────────────────────
    const savedGuest = await User.findById(newGuest._id)
      .select("_id name email username image gender language authProvider profile isActive createdAt")
      .lean();

    // ── Response ───────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        message: "Guest created successfully",
        data: {
          id:           savedGuest._id,
          name:         savedGuest.name,
          email:        savedGuest.email,
          username:     savedGuest.username,
          role:         "guest",
          image:        savedGuest.image,
          gender:       savedGuest.gender,
          language:     savedGuest.language,
          authProvider: savedGuest.authProvider,
          profile:      savedGuest.profile,
          isActive:     savedGuest.isActive,
          createdAt:    savedGuest.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("💥 GUEST CREATION ERROR:", error);

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