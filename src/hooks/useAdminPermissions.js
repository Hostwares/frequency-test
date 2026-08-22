import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const ADMIN_ROLES = ['admin', 'master_admin', 'admin_partner'];
const MASTER_ROLES = ['admin', 'master_admin'];

const ALL_PERMISSIONS = [
  'can_view_users', 'can_edit_users',
  'can_view_artists', 'can_edit_artists',
  'can_view_songs', 'can_edit_songs',
  'can_view_payments', 'can_edit_payments',
  'can_view_subscriptions', 'can_edit_subscriptions',
  'can_view_marketplace', 'can_edit_marketplace',
  'can_view_events', 'can_edit_events',
  'can_view_reports', 'can_export_reports',
  'can_view_private_radio_data',
  'can_view_legal_takedowns',
  'can_manage_support_tickets',
  'can_manage_business_partners',
];

function buildFullPermissions() {
  const obj = {};
  for (const key of ALL_PERMISSIONS) obj[key] = true;
  return obj;
}

export function useAdminPermissions() {
  const { user } = useAuth();

  const isMasterAdmin = !!user && MASTER_ROLES.includes(user.role);
  const isAdminPartner = user?.role === 'admin_partner';
  const isAdmin = !!user && ADMIN_ROLES.includes(user.role);

  const { data: partnerRecord, isLoading } = useQuery({
    queryKey: ['admin-partner-record', user?.id],
    queryFn: () => base44.entities.AdminPartner.filter({ user_id: user.id, is_active: true }),
    enabled: isAdminPartner,
    staleTime: 30000,
  });

  const partnerPermissions = partnerRecord?.[0]?.permissions || {};
  const permissions = isMasterAdmin
    ? buildFullPermissions()
    : isAdminPartner
    ? partnerPermissions
    : {};

  const hasPermission = (key) => {
    if (isMasterAdmin) return true;
    if (isAdminPartner) return !!permissions[key];
    return false;
  };

  return {
    isMasterAdmin,
    isAdminPartner,
    isAdmin,
    permissions,
    hasPermission,
    isLoading: isAdminPartner && isLoading,
  };
}