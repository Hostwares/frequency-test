import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify this is being called by the system (admin role)
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { payment_id } = payload;

    if (!payment_id) {
      return Response.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    // Get the gratitude payment record
    const payments = await base44.entities.PartnerGratitudePayment.filter({ id: payment_id });
    if (!payments || payments.length === 0) {
      return Response.json({ error: 'Payment not found' }, { status: 404 });
    }

    const payment = payments[0];

    // Get Discovery Partner user details
    const partners = await base44.entities.DiscoveryPartner.filter({ id: payment.discovery_partner_id });
    if (!partners || partners.length === 0) {
      return Response.json({ error: 'Discovery Partner not found' }, { status: 404 });
    }

    const partner = partners[0];
    
    // Get partner's user account to get email
    const partnerUsers = await base44.entities.User.filter({ id: partner.user_id });
    if (!partnerUsers || partnerUsers.length === 0) {
      return Response.json({ error: 'Partner user account not found' }, { status: 404 });
    }

    const partnerUser = partnerUsers[0];

    // Send email notification
    const emailSubject = `🎉 Gratitude Payment from ${payment.artist_name}`;
    const emailBody = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1025 0%, #0f172a 100%); padding: 40px 20px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, #a855f7, #06b6d4); padding: 20px; border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 40px; color: white;">💝</span>
          </div>
          <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 10px 0; font-weight: 700;">Gratitude Payment Received!</h1>
        </div>

        <div style="background: rgba(255, 255, 255, 0.05); padding: 30px; border-radius: 8px; margin-bottom: 30px; border: 1px solid rgba(168, 85, 247, 0.3);">
          <p style="color: #e2e8f0; font-size: 16px; margin: 0 0 20px 0; line-height: 1.6;">
            Great news! <strong style="color: #a855f7;">${payment.artist_name}</strong> has sent you a gratitude payment for helping them reach a milestone.
          </p>

          <div style="background: rgba(168, 85, 247, 0.1); padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0;">
            <p style="color: #94a3b8; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Payment Amount</p>
            <p style="color: #06b6d4; font-size: 42px; font-weight: 700; margin: 0;">$${payment.amount.toFixed(2)}</p>
            ${payment.percentage > 0 ? `<p style="color: #a855f7; font-size: 14px; margin: 10px 0 0 0;">${payment.percentage}% of monthly royalties</p>` : ''}
          </div>

          <div style="margin: 20px 0;">
            <p style="color: #94a3b8; font-size: 14px; margin: 0 0 8px 0;">Milestone Achieved:</p>
            <p style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0;">${payment.milestone_trigger.replace('_', ' ').toUpperCase()}</p>
          </div>

          ${payment.message ? `
            <div style="background: rgba(6, 182, 212, 0.1); padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="color: #94a3b8; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Message from ${payment.artist_name}</p>
              <p style="color: #e2e8f0; font-size: 16px; font-style: italic; margin: 0; line-height: 1.6;">"${payment.message}"</p>
            </div>
          ` : ''}
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #64748b; font-size: 14px; margin: 0;">
            This payment is currently marked as <strong style="color: #fbbf24;">${payment.status}</strong>. 
            The artist will complete the payment process through their dashboard.
          </p>
        </div>

        <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.1); text-align: center;">
          <p style="color: #64748b; font-size: 12px; margin: 0 0 10px 0;">Thank you for supporting emerging artists on Frequency</p>
          <p style="color: #475569; font-size: 12px; margin: 0;">© 2026 Frequency. All rights reserved.</p>
        </div>
      </div>
    `;

    await base44.integrations.Core.SendEmail({
      to: partnerUser.email,
      subject: emailSubject,
      body: emailBody,
      from_name: 'Frequency',
    });

    // Update payment record to mark notification as sent
    await base44.entities.PartnerGratitudePayment.update(payment.id, {
      notification_sent: true,
      notification_sent_date: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      message: `Email notification sent to ${partnerUser.email}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});