import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getMaxFundedNetworksForPlan, getMaxDistinctArtistsForPlan, getMaxSongsPerFundedPlaylistForPlan, getAllocationTierForPlan, getAvailableAllocationMethods } from '../../shared/fundedNetworkLimits.ts';

/**
 * Funded Network Validation — enforces the flexible 25-artist limit, monthly rotation cap,
 * and duplicate funded network detection.
 *
 * Called by the frontend BEFORE saving changes to a funded network. Returns errors (blocking)
 * and warnings (non-blocking) so the UI can show inline guidance.
 *
 * Checks:
 *   1. Total unique artists across all funded networks ≤ 25 standard + active Discovery Pass bonus + purchase-unlocked
 *   2. Monthly rotation count ≤ max_monthly_rotations (default 5)
 *   3. No two funded networks share 90%+ of the same artists (duplicate detection)
 */

async function getSetting(base44, key, fallback) {
  const recs = await base44.asServiceRole.entities.PlatformSetting.filter({ setting_key: key });
  if (!recs || recs.length === 0) return fallback;
  const rec = recs[0];
  if (rec.setting_type === 'string') return rec.setting_value;
  const n = Number(rec.setting_value);
  return isNaN(n) ? fallback : n;
}

/** Jaccard similarity as a percentage (0–100). Two empty sets = 100 (identical). */
function artistOverlapPct(setA, setB) {
  const a = new Set(setA);
  const b = new Set(setB);
  if (a.size === 0 && b.size === 0) return 100;
  let intersection = 0;
  for (const id of a) if (b.has(id)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : (intersection / union) * 100;
}

async function getArtistsFromPlaylist(base44, playlist, proposedSongIds, proposedAllocations) {
  const artistMap = new Map();

  const allocations = proposedAllocations || playlist.artist_allocations;
  if (allocations && allocations.length > 0) {
    for (const a of allocations) {
      if (!a.artist_profile_id) continue;
      const w = Number(a.weight) > 0 ? Number(a.weight) : 1;
      artistMap.set(a.artist_profile_id, { artist_profile_id: a.artist_profile_id, weight: w });
    }
  }

  const songIds = [...new Set(proposedSongIds || playlist.song_ids || [])].slice(0, 100);
  for (const sid of songIds) {
    try {
      const song = await base44.asServiceRole.entities.Song.get(sid);
      if (song && song.artist_profile_id && !artistMap.has(song.artist_profile_id)) {
        artistMap.set(song.artist_profile_id, { artist_profile_id: song.artist_profile_id, weight: 1 });
      }
    } catch {
      // song removed — skip
    }
  }

  return [...artistMap.values()];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try {
      body = await req.json();
    } catch {
      // no body — just check current state
    }

    const {
      network_id,
      proposed_song_ids,
      proposed_artist_allocations,
      action,
    } = body;

    const maxStandard = await getSetting(base44, 'max_standard_artists', 25);
    const maxRotations = await getSetting(base44, 'max_monthly_rotations', 5);
    const dupThreshold = await getSetting(base44, 'duplicate_network_threshold_pct', 90);
    const passBonusDefault = await getSetting(base44, 'discovery_pass_bonus_artists', 10);

    // --- Fetch subscriber's funded networks ---
    const allPlaylists = await base44.entities.Playlist.filter({ owner_user_id: user.id });

    // --- Resolve the subscriber's active subscription to apply the per-tier funded network cap ---
    const subRecs = await base44.entities.UserSubscription.filter({
      user_id: user.id,
      status: 'active',
    });
    const subRec = subRecs?.[0];
    const tierFundedLimit = getMaxFundedNetworksForPlan(subRec?.plan_code, 3);
    const tierMaxArtists = getMaxDistinctArtistsForPlan(subRec?.plan_code, maxStandard);
    const tierMaxSongs = getMaxSongsPerFundedPlaylistForPlan(subRec?.plan_code, 100);

    const fundedNetworks = (allPlaylists || [])
      .filter((p) => p.is_funded_network === true);

    // --- Resolve artists per funded network (using proposed state if provided) ---
    const networkArtists = {}; // network_id -> [artist_profile_id]
    const networkMeta = {}; // network_id -> { name }
    for (const net of fundedNetworks) {
      networkMeta[net.id] = { id: net.id, name: net.name };
      const isProposed = network_id && net.id === network_id;
      const artists = await getArtistsFromPlaylist(
        base44,
        net,
        isProposed ? proposed_song_ids : null,
        isProposed ? proposed_artist_allocations : null
      );
      networkArtists[net.id] = artists.map((a) => a.artist_profile_id);
    }

    // --- Duplicate detection: 90%+ overlap between any two funded networks ---
    const duplicates = [];
    const netIds = Object.keys(networkArtists);
    for (let i = 0; i < netIds.length; i++) {
      for (let j = i + 1; j < netIds.length; j++) {
        const overlap = artistOverlapPct(networkArtists[netIds[i]], networkArtists[netIds[j]]);
        if (overlap >= dupThreshold) {
          duplicates.push({
            network_a_id: netIds[i],
            network_a_name: networkMeta[netIds[i]].name,
            network_b_id: netIds[j],
            network_b_name: networkMeta[netIds[j]].name,
            overlap_pct: Math.round(overlap),
            message:
              `"${networkMeta[netIds[i]].name}" and "${networkMeta[netIds[j]].name}" share ` +
              `${Math.round(overlap)}% of the same artists. Each funded network should have a ` +
              `distinct purpose (e.g., Rock Network, Christmas Network, Discovery Network). ` +
              `Please differentiate the artist lists before saving.`,
          });
        }
      }
    }

    // --- Count total unique artists across all funded networks ---
    const allArtistIds = new Set();
    for (const ids of Object.values(networkArtists)) {
      for (const id of ids) allArtistIds.add(id);
    }
    const totalUniqueArtists = allArtistIds.size;

    // --- Active Discovery Passes (bonus slots) ---
    const now = new Date();
    const passes = await base44.entities.DiscoveryPass.filter({
      user_id: user.id,
      status: 'active',
    });
    const activePasses = (passes || []).filter(
      (p) => new Date(p.expiry_date) > now
    );
    const activeBonus = activePasses.reduce(
      (sum, p) => sum + (p.bonus_artists_count || passBonusDefault),
      0
    );

    // --- Purchase-unlocked artists (beyond standard 25) ---
    const sub = subRec;
    const purchaseUnlocked = new Set(sub?.purchase_unlocked_artist_ids || []);
    const unlockedCount = purchaseUnlocked.size;

    const effectiveLimit = tierMaxArtists + activeBonus + unlockedCount;

    // --- Monthly rotation tracking ---
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let rotationsUsed = 0;
    if (sub) {
      rotationsUsed = sub.rotation_period === currentPeriod
        ? sub.monthly_rotations_used || 0
        : 0; // new month resets
    }

    // --- Build validation result ---
    const errors = [];
    const warnings = [];

    // --- Per-playlist song cap (tier-based, per playlist not combined) ---
    for (const net of fundedNetworks) {
      const isProposed = network_id && net.id === network_id;
      const songCount = isProposed && proposed_song_ids
        ? proposed_song_ids.length
        : (net.song_ids || []).length;
      if (songCount > tierMaxSongs) {
        const overBy = songCount - tierMaxSongs;
        errors.push({
          type: 'song_limit_exceeded',
          message:
            `"${net.name}" has ${songCount} songs, but your plan limit is ${tierMaxSongs} songs per funded playlist. ` +
            `Remove ${overBy} song${overBy > 1 ? 's' : ''} or upgrade your plan to add more songs.`,
          network_id: net.id,
          network_name: net.name,
          current: songCount,
          limit: tierMaxSongs,
          plan_code: subRec?.plan_code || null,
        });
      }
    }

    // --- Per-tier funded network creation cap ---
    // Blocks creating (or activating) a new funded network once the subscriber's
    // tier limit is reached. Surfaced to the UI as an upgrade prompt.
    if (action === 'create_funded' && fundedNetworks.length >= tierFundedLimit) {
      errors.push({
        type: 'funded_network_limit_reached',
        message:
          `You've reached your limit of ${tierFundedLimit} funded network${tierFundedLimit === 1 ? '' : 's'} ` +
          `on your current plan. Upgrade to a higher tier to add more funded networks.`,
        current: fundedNetworks.length,
        limit: tierFundedLimit,
        plan_code: subRec?.plan_code || null,
      });
    }

    if (totalUniqueArtists > effectiveLimit) {
      const overBy = totalUniqueArtists - effectiveLimit;
      errors.push({
        type: 'artist_limit_exceeded',
        message:
          `You have ${totalUniqueArtists} unique artists across your funded networks, but your plan limit is ` +
          `${tierMaxArtists}` +
          (unlockedCount > 0 ? ` + ${unlockedCount} purchase-unlocked` : '') +
          (activeBonus > 0 ? ` + ${activeBonus} Discovery Pass` : '') +
          ` = ${effectiveLimit}. ${overBy > 0 ? `Remove ${overBy} artist${overBy > 1 ? 's' : ''}, ` : ''}` +
          `activate a Discovery Pass, purchase a qualifying song, or upgrade your plan to add more artists.`,
        current: totalUniqueArtists,
        limit: effectiveLimit,
        standard: tierMaxArtists,
        purchase_unlocked: unlockedCount,
        discovery_bonus: activeBonus,
        plan_code: subRec?.plan_code || null,
      });
    }

    for (const dup of duplicates) {
      errors.push({ type: 'duplicate_network', ...dup });
    }

    // --- Allocation method tier gating ---
    // Standard tier (Beta Supporter) can only use equal-split methods.
    // Advanced (Premium Beta) unlocks custom percentages; Advanced+ (Champion Beta) unlocks weighted.
    const allocationTier = getAllocationTierForPlan(subRec?.plan_code);
    const allowedMethods = getAvailableAllocationMethods(allocationTier);
    const proposedMethod = body.proposed_allocation_method || (proposed_artist_allocations?.length > 0 ? 'custom' : null);
    if (proposedMethod && !allowedMethods.includes(proposedMethod)) {
      errors.push({
        type: 'allocation_method_locked',
        message:
          `Your plan (${allocationTier} tier) does not support ${proposedMethod} allocation. ` +
          `Upgrade to a higher tier to access custom percentage allocation.`,
        tier: allocationTier,
        requested_method: proposedMethod,
        allowed_methods: allowedMethods,
        plan_code: subRec?.plan_code || null,
      });
    }

    // --- Custom allocation: validate percentages total exactly 100% ---
    if (proposed_artist_allocations && proposed_artist_allocations.length > 0) {
      const total = proposed_artist_allocations.reduce(
        (sum, a) => sum + (Number(a.weight) || 0),
        0
      );
      if (total !== 100) {
        errors.push({
          type: 'allocation_total_mismatch',
          message:
            `Custom artist allocations must total exactly 100%. ` +
            `Current total is ${total}%. Adjust your percentages and try again.`,
          current_total: total,
          artist_count: proposed_artist_allocations.length,
        });
      }
    }

    if (action === 'add_artist' && rotationsUsed >= maxRotations) {
      warnings.push({
        type: 'rotation_limit_reached',
        message:
          `You've used all ${maxRotations} standard artist rotations this month. ` +
          `Adding a new artist will require removing an existing one. Your rotations reset next month.`,
        rotations_used: rotationsUsed,
        max_rotations: maxRotations,
      });
    }

    return Response.json({
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        total_unique_artists: totalUniqueArtists,
        max_standard_artists: tierMaxArtists,
        purchase_unlocked_artists: unlockedCount,
        active_discovery_bonus: activeBonus,
        effective_limit: effectiveLimit,
        active_discovery_passes: activePasses.length,
        rotations_used: rotationsUsed,
        max_monthly_rotations: maxRotations,
        rotation_period: currentPeriod,
        funded_networks_count: fundedNetworks.length,
        max_funded_networks: tierFundedLimit,
        duplicate_networks_detected: duplicates.length,
        allocation_tier: allocationTier,
        allowed_allocation_methods: allowedMethods,
      },
    });
  } catch (error) {
    console.error('validateFundedNetworkChanges error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});