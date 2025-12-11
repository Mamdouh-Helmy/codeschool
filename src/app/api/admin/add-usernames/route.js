// app/api/admin/add-usernames/route.js - إذا كنت لاتزال بحاجته
import { NextResponse } from 'next/server';
import User from '../../../models/User';
import { connectDB } from '@/lib/mongodb';

export async function POST(req) {
  try {
    console.log("🔄 This endpoint is temporarily disabled");
    
    return NextResponse.json({
      success: true,
      message: "This endpoint is temporarily disabled for maintenance"
    });

  } catch (error) {
    console.error('💥 Error:', error);
    return NextResponse.json(
      { success: false, message: 'Endpoint disabled' },
      { status: 503 }
    );
  }
}