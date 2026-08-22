import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify artist access
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      artist_profile_id,
      artist_user_id,
      subject,
      message,
      message_type,
      recipient_filter,
    } = await req.json();

    console.log(`Sending supporter update: ${message_type} to ${recipient_filter}`);

    // Verify artist owns this profile
    if (user.id !== artist_user_id && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Not your artist profile' }, { status: 403 });
    }

    // Get supporters based on filter
    const allAllocations = await base44.entities.SupportAllocation.filter({ 
      artist_profile_id,
      is_active: true 
    }, '-amount');

    let supporters = [];
    if (recipient_filter === 'top_10') supporters = allAllocations.slice(0, 10);
    else if (recipient_filter === 'top_25') supporters = allAllocations.slice(0, 25);
    else if (recipient_filter === 'top_50') supporters = allAllocations.slice(0, 50);
    else supporters = allAllocations; // all

    console.log(`Sending to ${supporters.length} supporters`);

    const sent = [];
    const failed = [];

    // Send to each supporter
    for (const allocation of supporters) {
      try {
        // Create in-app message
        await base44.entities.ArtistMessage.create({
          recipient_user_id: allocation.fan_user_id,
          sender_user_id: artist_user_id,
          sender_type: 'artist',
          recipient_type: 'fan',
          artist_profile_id,
          subject: `🎵 ${subject}`,
          message: message,
          message_type: 'supporter_update',
          is_read: false,
        });

        // Get fan email for notification
        const fanUser = await base44.entities.User.filter({ id: allocation.fan_user_id }).then(users => users[0]);
        
        if (fanUser?.email) {
          // Send email notification
          await base44.integrations.Core.SendEmail({
            to: fanUser.email,
            subject: `🎵 ${subject}`,
            body: `
<html>
<body style="font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 30px;">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 12px;">
      <h1 style="color: #fff; margin-bottom: 20px;">🎵 Update from Your Supported Artist</h1>
      
      <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #fff; margin-bottom: 15px;">${subject}</h2>
        <p style="font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
      </div>
      
      <p style="font-size: 14px; color: #e0e0e0; margin-top: 20px;">
        You're receiving this because you're supporting <strong>${allocation.artist_name}</strong> on Frequency.
        Thank you for being an amazing supporter!
      </p>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="#" style="background: rgba(255,255,255,0.2); padding: 12px 30px; border-radius: 8px; color: #fff; text-decoration: none; font-weight: bold;">
          View on Frequency
        </a>
      </div>
    </div>
  </div>
</body>
</html>
            `,
          });
        }

        sent.push({
          fan_user_id: allocation.fan_user_id,
          email: fanUser?.email,
        });

      } catch (error) {
        console.error(`Failed to send to ${allocation.fan_user_id}:`, error);
        failed.push({
          fan_user_id: allocation.fan_user_id,
          error: error.message,
        });
      }
    }

    return Response.json({
      success: true,
      sent_count: sent.length,
      failed_count: failed.length,
      recipients: sent,
      failures: failed,
    });
  } catch (error) {
    console.error('Send supporter update error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});