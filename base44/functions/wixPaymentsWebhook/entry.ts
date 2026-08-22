import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHmac } from 'node:crypto';

Deno.serve(async (req) => {
  try {
    // Verify webhook signature
    const signature = req.headers.get('wix-signature');
    if (!signature) {
      return Response.json({ error: 'Missing signature' }, { status: 401 });
    }

    const body = await req.text();
    const publicKey = Deno.env.get('WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY');
    
    if (publicKey) {
      const verifier = createHmac('sha256', publicKey);
      verifier.update(body);
      const calculatedSignature = verifier.digest('hex');
      
      if (calculatedSignature !== signature) {
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const webhookData = JSON.parse(body);
    console.log('Wix Payments Webhook:', webhookData);

    const base44 = createClientFromRequest(req);

    // Handle different webhook events
    const eventType = webhookData.type;

    if (eventType === 'ORDER_APPROVED') {
      // Payment successful - create order record
      const metadata = webhookData.data.metadata;
      
      const orderData = {
        order_number: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fan_user_id: metadata.fan_user_id,
        fan_name: metadata.fan_name,
        fan_email: metadata.fan_email,
        artist_profile_id: metadata.artist_profile_id,
        artist_name: metadata.artist_name,
        items: JSON.parse(metadata.items_json),
        subtotal: metadata.subtotal_cents / 100,
        shipping_cost: (webhookData.data.shipping_cost || 0) / 100,
        platform_fee: metadata.platform_fee_cents / 100,
        artist_earnings: metadata.artist_earnings_cents / 100,
        total: webhookData.data.total_amount / 100,
        payment_status: 'paid',
        fulfillment_status: 'unfulfilled',
        shipping_address: webhookData.data.shipping_address,
        created_date: new Date().toISOString(),
      };

      await base44.entities.Order.create(orderData);

      // Update product sales stats
      for (const item of orderData.items) {
        const products = await base44.entities.Product.filter({ id: item.product_id });
        if (products.length > 0) {
          const product = products[0];
          await base44.entities.Product.update(item.product_id, {
            total_sales: (product.total_sales || 0) + item.quantity,
            total_revenue: (product.total_revenue || 0) + (item.price * item.quantity),
          });
        }
      }

      // Update artist payment method balance
      const paymentMethods = await base44.entities.ArtistPaymentMethod.filter({ 
        artist_profile_id: metadata.artist_profile_id 
      });
      
      if (paymentMethods.length > 0) {
        const pm = paymentMethods[0];
        await base44.entities.ArtistPaymentMethod.update(pm.id, {
          pending_balance: (pm.pending_balance || 0) + orderData.artist_earnings,
          total_earned: (pm.total_earned || 0) + orderData.artist_earnings,
        });
      }

      console.log('Order created:', orderData.order_number);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});