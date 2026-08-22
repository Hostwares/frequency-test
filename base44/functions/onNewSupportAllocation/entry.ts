import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const allocation = payload.data;
    if (!allocation) {
      return Response.json({ skipped: 'no data' });
    }

    const notifications = [];

    // --- Notification 1: Tell the referring fan that someone new signed up ---
    if (allocation.referred_by_fan_id) {
      notifications.push(
        base44.asServiceRole.entities.FanNotification.create({
          fan_user_id: allocation.referred_by_fan_id,
          type: 'new_referral_supporter',
          title: '🎉 Your referral worked!',
          body: `A new fan you referred is now supporting ${allocation.artist_name || 'an artist'} at $${allocation.amount}/mo. Keep spreading the word!`,
          artist_name: allocation.artist_name || null,
          artist_profile_id: allocation.artist_profile_id || null,
          is_read: false,
        })
      );
    }

    // --- Notification 2: Tell all fans who referred to THIS artist that the artist gained support ---
    if (allocation.artist_profile_id) {
      // Find all fans who previously referred someone to this artist
      const existingReferrals = await base44.asServiceRole.entities.SupportAllocation.filter({
        artist_profile_id: allocation.artist_profile_id,
        is_active: true,
      });

      const referrerFanIds = [
        ...new Set(
          existingReferrals
            .filter(r => r.referred_by_fan_id && r.id !== allocation.id)
            .map(r => r.referred_by_fan_id)
        ),
      ];

      for (const fanId of referrerFanIds) {
        notifications.push(
          base44.asServiceRole.entities.FanNotification.create({
            fan_user_id: fanId,
            type: 'artist_gained_support',
            title: `📈 ${allocation.artist_name || 'An artist'} is growing!`,
            body: `${allocation.artist_name || 'An artist'} you helped discover just gained a new supporter. Your referrals are making an impact.`,
            artist_name: allocation.artist_name || null,
            artist_profile_id: allocation.artist_profile_id || null,
            is_read: false,
          })
        );
      }
    }

    await Promise.all(notifications);
    return Response.json({ created: notifications.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});