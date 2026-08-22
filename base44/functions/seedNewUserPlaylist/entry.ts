import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const userId = payload?.data?.user_id;
    if (!userId) {
      return Response.json({ skipped: 'no user_id' });
    }

    // 1. Read the two designated default artists from the platform setting
    const settings = await base44.asServiceRole.entities.PlatformSetting.filter({
      setting_key: 'default_platform_artists',
    });
    let artistIds = [];
    if (settings[0]?.setting_value) {
      try {
        const parsed = JSON.parse(settings[0].setting_value);
        artistIds = Array.isArray(parsed?.artist_ids) ? parsed.artist_ids.filter(Boolean) : [];
      } catch {
        artistIds = [];
      }
    }
    if (artistIds.length === 0) {
      return Response.json({ skipped: 'no default artists configured' });
    }

    // 2. Idempotency — skip if the user already has any playlist
    const existing = await base44.asServiceRole.entities.Playlist.filter({
      owner_user_id: userId,
    });
    if (existing.length > 0) {
      return Response.json({ skipped: 'user already has a playlist' });
    }

    // 3. Collect songs from each default artist in designated order (slot 1 first)
    const songIds = [];
    for (const artistId of artistIds) {
      const songs = await base44.asServiceRole.entities.Song.filter(
        { artist_profile_id: artistId },
        'created_date',
        100
      );
      for (const s of songs) {
        if (s.id) songIds.push(s.id);
      }
    }

    // 4. Record per-song add dates so the 30-day disbursement lock applies to seeded songs
    const addedDate = new Date().toISOString();
    const lockedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const songEntries = songIds.map((sid) => ({
      song_id: sid,
      added_date: addedDate,
      locked_until: lockedUntil,
    }));

    // 5. Create the user's starter playlist with the default artists' songs at the top
    const playlist = await base44.asServiceRole.entities.Playlist.create({
      name: 'My Frequency',
      description: 'Your starter playlist — featuring platform default artists.',
      type: 'fan',
      owner_user_id: userId,
      song_ids: songIds,
      song_entries: songEntries,
      is_living: true,
    });

    return Response.json({
      created: true,
      playlist_id: playlist.id,
      song_count: songIds.length,
    });
  } catch (error) {
    console.error('seedNewUserPlaylist error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});