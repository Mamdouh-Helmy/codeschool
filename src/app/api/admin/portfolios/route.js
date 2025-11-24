// app/api/admin/portfolios/route.js
import { NextResponse } from 'next/server';
import Portfolio from '../../../models/Portfolio';
import { connectDB } from '@/lib/mongodb';
import { getToken } from 'next-auth/jwt';

// GET - الحصول على جميع البورتفليوهات (للأدمن فقط)
export async function GET(req) {
  try {
    await connectDB();
    
    const token = await getToken({ req });
    if (!token || token.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    // بناء query للبحث
    let query = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'userId.name': { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.isPublished = status === 'published';
    }

    const [portfolios, total] = await Promise.all([
      Portfolio.find(query)
        .populate('userId', 'name email username role image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Portfolio.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      portfolios,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin get portfolios error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}