import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access (scheduled task)
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Checking community milestones...');

    // Get all active communities
    const communities = await base44.entities.FrequencyCommunity.filter({ is_active: true });
    
    let notificationsSent = 0;
    const milestoneLog = [];

    for (const community of communities) {
      try {
        const memberCount = community.member_count || 0;
        const communityFund = community.community_fund || 0;
        const managerUserId = community.manager_user_id;

        if (!managerUserId) continue;

        // Membership milestones
        const membershipMilestones = [100, 500, 1000, 5000, 10000, 25000, 50000];
        const reachedMembershipMilestone = membershipMilestones.filter(m => m <= memberCount).pop();
        
        if (reachedMembershipMilestone) {
          // Check if this milestone was already notified
          const existingNotifications = await base44.entities.FanNotification.filter({
            fan_user_id: managerUserId,
            type: 'council_meeting_reminder',
          });

          const alreadyNotified = existingNotifications.some(n => 
            n.body?.includes(`${reachedMembershipMilestone}`) &&
            n.created_date && 
            new Date(n.created_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          );

          if (!alreadyNotified) {
            await base44.entities.FanNotification.create({
              fan_user_id: managerUserId,
              type: 'council_meeting_reminder',
              title: `🎉 ${community.name} Milestone!`,
              body: `Your community has reached ${reachedMembershipMilestone.toLocaleString()} members! Celebrate this amazing growth and keep engaging your members.`,
              artist_name: community.name,
              is_read: false,
            });

            // Send email notification
            const managerUser = await base44.entities.User.get(managerUserId);
            if (managerUser?.email) {
              await base44.integrations.Core.SendEmail({
                to: managerUser.email,
                subject: `🎉 ${community.name} Reached ${reachedMembershipMilestone.toLocaleString()} Members!`,
                body: `
                  <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;">
                    <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                      <h1 style="color: #667eea; font-size: 28px; margin: 0 0 20px 0; text-align: center;">🎉 Community Milestone!</h1>
                      
                      <div style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 25px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0 0 10px 0;">${community.name} has reached</p>
                        <p style="color: white; font-size: 48px; font-weight: bold; margin: 0;">${reachedMembershipMilestone.toLocaleString()}</p>
                        <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 10px 0 0 0;">Members!</p>
                      </div>

                      <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                        Congratulations on this incredible milestone! Your community is thriving thanks to your dedication and leadership.
                      </p>

                      <div style="background: #f7fafc; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0;">
                        <h3 style="color: #2d3748; font-size: 16px; margin: 0 0 10px 0;">📊 Current Stats:</h3>
                        <ul style="color: #4a5568; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                          <li><strong>Members:</strong> ${memberCount.toLocaleString()}</li>
                          <li><strong>Artists:</strong> ${community.artist_count || 0}</li>
                          <li><strong>Community Fund:</strong> $${communityFund.toLocaleString()}</li>
                        </ul>
                      </div>

                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.APP_URL || 'https://frequency.app'}/frequency/${community.id}" 
                           style="background: #667eea; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                          View Your Community
                        </a>
                      </div>

                      <p style="color: #718096; font-size: 14px; text-align: center; margin: 20px 0 0 0;">
                        Keep celebrating and engaging your amazing community! 🎵
                      </p>
                    </div>
                  </div>
                `,
              });
            }

            notificationsSent++;
            milestoneLog.push({
              community_id: community.id,
              community_name: community.name,
              milestone_type: 'membership',
              milestone_value: reachedMembershipMilestone,
              manager_id: managerUserId,
            });
          }
        }

        // Support milestones (community fund)
        const supportMilestones = [500, 1000, 5000, 10000, 25000, 50000];
        const reachedSupportMilestone = supportMilestones.filter(m => m <= communityFund).pop();
        
        if (reachedSupportMilestone) {
          const existingNotifications = await base44.entities.FanNotification.filter({
            fan_user_id: managerUserId,
            type: 'council_meeting_reminder',
          });

          const alreadyNotified = existingNotifications.some(n => 
            n.body?.includes(`$${reachedSupportMilestone}`) &&
            new Date(n.created_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          );

          if (!alreadyNotified) {
            await base44.entities.FanNotification.create({
              fan_user_id: managerUserId,
              type: 'council_meeting_reminder',
              title: `💰 ${community.name} Support Milestone!`,
              body: `Your community fund has reached $${reachedSupportMilestone.toLocaleString()}! Your members' support is making a real impact.`,
              artist_name: community.name,
              is_read: false,
            });

            const managerUser = await base44.entities.User.get(managerUserId);
            if (managerUser?.email) {
              await base44.integrations.Core.SendEmail({
                to: managerUser.email,
                subject: `💰 ${community.name} Fund Reached $${reachedSupportMilestone.toLocaleString()}!`,
                body: `
                  <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px 20px;">
                    <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                      <h1 style="color: #f5576c; font-size: 28px; margin: 0 0 20px 0; text-align: center;">💰 Support Milestone!</h1>
                      
                      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 25px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0 0 10px 0;">${community.name} Community Fund</p>
                        <p style="color: white; font-size: 48px; font-weight: bold; margin: 0;">$${reachedSupportMilestone.toLocaleString()}</p>
                      </div>

                      <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                        Amazing! Your community members are actively supporting artists and driving real impact in the music ecosystem.
                      </p>

                      <div style="background: #f7fafc; padding: 20px; border-left: 4px solid #f5576c; margin: 20px 0;">
                        <h3 style="color: #2d3748; font-size: 16px; margin: 0 0 10px 0;">📈 Impact Summary:</h3>
                        <ul style="color: #4a5568; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                          <li><strong>Total Fund:</strong> $${communityFund.toLocaleString()}</li>
                          <li><strong>Active Members:</strong> ${memberCount.toLocaleString()}</li>
                          <li><strong>Monthly Support:</strong> Growing! 📈</li>
                        </ul>
                      </div>

                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.APP_URL || 'https://frequency.app'}/frequency/${community.id}" 
                           style="background: #f5576c; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                          Celebrate With Your Community
                        </a>
                      </div>

                      <p style="color: #718096; font-size: 14px; text-align: center; margin: 20px 0 0 0;">
                        Thank you for building such an incredible supportive community! 🎵
                      </p>
                    </div>
                  </div>
                `,
              });
            }

            notificationsSent++;
            milestoneLog.push({
              community_id: community.id,
              community_name: community.name,
              milestone_type: 'support',
              milestone_value: reachedSupportMilestone,
              manager_id: managerUserId,
            });
          }
        }

      } catch (communityError) {
        console.error(`Failed to check milestones for community ${community.id}:`, communityError);
      }
    }

    return Response.json({
      success: true,
      message: `Checked ${communities.length} communities. Sent ${notificationsSent} milestone notifications.`,
      notificationsSent,
      milestoneLog,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Community milestone check error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});