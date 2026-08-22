import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This runs as a scheduled automation — authenticate to verify it's a legit call
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (!isAuthenticated) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Fetch all categories in an active voting phase
    const categories = await base44.asServiceRole.entities.AwardsCategory.filter({
      voting_phase: { $in: ['nomination', 'final_voting'] },
      is_active: true,
    });

    if (!categories || categories.length === 0) {
      return Response.json({ message: 'No active voting categories found', processed: 0 });
    }

    // Filter to categories with a close date within the next 48 hours that haven't had reminders sent
    const dueCategories = categories.filter((cat) => {
      if (!cat.voting_close_date) return false;
      if (cat.deadline_reminder_sent) return false;
      const closeDate = new Date(cat.voting_close_date);
      // Window: close date is in the future (not yet passed) and within 48 hours
      return closeDate > now && closeDate <= fortyEightHoursFromNow;
    });

    if (dueCategories.length === 0) {
      return Response.json({ message: 'No categories due for 48-hour reminder', processed: 0 });
    }

    // Fetch all active voting council governors
    const governors = await base44.asServiceRole.entities.AcademyMember.filter({
      membership_status: 'active',
      is_voting_council: true,
    });

    if (!governors || governors.length === 0) {
      return Response.json({ message: 'No active voting council governors found', processed: 0 });
    }

    // Get Gmail connection for sending emails
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    let totalNotified = 0;
    const categoryResults = [];

    for (const category of dueCategories) {
      // Find governors assigned to this category
      const assignedGovernors = governors.filter((g) => {
        if (!g.assigned_categories || g.assigned_categories.length === 0) return false;
        return g.assigned_categories.some(
          (c) => c === category.name || c === category.id || c === category._id
        );
      });

      if (assignedGovernors.length === 0) {
        categoryResults.push({ category: category.name, notified: 0, reason: 'No assigned governors' });
        continue;
      }

      const phaseLabel = category.voting_phase === 'nomination' ? 'Nomination Voting' : 'Final Voting';
      const closeDate = new Date(category.voting_close_date);
      const closeFormatted = closeDate.toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Chicago',
      });

      let successCount = 0;
      const errors = [];

      for (const governor of assignedGovernors) {
        const email = governor.applicant_email;
        if (!email) continue;

        const displayName = governor.applicant_name || 'Governor';

        const subject = `⏰ Reminder: ${phaseLabel} closes in 48 hours — ${category.name}`;

        const textBody = [
          `Dear ${displayName},`,
          ``,
          `This is a friendly reminder that the ${phaseLabel} window for the following My Life Awards™ category closes in less than 48 hours.`,
          ``,
          `Category: ${category.name}`,
          `Phase: ${phaseLabel}`,
          `Closes: ${closeFormatted} (Central Time)`,
          category.year ? `Cycle Year: ${category.year}` : '',
          ``,
          `If you have not yet cast your votes for this category, please visit the Academy Dashboard as soon as possible to complete your ballot.`,
          ``,
          `Your participation is essential to the integrity of the Academy. Every vote matters.`,
          ``,
          `"Become Who You Were Meant to Be."`,
          ``,
          `— My Life Awards™ Academy`,
        ].filter(Boolean).join('\n');

        // Build RFC 2822 MIME message
        const mimeMessage = [
          `From: My Life Awards™ Academy <frequency@base44.com>`,
          `To: ${displayName} <${email}>`,
          `Subject: ${subject}`,
          `Content-Type: text/plain; charset=UTF-8`,
          ``,
          textBody,
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
            totalNotified++;
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

      // Mark this category as reminder sent
      try {
        await base44.asServiceRole.entities.AwardsCategory.update(category.id || category._id, {
          deadline_reminder_sent: true,
        });
      } catch (e) {
        console.error(`Failed to mark reminder sent for ${category.name}:`, e);
      }

      categoryResults.push({
        category: category.name,
        notified: successCount,
        total_assigned: assignedGovernors.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    // Log audit entry
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: 'system',
        user_name: 'My Life Awards Automation',
        action: 'send_voting_deadline_reminders',
        action_category: 'admin',
        entity_type: 'AwardsCategory',
        details: `Sent 48-hour deadline reminders to ${totalNotified} governor(s) across ${dueCategories.length} category(ies)`,
        severity: 'info',
      });
    } catch (e) {
      console.error('Audit log error:', e);
    }

    return Response.json({
      success: true,
      processed: dueCategories.length,
      total_notified: totalNotified,
      categories: categoryResults,
    });
  } catch (error) {
    console.error('sendVotingDeadlineReminders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});