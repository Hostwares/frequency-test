import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const MILESTONES = [
  { id: 'milestone_100', threshold: 100, label: '$100' },
  { id: 'milestone_500', threshold: 500, label: '$500' },
  { id: 'milestone_1000', threshold: 1000, label: '$1,000' },
  { id: 'milestone_5000', threshold: 5000, label: '$5,000' },
  { id: 'milestone_10000', threshold: 10000, label: '$10,000' },
  { id: 'milestone_25000', threshold: 25000, label: '$25,000' },
  { id: 'milestone_50000', threshold: 50000, label: '$50,000' },
  { id: 'milestone_100000', threshold: 100000, label: '$100,000' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify admin access
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('Checking Admin Partner earnings milestones...');

    // Get Gmail connection for sending emails
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Get all active admin partners
    const partners = await base44.asServiceRole.entities.AdminPartner.filter({ is_active: true });
    console.log(`Found ${partners.length} active admin partners`);

    const alertsSent = [];

    for (const partner of partners) {
      try {
        // Get all earnings records for this partner
        const earnings = await base44.asServiceRole.entities.AdminPartnerEarning.filter({
          admin_partner_id: partner.id
        });

        // Calculate cumulative lifetime payout (sum of all paid amounts + pending)
        const totalLifetime = earnings.reduce((sum, e) => sum + (e.estimated_payout || 0), 0);
        const totalPaid = earnings.reduce((sum, e) => sum + (e.paid_amount || 0), 0);

        const alreadyNotified = partner.milestones_notified || [];

        // Find milestones that have been reached but not yet notified
        const newMilestones = MILESTONES.filter(
          m => totalLifetime >= m.threshold && !alreadyNotified.includes(m.id)
        );

        if (newMilestones.length === 0) {
          console.log(`Partner ${partner.partner_name}: no new milestones (lifetime: $${totalLifetime.toFixed(2)})`);
          continue;
        }

        console.log(`Partner ${partner.partner_name}: ${newMilestones.length} new milestone(s) reached`);

        // Get the highest milestone reached for the email subject
        const highestMilestone = newMilestones[newMilestones.length - 1];

        // Build email content
        const milestoneList = newMilestones.map(m => `<li>🎉 ${m.label} in lifetime earnings</li>`).join('');
        const sharePct = partner.revenue_share_percentage || 0;

        const emailBody = `
<html>
<body style="font-family: 'Inter', Arial, sans-serif; background: #0a0a14; color: #e0e0e0; padding: 30px;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(145deg, rgba(139, 92, 246, 0.08), rgba(6, 182, 212, 0.04), transparent); border: 1px solid rgba(139, 92, 246, 0.2); padding: 30px; border-radius: 12px;">
    <div style="text-align: center; margin-bottom: 25px;">
      <h1 style="color: #a855f7; font-size: 28px; margin: 0;">🏆 Earnings Milestone Reached!</h1>
      <p style="color: #06b6d4; font-size: 14px; margin-top: 5px;">The Mainstream Frequency — Admin Partner Alert</p>
    </div>

    <p style="font-size: 16px; line-height: 1.6;">Congratulations, <strong style="color: #d946ef;">${partner.partner_name}</strong>!</p>

    <p style="font-size: 15px; line-height: 1.6;">Your earnings have reached a new milestone. Here's your updated summary:</p>

    <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid rgba(139, 92, 246, 0.15);">
      <h3 style="color: #06b6d4; margin: 0 0 12px 0; font-size: 16px;">🎊 New Milestone${newMilestones.length > 1 ? 's' : ''} Reached:</h3>
      <ul style="color: #e0e0e0; font-size: 15px; line-height: 2; padding-left: 20px; margin: 0;">
        ${milestoneList}
      </ul>
    </div>

    <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #14b8a6; margin: 0 0 12px 0; font-size: 16px;">📊 Earnings Summary</h3>
      <p style="margin: 8px 0; font-size: 15px;"><strong>Lifetime Estimated Earnings:</strong> <span style="color: #06b6d4;">$${totalLifetime.toFixed(2)}</span></p>
      <p style="margin: 8px 0; font-size: 15px;"><strong>Total Paid to Date:</strong> <span style="color: #14b8a6;">$${totalPaid.toFixed(2)}</span></p>
      <p style="margin: 8px 0; font-size: 15px;"><strong>Revenue Share:</strong> <span style="color: #d946ef;">${sharePct}%</span></p>
    </div>

    <p style="font-size: 14px; color: #a0a0a0; line-height: 1.6;">You can view your full earnings breakdown and payout history in the <strong style="color: #a855f7;">Admin Partner Dashboard</strong>.</p>

    <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid rgba(139, 92, 246, 0.15);">
      <p style="font-size: 12px; color: #707070;">You're receiving this automated alert because you are an active Admin Partner on The Mainstream Frequency platform.</p>
      <p style="font-size: 12px; color: #707070; margin-top: 5px;">The Mainstream Frequency © 2026</p>
    </div>
  </div>
</body>
</html>`;

        // Build RFC 2822 MIME message for Gmail API
        const mimeMessage = [
          `To: ${partner.partner_email}`,
          `From: The Mainstream Frequency <noreply@frequency.com>`,
          `Subject: =?UTF-8?B?${btoa('🏆 Earnings Milestone Reached — ' + highestMilestone.label + '+')}?=`,
          `Content-Type: text/html; charset=UTF-8`,
          `MIME-Version: 1.0`,
          ``,
          emailBody
        ].join('\r\n');

        const rawMessage = btoa(unescape(encodeURIComponent(mimeMessage)));

        // Send via Gmail API
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
          console.error(`Gmail API error for ${partner.partner_email}:`, gmailError);
          continue;
        }

        const gmailResult = await gmailResponse.json();
        console.log(`Gmail sent to ${partner.partner_email}, message ID: ${gmailResult.id}`);

        // Update partner's notified milestones
        const updatedMilestones = [...alreadyNotified, ...newMilestones.map(m => m.id)];
        await base44.asServiceRole.entities.AdminPartner.update(partner.id, {
          milestones_notified: updatedMilestones
        });

        alertsSent.push({
          partner_name: partner.partner_name,
          partner_email: partner.partner_email,
          milestones_reached: newMilestones.map(m => m.label),
          lifetime_earnings: totalLifetime,
          gmail_message_id: gmailResult.id
        });

        console.log(`Milestone alert sent to ${partner.partner_name} (${partner.partner_email})`);
      } catch (error) {
        console.error(`Failed to process partner ${partner.partner_name}:`, error);
      }
    }

    console.log(`Milestone alerts complete. ${alertsSent.length} alert(s) sent.`);

    return Response.json({
      success: true,
      alerts_sent: alertsSent.length,
      alerts: alertsSent
    });
  } catch (error) {
    console.error('Admin Partner milestone alert error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});