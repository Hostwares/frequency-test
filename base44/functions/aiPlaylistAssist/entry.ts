import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getAllocationTierForPlan, getAIAssistanceFeatures } from '../../shared/fundedNetworkLimits.ts';

/**
 * AI Playlist Assistance — tier-gated AI features for funded playlist building.
 *
 * Features:
 *   auto_suggest             → AI suggests songs matching playlist's current content (Basic)
 *   natural_language         → User describes a playlist in plain text, AI returns matching songs (Advanced)
 *   allocation_optimization   → AI recommends artist weight adjustments based on resonance patterns (Premium)
 *
 * Tier mapping:
 *   standard      (Beta Supporter)        → auto_suggest only
 *   advanced      (Founding Premium Beta)  → auto_suggest + natural_language
 *   advanced_plus (Founding Patron Beta)  → all features
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch {}

    const { feature, playlist_id, prompt, current_song_ids, current_artists } = body;

    if (!feature) return Response.json({ error: 'Missing feature parameter' }, { status: 400 });

    // --- Resolve subscriber tier ---
    const subRecs = await base44.entities.UserSubscription.filter({ user_id: user.id, status: 'active' });
    const subRec = subRecs?.[0];
    const tier = getAllocationTierForPlan(subRec?.plan_code);
    const allowedFeatures = getAIAssistanceFeatures(tier);

    if (!allowedFeatures.includes(feature)) {
      return Response.json({
        error: 'feature_locked',
        message: `Your plan (${tier} tier) does not include this AI assistance feature. Upgrade to access it.`,
        tier,
        requested_feature: feature,
        available_features: allowedFeatures,
        plan_code: subRec?.plan_code || null,
      }, { status: 403 });
    }

    // --- Fetch playlist songs for context ---
    let playlist = null;
    if (playlist_id) {
      try { playlist = await base44.entities.Playlist.get(playlist_id); } catch {}
    }

    const songIds = current_song_ids || playlist?.song_ids || [];
    const songs = [];
    for (const sid of songIds.slice(0, 50)) {
      try {
        const song = await base44.asServiceRole.entities.Song.get(sid);
        if (song) songs.push({ title: song.title, artist_name: song.artist_name, genre: song.genre, mood: song.mood });
      } catch {}
    }

    // --- Feature: auto_suggest (Basic) ---
    // AI suggests songs that match the playlist's current genre/mood/artist content
    if (feature === 'auto_suggest') {
      const allSongs = await base44.asServiceRole.entities.Song.list('-created_date', 100);
      const existingIds = new Set(songIds);
      const candidateSongs = allSongs.filter((s) => !existingIds.has(s.id)).slice(0, 50);

      const context = songs.length > 0
        ? songs.map((s) => `${s.title} by ${s.artist_name} (${s.genre || 'unknown genre'}, ${s.mood || 'unknown mood'})`).join('; ')
        : 'an empty playlist';

      const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a music playlist advisor. A subscriber's funded playlist currently contains: ${context}.

Available songs to suggest:
${candidateSongs.map((s) => `- ${s.title} by ${s.artist_name} (${s.genre || 'no genre'}, mood: ${s.mood || 'unknown'})`).join('\n')}

Recommend 5 songs from the available list that best complement the existing playlist. Consider genre harmony, mood matching, and artist diversity. Return ONLY a JSON object with this schema:
{"suggestions": [{"song_title": "...", "artist_name": "...", "reason": "one sentence why this song fits"}]}`,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  song_title: { type: 'string' },
                  artist_name: { type: 'string' },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
      });

      // Match LLM suggestions back to actual song IDs
      const suggestions = (llmRes.suggestions || []).map((s) => {
        const match = candidateSongs.find(
          (cs) => cs.title.toLowerCase() === s.song_title?.toLowerCase() &&
                  cs.artist_name?.toLowerCase() === s.artist_name?.toLowerCase()
        );
        return { ...s, song_id: match?.id || null };
      }).filter((s) => s.song_id);

      return Response.json({ feature, tier, suggestions });
    }

    // --- Feature: natural_language (Advanced) ---
    // User describes a playlist in plain text, AI returns matching songs
    if (feature === 'natural_language') {
      if (!prompt) return Response.json({ error: 'Missing prompt parameter' }, { status: 400 });

      const allSongs = await base44.asServiceRole.entities.Song.list('-created_date', 100);
      const existingIds = new Set(songIds);
      const candidateSongs = allSongs.filter((s) => !existingIds.has(s.id)).slice(0, 50);

      const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `A subscriber described the playlist they want to build: "${prompt}"

Available songs:
${candidateSongs.map((s) => `- ${s.title} by ${s.artist_name} (${s.genre || 'no genre'}, mood: ${s.mood || 'unknown'})`).join('\n')}

Select up to 8 songs from the available list that best match the subscriber's description. Return ONLY a JSON object with this schema:
{"suggestions": [{"song_title": "...", "artist_name": "...", "reason": "one sentence why this matches"}]}`,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  song_title: { type: 'string' },
                  artist_name: { type: 'string' },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
      });

      const suggestions = (llmRes.suggestions || []).map((s) => {
        const match = candidateSongs.find(
          (cs) => cs.title.toLowerCase() === s.song_title?.toLowerCase() &&
                  cs.artist_name?.toLowerCase() === s.artist_name?.toLowerCase()
        );
        return { ...s, song_id: match?.id || null };
      }).filter((s) => s.song_id);

      return Response.json({ feature, tier, suggestions });
    }

    // --- Feature: allocation_optimization (Premium) ---
    // AI recommends artist weight adjustments based on resonance patterns
    if (feature === 'allocation_optimization') {
      const artistMap = new Map();
      for (const s of songs) {
        if (!s.artist_name) continue;
        if (!artistMap.has(s.artist_name)) artistMap.set(s.artist_name, { artist_name: s.artist_name, songs: [] });
        artistMap.get(s.artist_name).songs.push(s);
      }
      const artists = [...artistMap.values()];

      const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are an artist allocation advisor for a funded music network. The playlist contains these artists:
${artists.map((a, i) => `${i + 1}. ${a.artist_name} (${a.songs.length} song(s): ${a.songs.map((s) => s.title).join(', ')})`).join('\n')}

Recommend a percentage allocation across these artists that totals exactly 100%. Consider song count, genre diversity, and mood variety. Return ONLY a JSON object with this schema:
{"allocations": [{"artist_name": "...", "percentage": 0, "reason": "one sentence why"}]}`,
        response_json_schema: {
          type: 'object',
          properties: {
            allocations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  artist_name: { type: 'string' },
                  percentage: { type: 'number' },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
      });

      return Response.json({ feature, tier, allocations: llmRes.allocations || [] });
    }

    return Response.json({ error: 'Unknown feature' }, { status: 400 });
  } catch (error) {
    console.error('aiPlaylistAssist error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});