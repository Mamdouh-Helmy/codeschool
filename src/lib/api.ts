import { NextResponse } from "next/server";

export function jsonSuccess(data: any = null, message: string | null = null, status = 200) {
  const payload: any = { success: true };
  if (data !== null) payload.data = data;
  if (message) payload.message = message;
  payload.timestamp = new Date().toISOString();
  return NextResponse.json(payload, { status });
}

export function jsonError(message: string = "Server error", status = 500, extra: any = {}) {
  const payload: any = { success: false, message };
  if (extra && Object.keys(extra).length) {
    Object.assign(payload, extra);
  }
  payload.timestamp = new Date().toISOString();
  return NextResponse.json(payload, { status });
}

/**
 * Small helper to build a 401 unauthorized response
 */
export function jsonUnauthorized(message = "Unauthorized") {
  return jsonError(message, 401);
}
