import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SIGN_SECRET || process.env.NEXTAUTH_SECRET || "change_this"
);

/**
 * التحقق من التوكن واستخراج بيانات المستخدم
 */
export async function verifyAuthToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      valid: true,
      payload
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Middleware للتحقق من صلاحية الأدمن
 */
export async function requireAdmin(req) {
  const token = req.cookies.get('token')?.value;

  if (!token) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    };
  }

  const authResult = await verifyAuthToken(token);
  
  if (!authResult.valid || authResult.payload.role !== 'admin') {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    };
  }

  return {
    authorized: true,
    user: authResult.payload
  };
} 