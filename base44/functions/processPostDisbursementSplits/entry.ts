import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Post-Disbursement Collaborator Split Engine
 *
 * Runs AFTER an artist has received their platform disbursement
 * (processMonthlyPayouts sends the artist their full share via Stripe).
 *
 * For each completed ArtistPayout that has not yet been split:
 *   1. Finds the artist's active account-level (artist_default) RevenueSplit
 *      whose collaborator percentages total exactly 100%.
 *   2. Splits the disbursed amount (what the artist already received) across
 *      the configured collaborators, creating pending CollaboratorEarning records.
 *   3. Marks the payout collaborator_split_applied = true (idempotency).
 *
 * The artist receives their FULL disbursement first; only then is that received
 * amount further split per the artist's own configured percentages. No additional
 * platform fee is deducted — the platform already took its share before payout.
 *
 * Artists with no active split (or one not totaling 100%) are skipped and left
 * unmarked, so they keep their full disbursement and are retried once configured.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'master_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log(`Post-disbursement split run triggered by ${user.email} (${user.role})`);

    // All completed payouts (service role — records are created by processMonthlyPayouts)
    const completed = await base44.asServiceRole.entities.ArtistPayout.filter({
      status: 'completed',
    }, '-created_date', 500);

    // Only those not yet split (field is undefined for legacy payouts)
    const unsplit = completed.filter((p) => !p.collaborator_split_applied);

    const results = {
      total_completed: completed.length,
      candidates: unsplit.length,
      processed: 0,
      skipped_no_split: 0,
      earnings_created: 0,
      total_distributed: 0,
      details: [],
    };

    for (const payout of unsplit) {
      const amount = Number(payout.amount) || 0;

      // Nothing to split — mark applied so it isn't reprocessed
      if (amount <= 0) {
        await base44.asServiceRole.entities.ArtistPayout.update(payout.id, {
          collaborator_split_applied: true,
          collaborator_split_date: new Date().toISOString(),
        });
        continue;
      }

      // Find the artist's active account-level split that totals exactly 100%
      const splits = await base44.asServiceRole.entities.RevenueSplit.filter({
        artist_profile_id: payout.artist_profile_id,
        status: 'active',
        split_type: 'artist_default',
      });

      const split = (splits || []).find((s) => {
        const total = (s.collaborators || []).reduce(
          (sum, c) => sum + (Number(c.revenue_percentage) || 0),
          0
        );
        return Math.round(total * 100) / 100 === 100;
      });

      if (!split) {
        // No valid split configured — artist keeps their full disbursement.
        // Leave unmarked so this is retried once the artist configures a split.
        results.skipped_no_split += 1;
        results.details.push({
          payout_id: payout.id,
          artist_profile_id: payout.artist_profile_id,
          amount,
          status: 'no_active_split',
        });
        continue;
      }

      // Resolve artist name for the earning records
      let artistName = payout.artist_name || null;
      if (!artistName) {
        try {
          const ap = await base44.asServiceRole.entities.ArtistProfile.get(payout.artist_profile_id);
          artistName = ap?.artist_name || null;
        } catch {
          // leave null
        }
      }

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // Split the disbursed amount per the artist's configured percentages
      const earnings = (split.collaborators || []).map((collab) => {
        const pct = Number(collab.revenue_percentage) || 0;
        const share = +((amount * pct) / 100).toFixed(4);
        return {
          split_id: split.id,
          split_name: split.split_name,
          artist_profile_id: payout.artist_profile_id,
          artist_name: artistName,
          collaborator_user_id: collab.collaborator_user_id || null,
          collaborator_name: collab.full_name,
          collaborator_email: collab.email || null,
          collaborator_role: collab.role,
          revenue_source: 'artist_disbursement',
          gross_revenue: amount,
          platform_fee: 0,
          net_revenue: amount,
          revenue_percentage: pct,
          collaborator_amount: share,
          payment_status: 'pending',
          payment_method: collab.payment_method || 'frequency_wallet',
          earning_period_month: month,
          earning_period_year: year,
          processed_date: now.toISOString(),
        };
      });

      if (earnings.length > 0) {
        await base44.asServiceRole.entities.CollaboratorEarning.bulkCreate(earnings);
        results.earnings_created += earnings.length;
        results.total_distributed = +(
          results.total_distributed +
          earnings.reduce((s, e) => s + e.collaborator_amount, 0)
        ).toFixed(4);
      }

      // Mark this payout as split-applied (idempotency — prevents double-splitting)
      await base44.asServiceRole.entities.ArtistPayout.update(payout.id, {
        collaborator_split_applied: true,
        collaborator_split_date: now.toISOString(),
      });

      // Audit trail
      const distributed = earnings.reduce((s, e) => s + e.collaborator_amount, 0);
      try {
        await base44.asServiceRole.entities.SplitAuditLog.create({
          split_id: split.id,
          split_name: split.split_name,
          artist_profile_id: payout.artist_profile_id,
          user_id: user.id,
          user_name: user.full_name || user.email,
          action: 'revenue_adjustment',
          action_category: 'revenue',
          details: `Post-disbursement split applied to payout ${payout.id} ($${amount.toFixed(2)}) — ${earnings.length} collaborator(s), $${distributed.toFixed(2)} total queued for payment.`,
          revenue_adjustment: amount,
        });
      } catch (e) {
        console.warn('Failed to log post-disbursement split audit', e);
      }

      results.processed += 1;
      results.details.push({
        payout_id: payout.id,
        artist_profile_id: payout.artist_profile_id,
        amount,
        split_name: split.split_name,
        collaborators: earnings.length,
        distributed: +distributed.toFixed(2),
        status: 'split_applied',
      });
    }

    console.log(
      `Post-disbursement split complete — ${results.processed} payout(s) split, ` +
      `${results.earnings_created} collaborator earning(s) created, ` +
      `$${results.total_distributed.toFixed(2)} total queued, ${results.skipped_no_split} skipped (no active split).`
    );

    return Response.json({ success: true, ...results });
  } catch (error) {
    console.error('processPostDisbursementSplits error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});