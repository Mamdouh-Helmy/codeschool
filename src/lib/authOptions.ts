import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import User from "../app/models/User";
import Portfolio from "../app/models/Portfolio";
import { connectDB } from "./mongodb";

// ── يولّد username فريد من الاسم (نفس منطق الـ register route) ─────────────
async function generateUsernameFromName(name: string) {
  try {
    const baseUsername = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 15);

    if (!baseUsername || baseUsername.length < 3) {
      return `user${Date.now().toString().slice(-6)}`;
    }

    let username = baseUsername;
    let counter = 1;

    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter}`;
      counter++;
      if (counter > 10) {
        return `user${Date.now().toString().slice(-8)}`;
      }
    }

    return username;
  } catch (error) {
    console.error("❌ Error generating username:", error);
    return `user${Date.now().toString().slice(-8)}`;
  }
}

// ── يبني portfolio افتراضي لمستخدم جديد (نفس منطق الـ register route) ──────
async function createDefaultPortfolio(userId: any, userName: string) {
  try {
    const defaultPortfolio = await Portfolio.create({
      userId,
      title: `${userName}'s Portfolio`,
      description: `Welcome to ${userName}'s professional portfolio. Explore my skills, projects, and experience.`,
      skills: [
        { name: "JavaScript", level: 75, category: "Frontend", icon: "javascript" },
        { name: "React", level: 70, category: "Frontend", icon: "react" },
        { name: "Node.js", level: 65, category: "Backend", icon: "nodejs" },
        { name: "HTML/CSS", level: 85, category: "Frontend", icon: "html" },
      ],
      projects: [
        {
          title: "Portfolio Website",
          description: "A modern and responsive portfolio website to showcase my work and skills.",
          technologies: ["Next.js", "React", "Tailwind CSS"],
          status: "completed",
          featured: true,
          startDate: new Date(),
          endDate: new Date(),
          images: [],
        },
        {
          title: "E-commerce Platform",
          description: "Full-stack e-commerce application with user authentication and payment processing.",
          technologies: ["React", "Node.js", "MongoDB", "Stripe"],
          status: "in-progress",
          featured: false,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          images: [],
        },
      ],
      socialLinks: {},
      contactInfo: { email: "", phone: "", location: "Add your location" },
      isPublished: true,
      views: 0,
      settings: { theme: "dark", layout: "standard" },
    });

    return defaultPortfolio;
  } catch (error) {
    console.error("❌ Error creating default portfolio (OAuth):", error);
    throw error;
  }
}

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await connectDB();
        const user = await User.findOne({ email: credentials?.email }).select("+password");
        if (!user) throw new Error("User not found");

        if (!user.password) {
          throw new Error("This account uses Google/GitHub sign-in. Please use that method.");
        }

        const isValid = await bcrypt.compare(credentials!.password, user.password);
        if (!isValid) throw new Error("Invalid password");
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "github") {
        await connectDB();
        const existingUser = await User.findOne({ email: user.email });

        if (!existingUser) {
          console.log("🚀 [OAuth] New user via", account.provider, "-", user.email);

          // ── يولّد username تلقائي من الاسم ──────────────────────────────
          const finalUsername = await generateUsernameFromName(user.name || "user");

          // ── ينشئ المستخدم ─────────────────────────────────────────────
          const newUser = await User.create({
            name: user.name || "New User",
            email: user.email,
            username: finalUsername,
            image: user.image || undefined,
            role: "guest",
            emailVerified: true,
            authProvider: account.provider,
          });

          console.log("✅ [OAuth] User created:", newUser._id);

          // ── ينشئ portfolio افتراضي ───────────────────────────────────
          let portfolioId = null;
          try {
            const portfolio = await createDefaultPortfolio(newUser._id, newUser.name);
            portfolioId = portfolio._id;
            console.log("✅ [OAuth] Default portfolio created:", portfolioId);
          } catch (portfolioError) {
            console.error("⚠️ [OAuth] Could not create default portfolio:", portfolioError);
          }

          // ── يولّد QR Code بنفس منطق الـ register route ──────────────────
          const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
          const portfolioUrl = portfolioId
            ? `${baseUrl}/portfolio/${portfolioId}`
            : `${baseUrl}/portfolio/${newUser._id}`;

          try {
            const qrCodeImage = await QRCode.toDataURL(portfolioUrl, {
              width: 200,
              margin: 2,
              color: { dark: "#000000", light: "#FFFFFF" },
            });

            await User.findByIdAndUpdate(newUser._id, {
              qrCode: qrCodeImage,
              qrCodeData: portfolioUrl,
            });

            console.log("✅ [OAuth] QR Code generated successfully");
          } catch (qrError) {
            console.error("❌ [OAuth] QR generation failed:", qrError);
          }
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      if (!token.role && token.email) {
        await connectDB();
        const dbUser = await User.findOne({ email: token.email }).select("role _id");
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.role = dbUser.role;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};