import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date().toISOString();
    const userRole = user.role || 'fan';

    // Fetch active banners — limit to 50 (we only display 12, and loading all
    // caused timeouts under concurrent load)
    const allBanners = await base44.asServiceRole.entities.HeroBanner.filter({ is_active: true }, '-priority', 50);

    // Filter by date window and user type targeting
    let eligible = allBanners.filter(b => {
      const startOk = !b.start_date || new Date(b.start_date) <= new Date(now);
      const endOk = !b.end_date || new Date(b.end_date) >= new Date(now);
      const targets = b.target_user_types && b.target_user_types.length > 0 ? b.target_user_types : ['all'];
      const typeOk = targets.includes('all') || targets.includes(userRole);
      return startOk && endOk && typeOk;
    });

    if (eligible.length === 0) {
      return Response.json({ banners: [] });
    }

    // Sort: pinned first, then priority, then hero_banner_score
    eligible.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      const priDiff = (b.priority || 0) - (a.priority || 0);
      if (priDiff !== 0) return priDiff;
      return (b.hero_banner_score || 0) - (a.hero_banner_score || 0);
    });

    // Apply diversity rules:
    // 1. No artist in more than one banner (unless pinned/editorial)
    // 2. No consecutive same-genre banners
    const seenArtists = new Set();
    const result = [];
    let lastGenre = '';

    // First pass: pinned and editorial banners (no dedup)
    for (const b of eligible) {
      if (b.is_pinned || b.banner_type === 'editorial' || b.banner_type === 'sponsored_campaign') {
        result.push(b);
        if (b.artist_profile_id) seenArtists.add(b.artist_profile_id);
        if (b.genre) lastGenre = b.genre;
      }
    }

    // Second pass: dynamic artist banners with diversity rules
    for (const b of eligible) {
      if (b.is_pinned || b.banner_type === 'editorial' || b.banner_type === 'sponsored_campaign') continue;
      if (b.artist_profile_id && seenArtists.has(b.artist_profile_id)) continue;
      if (b.genre && b.genre === lastGenre && result.length > 0) continue;

      result.push(b);
      if (b.artist_profile_id) seenArtists.add(b.artist_profile_id);
      if (b.genre) lastGenre = b.genre;
    }

    // Fill remaining slots if we have room (relax genre constraint)
    if (result.length < 8) {
      for (const b of eligible) {
        if (result.includes(b)) continue;
        if (b.artist_profile_id && seenArtists.has(b.artist_profile_id)) continue;
        result.push(b);
        if (b.artist_profile_id) seenArtists.add(b.artist_profile_id);
        if (result.length >= 12) break;
      }
    }

    // Cap at 12
    const finalBanners = result.slice(0, 12);

    return Response.json({ banners: finalBanners });
  } catch (error) {
    console.error('getHeroBanners error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});