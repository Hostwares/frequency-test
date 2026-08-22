import { createClientFromRequest } from 'npm:@base44/sdk@0.8.39';
import jwt from 'npm:jsonwebtoken@9.0.2';
import { appendSongSale } from '../../shared/songSalesSheet.ts';
import { enforceDowngradePlaylistPause } from '../../shared/downgradeEnforcement.ts';
import { syncSubscriptionEntitlement } from '../../shared/accountEntitlements.ts';

Deno.serve(async (req) => {
  try {
    const publicKey = Deno.env.get('WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY');
    if (!publicKey) {
      console.error('WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY not set');
      return Response.json({ error: 'Webhook public key not configured' }, { status: 500 });
    }

    const requestBody = await req.text();

    // Step 1: Verify JWT signature (RS256) — fail closed if verification fails
    let rawPayload;
    try {
      rawPayload = jwt.verify(requestBody, publicKey, { algorithms: ['RS256'] });
    } catch (err) {
      console.error('JWT verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Step 2: Parse double-nested JSON (WebhookEnvelope -> event data)
    const event = JSON.parse(rawPayload.data);
    const eventData = JSON.parse(event.data);

    const base44 = createClientFromRequest(req);
    const origin = req.headers.get('origin') || '';
    const eventType = event.eventType;

    console.log('Wix webhook event:', eventType);

    // ─── ORDER APPROVED ─────────────────────────────────────────────
    if (eventType === 'wix.ecom.v1.order_approved') {
      const wixEventId = event.id;

      // Idempotency: if this Wix event ID was already recorded on an order, skip entirely
      if (wixEventId) {
        const alreadyProcessed = await base44.asServiceRole.entities.Order.filter({
          processed_event_id: wixEventId,
        });
        if (alreadyProcessed.length > 0) {
          console.log('Duplicate Wix event already processed, skipping:', wixEventId);
          return Response.json({ success: true });
        }
      }

      const order = eventData.actionEvent.body.order;
      const checkoutId = order.checkoutId;

      // Extract subscription IDs from line items
      let subscriptionId = null;
      if (order.lineItems) {
        for (const lineItem of order.lineItems) {
          if (lineItem.subscriptionInfo?.id) {
            subscriptionId = lineItem.subscriptionInfo.id;
            break;
          }
        }
      }

      // Activate UserSubscriptions linked to this checkout (handles artist-less subscriptions)
      const userSubs = await base44.asServiceRole.entities.UserSubscription.filter({
        checkout_session_id: checkoutId,
      });

      for (const sub of userSubs) {
        const nextBilling = sub.billing_cycle === 'annual'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        await base44.asServiceRole.entities.UserSubscription.update(sub.id, {
          status: 'active',
          subscription_id: subscriptionId || sub.subscription_id || '',
          started_date: sub.started_date || new Date().toISOString(),
          renewed_date: new Date().toISOString(),
          next_billing_date: nextBilling,
        });

        console.log('UserSubscription activated:', sub.id);

        // Enforce funded network limit after plan change — pause excess, notify subscriber
        try {
          const pauseResult = await enforceDowngradePlaylistPause(base44, sub.user_id, sub.plan_code);
          if (pauseResult.paused_playlists.length > 0) {
            console.log(`Downgrade enforcement: paused ${pauseResult.paused_playlists.length} funded network(s) for user ${sub.user_id} (plan: ${sub.plan_code})`);
          }
        } catch (pauseErr) {
          console.error('Downgrade enforcement failed for sub', sub.id, ':', pauseErr.message);
        }
      }

      // Sync the subscription_entitlement snapshot onto the User record for each activated sub
      for (const sub of userSubs) {
        try {
          await syncSubscriptionEntitlement(base44, sub.user_id);
        } catch (syncErr) {
          console.error('Entitlement sync failed for user', sub.user_id, ':', syncErr.message);
        }
      }

      // Find the pending order by checkout_session_id
      const pendingOrders = await base44.asServiceRole.entities.Order.filter({
        checkout_session_id: checkoutId,
      });

      if (pendingOrders.length === 0) {
        console.log('No order found for checkout ID (subscription only):', checkoutId);
        return Response.json({ success: true });
      }

      const orderRecord = pendingOrders[0];

      // ─── Idempotency: skip if this order was already processed ──
      if (orderRecord.payment_status === 'paid') {
        console.log('Order already processed, skipping duplicate webhook:', orderRecord.order_number);
        return Response.json({ success: true });
      }
      const buyerEmail = order.buyerInfo?.email || orderRecord.fan_email;
      const totalAmount = parseFloat(order.priceSummary?.total?.amount || '0') || orderRecord.total;
      const shippingAddress = order.billingInfo?.address || null;

      // Update the order record (store the Wix event ID for idempotency)
      await base44.asServiceRole.entities.Order.update(orderRecord.id, {
        payment_status: 'paid',
        processed_event_id: wixEventId || '',
        fan_email: buyerEmail,
        total: totalAmount,
        subscription_id: subscriptionId || '',
        shipping_address: shippingAddress ? {
          name: `${order.billingInfo?.contactDetails?.firstName || ''} ${order.billingInfo?.contactDetails?.lastName || ''}`.trim(),
          address_line1: shippingAddress.addressLine || '',
          address_line2: shippingAddress.addressLine2 || '',
          city: shippingAddress.city || '',
          state: shippingAddress.region || '',
          postal_code: shippingAddress.postalCode || '',
          country: shippingAddress.country || '',
        } : orderRecord.shipping_address,
      });

      // Handle recurring support subscription
      if ((orderRecord.payment_type === 'support' || orderRecord.payment_type === 'subscription') && orderRecord.is_recurring && subscriptionId) {
        const supportAllocations = await base44.asServiceRole.entities.SupportAllocation.filter({
          checkout_session_id: checkoutId,
        });

        for (const alloc of supportAllocations) {
          await base44.asServiceRole.entities.SupportAllocation.update(alloc.id, {
            is_active: true,
            payment_status: 'active',
            subscription_id: subscriptionId,
          });
        }
      }

      // Update product sales stats for merch
      if (orderRecord.payment_type === 'merch' && orderRecord.items) {
        for (const item of orderRecord.items) {
          if (!item.product_id) continue;
          const products = await base44.asServiceRole.entities.Product.filter({ id: item.product_id });
          if (products.length > 0) {
            const product = products[0];
            await base44.asServiceRole.entities.Product.update(item.product_id, {
              total_sales: (product.total_sales || 0) + item.quantity,
              total_revenue: (product.total_revenue || 0) + (item.price * item.quantity),
              inventory_count: Math.max(0, (product.inventory_count || 0) - item.quantity),
            });
          }
        }
      }

      // ─── Direct song purchase: grant Current Catalog Access + record fan wallet debit ──
      const purchasedSongs = [];
      if (orderRecord.payment_type === 'merch' && orderRecord.items && orderRecord.fan_user_id && orderRecord.artist_profile_id) {
        let fanWalletBalance = 0;
        try {
          const fanUsers = await base44.asServiceRole.entities.User.filter({ id: orderRecord.fan_user_id });
          fanWalletBalance = fanUsers?.[0]?.wallet_balance ?? 0;
        } catch (e) {
          console.error('Failed to read fan wallet balance:', e.message);
        }
        for (const item of orderRecord.items) {
          if (!item.product_id) continue;
          const songs = await base44.asServiceRole.entities.Song.filter({ id: item.product_id });
          if (!songs || songs.length === 0) continue; // not a direct song purchase
          const song = songs[0];
          if (!song.is_purchasable) continue;
          purchasedSongs.push({ title: song.title || 'Untitled', price: item.price });

          // Idempotent: skip if this fan already has an active grant for this artist
          const existingGrants = await base44.asServiceRole.entities.CatalogAccessGrant.filter({
            fan_user_id: orderRecord.fan_user_id,
            artist_profile_id: orderRecord.artist_profile_id,
            is_active: true,
          });
          if (existingGrants.length === 0) {
            await base44.asServiceRole.entities.CatalogAccessGrant.create({
              fan_user_id: orderRecord.fan_user_id,
              fan_name: orderRecord.fan_name || '',
              fan_email: orderRecord.fan_email || '',
              artist_profile_id: orderRecord.artist_profile_id,
              artist_name: orderRecord.artist_name || '',
              artist_user_id: '',
              purchase_policy: 'current_catalog_access',
              granted_date: new Date().toISOString(),
              source_order_id: orderRecord.id,
              source_song_id: song.id,
              source_song_title: song.title || '',
              is_active: true,
            });
            console.log('CatalogAccessGrant created for fan', orderRecord.fan_user_id, 'artist', orderRecord.artist_profile_id);
          }

          // Record the purchase as a debit in the fan's wallet ledger
          await base44.asServiceRole.entities.WalletTransaction.create({
            user_id: orderRecord.fan_user_id,
            transaction_type: 'merch_purchase',
            amount: item.price * item.quantity,
            direction: 'debit',
            payment_method: 'wix_payments',
            status: 'completed',
            order_id: orderRecord.id,
            artist_profile_id: orderRecord.artist_profile_id,
            description: `Direct song purchase: ${song.title || ''} \u2014 ${orderRecord.artist_name || ''}`,
            checkout_session_id: checkoutId,
            external_transaction_id: wixEventId || '',
            balance_after: fanWalletBalance,
          });

          // Append this sale to the master Google Sheet (best-effort, never blocks payment processing)
          try {
            await appendSongSale(base44, {
              date: new Date().toISOString(),
              orderNumber: orderRecord.order_number || '',
              fanName: orderRecord.fan_name || '',
              fanEmail: buyerEmail || orderRecord.fan_email || '',
              artistName: orderRecord.artist_name || '',
              artistProfileId: orderRecord.artist_profile_id || '',
              songTitle: song.title || '',
              price: item.price,
              quantity: item.quantity,
              lineTotal: item.price * item.quantity,
              paymentStatus: 'paid',
              sourceSongId: song.id,
            });
            console.log('Song sale logged to Google Sheet:', song.title);
          } catch (sheetErr) {
            console.error('Failed to log song sale to Google Sheet:', sheetErr.message);
          }
        }
      }

      // ─── Send purchase receipt email to the fan (catalog access confirmation) ──
      if (purchasedSongs.length > 0) {
        try {
          const receiptEmail = orderRecord.fan_email || buyerEmail || '';
          if (receiptEmail) {
            const songList = purchasedSongs
              .map((s) => `\u2022 "${s.title}" \u2014 $${Number(s.price).toFixed(2)}`)
              .join('\n');
            const subject = `Your Frequency receipt & catalog access \u2014 Order ${orderRecord.order_number || ''}`;
            const body =
              `Hi ${orderRecord.fan_name || 'there'},\n\n` +
              `Thanks for your purchase on The Mainstream Frequency! Your payment is confirmed and your new catalog access is now active.\n\n` +
              `Order: ${orderRecord.order_number || 'N/A'}\n` +
              `Artist: ${orderRecord.artist_name || 'N/A'}\n\n` +
              `Songs purchased:\n${songList}\n\n` +
              `Total paid: $${Number(orderRecord.total || 0).toFixed(2)}\n\n` +
              `What you unlocked: Current Catalog Access to ${orderRecord.artist_name || 'this artist'}'s eligible catalog. You can now stream and add those songs to your personal listening playlists. This was a one-time purchase \u2014 it does not enroll you in any recurring monthly support.\n\n` +
              (origin ? `View and play your unlocked songs here: ${origin}/fan-dashboard\n\n` : '') +
              `Keep discovering,\n` +
              `The Mainstream Frequency`;
            await base44.integrations.Core.SendEmail({
              to: receiptEmail,
              subject,
              body,
            });
            console.log('Purchase receipt email sent to', receiptEmail);
          }
        } catch (emailErr) {
          console.error('Failed to send purchase receipt email:', emailErr.message);
        }
      }

      // Update artist payment method balance atomically (race-safe under webhook retries)
      if (orderRecord.artist_earnings > 0 && orderRecord.artist_profile_id) {
        await base44.asServiceRole.entities.ArtistPaymentMethod.updateMany(
          { artist_profile_id: orderRecord.artist_profile_id },
          {
            $inc: {
              pending_balance: orderRecord.artist_earnings,
              total_earned: orderRecord.artist_earnings,
            },
          }
        );
      }

      // Credit artist's digital wallet — atomic increment so concurrent webhooks can't race
      if (orderRecord.artist_earnings > 0 && orderRecord.artist_profile_id) {
        const artistProfiles = await base44.asServiceRole.entities.ArtistProfile.filter({
          id: orderRecord.artist_profile_id,
        });

        if (artistProfiles.length > 0 && artistProfiles[0].user_id) {
          const artistUserId = artistProfiles[0].user_id;
          const txTypeMap = {
            support: 'support_payment',
            subscription: 'support_payment',
            merch: 'merch_purchase',
            tickets: 'ticket_purchase',
            donation: 'donation',
          };

          // Atomically increment the wallet balance (no read-then-write race)
          await base44.asServiceRole.entities.User.updateMany(
            { id: artistUserId },
            { $inc: { wallet_balance: orderRecord.artist_earnings } }
          );

          // Read the new balance after the atomic increment for the ledger entry
          const updatedUsers = await base44.asServiceRole.entities.User.filter({ id: artistUserId });
          const newBalance = updatedUsers.length > 0 ? (updatedUsers[0].wallet_balance || 0) : 0;

          await base44.asServiceRole.entities.WalletTransaction.create({
            user_id: artistUserId,
            transaction_type: txTypeMap[orderRecord.payment_type] || 'support_payment',
            amount: orderRecord.artist_earnings,
            direction: 'credit',
            payment_method: 'wix_payments',
            status: 'completed',
            order_id: orderRecord.id,
            artist_profile_id: orderRecord.artist_profile_id,
            description: `${orderRecord.payment_type === 'subscription' ? 'Subscription support' : orderRecord.payment_type} from ${orderRecord.fan_name || 'fan'}`,
            checkout_session_id: checkoutId,
            external_transaction_id: wixEventId || '',
            balance_after: newBalance,
          });

          console.log('Artist wallet credited:', artistUserId, orderRecord.artist_earnings);
        }
      }

      console.log('Order approved and updated:', orderRecord.order_number);
    }

    // ─── SUBSCRIPTION CANCELED ──────────────────────────────────────
    else if (eventType === 'wix.ecom.subscription_contracts.v1.subscription_contract_canceled') {
      const subscriptionContract = eventData.actionEvent.body.subscriptionContract;
      const subscriptionId = subscriptionContract.id;

      // Mark SupportAllocation as canceled
      const allocations = await base44.asServiceRole.entities.SupportAllocation.filter({
        subscription_id: subscriptionId,
      });

      for (const alloc of allocations) {
        await base44.asServiceRole.entities.SupportAllocation.update(alloc.id, {
          is_active: false,
          payment_status: 'canceled',
        });
      }

      // Mark UserSubscription as canceled
      const canceledSubs = await base44.asServiceRole.entities.UserSubscription.filter({
        subscription_id: subscriptionId,
      });
      for (const sub of canceledSubs) {
        await base44.asServiceRole.entities.UserSubscription.update(sub.id, {
          status: 'canceled',
          canceled_date: new Date().toISOString(),
        });
      }

      // Sync the entitlement snapshot for each canceled subscription's user
      for (const sub of canceledSubs) {
        try {
          await syncSubscriptionEntitlement(base44, sub.user_id);
        } catch (syncErr) {
          console.error('Entitlement sync failed on cancel for user', sub.user_id, ':', syncErr.message);
        }
      }

      console.log('Subscription canceled:', subscriptionId);
    }

    // ─── SUBSCRIPTION ENDED (expired naturally) ─────────────────────
    else if (eventType === 'wix.ecom.subscription_contracts.v1.subscription_contract_expired') {
      const subscriptionContract = eventData.actionEvent.body.subscriptionContract;
      const subscriptionId = subscriptionContract.id;

      const allocations = await base44.asServiceRole.entities.SupportAllocation.filter({
        subscription_id: subscriptionId,
      });

      for (const alloc of allocations) {
        await base44.asServiceRole.entities.SupportAllocation.update(alloc.id, {
          is_active: false,
          payment_status: 'ended',
        });
      }

      // Mark UserSubscription as expired
      const expiredSubs = await base44.asServiceRole.entities.UserSubscription.filter({
        subscription_id: subscriptionId,
      });
      for (const sub of expiredSubs) {
        await base44.asServiceRole.entities.UserSubscription.update(sub.id, {
          status: 'expired',
        });
      }

      // Sync the entitlement snapshot for each expired subscription's user
      for (const sub of expiredSubs) {
        try {
          await syncSubscriptionEntitlement(base44, sub.user_id);
        } catch (syncErr) {
          console.error('Entitlement sync failed on expire for user', sub.user_id, ':', syncErr.message);
        }
      }

      console.log('Subscription ended:', subscriptionId);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});