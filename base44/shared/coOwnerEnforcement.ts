/**
 * Platform Co-Owner enforcement — ensures at most 6 co_owner accounts exist,
 * and that each co-owner's permission scope is individually assigned from the
 * seven approved oversight areas. No co-owner ever receives unrestricted access.
 *
 * The limit is stored as a PlatformSetting record (key: co_owner_max_accounts)
 * so it can be raised later without a code change. Until such a setting exists,
 * the default of 6 is used.
 */

const CO_OWNER_MAX_SETTING_KEY = "co_owner_max_accounts";
const DEFAULT_CO_OWNER_MAX = 6;

/**
 * The seven scope areas a co-owner may be granted. Each maps to a set of
 * permission keys from the platform permission catalog. A co-owner's scope
 * is a subset of these — never "all" and never the master-admin-only keys.
 */
export const CO_OWNER_SCOPE_AREAS = {
  business_operations: {
    label: "Business Operations",
    description: "Day-to-day business oversight, operational decisions, and platform activity review.",
    permission_keys: [
      "business_operations",
      "review_platform_activity",
      "view_only_dashboards",
    ],
  },
  partnerships: {
    label: "Partnerships",
    description: "Discovery partners, radio/programmer verification, business partners, and partner compliance.",
    permission_keys: [
      "partnerships",
      "discovery_partner_applications",
      "radio_programmer_verification",
      "business_partner_applications",
      "community_partnerships",
      "referral_programs",
      "reputation_score_reviews",
      "platform_campaigns",
      "partner_compliance",
    ],
  },
  marketing: {
    label: "Marketing",
    description: "Social campaigns, artist spotlights, platform promotions, and marketing workflows.",
    permission_keys: [
      "social_campaigns",
      "artist_spotlights",
      "platform_promotions",
      "shopify_campaigns",
      "zeely_creative_approvals",
      "metricool_scheduling",
      "marketing_workflows",
      "campaign_performance_reporting",
    ],
  },
  artist_relations: {
    label: "Artist Relations",
    description: "Artist applications, onboarding, profiles/releases, and artist questions.",
    permission_keys: [
      "artist_relations",
      "review_artist_applications",
      "assist_onboarding",
      "review_profiles_releases",
      "respond_artist_questions",
      "review_submission_issues",
      "setup_revenue_splits",
      "escalate_financial_rights",
    ],
  },
  finance: {
    label: "Finance",
    description: "Subscription reconciliation, distribution records, payouts, collaborator splits, and financial reports.",
    permission_keys: [
      "finance",
      "subscription_reconciliation",
      "artist_distribution_records",
      "song_purchase_revenue",
      "refunds_chargebacks",
      "artist_payout_status",
      "collaborator_split_processing",
      "financial_reports",
      "tax_document_workflows",
      "payment_exceptions",
    ],
  },
  editorial_programs: {
    label: "Editorial Programs",
    description: "Articles, drafts, scheduling, categories/tags, authors, and content publishing.",
    permission_keys: [
      "editorial_programs",
      "create_articles",
      "edit_submitted_articles",
      "save_drafts",
      "schedule_posts",
      "publish_approved_content",
      "manage_categories_tags",
      "manage_authors",
      "archive_content",
      "review_comments",
      "publish_frequency_mindset",
    ],
  },
  platform_development: {
    label: "Platform Development",
    description: "Platform settings, integrations, analytics, and technical roadmap oversight.",
    permission_keys: [
      "platform_development",
      "platform_settings",
      "manage_integrations",
      "view_platform_analytics",
    ],
  },
} as const;

export type ScopeAreaKey = keyof typeof CO_OWNER_SCOPE_AREAS;

export const ALL_SCOPE_AREA_KEYS = Object.keys(CO_OWNER_SCOPE_AREAS) as ScopeAreaKey[];

/** Flatten all permission keys that a co-owner is ever allowed to hold. */
export const CO_OWNER_ALLOWED_PERMISSIONS: string[] = ALL_SCOPE_AREA_KEYS.flatMap(
  (k) => CO_OWNER_SCOPE_AREAS[k].permission_keys
);

/** Master-admin-only keys that a co-owner must NEVER hold. */
export const MASTER_ONLY_PERMISSIONS = [
  "manage_permissions",
  "control_financial_rules",
  "manage_staff_accounts",
  "approve_legal_policy",
  "view_audit_logs",
];

export async function getCoOwnerMax(base44: any): Promise<number> {
  const settings = await base44.asServiceRole.entities.PlatformSetting.filter({
    key: CO_OWNER_MAX_SETTING_KEY,
  });
  const val = settings?.[0]?.value;
  if (val !== undefined && val !== null) {
    const parsed = parseInt(String(val), 10);
    if (!isNaN(parsed) && parsed >= 1) return parsed;
  }
  return DEFAULT_CO_OWNER_MAX;
}

/**
 * Count how many users currently hold the co_owner admin role.
 */
export async function countCoOwners(base44: any): Promise<number> {
  const coOwners = await base44.asServiceRole.entities.User.filter({
    admin_roles: "co_owner",
  });
  return coOwners.length;
}

/**
 * Throws if assigning co_owner to userId would exceed the 6-account limit.
 * Does not double-count a user who already holds the role.
 */
export async function assertCanAssignCoOwner(base44: any, userId: string): Promise<void> {
  const max = await getCoOwnerMax(base44);
  const existing = await countCoOwners(base44);

  const target = await base44.asServiceRole.entities.User.filter({ id: userId });
  const targetRoles = target?.[0]?.admin_roles || [];
  const isAlreadyCoOwner = targetRoles.includes("co_owner");

  const effectiveCount = isAlreadyCoOwner ? existing - 1 : existing;
  if (effectiveCount + 1 > max) {
    throw new Error(
      `Cannot assign co_owner: limit of ${max} co-owner account(s) reached. ` +
        `Current count: ${existing}. Raise the limit via PlatformSetting "${CO_OWNER_MAX_SETTING_KEY}" if additional co-owners are needed.`
    );
  }
}

/**
 * Validate a proposed set of permissions for a co-owner. Ensures:
 * - No unrestricted ('__all__') access
 * - No master-admin-only keys
 * - All keys belong to one of the seven approved scope areas
 */
export function validateCoOwnerScope(permissions: string[]): { valid: boolean; invalid: string[] } {
  if (!Array.isArray(permissions)) return { valid: false, invalid: [] };
  const set = new Set(permissions);
  const invalid: string[] = [];

  for (const key of set) {
    if (!CO_OWNER_ALLOWED_PERMISSIONS.includes(key)) {
      invalid.push(key);
    }
  }
  return { valid: invalid.length === 0, invalid };
}

/**
 * Given a set of scope area keys, return the flattened permission keys.
 */
export function permissionsForScopeAreas(areaKeys: ScopeAreaKey[]): string[] {
  const valid = (areaKeys || []).filter((k) => ALL_SCOPE_AREA_KEYS.includes(k));
  const perms = valid.flatMap((k) => CO_OWNER_SCOPE_AREAS[k].permission_keys);
  return Array.from(new Set(perms));
}

/**
 * Given a list of permission keys, infer which scope areas are active.
 */
export function scopeAreasFromPermissions(permissions: string[]): ScopeAreaKey[] {
  const permSet = new Set(permissions || []);
  return ALL_SCOPE_AREA_KEYS.filter((areaKey) =>
    CO_OWNER_SCOPE_AREAS[areaKey].permission_keys.some((p) => permSet.has(p))
  );
}