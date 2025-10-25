import { UserRolePermission } from "@/lib/types";

// 🎯 Define each role's permissions
export const ROLE_PERMISSIONS: UserRolePermission[] = [
  {
    role: "admin",
    permissions: {
      blogs: { create: true, read: true, update: true, delete: true },
      projects: { create: true, read: true, update: true, delete: true },
      pricing: { create: true, read: true, update: true, delete: true },
      users: { create: true, read: true, update: true, delete: true },
    },
  },
  {
    role: "marketing",
    permissions: {
      blogs: { create: true, read: true, update: true, delete: true },
      projects: { create: false, read: true, update: false, delete: false },
      pricing: { create: false, read: true, update: false, delete: false },
      users: { create: false, read: false, update: false, delete: false },
    },
  },
  {
    role: "instructor",
    permissions: {
      blogs: { create: false, read: true, update: false, delete: false },
      projects: { create: true, read: true, update: true, delete: false },
      pricing: { create: false, read: true, update: false, delete: false },
      users: { create: false, read: false, update: false, delete: false },
    },
  },
  {
    role: "student",
    permissions: {
      blogs: { create: false, read: true, update: false, delete: false },
      projects: { create: true, read: true, update: false, delete: false },
      pricing: { create: false, read: true, update: false, delete: false },
      users: { create: false, read: false, update: false, delete: false },
    },
  },
];

/**
 * ✅ Check if a role has permission for an action
 */
export function hasPermission(
  userRole: string,
  resource: "blogs" | "projects" | "pricing" | "users",
  action: "create" | "read" | "update" | "delete"
): boolean {
  const rolePermission = ROLE_PERMISSIONS.find((r) => r.role === userRole);
  if (!rolePermission) return false;
  return rolePermission.permissions[resource][action];
}

/**
 * ✅ Get all permissions of a specific user role
 */
export function getUserPermissions(userRole: string) {
  const rolePermission = ROLE_PERMISSIONS.find((r) => r.role === userRole);
  return rolePermission?.permissions || null;
}
