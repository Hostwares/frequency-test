import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const TWELVE_WEEKS_MS = 12 * 7 * 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const now = new Date();
    let processed = 0;
    let errors = 0;

    // 1. Find all songs currently in mainstream_first status whose exclusive period has ended
    const mainstreamFirstSongs = await base44.asServiceRole.entities.Song.filter({
      mainstream_first_status: 'mainstream_first'
    }, '-mainstream_first_start_date', 200);

    for (const song of mainstreamFirstSongs) {
      try {
        const startDate = song.mainstream_first_start_date ? new Date(song.mainstream_first_start_date) : null;
        const endDate = song.mainstream_first_end_date ? new Date(song.mainstream_first_end_date) : null;
        
        // Check if 12 weeks have passed
        if (startDate && (now.getTime() - startDate.getTime() < TWELVE_WEEKS_MS)) {
          continue; // Still within exclusive period
        }

        // Determine the genre for the playlist name — uses the song's actual genre
        // so ALL genres on the platform are covered, not just a predefined subset
        const songGenre = (song.genre || '').trim();
        const genrePlaylistName = songGenre
          ? `Heard First on The Mainstream™ — ${songGenre}`
          : 'Heard First on The Mainstream™ — General';

        // 2. Calculate discovery stats from the exclusive period
        // First listeners = unique users who listened during exclusive period
        let firstListenersCount = 0;
        try {
          const listeningHistory = await base44.asServiceRole.entities.ListeningHistory.filter({
            song_id: song.id
          }, '-created_date', 500);
          // Count unique users
          const uniqueListeners = new Set(listeningHistory.map(h => h.user_id).filter(Boolean));
          firstListenersCount = uniqueListeners.size;
        } catch (e) {
          // ListeningHistory might not have data yet
        }

        // Original supporters = supporters during exclusive period
        let originalSupportersCount = 0;
        try {
          const supportAllocations = await base44.asServiceRole.entities.SupportAllocation.filter({
            artist_profile_id: song.artist_profile_id
          }, '-created_date', 200);
          // Count supporters created during the exclusive period
          originalSupportersCount = supportAllocations.filter(a => {
            if (!a.created_date) return false;
            const allocDate = new Date(a.created_date);
            return startDate && allocDate >= startDate && allocDate <= now;
          }).length;
        } catch (e) {
          // continue
        }

        // Discovery partners count
        let discoveryPartnersCount = 0;
        try {
          const spotlights = await base44.asServiceRole.entities.ArtistSpotlight.filter({
            artist_profile_id: song.artist_profile_id
          }, '-created_date', 100);
          discoveryPartnersCount = spotlights.length;
        } catch (e) {
          // continue
        }

        // Radio programmers count
        let radioProgrammersCount = 0;
        try {
          const downloads = await base44.asServiceRole.entities.RadioDownload.filter({
            song_id: song.id
          }, '-created_date', 100);
          const uniqueProgrammers = new Set(downloads.map(d => d.programmer_id || d.user_id).filter(Boolean));
          radioProgrammersCount = uniqueProgrammers.size;
        } catch (e) {
          // continue
        }

        // Frequency communities count
        let frequencyCommunitiesCount = 0;
        try {
          const playlists = await base44.asServiceRole.entities.Playlist.filter({
            artist_profile_id: song.artist_profile_id
          }, '-created_date', 100);
          const communityPlaylists = playlists.filter(p => p.community_id);
          const uniqueCommunities = new Set(communityPlaylists.map(p => p.community_id).filter(Boolean));
          frequencyCommunitiesCount = uniqueCommunities.size;
        } catch (e) {
          // continue
        }

        // First playlist — look up playlists that contain this song
        let firstPlaylistId = null;
        let firstPlaylistName = null;
        try {
          const allPlaylists = await base44.asServiceRole.entities.Playlist.list('created_date', 50);
          const playlistWithSong = allPlaylists.find(p => (p.song_ids || []).includes(song.id));
          if (playlistWithSong) {
            firstPlaylistId = playlistWithSong.id;
            firstPlaylistName = playlistWithSong.name || 'Untitled Playlist';
          }
        } catch (e) {
          // continue
        }

        // 3. Create or update DiscoveryRecord
        const existingRecord = await base44.asServiceRole.entities.DiscoveryRecord.filter({
          song_id: song.id
        }, '-created_date', 1);

        const recordData = {
          song_id: song.id,
          song_title: song.title,
          artist_profile_id: song.artist_profile_id,
          artist_name: song.artist_name,
          genre: song.genre,
          cover_art: song.cover_art,
          first_release_date: song.first_release_date || song.mainstream_first_start_date,
          exclusive_period_start: song.mainstream_first_start_date,
          exclusive_period_end: song.mainstream_first_end_date || (startDate ? new Date(startDate.getTime() + TWELVE_WEEKS_MS).toISOString() : null),
          transitioned_to_heard_first: true,
          transitioned_date: now.toISOString(),
          first_listeners_count: firstListenersCount,
          original_supporters_count: originalSupportersCount,
          discovery_partners_count: discoveryPartnersCount,
          radio_programmers_count: radioProgrammersCount,
          frequency_communities_count: frequencyCommunitiesCount,
          first_playlist_id: firstPlaylistId,
          first_playlist_name: firstPlaylistName,
          genre_playlist_name: genrePlaylistName,
          snapshot_play_count: song.play_count || 0,
          snapshot_support_count: song.support_count || 0,
          is_active: true
        };

        if (existingRecord && existingRecord[0]) {
          await base44.asServiceRole.entities.DiscoveryRecord.update(existingRecord[0].id, recordData);
        } else {
          await base44.asServiceRole.entities.DiscoveryRecord.create(recordData);
        }

        // 4. Update the Song: transition to heard_first + permanent flag
        await base44.asServiceRole.entities.Song.update(song.id, {
          mainstream_first_status: 'heard_first',
          is_heard_first: true,
          mainstream_first_end_date: song.mainstream_first_end_date || (startDate ? new Date(startDate.getTime() + TWELVE_WEEKS_MS).toISOString() : now.toISOString())
        });

        // 5. Update ArtistProfile mainstream_first_badge if needed
        if (song.artist_profile_id) {
          try {
            const artistProfiles = await base44.asServiceRole.entities.ArtistProfile.filter({
              id: song.artist_profile_id
            }, '-created_date', 1);
            if (artistProfiles && artistProfiles[0] && artistProfiles[0].mainstream_first_badge === 'mainstream_first') {
              await base44.asServiceRole.entities.ArtistProfile.update(artistProfiles[0].id, {
                mainstream_first_badge: 'heard_first'
              });
            }
          } catch (e) {
            // continue
          }
        }

        // 6. Auto-add to genre-based playlist
        try {
          const existingPlaylists = await base44.asServiceRole.entities.Playlist.filter({
            name: genrePlaylistName
          }, '-created_date', 1);
          
          if (existingPlaylists && existingPlaylists[0]) {
            // Add song to existing playlist
            const currentSongIds = existingPlaylists[0].song_ids || [];
            if (!currentSongIds.includes(song.id)) {
              await base44.asServiceRole.entities.Playlist.update(existingPlaylists[0].id, {
                song_ids: [...currentSongIds, song.id]
              });
            }
          } else {
            // Create the genre playlist
            await base44.asServiceRole.entities.Playlist.create({
              name: genrePlaylistName,
              description: 'Auto-generated permanent playlist for songs that debuted on The Mainstream Frequency.',
              song_ids: [song.id],
              type: 'community',
              is_living: false
            });
          }
        } catch (e) {
          // Playlist creation is non-critical
          console.log('Playlist creation skipped:', e.message);
        }

        // 7. Award fan badges for supporters during the exclusive period
        try {
          const supportAllocations = await base44.asServiceRole.entities.SupportAllocation.filter({
            artist_profile_id: song.artist_profile_id,
            is_active: true
          }, '-created_date', 200);
          
          // Filter supporters who supported during the exclusive period
          const exclusiveSupporters = supportAllocations.filter(a => {
            if (!a.created_date) return false;
            const allocDate = new Date(a.created_date);
            return startDate && allocDate >= startDate && allocDate <= now;
          });

          for (const allocation of exclusiveSupporters) {
            const fanUserId = allocation.fan_user_id;
            if (!fanUserId) continue;

            // Determine which badge(s) to award
            const allocDate = new Date(allocation.created_date);
            const daysSinceRelease = startDate ? (allocDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) : 0;

            const badgesToAward = [];

            // Original Supporter — supported during the 12-week exclusive period
            badgesToAward.push({
              badge_type: 'original_supporter',
              badge_tier: 'gold',
              song_id: song.id,
              song_title: song.title,
              artist_profile_id: song.artist_profile_id
            });

            // Day One Supporter — supported on release day
            if (daysSinceRelease <= 1) {
              badgesToAward.push({
                badge_type: 'day_one_supporter',
                badge_tier: 'diamond',
                song_id: song.id,
                song_title: song.title,
                artist_profile_id: song.artist_profile_id
              });
            }

            // Early Believer — supported within the first week
            if (daysSinceRelease <= 7) {
              badgesToAward.push({
                badge_type: 'early_believer',
                badge_tier: 'platinum',
                song_id: song.id,
                song_title: song.title,
                artist_profile_id: song.artist_profile_id
              });
            }

            // First Wave — among the first supporters
            if (originalSupportersCount > 0 && originalSupportersCount <= 50) {
              badgesToAward.push({
                badge_type: 'first_wave',
                badge_tier: 'silver',
                song_id: song.id,
                song_title: song.title,
                artist_profile_id: song.artist_profile_id
              });
            }

            // Award each badge (check for existing to avoid duplicates)
            for (const badgeData of badgesToAward) {
              const existingBadges = await base44.asServiceRole.entities.FanBadge.filter({
                fan_user_id: fanUserId,
                badge_type: badgeData.badge_type,
                song_id: song.id
              }, '-created_date', 1);

              if (!existingBadges || existingBadges.length === 0) {
                await base44.asServiceRole.entities.FanBadge.create({
                  fan_user_id: fanUserId,
                  ...badgeData,
                  earned_date: now.toISOString(),
                  is_displayed: true,
                  is_permanent: true
                });
              }
            }
          }

          // Award First Listener badges
          try {
            const listeningHistory = await base44.asServiceRole.entities.ListeningHistory.filter({
              song_id: song.id
            }, 'created_date', 100);
            const uniqueListeners = [...new Set(listeningHistory.map(h => h.user_id).filter(Boolean))];
            
            for (const listenerId of uniqueListeners.slice(0, 100)) {
              const existingBadges = await base44.asServiceRole.entities.FanBadge.filter({
                fan_user_id: listenerId,
                badge_type: 'first_listener',
                song_id: song.id
              }, '-created_date', 1);

              if (!existingBadges || existingBadges.length === 0) {
                await base44.asServiceRole.entities.FanBadge.create({
                  fan_user_id: listenerId,
                  badge_type: 'first_listener',
                  badge_tier: 'bronze',
                  song_id: song.id,
                  song_title: song.title,
                  artist_profile_id: song.artist_profile_id,
                  earned_date: now.toISOString(),
                  is_displayed: true,
                  is_permanent: true
                });
              }
            }
          } catch (e) {
            // continue
          }

        } catch (e) {
          console.log('Badge awarding error for song', song.id, ':', e.message);
        }

        processed++;
      } catch (e) {
        console.log('Error processing song', song.id, ':', e.message);
        errors++;
      }
    }

    // 8. Check for Hall of Discovery milestones
    try {
      const heardFirstSongs = await base44.asServiceRole.entities.Song.filter({
        is_heard_first: true
      }, '-play_count', 200);

      for (const song of heardFirstSongs) {
        const playCount = song.play_count || 0;
        const supportCount = song.support_count || 0;
        const totalEngagement = playCount + supportCount;

        // 100K Club
        if (totalEngagement >= 100000) {
          await ensureHallEntry(base44, song, '100k_club', totalEngagement, `Reached ${totalEngagement.toLocaleString()} combined streams and supporters.`);
        }

        // Million Club
        if (totalEngagement >= 1000000) {
          await ensureHallEntry(base44, song, 'million_club', totalEngagement, `Reached ${totalEngagement.toLocaleString()} combined streams and supporters — over 1 million!`);
        }
      }
    } catch (e) {
      console.log('Hall of Discovery check error:', e.message);
    }

    return Response.json({
      success: true,
      processed,
      errors,
      message: `Transitioned ${processed} songs from Mainstream First to Heard First.`
    });
  } catch (error) {
    console.error('processMainstreamFirstTransitions error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function ensureHallEntry(base44, song, category, milestoneValue, description) {
  const existing = await base44.asServiceRole.entities.HallOfDiscoveryEntry.filter({
    song_id: song.id,
    category
  }, '-created_date', 1);

  if (existing && existing[0]) return; // Already in hall

  await base44.asServiceRole.entities.HallOfDiscoveryEntry.create({
    song_id: song.id,
    song_title: song.title,
    artist_profile_id: song.artist_profile_id,
    artist_name: song.artist_name,
    genre: song.genre,
    cover_art: song.cover_art,
    category,
    milestone_value: milestoneValue,
    milestone_date: new Date().toISOString(),
    description,
    first_release_date: song.first_release_date || song.mainstream_first_start_date,
    inducted_date: new Date().toISOString(),
    is_featured: false
  });
}