import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { event, data, old_data } = body || {};

    if (!event || !data) {
      return Response.json({ error: 'Missing automation payload' }, { status: 400 });
    }

    const userId = data.user_id;
    if (!userId) {
      return Response.json({ skipped: true, reason: 'no user_id in payload' });
    }

    // Determine trigger reason
    let reason = null;
    if (event.entity_name === 'OnboardingProgress' && data.is_complete === true) {
      reason = 'onboarding_complete';
    } else if (event.entity_name === 'UserSubscription') {
      reason = 'subscription_change';
    }

    if (!reason) {
      return Response.json({ skipped: true, reason: 'trigger not matched' });
    }

    // Load the user (service role — automation has no user auth)
    let user;
    try {
      user = await base44.asServiceRole.entities.User.get(userId);
    } catch (e) {
      return Response.json({ skipped: true, reason: 'user not found', error: String(e.message || e) });
    }

    // Only beta members receive the beta-ready summary
    if (!user.is_beta_member) {
      return Response.json({ skipped: true, reason: 'not a beta member' });
    }

    const name = user.display_name || user.full_name || 'there';
    const email = user.email;
    if (!email) {
      return Response.json({ skipped: true, reason: 'user has no email' });
    }

    // Pull latest subscription for the summary
    let subLine = 'No active subscription yet.';
    try {
      const subs = await base44.asServiceRole.entities.UserSubscription.filter({ user_id: userId });
      if (subs && subs.length) {
        const sub = subs[0];
        const plan = sub.plan_name || sub.plan_code || 'your plan';
        subLine = `Plan: ${plan} — Status: ${sub.status || 'active'}` +
          (sub.billing_cycle ? ` (${sub.billing_cycle})` : '');
      }
    } catch (e) {
      // non-fatal; continue with default sub line
    }

    const betaPlan = user.beta_plan ? `Beta tier: ${user.beta_plan}` : '';
    const founding = user.founding_member_status && user.founding_member_status !== 'none'
      ? `Founding status: ${user.founding_member_status}`
      : '';

    const onboardingLine = reason === 'onboarding_complete'
      ? 'Your onboarding checklist is complete — your account is fully set up.'
      : 'Your onboarding is on track. Finish your checklist to complete setup.';

    const subLine2 = reason === 'subscription_change'
      ? 'Your subscription status was just updated.'
      : '';

    const bodyHtml = `
      <div style="font-family: Inter, Arial, sans-serif; color:#0b0a14; max-width:560px; margin:0 auto;">
        <h2 style="background: linear-gradient(135deg,#a855f7,#06b6d4,#d946ef); -webkit-background-clip:text; color:#a855f7; margin:0 0 16px;">
          Your Frequency beta account is ready 🎉
        </h2>
        <p>Hi ${name},</p>
        <p><strong>Your account is ready.</strong> You're confirmed as a Mainstream Frequency beta member.</p>
        <p>${onboardingLine}</p>
        ${subLine2 ? `<p>${subLine2}</p>` : ''}
        <p style="margin-top:16px;"><strong>Account summary</strong></p>
        <ul>
          <li>${subLine}</li>
          ${betaPlan ? `<li>${betaPlan}</li>` : ''}
          ${founding ? `<li>${founding}</li>` : ''}
          <li>Beta badge: ${user.beta_badge || 'Beta Member'}</li>
        </ul>
        <p style="margin-top:16px;">Open your dashboard to start supporting artists, discover music, and join Frequencies:</p>
        <p><a href="/" style="display:inline-block; padding:10px 18px; background:#a855f7; color:#fff; border-radius:8px; text-decoration:none;">Open Frequency</a></p>
        <p style="color:#6b7280; font-size:12px; margin-top:24px;">You're receiving this because you're a Mainstream Frequency beta member. Thank you for helping shape the platform.</p>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: 'Your Frequency beta account is ready 🎉',
      body: bodyHtml,
      from_name: 'The Mainstream Frequency'
    });

    return Response.json({ sent: true, reason, to: email });
  } catch (error) {
    console.error('sendBetaReadyEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});