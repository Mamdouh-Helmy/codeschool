import { jsonSuccess, jsonError } from "@/lib/api";
import { ROLE_PERMISSIONS } from "@/lib/permissions";

export const revalidate = 0;

export async function GET() {
  try {
    return jsonSuccess({ roles: ROLE_PERMISSIONS, source: 'static' });
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return jsonError('Failed to fetch user roles', 500);
  }
}
