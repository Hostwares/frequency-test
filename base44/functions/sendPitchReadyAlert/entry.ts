import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Parse payload — works for both automation triggers and direct calls
    const body = await req.json().catch(() => ({}));

    // Extract entity info from automation payload { event, data } or direct call { entity_type, ... }
    const automationEntityName = body.event?.entity_name;
    const entityData = body.data || {};
    const directType = body.entity_type;

    let pitchType = '';
    let entityName = '';
    let pitchNotes = '';
    let entityId = '';

    if (automationEntityName === 'ArtistProfile' || directType === 'artist') {
      pitchType = 'artist';
      entityName = entityData.artist_name || body.entity_name || 'Unknown Artist';
      pitchNotes = entityData.pitch_notes || body.pitch_notes || '';
      entityId = body.event?.entity_id || body.entity_id || '';
    } else if (automationEntityName === 'Event' || directType === 'event') {
      pitchType = 'event';
      entityName = entityData.title || body.entity_name || 'Unknown Event';
      pitchNotes = entityData.pitch_notes || body.pitch_notes || '';
      entityId = body.event?.entity_id || body.entity_id || '';
    } else {
      return Response.json({ error: 'Unknown entity type. Expected artist or event.' }, { status: 400 });
    }

    console.log(`Pitch Ready alert triggered for ${pitchType}: "${entityName}" (id: ${entityId})`);

    // ── Gather registered journalist emails ──
    // Source 1: Approved Academy Members with journalist type
    const academyJournalists = await base44.asServiceRole.entities.AcademyMember.filter({
      applicant_type: 'music_journalist',
      application_status: 'approved'
    });

    const emailSet = new Set();
    const journalistEmails = [];

    for (const j of academyJournalists) {
      if (j.applicant_email && !emailSet.has(j.applicant_email.toLowerCase())) {
        emailSet.add(j.applicant_email.toLowerCase());
        journalistEmails.push({ email: j.applicant_email, name: j.applicant_name || j.applicant_email });
      }
    }

    // Source 2: Authors of published EditorialArticles
    const articles = await base44.asServiceRole.entities.EditorialArticle.filter({});
    const authorIds = [...new Set(articles.map(a => a.author_user_id).filter(Boolean))];

    for (const authorId of authorIds) {
      try {
        const author = await base44.asServiceRole.entities.User.get(authorId);
        if (author?.email && !emailSet.has(author.email.toLowerCase())) {
          emailSet.add(author.email.toLowerCase());
          journalistEmails.push({ email: author.email, name: author.full_name || author.email });
        }
      } catch (e) {
        console.error(`Failed to fetch journalist user ${authorId}:`, e.message);
      }
    }

    if (journalistEmails.length === 0) {
      console.log('No registered journalists found to notify.');
      return Response.json({
        success: true,
        message: 'No registered journalists found to notify.',
        entity_type: pitchType,
        entity_name: entityName,
        alerts_sent: 0
      });
    }

    console.log(`Found ${journalistEmails.length} journalist(s) to notify.`);

    // ── Get Gmail connection ──
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    const typeLabel = pitchType === 'artist' ? 'Artist Feature Opportunity' : 'Community Event Coverage';
    const typeIcon = pitchType === 'artist' ? '🎤' : '📅';
    const notesSection = pitchNotes
      ? `<div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid rgba(6, 182, 212, 0.2);">
           <h3 style="color: #06b6d4; margin: 0 0 8px 0; font-size: 14px;">📝 Editorial Notes</h3>
           <p style="color: #e0e0e0; font-size: 14px; line-height: 1.6; margin: 0;">${pitchNotes}</p>
         </div>`
      : '';

    const emailBody = `<html>
<body style="font-family: 'Inter', Arial, sans-serif; background: #0a0a14; color: #e0e0e0; padding: 30px;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(145deg, rgba(139, 92, 246, 0.08), rgba(6, 182, 212, 0.04), transparent); border: 1px solid rgba(139, 92, 246, 0.2); padding: 30px; border-radius: 12px;">
    <div style="text-align: center; margin-bottom: 25px;">
      <h1 style="color: #a855f7; font-size: 24px; margin: 0;">${typeIcon} Pitch Ready for Editorial Coverage</h1>
      <p style="color: #06b6d4; font-size: 13px; margin-top: 5px;">The Mainstream Frequency — Editorial Alert</p>
    </div>

    <p style="font-size: 15px; line-height: 1.6;">A new <strong style="color: #d946ef;">${typeLabel}</strong> has been flagged as Pitch Ready and is available for editorial coverage.</p>

    <div style="background: rgba(139, 92, 246, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid rgba(139, 92, 246, 0.2); text-align: center;">
      <h2 style="color: #a855f7; font-size: 20px; margin: 0;">${entityName}</h2>
    </div>

    ${notesSection}

    <p style="font-size: 14px; color: #a0a0a0; line-height: 1.6;">Visit the <strong style="color: #a855f7;">Editorial Portal</strong> on The Mainstream Frequency to start drafting your coverage of this story.</p>

    <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid rgba(139, 92, 246, 0.15);">
      <p style="font-size: 12px; color: #707070;">You're receiving this alert because you are a registered journalist on The Mainstream Frequency.</p>
      <p style="font-size: 12px; color: #707070; margin-top: 5px;">The Mainstream Frequency © 2026</p>
    </div>
  </div>
</body>
</html>`;

    const subject = `${typeIcon} Pitch Ready: ${entityName}`;
    const subjectEncoded = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

    const results = [];

    for (const journalist of journalistEmails) {
      try {
        const mimeMessage = [
          `To: ${journalist.email}`,
          `From: The Mainstream Frequency <noreply@frequency.com>`,
          `Subject: ${subjectEncoded}`,
          `Content-Type: text/html; charset=UTF-8`,
          `MIME-Version: 1.0`,
          ``,
          emailBody
        ].join('\r\n');

        const rawMessage = btoa(unescape(encodeURIComponent(mimeMessage)));

        const gmailResponse = await fetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raw: rawMessage })
          }
        );

        if (!gmailResponse.ok) {
          const gmailError = await gmailResponse.text();
          console.error(`Gmail API error for ${journalist.email}:`, gmailError);
          results.push({ email: journalist.email, success: false, error: gmailError });
          continue;
        }

        const gmailResult = await gmailResponse.json();
        results.push({ email: journalist.email, success: true, message_id: gmailResult.id });
        console.log(`Pitch alert sent to ${journalist.email} (message ID: ${gmailResult.id})`);
      } catch (e) {
        console.error(`Failed to send to ${journalist.email}:`, e.message);
        results.push({ email: journalist.email, success: false, error: e.message });
      }
    }

    // Mark the entity as alert sent (if we have the entity ID and it was an automation trigger)
    if (entityId) {
      try {
        const entityNameForUpdate = pitchType === 'artist' ? 'ArtistProfile' : 'Event';
        await base44.asServiceRole.entities[entityNameForUpdate].update(entityId, {
          pitch_alert_sent: true
        });
      } catch (e) {
        console.error('Failed to mark pitch_alert_sent:', e.message);
      }
    }

    const sentCount = results.filter(r => r.success).length;
    console.log(`Pitch Ready alert complete. ${sentCount}/${journalistEmails.length} email(s) sent.`);

    return Response.json({
      success: true,
      entity_type: pitchType,
      entity_name: entityName,
      journalists_notified: sentCount,
      total_journalists: journalistEmails.length,
      results
    });
  } catch (error) {
    console.error('Pitch Ready alert error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});