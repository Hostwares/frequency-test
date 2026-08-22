import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { enforceDowngradePlaylistPause } from '../../shared/downgradeEnforcement.ts';

/**
 * enforceDowngradePlaylistPause
 *
 * Admin-only endpoint that enforces funded network limits after a tier change.
 * Pauses the oldest excess funded playlists (not deletes) and sends the
 * subscriber a notification listing exactly which were paused and why.
 *
 * Can be called:
 *   - From the frontend after a plan change
 *   - From other backend functions (wix-payments-webhook, cancelSubscription)
 *
 * Payload:
 *   - user_id: string (required) — the subscriber who changed plans
 *   - plan_code: string (required) — the new plan code after the change
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = user.role === 'admin' || user.role === 'master_admin';
    if (!isAdmin) {
      return Response.json({ error: 'Forbidden — admin access required' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const { user_id, plan_code } = payload;

    if (!user_id || !plan_code) {
      return Response.json(
        { error: 'user_id and plan_code are required' },
        { status: 400 },
      );
    }

    const result = await enforceDowngradePlaylistPause(base44, user_id, plan_code);

    return Response.json({
      status: 'completed',
      user_id,
      new_plan_code: plan_code,
      new_funded_network_limit: result.new_funded_network_limit,
      previous_active_count: result.previous_active_count,
      paused_count: result.paused_playlists.length,
      paused_playlists: result.paused_playlists,
    });
  } catch (error) {
    console.error('enforceDowngradePlaylistPause error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}