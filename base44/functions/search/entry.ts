import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawQuery = (body.query || '').trim();
    const query = rawQuery.toLowerCase();
    const autocomplete = body.autocomplete || false;

    if (!query || query.length < 1) {
      return Response.json({ query: rawQuery, total_results: 0 });
    }

    const resultLimit = autocomplete ? 3 : 20;
    const isNumeric = /^\d+$/.test(query);
    const bpmNum = parseInt(query);

    // ─── Conditional entity fetching ───────────────────────────
    // Numeric: only songs (BPM). Autocomplete: only artists + songs. Full: all types.
    // Reduced limits: we only return `resultLimit` (3 or 20) per category, so fetching
    // 500 was wasting DB resources and causing timeouts under concurrent load.
    const fetchLimit = autocomplete ? 50 : 200;

    let artists = [], songs = [], releases = [], communities = [], partners = [], stations = [], programmers = [];

    if (isNumeric) {
      songs = await base44.asServiceRole.entities.Song.filter({}, '-play_count', fetchLimit);
    } else if (autocomplete) {
      // Autocomplete only needs primary types for fast suggestions
      [artists, songs] = await Promise.all([
        base44.asServiceRole.entities.ArtistProfile.filter({}, '-resonance_score', fetchLimit),
        base44.asServiceRole.entities.Song.filter({}, '-play_count', fetchLimit),
      ]);
    } else {
      const [a, s, r, c, p, st, rp] = await Promise.all([
        base44.asServiceRole.entities.ArtistProfile.filter({}, '-resonance_score', fetchLimit),
        base44.asServiceRole.entities.Song.filter({}, '-play_count', fetchLimit),
        base44.asServiceRole.entities.Release.filter({}, '-created_date', fetchLimit),
        base44.asServiceRole.entities.FrequencyCommunity.filter({ is_active: true }, '-member_count', fetchLimit),
        base44.asServiceRole.entities.DiscoveryPartner.filter({ is_active: true }, '-reputation_score', fetchLimit),
        base44.asServiceRole.entities.RadioStation.filter({ is_active: true }, '-created_date', fetchLimit),
        base44.asServiceRole.entities.RadioProgrammer.filter({ is_active: true }, '-total_adds', fetchLimit),
      ]);
      artists = a; songs = s; releases = r; communities = c; partners = p; stations = st; programmers = rp;
    }

    // ─── Helpers ───────────────────────────────────────────────
    const matches = (text) => text && text.toLowerCase().includes(query);
    const matchesAny = (arr) => Array.isArray(arr) && arr.some(v => v && v.toLowerCase().includes(query));

    // ─── Slim projections (reduces response size ~90%) ─────────
    const slimArtist = (a) => ({
      id: a.id, artist_name: a.artist_name, artist_handle: a.artist_handle,
      genre: a.genre, location: a.location, profile_image: a.profile_image,
      is_verified: a.is_verified, resonance_score: a.resonance_score,
      supporter_count: a.supporter_count, verification_badge: a.verification_badge,
    });

    const slimSong = (s) => ({
      id: s.id, title: s.title, subtitle: s.subtitle, artist_name: s.artist_name,
      artist_profile_id: s.artist_profile_id, genre: s.genre, sub_genre: s.sub_genre,
      mood: s.mood, bpm: s.bpm, duration_seconds: s.duration_seconds,
      cover_art: s.cover_art, play_count: s.play_count, audio_url: s.audio_url,
      is_instrumental: s.is_instrumental, vocal_type: s.vocal_type,
    });

    const slimRelease = (r) => ({
      id: r.id, title: r.title, artist_name: r.artist_name, genre: r.genre,
      cover_art: r.cover_art, release_type: r.release_type, release_date: r.release_date,
    });

    const slimCommunity = (c) => ({
      id: c.id, name: c.name, description: c.description, genre: c.genre,
      cover_image: c.cover_image, member_count: c.member_count,
    });

    const slimPartner = (p) => ({
      id: p.id, name: p.name, description: p.description, location: p.location,
      profile_image: p.profile_image, partner_type: p.partner_type,
    });

    const slimStation = (st) => ({
      id: st.id, station_name: st.station_name, format: st.format,
      location: st.location, logo: st.logo, frequency: st.frequency,
    });

    const slimProgrammer = (rp) => ({
      id: rp.id, station_name: rp.station_name, station_format: rp.station_format,
      location: rp.location, role: rp.role, is_verified: rp.is_verified,
    });

    // ─── Results ───────────────────────────────────────────────
    let artistResults = [], songResults = [], albumResults = [];
    let genreResults = [], communityResults = [], partnerResults = [];
    let radioStationResults = [], radioProgrammerResults = [];
    let moodResults = [], lyricsResults = [], bpmResults = [], instrumentResults = [];

    if (!isNumeric) {
      // ─── 1. ARTISTS ─────────────────────────────────────────
      artistResults = artists
        .filter(a =>
          matches(a.artist_name) ||
          matches(a.artist_handle) ||
          matches(a.genre) ||
          matches(a.bio) ||
          matches(a.location) ||
          matchesAny(a.sub_genres)
        )
        .slice(0, resultLimit)
        .map(slimArtist);

      // ─── 2. SONGS ───────────────────────────────────────────
      songResults = songs
        .filter(s =>
          matches(s.title) ||
          matches(s.subtitle) ||
          matches(s.artist_name) ||
          matches(s.genre) ||
          matches(s.sub_genre) ||
          matches(s.mood) ||
          matches(s.language) ||
          matchesAny(s.writers) ||
          matchesAny(s.producers) ||
          matchesAny(s.featured_artists)
        )
        .slice(0, resultLimit)
        .map(slimSong);

      // ─── 3. ALBUMS / RELEASES ───────────────────────────────
      albumResults = releases
        .filter(r =>
          matches(r.title) ||
          matches(r.artist_name) ||
          matches(r.genre) ||
          matches(r.label) ||
          matches(r.description) ||
          matchesAny(r.sub_genres)
        )
        .slice(0, resultLimit)
        .map(slimRelease);

      // ─── 4. GENRES (derived) ────────────────────────────────
      const allGenres = new Set();
      for (const a of artists) if (a.genre) allGenres.add(a.genre);
      for (const s of songs) if (s.genre) allGenres.add(s.genre);
      for (const r of releases) if (r.genre) allGenres.add(r.genre);
      for (const c of communities) if (c.genre) allGenres.add(c.genre);
      for (const a of artists) for (const sg of (a.sub_genres || [])) allGenres.add(sg);

      genreResults = [...allGenres]
        .filter(g => g.toLowerCase().includes(query))
        .sort()
        .slice(0, resultLimit);

      // ─── 5. COMMUNITIES ─────────────────────────────────────
      communityResults = communities
        .filter(c =>
          matches(c.name) ||
          matches(c.description) ||
          matches(c.genre) ||
          matchesAny(c.tags)
        )
        .slice(0, resultLimit)
        .map(slimCommunity);

      // ─── 6. DISCOVERY PARTNERS ──────────────────────────────
      partnerResults = partners
        .filter(p =>
          matches(p.name) ||
          matches(p.description) ||
          matches(p.location) ||
          matchesAny(p.genres_covered)
        )
        .slice(0, resultLimit)
        .map(slimPartner);

      // ─── 7. RADIO ──────────────────────────────────────────
      radioStationResults = stations
        .filter(st =>
          matches(st.station_name) ||
          matches(st.format) ||
          matches(st.location) ||
          matchesAny(st.genres)
        )
        .slice(0, resultLimit)
        .map(slimStation);

      radioProgrammerResults = programmers
        .filter(rp =>
          matches(rp.station_name) ||
          matches(rp.station_format) ||
          matches(rp.location) ||
          matchesAny(rp.genres_supported) ||
          matches(rp.role)
        )
        .slice(0, resultLimit)
        .map(slimProgrammer);

      // ─── 8. MOODS (derived) ─────────────────────────────────
      const allMoods = new Set();
      for (const s of songs) if (s.mood) allMoods.add(s.mood);
      moodResults = [...allMoods]
        .filter(m => m.toLowerCase().includes(query))
        .sort()
        .slice(0, resultLimit);

      // ─── 9. LYRICS ──────────────────────────────────────────
      lyricsResults = songs
        .filter(s => matches(s.lyrics))
        .slice(0, resultLimit)
        .map(slimSong);

      // ─── 10. INSTRUMENTS / CREDITS ──────────────────────────
      instrumentResults = songs
        .filter(s => matches(s.credits))
        .slice(0, resultLimit)
        .map(slimSong);
    }

    // ─── 11. BPM (numeric only) ────────────────────────────────
    if (!isNaN(bpmNum)) {
      bpmResults = songs
        .filter(s => s.bpm && Math.abs(s.bpm - bpmNum) <= 5)
        .slice(0, resultLimit)
        .map(slimSong);
    }

    const totalResults =
      artistResults.length + songResults.length + albumResults.length +
      genreResults.length + communityResults.length + partnerResults.length +
      radioStationResults.length + radioProgrammerResults.length +
      moodResults.length + lyricsResults.length + bpmResults.length + instrumentResults.length;

    return Response.json({
      query: rawQuery,
      artists: artistResults,
      songs: songResults,
      albums: albumResults,
      genres: genreResults,
      communities: communityResults,
      discovery_partners: partnerResults,
      radio_stations: radioStationResults,
      radio_programmers: radioProgrammerResults,
      moods: moodResults,
      lyrics_matches: lyricsResults,
      bpm_matches: bpmResults,
      instrument_matches: instrumentResults,
      total_results: totalResults,
    });
  } catch (error) {
    console.error('Search error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});