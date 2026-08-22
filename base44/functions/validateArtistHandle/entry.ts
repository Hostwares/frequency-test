import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { handle, artist_id } = await req.json();

    if (!handle || typeof handle !== 'string') {
      return Response.json({ available: false, message: 'Handle is required' }, { status: 400 });
    }

    const normalized = handle.toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (normalized.length < 3 || normalized.length > 30) {
      return Response.json({
        available: false,
        message: 'Handle must be 3-30 characters'
      });
    }

    // Check current handle on this artist
    if (artist_id) {
      try {
        const current = await base44.asServiceRole.entities.ArtistProfile.filter({ id: artist_id });
        if (current && current[0] && current[0].artist_handle === normalized) {
          return Response.json({ available: true, message: 'This is your current handle' });
        }
      } catch (e) {
        // Artist might not exist yet (new profile) - continue validation
      }
    }

    // Check if handle is taken by another artist
    const existing = await base44.asServiceRole.entities.ArtistProfile.filter({
      artist_handle: normalized
    });

    if (existing && existing.length > 0) {
      const isOwn = artist_id && existing[0].id === artist_id;
      if (!isOwn) {
        return Response.json({
          available: false,
          message: 'This handle is already taken'
        });
      }
    }

    // Check previous_handles (reserved)
    const allArtists = await base44.asServiceRole.entities.ArtistProfile.list('-created_date', 500);
    const reserved = allArtists.find(a =>
      a.previous_handles && a.previous_handles.includes(normalized)
    );

    if (reserved && reserved.id !== artist_id) {
      return Response.json({
        available: false,
        message: 'This handle was previously used and is reserved'
      });
    }

    return Response.json({ available: true, message: 'Handle is available' });
  } catch (error) {
    console.error('validateArtistHandle error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});