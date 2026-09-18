// app/api/geocode/route.js
// بروكسي جيوكودينج باستخدام LocationIQ (بديل موثوق لـ Nominatim/Photon اللي
// بيحظروا طلبات الاستضافات المشتركة/الديتاسنتر بصمت — بيرجعوا نتايج فاضية
// من غير خطأ واضح، فبيبان وكأن "مفيش نتائج" وهو في الحقيقة الطلب اتحظر).
//
//   GET /api/geocode?q=مدينة نصر          → بحث / autocomplete
//   GET /api/geocode?lat=30.06&lng=31.33  → reverse geocoding
//
// محتاج تسجّل حساب مجاني على https://locationiq.com وتحط التوكن في:
//   LOCATIONIQ_TOKEN=pk.xxxxxxxx

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = process.env.LOCATIONIQ_TOKEN;

// bbox مصر (left,top,right,bottom = lon_min,lat_max,lon_max,lat_min)
const EG_VIEWBOX = "24.7,31.7,36.9,22.0";

const CACHE = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 6;
const CACHE_MAX = 500;

function cacheGet(key) {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL) { CACHE.delete(key); return null; }
  return hit.data;
}
function cacheSet(key, data) {
  if (CACHE.size >= CACHE_MAX) CACHE.delete(CACHE.keys().next().value);
  CACHE.set(key, { at: Date.now(), data });
}

async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    if (!res.ok) {
      // بنطبع الخطأ الحقيقي في اللوج بدل ما نبلعه
      console.error("[geocode] LocationIQ error", res.status, text.slice(0, 300));
      throw new Error(`http_${res.status}`);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

function autocompleteUrl(q) {
  return `https://api.locationiq.com/v1/autocomplete` +
    `?key=${TOKEN}&q=${encodeURIComponent(q)}&format=json&limit=8` +
    `&accept-language=ar&countrycodes=eg`;
}

function reverseUrl(lat, lng) {
  return `https://us1.locationiq.com/v1/reverse` +
    `?key=${TOKEN}&lat=${lat}&lon=${lng}&format=json&accept-language=ar`;
}

// ✏️ تعديل 1: normalize بقت بتاخد idx وبتبني id مركّب من place_id + lat + lng + idx
// عشان تضمن التفرد حتى لو LocationIQ رجّع نفس place_id لمكانين مختلفين.
function normalize(r, idx = 0) {
  const a = r.address || {};
  const placeName =
    a.name || a.amenity || a.building || a.office || a.shop ||
    a.suburb || a.neighbourhood || a.road ||
    a.city || a.town || a.village ||
    r.display_name?.split(",")[0] || "";
  const lat = parseFloat(r.lat);
  const lng = parseFloat(r.lon);
  return {
    id: `l-${r.place_id ?? "x"}-${lat?.toFixed(5)}-${lng?.toFixed(5)}-${idx}`,
    lat,
    lng,
    placeName,
    country: a.country || "",
    address: r.display_name || "",
  };
}

export async function GET(req) {
  if (!TOKEN) {
    console.error("[geocode] LOCATIONIQ_TOKEN مش متضاف في .env");
    return NextResponse.json(
      { success: false, error: "missing_token", message: "LOCATIONIQ_TOKEN غير موجود في متغيرات البيئة" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  // ── reverse ──
  if (lat && lng) {
    const key = `r:${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
    const cached = cacheGet(key);
    if (cached) return NextResponse.json({ success: true, data: cached, cached: true });

    try {
      const raw = await fetchJson(reverseUrl(lat, lng));
      const data = normalize(raw); // نتيجة واحدة بس، مفيهاش تكرار أصلاً
      cacheSet(key, data);
      return NextResponse.json({ success: true, data });
    } catch (err) {
      return NextResponse.json(
        { success: false, error: "reverse_failed", message: String(err?.message || err) },
        { status: 502 }
      );
    }
  }

  // ── search / autocomplete ──
  if (!q || q.length < 2) {
    return NextResponse.json({ success: true, data: [] });
  }

  const key = `s:${q.toLowerCase()}`;
  const cached = cacheGet(key);
  if (cached) return NextResponse.json({ success: true, data: cached, cached: true });

  try {
    const raw = await fetchJson(autocompleteUrl(q));
    const list = Array.isArray(raw) ? raw : [];

    // ✏️ تعديل 2: بنمرر idx لـ normalize، وبعدين بنعمل dedupe بالإحداثيات
    // (4 خانات عشرية) عشان منعرضش نفس المكان مرتين في نتايج البحث.
    const seen = new Set();
    const data = list
      .map((r, idx) => normalize(r, idx))
      .filter((x) => x.placeName && Number.isFinite(x.lat) && Number.isFinite(x.lng))
      .filter((x) => {
        const coordKey = `${x.lat.toFixed(4)},${x.lng.toFixed(4)}`;
        if (seen.has(coordKey)) return false;
        seen.add(coordKey);
        return true;
      })
      .slice(0, 10);

    cacheSet(key, data);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    // 404 من LocationIQ معناه "مفيش نتايج" فعلاً مش عطل في الخدمة
    if (String(err?.message).includes("http_404")) {
      return NextResponse.json({ success: true, data: [] });
    }
    return NextResponse.json(
      { success: false, error: "geocoder_unavailable", message: String(err?.message || err) },
      { status: 502 }
    );
  }
}