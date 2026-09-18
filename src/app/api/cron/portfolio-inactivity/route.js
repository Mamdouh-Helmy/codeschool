// /src/app/api/cron/portfolio-inactivity/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Portfolio from "../../../models/Portfolio";
import {
  sendPortfolioMessage,
  resolveOwnerPhone,
} from "../../../services/portfolioNotifications";

const INACTIVITY_DAYS = 30;
const REMINDER_TYPE = "portfolio_inactivity_reminder";

// ✅ فك أي claim قديم اتعلق أكتر من ساعة (لو السيرفر وقع في النص)
const STALE_CLAIM_MS = 60 * 60 * 1000;

function isAuthorizedRequest(req, searchParams) {
  const authHeader = req.headers.get("authorization");
  const querySecret = searchParams.get("secret");
  return (
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    querySecret === process.env.CRON_SECRET
  );
}

// ============================================================
// ✅ Atomic Claim — يمنع التكرار حتى لو الكرون اشتغل بالتوازي
// ============================================================
async function claimInactivityReminder(portfolioId, cutoff) {
  const now = new Date();
  try {
    const claimed = await Portfolio.findOneAndUpdate(
      {
        _id: portfolioId,
        updatedAt: { $lte: cutoff },
        $or: [
          { "metadata.lastInactivityReminderSentAt": null },
          { "metadata.lastInactivityReminderSentAt": { $exists: false } },
          { "metadata.lastInactivityReminderSentAt": { $lte: cutoff } },
        ],
        // ✅ الشرط الحاسم: ميكونش فيه claim شغال دلوقتي
        "metadata.inactivityReminderStatus": { $ne: "sending" },
      },
      {
        $set: {
          "metadata.inactivityReminderStatus": "sending",
          "metadata.inactivityReminderClaimedAt": now,
        },
      },
      { new: true },
    );
    return !!claimed;
  } catch (err) {
    console.error(
      `❌ claimInactivityReminder error [${portfolioId}]:`,
      err.message,
    );
    return false;
  }
}

async function markInactivityReminderSent(portfolioId) {
  const now = new Date();
  try {
    await Portfolio.updateOne(
      { _id: portfolioId, "metadata.inactivityReminderStatus": "sending" },
      {
        $set: {
          "metadata.lastInactivityReminderSentAt": now,
          "metadata.inactivityReminderStatus": "sent",
        },
      },
    );
  } catch (err) {
    console.error(
      `⚠️ markInactivityReminderSent error [${portfolioId}]:`,
      err.message,
    );
  }
}

async function releaseInactivityReminderClaim(portfolioId) {
  try {
    await Portfolio.updateOne(
      { _id: portfolioId, "metadata.inactivityReminderStatus": "sending" },
      {
        $set: { "metadata.inactivityReminderStatus": "pending" },
        $unset: { "metadata.inactivityReminderClaimedAt": "" },
      },
    );
  } catch (err) {
    console.error(
      `⚠️ releaseInactivityReminderClaim error [${portfolioId}]:`,
      err.message,
    );
  }
}

// ============================================================
// ✅ تنظيف الـ claims القديمة (failover)
// ============================================================
async function cleanupStaleClaims() {
  try {
    const threshold = new Date(Date.now() - STALE_CLAIM_MS);
    const result = await Portfolio.updateMany(
      {
        "metadata.inactivityReminderStatus": "sending",
        "metadata.inactivityReminderClaimedAt": { $lt: threshold },
      },
      {
        $set: { "metadata.inactivityReminderStatus": "pending" },
        $unset: { "metadata.inactivityReminderClaimedAt": "" },
      },
    );
    if (result.modifiedCount > 0) {
      console.log(
        `🧹 Cleaned up ${result.modifiedCount} stale inactivity claims`,
      );
    }
  } catch (err) {
    console.error("⚠️ cleanupStaleClaims error:", err.message);
  }
}

// ============================================================
// ✅ GET — استعراض فقط
// ============================================================
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  if (!isAuthorizedRequest(req, searchParams)) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  await connectDB();

  const cutoff = new Date(
    Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000,
  );

  const portfolios = await Portfolio.find({})
    .select("userId title contactInfo updatedAt metadata")
    .populate("userId", "name email role profile gender language isActive")
    .lean();

  const details = [];
  let orphanCount = 0;

  for (const portfolio of portfolios) {
    const owner = portfolio.userId;

    if (!owner) {
      orphanCount++;
      continue;
    }

    let status;
    let reason = null;

    if (!owner.isActive) {
      status = "skipped";
      reason = "inactive_user";
    } else if (portfolio.updatedAt > cutoff) {
      status = "not_due";
    } else {
      const phone =
        owner.profile?.phone || portfolio.contactInfo?.phone || null;
      const lastSent =
        portfolio.metadata?.lastInactivityReminderSentAt || null;
      const alreadySentRecently = lastSent && new Date(lastSent) > cutoff;

      if (!phone) {
        status = "pending";
      } else if (alreadySentRecently) {
        status = "sent_recently";
      } else {
        status = "pending";
      }
    }

    details.push({
      portfolioId: portfolio._id,
      userId: owner._id,
      name: owner.name,
      email: owner.email,
      role: owner.role,
      title: portfolio.title,
      hasPhoneOnFile: !!(
        owner.profile?.phone || portfolio.contactInfo?.phone
      ),
      lastUpdatedAt: portfolio.updatedAt,
      lastReminderSentAt:
        portfolio.metadata?.lastInactivityReminderSentAt || null,
      status,
      reason,
    });
  }

  const summary = {
    total: details.length,
    sentRecently: details.filter((d) => d.status === "sent_recently").length,
    pending: details.filter((d) => d.status === "pending").length,
    notDue: details.filter((d) => d.status === "not_due").length,
    skipped: details.filter((d) => d.status === "skipped").length,
    noPhone: details.filter(
      (d) => d.status === "pending" && !d.hasPhoneOnFile,
    ).length,
    orphanCount,
  };

  return NextResponse.json({ success: true, summary, details });
}

// ============================================================
// ✅ POST — التنفيذ الفعلي (محمي بـ Atomic Claim)
// ============================================================
export async function POST(req) {
  const { searchParams } = new URL(req.url);
  if (!isAuthorizedRequest(req, searchParams)) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  await connectDB();

  // ✅ فك أي claim قديم اتعلق
  await cleanupStaleClaims();

  const cutoff = new Date(
    Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000,
  );

  const portfolios = await Portfolio.find({
    updatedAt: { $lte: cutoff },
    $or: [
      { "metadata.lastInactivityReminderSentAt": null },
      { "metadata.lastInactivityReminderSentAt": { $exists: false } },
      { "metadata.lastInactivityReminderSentAt": { $lte: cutoff } },
    ],
  }).populate("userId", "name profile gender language isActive role");

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let alreadyClaimed = 0;
  const results = [];

  for (const portfolio of portfolios) {
    const owner = portfolio.userId;

    if (!owner || !owner.isActive) {
      skipped++;
      results.push({
        portfolioId: portfolio._id,
        title: portfolio.title,
        status: "skipped",
        reason: !owner ? "orphan_portfolio" : "inactive_user",
      });
      continue;
    }

    // ✅ الحجز الـ atomic — قبل أي إرسال
    const claimed = await claimInactivityReminder(portfolio._id, cutoff);

    if (!claimed) {
      alreadyClaimed++;
      skipped++;
      results.push({
        portfolioId: portfolio._id,
        title: portfolio.title,
        status: "skipped",
        reason: "already_claimed",
      });
      continue;
    }

    const portfolioLink = `${process.env.NEXTAUTH_URL}/portfolio/${portfolio._id}`;
    const phone = await resolveOwnerPhone(owner, portfolio);

    let result;
    try {
      result = await sendPortfolioMessage(
        REMINDER_TYPE,
        owner,
        { portfolioLink },
        phone,
      );
    } catch (err) {
      result = { success: false, error: err.message };
    }

    if (result.success) {
      await markInactivityReminderSent(portfolio._id);
      sent++;
      results.push({
        portfolioId: portfolio._id,
        name: owner.name,
        status: "sent",
      });
    } else if (result.skipped) {
      // skip (زي "no phone") → نفك القفل عشان يتعالج بعدين
      await releaseInactivityReminderClaim(portfolio._id);
      skipped++;
      results.push({
        portfolioId: portfolio._id,
        name: owner.name,
        status: "skipped",
        reason: result.reason,
      });
    } else {
      // فشل فعلي → نفك القفل عشان retry
      await releaseInactivityReminderClaim(portfolio._id);
      failed++;
      results.push({
        portfolioId: portfolio._id,
        name: owner.name,
        status: "failed",
        error: result.error,
      });
    }
  }

  return NextResponse.json({
    success: true,
    checked: portfolios.length,
    sent,
    skipped,
    failed,
    alreadyClaimed,
    results,
  });
}