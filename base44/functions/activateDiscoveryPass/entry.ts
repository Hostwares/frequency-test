import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Discovery Pass Activation
 *
 * Lets a subscriber activate a Discovery Pass, which temporarily allows adding up to
 * `discovery_pass_bonus_artists` (default 10) new artists beyond the standard 25-artist
 * limit for `discovery_pass_duration_days` (default 30 days).
 *
 * Annual allowance is capped by `discovery_pass_annual_allowance` (default 3 per year).
 * Only one active pass per subscriber at a time.
 */

async function getSetting(base44, key, fallback) {
  const recs = await base44.asServiceRole.entities.PlatformSetting.filter({ setting_key: key });
  if (!recs || recs.length === 0) return fallback;
  const rec = recs[0];
  if (rec.setting_type === 'string') return rec.setting_value;
  const n = Number(rec.setting_value);
  return isNaN(n) ? fallback : n;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const annualAllowance = await getSetting(base44, 'discovery_pass_annual_allowance', 3);
    const durationDays = await getSetting(base44, 'discovery_pass_duration_days', 30);
    const bonusArtists = await getSetting(base44, 'discovery_pass_bonus_artists', 10);
    const gracePeriodDays = 7;

    const now = new Date();
    const year = now.getFullYear();

    // --- Count passes used this calendar year ---
    const passes = await base44.entities.DiscoveryPass.filter({
      user_id: user.id,
      pass_year: year,
    });
    const usedThisYear = (passes || []).length;

    if (usedThisYear >= annualAllowance) {
      return Response.json(
        {
          error: `You've used all ${annualAllowance} Discovery Pass${annualAllowance > 1 ? 'es' : ''} for ${year}. You'll receive a new allowance on January 1.`,
          passes_used: usedThisYear,
          annual_allowance: annualAllowance,
        },
        { status: 400 }
      );
    }

    // --- Reject if there's already an active pass ---
    const existingActive = (passes || []).filter(
      (p) => p.status === 'active' && new Date(p.expiry_date) > now
    );
    if (existingActive.length > 0) {
      return Response.json(
        {
          error: 'You already have an active Discovery Pass. Add your new artists before it expires.',
          active_pass: existingActive[0],
        },
        { status: 400 }
      );
    }

    // --- Create the pass ---
    const expiryDate = new Date(now.getTime() + durationDays * MS_PER_DAY);
    const gracePeriodEnd = new Date(expiryDate.getTime() + gracePeriodDays * MS_PER_DAY);

    const pass = await base44.entities.DiscoveryPass.create({
      user_id: user.id,
      activated_date: now.toISOString(),
      expiry_date: expiryDate.toISOString(),
      bonus_artists_count: bonusArtists,
      status: 'active',
      temporary_artist_ids: [],
      converted_artist_ids: [],
      grace_period_end_date: gracePeriodEnd.toISOString(),
      pass_year: year,
      expiry_notification_sent: false,
    });

    // --- Update subscription tracking ---
    const subs = await base44.entities.UserSubscription.filter({
      user_id: user.id,
      status: 'active',
    });
    if (subs?.[0]) {
      await base44.entities.UserSubscription.update(subs[0].id, {
        discovery_passes_year: year,
        discovery_passes_used: usedThisYear + 1,
      });
    }

    return Response.json({
      success: true,
      pass,
      passes_used_this_year: usedThisYear + 1,
      annual_allowance: annualAllowance,
      remaining: annualAllowance - usedThisYear - 1,
      bonus_artists: bonusArtists,
      expires: expiryDate.toISOString(),
      grace_period_ends: gracePeriodEnd.toISOString(),
    });
  } catch (error) {
    console.error('activateDiscoveryPass error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});