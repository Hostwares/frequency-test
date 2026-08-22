import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * sendCollaboratorPayoutNotifications
 * Scheduled sweep — finds CollaboratorEarning records that have been paid out
 * but whose collaborator hasn't yet been emailed, sends a branded payout
 * notification via the Gmail connector, and marks each record as notified.
 *
 * Covers BOTH registered collaborators (email resolved from User entity) and
 * external collaborators (uses collaborator_email field).
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ROLE_LABELS = {
  lead_vocal: "Lead Vocal", guitar: "Guitar", bass: "Bass", drums: "Drums",
  keyboard: "Keyboard", producer: "Producer", songwriter: "Songwriter",
  composer: "Composer", mixer: "Mixer", engineer: "Engineer",
  mastering_engineer: "Mastering Engineer", featured_artist: "Featured Artist",
  publisher: "Publisher", manager: "Manager", business_partner: "Business Partner",
  marketing: "Marketing", other: "Collaborator",
};

const SOURCE_LABELS = {
  fan_support: "Fan Support", direct_support: "Direct Support",
  playlist_revenue: "Playlist Revenue", network_revenue: "Network Revenue",
  community_rewards: "Community Rewards", discovery_partner_bonus: "Discovery Partner Bonus",
  merchandise: "Merchandise", ticket_sales: "Ticket Sales", marketplace: "Marketplace",
  fan_tips: "Fan Tips", licensing: "Licensing", artist_disbursement: "Artist Disbursement",
  other: "Revenue Share",
};

const METHOD_LABELS = {
  frequency_wallet: "Frequency Wallet", stripe_connect: "Stripe Connect",
  paypal: "PayPal", ach: "ACH", bank_transfer: "Bank Transfer", manual: "Manual Transfer",
};

function base64UrlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildMimeMessage(to, subject, htmlBody) {
  return [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    htmlBody,
  ].join("\r\n");
}

function buildEmail(earning, email) {
  const amount = Number(earning.collaborator_amount || 0).toFixed(2);
  const roleLabel = ROLE_LABELS[earning.collaborator_role] || "Collaborator";
  const sourceLabel = SOURCE_LABELS[earning.revenue_source] || "Revenue Share";
  const methodLabel = METHOD_LABELS[earning.payment_method] || earning.payment_method || "Frequency Wallet";
  const periodLabel = earning.earning_period_month && earning.earning_period_year
    ? `${MONTHS[earning.earning_period_month - 1] || ""} ${earning.earning_period_year}`
    : "this earning period";
  const paidDate = earning.payment_date
    ? new Date(earning.payment_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const contextLine = earning.song_name
    ? `Song: ${earning.song_name}`
    : earning.release_name
    ? `Release: ${earning.release_name}`
    : earning.playlist_name
    ? `Playlist: ${earning.playlist_name}`
    : earning.split_name
    ? `Split: ${earning.split_name}`
    : "";

  const subject = `💰 Your Frequency payment from ${earning.artist_name || "your artist"} has been processed`;
  const htmlBody = `
<div style="font-family:'Inter',sans-serif;max-width:600px;margin:0 auto;background:linear-gradient(135deg,#1a1025 0%,#0f172a 100%);padding:40px 20px;border-radius:12px;">
  <div style="text-align:center;margin-bottom:30px;">
    <div style="background:linear-gradient(135deg,#a855f7,#06b6d4);padding:20px;border-radius:50%;width:80px;height:80px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
      <span style="font-size:40px;color:white;">💰</span>
    </div>
    <h1 style="color:#ffffff;font-size:28px;margin:0 0 10px 0;font-weight:700;">Your Payment Has Been Processed!</h1>
  </div>
  <div style="background:rgba(255,255,255,0.05);padding:30px;border-radius:8px;margin-bottom:30px;border:1px solid rgba(168,85,247,0.3);">
    <p style="color:#e2e8f0;font-size:16px;margin:0 0 20px 0;line-height:1.6;">
      Hi ${earning.collaborator_name || "there"},<br/><br/>
      Great news! Your revenue split payment from <strong style="color:#a855f7;">${earning.artist_name || "your artist"}</strong> has been processed and paid out.
    </p>
    <div style="background:rgba(168,85,247,0.1);padding:20px;border-radius:6px;text-align:center;margin:20px 0;">
      <p style="color:#94a3b8;font-size:14px;margin:0 0 10px 0;text-transform:uppercase;letter-spacing:1px;">Payment Amount</p>
      <p style="color:#06b6d4;font-size:42px;font-weight:700;margin:0;">$${amount}</p>
    </div>
    <div style="margin:20px 0;">
      <table style="width:100%;color:#e2e8f0;font-size:15px;line-height:1.8;">
        <tr><td style="color:#94a3b8;padding-right:16px;">Your Role</td><td style="font-weight:600;">${roleLabel}</td></tr>
        <tr><td style="color:#94a3b8;padding-right:16px;">Revenue Source</td><td style="font-weight:600;">${sourceLabel}</td></tr>
        <tr><td style="color:#94a3b8;padding-right:16px;">Earning Period</td><td style="font-weight:600;">${periodLabel}</td></tr>
        <tr><td style="color:#94a3b8;padding-right:16px;">Payment Method</td><td style="font-weight:600;">${methodLabel}</td></tr>
        <tr><td style="color:#94a3b8;padding-right:16px;">Paid On</td><td style="font-weight:600;">${paidDate}</td></tr>
        ${earning.revenue_percentage ? `<tr><td style="color:#94a3b8;padding-right:16px;">Your Share</td><td style="font-weight:600;">${Number(earning.revenue_percentage).toFixed(1)}%</td></tr>` : ""}
        ${contextLine ? `<tr><td style="color:#94a3b8;padding-right:16px;">Source</td><td style="font-weight:600;">${contextLine}</td></tr>` : ""}
      </table>
    </div>
  </div>
  <div style="margin-top:40px;padding-top:30px;border-top:1px solid rgba(255,255,255,0.1);text-align:center;">
    <p style="color:#64748b;font-size:14px;margin:0 0 10px 0;">This email was sent to ${email} as a collaborator on a Frequency revenue split.</p>
    <p style="color:#475569;font-size:12px;margin:0;">© 2026 Frequency. All rights reserved.</p>
  </div>
</div>`;

  return { subject, htmlBody };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !["admin", "master_admin"].includes(user.role)) {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Find paid earnings (limit 200 per sweep for safety)
    const paid = await base44.asServiceRole.entities.CollaboratorEarning.filter(
      { payment_status: "paid" },
      "-payment_date",
      200
    );

    const toNotify = (paid || []).filter(
      (e) => !e.payout_notification_sent && e.collaborator_amount > 0
    );

    if (toNotify.length === 0) {
      return Response.json({
        success: true,
        message: "No pending payout notifications",
        notified: 0,
      });
    }

    // Get Gmail access token
    let gmailToken;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection("gmail");
      gmailToken = conn.accessToken;
    } catch (e) {
      console.error("Gmail connector not available:", e?.message || String(e));
      return Response.json(
        { error: "Gmail connector not connected — authorize the 'Frequency Email Sender' connector" },
        { status: 500 }
      );
    }

    // Resolve registered collaborator emails (User lookup)
    const userIds = [...new Set(toNotify.map((e) => e.collaborator_user_id).filter(Boolean))];
    const userEmails = {};
    for (const uid of userIds) {
      try {
        const u = await base44.asServiceRole.entities.User.get(uid);
        if (u && u.email) userEmails[uid] = u.email;
      } catch (e) {
        console.error(`User lookup failed for ${uid}:`, e?.message || String(e));
      }
    }

    let notified = 0;
    let failed = 0;
    let skipped = 0;
    const updates = [];
    const now = new Date().toISOString();

    for (const earning of toNotify) {
      const email =
        (earning.collaborator_user_id && userEmails[earning.collaborator_user_id]) ||
        earning.collaborator_email;

      if (!email) {
        console.log(`No email for earning ${earning.id} (${earning.collaborator_name}), skipping`);
        skipped++;
        continue;
      }

      const { subject, htmlBody } = buildEmail(earning, email);
      const mime = buildMimeMessage(email, subject, htmlBody);
      const raw = base64UrlEncode(mime);

      try {
        const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${gmailToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`Gmail send failed for ${email} (earning ${earning.id}):`, errText);
          failed++;
          continue;
        }

        updates.push({
          id: earning.id,
          payout_notification_sent: true,
          payout_notification_sent_date: now,
        });
        notified++;
      } catch (e) {
        console.error(`Send error for ${email} (earning ${earning.id}):`, e?.message || String(e));
        failed++;
      }
    }

    if (updates.length) {
      await base44.asServiceRole.entities.CollaboratorEarning.bulkUpdate(updates);
    }

    console.log(`Collaborator payout notifications: ${notified} sent, ${failed} failed, ${skipped} skipped (no email)`);

    return Response.json({
      success: true,
      notified,
      failed,
      skipped,
      total_checked: toNotify.length,
    });
  } catch (error) {
    console.error("sendCollaboratorPayoutNotifications error:", error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});