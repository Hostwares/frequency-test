import { createClientFromRequest } from 'npm:@base44/sdk@0.8.39';

const WIX_API_KEY = Deno.env.get('WIX_PAYMENTS_API_KEY');
const WIX_SITE_ID = Deno.env.get('WIX_PAYMENTS_SITE_ID');
const WIX_CHECKOUT_URL = 'https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct';

const PLATFORM_FEE_RATE = 0.15;
const BETA_FLAT_PRICE = 4.99;

async function isBetaActive(base44) {
  const recs = await base44.asServiceRole.entities.BetaConfiguration.list('-created_date', 1);
  const cfg = recs?.[0];
  if (!cfg || !cfg.beta_mode_enabled) return false;
  const now = new Date();
  if (cfg.beta_start_date && new Date(cfg.beta_start_date) > now) return false;
  if (cfg.beta_planned_end_date && new Date(cfg.beta_planned_end_date) < now) return false;
  return true;
}

async function getBetaFlatPrice(base44) {
  const recs = await base44.asServiceRole.entities.PlatformSetting.filter({ setting_key: 'beta_flat_subscription_price' });
  if (!recs || recs.length === 0) return BETA_FLAT_PRICE;
  const n = Number(recs[0].setting_value);
  return isNaN(n) || n < 0.50 ? BETA_FLAT_PRICE : n;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      payment_type,
      items,
      artist_profile_id,
      artist_name,
      event_id,
      event_title,
      amount,
      is_recurring,
      plan_code,
      billing_cycle,
      name,
    } = body;

    if (!payment_type) {
      return Response.json({ error: 'payment_type is required' }, { status: 400 });
    }

    if (payment_type !== 'subscription' && !artist_profile_id) {
      return Response.json({ error: 'artist_profile_id is required' }, { status: 400 });
    }

    const origin = req.headers.get('Origin') || new URL(req.url).origin;

    let cartItems = [];
    let subtotal = 0;
    let shippingCost = 0;
    let orderItems = [];
    let subscriptionId = null;
    let recurring = false;
    let betaActive = false;
    let plans = null;

    switch (payment_type) {
      case 'merch': {
        if (!items || !Array.isArray(items) || items.length === 0) {
          return Response.json({ error: 'No items in cart' }, { status: 400 });
        }
        subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        shippingCost = items.reduce((sum, item) => sum + (item.shipping_cost || 0), 0);
        if (subtotal < 0.50) {
          return Response.json({ error: 'Minimum charge is $0.50' }, { status: 400 });
        }
        cartItems = items.map(item => ({
          name: item.product_title,
          quantity: item.quantity,
          price: (item.price).toFixed(2),
        }));
        orderItems = items.map(item => ({
          product_id: item.product_id,
          product_title: item.product_title,
          quantity: item.quantity,
          price: item.price,
          variant: item.variant || '',
          digital_file_url: item.digital_file_url || '',
        }));
        break;
      }

      case 'tickets': {
        if (!event_id || !event_title) {
          return Response.json({ error: 'event_id and event_title are required for tickets' }, { status: 400 });
        }
        const ticketPrice = Number(amount);
        if (!ticketPrice || ticketPrice < 0.50) {
          return Response.json({ error: 'Ticket price must be at least $0.50' }, { status: 400 });
        }
        const quantity = Number(body.quantity) || 1;
        subtotal = ticketPrice * quantity;
        cartItems = [{
          name: `Ticket: ${event_title}`,
          quantity: quantity,
          price: ticketPrice.toFixed(2),
        }];
        orderItems = [{
          product_title: `Ticket: ${event_title}`,
          quantity: quantity,
          price: ticketPrice,
        }];
        break;
      }

      case 'donation': {
        const donationAmount = Number(amount);
        if (!donationAmount || donationAmount < 0.50) {
          return Response.json({ error: 'Donation must be at least $0.50' }, { status: 400 });
        }
        subtotal = donationAmount;
        cartItems = [{
          name: `Donation to ${artist_name || 'artist'}`,
          quantity: 1,
          price: donationAmount.toFixed(2),
        }];
        orderItems = [{
          product_title: `Donation to ${artist_name || 'artist'}`,
          quantity: 1,
          price: donationAmount,
        }];
        break;
      }

      case 'support': {
        const supportAmount = Number(amount);
        if (!supportAmount || supportAmount < 0.50) {
          return Response.json({ error: 'Support amount must be at least $0.50' }, { status: 400 });
        }
        recurring = is_recurring !== false;
        subtotal = supportAmount;

        if (recurring) {
          cartItems = [{
            name: `Monthly Support: ${artist_name || 'artist'}`,
            quantity: 1,
            price: supportAmount.toFixed(2),
            subscriptionInfo: {
              subscriptionSettings: {
                frequency: 'MONTH',
              },
              title: `Monthly Support for ${artist_name || 'artist'}`,
              description: `Recurring monthly support of $${supportAmount.toFixed(2)}`,
            },
          }];
        } else {
          subtotal = supportAmount;
          cartItems = [{
            name: `One-time Support: ${artist_name || 'artist'}`,
            quantity: 1,
            price: supportAmount.toFixed(2),
          }];
        }
        orderItems = [{
          product_title: recurring
            ? `Monthly Support: ${artist_name || 'artist'}`
            : `One-time Support: ${artist_name || 'artist'}`,
          quantity: 1,
          price: supportAmount,
        }];
        break;
      }

      case 'subscription': {
        if (!plan_code || !billing_cycle) {
          return Response.json({ error: 'plan_code and billing_cycle are required for subscriptions' }, { status: 400 });
        }
        plans = await base44.asServiceRole.entities.SubscriptionPlan.filter({ plan_code });
        const subPlan = plans[0];

        // Beta mode: flat pricing overrides the normal tier for fan subscriptions
        betaActive = await isBetaActive(base44);
        let subAmount = Number(amount);
        if (betaActive && subPlan?.target_audience === 'fan') {
          const flatPrice = await getBetaFlatPrice(base44);
          subAmount = billing_cycle === 'annual' ? +(flatPrice * 10).toFixed(2) : flatPrice;
        }
        if (!subAmount || subAmount < 0.50) {
          return Response.json({ error: 'Subscription amount must be at least $0.50' }, { status: 400 });
        }

        recurring = true;
        const frequency = billing_cycle === 'annual' ? 'YEAR' : 'MONTH';

        cartItems = [{
          name: name || `Subscription: ${plan_code}`,
          quantity: 1,
          price: subAmount.toFixed(2),
          subscriptionInfo: {
            subscriptionSettings: {
              frequency: frequency,
            },
            title: name || `Subscription: ${plan_code}`,
            description: `${billing_cycle === 'annual' ? 'Annual' : 'Monthly'} subscription — ${plan_code}`,
          },
        }];

        subtotal = subAmount;
        orderItems = [{
          product_title: name || `Subscription: ${plan_code}`,
          quantity: 1,
          price: subAmount,
        }];
        break;
      }

      default:
        return Response.json({ error: `Unknown payment_type: ${payment_type}` }, { status: 400 });
    }

    const total = subtotal + shippingCost;
    let platformFee;
    let artistEarnings;

    if (payment_type === 'subscription') {
      // Subscriptions: fixed platform operations fee, remainder goes to artist support
      const plan = plans[0];
      const opsFee = plan?.platform_operations_fee || 2.50;
      platformFee = artist_profile_id ? opsFee : total;
      artistEarnings = artist_profile_id ? Math.max(0, total - opsFee) : 0;
    } else {
      platformFee = total * PLATFORM_FEE_RATE;
      artistEarnings = total * (1 - PLATFORM_FEE_RATE);
    }

    const checkoutBody = {
      cart: {
        items: cartItems,
        customerInfo: {
          email: user.email || '',
          firstName: (user.full_name || '').split(' ')[0] || '',
          lastName: (user.full_name || '').split(' ').slice(1).join(' ') || '',
        },
      },
      callbackUrls: {
        postFlowUrl: `${origin}/`,
        thankYouPageUrl: `${origin}/ThankYou`,
      },
    };

    const wixResponse = await fetch(WIX_CHECKOUT_URL, {
      method: 'POST',
      headers: {
        'Authorization': WIX_API_KEY,
        'wix-site-id': WIX_SITE_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutBody),
    });

    if (!wixResponse.ok) {
      const errorText = await wixResponse.text();
      console.error('Wix Payments error:', wixResponse.status, errorText);
      return Response.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    const checkoutData = await wixResponse.json();
    const checkoutSession = checkoutData.checkoutSession;

    if (!checkoutSession || !checkoutSession.redirectUrl) {
      console.error('Wix Payments: no redirect URL in response:', checkoutData);
      return Response.json({ error: 'No checkout URL returned' }, { status: 500 });
    }

    // Create a pending order record for webhook correlation (skip for subscriptions without artist)
    let orderNumber = null;
    if (payment_type !== 'subscription' || artist_profile_id) {
      orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const orderData = {
        order_number: orderNumber,
        fan_user_id: user.id,
        fan_name: user.full_name || '',
        fan_email: user.email || '',
        artist_profile_id: artist_profile_id || '',
        artist_name: artist_name || '',
        payment_type,
        items: orderItems,
        event_id: event_id || '',
        event_title: event_title || '',
        ticket_quantity: payment_type === 'tickets' ? (Number(body.quantity) || 1) : 0,
        checkout_session_id: checkoutSession.id,
        is_recurring: recurring,
        subtotal,
        shipping_cost: shippingCost,
        platform_fee: platformFee,
        artist_earnings: artistEarnings,
        total,
        payment_status: 'pending',
        fulfillment_status: 'unfulfilled',
      };

      await base44.asServiceRole.entities.Order.create(orderData);
    }

    // For subscriptions, create a pending UserSubscription
    if (payment_type === 'subscription') {
      // Plan already fetched above — reuse it instead of querying again
      const plan = plans[0];

      await base44.asServiceRole.entities.UserSubscription.create({
        user_id: user.id,
        user_name: user.full_name || '',
        user_email: user.email || '',
        plan_code,
        plan_name: plan?.name || plan_code,
        billing_cycle,
        monthly_price: betaActive ? total : (billing_cycle === 'annual' ? plan?.annual_price : plan?.monthly_price),
        is_founding_member: plan?.is_founding || false,
        is_locked_price: plan?.is_founding || false,
        status: 'pending',
        started_date: new Date().toISOString(),
        checkout_session_id: checkoutSession.id,
        support_allocation_amount: artistEarnings,
      });

      // If supporting a specific artist, create pending SupportAllocation
      if (artist_profile_id && artistEarnings > 0) {
        const month = new Date().toISOString().slice(0, 7);
        await base44.asServiceRole.entities.SupportAllocation.create({
          fan_user_id: user.id,
          artist_profile_id,
          artist_name: artist_name || '',
          amount: artistEarnings,
          tier: getTier(artistEarnings),
          is_active: false,
          is_recurring: true,
          checkout_session_id: checkoutSession.id,
          payment_status: 'pending',
          month,
        });
      }
    }

    // For recurring direct support, create a pending SupportAllocation
    if (payment_type === 'support' && recurring) {
      const month = new Date().toISOString().slice(0, 7);
      const tier = getTier(Number(amount));
      await base44.asServiceRole.entities.SupportAllocation.create({
        fan_user_id: user.id,
        artist_profile_id,
        artist_name: artist_name || '',
        amount: Number(amount),
        tier,
        is_active: false,
        is_recurring: true,
        checkout_session_id: checkoutSession.id,
        payment_status: 'pending',
        month,
      });
    }

    return Response.json({
      checkout_url: checkoutSession.redirectUrl,
      session_id: checkoutSession.id,
      order_number: orderNumber,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getTier(amount) {
  if (amount >= 15) return 'patron';
  if (amount >= 8) return 'champion';
  if (amount >= 3) return 'supporter';
  return 'basic';
}