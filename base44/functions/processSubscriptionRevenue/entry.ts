import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getMaxFundedNetworksForPlan } from '../../shared/fundedNetworkLimits.ts';

/**
 * Monthly Subscription Revenue Distributor — Guaranteed Playlist Artist Distribution Rule
 *
 * For each paid fan subscriber:
 *   1. 95% of the eligible subscription fee → Artist Distribution Pool
 *   2. 5% → platform operations
 *   3. Pool is divided among the subscriber's active Funded Networks (max 3, configurable)
 *      — equal by default, or custom percentages if set
 *   4. For each Funded Network: count unique eligible artists, reserve $0.01 minimum each,
 *      distribute the remaining balance per the network's allocation method (equal/weighted/automatic)
 *   5. Each artist's earnings from all networks are summed and credited
 *   6. Revenue Split Manager is applied downstream by processPostDisbursementSplits
 *
 * High-precision: 6 decimal places internally, 2 decimal places user-facing.
 * Idempotent per subscription per billing period (YYYY-MM) via external_transaction_id.
 *
 * Artist Pro subscriptions: 100% to operations (unchanged).
 */

async function getSetting(base44, key, fallback) {
  const recs = await base44.asServiceRole.entities.PlatformSetting.filter({ setting_key: key });
  if (!recs || recs.length === 0) return fallback;
  const rec = recs[0];
  if (rec.setting_type === 'string') return rec.setting_value;
  const n = Number(rec.setting_value);
  return isNaN(n) ? fallback : n;
}

function round6(n) {
  return Math.round((n + Number.EPSILON) * 1e6) / 1e6;
}

/**
 * Resolve the unique eligible artists in a single funded network.
 * Uses explicit artist_allocations if present; otherwise derives unique artists from songs.
 * Returns [{ artist_profile_id, weight }] — weight is relative for weighted/custom allocation.
 */
async function getNetworkArtists(base44, playlist) {
  const artistMap = new Map();

  // 1. Explicit artist allocations take priority
  if (playlist.artist_allocations && playlist.artist_allocations.length > 0) {
    for (const a of playlist.artist_allocations) {
      if (!a.artist_profile_id) continue;
      const w = Number(a.weight) > 0 ? Number(a.weight) : 1;
      artistMap.set(a.artist_profile_id, {
        artist_profile_id: a.artist_profile_id,
        weight: w,
      });
    }
  }

  // 2. Also derive artists from songs (for artists not in explicit allocations)
  const songIds = [...new Set(playlist.song_ids || [])].slice(0, 100);
  for (const sid of songIds) {
    try {
      const song = await base44.asServiceRole.entities.Song.get(sid);
      if (song && song.artist_profile_id && !artistMap.has(song.artist_profile_id)) {
        artistMap.set(song.artist_profile_id, {
          artist_profile_id: song.artist_profile_id,
          weight: 1,
        });
      }
    } catch {
      // song may have been removed — skip
    }
  }

  return [...artistMap.values()];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'master_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // --- Configurable settings ---
    const fanArtistPct = await getSetting(base44, 'fan_subscription_artist_share_pct', 95);
    const fanOpsPct = await getSetting(base44, 'fan_subscription_ops_share_pct', 5);
    const minPerArtist = await getSetting(base44, 'min_artist_payment_per_network', 0.01);
    const maxFundedNetworks = await getSetting(base44, 'max_funded_networks', 3);
    const artistProAdminPct = await getSetting(base44, 'artist_pro_admin_share_pct', 100);

    // --- Operations / admin account ---
    const masterAdmins = await base44.asServiceRole.entities.User.filter({ role: 'master_admin' });
    const plainAdmins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const adminUser = (masterAdmins && masterAdmins[0]) || (plainAdmins && plainAdmins[0]);
    if (!adminUser) {
      return Response.json(
        { error: 'No admin or master_admin account found to credit the operations share' },
        { status: 500 }
      );
    }

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const fanPlans = await base44.asServiceRole.entities.SubscriptionPlan.filter({ target_audience: 'fan' });
    const fanPlanCodes = new Set(fanPlans.map((p) => p.plan_code));

    const subs = await base44.asServiceRole.entities.UserSubscription.filter({ status: 'active' });

    const results = {
      period,
      fan: {
        processed: 0,
        artists_credited: 0,
        ops_total: 0,
        no_funded_network_routed_to_ops: 0,
        insufficient_networks: 0,
        total_min_guaranteed: 0,
      },
      artist_pro: { processed: 0, admin_total: 0 },
      skipped: [],
    };
    const processedSubIds = [];

    for (const sub of subs) {
      const idemKey = `subrev:${sub.id}:${period}`;

      // --- Idempotency: skip if already distributed this period ---
      const existing = await base44.asServiceRole.entities.WalletTransaction.filter({
        external_transaction_id: idemKey,
      });
      if (existing.length > 0) {
        results.skipped.push({ subscription_id: sub.id, plan_code: sub.plan_code, reason: 'already distributed' });
        continue;
      }

      const monthly =
        sub.billing_cycle === 'annual' ? (sub.monthly_price || 0) / 12 : sub.monthly_price || 0;
      if (monthly <= 0) {
        results.skipped.push({ subscription_id: sub.id, plan_code: sub.plan_code, reason: 'no monthly price' });
        continue;
      }

      const isFan = fanPlanCodes.has(sub.plan_code);
      const isArtistPro = sub.plan_code === 'artist_pro_beta' || sub.plan_code === 'artist_pro';

      if (isFan) {
        // --- 95/5 split ---
        const artistPool = round6((monthly * fanArtistPct) / 100);
        const opsPool = round6(monthly - artistPool);

        // --- Credit operations share (also the period idempotency marker) ---
        await base44.asServiceRole.entities.WalletTransaction.create({
          user_id: adminUser.id,
          transaction_type: 'fee',
          amount: opsPool,
          direction: 'credit',
          payment_method: 'wix_payments',
          status: 'completed',
          description: `Platform operations (${fanOpsPct}%) — fan subscription ${sub.plan_code} for ${period}`,
          external_transaction_id: idemKey,
        });
        results.fan.ops_total = round6(results.fan.ops_total + opsPool);

        // --- Find subscriber's Funded Networks (max configurable) ---
        const allPlaylists = await base44.asServiceRole.entities.Playlist.filter({
          owner_user_id: sub.user_id,
        });
        const fundedNetworks = (allPlaylists || [])
          .filter((p) => p.is_funded_network === true && p.is_paused !== true)
          .slice(0, getMaxFundedNetworksForPlan(sub.plan_code, maxFundedNetworks));

        if (fundedNetworks.length === 0) {
          // No funded networks — route artist share to ops so revenue is never lost
          await base44.asServiceRole.entities.WalletTransaction.create({
            user_id: adminUser.id,
            transaction_type: 'fee',
            amount: artistPool,
            direction: 'credit',
            payment_method: 'wix_payments',
            status: 'completed',
            description: `Artist share fallback (no funded networks) — fan subscription ${sub.plan_code} for ${period}`,
            external_transaction_id: `${idemKey}:fallback`,
          });
          results.fan.no_funded_network_routed_to_ops = round6(
            results.fan.no_funded_network_routed_to_ops + artistPool
          );
          processedSubIds.push(sub.id);
          results.fan.processed += 1;
          continue;
        }

        // --- Divide pool across funded networks (equal or custom percentages) ---
        const customPcts = fundedNetworks.map((p) => Number(p.network_funding_percentage) || 0);
        const hasCustom = customPcts.some((p) => p > 0);
        let networkAllocations = [];

        if (hasCustom) {
          const totalPct = customPcts.reduce((s, p) => s + p, 0);
          if (totalPct > 0) {
            let allocated = 0;
            for (let i = 0; i < fundedNetworks.length; i++) {
              if (i === fundedNetworks.length - 1) {
                networkAllocations.push(round6(artistPool - allocated));
              } else {
                const a = round6((artistPool * customPcts[i]) / totalPct);
                networkAllocations.push(a);
                allocated = round6(allocated + a);
              }
            }
          }
        }
        if (networkAllocations.length === 0) {
          // Equal distribution
          const perNetwork = round6(artistPool / fundedNetworks.length);
          networkAllocations = fundedNetworks.map(() => perNetwork);
          // Assign rounding remainder to last network
          const allocated = round6(perNetwork * fundedNetworks.length);
          const remainder = round6(artistPool - allocated);
          if (remainder !== 0) {
            networkAllocations[networkAllocations.length - 1] = round6(
              networkAllocations[networkAllocations.length - 1] + remainder
            );
          }
        }

        // --- Process each funded network: minimum-first calculation ---
        const artistTotals = new Map(); // artist_profile_id -> total across all networks

        for (let ni = 0; ni < fundedNetworks.length; ni++) {
          const network = fundedNetworks[ni];
          const networkAllocation = networkAllocations[ni];

          // Get unique eligible artists (counted once per network, not per song)
          const artists = await getNetworkArtists(base44, network);
          const numArtists = artists.length;

          if (numArtists === 0) continue;

          const minRequired = round6(numArtists * minPerArtist);

          if (networkAllocation < minRequired) {
            // --- Insufficient funding: pay $0.01 minimum to as many artists as possible ---
            const maxAffordable = Math.floor(networkAllocation / minPerArtist);
            results.fan.insufficient_networks += 1;
            console.log(
              `[${period}] Insufficient funding for network "${network.name}" (sub ${sub.id}): ` +
              `allocation $${networkAllocation} < required $${minRequired} for ${numArtists} artists. ` +
              `Paying ${maxAffordable} artists at minimum.`
            );

            for (let ai = 0; ai < artists.length; ai++) {
              if (ai < maxAffordable) {
                const prev = artistTotals.get(artists[ai].artist_profile_id) || 0;
                artistTotals.set(artists[ai].artist_profile_id, round6(prev + minPerArtist));
                results.fan.total_min_guaranteed = round6(results.fan.total_min_guaranteed + minPerArtist);
              }
            }
            continue;
          }

          // --- Minimum-first: reserve $0.01 per artist, then distribute remainder ---
          const remaining = round6(networkAllocation - minRequired);
          const allocationMethod = network.artist_allocation_method || 'automatic';

          const additionalAllocations = new Map();

          if (allocationMethod === 'equal' || allocationMethod === 'automatic' || remaining === 0) {
            // Equal distribution of remainder
            if (numArtists > 0 && remaining > 0) {
              const perArtist = round6(remaining / numArtists);
              let allocated = 0;
              for (let ai = 0; ai < artists.length; ai++) {
                if (ai === artists.length - 1) {
                  additionalAllocations.set(artists[ai].artist_profile_id, round6(remaining - allocated));
                } else {
                  additionalAllocations.set(artists[ai].artist_profile_id, perArtist);
                  allocated = round6(allocated + perArtist);
                }
              }
            }
          } else {
            // Weighted or custom: use artist weights
            const totalWeight = artists.reduce((s, a) => s + a.weight, 0);
            if (totalWeight > 0 && remaining > 0) {
              let allocated = 0;
              for (let ai = 0; ai < artists.length; ai++) {
                if (ai === artists.length - 1) {
                  additionalAllocations.set(artists[ai].artist_profile_id, round6(remaining - allocated));
                } else {
                  const amt = round6((remaining * artists[ai].weight) / totalWeight);
                  additionalAllocations.set(artists[ai].artist_profile_id, amt);
                  allocated = round6(allocated + amt);
                }
              }
            }
          }

          // Total per artist in this network = minimum + additional
          for (const a of artists) {
            const total = round6(minPerArtist + (additionalAllocations.get(a.artist_profile_id) || 0));
            const prev = artistTotals.get(a.artist_profile_id) || 0;
            artistTotals.set(a.artist_profile_id, round6(prev + total));
          }

          results.fan.total_min_guaranteed = round6(results.fan.total_min_guaranteed + minRequired);
        }

        // --- Credit each artist's combined earnings across all networks ---
        for (const [artistProfileId, totalAmount] of artistTotals) {
          if (totalAmount <= 0) continue;

          const pms = await base44.asServiceRole.entities.ArtistPaymentMethod.filter({
            artist_profile_id: artistProfileId,
          });
          const pm = pms && pms[0];

          if (pm) {
            await base44.asServiceRole.entities.ArtistPaymentMethod.updateMany(
              { artist_profile_id: artistProfileId },
              { $inc: { pending_balance: totalAmount, total_earned: totalAmount } }
            );
            await base44.asServiceRole.entities.WalletTransaction.create({
              user_id: pm.artist_user_id,
              transaction_type: 'subscription',
              amount: totalAmount,
              direction: 'credit',
              payment_method: 'wix_payments',
              status: 'completed',
              artist_profile_id: artistProfileId,
              description: `Funded network distribution (${fanArtistPct}%) from subscriber ${sub.user_name || sub.user_id} for ${period}`,
              external_transaction_id: `${idemKey}:artist:${artistProfileId}`,
            });
            results.fan.artists_credited += 1;
          } else {
            // No payment method on file — route to ops as fallback (artist accumulates nothing)
            await base44.asServiceRole.entities.WalletTransaction.create({
              user_id: adminUser.id,
              transaction_type: 'fee',
              amount: totalAmount,
              direction: 'credit',
              payment_method: 'wix_payments',
              status: 'completed',
              description: `Artist share fallback (no payment method) — ${sub.plan_code} for ${period}`,
              external_transaction_id: `${idemKey}:nopm:${artistProfileId}`,
            });
          }
        }

        processedSubIds.push(sub.id);
        results.fan.processed += 1;
      } else if (isArtistPro) {
        // --- Artist Pro: 100% to operations (unchanged) ---
        const adminPool = round6((monthly * artistProAdminPct) / 100);

        await base44.asServiceRole.entities.WalletTransaction.create({
          user_id: adminUser.id,
          transaction_type: 'subscription',
          amount: adminPool,
          direction: 'credit',
          payment_method: 'wix_payments',
          status: 'completed',
          description: `Artist Pro subscription (${artistProAdminPct}% to operations) — ${sub.plan_code} for ${period}`,
          external_transaction_id: idemKey,
        });
        results.artist_pro.admin_total = round6(results.artist_pro.admin_total + adminPool);
        processedSubIds.push(sub.id);
        results.artist_pro.processed += 1;
      } else {
        results.skipped.push({ subscription_id: sub.id, plan_code: sub.plan_code, reason: 'plan not handled by distributor' });
      }
    }

    // --- Notify admin/ops that the monthly disbursement was submitted ---
    const opsRecipients = [...(masterAdmins || []), ...(plainAdmins || [])]
      .filter((u) => u && u.id)
      .filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i)
      .slice(0, 50);

    const summary = {
      period,
      fan_processed: results.fan.processed,
      artists_credited: results.fan.artists_credited,
      ops_total: results.fan.ops_total,
      no_funded_network_routed_to_ops: results.fan.no_funded_network_routed_to_ops,
      insufficient_networks: results.fan.insufficient_networks,
      total_min_guaranteed: results.fan.total_min_guaranteed,
      artist_pro_processed: results.artist_pro.processed,
      artist_pro_admin_total: results.artist_pro.admin_total,
      skipped: results.skipped.length,
    };

    let notificationSent = false;
    let notificationError = null;
    if (processedSubIds.length > 0) {
      for (const admin of opsRecipients) {
        try {
          await base44.asServiceRole.entities.OpsNotification.create({
            recipient_user_id: admin.id,
            recipient_role: admin.role || 'admin',
            type: 'disbursement_submitted',
            title: `Monthly disbursement submitted — ${period}`,
            body: `The monthly artist disbursement for ${period} has been processed. ${results.fan.processed} fan subscription(s) distributed across ${results.fan.artists_credited} artist credit(s); $${results.fan.ops_total.toFixed(2)} to operations. Minimum guaranteed: $${results.fan.total_min_guaranteed.toFixed(2)}. Insufficient networks: ${results.fan.insufficient_networks}. Artist Pro: ${results.artist_pro.processed} subscription(s), $${results.artist_pro.admin_total.toFixed(2)} to operations.`,
            period,
            summary,
            is_read: false,
          });
          notificationSent = true;
        } catch (e) {
          notificationError = e.message;
          console.error(`Failed to send disbursement notification to admin ${admin.id}:`, e);
        }
      }
    }

    // --- Only after the confirmation notification is sent, mark subscriber payments fulfilled ---
    let fulfilledCount = 0;
    const fulfillmentErrors = [];
    if (notificationSent) {
      const fulfilledAt = new Date().toISOString();
      for (const subId of processedSubIds) {
        try {
          await base44.asServiceRole.entities.UserSubscription.update(subId, {
            disbursement_fulfilled: true,
            last_disbursement_period: period,
            last_disbursement_fulfilled_date: fulfilledAt,
          });
          fulfilledCount += 1;
        } catch (e) {
          fulfillmentErrors.push({ subscription_id: subId, error: e.message });
          console.error(`Failed to mark subscription ${subId} fulfilled:`, e);
        }
      }
    }

    results.disbursement = {
      notification_sent: notificationSent,
      notification_recipients: opsRecipients.length,
      subscriptions_fulfilled: fulfilledCount,
      fulfillment_errors: fulfillmentErrors,
    };
    if (!notificationSent && notificationError) {
      results.disbursement.notification_error = notificationError;
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    console.error('processSubscriptionRevenue error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});