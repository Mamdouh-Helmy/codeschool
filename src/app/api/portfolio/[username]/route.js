// app/api/portfolio/[username]/route.js
import { NextResponse } from 'next/server';
import Portfolio from '../../../models/Portfolio';
import User from '../../../models/User';
import { connectDB } from '@/lib/mongodb';

export async function GET(req, { params }) {
  try {
    await connectDB();
    
    const { username } = await params;

    console.log('🔍 Searching for user with username:', username);

    // البحث عن المستخدم باليوزرنيم
    const user = await User.findOne({ 
      $or: [
        { username: username },
        { name: { $regex: new RegExp(username, 'i') } }
      ]
    });

    console.log('👤 User found:', user ? user.username : 'No user found');

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // 🔥 التحقق من جميع البورتفليوهات أولاً
    const allPortfolios = await Portfolio.find({ userId: user._id });
    console.log('📊 All portfolios for user:', allPortfolios.length);
    
    allPortfolios.forEach((p, i) => {
      console.log(`📁 Portfolio ${i + 1}:`, {
        id: p._id,
        title: p.title,
        isPublished: p.isPublished,
        userId: p.userId
      });
    });

    // البحث عن البورتفليو المنشور فقط
    const portfolio = await Portfolio.findOne({ 
      userId: user._id, 
      isPublished: true 
    }).populate('userId', 'name email image username role profile');

    console.log('📁 Published portfolio found:', portfolio ? portfolio.title : 'No published portfolio found');

    if (!portfolio) {
      // 🔥 إرجاع رسالة أكثر وضوحاً
      return NextResponse.json(
        { 
          success: false, 
          message: allPortfolios.length > 0 
            ? 'Portfolio exists but is not published' 
            : 'No portfolio found for this user'
        },
        { status: 404 }
      );
    }

    // 🔥 تأكد من وجود جميع الحقول المطلوبة
    const portfolioData = {
      ...portfolio.toObject(),
      socialLinks: portfolio.socialLinks || {},
      contactInfo: portfolio.contactInfo || {},
      skills: portfolio.skills || [],
      projects: portfolio.projects || [],
      settings: portfolio.settings || { theme: 'light', layout: 'standard' }
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
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}