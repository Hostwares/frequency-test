// Internal administrative roles & permission catalog for The Mainstream Frequency™.
// Public account roles (fan, artist, etc.) live separately on User.role / User.additional_roles.
// Administrative, financial, publishing, and verification permissions are granted SEPARATELY
// and must be recorded in the audit log.

export const ADMIN_ROLE_KEYS = [
  'master_admin',
  'co_owner',
  'operations_admin',
  'editorial_admin',
  'artist_relations_admin',
  'fan_support_admin',
  'partnership_admin',
  'finance_admin',
  'marketing_admin',
  'view_only_admin',
];

export const ADMIN_ROLES = {
  master_admin: {
    label: 'Platform Owner / Master Administrator',
    description: 'Highest-level administrative role. Full platform control. Limited to one primary account initially (enforced via masterAdminEnforcement shared module). Has access to a separate Emergency Recovery mechanism — distinct from normal login — that requires its own verification step and generates a permanent log entry every time it is used (see emergencyRecoveryAccess backend function).',
    permissions: '__all__',
    restricted: false,
  },
  co_owner: {
    label: 'Platform Co-Owner',
    description: 'Authorized owner. Up to 6 co-owner accounts are supported. Each co-owner receives an individually assigned permission scope from the seven oversight areas — no co-owner is ever granted unrestricted access automatically. Scope areas: business operations, partnerships, marketing, artist relations, finance, editorial programs, and platform development. Assignment is enforced via the coOwnerEnforcement shared module and the manageCoOwner backend function.',
    permissions: [],
    restricted: false,
  },
  operations_admin: {
    label: 'Operations Administrator',
    description: 'Daily platform management. Does NOT have authority to alter financial ledgers, ownership, or legal policies.',
    permissions: [
      'review_account_issues', 'manage_user_reports', 'approve_routine_content',
      'review_artist_verification', 'manage_communities', 'monitor_support_requests',
      'manage_consultation_waitlists', 'publish_frequency_mindset', 'review_platform_activity',
    ],
    restricted: true,
  },
  editorial_admin: {
    label: 'Editorial Administrator',
    description: 'Manages written and educational content — Frequency Mindset™, artist editorials, news, interviews, educational resources.',
    permissions: [
      'create_articles', 'edit_submitted_articles', 'save_drafts', 'schedule_posts',
      'publish_approved_content', 'manage_categories_tags', 'manage_authors',
      'archive_content', 'review_comments', 'publish_frequency_mindset',
    ],
    restricted: false,
  },
  artist_relations_admin: {
    label: 'Artist Relations Administrator',
    description: 'Supports artists and their teams. Cannot redirect fan allocations or modify artist balances.',
    permissions: [
      'review_artist_applications', 'assist_onboarding', 'review_profiles_releases',
      'respond_artist_questions', 'review_artist_verification', 'review_submission_issues',
      'setup_revenue_splits', 'escalate_financial_rights',
    ],
    restricted: true,
  },
  fan_support_admin: {
    label: 'Fan & Subscriber Support Administrator',
    description: 'Assists fans with membership, networks, playlists, purchases, unlocks, access, refunds, subscriptions, and community concerns. Financial adjustments require additional approval.',
    permissions: [
      'membership_support', 'artist_network_support', 'playlist_support',
      'song_purchase_support', 'artist_unlock_support', 'account_access_support',
      'refund_requests', 'subscription_changes', 'community_concerns',
    ],
    restricted: true,
  },
  partnership_admin: {
    label: 'Discovery & Partnership Administrator',
    description: 'Oversees discovery partners, radio/programmer verification, business partners, community partnerships, referral programs, reputation reviews, campaigns, and partner compliance.',
    permissions: [
      'discovery_partner_applications', 'radio_programmer_verification',
      'business_partner_applications', 'community_partnerships', 'referral_programs',
      'reputation_score_reviews', 'platform_campaigns', 'partner_compliance',
    ],
    restricted: false,
  },
  finance_admin: {
    label: 'Finance & Payout Administrator',
    description: 'Restricted role: subscription reconciliation, distribution records, song-purchase revenue, refunds/chargebacks, payout status, collaborator splits, reports, tax workflows, payment exceptions. Requires strong security and complete audit logging.',
    permissions: [
      'subscription_reconciliation', 'artist_distribution_records', 'song_purchase_revenue',
      'refunds_chargebacks', 'artist_payout_status', 'collaborator_split_processing',
      'financial_reports', 'tax_document_workflows', 'payment_exceptions',
    ],
    restricted: true,
  },
  marketing_admin: {
    label: 'Marketing Administrator',
    description: 'Oversees social campaigns, artist spotlights, platform promotions, Shopify campaigns, Zeely creative approvals, Metricool scheduling, marketing workflows, and campaign reporting. Cannot change artist allocations or financial balances.',
    permissions: [
      'social_campaigns', 'artist_spotlights', 'platform_promotions',
      'shopify_campaigns', 'zeely_creative_approvals', 'metricool_scheduling',
      'marketing_workflows', 'campaign_performance_reporting',
    ],
    restricted: true,
  },
  view_only_admin: {
    label: 'View-Only Sub-Administrator',
    description: 'Up to five or more sub-administrators with view-only access until additional permissions are granted by the Master Administrator. Cannot publish, alter payouts, change subscriptions, approve accounts, delete records, or modify user permissions.',
    permissions: ['view_only_dashboards'],
    restricted: true,
  },
};

// Master-Administrator-only capabilities (never granted to other roles).
export const MASTER_ONLY_PERMISSIONS = [
  'manage_permissions', 'control_financial_rules', 'manage_staff_accounts',
  'approve_legal_policy', 'view_audit_logs',
];

export const PERMISSION_CATALOG = {
  platform: {
    label: 'Platform Control',
    keys: [
      'platform_settings', 'manage_permissions', 'control_financial_rules',
      'manage_subscription_plans', 'approve_legal_policy', 'manage_integrations',
      'view_platform_analytics', 'manage_staff_accounts', 'publish_platform_content',
      'view_audit_logs', 'review_disputes', 'approve_accounts',
    ],
  },
  operations: {
    label: 'Operations',
    keys: [
      'review_account_issues', 'manage_user_reports', 'approve_routine_content',
      'review_artist_verification', 'manage_communities', 'monitor_support_requests',
      'manage_consultation_waitlists', 'publish_frequency_mindset', 'review_platform_activity',
    ],
  },
  editorial: {
    label: 'Editorial & Content',
    keys: [
      'create_articles', 'edit_submitted_articles', 'save_drafts', 'schedule_posts',
      'publish_approved_content', 'manage_categories_tags', 'manage_authors',
      'archive_content', 'review_comments',
    ],
  },
  artist_relations: {
    label: 'Artist Relations',
    keys: [
      'review_artist_applications', 'assist_onboarding', 'review_profiles_releases',
      'respond_artist_questions', 'review_submission_issues', 'setup_revenue_splits',
      'escalate_financial_rights',
    ],
  },
  fan_support: {
    label: 'Fan & Subscriber Support',
    keys: [
      'membership_support', 'artist_network_support', 'playlist_support',
      'song_purchase_support', 'artist_unlock_support', 'account_access_support',
      'refund_requests', 'subscription_changes', 'community_concerns',
    ],
  },
  partnerships: {
    label: 'Discovery & Partnerships',
    keys: [
      'discovery_partner_applications', 'radio_programmer_verification',
      'business_partner_applications', 'community_partnerships', 'referral_programs',
      'reputation_score_reviews', 'platform_campaigns', 'partner_compliance',
    ],
  },
  finance: {
    label: 'Finance & Payouts',
    keys: [
      'subscription_reconciliation', 'artist_distribution_records', 'song_purchase_revenue',
      'refunds_chargebacks', 'artist_payout_status', 'collaborator_split_processing',
      'financial_reports', 'tax_document_workflows', 'payment_exceptions',
    ],
  },
  marketing: {
    label: 'Marketing',
    keys: [
      'social_campaigns', 'artist_spotlights', 'platform_promotions',
      'shopify_campaigns', 'zeely_creative_approvals', 'metricool_scheduling',
      'marketing_workflows', 'campaign_performance_reporting',
    ],
  },
  oversight: {
    label: 'Business Oversight',
    keys: [
      'business_operations', 'partnerships', 'artist_relations', 'finance',
      'editorial_programs', 'platform_development', 'view_only_dashboards',
    ],
  },
};

export const ALL_PERMISSION_KEYS = Object.values(PERMISSION_CATALOG).flatMap((g) => g.keys);

// Default permissions suggested when a role is assigned. Master can trim individually.
export function defaultPermissionsForRole(roleKey) {
  const role = ADMIN_ROLES[roleKey];
  if (!role) return [];
  if (role.permissions === '__all__') return ALL_PERMISSION_KEYS;
  return [...role.permissions];
}

// A user holds a permission if they are master_admin OR the key is explicitly granted.
// Roles are organizational labels; granular permissions are the actual grants.
export function hasPermission(user, permissionKey) {
  if (!user) return false;
  const roles = [user.role, ...(user.admin_roles || [])];
  if (roles.includes('master_admin')) return true;
  return Array.isArray(user.admin_permissions) && user.admin_permissions.includes(permissionKey);
}

export function hasAdminRole(user, roleKey) {
  if (!user) return false;
  return user.role === roleKey || (Array.isArray(user.admin_roles) && user.admin_roles.includes(roleKey));
}

export function isMasterAdmin(user) {
  return user?.role === 'master_admin' || (Array.isArray(user?.admin_roles) && user.admin_roles.includes('master_admin'));
}

// Effective list of permission keys for display.
export function effectivePermissions(user) {
  if (!user) return [];
  if (isMasterAdmin(user)) return ALL_PERMISSION_KEYS;
  return Array.isArray(user.admin_permissions) ? user.admin_permissions : [];
}