import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SectionImage from "../../../models/SectionImage";

export async function GET() {
  try {
    await connectDB();

    const now = new Date();

    // آخر 12 شهر للـ sparklines
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

    // دالة مساعدة: عدد الـ docs المتراكم حتى نهاية كل شهر
    const buildSparkline = async (matchExtra = {}) => {
      return Promise.all(
        months.map(({ year, month }) => {
          const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
          return SectionImage.countDocuments({
            ...matchExtra,
            createdAt: { $lte: endOfMonth },
          });
        })
      );
    };

    // الإحصائيات الأساسية
    const [total, active, inactive] = await Promise.all([
      SectionImage.countDocuments({}),
      SectionImage.countDocuments({ isActive: true }),
      SectionImage.countDocuments({ isActive: false }),
    ]);

    // recently added: آخر 7 أيام
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const recentCount = await SectionImage.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    // sparklines
    const [totalSpark, activeSpark, inactiveSpark] = await Promise.all([
      buildSparkline(),
      buildSparkline({ isActive: true }),
      buildSparkline({ isActive: false }),
    ]);

    // recent sparkline: عدد المضاف كل شهر (ليس متراكم)
    const recentSpark = await Promise.all(
      months.map(({ year, month }) => {
        const start = new Date(year, month, 1);
        const end   = new Date(year, month + 1, 0, 23, 59, 59, 999);
        return SectionImage.countDocuments({ createdAt: { $gte: start, $lte: end } });
      })
    );

    // نسبة التغيير: مقارنة الشهر الحالي بالشهر السابق
    const calcChange = (spark) => {
      const current  = spark[11];
      const previous = spark[10];
      if (!previous) return "+0%";
      const pct = ((current - previous) / previous) * 100;
      return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
    };

    return NextResponse.json({
      success: true,
      data: {
        total,
        active,
        inactive,
        recentCount,
        changes: {
          total:    calcChange(totalSpark),
          active:   calcChange(activeSpark),
          inactive: calcChange(inactiveSpark),
          recent:   calcChange(recentSpark),
        },
        sparklines: {
          total:    totalSpark,
          active:   activeSpark,
          inactive: inactiveSpark,
          recent:   recentSpark,
        },
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}