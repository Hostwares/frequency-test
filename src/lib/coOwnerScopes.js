// Frontend scope-area definitions for Platform Co-Owner management.
// Mirrors the backend coOwnerEnforcement.ts so the UI can render
// scope toggles and show what each area grants.

export const CO_OWNER_SCOPE_AREAS = {
  business_operations: {
    label: 'Business Operations',
    description: 'Day-to-day business oversight, operational decisions, and platform activity review.',
    permission_keys: [
      'business_operations',
      'review_platform_activity',
      'view_only_dashboards',
    ],
  },
  partnerships: {
    label: 'Partnerships',
    description: 'Discovery partners, radio/programmer verification, business partners, and partner compliance.',
    permission_keys: [
      'partnerships',
      'discovery_partner_applications',
      'radio_programmer_verification',
      'business_partner_applications',
      'community_partnerships',
      'referral_programs',
      'reputation_score_reviews',
      'platform_campaigns',
      'partner_compliance',
    ],
  },
  marketing: {
    label: 'Marketing',
    description: 'Social campaigns, artist spotlights, platform promotions, and marketing workflows.',
    permission_keys: [
      'social_campaigns',
      'artist_spotlights',
      'platform_promotions',
      'shopify_campaigns',
      'zeely_creative_approvals',
      'metricool_scheduling',
      'marketing_workflows',
      'campaign_performance_reporting',
    ],
  },
  artist_relations: {
    label: 'Artist Relations',
    description: 'Artist applications, onboarding, profiles/releases, and artist questions.',
    permission_keys: [
      'artist_relations',
      'review_artist_applications',
      'assist_onboarding',
      'review_profiles_releases',
      'respond_artist_questions',
      'review_submission_issues',
      'setup_revenue_splits',
      'escalate_financial_rights',
    ],
  },
  finance: {
    label: 'Finance',
    description: 'Subscription reconciliation, distribution records, payouts, collaborator splits, and financial reports.',
    permission_keys: [
      'finance',
      'subscription_reconciliation',
      'artist_distribution_records',
      'song_purchase_revenue',
      'refunds_chargebacks',
      'artist_payout_status',
      'collaborator_split_processing',
      'financial_reports',
      'tax_document_workflows',
      'payment_exceptions',
    ],
  },
  editorial_programs: {
    label: 'Editorial Programs',
    description: 'Articles, drafts, scheduling, categories/tags, authors, and content publishing.',
    permission_keys: [
      'editorial_programs',
      'create_articles',
      'edit_submitted_articles',
      'save_drafts',
      'schedule_posts',
      'publish_approved_content',
      'manage_categories_tags',
      'manage_authors',
      'archive_content',
      'review_comments',
      'publish_frequency_mindset',
    ],
  },
  platform_development: {
    label: 'Platform Development',
    description: 'Platform settings, integrations, analytics, and technical roadmap oversight.',
    permission_keys: [
      'platform_development',
      'platform_settings',
      'manage_integrations',
      'view_platform_analytics',
    ],
  },
};

export const SCOPE_AREA_KEYS = Object.keys(CO_OWNER_SCOPE_AREAS);

export function scopeAreasFromPermissions(permissions) {
  const permSet = new Set(permissions || []);
  return SCOPE_AREA_KEYS.filter((areaKey) =>
    CO_OWNER_SCOPE_AREAS[areaKey].permission_keys.some((p) => permSet.has(p))
  );
}