import { base44 } from "@/api/base44Client";

/**
 * Fetches the platform default artists (artists with is_default_platform_artist = true),
 * excluding any the fan has dismissed. These appear in every fan's supported artists
 * list but do NOT count toward their artist slot limit or allocation budget unless
 * the fan explicitly creates a SupportAllocation for them.
 *
 * @returns {Promise<Array>} Array of default platform artist profiles (minus dismissed)
 */
export async function fetchDefaultPlatformArtists() {
  try {
    const [defaults, user] = await Promise.all([
      base44.entities.ArtistProfile.filter(
        { is_default_platform_artist: true },
        "-created_date",
        50
      ),
      base44.auth.me(),
    ]);
    const dismissed = new Set(user?.dismissed_default_artist_ids || []);
    return defaults.filter((a) => !dismissed.has(a.id));
  } catch {
    return [];
  }
}

/**
 * Given a fan's allocations and the list of default platform artists,
 * returns the default artists that the fan has NOT explicitly allocated to.
 * These are the ones shown as "included by default" (not counting toward slots/budget).
 *
 * @param {Array} allocations - Fan's active SupportAllocation records
 * @param {Array} defaultArtists - Platform default artist profiles
 * @returns {Array} Default artists the fan hasn't explicitly allocated to
 */
export function getDefaultArtistsNotAllocated(allocations, defaultArtists) {
  const allocatedArtistIds = new Set(
    allocations.map((a) => a.artist_profile_id).filter(Boolean)
  );
  return defaultArtists.filter((a) => !allocatedArtistIds.has(a.id));
}

/**
 * Dismisses a default platform artist so it no longer appears in the fan's list.
 * Stores the artist ID on the user entity via updateMe.
 *
 * @param {string} artistId - The ArtistProfile ID to dismiss
 * @param {Array} existingDismissed - Already-dismissed IDs (to avoid duplicates)
 */
export async function dismissDefaultArtist(artistId, existingDismissed = []) {
  const dismissed = Array.from(new Set([...(existingDismissed || []), artistId]));
  await base44.auth.updateMe({ dismissed_default_artist_ids: dismissed });
}