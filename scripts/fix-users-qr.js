// scripts/fix-users-qr.js
import { connectDB } from '@/lib/mongodb';
import User from '@/app/models/User';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SIGN_SECRET || "change_this";

async function fixUsersQR() {
  try {
    await connectDB();
    
    console.log("🔧 Starting QR code fix for all users...");
    
    // جلب جميع المستخدمين
    const allUsers = await User.find({});
    
    console.log(`📝 Found ${allUsers.length} users`);

    for (const user of allUsers) {
      try {
        console.log(`\n🔄 Processing user: ${user.email}`);
        console.log(`   Current QR: ${user.qrCode ? "EXISTS" : "NULL"}`);
        console.log(`   Current QR Data: ${user.qrCodeData ? "EXISTS" : "NULL"}`);
        
        // إذا المستخدم عنده QR Code مخلّص، سيبيه
        if (user.qrCode && user.qrCodeData) {
          console.log(`   ✅ User already has QR code, skipping...`);
          continue;
        }

        // توليد QR Code جديد
        const qrData = {
          userId: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          timestamp: new Date().toISOString()
        };

        const qrToken = jwt.sign(qrData, JWT_SECRET, { expiresIn: "1y" });
        const qrCodeImage = await QRCode.toDataURL(qrToken, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        // تحديث المستخدم
        user.qrCode = qrCodeImage;
        user.qrCodeData = qrToken;
        await user.save();

        console.log(`   ✅ QR code generated and saved for: ${user.email}`);
        
      } catch (userError) {
        console.error(`   ❌ Failed for ${user.email}:`, userError);
      }
    }

    console.log("\n🎉 Finished fixing all users!");
    
  } catch (error) {
    console.error("💥 Script error:", error);
  } finally {
    process.exit(0);
  }
}

// تشغيل السكريبت
fixUsersQR();