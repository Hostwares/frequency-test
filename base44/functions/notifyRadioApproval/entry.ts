import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * notifyRadioApproval
 * Entity automation on RadioStation update. Fires when an admin approves a
 * station/programmer application — i.e. verification_status transitions to
 * "verified" or "verified_with_restrictions". Sends the applicant a branded
 * confirmation email with a link to their Radio Portal dashboard.
 */

const VERIFIED_STATUSES = ['verified', 'verified_with_restrictions'];

const BADGE_LABELS = {
  verified_terrestrial_station: 'Verified Terrestrial Station',
  verified_internet_station: 'Verified Internet Station',
  verified_radio_network: 'Verified Radio Network',
  verified_radio_programmer: 'Verified Radio Programmer',
  none: 'Verified',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, old_data } = payload;

    if (!data || !data.id) {
      return Response.json({ skipped: 'no data' });
    }

    // Only act on a transition INTO a verified status.
    const prevStatus = old_data?.verification_status;
    const newStatus = data.verification_status;
    const wasVerified = prevStatus && VERIFIED_STATUSES.includes(prevStatus);
    const nowVerified = newStatus && VERIFIED_STATUSES.includes(newStatus);

    if (!nowVerified || wasVerified) {
      return Response.json({ skipped: 'not a new approval transition' });
    }

    const applicantUserId = data.applicant_user_id;
    if (!applicantUserId) {
      console.log('notifyRadioApproval: no applicant_user_id on station', data.id);
      return Response.json({ skipped: 'no applicant_user_id' });
    }

    // Resolve the applicant's registered platform email.
    let applicant;
    try {
      applicant = await base44.asServiceRole.entities.User.get(applicantUserId);
    } catch (e) {
      console.error('notifyRadioApproval: user lookup failed:', e?.message || String(e));
      return Response.json({ error: 'Applicant user not found' }, { status: 404 });
    }
    if (!applicant || !applicant.email) {
      return Response.json({ skipped: 'applicant has no platform email' });
    }

    const stationName = data.official_station_name || 'your station';
    const handle = data.public_handle ? `^${data.public_handle}` : '';
    const badgeType = data.verification_type || 'none';
    const badgeLabel = BADGE_LABELS[badgeType] || 'Verified';
    const restricted = newStatus === 'verified_with_restrictions';

    const origin = req.headers.get('Origin') || req.headers.get('origin') || '';
    const dashboardUrl = origin ? `${origin}/radio-programmer-dashboard` : '/radio-programmer-dashboard';

    const subject = `✅ Your Frequency radio account is verified — ${stationName}`;
    const body = `
<div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:linear-gradient(135deg,#1a1025 0%,#0f172a 100%);padding:40px 20px;border-radius:12px;">
  <div style="text-align:center;margin-bottom:30px;">
    <div style="background:linear-gradient(135deg,#a855f7,#06b6d4);padding:18px;border-radius:50%;width:72px;height:72px;margin:0 auto 18px;display:flex;align-items:center;justify-content:center;">
      <span style="font-size:36px;color:white;">📻</span>
    </div>
    <h1 style="color:#ffffff;font-size:26px;margin:0 0 8px 0;font-weight:700;">You're Verified!</h1>
    <p style="color:#94a3b8;font-size:15px;margin:0;">The Mainstream Frequency™ — Radio Verification</p>
  </div>
  <div style="background:rgba(255,255,255,0.05);padding:28px;border-radius:8px;border:1px solid rgba(168,85,247,0.3);">
    <p style="color:#e2e8f0;font-size:16px;margin:0 0 18px 0;line-height:1.6;">
      Hi ${applicant.full_name || 'there'},<br/><br/>
      Congratulations! Your radio application for <strong style="color:#a855f7;">${stationName}</strong> has been reviewed and approved by our team.
    </p>
    <div style="background:rgba(168,85,247,0.1);padding:18px;border-radius:6px;margin:18px 0;">
      <table style="width:100%;color:#e2e8f0;font-size:15px;line-height:1.8;">
        <tr><td style="color:#94a3b8;padding-right:16px;">Verification</td><td style="font-weight:600;color:#06b6d4;">${badgeLabel}</td></tr>
        ${handle ? `<tr><td style="color:#94a3b8;padding-right:16px;">Public Handle</td><td style="font-weight:600;">${handle}</td></tr>` : ''}
        ${data.official_station_identifier ? `<tr><td style="color:#94a3b8;padding-right:16px;">Identifier</td><td style="font-weight:600;">${data.official_station_identifier}</td></tr>` : ''}
        ${data.station_type ? `<tr><td style="color:#94a3b8;padding-right:16px;">Type</td><td style="font-weight:600;text-transform:capitalize;">${String(data.station_type).replace(/_/g, ' ')}</td></tr>` : ''}
      </table>
    </div>
    ${restricted ? `
    <p style="color:#fbbf24;font-size:14px;margin:16px 0;line-height:1.5;">
      ⚠️ Your account was approved <strong>with restrictions</strong>. Some capabilities may be limited until full verification is completed. See your dashboard for details.
    </p>` : ''}
    <p style="color:#e2e8f0;font-size:15px;margin:18px 0;line-height:1.6;">
      Your verified badge is now active across the platform. You can start managing your artist submissions, rotation tracking, and downloads from your Radio Portal.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#a855f7,#06b6d4);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">Open Radio Portal</a>
    </div>
    ${!origin ? `<p style="color:#64748b;font-size:13px;text-align:center;margin:8px 0;">Or log in and go to your Radio Portal dashboard.</p>` : ''}
    <p style="color:#64748b;font-size:14px;margin:18px 0 0 0;line-height:1.5;">
      Welcome aboard,<br/>The Frequency Team
    </p>
  </div>
  <p style="color:#475569;font-size:12px;text-align:center;margin-top:24px;">This email was sent to ${applicant.email} as the verified contact for ${stationName}.</p>
</div>`.trim();

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: applicant.email,
        subject,
        body,
      });
      console.log(`notifyRadioApproval: email sent to ${applicant.email} for station ${data.id}`);
    } catch (emailError) {
      console.error('notifyRadioApproval: SendEmail failed:', emailError?.message || String(emailError));
      return Response.json({ error: 'Email send failed', detail: emailError?.message || String(emailError) }, { status: 500 });
    }

    return Response.json({
      success: true,
      station_id: data.id,
      recipient: applicant.email,
      status: newStatus,
      badge: badgeLabel,
    });
  } catch (error) {
    console.error('notifyRadioApproval error:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});