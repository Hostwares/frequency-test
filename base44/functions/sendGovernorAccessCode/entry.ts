import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // ── SEND CODE (Admin only) ──
    if (action === 'send_code') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }

      const { member_id } = body;
      if (!member_id) return Response.json({ error: 'member_id is required' }, { status: 400 });

      const member = await base44.asServiceRole.entities.AcademyMember.get(member_id);
      if (!member) return Response.json({ error: 'Academy member not found' }, { status: 404 });

      if (member.application_status !== 'approved' || member.membership_status !== 'active') {
        return Response.json({ error: 'Member is not an active approved governor' }, { status: 400 });
      }

      if (!member.applicant_email) {
        return Response.json({ error: 'Governor has no email on file' }, { status: 400 });
      }

      // Generate a unique 8-char code
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }

      // Invalidate any previous active codes for this member
      const previousCodes = await base44.asServiceRole.entities.GovernorAccessCode.filter(
        { member_id, is_active: true, is_used: false }
      );
      if (previousCodes.length > 0) {
        await base44.asServiceRole.entities.GovernorAccessCode.updateMany(
          { member_id, is_active: true, is_used: false },
          { $set: { is_active: false } }
        );
      }

      const now = new Date();
      const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const codeRecord = await base44.asServiceRole.entities.GovernorAccessCode.create({
        member_id: member.id,
        user_id: member.user_id,
        governor_name: member.applicant_name,
        governor_email: member.applicant_email,
        access_code: code,
        is_used: false,
        is_active: true,
        generated_by_admin_id: user.id,
        generated_by_admin_name: user.full_name || user.email,
        generated_date: now.toISOString(),
        expires_date: expires.toISOString(),
        purpose: 'Governor private voting completion badge access',
      });

      // Send email via Gmail
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

      const emailBody = [
        '<div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d0b14; color: #f0f0f0; padding: 32px; border-radius: 16px; border: 1px solid #2a2438;">',
        '<div style="text-align: center; margin-bottom: 24px;">',
        '<h1 style="font-size: 22px; color: #a855f7; margin: 0;">My Life Awards™ Academy</h1>',
        '<p style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 2px; margin: 4px 0 0 0;">Private Governor Access</p>',
        '</div>',
        `<p style="font-size: 14px; color: #ccc;">Dear ${member.applicant_name},</p>`,
        '<p style="font-size: 14px; color: #ccc; line-height: 1.6;">',
        'You have been issued a private access code to view your voting completion badge on the Academy Dashboard. ',
        'This code is confidential and intended solely for your use.',
        '</p>',
        '<div style="text-align: center; margin: 24px 0;">',
        '<div style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #06b6d4); padding: 16px 40px; border-radius: 12px;">',
        `<span style="font-size: 28px; font-weight: bold; letter-spacing: 8px; color: white;">${code}</span>`,
        '</div>',
        '</div>',
        '<p style="font-size: 13px; color: #aaa; line-height: 1.6;">',
        '<strong>How to use it:</strong><br/>',
        '1. Go to the Academy Dashboard in The Mainstream Frequency™.<br/>',
        '2. Enter this code in the "Governor Private Access" section.<br/>',
        '3. Your voting completion badge will be revealed.',
        '</p>',
        '<p style="font-size: 12px; color: #666; margin-top: 24px;">',
        `This code expires on ${expires.toLocaleDateString('en-US', { dateStyle: 'full' })}. `,
        'If you did not expect this code, please contact the Academy administration immediately.',
        '</p>',
        '<div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #2a2438;">',
        '<p style="font-size: 11px; color: #555; font-style: italic;">"Become Who You Were Meant to Be."</p>',
        '</div>',
        '</div>',
      ].join('');

      const emailRaw = [
        'From: My Life Awards Academy <noreply@frequency.app>',
        `To: ${member.applicant_email}`,
        'Subject: Your Private Governor Access Code',
        'Content-Type: text/html; charset=utf-8',
        '',
        emailBody,
      ].join('\r\n');

      const encodedEmail = btoa(unescape(encodeURIComponent(emailRaw)));

      const gmailResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw: encodedEmail }),
        }
      );

      if (!gmailResponse.ok) {
        const gmailErr = await gmailResponse.json();
        console.error('Gmail send failed:', JSON.stringify(gmailErr));
        return Response.json({ error: 'Failed to send email. Code was generated but not delivered.' }, { status: 502 });
      }

      await base44.asServiceRole.entities.AuditLog.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        user_email: user.email,
        user_role: 'admin',
        action: 'send_governor_access_code',
        action_category: 'admin',
        entity_type: 'GovernorAccessCode',
        entity_id: codeRecord.id,
        details: `Sent private access code to governor ${member.applicant_name} (${member.applicant_email})`,
        severity: 'info',
      });

      return Response.json({
        success: true,
        message: `Access code sent to ${member.applicant_email}`,
        code_id: codeRecord.id,
      });
    }

    // ── REDEEM CODE (Governor enters code) ──
    if (action === 'redeem_code') {
      const { access_code } = body;
      if (!access_code) return Response.json({ error: 'Access code is required' }, { status: 400 });

      const normalizedCode = access_code.trim().toUpperCase();

      const codes = await base44.asServiceRole.entities.GovernorAccessCode.filter(
        { access_code: normalizedCode, is_active: true }
      );

      if (codes.length === 0) {
        return Response.json({ error: 'Invalid or revoked access code' }, { status: 404 });
      }

      const codeRecord = codes[0];

      if (codeRecord.is_used) {
        return Response.json({ error: 'This code has already been used' }, { status: 400 });
      }

      if (codeRecord.user_id !== user.id) {
        return Response.json({ error: 'This code was not issued to your account' }, { status: 403 });
      }

      const now = new Date();
      if (codeRecord.expires_date && new Date(codeRecord.expires_date) < now) {
        return Response.json({ error: 'This access code has expired' }, { status: 400 });
      }

      // Mark as used
      await base44.asServiceRole.entities.GovernorAccessCode.update(codeRecord.id, {
        is_used: true,
        used_date: now.toISOString(),
      });

      // Fetch the member's voting completion status
      const member = await base44.asServiceRole.entities.AcademyMember.get(codeRecord.member_id);
      const assignedCategories = member?.assigned_categories || [];

      const currentYear = new Date().getFullYear();
      const allVotes = await base44.asServiceRole.entities.AwardsVote.filter(
        { voter_user_id: user.id, voting_cycle: currentYear }, '-voted_date', 5000
      );

      // Get category names for voted categories
      const votedCategoryIds = [...new Set(allVotes.map(v => v.category_id))];
      const votedCategoryNames = [...new Set(allVotes.map(v => v.category_name).filter(Boolean))];

      // Check which assigned categories have been voted on
      const completedCategories = assignedCategories.filter(cat =>
        votedCategoryNames.some(voted => voted.toLowerCase() === cat.toLowerCase())
      );

      const allVoted = assignedCategories.length > 0 && completedCategories.length === assignedCategories.length;

      return Response.json({
        success: true,
        governor_name: codeRecord.governor_name,
        assigned_categories: assignedCategories,
        completed_categories: completedCategories,
        total_votes_cast: allVotes.length,
        all_assigned_voted: allVoted,
        member_since: member?.member_since_date,
        governor_tier: member?.governor_tier,
        community_impact_score: member?.community_impact_score || 0,
      });
    }

    // ── REVOKE CODE (Admin only) ──
    if (action === 'revoke_code') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
      const { code_id } = body;
      if (!code_id) return Response.json({ error: 'code_id is required' }, { status: 400 });

      await base44.asServiceRole.entities.GovernorAccessCode.update(code_id, { is_active: false });

      return Response.json({ success: true, message: 'Access code revoked' });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('sendGovernorAccessCode error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});