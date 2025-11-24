// app/api/portfolio/create-default/route.js
import { NextResponse } from 'next/server';
import Portfolio from '../../../models/Portfolio';
import User from '../../../models/User';
import { connectDB } from '@/lib/mongodb';

export async function POST(req) {
  try {
    await connectDB();
    
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json(
        { success: false, message: 'Username is required' },
        { status: 400 }
      );
    }

    console.log('🛠️ Creating default portfolio for user:', username);

    // البحث عن المستخدم
    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // التحقق من وجود بورتفليو
    const existingPortfolio = await Portfolio.findOne({ userId: user._id });
    if (existingPortfolio) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Portfolio already exists',
          portfolio: existingPortfolio 
        },
        { status: 400 }
      );
    }

    // إنشاء بورتفليو افتراضي
    const defaultPortfolio = await Portfolio.create({
      userId: user._id,
      title: `${user.name}'s Portfolio`,
      description: `Welcome to ${user.name}'s professional portfolio. Explore my skills, projects, and experience.`,
      skills: [
        {
          name: "JavaScript",
          level: 85,
          category: "Frontend",
          icon: "JS"
        },
        {
          name: "React",
          level: 80,
          category: "Frontend", 
          icon: "⚛"
        },
        {
          name: "Node.js",
          level: 75,
          category: "Backend",
          icon: "🟢"
        }
      ],
      projects: [
        {
          title: "Portfolio Website",
          description: "A modern and responsive portfolio website built with Next.js and Tailwind CSS.",
          technologies: ["Next.js", "React", "Tailwind CSS", "TypeScript"],
          status: "completed",
          featured: true
        }
      ],
      socialLinks: {
        github: `https://github.com/${username}`,
        linkedin: `https://linkedin.com/in/${username}`
      },
      contactInfo: {
        email: user.email,
        location: "Add your location"
      },
      isPublished: true, // 🔥 تأكد من أن البورتفليو منشور
      settings: {
        theme: 'light',
        layout: 'standard'
      }
    });

    await defaultPortfolio.populate('userId', 'name email image username role profile');

    console.log('✅ Default portfolio created successfully');

    return NextResponse.json({
      success: true,
      message: 'Default portfolio created successfully',
      portfolio: defaultPortfolio
    }, { status: 201 });
  } catch (error) {
    console.error('❌ Create default portfolio error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}