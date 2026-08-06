// types/next-auth.d.ts
import NextAuth from "next-auth";
import { JWT } from "next-auth/jwt";

type UserRole = "admin" | "marketing" | "student" | "instructor" | "guest";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: UserRole;
      username?: string | null;
      language?: "ar" | "en";
      gender?: "male" | "female" | null;
      isActive?: boolean;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: UserRole;
    username?: string | null;
    language?: "ar" | "en";
    gender?: "male" | "female" | null;
    isActive?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: UserRole;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    username?: string | null;
    language?: "ar" | "en";
    gender?: "male" | "female" | null;
    isActive?: boolean;
  }
}