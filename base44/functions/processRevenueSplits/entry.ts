import { createClientFromRequest } from 'npm:@base44/sdk@0.8.39';

/**
 * Artist Revenue Split Manager™ — Automatic Distribution Engine
 *
 * Whenever artist earnings become available, this function:
 * 1. Finds the applicable Revenue Split (priority: Song > Single > Album > Artist Default)
 * 2. Calculates gross revenue → subtracts platform fee → net artist earnings
 * 3. Applies the split → calculates each collaborator's share
 * 4. Creates CollaboratorEarning records → queues collaborator payments
 */

const PLATFORM_FEE_PERCENT = 2.5;

const SOURCE_LABELS = {
  fan_support: "Fan Support Allocation",
  direct_support: "Direct Artist Support",
  playlist_revenue: "Playlist Revenue",
  network_revenue: "Artist Network Revenue",
  community_rewards: "Frequency Community Rewards",
  discovery_partner_bonus: "Discovery Partner Bonuses",
  merchandise: "Merchandise Sales",
  ticket_sales: "Ticket Sales",
  marketplace: "Marketplace Revenue",
  fan_tips: "Fan Tips",
  licensing: "Licensing",
  other: "Other Platform Revenue",
};

async function findApplicableSplit(base44, artistProfileId, songId, releaseId) {
  const splits = await base44.asServiceRole.entities.RevenueSplit.filter({
    artist_profile_id: artistProfileId,
    status: "active",
  });

  if (!splits || splits.length === 0) return null;

  let songSplit = null;
  let singleSplit = null;
  let albumSplit = null;
  let defaultSplit = null;

  for (const split of splits) {
    if (split.split_type === "song" && songId && split.song_id === songId) {
      songSplit = split;
    } else if (split.split_type === "single" && releaseId && split.release_id === releaseId) {
      singleSplit = split;
    } else if (split.split_type === "album" && releaseId && split.release_id === releaseId) {
      albumSplit = split;
    } else if (split.split_type === "artist_default" && !defaultSplit) {
      defaultSplit = split;
    }
  }

  return songSplit || singleSplit || albumSplit || defaultSplit;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const {
      artist_profile_id,
      gross_revenue,
      revenue_source,
      release_id,
      song_id,
      release_name,
      song_name,
      playlist_id,
      playlist_name,
      community_id,
      community_name,
      earning_period_month,
      earning_period_year,
    } = body || {};

    if (!artist_profile_id) {
      return Response.json({ error: "artist_profile_id is required" }, { status: 400 });
    }

    const gross = Number(gross_revenue);
    if (!gross || isNaN(gross) || gross < 0.01) {
      return Response.json(
        { error: "gross_revenue must be a valid amount of at least $0.01" },
        { status: 400 }
      );
    }

    if (!revenue_source || !SOURCE_LABELS[revenue_source]) {
      return Response.json(
        { error: `revenue_source must be one of: ${Object.keys(SOURCE_LABELS).join(", ")}` },
        { status: 400 }
      );
    }

    // Fetch the artist profile
    let artistProfile;
    try {
      artistProfile = await base44.asServiceRole.entities.ArtistProfile.get(artist_profile_id);
    } catch {
      return Response.json({ error: "Artist profile not found" }, { status: 404 });
    }

    // Find the applicable split
    const split = await findApplicableSplit(base44, artist_profile_id, song_id, release_id);

    if (!split) {
      return Response.json({
        status: "no_split",
        message: "No active Revenue Split found for this artist. Earnings remain with the artist.",
        artist_profile_id,
        gross_revenue: gross,
      });
    }

    // Validate the split sums to 100%
    const totalPct = (split.collaborators || []).reduce(
      (sum, c) => sum + (Number(c.revenue_percentage) || 0),
      0
    );

    if (Math.round(totalPct * 100) / 100 !== 100) {
      return Response.json({
        status: "invalid_split",
        message: `Split "${split.split_name}" does not total 100% (current: ${totalPct}%). No distribution performed.`,
        split_id: split.id,
      });
    }

    // Calculate fees and net
    const platformFee = +(gross * (PLATFORM_FEE_PERCENT / 100)).toFixed(4);
    const netRevenue = +(gross - platformFee).toFixed(4);

    const now = new Date();
    const month = earning_period_month || now.getMonth() + 1;
    const year = earning_period_year || now.getFullYear();

    // Create CollaboratorEarning records
    const earnings = (split.collaborators || []).map((collab) => {
      const pct = Number(collab.revenue_percentage) || 0;
      const amount = +((netRevenue * pct) / 100).toFixed(4);

      return {
        split_id: split.id,
        split_name: split.split_name,
        artist_profile_id,
        artist_name: artistProfile.artist_name,
        collaborator_user_id: collab.collaborator_user_id || null,
        collaborator_name: collab.full_name,
        collaborator_email: collab.email || null,
        collaborator_role: collab.role,
        revenue_source,
        gross_revenue: gross,
        platform_fee: platformFee,
        net_revenue: netRevenue,
        revenue_percentage: pct,
        collaborator_amount: amount,
        release_id: release_id || null,
        release_name: release_name || null,
        song_id: song_id || null,
        song_name: song_name || null,
        playlist_id: playlist_id || null,
        playlist_name: playlist_name || null,
        community_id: community_id || null,
        community_name: community_name || null,
        payment_status: "pending",
        payment_method: collab.payment_method || "frequency_wallet",
        earning_period_month: month,
        earning_period_year: year,
        processed_date: now.toISOString(),
      };
    });

    if (earnings.length > 0) {
      await base44.asServiceRole.entities.CollaboratorEarning.bulkCreate(earnings);
    }

    return Response.json({
      status: "success",
      split_id: split.id,
      split_name: split.split_name,
      split_type: split.split_type,
      gross_revenue: gross,
      platform_fee: platformFee,
      net_revenue: netRevenue,
      collaborator_count: earnings.length,
      total_distributed: earnings.reduce((s, e) => s + e.collaborator_amount, 0),
      earnings: earnings.map((e) => ({
        collaborator_name: e.collaborator_name,
        role: e.collaborator_role,
        percentage: e.revenue_percentage,
        amount: e.collaborator_amount,
        payment_method: e.payment_method,
      })),
    });
  } catch (error) {
    console.error("processRevenueSplits error:", error);
    return Response.json(
      { error: "Failed to process revenue split", details: error?.message || String(error) },
      { status: 500 }
    );
  }
});