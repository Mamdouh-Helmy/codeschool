// app/api/portfolio/[username]/route.js
import { NextResponse } from 'next/server';
import Portfolio from '../../../models/Portfolio';
import User from '../../../models/User';
import { connectDB } from '@/lib/mongodb';

export async function GET(req, context) {
  try {
    await connectDB();
    
    // استخراج username من params بشكل صحيح
    const { params } = context;
    const { username } = await params;

    console.log('🔍 Searching for user with username:', username);

    if (!username) {
      return NextResponse.json(
        { success: false, message: 'Username is required' },
        { status: 400 }
      );
    }

    // البحث عن المستخدم باليوزرنيم فقط
    const user = await User.findOne({ 
      username: username.toLowerCase().trim() 
    });

    console.log('👤 User found:', user ? user.username : 'No user found');

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // البحث عن البورتفليو المنشور
    const portfolio = await Portfolio.findOne({ 
      userId: user._id, 
      isPublished: true 
    }).populate('userId', 'name email image username role profile socialLinks');

    console.log('📁 Published portfolio found:', portfolio ? portfolio.title : 'No published portfolio found');

    if (!portfolio) {
      // التحقق إذا كان هناك أي بورتفليو غير منشور
      const anyPortfolio = await Portfolio.findOne({ userId: user._id });
      
      return NextResponse.json(
        { 
          success: false, 
          message: anyPortfolio 
            ? 'Portfolio exists but is not published' 
            : 'No portfolio found for this user',
          hasUnpublished: !!anyPortfolio
        },
        { status: 404 }
      );
    }

    // بناء بيانات البورتفليو
    const portfolioData = {
      _id: portfolio._id,
      title: portfolio.title,
      description: portfolio.description,
      skills: portfolio.skills || [],
      projects: portfolio.projects || [],
      socialLinks: portfolio.socialLinks || {},
      contactInfo: portfolio.contactInfo || {},
      isPublished: portfolio.isPublished,
      views: portfolio.views,
      settings: portfolio.settings || { 
        theme: 'light', 
        layout: 'standard' 
      },
      userId: {
        _id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        username: user.username,
        role: user.role,
        profile: user.profile || {}
      },
      createdAt: portfolio.createdAt,
      updatedAt: portfolio.updatedAt
    };

    // زيادة عدد المشاهدات
    await Portfolio.findByIdAndUpdate(portfolio._id, {
      $inc: { views: 1 }
    });

    return NextResponse.json({
      success: true,
      portfolio: portfolioData
    });

  } catch (error) {
    console.error('❌ Get public portfolio error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error.message 
      },
      { status: 500 }
    );
  }
}