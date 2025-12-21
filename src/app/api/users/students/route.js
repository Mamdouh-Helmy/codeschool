import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '../../../models/User';
import { requireAdmin } from '@/utils/authMiddleware';

export async function GET(req) {
  try {
    // التحقق من صلاحية الأدمن
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');

    // بناء استعلام البحث
    const query = { role: 'student' }; // عرض المستخدمين من نوع student فقط

    if (search) {
      query['$or'] = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('_id name email role')
      .limit(limit)
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: users
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users', error: error.message },
      { status: 500 }
    );
  }
}