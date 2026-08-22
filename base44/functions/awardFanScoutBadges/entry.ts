import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access (automation trigger)
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active support allocations with referrals
    const allAllocations = await base44.entities.SupportAllocation.filter({ is_active: true });
    
    // Group by referrer fan
    const fanReferrals = {};
    for (const allocation of allAllocations) {
      if (!allocation.referred_by_fan_id) continue;
      
      const referrerId = allocation.referred_by_fan_id;
      if (!fanReferrals[referrerId]) {
        fanReferrals[referrerId] = {
          count: 0,
          referredFans: new Set(),
          totalSupport: 0,
        };
      }
      
      fanReferrals[referrerId].count++;
      fanReferrals[referrerId].referredFans.add(allocation.fan_user_id);
      fanReferrals[referrerId].totalSupport += allocation.amount || 0;
    }

    let badgesAwarded = 0;
    let notificationsSent = 0;
    const activityLog = [];

    // Check each referrer for Fan Scout milestone
    for (const [fanId, data] of Object.entries(fanReferrals)) {
      const referralCount = data.referredFans.size;
      
      // Check if fan reached Fan Scout milestone (5+ referrals)
      if (referralCount >= 5) {
        // Check if they already have the Fan Scout badge
        const existingBadges = await base44.entities.FanBadge.filter({ 
          fan_user_id: fanId,
          badge_type: 'fan_scout'
        });
        
        if (existingBadges.length === 0) {
          // Award Fan Scout badge
          try {
            await base44.entities.FanBadge.create({
              fan_user_id: fanId,
              badge_type: 'fan_scout',
              badge_tier: 'bronze',
              earned_date: new Date().toISOString(),
              criteria_met: {
                referrals_count: referralCount,
                total_support_generated: data.totalSupport,
                milestone_reached: '5_referrals',
              },
              is_displayed: true,
            });
            badgesAwarded++;
            
            activityLog.push({
              fanId,
              action: 'badge_awarded',
              badge_type: 'fan_scout',
              referral_count: referralCount,
            });
          } catch (err) {
            console.error(`Failed to award Fan Scout badge to fan ${fanId}:`, err);
          }
        }
        
        // Send notification about reaching milestone
        try {
          // Get fan user details
          const fanUser = await base44.entities.User.get(fanId);
          const fanEmail = fanUser?.email;
          
          // Create in-app notification
          await base44.entities.FanNotification.create({
            fan_user_id: fanId,
            type: 'spotlight_alert',
            title: '🎉 You\'re a Fan Scout!',
            body: `Congratulations! You've referred ${referralCount} new listeners to Frequency and earned the Fan Scout badge. Your support is helping independent artists thrive!`,
            is_read: false,
          });
          
          notificationsSent++;
          
          // Send email notification
          if (fanEmail) {
            await base44.integrations.Core.SendEmail({
              to: fanEmail,
              subject: '🎉 Congratulations! You\'ve Earned the Fan Scout Badge',
              body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #a855f7;">🎉 You're a Fan Scout!</h2>
                  <p>Congratulations! You've reached an amazing milestone:</p>
                  <div style="background: linear-gradient(135deg, #7c3aed, #06b6d4); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
                    <p style="color: white; font-size: 18px; margin: 0;"><strong>${referralCount} New Listeners Referred!</strong></p>
                  </div>
                  <p>You've officially earned the <strong>Fan Scout</strong> badge for bringing ${referralCount} music lovers to Frequency. Your referrals are generating <strong>$${data.totalSupport.toFixed(2)}/month</strong> in support for independent artists!</p>
                  <p>Keep sharing the music you love and help more artists thrive. Every referral makes a difference.</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.APP_URL || 'https://frequency.app'}/fan-dashboard" 
                       style="background: #a855f7; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
                      View Your Dashboard
                    </a>
                  </div>
                  <p style="color: #666; font-size: 14px;">Thank you for being part of the Frequency community and supporting independent music!</p>
                </div>
              `,
            });
            
            activityLog.push({
              fanId,
              action: 'notification_sent',
              email: fanEmail,
              referral_count: referralCount,
            });
          }
        } catch (err) {
          console.error(`Failed to notify fan ${fanId}:`, err);
        }
      }
    }

    return Response.json({
      success: true,
      message: `Processed ${Object.keys(fanReferrals).length} referrers. Awarded ${badgesAwarded} Fan Scout badges. Sent ${notificationsSent} notifications.`,
      badgesAwarded,
      notificationsSent,
      activityLog,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});