import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { 
      discovery_partner_id, 
      percentage, 
      custom_amount,
      milestone_trigger, 
      message,
      month 
    } = payload;

    // Validate input - either percentage or custom_amount must be provided
    if (!discovery_partner_id || !milestone_trigger) {
      return Response.json({ 
        error: 'Missing required fields: discovery_partner_id, milestone_trigger' 
      }, { status: 400 });
    }

    // Validate percentage if provided
    if (percentage && (percentage < 1 || percentage > 100)) {
      return Response.json({ 
        error: 'Percentage must be between 1 and 100' 
      }, { status: 400 });
    }

    // Validate custom_amount if provided
    if (custom_amount && custom_amount <= 0) {
      return Response.json({ 
        error: 'Custom amount must be greater than 0' 
      }, { status: 400 });
    }

    // Get artist profile
    const artistProfiles = await base44.entities.ArtistProfile.filter({ user_id: user.id });
    if (!artistProfiles || artistProfiles.length === 0) {
      return Response.json({ 
        error: 'Artist profile not found' 
      }, { status: 404 });
    }

    const artist = artistProfiles[0];

    // Get discovery partner
    const partners = await base44.entities.DiscoveryPartner.filter({ 
      id: discovery_partner_id 
    });
    if (!partners || partners.length === 0) {
      return Response.json({ 
        error: 'Discovery Partner not found' 
      }, { status: 404 });
    }

    const partner = partners[0];

    // Calculate amount: use custom_amount if provided, otherwise calculate from percentage
    let amount;
    if (custom_amount && custom_amount > 0) {
      amount = custom_amount;
    } else if (percentage) {
      const monthlyRoyalties = artist.monthly_support_total || 0;
      amount = (monthlyRoyalties * percentage) / 100;
      
      if (amount <= 0) {
        return Response.json({ 
          error: 'No royalties available to calculate payment amount. Please use custom amount instead.' 
        }, { status: 400 });
      }
    } else {
      return Response.json({ 
        error: 'Either percentage or custom_amount must be provided' 
      }, { status: 400 });
    }

    // Create the gratitude payment record
    const payment = await base44.entities.PartnerGratitudePayment.create({
      artist_profile_id: artist.id,
      artist_name: artist.artist_name,
      discovery_partner_id: partner.id,
      partner_name: partner.name,
      percentage: percentage || 0,
      amount,
      milestone_trigger,
      message: message || '',
      status: 'pending',
      payment_date: new Date().toISOString(),
      month: month || new Date().toISOString().slice(0, 7),
    });

    // Update Discovery Partner's total earnings (optional tracking)
    const currentTotal = partner.reputation_score || 0;
    await base44.entities.DiscoveryPartner.update(partner.id, {
      reputation_score: currentTotal + amount,
    });

    // Send email notification to Discovery Partner
    try {
      const partnerUser = await base44.entities.User.filter({ id: partner.user_id });
      const partnerEmail = partnerUser && partnerUser.length > 0 ? partnerUser[0].email : null;

      if (partnerEmail) {
        await base44.integrations.Core.SendEmail({
          to: partnerEmail,
          subject: `🎉 Gratitude Payment from ${artist.artist_name}`,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;">
              <div style="background: white; padding: 30px; border-radius: 8px;">
                <h1 style="color: #667eea; margin-bottom: 20px;">🎉 Gratitude Payment Received!</h1>
                <p style="color: #4a5568; font-size: 16px; line-height: 1.6;"><strong>${artist.artist_name}</strong> has sent you a gratitude payment!</p>
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                  <p style="color: white; font-size: 14px; margin: 0 0 10px 0;">Payment Amount</p>
                  <p style="color: white; font-size: 36px; font-weight: bold; margin: 0;">$${amount.toFixed(2)}</p>
                  ${percentage ? `<p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 10px 0 0 0;">${percentage}% of monthly royalties</p>` : ''}
                </div>
                <p style="color: #4a5568; font-size: 14px;"><strong>Milestone:</strong> ${milestone_trigger.replace('_', ' ').toUpperCase()}</p>
                ${message ? `<div style="background: #f7fafc; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;"><p style="color: #4a5568; font-size: 14px; margin: 0;"><strong>Message:</strong> "${message}"</p></div>` : ''}
                <p style="color: #718096; font-size: 12px; margin-top: 20px;">Status: Pending | Thank you for supporting artists on Frequency!</p>
              </div>
            </div>
          `,
        });

        await base44.entities.PartnerGratitudePayment.update(payment.id, {
          notification_sent: true,
          notification_sent_date: new Date().toISOString(),
        });
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
    }

    const percentageDisplay = percentage ? `${percentage}%` : 'custom amount';
    return Response.json({ 
      success: true, 
      payment: {
        id: payment.id,
        amount,
        percentage: percentage || 0,
        custom_amount: custom_amount || 0,
        partner_name: partner.name,
        status: 'pending',
      },
      message: `Gratitude payment of $${amount} (${percentageDisplay}) sent to ${partner.name}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});