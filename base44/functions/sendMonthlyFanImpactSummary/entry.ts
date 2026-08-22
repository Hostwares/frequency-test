import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access (scheduled task)
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all unique fans from SupportAllocation
    const allAllocations = await base44.entities.SupportAllocation.filter({ is_active: true });
    const uniqueFanIds = [...new Set(allAllocations.map(a => a.fan_user_id).filter(Boolean))];
    
    let reportsSent = 0;
    const currentDate = new Date();

    for (const fanUserId of uniqueFanIds) {
      try {
        // Get fan's user account
        const fanUsers = await base44.entities.User.filter({ id: fanUserId });
        if (!fanUsers || fanUsers.length === 0) continue;
        
        const fanUser = fanUsers[0];
        
        // Get fan's allocations
        const fanAllocations = allAllocations.filter(a => a.fan_user_id === fanUserId);
        const totalMonthlySupport = fanAllocations.reduce((sum, a) => sum + (a.amount || 0), 0);
        const totalArtistsSupported = new Set(fanAllocations.map(a => a.artist_profile_id)).size;

        // Get recent milestones (artists who reached milestones this month)
        const currentMonth = currentDate.toISOString().slice(0, 7);
        const recentMilestones = [];
        
        for (const allocation of fanAllocations) {
          const artistProfile = await base44.entities.ArtistProfile.filter({ id: allocation.artist_profile_id });
          if (artistProfile && artistProfile.length > 0) {
            const artist = artistProfile[0];
            const supporterCount = artist.supporter_count || 0;
            
            // Check if artist reached a milestone this month
            const milestones = [20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000];
            const currentMilestone = milestones.filter(m => m <= supporterCount).pop();
            if (currentMilestone && currentMilestone >= 20000) {
              recentMilestones.push({
                artist_name: artist.artist_name,
                fans: supporterCount,
                milestone: currentMilestone,
              });
            }
          }
        }

        // Build email content
        const emailSubject = `🎵 Your ${currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })} Impact Report`;
        
        const emailBody = `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1025 0%, #0f172a 100%); padding: 40px 20px;">
            <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #667eea; font-size: 28px; margin: 0 0 10px 0;">🎵 Monthly Impact Report</h1>
                <p style="color: #718096; font-size: 14px; margin: 0;">${currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
              </div>

              <!-- Fan Name -->
              <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); border-radius: 8px;">
                <h2 style="color: white; font-size: 24px; margin: 0;">Thank You, ${fanUser.full_name || 'Supporter'}!</h2>
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 10px 0 0 0;">Your support is changing lives</p>
              </div>

              <!-- Key Metrics -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
                <!-- Artists Supported -->
                <div style="background: #f7fafc; padding: 20px; border-radius: 8px; text-align: center;">
                  <p style="color: #718096; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase;">Artists Supported</p>
                  <p style="color: #2d3748; font-size: 32px; font-weight: bold; margin: 0;">${totalArtistsSupported}</p>
                </div>

                <!-- Monthly Support -->
                <div style="background: #f7fafc; padding: 20px; border-radius: 8px; text-align: center;">
                  <p style="color: #718096; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase;">Monthly Support</p>
                  <p style="color: #2d3748; font-size: 32px; font-weight: bold; margin: 0;">$${totalMonthlySupport.toFixed(2)}</p>
                </div>
              </div>

              <!-- Milestone Achievements -->
              ${recentMilestones.length > 0 ? `
                <div style="background: linear-gradient(135deg, #d946ef 0%, #a855f7 100%); padding: 25px; border-radius: 8px; margin-bottom: 30px; color: white;">
                  <h3 style="margin: 0 0 15px 0; font-size: 18px;">🎉 Milestones You Helped Achieve!</h3>
                  <p style="font-size: 13px; margin: 0 0 15px 0; opacity: 0.9;">
                    Your support helped these artists reach major fan milestones:
                  </p>
                  ${recentMilestones.map(milestone => `
                    <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 6px; margin-bottom: 8px;">
                      <p style="font-weight: bold; margin: 0 0 5px 0; font-size: 14px;">${milestone.artist_name}</p>
                      <p style="font-size: 12px; margin: 0;">🎯 Reached ${milestone.fans.toLocaleString()} fans (${milestone.milestone >= 50000 ? '👑' : milestone.milestone >= 30000 ? '🚀' : '⭐'} ${milestone.milestone.toLocaleString()} milestone)</p>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <!-- Impact Summary -->
              <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
                <h3 style="color: #166534; font-size: 16px; margin: 0 0 10px 0;">💡 Your Impact This Month</h3>
                <ul style="color: #15803d; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Supported ${totalArtistsSupported} artist${totalArtistsSupported !== 1 ? 's' : ''} with $${totalMonthlySupport.toFixed(2)}</li>
                  ${recentMilestones.length > 0 ? `<li>Helped ${recentMilestones.length} artist${recentMilestones.length !== 1 ? 's' : ''} reach major milestones</li>` : ''}
                  <li>Been part of the Frequency community for ${fanAllocations.length} month${fanAllocations.length !== 1 ? 's' : ''}</li>
                </ul>
              </div>

              <!-- Footer -->
              <div style="text-align: center; padding-top: 20px; border-top: 2px solid #e2e8f0; margin-top: 30px;">
                <p style="color: #718096; font-size: 13px; margin: 0 0 10px 0;">
                  🎵 Keep making a difference in the music community!
                </p>
                <p style="color: #a0aec0; font-size: 11px; margin: 0;">
                  © 2026 Frequency. All rights reserved.
                </p>
              </div>

            </div>
          </div>
        `;

        // Send email
        await base44.integrations.Core.SendEmail({
          to: fanUser.email,
          subject: emailSubject,
          body: emailBody,
          from_name: 'Frequency',
        });

        reportsSent++;
        
      } catch (fanError) {
        console.error(`Failed to send report to fan ${fanUserId}:`, fanError);
      }
    }

    return Response.json({
      success: true,
      message: `Sent ${reportsSent} monthly fan impact reports`,
      reportsSent,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});