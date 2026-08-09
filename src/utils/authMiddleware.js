import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions'; // تأكد من صحة المسار

/**
 * Middleware للتحقق من صلاحية الأدمن باستخدام جلسة NextAuth
 * @param {NextRequest} req - طلب Next.js (يُمرر للتوافق فقط، غير مستخدم)
 * @returns {Object} { authorized: boolean, response?: NextResponse, user?: any }
 */
export async function requireAdmin(req) {
  // الحصول على الجلسة من NextAuth (تعتمد على الكوكيز المُدارة بواسطة NextAuth)
  const session = await getServerSession(authOptions);

  // إذا لم توجد جلسة → غير مصرّح
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    };
  }

  // التحقق من دور المستخدم (يجب أن يكون admin)
  if (session.user.role !== 'admin') {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    };
  }

  // مصرّح: نعيد المستخدم مع البيانات الأساسية
  return {
    authorized: true,
    user: session.user // يحتوي على id, name, email, role (حسب إعدادات session callback)
  };
}