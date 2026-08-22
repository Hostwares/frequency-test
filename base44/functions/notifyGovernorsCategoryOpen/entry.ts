import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // Entity automation passes the AwardsCategory record that triggered the event
    if (action === 'manual') {
      // Manual invocation from Platform Operations — requires admin
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }
      return await notifyGovernors(base44, body.category_id);
    }

    // Entity automation payload: { event, data, old_data, changed_fields }
    const data = body.data;
    if (!data) {
      return Response.json({ error: 'No category data in payload' }, { status: 400 });
    }

    // Only notify when voting_phase changed to nomination or final_voting
    const changedFields = body.changed_fields || [];
    const phaseChanged = changedFields.includes('voting_phase');
    const isOpen = data.voting_phase === 'nomination' || data.voting_phase === 'final_voting';

    if (!phaseChanged || !isOpen) {
      return Response.json({ skipped: true, reason: 'Category not opening for voting' });
    }

    return await sendGovernorNotifications(base44, data);
  } catch (error) {
    console.error('notifyGovernorsCategoryOpen error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function sendGovernorNotifications(base44, category) {
  // Fetch all active Academy governors
  const governors = await base44.asServiceRole.entities.AcademyMember.filter({
    membership_status: 'active',
    governor_tier: { $in: ['founding', 'senior', 'member'] }
  });

  if (!governors || governors.length === 0) {
    return Response.json({ skipped: true, reason: 'No active governors found' });
  }

  // Get Gmail connection
  const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

  const phaseLabel = category.voting_phase === 'nomination' ? 'Nomination Voting' : 'Final Voting';
  const subject = `My Life Awards™ — ${phaseLabel} Open: ${category.name}`;
  const year = category.year || new Date().getFullYear();

  const textBody = [
    `Dear Governor,`,
    ``,
    `A new award category has opened for ${phaseLabel} in the My Life Awards™ ${year} cycle.`,
    ``,
    `Category: ${category.name}`,
    `Type: ${category.category_type || 'N/A'}`,
    `Phase: ${phaseLabel}`,
    year ? `Cycle Year: ${year}` : '',
    category.description ? `\n${category.description}` : '',
    category.eligibility_criteria ? `\nEligibility: ${category.eligibility_criteria}` : '',
    ``,
    `Please visit the Academy Dashboard to review the nominees and cast your votes.`,
    ``,
    `"Become Who You Were Meant to Be."`,
    ``,
    `— My Life Awards™ Academy`,
  ].filter(Boolean).join('\n');

  let successCount = 0;
  const errors = [];

  for (const governor of governors) {
    const email = governor.applicant_email;
    if (!email) continue;

    const displayName = governor.applicant_name || 'Governor';

    const personalizedBody = textBody.replace('Dear Governor,', `Dear ${displayName},`);

    // Build RFC 2822 MIME message
    const mimeMessage = [
      `From: My Life Awards™ Academy <frequency@base44.com>`,
      `To: ${displayName} <${email}>`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      personalizedBody,
    ].join('\r\n');

    const encodedMessage = btoa(unescape(encodeURIComponent(mimeMessage)));

    try {
      const response = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw: encodedMessage }),
        }
      );

      if (response.ok) {
        successCount++;
      } else {
        const errText = await response.text();
        errors.push({ email, error: errText });
        console.error(`Failed to email ${email}:`, errText);
      }
    } catch (err) {
      errors.push({ email, error: err.message });
      console.error(`Error emailing ${email}:`, err);
    }
  }

  // Log audit entry
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: 'system',
      user_name: 'My Life Awards Automation',
      action: 'notify_governors_category_open',
      action_category: 'admin',
      entity_type: 'AwardsCategory',
      entity_id: category.id || category._id,
      details: `Notified ${successCount}/${governors.length} governors: ${category.name} — ${phaseLabel}`,
      severity: 'info',
    });
  } catch (e) {
    console.error('Audit log error:', e);
  }

  return Response.json({
    success: true,
    notified: successCount,
    total_governors: governors.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}

async function notifyGovernors(base44, categoryId) {
  if (!categoryId) {
    return Response.json({ error: 'category_id required for manual action' }, { status: 400 });
  }

  const category = await base44.asServiceRole.entities.AwardsCategory.get(categoryId);
  if (!category) {
    return Response.json({ error: 'Category not found' }, { status: 404 });
  }

  return await sendGovernorNotifications(base44, category);
}