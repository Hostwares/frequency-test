import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * sendFoundingPatronQuarterlyUpdate
 *
 * Sends a quarterly update communication ONLY to subscribers on the
 * Founding Patron Beta tier (plan_code: founding_champion_beta).
 *
 * Beta Supporter (founding_supporter_beta) and Founding Premium Beta
 * (founding_premium_beta) subscribers are explicitly excluded.
 *
 * Communication channels:
 *   1. Email — via SendEmail integration (registered app users only)
 *   2. In-app notification — FanNotification record (type: quarterly_update)
 *
 * Admin-only: only admins/master_admins can invoke this function.
 *
 * Payload (optional):
 *   - subject: string (email subject line, defaults to quarterly subject)
 *   - body: string (email/notification body, defaults to quarterly message)
 *   - quarter: string (e.g. "Q3-2026", defaults to current quarter)
 *   - dry_run: boolean (if true, returns who would be notified without actually sending)
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
    const dryRun = payload.dry_run === true;

    // Determine current quarter label
    const now = new Date();
    const quarter = payload.quarter || `Q${Math.floor(now.getMonth() / 3) + 1}-${now.getFullYear()}`;

    const subject = payload.subject || `Frequency Quarterly Update — ${quarter}`;
    const messageBody = payload.body || (
      `Hi there,\n\n` +
      `Thank you for being a Founding Patron Beta subscriber on The Mainstream Frequency™. ` +
      `Here is your quarterly update on platform developments, new artist drops, and community milestones.\n\n` +
      `As a Founding Patron, you continue to enjoy the highest tier benefits including priority access, ` +
      `the maximum funded network capacity, weighted artist allocation, and the full analytics suite.\n\n` +
      `We appreciate your dedication to supporting the artists who are shaping the future of music.\n\n` +
      `— The Frequency Team`
    );

    // --- EXCLUSION LOGIC ---
    // Fetch ALL active subscriptions so we can explicitly separate qualifying from excluded.
    const allActiveSubs = await base44.asServiceRole.entities.UserSubscription.filter({
      status: 'active',
    });

    // The ONLY tier that receives this communication
    const TARGET_PLAN_CODE = 'founding_champion_beta';

    // Tiers that are explicitly excluded from this communication
    const EXCLUDED_PLAN_CODES = ['founding_supporter_beta', 'founding_premium_beta'];

    const qualifying = [];
    const excluded = [];

    for (const sub of allActiveSubs) {
      if (sub.plan_code === TARGET_PLAN_CODE) {
        qualifying.push(sub);
      } else {
        excluded.push({
          user_id: sub.user_id,
          plan_code: sub.plan_code,
          plan_name: sub.plan_name,
          reason: EXCLUDED_PLAN_CODES.includes(sub.plan_code)
            ? 'Explicitly excluded tier'
            : 'Not Founding Patron Beta tier',
        });
      }
    }

    // --- DRY RUN: return who would be notified without sending ---
    if (dryRun) {
      return Response.json({
        status: 'dry_run',
        quarter,
        target_tier: 'Founding Patron Beta (founding_champion_beta)',
        qualifying_count: qualifying.length,
        excluded_count: excluded.length,
        qualifying_subscribers: qualifying.map(s => ({ user_id: s.user_id, plan_name: s.plan_name })),
        excluded_subscribers: excluded,
      });
    }

    // --- SEND COMMUNICATION ---
    const notified = [];
    const errors = [];

    for (const sub of qualifying) {
      try {
        // Fetch the user record for email + name
        const users = await base44.asServiceRole.entities.User.filter({ id: sub.user_id });
        const subscriber = users?.[0];
        if (!subscriber) {
          errors.push({ user_id: sub.user_id, error: 'User record not found' });
          continue;
        }

        // 1. Send email
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: subscriber.email,
            subject,
            body: messageBody,
            from_name: 'The Frequency',
          });
        } catch (emailErr) {
          // Log email error but continue — in-app notification is the fallback
          errors.push({ user_id: sub.user_id, error: `Email failed: ${emailErr.message}` });
        }

        // 2. Create in-app notification
        await base44.asServiceRole.entities.FanNotification.create({
          fan_user_id: sub.user_id,
          type: 'quarterly_update',
          title: subject,
          body: messageBody,
          quarterly_period: quarter,
        });

        notified.push({
          user_id: sub.user_id,
          user_name: subscriber.full_name || subscriber.email,
          email: subscriber.email,
          plan_name: sub.plan_name,
        });
      } catch (err) {
        errors.push({ user_id: sub.user_id, error: err.message });
      }
    }

    return Response.json({
      status: 'completed',
      quarter,
      target_tier: 'Founding Patron Beta (founding_champion_beta)',
      notified_count: notified.length,
      excluded_count: excluded.length,
      notified_subscribers: notified,
      excluded_subscribers: excluded,
      errors,
    });
  } catch (error) {
    console.error('sendFoundingPatronQuarterlyUpdate error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}