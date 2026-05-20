// app/api/portfolio/route.js
import { NextResponse } from 'next/server';
import Portfolio from '../../models/Portfolio';
import User from '../../models/User';
import { connectDB } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SIGN_SECRET || process.env.NEXTAUTH_SECRET || "change_this";

// دالة لاستخراج التوكن
function getTokenFromHeader(req) {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// دالة للحصول على userId من التوكن
async function getUserIdFromToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // إذا كان id موجود مباشرة
    if (decoded.id) {
      return decoded.id;
    }
    
    // إذا كان username موجود
    if (decoded.username) {
      const user = await User.findOne({ username: decoded.username });
      if (!user) {
        throw new Error('User not found for username: ' + decoded.username);
      }
      return user._id.toString();
    }
    
    // إذا كان email موجود
    if (decoded.email) {
      const user = await User.findOne({ email: decoded.email });
      if (!user) {
        throw new Error('User not found for email: ' + decoded.email);
      }
      return user._id.toString();
    }
    
    throw new Error('No valid identifier (id, username, or email) found in token');
  } catch (error) {
    throw error;
  }
}

// GET - الحصول على البورتفليو
export async function GET(req) {
  try {
    await connectDB();
    
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const userId = await getUserIdFromToken(token);
    console.log('📖 Fetching portfolio for user ID:', userId);

    const portfolio = await Portfolio.findOne({ userId })
      .populate('userId', 'name email image role username profile socialLinks');

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
    console.error('❌ Get portfolio error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
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
        { success: false, message: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const userId = await getUserIdFromToken(token);
    const decoded = jwt.verify(token, JWT_SECRET);
    const body = await req.json();
    
    console.log('📝 Creating portfolio for user ID:', userId);
    
    // التحقق من وجود بورتفليو سابق
    const existingPortfolio = await Portfolio.findOne({ userId });
    if (existingPortfolio) {
      return NextResponse.json(
        { success: false, message: 'Portfolio already exists for this user' },
        { status: 400 }
      );
    }

    // الحصول على اسم المستخدم
    let userName = decoded.name;
    if (!userName) {
      const user = await User.findById(userId);
      userName = user?.name || 'User';
    }

    const portfolio = await Portfolio.create({
      userId,
      title: body.title || `${userName}'s Portfolio`,
      description: body.description || '',
      skills: body.skills || [],
      projects: body.projects || [],
      socialLinks: body.socialLinks || {},
      contactInfo: body.contactInfo || {},
      settings: body.settings || { theme: 'dark', layout: 'standard' }
    });

    await portfolio.populate('userId', 'name email image role username');

    return NextResponse.json({
      success: true,
      message: 'Portfolio created successfully',
      portfolio
    }, { status: 201 });
  } catch (error) {
    console.error('❌ Create portfolio error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
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
        { success: false, message: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const userId = await getUserIdFromToken(token);
    console.log('✏️ Updating portfolio for user ID:', userId);
    
    const body = await req.json();
    
    // إزالة الحقول التي لا يجب تحديثها
    delete body._id;
    delete body.userId;
    delete body.createdAt;
    delete body.updatedAt;
    delete body.__v;
    
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
    console.error('❌ Update portfolio error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - حذف البورتفليو
export async function DELETE(req) {
  try {
    await connectDB();
    
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const userId = await getUserIdFromToken(token);
    console.log('🗑️ Deleting portfolio for user ID:', userId);
    
    const portfolio = await Portfolio.findOneAndDelete({ userId });

    if (!portfolio) {
      return NextResponse.json(
        { success: false, message: 'Portfolio not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Portfolio deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete portfolio error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}