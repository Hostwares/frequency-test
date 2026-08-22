import {
  getMaxFundedNetworksForPlan,
  getMaxDistinctArtistsForPlan,
  getAllocationTierForPlan,
} from './fundedNetworkLimits.ts';

/**
 * Account Entitlement Sync — keeps the User record's subscription_entitlement
 * and verification_status snapshots up to date.
 *
 * Design principle: a user's ROLE (primary role + additional_roles) is stored
 * separately from their SUBSCRIPTION ENTITLEMENT (what they pay for). The
 * entitlement is a denormalized snapshot synced from UserSubscription so it
 * can be read in a single query without joining. The verification_status is
 * a consolidated view across all the user's held-role profiles.
 *
 * All functions use the base44 service-role client and are safe to call from
 * backend functions (webhooks, scheduled tasks, admin endpoints).
 */

/**
 * Sync the subscription_entitlement snapshot on a User record from their
 * active UserSubscription. Called after subscription activation, cancellation,
 * expiration, and plan changes.
 *
 * If no active subscription exists, the entitlement is cleared (status set to
 * 'expired' with null plan data) so the user's role is preserved but their
 * entitlement reflects no active paid plan.
 */
export async function syncSubscriptionEntitlement(base44: any, userId: string): Promise<any> {
  // 1. Find the user's most recent UserSubscription (active takes priority)
  const subs = await base44.asServiceRole.entities.UserSubscription.filter({
    user_id: userId,
  });

  if (!subs || subs.length === 0) {
    // No subscription record at all — clear the entitlement
    await base44.asServiceRole.entities.User.update(userId, {
      subscription_entitlement: {
        status: 'expired',
        last_synced_date: new Date().toISOString(),
      },
    });
    return { user_id: userId, entitlement: { status: 'expired' }, synced: true };
  }

  // Priority: active > trialing > past_due > pending > canceled > expired
  const statusPriority = ['active', 'trialing', 'past_due', 'pending', 'canceled', 'expired'];
  const sortedSubs = [...subs].sort((a, b) => {
    const pa = statusPriority.indexOf(a.status || 'expired');
    const pb = statusPriority.indexOf(b.status || 'expired');
    return pa - pb;
  });

  const sub = sortedSubs[0];
  const planCode = sub.plan_code || '';
  const fallbackLimit = 3;
  const fallbackArtists = 25;

  const entitlement = {
    plan_code: planCode,
    plan_name: sub.plan_name || '',
    status: sub.status || 'pending',
    billing_cycle: sub.billing_cycle || 'monthly',
    monthly_price: sub.monthly_price || 0,
    is_founding_member: sub.is_founding_member || false,
    subscription_id: sub.subscription_id || '',
    next_billing_date: sub.next_billing_date || null,
    max_funded_networks: getMaxFundedNetworksForPlan(planCode, fallbackLimit),
    max_distinct_artists: getMaxDistinctArtistsForPlan(planCode, fallbackArtists),
    allocation_tier: getAllocationTierForPlan(planCode),
    last_synced_date: new Date().toISOString(),
  };

  await base44.asServiceRole.entities.User.update(userId, {
    subscription_entitlement: entitlement,
  });

  return { user_id: userId, entitlement, synced: true };
}

/**
 * Sync the verification_status snapshot on a User record by checking all
 * the user's held-role profiles (ArtistProfile, RadioStation, BusinessPartner,
 * DiscoveryPartner) and consolidating into a single status object.
 *
 * Called after verification decisions are made (admin approve/reject, AI
 * review completion) and can also be run on-demand.
 */
export async function syncVerificationStatus(base44: any, userId: string, userEntitlement: any = null): Promise<any> {
  let fanVerified = false;
  let artistVerified = false;
  let frequencyCommunityVerified = false;
  let discoveryPartnerVerified = false;
  let radioVerified = false;
  let businessVerified = false;
  let professionalConsultantVerified = false;

  // 1. Fan/Subscriber verification — confirmed by an active paid subscription entitlement
  try {
    fanVerified = !!(userEntitlement && userEntitlement.status === 'active' && (userEntitlement.monthly_price || 0) > 0);
  } catch { /* skip */ }

  // 2. Artist profile verification
  try {
    const artistProfiles = await base44.asServiceRole.entities.ArtistProfile.filter({
      user_id: userId,
    });
    artistVerified = artistProfiles.some((p) => p.is_verified === true);
  } catch { /* skip */ }

  // 3. Frequency Community verification — user is a member of an active FrequencyCommunity
  try {
    const communities = await base44.asServiceRole.entities.FrequencyCommunity.filter({
      member_user_ids: userId,
    });
    frequencyCommunityVerified = communities.length > 0;
  } catch { /* skip */ }

  // 4. Discovery partner verification
  try {
    const partners = await base44.asServiceRole.entities.DiscoveryPartner.filter({
      user_id: userId,
    });
    discoveryPartnerVerified = partners.some((p) => p.is_verified === true);
  } catch { /* skip */ }

  // 5. Radio station verification
  try {
    const stations = await base44.asServiceRole.entities.RadioStation.filter({
      applicant_user_id: userId,
    });
    radioVerified = stations.some((s) => s.verification_status === 'verified');
  } catch { /* skip */ }

  // 6. Business partner verification
  try {
    const partners = await base44.asServiceRole.entities.BusinessPartner.filter({
      user_id: userId,
    });
    businessVerified = partners.some((p) => p.is_verified === true);
  } catch { /* skip */ }

  // 7. Professional Consultant verification — admin-reviewed (no dedicated profile entity yet)
  // Set manually by admin via User.verification_status.professional_consultant_verified

  // 8. Compute overall status
  const anyVerified =
    fanVerified || artistVerified || frequencyCommunityVerified ||
    discoveryPartnerVerified || radioVerified || businessVerified || professionalConsultantVerified;

  let overallStatus = 'not_submitted';
  if (anyVerified) {
    overallStatus = 'verified';
  }

  const verificationStatus = {
    overall_status: overallStatus,
    identity_verified: false, // core identity verification not yet implemented
    fan_verified: fanVerified,
    artist_verified: artistVerified,
    frequency_community_verified: frequencyCommunityVerified,
    discovery_partner_verified: discoveryPartnerVerified,
    radio_verified: radioVerified,
    business_verified: businessVerified,
    professional_consultant_verified: professionalConsultantVerified,
    last_checked_date: new Date().toISOString(),
  };

  await base44.asServiceRole.entities.User.update(userId, {
    verification_status: verificationStatus,
  });

  return { user_id: userId, verification_status: verificationStatus, synced: true };
}

/**
 * Get the effective subscription entitlement for a user. For frontend use —
 * reads from the denormalized snapshot on the User record. If the snapshot
 * is missing or stale, the caller can trigger a re-sync via the backend
 * function syncSubscriptionEntitlement.
 */
export function getEffectiveEntitlement(user: any): any | null {
  if (!user) return null;
  if (user.subscription_entitlement) return user.subscription_entitlement;
  return null;
}

/**
 * Check if a user holds a specific role (primary or additional).
 */
export function hasRole(user: any, role: string): boolean {
  if (!user) return false;
  if (user.role === role) return true;
  if (Array.isArray(user.additional_roles) && user.additional_roles.includes(role)) return true;
  return false;
}

/**
 * Get all roles held by a user (primary + additional).
 */
export function getAllRoles(user: any): string[] {
  if (!user) return [];
  const roles = [user.role];
  if (Array.isArray(user.additional_roles)) {
    roles.push(...user.additional_roles);
  }
  return roles.filter(Boolean);
}