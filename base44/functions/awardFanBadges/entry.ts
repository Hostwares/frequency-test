import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access (automation trigger)
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active support allocations
    const allAllocations = await base44.entities.SupportAllocation.list();
    
    // Group by fan
    const fanData = {};
    for (const allocation of allAllocations) {
      if (!allocation.is_active) continue;
      
      const fanId = allocation.fan_user_id;
      if (!fanData[fanId]) {
        fanData[fanId] = {
          totalSupported: 0,
          artistsSupported: new Set(),
          monthsActive: new Set(),
          referredFans: new Set(),
        };
      }
      
      fanData[fanId].totalSupported += allocation.amount || 0;
      fanData[fanId].artistsSupported.add(allocation.artist_profile_id);
      fanData[fanId].monthsActive.add(allocation.month);
      
      // Track referrals
      if (allocation.referred_by_fan_id) {
        const referrerId = allocation.referred_by_fan_id;
        if (!fanData[referrerId]) {
          fanData[referrerId] = {
            totalSupported: 0,
            artistsSupported: new Set(),
            monthsActive: new Set(),
            referredFans: new Set(),
          };
        }
        fanData[referrerId].referredFans.add(allocation.fan_user_id);
      }
    }

    let badgesAwarded = 0;
    const badgeLog = [];

    for (const [fanId, data] of Object.entries(fanData)) {
      const artistsCount = data.artistsSupported.size;
      const monthsCount = data.monthsActive.size;
      const referralsCount = data.referredFans.size;
      const totalSupported = data.totalSupported;

      // Get existing badges
      const existingBadges = await base44.entities.FanBadge.filter({ fan_user_id: fanId });
      const existingBadgeTypes = new Set(existingBadges.map(b => b.badge_type));

      const badgesToAward = [];

      // Support-based badges
      if (!existingBadgeTypes.has('early_supporter') && totalSupported >= 10) {
        badgesToAward.push({ badge_type: 'early_supporter', badge_tier: 'bronze' });
      }

      if (!existingBadgeTypes.has('super_fan') && totalSupported >= 50) {
        badgesToAward.push({ badge_type: 'super_fan', badge_tier: 'bronze' });
      }

      if (!existingBadgeTypes.has('mega_fan') && totalSupported >= 200) {
        badgesToAward.push({ badge_type: 'mega_fan', badge_tier: 'silver' });
      }

      if (!existingBadgeTypes.has('ultra_fan') && totalSupported >= 500) {
        badgesToAward.push({ badge_type: 'ultra_fan', badge_tier: 'gold' });
      }

      if (!existingBadgeTypes.has('legendary_fan') && totalSupported >= 1000) {
        badgesToAward.push({ badge_type: 'legendary_fan', badge_tier: 'platinum' });
      }

      if (!existingBadgeTypes.has('loyal_patron') && monthsCount >= 6) {
        badgesToAward.push({ badge_type: 'loyal_patron', badge_tier: 'gold' });
      }

      // Referral badges
      if (!existingBadgeTypes.has('fan_scout') && referralsCount >= 5) {
        badgesToAward.push({ badge_type: 'fan_scout', badge_tier: 'bronze' });
      }

      if (!existingBadgeTypes.has('referral_master') && referralsCount >= 15) {
        badgesToAward.push({ badge_type: 'referral_master', badge_tier: 'silver' });
      }

      if (!existingBadgeTypes.has('referral_legend') && referralsCount >= 50) {
        badgesToAward.push({ badge_type: 'referral_legend', badge_tier: 'gold' });
      }

      // Genre explorer (check artist genres)
      if (artistsCount >= 10 && !existingBadgeTypes.has('genre_explorer')) {
        badgesToAward.push({ badge_type: 'genre_explorer', badge_tier: 'bronze' });
      }

      // Create badges and trigger notifications
      for (const badge of badgesToAward) {
        try {
          const badgeRecord = await base44.entities.FanBadge.create({
            fan_user_id: fanId,
            badge_type: badge.badge_type,
            badge_tier: badge.badge_tier,
            earned_date: new Date().toISOString(),
            criteria_met: {
              total_supported: totalSupported,
              artists_supported: artistsCount,
              referrals_count: referralsCount,
              months_active: monthsCount,
            },
            is_displayed: true,
          });
          
          // Trigger notification automation (will be caught by entity automation)
          // Badge notification will be sent via the Badge Unlock Notifications automation
          
          badgesAwarded++;
          badgeLog.push({ fanId, badge: badge.badge_type, tier: badge.badge_tier });
        } catch (err) {
          console.error(`Failed to award badge to fan ${fanId}:`, err);
        }
      }
    }

    return Response.json({
      success: true,
      message: `Awarded ${badgesAwarded} badges to ${badgeLog.length} fans`,
      badgesAwarded,
      badgeLog,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});