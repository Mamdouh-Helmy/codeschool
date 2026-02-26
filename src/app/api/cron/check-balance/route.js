// /src/app/api/cron/check-balance/route.js
import { NextResponse } from 'next/server';
import { checkAllStudentsLowBalance } from '../../../services/balanceService';

export async function GET(req) {
  try {
    // تحقق من وجود secret key للأمان
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await checkAllStudentsLowBalance();

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('❌ Error in cron job:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}