import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Entity automation payload: { event: { type, entity_name, entity_id }, data: {...} }
    const entityType = payload.event?.entity_name || payload.entity_name;
    const data = payload.data || payload;

    let artistProfileId = null;
    let artistName = null;
    let notificationType = null;
    let title = null;
    let body = null;
    let extraFields = {};

    // --- Song created → new_music notification ---
    if (entityType === 'Song') {
      artistProfileId = data.artist_profile_id;
      artistName = data.artist_name;
      notificationType = 'new_music';
      title = `🎵 New music from ${artistName || 'your artist'}!`;
      body = data.subtitle
        ? `${data.title} (${data.subtitle}) is now available. Give it a listen!`
        : `${data.title} is now available. Give it a listen!`;
      extraFields = {
        song_id: data.id || null,
        song_title: data.title || null,
      };
    }
    // --- Event created → new_event notification ---
    else if (entityType === 'Event') {
      artistProfileId = data.artist_profile_id;
      notificationType = 'new_event';
      const eventDate = data.date ? new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
      title = `📅 ${artistName || 'Your artist'} announced an event!`;
      body = data.location
        ? `${data.title} — ${eventDate} at ${data.location}. ${data.is_free ? 'Free admission!' : data.ticket_price ? `Tickets from $${data.ticket_price}` : ''}`
        : `${data.title} — ${eventDate}. ${data.is_free ? 'Free admission!' : data.ticket_price ? `Tickets from $${data.ticket_price}` : ''}`;
      extraFields = {
        event_id: data.id || null,
        event_title: data.title || null,
        event_date: data.date || null,
      };
    }
    // --- SupportGoal created/updated → support_goal_update notification ---
    else if (entityType === 'SupportGoal') {
      artistProfileId = data.artist_profile_id;
      // Look up artist name from the profile
      try {
        const artist = await base44.asServiceRole.entities.ArtistProfile.get(artistProfileId);
        artistName = artist?.artist_name || 'Your artist';
      } catch (e) {
        artistName = 'Your artist';
      }

      const goalTitle = data.title || 'a support goal';
      const status = data.status || 'funding';
      const emoji = data.icon || '✨';

      // Only notify on meaningful status changes — not every edit
      const notifyStatuses = ['funded', 'completed', 'in_progress', 'started'];
      const eventType = payload.event?.type;

      // Skip on generic updates unless status changed to a meaningful one
      if (eventType === 'update') {
        const oldStatus = payload.old_data?.status;
        if (oldStatus === status || !notifyStatuses.includes(status)) {
          return Response.json({ skipped: 'status did not change to a notify-worthy value' });
        }
      }

      notificationType = 'support_goal_update';
      const statusMessages = {
        funded: `🎉 ${artistName}'s goal "${goalTitle}" is fully funded! Your support made this happen.`,
        completed: `✅ ${artistName} completed "${goalTitle}"! See what your support achieved.`,
        in_progress: `🚀 ${artistName} started working on "${goalTitle}" — your support is in action!`,
        started: `🚀 ${artistName} started working on "${goalTitle}" — your support is in action!`,
        funding: `📋 ${artistName} set a new support goal: "${goalTitle}". Help make it happen!`,
      };

      title = `${emoji} ${artistName} — ${goalTitle}`;
      body = statusMessages[status] || `${artistName} updated their support goal: "${goalTitle}".`;

      extraFields = {
        support_goal_id: data.id || null,
        support_goal_title: goalTitle,
        support_goal_status: status,
      };
    } else {
      return Response.json({ skipped: `entity type ${entityType} not handled` });
    }

    if (!artistProfileId) {
      return Response.json({ skipped: 'no artist_profile_id on entity' });
    }

    // Look up the artist name if not already on the entity (Events may not have it)
    if (!artistName) {
      try {
        const artist = await base44.asServiceRole.entities.ArtistProfile.get(artistProfileId);
        artistName = artist?.artist_name || 'Your artist';
        title = notificationType === 'new_event'
          ? `📅 ${artistName} announced an event!`
          : title;
      } catch (e) {
        artistName = 'Your artist';
      }
    }

    // Find all active supporters of this artist
    const supporters = await base44.asServiceRole.entities.SupportAllocation.filter({
      artist_profile_id: artistProfileId,
      is_active: true,
    });

    if (supporters.length === 0) {
      return Response.json({ created: 0, message: 'No active supporters to notify' });
    }

    // Deduplicate by fan_user_id (a fan may have multiple allocations to the same artist)
    const uniqueFanIds = [...new Set(supporters.map(s => s.fan_user_id).filter(Boolean))];

    // Create a notification for each fan
    const notifications = uniqueFanIds.map(fanId =>
      base44.asServiceRole.entities.FanNotification.create({
        fan_user_id: fanId,
        type: notificationType,
        title,
        body,
        artist_name: artistName,
        artist_profile_id: artistProfileId,
        is_read: false,
        ...extraFields,
      })
    );

    const results = await Promise.all(notifications);

    console.log(`Created ${results.length} ${notificationType} notifications for artist ${artistProfileId}`);

    return Response.json({
      created: results.length,
      type: notificationType,
      artist_profile_id: artistProfileId,
    });
  } catch (error) {
    console.error('notifyFansOfArtistUpdate error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});