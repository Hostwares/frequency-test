import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Discovery Pass Expiration Sweep (scheduled daily)
 *
 * For each subscriber pass that has passed its expiry_date:
 *   - If still within the 7-day grace period: mark status = "grace_period" and send a
 *     FanNotification telling the fan to purchase a song or replace a standard artist
 *     to keep their temporary artists.
 *   - If the grace period has ended: mark status = "expired" and remove all temporary
 *     artists (and their songs) from the subscriber's funded networks so they stop
 *     receiving distribution.
 *
 * Idempotent: once a pass is "expired" or "converted" it is skipped.
 */

async function getSetting(base44, key, fallback) {
  const recs = await base44.asServiceRole.entities.PlatformSetting.filter({ setting_key: key });
  if (!recs || recs.length === 0) return fallback;
  const n = Number(recs[0].setting_value);
  return isNaN(n) ? fallback : n;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'master_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();

    // Fetch all active and grace_period passes to check
    const activePasses = await base44.asServiceRole.entities.DiscoveryPass.filter({ status: 'active' });
    const gracePasses = await base44.asServiceRole.entities.DiscoveryPass.filter({ status: 'grace_period' });
    const candidates = [...(activePasses || []), ...(gracePasses || [])];

    let enteredGrace = 0;
    let fullyExpired = 0;
    let artistsRemoved = 0;
    let notificationsSent = 0;
    const errors = [];

    for (const pass of candidates) {
      const expiry = new Date(pass.expiry_date);
      const graceEnd = pass.grace_period_end_date ? new Date(pass.grace_period_end_date) : null;

      if (expiry > now) continue; // still active

      const tempArtistIds = new Set(pass.temporary_artist_ids || []);
      const convertedIds = new Set(pass.converted_artist_ids || []);
      // Only remove artists that were NOT converted
      const removableIds = new Set(
        [...tempArtistIds].filter((id) => !convertedIds.has(id))
      );

      if (graceEnd && graceEnd > now) {
        // --- Grace period: notify the fan, mark grace_period ---
        if (pass.status === 'active') {
          await base44.asServiceRole.entities.DiscoveryPass.update(pass.id, {
            status: 'grace_period',
            expiry_notification_sent: true,
          });
          enteredGrace += 1;
        }

        // Send fan notification
        try {
          const existingNotifs = await base44.asServiceRole.entities.FanNotification.filter({
            fan_user_id: pass.user_id,
            type: 'discovery_pass_expired',
          });
          if (existingNotifs.length === 0) {
            await base44.asServiceRole.entities.FanNotification.create({
              fan_user_id: pass.user_id,
              type: 'discovery_pass_expired',
              title: 'Your Discovery Pass has expired',
              message:
                `Your Discovery Pass has expired. You have until ${graceEnd.toLocaleDateString()} to keep your ` +
                `${removableIds.size} temporary artist${removableIds.size > 1 ? 's' : ''}: purchase a qualifying song ` +
                `for each, or swap them into your standard artist slots. After the grace period, they will be removed ` +
                `from your funded networks.`,
            });
            notificationsSent += 1;
          }
        } catch (e) {
          console.error(`Failed to send discovery pass notification to ${pass.user_id}:`, e);
        }
      } else {
        // --- Grace period over: remove temporary artists from funded networks ---
        if (removableIds.size > 0) {
          const playlists = await base44.asServiceRole.entities.Playlist.filter({
            owner_user_id: pass.user_id,
          });
          const fundedNetworks = (playlists || []).filter((p) => p.is_funded_network);

          for (const net of fundedNetworks) {
            let changed = false;

            // Remove from artist_allocations
            const newAllocations = (net.artist_allocations || []).filter((a) => {
              if (removableIds.has(a.artist_profile_id)) {
                changed = true;
                return false;
              }
              return true;
            });

            // Remove songs by temporary artists
            let newSongIds = [...(net.song_ids || [])];
            let newSongEntries = [...(net.song_entries || [])];
            const songsToRemove = [];
            for (const sid of [...new Set(newSongIds)].slice(0, 100)) {
              try {
                const song = await base44.asServiceRole.entities.Song.get(sid);
                if (song && removableIds.has(song.artist_profile_id)) {
                  songsToRemove.push(sid);
                }
              } catch {
                // song removed — skip
              }
            }
            if (songsToRemove.length > 0) {
              const removeSet = new Set(songsToRemove);
              newSongIds = newSongIds.filter((id) => !removeSet.has(id));
              newSongEntries = newSongEntries.filter((e) => !removeSet.has(e.song_id));
              changed = true;
            }

            if (changed) {
              await base44.asServiceRole.entities.Playlist.update(net.id, {
                artist_allocations: newAllocations,
                song_ids: newSongIds,
                song_entries: newSongEntries,
              });
              artistsRemoved += (net.artist_allocations || []).length - newAllocations.length;
            }
          }
        }

        // Mark pass as expired
        await base44.asServiceRole.entities.DiscoveryPass.update(pass.id, {
          status: 'expired',
          converted_date: now.toISOString(),
        });
        fullyExpired += 1;
      }
    }

    return Response.json({
      success: true,
      checked: candidates.length,
      entered_grace_period: enteredGrace,
      fully_expired: fullyExpired,
      artists_removed: artistsRemoved,
      notifications_sent: notificationsSent,
      errors,
    });
  } catch (error) {
    console.error('expireDiscoveryPasses error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});