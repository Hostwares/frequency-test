import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const RESONANCE_MILESTONES = [
  { id: 'resonance_500', threshold: 500, label: '500' },
  { id: 'resonance_1000', threshold: 1000, label: '1,000' },
  { id: 'resonance_2500', threshold: 2500, label: '2,500' },
  { id: 'resonance_5000', threshold: 5000, label: '5,000' },
  { id: 'resonance_10000', threshold: 10000, label: '10,000' },
  { id: 'resonance_25000', threshold: 25000, label: '25,000' },
  { id: 'resonance_50000', threshold: 50000, label: '50,000' },
  { id: 'resonance_100000', threshold: 100000, label: '100,000' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('Checking community Resonance Score milestones...');

    // Get Gmail connection for admin email alerts
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Get all active communities
    const communities = await base44.asServiceRole.entities.FrequencyCommunity.filter({ is_active: true });
    console.log(`Found ${communities.length} active communities`);

    // Get all admin users to notify
    const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    console.log(`Found ${adminUsers.length} admin users to notify`);

    if (adminUsers.length === 0) {
      return Response.json({ success: true, alerts_sent: 0, message: 'No admin users found to notify' });
    }

    const alertsSent = [];

    for (const community of communities) {
      try {
        const resonanceScore = community.resonance_score || 0;
        const alreadyNotified = community.resonance_milestones_notified || [];

        // Find milestones that have been crossed but not yet notified
        const newMilestones = RESONANCE_MILESTONES.filter(
          m => resonanceScore >= m.threshold && !alreadyNotified.includes(m.id)
        );

        if (newMilestones.length === 0) {
          continue;
        }

        console.log(`Community "${community.name}": ${newMilestones.length} new resonance milestone(s) — score: ${resonanceScore}`);

        const highestMilestone = newMilestones[newMilestones.length - 1];
        const milestoneList = newMilestones.map(m => `<li>🏆 Resonance Score ${m.label}</li>`).join('');

        // Send in-app notification + email to each admin
        for (const admin of adminUsers) {
          // In-app notification
          await base44.asServiceRole.entities.FanNotification.create({
            fan_user_id: admin.id,
            type: 'spotlight_alert',
            title: `🏆 ${community.name} — Resonance Milestone!`,
            body: `Community "${community.name}" has crossed a major Resonance Score threshold: ${highestMilestone.label}. Current score: ${resonanceScore.toLocaleString()}.`,
            artist_name: community.name,
            is_read: false,
          });

          // Email via Gmail API
          if (admin.email) {
            const emailBody = `
<html>
<body style="font-family: 'Inter', Arial, sans-serif; background: #0a0a14; color: #e0e0e0; padding: 30px;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(145deg, rgba(139, 92, 246, 0.08), rgba(6, 182, 212, 0.04), transparent); border: 1px solid rgba(139, 92, 246, 0.2); padding: 30px; border-radius: 12px;">
    <div style="text-align: center; margin-bottom: 25px;">
      <h1 style="color: #a855f7; font-size: 26px; margin: 0;">🏆 Community Resonance Milestone</h1>
      <p style="color: #06b6d4; font-size: 13px; margin-top: 5px;">Platform Operations Alert — The Mainstream Frequency</p>
    </div>

    <p style="font-size: 15px; line-height: 1.6;">A community has crossed a major Resonance Score growth threshold:</p>

    <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid rgba(139, 92, 246, 0.15);">
      <h3 style="color: #06b6d4; margin: 0 0 12px 0; font-size: 18px;">${community.name}</h3>
      <p style="margin: 8px 0; font-size: 14px;"><strong>Genre:</strong> ${community.genre || 'General'}</p>
      <p style="margin: 8px 0; font-size: 14px;"><strong>Members:</strong> ${(community.member_count || 0).toLocaleString()}</p>
      <p style="margin: 8px 0; font-size: 14px;"><strong>Artists:</strong> ${(community.artist_count || 0).toLocaleString()}</p>
      <p style="margin: 8px 0; font-size: 14px;"><strong>Current Resonance Score:</strong> <span style="color: #d946ef; font-weight: bold; font-size: 18px;">${resonanceScore.toLocaleString()}</span></p>
    </div>

    <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #14b8a6; margin: 0 0 10px 0; font-size: 15px;">🎊 Milestone${newMilestones.length > 1 ? 's' : ''} Reached:</h3>
      <ul style="color: #e0e0e0; font-size: 14px; line-height: 2; padding-left: 20px; margin: 0;">
        ${milestoneList}
      </ul>
    </div>

    <p style="font-size: 13px; color: #a0a0a0; line-height: 1.6;">Review community details and engagement trends in the Platform Operations dashboard under the Communities tab.</p>

    <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid rgba(139, 92, 246, 0.15);">
      <p style="font-size: 11px; color: #707070;">You're receiving this automated alert as a Platform Operations admin.</p>
      <p style="font-size: 11px; color: #707070; margin-top: 5px;">The Mainstream Frequency © 2026</p>
    </div>
  </div>
</body>
</html>`;

            const mimeMessage = [
              `To: ${admin.email}`,
              `From: The Mainstream Frequency <noreply@frequency.com>`,
              `Subject: =?UTF-8?B?${btoa('🏆 ' + community.name + ' — Resonance Score ' + highestMilestone.label + '+')}?=`,
              `Content-Type: text/html; charset=UTF-8`,
              `MIME-Version: 1.0`,
              ``,
              emailBody
            ].join('\r\n');

            const rawMessage = btoa(unescape(encodeURIComponent(mimeMessage)));

            const gmailResponse = await fetch(
              'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ raw: rawMessage })
              }
            );

            if (!gmailResponse.ok) {
              const gmailError = await gmailResponse.text();
              console.error(`Gmail API error for admin ${admin.email}:`, gmailError);
            } else {
              const gmailResult = await gmailResponse.json();
              console.log(`Gmail alert sent to ${admin.email}, message ID: ${gmailResult.id}`);
            }
          }
        }

        // Mark milestones as notified on the community
        const updatedMilestones = [...alreadyNotified, ...newMilestones.map(m => m.id)];
        await base44.asServiceRole.entities.FrequencyCommunity.update(community.id, {
          resonance_milestones_notified: updatedMilestones
        });

        // Log to audit trail
        await base44.asServiceRole.entities.AuditLog.create({
          user_id: user.id,
          user_name: user.full_name || user.email,
          user_email: user.email,
          user_role: user.role,
          action: 'community_resonance_milestone',
          action_category: 'community',
          entity_type: 'FrequencyCommunity',
          entity_id: community.id,
          details: `Community "${community.name}" crossed Resonance Score milestone(s): ${newMilestones.map(m => m.label).join(', ')}. Current score: ${resonanceScore.toLocaleString()}.`,
          severity: 'info',
        });

        alertsSent.push({
          community_id: community.id,
          community_name: community.name,
          resonance_score: resonanceScore,
          milestones_reached: newMilestones.map(m => m.label),
          admins_notified: adminUsers.length,
        });

        console.log(`Alerts sent for community "${community.name}" to ${adminUsers.length} admin(s)`);
      } catch (error) {
        console.error(`Failed to process community ${community.id}:`, error);
      }
    }

    console.log(`Resonance milestone check complete. ${alertsSent.length} alert group(s) sent.`);

    return Response.json({
      success: true,
      alerts_sent: alertsSent.length,
      alerts: alertsSent,
    });
  } catch (error) {
    console.error('Community resonance milestone alert error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});