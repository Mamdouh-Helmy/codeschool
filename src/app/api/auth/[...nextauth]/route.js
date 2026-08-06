import NextAuth from "next-auth";
import { authOptions } from "../../../../lib/authOptions"; // عدّل المسار حسب مكانه الفعلي

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };