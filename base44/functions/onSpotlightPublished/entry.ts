import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const spotlight = payload.data;
    if (!spotlight || !spotlight.is_published) {
      return Response.json({ skipped: 'not published or no data' });
    }

    const artistProfileId = spotlight.artist_profile_id;
    if (!artistProfileId) {
      return Response.json({ skipped: 'no artist profile' });
    }

    // Find all fans who currently support this artist
    const allocations = await base44.asServiceRole.entities.SupportAllocation.filter({
      artist_profile_id: artistProfileId,
      is_active: true,
    });

    const fanIds = [...new Set(allocations.map(a => a.fan_user_id).filter(Boolean))];

    if (fanIds.length === 0) {
      return Response.json({ skipped: 'no fans supporting this artist' });
    }

    // Get Discovery Partner info for the notification
    let partnerName = 'A Discovery Partner';
    if (spotlight.discovery_partner_id) {
      const partner = await base44.asServiceRole.entities.DiscoveryPartner.get(spotlight.discovery_partner_id);
      if (partner) {
        partnerName = partner.name;
      }
    }

    // Create notifications for all fans
    const notifications = fanIds.map(fanId =>
      base44.asServiceRole.entities.FanNotification.create({
        fan_user_id: fanId,
        type: 'spotlight_alert',
        title: `✨ ${spotlight.artist_name} was spotlighted!`,
        body: `${partnerName} just featured ${spotlight.artist_name} in a spotlight: "${spotlight.title}". Check it out!`,
        artist_name: spotlight.artist_name,
        artist_profile_id: artistProfileId,
        discovery_partner_id: spotlight.discovery_partner_id,
        spotlight_id: spotlight.id,
        is_read: false,
      })
    );

    await Promise.all(notifications);
    return Response.json({ created: notifications.length, fanCount: fanIds.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});