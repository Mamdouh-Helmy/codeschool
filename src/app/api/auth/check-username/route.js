// app/api/auth/check-username/route.js
import { NextResponse } from "next/server";
import User from "../../../models/User";
import { connectDB } from "@/lib/mongodb";

const usernameRegex = /^[a-zA-Z0-9_]+$/;

export async function GET(req) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    
    if (!username) {
      return NextResponse.json(
        { success: false, message: 'Username is required' },
        { status: 400 }
      );
    }

    // التحقق من صيغة username
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({
        success: true,
        available: false,
        valid: false,
        message: 'Username must be between 3 and 20 characters'
      });
    }

    if (!usernameRegex.test(username)) {
      return NextResponse.json({
        success: true,
        available: false,
        valid: false,
        message: 'Username can only contain letters, numbers and underscores'
      });
    }

    const existingUser = await User.findOne({ 
      username: username.toLowerCase().trim() 
    });

    // توليد اقتراحات إذا كان الـ username محجوز
    let suggestions = [];
    if (existingUser) {
      suggestions = await generateUsernameSuggestions(username);
    }

    return NextResponse.json({
      success: true,
      available: !existingUser,
      valid: true,
      suggestions: suggestions.slice(0, 3) // 3 اقتراحات فقط
    });

  } catch (error) {
    console.error('Check username error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// دالة لتوليد اقتراحات usernames
async function generateUsernameSuggestions(baseUsername) {
  const suggestions = [];
  const variations = [
    `${baseUsername}1`,
    `${baseUsername}2`,
    `${baseUsername}3`,
    `${baseUsername}2024`,
    `${baseUsername}_dev`,
    `the_${baseUsername}`,
    `${baseUsername}_official`
  ];
  
  for (const suggestion of variations) {
    const exists = await User.findOne({ username: suggestion });
    if (!exists && suggestions.length < 5) {
      suggestions.push(suggestion);
    }
  }
  
  return suggestions;
}