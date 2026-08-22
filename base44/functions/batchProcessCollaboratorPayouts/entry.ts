import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

/**
 * Batch Collaborator Payout Processor
 * Lets an artist approve and trigger multiple pending CollaboratorEarning
 * payments in a single operation, rather than one-by-one.
 *
 * - frequency_wallet / manual methods → marked "paid" instantly
 * - stripe_connect / paypal / ach / bank_transfer → moved to "processing"
 * - Each processed earning is logged to the SplitAuditLog.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const { earning_ids } = body || {};
    if (!Array.isArray(earning_ids) || earning_ids.length === 0) {
      return Response.json({ error: "earning_ids must be a non-empty array" }, { status: 400 });
    }

    // Verify the caller is an artist
    const profiles = await base44.entities.ArtistProfile.filter({ user_id: user.id });
    const artistProfile = profiles?.[0];
    if (!artistProfile) {
      return Response.json({ error: "No artist profile found for this account" }, { status: 403 });
    }

    // Fetch pending + processing earnings owned by this artist (service role; records
    // were created by the distribution engine under the service role).
    const pending = await base44.asServiceRole.entities.CollaboratorEarning.filter({
      artist_profile_id: artistProfile.id,
      payment_status: "pending",
    }, "-created_date", 500);

    const processing = await base44.asServiceRole.entities.CollaboratorEarning.filter({
      artist_profile_id: artistProfile.id,
      payment_status: "processing",
    }, "-created_date", 500);

    const idSet = new Set(earning_ids);
    const eligible = [...(pending || []), ...(processing || [])].filter(
      (e) => idSet.has(e.id)
    );

    if (eligible.length === 0) {
      return Response.json({
        error: "None of the selected payments are eligible (they must be pending/processing and belong to your artist account)."
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    const paidUpdates = [];
    const processingUpdates = [];
    const auditLogs = [];

    for (const e of eligible) {
      const instant = e.payment_method === "frequency_wallet" || e.payment_method === "manual";
      if (instant) {
        paidUpdates.push({ id: e.id, payment_status: "paid", payment_date: now, processed_date: now });
      } else {
        processingUpdates.push({ id: e.id, payment_status: "processing", processed_date: now });
      }

      auditLogs.push({
        split_id: e.split_id,
        split_name: e.split_name,
        artist_profile_id: e.artist_profile_id,
        user_id: user.id,
        user_name: user.full_name || user.email,
        action: "payment_changed",
        action_category: "payment",
        details: `Batch payout ${instant ? "approved & paid" : "triggered (processing)"}: ${e.collaborator_name} (${e.collaborator_role}) — $${Number(e.collaborator_amount).toFixed(2)} via ${e.payment_method}`,
        collaborator_name: e.collaborator_name,
        revenue_adjustment: e.collaborator_amount,
      });
    }

    if (paidUpdates.length) {
      await base44.asServiceRole.entities.CollaboratorEarning.bulkUpdate(paidUpdates);
    }
    if (processingUpdates.length) {
      await base44.asServiceRole.entities.CollaboratorEarning.bulkUpdate(processingUpdates);
    }
    if (auditLogs.length) {
      await base44.asServiceRole.entities.SplitAuditLog.bulkCreate(auditLogs);
    }

    const totalAmount = eligible.reduce((s, e) => s + (Number(e.collaborator_amount) || 0), 0);

    return Response.json({
      status: "success",
      processed: eligible.length,
      requested: earning_ids.length,
      skipped: earning_ids.length - eligible.length,
      paid_instantly: paidUpdates.length,
      moved_to_processing: processingUpdates.length,
      total_amount: +totalAmount.toFixed(2),
    });
  } catch (error) {
    console.error("batchProcessCollaboratorPayouts error:", error);
    return Response.json({ error: "Failed to process batch payout", details: error?.message || String(error) }, { status: 500 });
  }
});