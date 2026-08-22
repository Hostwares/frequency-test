import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify admin access (admin or master_admin)
    const user = await base44.auth.me();
    if (!user || !['admin', 'master_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('Processing monthly revenue sharing...');

    // Read configurable split from PlatformSetting (fallback: 70/30)
    const getSetting = async (key, fallback) => {
      const settings = await base44.asServiceRole.entities.PlatformSetting.filter({ setting_key: key });
      const raw = settings[0]?.setting_value;
      if (raw === undefined || raw === null || raw === '') return fallback;
      const n = Number(raw);
      return isNaN(n) ? fallback : n;
    };

    const directArtistPct = await getSetting('revenue_sharing_direct_artist_pct', 70);
    const networkPct = await getSetting('revenue_sharing_network_pct', 30);
    const directArtistPercentage = directArtistPct / 100;
    const networkPercentage = networkPct / 100;

    // Get all active support allocations (service role — spans all fans)
    const allocations = await base44.asServiceRole.entities.SupportAllocation.filter({ is_active: true });

    const processedFans = new Set();
    const payoutResults = [];

    for (const allocation of allocations) {
      if (processedFans.has(allocation.fan_user_id)) continue;
      processedFans.add(allocation.fan_user_id);

      const fanAllocations = allocations.filter(a => a.fan_user_id === allocation.fan_user_id);
      const totalMonthlySupport = fanAllocations.reduce((sum, a) => sum + (a.amount || 0), 0);

      if (totalMonthlySupport === 0) continue;

      for (const fanAlloc of fanAllocations) {
        const directArtistAmount = fanAlloc.amount * directArtistPercentage;
        const networkAmount = fanAlloc.amount * networkPercentage;

        // Update direct artist payment method
        const directArtistPayments = await base44.asServiceRole.entities.ArtistPaymentMethod.filter({
          artist_profile_id: fanAlloc.artist_profile_id,
        });

        if (directArtistPayments.length > 0) {
          const directPayment = directArtistPayments[0];
          await base44.asServiceRole.entities.ArtistPaymentMethod.update(directPayment.id, {
            pending_balance: (directPayment.pending_balance || 0) + directArtistAmount,
            total_earned: (directPayment.total_earned || 0) + directArtistAmount,
          });
        }

        // Distribute network share to connected artists
        const artistProfile = await base44.asServiceRole.entities.ArtistProfile.get(fanAlloc.artist_profile_id);
        if (artistProfile && artistProfile.connected_networks && artistProfile.connected_networks.length > 0) {
          const networkArtists = artistProfile.connected_networks;
          const sharePerArtist = networkAmount / networkArtists.length;

          for (const networkArtistId of networkArtists) {
            const networkArtistPayments = await base44.asServiceRole.entities.ArtistPaymentMethod.filter({
              artist_profile_id: networkArtistId,
            });

            if (networkArtistPayments.length > 0) {
              const networkPayment = networkArtistPayments[0];
              await base44.asServiceRole.entities.ArtistPaymentMethod.update(networkPayment.id, {
                pending_balance: (networkPayment.pending_balance || 0) + sharePerArtist,
                total_earned: (networkPayment.total_earned || 0) + sharePerArtist,
              });
            }
          }
        }
      }
    }

    // Process automatic payouts for artists who reached $50 threshold
    const allPaymentMethods = await base44.asServiceRole.entities.ArtistPaymentMethod.filter({ is_active: true });

    for (const pm of allPaymentMethods) {
      const pendingBalance = pm.pending_balance || 0;

      if (pendingBalance >= 50) {
        const payoutData = {
          artist_profile_id: pm.artist_profile_id,
          artist_user_id: pm.artist_user_id,
          amount: pendingBalance,
          payout_type: 'monthly',
          status: 'processing',
          processed_date: new Date().toISOString(),
          payment_provider: pm.payment_provider,
          payout_email: pm.account_email,
        };

        await base44.asServiceRole.entities.ArtistPayout.create(payoutData);

        await base44.asServiceRole.entities.ArtistPaymentMethod.update(pm.id, {
          pending_balance: 0,
          last_payout_date: new Date().toISOString(),
          last_payout_amount: pendingBalance,
        });

        payoutResults.push({
          artist_profile_id: pm.artist_profile_id,
          amount: pendingBalance,
          status: 'processing',
        });

        console.log(`Payout processed for artist ${pm.artist_profile_id}: $${pendingBalance.toFixed(2)}`);
      }
    }

    return Response.json({
      success: true,
      split_config: { direct_artist_pct: directArtistPct, network_pct: networkPct },
      processed_fans: processedFans.size,
      payouts_processed: payoutResults.length,
      payouts: payoutResults,
    });
  } catch (error) {
    console.error('Revenue sharing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});