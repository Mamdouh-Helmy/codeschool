// app/api/portfolio/route.js
import { NextResponse } from 'next/server';
import Portfolio from '../../models/Portfolio';
import { connectDB } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SIGN_SECRET || process.env.NEXTAUTH_SECRET || "change_this";

// دالة لاستخراج التوكن من الـ header
function getTokenFromHeader(req) {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// GET - الحصول على بورتفليو المستخدم
export async function GET(req) {
  try {
    await connectDB();
    
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // فك تشفير التوكن
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    const portfolio = await Portfolio.findOne({ userId })
      .populate('userId', 'name email image role username');

    if (!portfolio) {
      return NextResponse.json(
        { success: false, message: 'Portfolio not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      portfolio
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - إنشاء بورتفليو جديد
export async function POST(req) {
  try {
    await connectDB();
    
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    const body = await req.json();
    
    // التحقق من وجود بورتفليو سابق
    const existingPortfolio = await Portfolio.findOne({ userId });
    if (existingPortfolio) {
      return NextResponse.json(
        { success: false, message: 'Portfolio already exists for this user' },
        { status: 400 }
      );
    }

    const portfolio = await Portfolio.create({
      userId,
      title: body.title || `${decoded.name}'s Portfolio`,
      description: body.description,
      skills: body.skills || [],
      projects: body.projects || [],
      socialLinks: body.socialLinks || {},
      contactInfo: body.contactInfo || {},
      settings: body.settings || {}
    });

    await portfolio.populate('userId', 'name email image role username');

    return NextResponse.json({
      success: true,
      message: 'Portfolio created successfully',
      portfolio
    }, { status: 201 });
  } catch (error) {
    console.error('Create portfolio error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - تحديث البورتفليو
export async function PUT(req) {
  try {
    await connectDB();
    
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    const body = await req.json();
    
    const portfolio = await Portfolio.findOneAndUpdate(
      { userId },
      { $set: body },
      { new: true, runValidators: true }
    ).populate('userId', 'name email image role username');

    if (!portfolio) {
      return NextResponse.json(
        { success: false, message: 'Portfolio not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Portfolio updated successfully',
      portfolio
    });
  } catch (error) {
    console.error('Update portfolio error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}