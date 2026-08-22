import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify this is being called by the system (not a regular user)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data, old_data } = await req.json();
    
    // Only trigger on update events
    if (event.type !== 'update') {
      return Response.json({ message: 'Only update events are processed' });
    }

    // Check if radio_status changed to an active rotation status
    const activeRotationStatuses = ['light_rotation', 'medium_rotation', 'heavy_rotation', 'featured'];
    
    const oldStatus = old_data?.radio_status;
    const newStatus = data?.radio_status;
    
    // Only notify if status changed to an active rotation status
    if (!oldStatus || !activeRotationStatuses.includes(oldStatus)) {
      if (!newStatus || !activeRotationStatuses.includes(newStatus)) {
        return Response.json({ message: 'No rotation status change detected' });
      }
    }
    
    // Don't notify if status was already active and remains active
    if (oldStatus && activeRotationStatuses.includes(oldStatus) && activeRotationStatuses.includes(newStatus)) {
      return Response.json({ message: 'Status already in active rotation' });
    }

    // Get the radio programmer who made the update
    const radioProgrammerId = data.radio_programmer_id;
    if (!radioProgrammerId) {
      return Response.json({ error: 'No radio programmer ID found' }, { status: 400 });
    }

    const programmer = await base44.entities.RadioProgrammer.get(radioProgrammerId);
    if (!programmer) {
      return Response.json({ error: 'Radio programmer not found' }, { status: 404 });
    }

    // Get the artist profile
    const artistProfileId = data.artist_profile_id;
    if (!artistProfileId) {
      return Response.json({ error: 'No artist profile ID found' }, { status: 400 });
    }

    const artist = await base44.entities.ArtistProfile.get(artistProfileId);
    if (!artist) {
      return Response.json({ error: 'Artist profile not found' }, { status: 404 });
    }

    // Get the artist's user to send notification
    const artistUser = await base44.entities.User.get(artist.user_id);
    if (!artistUser) {
      return Response.json({ error: 'Artist user not found' }, { status: 404 });
    }

    // Create notification for the artist
    await base44.entities.FanNotification.create({
      fan_user_id: artist.user_id,
      type: 'radio_rotation',
      title: `🎵 ${programmer.station_name} Added Your Song to Rotation!`,
      body: `Great news! ${programmer.station_name} (${programmer.role.replace(/_/g, ' ')}) has added "${data.song_title || 'your song'}" to their ${newStatus.replace(/_/g, ' ')} rotation.`,
      artist_name: artist.artist_name,
      artist_profile_id: artistProfileId,
      is_read: false,
    });

    // Send email notification
    try {
      await base44.integrations.Core.SendEmail({
        to: artistUser.email,
        subject: `🎵 ${programmer.station_name} Added Your Song to Rotation!`,
        body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #a855f7;">🎵 Great News!</h2>
  <p>Hi ${artist.artist_name},</p>
  <p>We're excited to let you know that <strong>${programmer.station_name}</strong> has added your song to their rotation!</p>
  
  <div style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(6, 182, 212, 0.1)); padding: 20px; border-radius: 12px; margin: 20px 0;">
    <h3 style="color: #06b6d4; margin-top: 0;">Radio Station Details</h3>
    <p><strong>Station:</strong> ${programmer.station_name}</p>
    <p><strong>Programmer:</strong> ${programmer.programmer_name || programmer.station_name}</p>
    <p><strong>Role:</strong> ${programmer.role.replace(/_/g, ' ')}</p>
    <p><strong>Rotation Status:</strong> <span style="color: #a855f7; font-weight: bold;">${newStatus.replace(/_/g, ' ')}</span></p>
    ${data.station_name ? `<p><strong>Frequency:</strong> ${data.station_name}</p>` : ''}
  </div>

  <p>This is a significant milestone for your music! Radio airplay can help you reach new listeners and grow your fanbase.</p>
  
  <p style="color: #666; font-size: 14px; margin-top: 30px;">
    You can view this notification and track your radio performance in your Artist Dashboard.
  </p>
  
  <p>Congratulations!</p>
  <p>The Frequency Team</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
  <p style="color: #999; font-size: 12px;">This is an automated notification from Frequency. Please do not reply to this email.</p>
</div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Continue even if email fails - notification was created
    }

    return Response.json({ 
      message: 'Artist notified successfully',
      artist_user_id: artist.user_id,
      station_name: programmer.station_name,
      rotation_status: newStatus
    });
    
  } catch (error) {
    console.error('Error in onRadioRotationUpdate:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});