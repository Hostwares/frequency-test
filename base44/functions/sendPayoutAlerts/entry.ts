import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify admin access
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('Sending payout alerts...');

    // Get all payment methods with balance >= $50 and notifications enabled
    const allPaymentMethods = await base44.entities.ArtistPaymentMethod.filter({ 
      is_active: true 
    });

    const eligibleForPayout = allPaymentMethods.filter(pm => 
      (pm.pending_balance || 0) >= 50 && pm.notifications_enabled !== false
    );

    console.log(`Found ${eligibleForPayout.length} artists eligible for payout with notifications enabled`);

    const alertsSent = [];

    for (const pm of eligibleForPayout) {
      try {
        const payoutAmount = pm.pending_balance;
        
        // Create in-app notification
        await base44.entities.ArtistMessage.create({
          recipient_user_id: pm.artist_user_id,
          sender_type: 'system',
          recipient_type: 'artist',
          artist_profile_id: pm.artist_profile_id,
          subject: 'Payout Ready! 💰',
          message: `Great news! You've reached the $50 threshold and have $${payoutAmount.toFixed(2)} ready for payout. Your payment will be processed automatically to ${pm.payout_email || pm.account_email}.`,
          message_type: 'payout_alert',
          is_read: false,
        });

        // Send email notification
        if (pm.payout_email || pm.account_email) {
          await base44.integrations.Core.SendEmail({
            to: pm.payout_email || pm.account_email,
            subject: '🎉 Your Payout is Ready!',
            body: `
Hi there,

Great news! You've reached the $50 payout threshold and have ${payoutAmount.toFixed(2)} ready to be sent to you.

Payout Details:
- Amount: $${payoutAmount.toFixed(2)}
- Payment Method: ${pm.payment_provider.replace('_', ' ').toUpperCase()}
- Destination: ${pm.payout_email || pm.account_email}
- Status: Processing

Your payout will be processed automatically within 1-3 business days. You'll receive a confirmation email once the transfer is complete.

Thank you for being part of the Frequency community!

Best regards,
The Frequency Team
            `,
          });
        }

        alertsSent.push({
          artist_profile_id: pm.artist_profile_id,
          amount: payoutAmount,
          email: pm.payout_email || pm.account_email,
        });

        console.log(`Payout alert sent to artist ${pm.artist_profile_id}`);
      } catch (error) {
        console.error(`Failed to send alert to ${pm.artist_profile_id}:`, error);
      }
    }

    return Response.json({ 
      success: true, 
      alerts_sent: alertsSent.length,
      alerts: alertsSent,
    });
  } catch (error) {
    console.error('Payout alert error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});