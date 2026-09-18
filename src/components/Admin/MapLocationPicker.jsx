"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import "leaflet/dist/leaflet.css";
import {
  MapPin, Search, X, LocateFixed, Loader2, Building2, Globe2,
  AlertCircle, RotateCcw, Link2,
} from "lucide-react";

// نحمّل leaflet مرة واحدة بس (client-side)
let leafletPromise = null;
function loadLeaflet() {
  if (leafletPromise) return leafletPromise;
  leafletPromise = import("leaflet").then((L) => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
    return L;
  });
  return leafletPromise;
}

const DEFAULT_CENTER = [30.0444, 31.2357]; // القاهرة كنقطة بداية
const DEFAULT_ZOOM = 6;

async function geocodeSearch(query, signal) {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "search failed");
  return json.data || [];
}

async function geocodeReverse(lat, lng, signal) {
  const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`, { signal });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "reverse failed");
  return json.data;
}

// ─── لصق إحداثيات أو لينك جوجل مابس ───────────────────────────────────────────
function parseCoordsInput(raw) {
  if (!raw) return null;
  const text = raw.trim();

  const atMatch = text.match(/@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

  const dMatch = text.match(/!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/);
  if (dMatch) return { lat: parseFloat(dMatch[1]), lng: parseFloat(dMatch[2]) };

  const qMatch = text.match(/[?&](?:q|query|ll|destination)=(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

  const plain = text.match(/^(-?\d{1,2}\.\d{3,})\s*[,\s]\s*(-?\d{1,3}\.\d{3,})$/);
  if (plain) return { lat: parseFloat(plain[1]), lng: parseFloat(plain[2]) };

  return null;
}

function isShortMapsLink(raw) {
  return /(?:goo\.gl\/maps|maps\.app\.goo\.gl)/i.test(raw || "");
}

export default function MapLocationPicker({ value, onChange, t }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const wrapperRef = useRef(null);

  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [geoError, setGeoError] = useState("");

  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  // ✅ رقم متزايد لكل بحث، عشان لو رد قديم رجع متأخر بعد رد أحدث منه
  // (حتى لو الـ abort نفسه اتأخر شوية) منستخدمش نتيجته.
  const searchSeqRef = useRef(0);

  const handlePickCoords = useCallback(async (lat, lng) => {
    const current = valueRef.current || {};
    try {
      const picked = await geocodeReverse(lat, lng);
      onChangeRef.current({ ...current, ...picked, id: undefined });
    } catch {
      onChangeRef.current({ ...current, lat, lng });
    }
  }, []);

  // ── تهيئة الماب مرة واحدة ──
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !mapContainerRef.current || mapRef.current) return;

      const v = valueRef.current;
      const startCenter = v?.lat && v?.lng ? [v.lat, v.lng] : DEFAULT_CENTER;
      const startZoom = v?.lat ? 15 : DEFAULT_ZOOM;

      const map = L.map(mapContainerRef.current, { center: startCenter, zoom: startZoom });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const marker = L.marker(startCenter, { draggable: true }).addTo(map);
      if (!v?.lat) marker.setOpacity(0);

      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        marker.setOpacity(1);
        handlePickCoords(lat, lng);
      });

      map.on("click", (e) => {
        marker.setLatLng(e.latlng);
        marker.setOpacity(1);
        handlePickCoords(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
      setReady(true);
    });

    return () => {
      cancelled = true;
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [handlePickCoords]);

  useEffect(() => {
    if (!ready || !mapRef.current || !markerRef.current) return;
    if (value?.lat && value?.lng) {
      mapRef.current.setView([value.lat, value.lng], 15);
      markerRef.current.setLatLng([value.lat, value.lng]);
      markerRef.current.setOpacity(1);
    }
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onDocDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowResults(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const moveTo = (lat, lng, zoom = 16) => {
    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([lat, lng], zoom);
      markerRef.current.setLatLng([lat, lng]);
      markerRef.current.setOpacity(1);
    }
  };

  const runSearch = useCallback(async (q) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const mySeq = ++searchSeqRef.current;

    setSearching(true);
    setSearchError(false);
    setShowResults(true);

    try {
      const data = await geocodeSearch(q, controller.signal);
      // ✅ لو فيه بحث أحدث بدأ بعد ده، تجاهل النتيجة القديمة حتى لو وصلت
      if (mySeq !== searchSeqRef.current) return;
      if (controller.signal.aborted) return;
      setResults(data);
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (mySeq !== searchSeqRef.current) return;
      setResults([]);
      setSearchError(true);
    } finally {
      if (mySeq === searchSeqRef.current) setSearching(false);
    }
  }, []);

  const handleQueryChange = (v) => {
    setQuery(v);
    setGeoError("");
    clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    const trimmed = v.trim();

    const coords = parseCoordsInput(trimmed);
    if (coords) {
      setResults([]); setShowResults(false); setSearching(false); setSearchError(false);
      moveTo(coords.lat, coords.lng, 17);
      handlePickCoords(coords.lat, coords.lng);
      setQuery("");
      return;
    }

    if (isShortMapsLink(trimmed)) {
      setResults([]); setShowResults(false); setSearching(false);
      setGeoError(
        t("groups.form.shortLinkHint") ||
        "اللينك المختصر مش بينفع — افتحه في جوجل مابس، وبعدين انسخ اللينك الطويل من شريط العنوان أو انسخ الإحداثيات والزقهم هنا."
      );
      return;
    }

    if (trimmed.length < 2) {
      setResults([]); setShowResults(false); setSearching(false); setSearchError(false);
      return;
    }

    debounceRef.current = setTimeout(() => runSearch(trimmed), 350);
  };

  const handleSelectResult = (picked) => {
    const { id, ...rest } = picked;
    onChange({ ...value, ...rest });
    setQuery(""); setResults([]); setShowResults(false);
    moveTo(picked.lat, picked.lng, 16);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        moveTo(latitude, longitude, 16);
        await handlePickCoords(latitude, longitude);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === 1
            ? (t("groups.form.geoDenied") || "مرفوض الوصول للموقع — فعّل الإذن من إعدادات المتصفح.")
            : (t("groups.form.geoFailed") || "مقدرناش نجيب موقعك الحالي — حدد المكان يدويًا على الماب.")
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const clearLocation = () => {
    onChange({ lat: null, lng: null, placeName: "", country: "", address: "", extraDetails: value?.extraDetails || "" });
    if (markerRef.current) markerRef.current.setOpacity(0);
  };

  return (
    <div className="space-y-3">
      {/* البحث — isolate + z عالية عشان تضمن ظهورها فوق طبقات Leaflet الداخلية */}
      <div className="relative isolate z-[60]" ref={wrapperRef}>
        <Search className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              clearTimeout(debounceRef.current);
              if (query.trim().length >= 2) runSearch(query.trim());
            }
            if (e.key === "Escape") setShowResults(false);
          }}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={t("groups.form.locationSearchPlaceholder") || "دور على مكان، أو الزق لينك/إحداثيات من جوجل مابس"}
          className="w-full ps-9 pe-10 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-xl bg-white dark:bg-dark_input dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm"
        />
        <button type="button" onClick={handleLocateMe}
          title={t("groups.form.useMyLocation") || "استخدم موقعي الحالي"}
          className="absolute top-1/2 -translate-y-1/2 end-2 w-7 h-7 rounded-lg flex items-center justify-center text-primary hover:bg-primary/10 transition-colors">
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
        </button>

        {showResults && (
          <div className="absolute top-full start-0 end-0 z-[70] mt-1.5 bg-white dark:bg-darkmode border border-PowderBlueBorder dark:border-dark_border rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
            {searching ? (
              <div className="p-3 text-xs text-gray-400 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />{t("groups.form.searching") || "بيدور..."}
              </div>
            ) : searchError ? (
              <div className="p-3 space-y-2">
                <p className="text-xs text-orange-coral flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  {t("groups.form.searchFailed") || "خدمة البحث مش راضية ترد دلوقتي. جرب تاني بعد ثانية."}
                </p>
                <button type="button" onClick={() => runSearch(query.trim())}
                  className="text-xs text-primary flex items-center gap-1.5 hover:underline">
                  <RotateCcw className="w-3 h-3" />{t("common.retry") || "إعادة المحاولة"}
                </button>
              </div>
            ) : results.length === 0 ? (
              <div className="p-3 space-y-1.5">
                <p className="text-xs text-gray-400">
                  {t("groups.form.noResults") || "مفيش نتائج بالاسم ده"}
                </p>
                <p className="text-[11px] text-SlateBlueText dark:text-darktext flex items-start gap-1.5 leading-relaxed">
                  <Link2 className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  {t("groups.form.noResultsHint") ||
                    "أماكن كتير في مصر مش متسجلة في الخريطة المفتوحة. افتح المكان في جوجل مابس، انسخ اللينك الطويل أو الإحداثيات، والزقهم في نفس الخانة دي — أو دوس على الماب تحت مباشرة."}
                </p>
              </div>
            ) : (
              results.map((r) => (
                <button key={r.id} type="button" onClick={() => handleSelectResult(r)}
                  className="w-full text-start p-2.5 hover:bg-IcyBreeze dark:hover:bg-dark_input transition-colors flex items-start gap-2 border-b border-PowderBlueBorder/50 dark:border-dark_border/50 last:border-0">
                  <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-MidnightNavyText dark:text-white truncate">{r.placeName}</span>
                    <span className="block text-[11px] text-gray-400 dark:text-darksubtle leading-relaxed">{r.address}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {geoError && (
        <p className="text-[11px] text-orange-coral flex items-start gap-1.5 leading-relaxed">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{geoError}
        </p>
      )}

      {/* الماب — z-0 صريح عشان مايتنافسش أبدًا مع قائمة النتائج فوق */}
      <div className="relative z-0 rounded-2xl overflow-hidden border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div ref={mapContainerRef} className="w-full h-64 sm:h-80 bg-IcyBreeze dark:bg-dark_input" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-IcyBreeze dark:bg-dark_input">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        )}
        <div className="absolute bottom-2 start-2 bg-white/90 dark:bg-darkmode/90 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] text-SlateBlueText dark:text-darktext shadow-sm">
          {t("groups.form.mapHint") || "دوس على الماب أو اسحب الدبوس لتحديد المكان بالظبط"}
        </div>
      </div>

      {/* كارت المكان المختار */}
      {value?.placeName || value?.lat ? (
        <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-primary/25 dark:border-primary/30 bg-gradient-to-br from-IcyBreeze to-PaleCyan dark:from-primary/10 dark:to-orange-deep/10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-deep flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-MidnightNavyText dark:text-white truncate">
              {value.placeName || t("groups.form.unnamedPlace") || "مكان بدون اسم"}
            </p>
            {value.country && (
              <p className="text-xs text-SlateBlueText dark:text-darktext flex items-center gap-1 mt-0.5">
                <Globe2 className="w-3 h-3" />{value.country}
              </p>
            )}
            {value.address && (
              <p className="text-[11px] text-gray-400 dark:text-darksubtle mt-1 truncate">{value.address}</p>
            )}
            {value.lat && value.lng && (
              <p className="text-[10px] text-gray-400 dark:text-darksubtle mt-0.5 font-mono" dir="ltr">
                {Number(value.lat).toFixed(5)}, {Number(value.lng).toFixed(5)}
              </p>
            )}
          </div>
          <button type="button" onClick={clearLocation}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-orange-coral hover:bg-orange-coral/10 transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="p-3 rounded-2xl border border-dashed border-PowderBlueBorder dark:border-dark_border text-center text-xs text-gray-400 dark:text-darksubtle">
          {t("groups.form.noLocationYet") || "لسه معملتش تحديد للمكان — دور بالبحث، أو الزق لينك جوجل مابس، أو دوس على الماب"}
        </div>
      )}

      {/* تفاصيل إضافية */}
      <div>
        <label className="block text-13 font-semibold text-MidnightNavyText dark:text-white mb-1.5">
          {t("groups.form.locationExtraDetails") || "تفاصيل إضافية (اختياري)"}
        </label>
        <input
          type="text"
          value={value?.extraDetails || ""}
          onChange={(e) => onChange({ ...value, extraDetails: e.target.value })}
          placeholder={t("groups.form.locationExtraDetailsPlaceholder") || "مثال: الدور التالت — قاعة 2"}
          className="w-full px-3.5 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary dark:bg-dark_input dark:text-white placeholder:text-gray-400 dark:placeholder:text-darksubtle text-sm transition-all shadow-sm"
        />
      </div>
    </div>
  );
}