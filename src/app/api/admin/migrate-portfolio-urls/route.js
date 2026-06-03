// app/api/admin/migrate-portfolio-urls/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "../../../models/User";
import QRCode from "qrcode";
import { requireAdmin } from "@/utils/authMiddleware";

export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const users = await User.find({
      qrCodeData: { $exists: true, $ne: "" },
    }).select("_id username qrCodeData");

    let updated = 0;
    let skipped = 0;
    const results = [];

    for (const user of users) {
      const correctUrl = `${baseUrl}/portfolio/${user._id}`;

      if (user.qrCodeData === correctUrl) {
        skipped++;
        continue;
      }

      let newQrCode = "";
      try {
        newQrCode = await QRCode.toDataURL(correctUrl, {
          width: 200,
          margin: 2,
          color: { dark: "#000000", light: "#FFFFFF" },
        });
      } catch (e) {
        console.error(`QR failed for ${user._id}:`, e);
      }

      await User.findByIdAndUpdate(user._id, {
        qrCodeData: correctUrl,
        qrCode: newQrCode,
      });

      updated++;
      results.push({
        id: user._id,
        username: user.username,
        oldUrl: user.qrCodeData,
        newUrl: correctUrl,
      });
    }

    return NextResponse.json({
      success: true,
      updated,
      skipped,
      total: users.length,
      results,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}