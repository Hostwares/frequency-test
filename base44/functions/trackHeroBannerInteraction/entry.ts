import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const COUNTER_FIELDS = {
  impression: 'impression_count',
  click: 'click_count',
  play: 'play_count',
  profile_visit: 'profile_visit_count',
  follow: 'new_follower_count',
  support: 'new_supporter_count',
  playlist_add: 'playlist_add_count',
  share: 'share_count',
  ticket_click: 'ticket_sale_count',
  merch_click: 'merch_sale_count',
  community_join: 'community_join_count',
  referral_conversion: 'referral_conversion_count',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { banner_id, interaction_type, session_id } = body;

    if (!banner_id || !interaction_type) {
      return Response.json({ error: 'banner_id and interaction_type required' }, { status: 400 });
    }

    // Fetch the banner to get denormalized fields + validate it exists
    const banner = await base44.asServiceRole.entities.HeroBanner.get(banner_id);
    if (!banner) {
      return Response.json({ error: 'Banner not found' }, { status: 404 });
    }

    // Create impression record
    await base44.asServiceRole.entities.HeroBannerImpression.create({
      banner_id,
      banner_title: banner.title,
      banner_category: banner.category,
      user_id: user.id,
      user_role: user.role || 'fan',
      interaction_type,
      artist_profile_id: banner.artist_profile_id,
      session_id: session_id || null,
    });

    // Increment the appropriate counter on the banner
    const counterField = COUNTER_FIELDS[interaction_type];
    if (counterField) {
      const currentValue = banner[counterField] || 0;
      await base44.asServiceRole.entities.HeroBanner.update(banner_id, {
        [counterField]: currentValue + 1,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('trackHeroBannerInteraction error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});