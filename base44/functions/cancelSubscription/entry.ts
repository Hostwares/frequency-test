import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const WIX_API_KEY = Deno.env.get('WIX_PAYMENTS_API_KEY');
const WIX_SITE_ID = Deno.env.get('WIX_PAYMENTS_SITE_ID');
const WIX_CANCEL_URL = 'https://www.wixapis.com/payments/base44/v1/subscriptions';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { subscription_id, immediate, reason } = body;

    if (!subscription_id) {
      return Response.json({ error: 'subscription_id is required' }, { status: 400 });
    }

    // Verify the subscription belongs to the requesting user
    const userSubs = await base44.asServiceRole.entities.UserSubscription.filter({
      user_id: user.id,
      subscription_id,
    });

    if (userSubs.length === 0) {
      return Response.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const userSub = userSubs[0];

    if (userSub.status === 'canceled' || userSub.status === 'expired') {
      return Response.json({ error: 'Subscription is already canceled or expired' }, { status: 400 });
    }

    // Call Wix cancel API
    const cancelResponse = await fetch(`${WIX_CANCEL_URL}/${subscription_id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': WIX_API_KEY,
        'wix-site-id': WIX_SITE_ID,
      },
      body: JSON.stringify({
        subscription_id,
        reason: reason || 'User requested cancellation',
        immediate: immediate ?? false,
      }),
    });

    if (!cancelResponse.ok) {
      const errorText = await cancelResponse.text();
      console.error('Wix cancel error:', cancelResponse.status, errorText);

      // If soft cancel failed, try immediate
      if (!immediate) {
        console.log('Soft cancel failed, retrying with immediate: true');
        const retryResponse = await fetch(`${WIX_CANCEL_URL}/${subscription_id}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': WIX_API_KEY,
            'wix-site-id': WIX_SITE_ID,
          },
          body: JSON.stringify({
            subscription_id,
            reason: reason || 'User requested cancellation',
            immediate: true,
          }),
        });

        if (!retryResponse.ok) {
          const retryError = await retryResponse.text();
          console.error('Wix immediate cancel error:', retryResponse.status, retryError);
          return Response.json({ error: 'Failed to cancel subscription' }, { status: 500 });
        }
      } else {
        return Response.json({ error: 'Failed to cancel subscription' }, { status: 500 });
      }
    }

    // Update local records — webhook will also fire, but update now for immediate feedback
    await base44.asServiceRole.entities.UserSubscription.update(userSub.id, {
      status: 'canceled',
      canceled_date: new Date().toISOString(),
    });

    // Deactivate any support allocations tied to this subscription
    const allocations = await base44.asServiceRole.entities.SupportAllocation.filter({
      subscription_id,
    });

    for (const alloc of allocations) {
      await base44.asServiceRole.entities.SupportAllocation.update(alloc.id, {
        is_active: false,
        payment_status: 'canceled',
      });
    }

    console.log('Subscription canceled:', subscription_id, 'for user:', user.id);

    return Response.json({
      success: true,
      subscription_id,
      status: 'canceled',
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});