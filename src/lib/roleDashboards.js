import { isMasterAdmin } from '@/lib/staffRoles';

// Maps each public-facing role to its default dashboard path.
const PUBLIC_ROLE_DASHBOARD = {
  fan: '/fan-dashboard',
  artist: '/artist-dashboard',
  discovery_partner: '/discovery-partner-dashboard',
  radio_programmer: '/radio-programmer-dashboard',
  business_partner: '/business-partner-dashboard',
  professional_consultant: '/fan-dashboard',
  community_manager: '/fan-dashboard',
  frequency_community: '/fan-dashboard',
  admin_partner: '/admin-partner-dashboard',
};

// Maps each internal admin role (stored in user.admin_roles) to its default dashboard.
const ADMIN_ROLE_DASHBOARD = {
  master_admin: '/platform-operations',
  co_owner: '/platform-operations',
  operations_admin: '/platform-operations',
  editorial_admin: '/journalist-portal',
  artist_relations_admin: '/platform-operations',
  fan_support_admin: '/platform-operations',
  partnership_admin: '/platform-operations',
  finance_admin: '/platform-operations',
  marketing_admin: '/platform-operations',
  view_only_admin: '/platform-operations',
};

// Dashboard metadata for the switcher.
const DASHBOARD_META = {
  '/fan-dashboard': { label: 'Fan Dashboard' },
  '/artist-dashboard': { label: 'Artist Dashboard' },
  '/discovery-partner-dashboard': { label: 'Discovery Dashboard' },
  '/radio-programmer-dashboard': { label: 'Radio Portal' },
  '/business-partner-dashboard': { label: 'Partner Dashboard' },
  '/platform-operations': { label: 'Platform Operations' },
  '/journalist-portal': { label: 'Editorial Portal' },
  '/admin-partner-dashboard': { label: 'Admin Partner Dashboard' },
  '/collaborator-dashboard': { label: 'Collaborator Dashboard' },
  '/wallet': { label: 'Wallet' },
};

/**
 * Returns the dashboard path the given user should land on after login.
 * Priority: admin_roles (most specific) → primary role → fallback to fan dashboard.
 */
export function getRoleDashboard(user) {
  if (!user) return '/';

  // Check admin roles first (more specific routing)
  const adminRoles = user.admin_roles || [];
  for (const role of adminRoles) {
    if (ADMIN_ROLE_DASHBOARD[role]) return ADMIN_ROLE_DASHBOARD[role];
  }

  // Check primary role
  if (user.role === 'master_admin' || user.role === 'admin') return '/platform-operations';
  if (PUBLIC_ROLE_DASHBOARD[user.role]) return PUBLIC_ROLE_DASHBOARD[user.role];

  return '/fan-dashboard';
}

/**
 * Returns all dashboards the user has access, for the switcher.
 * Includes admin dashboards (based on admin_roles or legacy admin role)
 * and public role dashboards (based on primary + additional roles).
 */
export function getAvailableDashboards(user) {
  if (!user) return [];

  const dashboards = [];
  const seen = new Set();

  function add(path, roleLabel) {
    if (!path || seen.has(path)) return;
    seen.add(path);
    const meta = DASHBOARD_META[path] || { label: path };
    dashboards.push({ path, label: meta.label, roleLabel });
  }

  // Admin dashboards
  if (isMasterAdmin(user) || user.role === 'admin') {
    add('/platform-operations', 'Admin');
  }

  const adminRoles = user.admin_roles || [];
  for (const role of adminRoles) {
    const path = ADMIN_ROLE_DASHBOARD[role];
    if (path) add(path, role);
  }

  // Admin partner
  if (user.role === 'admin_partner') {
    add('/admin-partner-dashboard', 'Admin Partner');
  }

  // Public role dashboards
  const publicRoles = [];
  if (user.role && !['admin', 'master_admin'].includes(user.role)) {
    publicRoles.push(user.role);
  }
  if (Array.isArray(user.additional_roles)) {
    publicRoles.push(...user.additional_roles);
  }

  for (const role of publicRoles) {
    const path = PUBLIC_ROLE_DASHBOARD[role];
    if (path) add(path, role);
  }

  // Collaborator dashboard for fan/artist
  if (publicRoles.includes('fan') || publicRoles.includes('artist')) {
    add('/collaborator-dashboard', 'Collaborator');
  }

  return dashboards;
}