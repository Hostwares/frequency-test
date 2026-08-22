import { getMaxFundedNetworksForPlan } from './fundedNetworkLimits.ts';

/**
 * Downgrade Enforcement — Pause excess funded playlists on tier downgrade.
 *
 * When a subscriber downgrades to a tier with a lower active funded network
 * limit than their current usage, the oldest excess funded playlists are
 * PAUSED (not deleted) so they remain intact for reactivation on upgrade.
 *
 * The subscriber receives a FanNotification listing exactly which playlists
 * were paused and why.
 *
 * Shared between backend functions (wix-payments-webhook on subscription
 * activation, enforceDowngradePlaylistPause admin endpoint, cancelSubscription).
 */

export interface PauseResult {
  paused_playlists: Array<{
    id: string;
    name: string;
    created_date: string;
  }>;
  new_plan_code: string;
  new_funded_network_limit: number;
  previous_active_count: number;
}

/**
 * Enforce the funded network limit for a user's new plan.
 *
 * - Queries all funded playlists owned by user_id that are NOT already paused.
 * - If active funded count > new tier limit, pauses the oldest excess playlists.
 * - Sends a FanNotification listing which playlists were paused and why.
 * - Returns the pause result (empty if no action needed).
 *
 * @param base44     — base44 service-role client
 * @param userId     — the subscriber's user ID
 * @param planCode   — the new plan code after downgrade
 * @param fallbackLimit — fallback limit if plan_code is not in the lookup table
 */
export async function enforceDowngradePlaylistPause(
  base44: any,
  userId: string,
  planCode: string,
  fallbackLimit = 3,
): Promise<PauseResult> {
  const result: PauseResult = {
    paused_playlists: [],
    new_plan_code: planCode,
    new_funded_network_limit: getMaxFundedNetworksForPlan(planCode, fallbackLimit),
    previous_active_count: 0,
  };

  // 1. Fetch all funded playlists owned by this user
  const allPlaylists = await base44.asServiceRole.entities.Playlist.filter({
    owner_user_id: userId,
  });

  // 2. Separate active funded networks from paused ones
  const activeFunded = (allPlaylists || [])
    .filter((p) => p.is_funded_network === true && p.is_paused !== true)
    .sort((a, b) => {
      const da = a.created_date ? new Date(a.created_date).getTime() : 0;
      const db = b.created_date ? new Date(b.created_date).getTime() : 0;
      return da - db; // oldest first
    });

  result.previous_active_count = activeFunded.length;

  // 3. Check if excess
  const excessCount = activeFunded.length - result.new_funded_network_limit;
  if (excessCount <= 0) {
    return result; // no action needed
  }

  // 4. Pause the oldest excess playlists (first N by created_date ascending)
  const toPause = activeFunded.slice(0, excessCount);
  const pauseReason = `tier_downgrade: exceeded funded network limit of ${result.new_funded_network_limit} for plan ${planCode}`;

  for (const playlist of toPause) {
    await base44.asServiceRole.entities.Playlist.update(playlist.id, {
      is_paused: true,
      paused_reason: pauseReason,
      paused_date: new Date().toISOString(),
    });

    result.paused_playlists.push({
      id: playlist.id,
      name: playlist.name,
      created_date: playlist.created_date,
    });
  }

  // 5. Send in-app notification to the subscriber
  const playlistList = result.paused_playlists
    .map((p, i) => `${i + 1}. "${p.name}"`)
    .join('\n');

  const notificationBody =
    `Your subscription has changed to a plan with a funded network limit of ` +
    `${result.new_funded_network_limit}. You previously had ${result.previous_active_count} ` +
    `active funded network${result.previous_active_count === 1 ? '' : 's'}, so the oldest ` +
    `${excessCount} funded network${excessCount === 1 ? '' : 's'} ${excessCount === 1 ? 'was' : 'were'} ` +
    `automatically paused to stay within your new tier's limit.\n\n` +
    `Paused funded network${excessCount === 1 ? '' : 's'}:\n${playlistList}\n\n` +
    `Your playlists and all songs within them are preserved. ` +
    `To reactivate a paused network, upgrade your plan or swap it for another active network ` +
    `in your playlist settings.`;

  try {
    await base44.asServiceRole.entities.FanNotification.create({
      fan_user_id: userId,
      type: 'playlist_paused',
      title: `${excessCount} Funded Network${excessCount === 1 ? '' : 's'} Paused Due to Plan Change`,
      body: notificationBody,
      paused_playlist_ids: result.paused_playlists.map((p) => p.id),
      new_plan_code: planCode,
      new_funded_network_limit: result.new_funded_network_limit,
    });
  } catch (notifErr) {
    console.error('Failed to send playlist_paused notification:', notifErr.message);
  }

  // 6. Send email notification as well
  try {
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    const subscriber = users?.[0];
    if (subscriber?.email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: subscriber.email,
        subject: `Funded Networks Paused — The Mainstream Frequency`,
        body: `Hi ${subscriber.full_name || 'there'},\n\n${notificationBody}\n\n— The Frequency Team`,
        from_name: 'The Frequency',
      });
    }
  } catch (emailErr) {
    console.error('Failed to send playlist_paused email:', emailErr.message);
  }

  return result;
}