/**
 * Per-tier maximum number of active funded networks a subscriber can have.
 *
 *   Beta Supporter        (founding_supporter_beta)   → 1
 *   Founding Premium Beta  (founding_premium_beta)    → 3
 *   Founding Patron Beta   (founding_champion_beta)   → 6
 *
 * Plans not listed here fall back to the caller-provided fallback (usually the
 * global `max_funded_networks` PlatformSetting, default 3) so existing tiers
 * keep their current behavior.
 *
 * Shared between backend functions (validateFundedNetworkChanges,
 * processSubscriptionRevenue) so the creation guard and the disbursement slice
 * never drift apart.
 */
export const FUNDED_NETWORK_LIMITS_BY_PLAN: Record<string, number> = {
  founding_supporter_beta: 1,
  founding_premium_beta: 3,
  founding_champion_beta: 6,
};

export function getMaxFundedNetworksForPlan(planCode: string | null | undefined, fallback = 3): number {
  if (planCode && Object.prototype.hasOwnProperty.call(FUNDED_NETWORK_LIMITS_BY_PLAN, planCode)) {
    return FUNDED_NETWORK_LIMITS_BY_PLAN[planCode];
  }
  return fallback;
}

/**
 * Per-tier maximum number of DISTINCT supported artists a subscriber can have,
 * counted across ALL of their funded playlists combined.
 *
 *   Beta Supporter        (founding_supporter_beta)   → 25
 *   Founding Premium Beta  (founding_premium_beta)    → 50
 *   Founding Patron Beta   (founding_champion_beta)   → 75
 *
 * Plans not listed here fall back to the caller-provided fallback (usually the
 * global `max_standard_artists` PlatformSetting, default 25) so existing tiers
 * keep their current behavior.
 */
export const MAX_DISTINCT_ARTISTS_BY_PLAN: Record<string, number> = {
  founding_supporter_beta: 25,
  founding_premium_beta: 50,
  founding_champion_beta: 75,
};

export function getMaxDistinctArtistsForPlan(planCode: string | null | undefined, fallback = 25): number {
  if (planCode && Object.prototype.hasOwnProperty.call(MAX_DISTINCT_ARTISTS_BY_PLAN, planCode)) {
    return MAX_DISTINCT_ARTISTS_BY_PLAN[planCode];
  }
  return fallback;
}

/**
 * Per-tier maximum number of SONGS allowed within a single funded playlist.
 * This cap applies per playlist, not across all playlists combined.
 *
 *   Beta Supporter        (founding_supporter_beta)   → 25
 *   Founding Premium Beta  (founding_premium_beta)    → 50
 *   Founding Patron Beta   (founding_champion_beta)   → 75
 *
 * Plans not listed here fall back to the caller-provided fallback (100) so
 * existing tiers keep their current behavior.
 */
export const MAX_SONGS_PER_FUNDED_PLAYLIST_BY_PLAN: Record<string, number> = {
  founding_supporter_beta: 25,
  founding_premium_beta: 50,
  founding_champion_beta: 75,
};

export function getMaxSongsPerFundedPlaylistForPlan(planCode: string | null | undefined, fallback = 100): number {
  if (planCode && Object.prototype.hasOwnProperty.call(MAX_SONGS_PER_FUNDED_PLAYLIST_BY_PLAN, planCode)) {
    return MAX_SONGS_PER_FUNDED_PLAYLIST_BY_PLAN[planCode];
  }
  return fallback;
}

/**
 * Allocation control tier — determines which artist allocation methods are available.
 *
 *   standard      → Equal split only (Automatic / Equal). No custom percentages.
 *   advanced      → Standard + Custom percentage allocation per artist.
 *   advanced_plus → Advanced + Weighted allocation (support-weighted distribution).
 *
 *   Beta Supporter        (founding_supporter_beta)   → standard
 *   Founding Premium Beta  (founding_premium_beta)    → advanced
 *   Founding Patron Beta   (founding_champion_beta)   → advanced_plus
 */
export const ALLOCATION_TIER_BY_PLAN: Record<string, string> = {
  founding_supporter_beta: 'standard',
  founding_premium_beta: 'advanced',
  founding_champion_beta: 'advanced_plus',
};

export function getAllocationTierForPlan(planCode: string | null | undefined): string {
  if (planCode && Object.prototype.hasOwnProperty.call(ALLOCATION_TIER_BY_PLAN, planCode)) {
    return ALLOCATION_TIER_BY_PLAN[planCode];
  }
  return 'standard';
}

export const ALLOCATION_METHODS_BY_TIER: Record<string, string[]> = {
  standard: ['automatic', 'equal'],
  advanced: ['automatic', 'equal', 'custom'],
  advanced_plus: ['automatic', 'equal', 'custom', 'weighted'],
};

export function getAvailableAllocationMethods(tier: string): string[] {
  return ALLOCATION_METHODS_BY_TIER[tier] || ALLOCATION_METHODS_BY_TIER.standard;
}

export function canAccessCustomAllocation(tier: string): boolean {
  return tier === 'advanced' || tier === 'advanced_plus';
}

/**
 * AI Playlist Assistance — tier-gated AI features for funded playlist building.
 *
 *   standard      → auto_suggest: AI suggests songs matching playlist content
 *   advanced      → + natural_language: describe a playlist in plain text, AI builds it
 *   advanced_plus → + allocation_optimization: AI recommends artist weight adjustments
 */
export const AI_ASSISTANCE_FEATURES_BY_TIER: Record<string, string[]> = {
  standard: ['auto_suggest'],
  advanced: ['auto_suggest', 'natural_language'],
  advanced_plus: ['auto_suggest', 'natural_language', 'allocation_optimization'],
};

export const AI_ASSISTANCE_LABELS: Record<string, string> = {
  auto_suggest: 'AI Song Suggestions',
  natural_language: 'Natural-Language Playlist Builder',
  allocation_optimization: 'AI Allocation Optimizer',
};

export function getAIAssistanceFeatures(tier: string): string[] {
  return AI_ASSISTANCE_FEATURES_BY_TIER[tier] || AI_ASSISTANCE_FEATURES_BY_TIER.standard;
}

export function canAccessAIFeature(tier: string, feature: string): boolean {
  return getAIAssistanceFeatures(tier).includes(feature);
}

/**
 * Analytics Features — tier-gated playlist and referral analytics data points.
 *
 *   standard      → basic counts only
 *   advanced      → + trends, charts, and breakdowns
 *   advanced_plus → + deep engagement and conversion data
 */
export const ANALYTICS_FEATURES_BY_TIER: Record<string, string[]> = {
  standard: [
    'playlist_basic_stats',
    'referral_basic_stats',
  ],
  advanced: [
    'playlist_basic_stats',
    'referral_basic_stats',
    'playlist_play_trends',
    'playlist_genre_breakdown',
    'referral_growth_chart',
    'referral_milestone_chart',
    'referral_leaderboard',
    'fan_scout_progress',
  ],
  advanced_plus: [
    'playlist_basic_stats',
    'referral_basic_stats',
    'playlist_play_trends',
    'playlist_genre_breakdown',
    'referral_growth_chart',
    'referral_milestone_chart',
    'referral_leaderboard',
    'fan_scout_progress',
    'playlist_engagement_details',
    'referral_network_graph',
    'referral_conversion_funnel',
    'referral_revenue_impact',
  ],
};

export const ANALYTICS_FEATURE_LABELS: Record<string, string> = {
  playlist_basic_stats: 'Playlist Overview',
  referral_basic_stats: 'Referral Summary',
  playlist_play_trends: 'Play Count Trends',
  playlist_genre_breakdown: 'Genre & Mood Breakdown',
  referral_growth_chart: 'Referral Growth Chart',
  referral_milestone_chart: 'Referral Milestones',
  referral_leaderboard: 'Referral Leaderboard',
  fan_scout_progress: 'Fan Scout Progress',
  playlist_engagement_details: 'Per-Song Engagement',
  referral_network_graph: 'Referral Network Graph',
  referral_conversion_funnel: 'Referral Conversion Funnel',
  referral_revenue_impact: 'Referral Revenue Impact',
};

export function getAnalyticsFeatures(tier: string): string[] {
  return ANALYTICS_FEATURES_BY_TIER[tier] || ANALYTICS_FEATURES_BY_TIER.standard;
}

export function canAccessAnalyticsFeature(tier: string, feature: string): boolean {
  return getAnalyticsFeatures(tier).includes(feature);
}

/**
 * Social Amplifier — tier-gated posting frequency (posts per week).
 *
 *   Beta Supporter        (founding_supporter_beta)   → 0 (no access)
 *   Founding Premium Beta  (founding_premium_beta)    → 2
 *   Founding Patron Beta   (founding_champion_beta)   → 3
 *
 * Feature is NOT yet implemented. Requires full scoping before build:
 *   - Which social platform(s) it posts to (Instagram, TikTok, X, etc.)
 *   - Post content type (song share, playlist share, artist spotlight, etc.)
 *   - Scheduling rules and cooldown logic
 *   - Per-post analytics and moderation
 */
export const SOCIAL_AMPLIFIER_POSTS_BY_PLAN: Record<string, number> = {
  founding_supporter_beta: 0,
  founding_premium_beta: 2,
  founding_champion_beta: 3,
};

export function getSocialAmplifierPostsForPlan(planCode: string | null | undefined): number {
  if (planCode && Object.prototype.hasOwnProperty.call(SOCIAL_AMPLIFIER_POSTS_BY_PLAN, planCode)) {
    return SOCIAL_AMPLIFIER_POSTS_BY_PLAN[planCode];
  }
  return 0;
}

export function canAccessSocialAmplifier(planCode: string | null | undefined): boolean {
  return getSocialAmplifierPostsForPlan(planCode) > 0;
}

/**
 * Signal Points Multiplier — tier-gated multiplier applied to subscriber Signal Points earnings.
 *
 *   Beta Supporter         (founding_supporter_beta)   → 1.0  (standard)
 *   Founding Premium Beta  (founding_premium_beta)    → 1.5  (premium)
 *   Founding Champion Beta (founding_champion_beta)   → 2.0  (highest)
 *   All other tiers                                     → 1.0  (baseline)
 *
 * NOTE: The Signal Points system is NOT yet fully scoped.
 * The `signal_points_requires_scoping` flag on each SubscriptionPlan
 * record is set to true until full scoping is completed — including
 * what activities earn points, base point values, earning frequency,
 * how the multiplier is applied, and redemption/decay rules.
 * Do not implement the Signal Points flow until that flag is set to false.
 */
export const SIGNAL_POINT_MULTIPLIER_BY_PLAN: Record<string, number> = {
  founding_supporter_beta: 1.0,
  founding_premium_beta: 1.5,
  founding_champion_beta: 2.0,
};

export function getSignalPointMultiplier(planCode: string | null | undefined, fallback = 1.0): number {
  if (planCode && Object.prototype.hasOwnProperty.call(SIGNAL_POINT_MULTIPLIER_BY_PLAN, planCode)) {
    return SIGNAL_POINT_MULTIPLIER_BY_PLAN[planCode];
  }
  return fallback;
}

const TIER_LABELS: Record<string, string> = {
  standard: 'Basic',
  advanced: 'Advanced',
  advanced_plus: 'Premium',
};

export function getAnalyticsTierLabel(tier: string): string {
  return TIER_LABELS[tier] || TIER_LABELS.standard;
}