// lib/dashboard/repository.ts  (تعديل على ملفك الحالي)
import { getDatabase } from "@/lib/mongodb";
import {
  FALLBACK_DASHBOARD_SNAPSHOT,
  FALLBACK_SCHEDULE_RESPONSE,
} from "./fallbackData";
import type {
  DashboardSnapshot,
  ScheduleResponse,
} from "./types";
import { mapMongoDoc, mapMongoDocs } from "@/lib/utils";

const DASHBOARD_COLLECTION = "dashboard_snapshots";
const SCHEDULE_COLLECTION = "schedule_events";

export type RepositoryResult<T> = {
  data: T;
  source: "database" | "fallback";
};

function normalizeSnapshot(snapshot: any): DashboardSnapshot {
  if (!snapshot) return snapshot;
  // shallow map: if snapshot has top-level _id -> id
  const normalized: any = { ...snapshot };
  if (snapshot._id) normalized.id = String(snapshot._id);
  // normalize nested arrays if present (metrics, activities, enrollments, content, health)
  if (Array.isArray(snapshot.metrics)) {
    normalized.metrics = snapshot.metrics.map((m: any) => (m._id ? { ...m, id: String(m._id) } : m));
  }
  if (Array.isArray(snapshot.activities)) {
    normalized.activities = snapshot.activities.map((a: any) => (a._id ? { ...a, id: String(a._id) } : a));
  }
  if (Array.isArray(snapshot.enrollments)) {
    normalized.enrollments = snapshot.enrollments.map((e: any) => (e._id ? { ...e, id: String(e._id) } : e));
  }
  if (snapshot.content && Array.isArray(snapshot.content.items)) {
    normalized.content = { ...snapshot.content, items: snapshot.content.items.map((c: any) => (c._id ? { ...c, id: String(c._id) } : c)) };
  }
  // health cards usually simple — ensure id if present
  if (Array.isArray(snapshot.health)) {
    normalized.health = snapshot.health.map((h: any) => (h._id ? { ...h, id: String(h._id) } : h));
  }
  return normalized as DashboardSnapshot;
}

export const fetchDashboardSnapshot = async (): Promise<RepositoryResult<DashboardSnapshot>> => {
  try {
    const db = await getDatabase();
    const snapshot = await db
      .collection<DashboardSnapshot>(DASHBOARD_COLLECTION)
      .find()
      .sort({ updatedAt: -1 })
      .limit(1)
      .next();

    if (!snapshot) {
      return { data: FALLBACK_DASHBOARD_SNAPSHOT, source: "fallback" };
    }

    const normalized = normalizeSnapshot(snapshot);
    return { data: normalized, source: "database" };
  } catch (error) {
    console.error("fetchDashboardSnapshot error:", error);
    return { data: FALLBACK_DASHBOARD_SNAPSHOT, source: "fallback" };
  }
};
