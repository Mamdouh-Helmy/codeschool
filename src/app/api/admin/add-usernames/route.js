// app/api/admin/add-usernames/route.js
import { NextResponse } from 'next/server';
import User from '../../../models/User';
import { connectDB } from '@/lib/mongodb';
import { getToken } from 'next-auth/jwt';

export async function POST(req) {
  try {
    await connectDB();
    
    const token = await getToken({ req });
    if (!token || token.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    // جلب جميع المستخدمين الذين ليس لديهم username
    const usersWithoutUsername = await User.find({ 
      username: { $in: [null, ''] } 
    });

    let updatedCount = 0;
    let errors = [];

    for (const user of usersWithoutUsername) {
      try {
        await user.generateUsername();
        await user.save();
        updatedCount++;
      } catch (error) {
        errors.push({
          userId: user._id,
          name: user.name,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} users with usernames`,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Add usernames error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}