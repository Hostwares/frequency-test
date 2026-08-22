import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AccessDenied from '@/components/admin/AccessDenied';
import { hasPermission, isMasterAdmin } from '@/lib/staffRoles';

const ADMIN_ROLES = ['admin', 'master_admin'];

/**
 * Route-level RBAC guard.
 * @param {string[]|'admin'|'master'} roles - 'admin' (admin+master_admin), 'master' (master_admin only), or explicit role array. Checked against user.role AND user.admin_roles.
 * @param {string} [permission] - Optional granular permission key. When provided, grants access if the user holds that permission (or is Master Admin).
 */
export default function RoleGuard({ roles, permission, children }) {
  const allowed = roles === 'admin' ? ADMIN_ROLES : roles === 'master' ? ['master_admin'] : roles;

  const { data: user, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Master Admin always passes.
  if (isMasterAdmin(user)) return children;

  // Permission-based gate takes precedence when provided.
  if (permission) {
    return hasPermission(user, permission) ? children : <AccessDenied />;
  }

  // Role-based gate: check primary role and assigned admin roles.
  const userRoles = [user.role, ...(user.admin_roles || [])];
  const passes = allowed.some((r) => userRoles.includes(r));
  return passes ? children : <AccessDenied />;
}