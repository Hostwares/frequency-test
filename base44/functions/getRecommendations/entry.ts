import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { artist_profile_id, community_id, mood, genre } = body;

    // ─── Gather user context ────────────────────────────────────
    // User's support allocations — used for "fans also support" and genre/mood personalization
    const userSupports = await base44.asServiceRole.entities.SupportAllocation.filter({
      fan_user_id: user.id,
      is_active: true,
    });

    const supportedArtistIds = [...new Set(userSupports.map(s => s.artist_profile_id))];

    // User's listening history — for mood/genre personalization
    const listeningHistory = await base44.asServiceRole.entities.ListeningHistory.filter({
      user_id: user.id,
    }, '-created_date', 50);

    // Build mood frequency map from listening history
    const moodCounts = {};
    const genreCounts = {};
    const listenedSongIds = new Set(listeningHistory.map(h => h.song_id));

    // ─── 1. SIMILAR ARTISTS ─────────────────────────────────────
    let similarArtists = [];
    let seedArtist = null;

    if (artist_profile_id) {
      const seedArtists = await base44.asServiceRole.entities.ArtistProfile.filter({ id: artist_profile_id });
      seedArtist = seedArtists[0];
    } else if (supportedArtistIds.length > 0) {
      // Use the most recently supported artist as seed
      seedArtist = (await base44.asServiceRole.entities.ArtistProfile.filter({
        id: supportedArtistIds[supportedArtistIds.length - 1],
      }))[0];
    }

    if (seedArtist) {
      const seedGenre = seedArtist.genre;
      const seedSubGenres = seedArtist.sub_genres || [];
      const seedNetwork = seedArtist.network_name;

      // Find artists with same genre
      const sameGenre = await base44.asServiceRole.entities.ArtistProfile.filter({
        genre: seedGenre,
        is_verified: true,
      }, '-resonance_score', 20);

      // Score and deduplicate
      const scored = sameGenre
        .filter(a => a.id !== seedArtist.id)
        .map(a => {
          let score = 0;
          if (a.genre === seedGenre) score += 3;
          const subOverlap = (a.sub_genres || []).filter(sg => seedSubGenres.includes(sg)).length;
          score += subOverlap * 2;
          if (seedNetwork && a.network_name === seedNetwork) score += 2;
          if (a.connected_networks?.includes(seedArtist.id)) score += 1;
          score += (a.resonance_score || 0) * 0.001;
          return { ...a, _matchScore: score };
        })
        .sort((a, b) => b._matchScore - a._matchScore);

      similarArtists = scored.slice(0, 8);
    } else {
      // No seed — return top verified artists by resonance
      similarArtists = await base44.asServiceRole.entities.ArtistProfile.filter({
        is_verified: true,
      }, '-resonance_score', 8);
    }

    // ─── 2. SIMILAR COMMUNITIES ─────────────────────────────────
    let similarCommunities = [];
    let seedCommunity = null;

    if (community_id) {
      const seedCommunities = await base44.asServiceRole.entities.FrequencyCommunity.filter({ id: community_id });
      seedCommunity = seedCommunities[0];
    }

    if (seedCommunity) {
      const seedGenre = seedCommunity.genre;
      const seedTags = seedCommunity.tags || [];

      const allCommunities = await base44.asServiceRole.entities.FrequencyCommunity.filter({
        is_active: true,
      }, '-member_count', 30);

      similarCommunities = allCommunities
        .filter(c => c.id !== seedCommunity.id)
        .map(c => {
          let score = 0;
          if (c.genre === seedGenre) score += 3;
          const tagOverlap = (c.tags || []).filter(t => seedTags.includes(t)).length;
          score += tagOverlap * 2;
          score += (c.member_count || 0) * 0.01;
          return { ...c, _matchScore: score };
        })
        .sort((a, b) => b._matchScore - a._matchScore)
        .slice(0, 6);
    } else {
      similarCommunities = await base44.asServiceRole.entities.FrequencyCommunity.filter({
        is_active: true,
      }, '-member_count', 6);
    }

    // ─── 3. SIMILAR MOODS ───────────────────────────────────────
    // Find the user's top mood from listening history, then recommend songs in that mood
    const allSongsForMoods = await base44.asServiceRole.entities.Song.filter({}, '-play_count', 100);

    // Count moods from listened songs
    for (const song of allSongsForMoods) {
      if (listenedSongIds.has(song.id) && song.mood) {
        moodCounts[song.mood] = (moodCounts[song.mood] || 0) + 1;
      }
      if (song.genre) {
        genreCounts[song.genre] = (genreCounts[song.genre] || 0) + 1;
      }
    }

    const topMoods = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([m]) => m);

    const targetMood = mood || topMoods[0] || 'energetic';

    const similarMoodSongs = allSongsForMoods
      .filter(s => s.mood === targetMood && !listenedSongIds.has(s.id))
      .slice(0, 6);

    // Build mood clusters: top 2-3 songs per mood
    const moodClusters = {};
    const moodsToCluster = topMoods.length > 0 ? topMoods.slice(0, 4) : ['energetic', 'chill', 'emotional', 'uplifting'];
    for (const m of moodsToCluster) {
      moodClusters[m] = allSongsForMoods.filter(s => s.mood === m).slice(0, 3);
    }

    // ─── 4. SIMILAR GENRES ──────────────────────────────────────
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([g]) => g);

    const targetGenre = genre || seedArtist?.genre || topGenres[0] || 'Rock';

    const allArtistsForGenres = await base44.asServiceRole.entities.ArtistProfile.filter({}, '-resonance_score', 50);

    const similarGenreArtists = allArtistsForGenres
      .filter(a => a.genre === targetGenre || (a.sub_genres || []).includes(targetGenre))
      .slice(0, 8);

    // Build genre clusters: top artists per top genre
    const genreClusters = {};
    const genresToCluster = topGenres.length > 0 ? topGenres.slice(0, 4) : [];
    // Always include the target genre
    if (!genresToCluster.includes(targetGenre)) genresToCluster.unshift(targetGenre);
    for (const g of genresToCluster.slice(0, 4)) {
      genreClusters[g] = allArtistsForGenres.filter(a => a.genre === g).slice(0, 4);
    }

    // ─── 5. FANS ALSO SUPPORT ───────────────────────────────────
    // Co-support pattern: find what other artists are supported by fans who support the same artist(s)
    let fansAlsoSupport = [];

    const seedArtistIds = artist_profile_id ? [artist_profile_id] : supportedArtistIds.slice(-3);

    if (seedArtistIds.length > 0) {
      // Find all fans who support the seed artist(s)
      const coSupports = await base44.asServiceRole.entities.SupportAllocation.filter({
        artist_profile_id: { $in: seedArtistIds },
        is_active: true,
      });

      const coFanIds = [...new Set(coSupports.map(s => s.fan_user_id))];

      if (coFanIds.length > 0) {
        // Find what else those fans support
        const otherSupports = await base44.asServiceRole.entities.SupportAllocation.filter({
          fan_user_id: { $in: coFanIds },
          is_active: true,
        });

        // Count co-support frequency, exclude already-supported artists
        const coSupportCounts = {};
        for (const s of otherSupports) {
          if (!seedArtistIds.includes(s.artist_profile_id) && !supportedArtistIds.includes(s.artist_profile_id)) {
            coSupportCounts[s.artist_profile_id] = (coSupportCounts[s.artist_profile_id] || 0) + 1;
          }
        }

        // Sort by frequency and fetch artist profiles
        const topCoArtistIds = Object.entries(coSupportCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([id]) => id);

        if (topCoArtistIds.length > 0) {
          const coArtists = await base44.asServiceRole.entities.ArtistProfile.filter({
            id: { $in: topCoArtistIds },
          });
          // Preserve frequency order
          fansAlsoSupport = topCoArtistIds
            .map(id => {
              const artist = coArtists.find(a => a.id === id);
              return artist ? { ...artist, _coSupportCount: coSupportCounts[id] } : null;
            })
            .filter(Boolean);
        }
      }
    }

    // ─── 6. DISCOVERY PARTNER PICKS ─────────────────────────────
    const partnerPicks = await base44.asServiceRole.entities.ArtistSpotlight.filter({
      is_published: true,
    }, '-view_count', 6);

    // ─── 7. COMMUNITY PICKS ─────────────────────────────────────
    const communityPlaylists = await base44.asServiceRole.entities.Playlist.filter({
      type: { $in: ['community', 'artist', 'network'] },
    }, '-follower_count', 6);

    // ─── 8. NEW RELEASES ────────────────────────────────────────
    const newReleases = await base44.asServiceRole.entities.Song.filter({}, '-created_date', 8);

    // ─── 9. TRENDING ────────────────────────────────────────────
    // Trending = high play_count + support_count, weighted by recency
    const recentSongs = await base44.asServiceRole.entities.Song.filter({}, '-created_date', 50);
    const now = Date.now();

    const trending = recentSongs
      .map(s => {
        const ageDays = Math.min(90, (now - new Date(s.created_date).getTime()) / (1000 * 60 * 60 * 24));
        const recencyBoost = Math.max(0.5, 2 - (ageDays / 45));
        const engagement = (s.play_count || 0) + (s.support_count || 0) * 3;
        return { ...s, _trendScore: engagement * recencyBoost };
      })
      .sort((a, b) => b._trendScore - a._trendScore)
      .slice(0, 8);

    return Response.json({
      similar_artists: similarArtists,
      similar_communities: similarCommunities,
      similar_moods: {
        target_mood: targetMood,
        top_moods: topMoods.slice(0, 5),
        songs: similarMoodSongs,
        clusters: moodClusters,
      },
      similar_genres: {
        target_genre: targetGenre,
        top_genres: topGenres.slice(0, 5),
        artists: similarGenreArtists,
        clusters: genreClusters,
      },
      fans_also_support: fansAlsoSupport,
      discovery_partner_picks: partnerPicks,
      community_picks: communityPlaylists,
      new_releases: newReleases,
      trending: trending,
    });
  } catch (error) {
    console.error('Recommendation engine error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});