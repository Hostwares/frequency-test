import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const STRIPE_API = 'https://api.stripe.com/v1/transfers';

async function createStripeTransfer(amountDollars, destinationAccountId, description) {
  const apiKey = Deno.env.get('STRIPE_SECRET_KEY');
  const amountCents = Math.round(amountDollars * 100);
  const body = new URLSearchParams({
    amount: String(amountCents),
    currency: 'usd',
    destination: destinationAccountId,
    description,
  });
  const res = await fetch(STRIPE_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    const msg = data.error?.message || data.error?.type || `Stripe API error (HTTP ${res.status})`;
    throw new Error(msg);
  }
  return { transferId: data.id };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify admin access — admin or master_admin
    const user = await base44.auth.me();
    if (!user || !['admin', 'master_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const origin = req.headers.get('Origin') || 'https://app.base44.com';
    console.log(`Processing monthly artist payouts — triggered by ${user.email} (${user.role})`);

    // Get all active payment methods using service role for consistent access
    const allPaymentMethods = await base44.asServiceRole.entities.ArtistPaymentMethod.filter({
      is_active: true,
    });

    const eligibleForPayout = allPaymentMethods.filter(pm =>
      (pm.pending_balance || 0) >= (pm.minimum_payout || 50)
    );

    console.log(`Found ${eligibleForPayout.length} artists eligible for payout`);

    const results = [];

    for (const pm of eligibleForPayout) {
      const payoutAmount = pm.pending_balance;
      const canStripeTransfer =
        pm.payment_provider === 'stripe' &&
        pm.account_id &&
        pm.is_verified;

      // Create the payout record up-front in a processing state
      const payout = await base44.asServiceRole.entities.ArtistPayout.create({
        artist_profile_id: pm.artist_profile_id,
        artist_user_id: pm.artist_user_id,
        amount: payoutAmount,
        payout_type: 'monthly',
        status: 'processing',
        payment_provider: pm.payment_provider,
        payout_email: pm.account_email,
        processed_date: new Date().toISOString(),
        platform_fee: payoutAmount - payoutAmount * ((pm.payout_percentage || 85) / 100),
        notes: canStripeTransfer ? 'Stripe Connect transfer in progress.' : 'Queued — no verified Stripe connected account; manual transfer required.',
      });

      // Non-stripe / unverified methods: leave queued for manual processing
      if (!canStripeTransfer) {
        await base44.asServiceRole.entities.ArtistPayout.update(payout.id, { status: 'pending' });
        results.push({
          artist_profile_id: pm.artist_profile_id,
          amount: payoutAmount,
          status: 'pending',
          reason: 'No verified Stripe connected account',
        });
        console.log(`Payout ${payout.id} queued (no Stripe account) for artist ${pm.artist_profile_id}`);
        continue;
      }

      // Attempt the real Stripe Connect transfer
      try {
        const { transferId } = await createStripeTransfer(
          payoutAmount,
          pm.account_id,
          `Frequency monthly payout — artist ${pm.artist_profile_id}`
        );

        // Stripe confirmed the transfer — mark completed and zero the balance
        await base44.asServiceRole.entities.ArtistPayout.update(payout.id, {
          status: 'completed',
          transaction_id: transferId,
          notes: `Stripe transfer ${transferId} confirmed.`,
        });

        await base44.asServiceRole.entities.ArtistPaymentMethod.update(pm.id, {
          pending_balance: 0,
          last_payout_date: new Date().toISOString(),
          last_payout_amount: payoutAmount,
          total_earned: (pm.total_earned || 0) + payoutAmount,
        });

        results.push({
          artist_profile_id: pm.artist_profile_id,
          amount: payoutAmount,
          status: 'completed',
          transfer_id: transferId,
        });
        console.log(`Stripe transfer ${transferId} succeeded for artist ${pm.artist_profile_id}: $${payoutAmount.toFixed(2)}`);
      } catch (transferError) {
        // Transfer failed — mark this payout failed, log the Stripe error, do NOT zero the balance
        const errMsg = transferError.message || 'Unknown Stripe transfer error';
        console.error(`Stripe transfer failed for artist ${pm.artist_profile_id} (payout ${payout.id}):`, errMsg);

        await base44.asServiceRole.entities.ArtistPayout.update(payout.id, {
          status: 'failed',
          notes: `Stripe transfer failed: ${errMsg}`,
        });

        results.push({
          artist_profile_id: pm.artist_profile_id,
          amount: payoutAmount,
          status: 'failed',
          error: errMsg,
        });
      }
    }

    const completed = results.filter(r => r.status === 'completed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const pending = results.filter(r => r.status === 'pending').length;

    return Response.json({
      success: true,
      message: `Processed ${results.length} payouts — ${completed} completed, ${failed} failed, ${pending} queued for manual transfer.`,
      payouts: results,
      completed,
      failed,
      pending,
    });
  } catch (error) {
    console.error('Monthly payout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});