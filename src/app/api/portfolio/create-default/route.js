// app/api/portfolio/create-default/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Portfolio from "../../../models/Portfolio";
import User from "../../../models/User";
import { connectDB } from "@/lib/mongodb";

// ✅ قيم icon هنا لازم تطابق مفاتيح iconMap في مكوّن Resume
// (lowercase، بدون مسافات أو نقط) عشان الأيقونات تظهر صح من أول بورتفوليو
const DEFAULT_SKILLS = [
  { name: "JavaScript", level: 85, category: "Frontend", icon: "javascript" },
  { name: "React", level: 80, category: "Frontend", icon: "react" },
  { name: "Node.js", level: 75, category: "Backend", icon: "nodejs" },
];

const DEFAULT_PROJECTS = [
  {
    title: "Portfolio Website",
    description:
      "A modern and responsive portfolio website built with Next.js and Tailwind CSS.",
    technologies: ["Next.js", "React", "Tailwind CSS", "TypeScript"],
    status: "completed",
    featured: true,
  },
];

function buildDefaultPortfolio(user) {
  return {
    userId: user._id,
    title: `${user.name}'s Portfolio`,
    description: `Welcome to ${user.name}'s professional portfolio. Explore my skills, projects, and experience.`,
    ownerRole: user.profile?.jobTitle || "",
    ownerImage: user.image || "",
    skills: DEFAULT_SKILLS,
    projects: DEFAULT_PROJECTS,
    // ✅ مبنترمكش نخمّن روابط سوشيال ميديا للمستخدم — نسيبها فاضية وهو يضيفها بنفسه من الداشبورد
    socialLinks: {},
    contactInfo: {
      email: user.email || "",
      phone: user.profile?.phone || "",
      location: user.profile?.location || "",
    },
    isPublished: true,
    settings: {
      theme: "dark",
      layout: "standard",
    },
  };
}

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json().catch(() => null);
    const username = body?.username?.trim().toLowerCase();

    if (!username) {
      return NextResponse.json(
        { success: false, message: "Username is required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const existingPortfolio = await Portfolio.findOne({ userId: user._id });
    if (existingPortfolio) {
      return NextResponse.json(
        {
          success: false,
          message: "Portfolio already exists for this user",
          portfolio: existingPortfolio,
        },
        { status: 409 }
      );
    }

    let portfolio;
    try {
      portfolio = await Portfolio.create(buildDefaultPortfolio(user));
    } catch (err) {
      // ✅ لو حصل race condition (request تاني عمل بورتفوليو لنفس اليوزر في نفس اللحظة)
      // الـ unique index على userId هيرمي E11000، هنا بنتعامل معاه بدل ما نكسر الـ request
      if (err?.code === 11000) {
        const raceExisting = await Portfolio.findOne({ userId: user._id }).populate(
          "userId",
          "name email image username role profile"
        );
        return NextResponse.json(
          {
            success: false,
            message: "Portfolio already exists for this user",
            portfolio: raceExisting,
          },
          { status: 409 }
        );
      }
      throw err;
    }

    await portfolio.populate("userId", "name email image username role profile");

    return NextResponse.json(
      {
        success: true,
        message: "Default portfolio created successfully",
        portfolio,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Create default portfolio error:", error);

    if (error instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(error.errors).map((e) => e.message);
      return NextResponse.json(
        { success: false, message: "Invalid portfolio data", errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}