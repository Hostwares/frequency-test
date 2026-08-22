import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify admin access
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('Sending automated payout alerts...');

    // Get all payment methods with notifications enabled
    const allPaymentMethods = await base44.entities.ArtistPaymentMethod.filter({ 
      is_active: true,
      notifications_enabled: true 
    });

    // Filter artists who reached or crossed $50 threshold
    const eligibleForAlert = allPaymentMethods.filter(pm => {
      const balance = pm.pending_balance || 0;
      return balance >= 50;
    });

    console.log(`Found ${eligibleForAlert.length} artists eligible for payout alerts`);

    const alertsSent = [];

    for (const pm of eligibleForAlert) {
      try {
        const payoutAmount = pm.pending_balance || 0;
        const payoutEmail = pm.payout_email || pm.account_email;
        
        // Create in-app notification
        await base44.entities.ArtistMessage.create({
          recipient_user_id: pm.artist_user_id,
          sender_type: 'system',
          recipient_type: 'artist',
          artist_profile_id: pm.artist_profile_id,
          subject: '🎉 Payout Ready! Your $50 Threshold Reached',
          message: `Congratulations! You've reached the $50 payout threshold with a balance of $${payoutAmount.toFixed(2)}. Your automatic payout is being processed and will be sent to ${payoutEmail} within 1-3 business days.`,
          message_type: 'payout_alert',
          is_read: false,
        });

        // Send email notification if enabled
        if (payoutEmail) {
          await base44.integrations.Core.SendEmail({
            to: payoutEmail,
            subject: '🎉 Your Payout is Ready!',
            body: `
<html>
<body style="font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 30px;">
  <div style="max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.1); padding: 30px; border-radius: 12px;">
    <h1 style="color: #fff; margin-bottom: 20px;">🎉 Payout Ready!</h1>
    <p style="font-size: 16px; line-height: 1.6;">Congratulations! You've reached the $50 threshold and your payout is being processed.</p>
    
    <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 8px 0; font-size: 18px;"><strong>Payout Amount:</strong> $${payoutAmount.toFixed(2)}</p>
      <p style="margin: 8px 0;"><strong>Payment Method:</strong> ${pm.payment_provider.replace('_', ' ').toUpperCase()}</p>
      <p style="margin: 8px 0;"><strong>Destination:</strong> ${payoutEmail}</p>
      <p style="margin: 8px 0;"><strong>Status:</strong> Processing</p>
      <p style="margin: 8px 0;"><strong>Expected Delivery:</strong> 1-3 business days</p>
    </div>
    
    <p style="font-size: 14px; color: #e0e0e0;">You're receiving this because you have automatic payout notifications enabled. You can disable this feature in your Artist Dashboard settings.</p>
    
    <p style="margin-top: 20px; font-size: 14px; color: #e0e0e0;">Thank you for being part of the Frequency community!</p>
  </div>
</body>
</html>
            `,
          });

          console.log(`Email sent to ${payoutEmail}`);
        }

        alertsSent.push({
          artist_profile_id: pm.artist_profile_id,
          artist_user_id: pm.artist_user_id,
          amount: payoutAmount,
          email: payoutEmail,
          notification_type: 'payout_ready',
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