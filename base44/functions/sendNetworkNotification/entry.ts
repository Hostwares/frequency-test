import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get trigger event from automation
    const payload = await req.json();
    const { event, data } = payload;
    
    if (!data || !data.id) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Get the updated artist profile
    const artistProfile = await base44.entities.ArtistProfile.get(data.id);
    if (!artistProfile) {
      return Response.json({ error: 'Artist not found' }, { status: 404 });
    }

    // Get the user who owns this artist profile
    const artistUser = await base44.entities.User.get(artistProfile.user_id);
    if (!artistUser?.email) {
      return Response.json({ error: 'Artist email not found' }, { status: 404 });
    }

    // For now, send a general notification about network changes
    // In a real implementation, you'd track which specific network was added
    const networkName = artistProfile.network_name || 'Artist Network';
    const connectedByArtistName = 'A fellow artist';

    // Create in-app notification
    await base44.entities.NetworkNotification.create({
      artist_profile_id: artistProfile.id,
      type: 'added_to_network',
      title: 'Added to Artist Network',
      body: `${connectedByArtistName} has added you to their "${networkName}" network. This endorsement shows your music aligns with their artistic vision.`,
      network_name: networkName,
      connected_by_artist_id: null,
      connected_by_artist_name: connectedByArtistName,
      is_read: false,
    });

    // Send email notification
    if (artistUser?.email) {
      await base44.integrations.Core.SendEmail({
        to: artistUser.email,
        subject: `🎵 You've Been Added to a Network`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #a855f7;">Network Connection Alert</h2>
            <p>Hi ${artistProfile.artist_name},</p>
            <p>Great news! You've been added to the <strong>"${networkName}"</strong> artist network.</p>
            <p>This endorsement means your music resonates with other artists and they want to connect their audience with your work.</p>
            
            <div style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(6, 182, 212, 0.1)); padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #06b6d4; margin-top: 0;">What This Means:</h3>
              <ul style="color: #666; line-height: 1.6;">
                <li>Your profile is now visible to fans in this network</li>
                <li>You're part of a curated network of like-minded artists</li>
                <li>This can lead to new listener discovery and collaborations</li>
              </ul>
            </div>

            <p style="color: #666; font-size: 14px;">
              Network connections are a powerful way to grow your audience through peer endorsements and community building.
            </p>

            <p>Keep creating,<br/>The Frequency Team</p>
          </div>
        `,
      });
    }

    return Response.json({ 
      success: true, 
      message: 'Network notification sent successfully' 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});