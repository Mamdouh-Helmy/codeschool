// app/api/portfolio/route.js
import { NextResponse } from 'next/server';
import Portfolio from '../../models/Portfolio';
import User from '../../models/User';
import { connectDB } from '@/lib/mongodb';
import { uploadToCloudinary } from '@/lib/cloudinary';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SIGN_SECRET || process.env.NEXTAUTH_SECRET || "change_this";

function getTokenFromHeader(req) {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

async function getUserIdFromToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.id) return decoded.id;
  if (decoded.username) {
    const user = await User.findOne({ username: decoded.username });
    if (!user) throw new Error('User not found');
    return user._id.toString();
  }
  if (decoded.email) {
    const user = await User.findOne({ email: decoded.email });
    if (!user) throw new Error('User not found');
    return user._id.toString();
  }
  throw new Error('No valid identifier in token');
}

/**
 * معالجة الشهادات قبل الحفظ:
 * - أي صورة base64 → ترفعها على Cloudinary وترجع URL
 * - أي صورة URL موجودة → تبقى كما هي
 */
async function processCertificates(certificates = []) {
  const processed = [];
  for (const cert of certificates) {
    let imageUrl = cert.image?.url || '';
    if (imageUrl && imageUrl.startsWith('data:')) {
      imageUrl = await uploadToCloudinary(imageUrl, 'portfolio-certificates');
    }
    processed.push({
      ...cert,
      image: {
        url: imageUrl,
        alt: cert.image?.alt || cert.title || '',
      },
    });
  }
  return processed;
}

// GET - الحصول على البورتفليو
export async function GET(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdFromToken(token);

    const portfolio = await Portfolio.findOne({ userId })
      .populate('userId', 'name email image role username profile socialLinks');

    if (!portfolio) {
      return NextResponse.json({ success: false, message: 'Portfolio not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, portfolio });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST - إنشاء بورتفليو جديد
export async function POST(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdFromToken(token);
    const decoded = jwt.verify(token, JWT_SECRET);
    const body = await req.json();

    const existing = await Portfolio.findOne({ userId });
    if (existing) {
      return NextResponse.json({ success: false, message: 'Portfolio already exists' }, { status: 400 });
    }

    let userName = decoded.name;
    if (!userName) {
      const user = await User.findById(userId);
      userName = user?.name || 'User';
    }

    // معالجة صور الشهادات قبل الحفظ
    const certificates = await processCertificates(body.certificates || []);

    const portfolio = await Portfolio.create({
      userId,
      title: body.title || `${userName}'s Portfolio`,
      description: body.description || '',
      skills: body.skills || [],
      projects: body.projects || [],
      certificates,
      socialLinks: body.socialLinks || {},
      contactInfo: body.contactInfo || {},
      settings: body.settings || { theme: 'dark', layout: 'standard' },
    });

    await portfolio.populate('userId', 'name email image role username');

    return NextResponse.json({
      success: true,
      message: 'Portfolio created successfully',
      portfolio,
    }, { status: 201 });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT - تحديث البورتفليو
export async function PUT(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdFromToken(token);
    const body = await req.json();

    delete body._id;
    delete body.userId;
    delete body.createdAt;
    delete body.updatedAt;
    delete body.__v;

    // معالجة صور الشهادات قبل الحفظ
    if (Array.isArray(body.certificates)) {
      body.certificates = await processCertificates(body.certificates);
    }

    const portfolio = await Portfolio.findOneAndUpdate(
      { userId },
      { $set: body },
      { new: true, runValidators: true }
    ).populate('userId', 'name email image role username');

    if (!portfolio) {
      return NextResponse.json({ success: false, message: 'Portfolio not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Portfolio updated successfully',
      portfolio,
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE - حذف البورتفليو
export async function DELETE(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdFromToken(token);
    const portfolio = await Portfolio.findOneAndDelete({ userId });

    if (!portfolio) {
      return NextResponse.json({ success: false, message: 'Portfolio not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Portfolio deleted successfully' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}